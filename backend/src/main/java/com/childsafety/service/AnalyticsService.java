package com.childsafety.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.childsafety.config.AppProperties;
import com.childsafety.dto.InsightDtos.AnalyticsSummary;
import com.childsafety.dto.InsightDtos.BusUsage;
import com.childsafety.dto.InsightDtos.ReasonCount;
import com.childsafety.dto.InsightDtos.StatusCount;
import com.childsafety.dto.InsightDtos.TimeSeriesPoint;
import com.childsafety.entity.Bus;
import com.childsafety.exception.ApiException;
import com.childsafety.repository.BusRepository;

/** Aggregations over scan_events / notifications, bucketed by calendar day in the school's timezone. */
@Service
public class AnalyticsService {

    public enum Granularity {
        DAY("day", ChronoUnit.DAYS, 400), WEEK("week", ChronoUnit.WEEKS, 160), MONTH("month", ChronoUnit.MONTHS, 60);

        final String sqlUnit;
        final ChronoUnit step;
        final int maxBuckets;

        Granularity(String sqlUnit, ChronoUnit step, int maxBuckets) {
            this.sqlUnit = sqlUnit;
            this.step = step;
            this.maxBuckets = maxBuckets;
        }

        LocalDate periodStart(LocalDate date) {
            return switch (this) {
                case DAY -> date;
                case WEEK -> date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                case MONTH -> date.withDayOfMonth(1);
            };
        }
    }

    private final NamedParameterJdbcTemplate jdbc;
    private final BusRepository buses;
    private final ZoneId zone;

    public AnalyticsService(NamedParameterJdbcTemplate jdbc, BusRepository buses, AppProperties props) {
        this.jdbc = jdbc;
        this.buses = buses;
        this.zone = props.zoneId();
    }

    public LocalDate today() {
        return LocalDate.now(zone);
    }

    /** Boardings, exits and rejected scans per period; periods without scans are returned as zeros. */
    @Transactional(readOnly = true)
    public List<TimeSeriesPoint> series(Granularity granularity, LocalDate from, LocalDate to) {
        validateRange(from, to);
        LocalDate first = granularity.periodStart(from);
        LocalDate last = granularity.periodStart(to);
        if (granularity.step.between(first, last) + 1 > granularity.maxBuckets) {
            throw ApiException.badRequest("Date range too large for " + granularity.sqlUnit + "ly analytics");
        }
        MapSqlParameterSource params = range(first, to)
                .addValue("unit", granularity.sqlUnit)
                .addValue("tz", zone.getId());
        Map<LocalDate, TimeSeriesPoint> rows = new HashMap<>();
        jdbc.query("""
                select date_trunc(:unit, scanned_at at time zone :tz)::date as period,
                  count(*) filter (where result = 'ACCEPTED' and event_type = 'BOARDING') as boardings,
                  count(*) filter (where result = 'ACCEPTED' and event_type = 'EXIT') as exits,
                  count(*) filter (where result = 'REJECTED') as rejected
                from scan_events
                where scanned_at >= :start and scanned_at < :end
                group by 1
                """, params, rs -> {
                    LocalDate period = rs.getObject("period", LocalDate.class);
                    rows.put(period, new TimeSeriesPoint(period, rs.getLong("boardings"), rs.getLong("exits"),
                            rs.getLong("rejected")));
                });
        List<TimeSeriesPoint> points = new ArrayList<>();
        for (LocalDate p = first; !p.isAfter(last); p = p.plus(1, granularity.step)) {
            points.add(rows.getOrDefault(p, new TimeSeriesPoint(p, 0, 0, 0)));
        }
        return points;
    }

    @Transactional(readOnly = true)
    public AnalyticsSummary summary(LocalDate from, LocalDate to) {
        validateRange(from, to);
        MapSqlParameterSource params = range(from, to).addValue("tz", zone.getId());

        Map<String, Object> totals = jdbc.queryForMap("""
                select count(*) as total,
                  count(*) filter (where result = 'ACCEPTED') as accepted,
                  count(*) filter (where result = 'REJECTED') as rejected,
                  count(distinct (scanned_at at time zone :tz)::date) filter (where result = 'ACCEPTED') as active_days
                from scan_events where scanned_at >= :start and scanned_at < :end
                """, params);

        List<ReasonCount> reasons = jdbc.query("""
                select rejection_reason, count(*) as cnt from scan_events
                where result = 'REJECTED' and scanned_at >= :start and scanned_at < :end
                group by 1 order by 2 desc
                """, params, (rs, i) -> new ReasonCount(rs.getString(1), rs.getLong(2)));

        List<StatusCount> statuses = jdbc.query("""
                select status, count(*) as cnt from notifications
                where created_at >= :start and created_at < :end
                group by 1 order by 1
                """, params, (rs, i) -> new StatusCount(rs.getString(1), rs.getLong(2)));

        Map<Long, Long> boardingsByBus = new HashMap<>();
        jdbc.query("""
                select bus_id, count(*) as cnt from scan_events
                where result = 'ACCEPTED' and event_type = 'BOARDING' and bus_id is not null
                  and scanned_at >= :start and scanned_at < :end
                group by 1
                """, params, rs -> {
                    boardingsByBus.put(rs.getLong(1), rs.getLong(2));
                });

        long total = ((Number) totals.get("total")).longValue();
        long accepted = ((Number) totals.get("accepted")).longValue();
        long rejected = ((Number) totals.get("rejected")).longValue();
        long activeDays = Math.max(1, ((Number) totals.get("active_days")).longValue());

        List<BusUsage> usage = buses.findAll().stream()
                .sorted((a, b) -> a.getBusNumber().compareTo(b.getBusNumber()))
                .map(b -> busUsage(b, boardingsByBus.getOrDefault(b.getId(), 0L), activeDays))
                .toList();

        long delivered = count(statuses, "DELIVERED");
        long settled = delivered + count(statuses, "SENT") + count(statuses, "FAILED");

        return new AnalyticsSummary(from, to, total, accepted, rejected, percent(accepted, total), reasons, statuses,
                percent(delivered, settled), usage);
    }

    private static BusUsage busUsage(Bus bus, long boardings, long activeDays) {
        return new BusUsage(bus.getId(), bus.getBusNumber(), bus.getCapacity(), bus.getAssignedCount(),
                bus.getOnboardCount(), boardings, Math.round(boardings * 10.0 / activeDays) / 10.0);
    }

    private MapSqlParameterSource range(LocalDate from, LocalDate to) {
        return new MapSqlParameterSource()
                .addValue("start", utc(from))
                .addValue("end", utc(to.plusDays(1)));
    }

    private OffsetDateTime utc(LocalDate date) {
        return date.atStartOfDay(zone).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC);
    }

    private static void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw ApiException.badRequest("'from' date must not be after 'to' date");
        }
    }

    private static long count(List<StatusCount> statuses, String status) {
        return statuses.stream().filter(s -> s.status().equals(status)).mapToLong(StatusCount::count).sum();
    }

    private static double percent(long part, long whole) {
        return whole == 0 ? 0 : Math.round(part * 1000.0 / whole) / 10.0;
    }
}
