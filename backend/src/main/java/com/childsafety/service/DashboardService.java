package com.childsafety.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.childsafety.config.AppProperties;
import com.childsafety.dto.InsightDtos.ActivityItem;
import com.childsafety.dto.InsightDtos.DashboardSummary;
import com.childsafety.entity.BusStatus;
import com.childsafety.entity.Notification;
import com.childsafety.entity.NotificationStatus;
import com.childsafety.entity.ScanEvent;
import com.childsafety.entity.ScanEventType;
import com.childsafety.entity.ScanResult;
import com.childsafety.entity.TransportStatus;
import com.childsafety.repository.BusRepository;
import com.childsafety.repository.NotificationRepository;
import com.childsafety.repository.ScanEventRepository;
import com.childsafety.repository.StudentRepository;

/** All dashboard figures are computed from the database on every request. */
@Service
public class DashboardService {

    private final StudentRepository students;
    private final BusRepository buses;
    private final ScanEventRepository scanEvents;
    private final NotificationRepository notifications;
    private final NamedParameterJdbcTemplate jdbc;
    private final ZoneId zone;

    public DashboardService(StudentRepository students, BusRepository buses, ScanEventRepository scanEvents,
            NotificationRepository notifications, NamedParameterJdbcTemplate jdbc, AppProperties props) {
        this.students = students;
        this.buses = buses;
        this.scanEvents = scanEvents;
        this.notifications = notifications;
        this.jdbc = jdbc;
        this.zone = props.zoneId();
    }

    @Transactional(readOnly = true)
    public DashboardSummary summary() {
        LocalDate today = LocalDate.now(zone);
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("today", today.atStartOfDay(zone).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC))
                .addValue("yesterday", today.minusDays(1).atStartOfDay(zone).toOffsetDateTime().withOffsetSameInstant(ZoneOffset.UTC));

        Map<String, Object> scans = jdbc.queryForMap("""
                select
                  count(*) filter (where scanned_at >= :today) as scans_today,
                  count(*) filter (where scanned_at >= :today and result = 'ACCEPTED' and event_type = 'BOARDING') as boardings_today,
                  count(*) filter (where scanned_at >= :today and result = 'ACCEPTED' and event_type = 'EXIT') as exits_today,
                  count(*) filter (where scanned_at >= :today and result = 'REJECTED') as rejected_today,
                  count(*) filter (where scanned_at < :today and result = 'ACCEPTED' and event_type = 'BOARDING') as boardings_yesterday
                from scan_events where scanned_at >= :yesterday
                """, params);

        Map<String, Object> notes = jdbc.queryForMap("""
                select
                  count(*) filter (where status = 'PENDING') as pending,
                  count(*) filter (where status in ('SENT', 'DELIVERED')) as sent,
                  count(*) filter (where status = 'DELIVERED') as delivered,
                  count(*) filter (where status = 'FAILED') as failed,
                  count(*) filter (where created_at >= :today) as today,
                  count(*) filter (where created_at >= :yesterday and created_at < :today) as yesterday
                from notifications
                """, params);

        Long busesOnRoute = jdbc.queryForObject("""
                select count(distinct a.bus_id) from bus_assignments a
                join students s on s.id = a.student_id where s.transport_status = 'ONBOARD'
                """, Map.of(), Long.class);
        Long unassigned = jdbc.queryForObject("""
                select count(*) from students s
                where not exists (select 1 from bus_assignments a where a.student_id = s.id)
                """, Map.of(), Long.class);

        long delivered = num(notes, "delivered");
        long failed = num(notes, "failed");
        long sent = num(notes, "sent");
        long settled = sent + failed; // everything the provider has answered for
        double deliveryRate = settled == 0 ? 0 : Math.round(delivered * 1000.0 / settled) / 10.0;

        return new DashboardSummary(
                students.count(), students.countByTransportStatus(TransportStatus.ONBOARD), unassigned,
                buses.count(), buses.countByStatus(BusStatus.ACTIVE), busesOnRoute,
                sent, delivered, failed, num(notes, "pending"), deliveryRate,
                num(scans, "scans_today"), num(scans, "boardings_today"), num(scans, "exits_today"),
                num(scans, "rejected_today"), num(scans, "boardings_yesterday"),
                num(notes, "today"), num(notes, "yesterday"));
    }

    /** Recent scans merged with notification outcomes, newest first. */
    @Transactional(readOnly = true)
    public List<ActivityItem> activity(int limit) {
        List<ActivityItem> items = new ArrayList<>();
        for (ScanEvent e : scanEvents.findAllByOrderByScannedAtDesc(PageRequest.of(0, limit))) {
            items.add(toItem(e));
        }
        for (Notification n : notifications.findByStatusInOrderByUpdatedAtDesc(
                List.of(NotificationStatus.DELIVERED, NotificationStatus.FAILED), PageRequest.of(0, limit))) {
            items.add(toItem(n));
        }
        return items.stream()
                .sorted(Comparator.comparing(ActivityItem::timestamp).reversed())
                .limit(limit)
                .toList();
    }

    private static ActivityItem toItem(ScanEvent e) {
        if (e.getResult() == ScanResult.ACCEPTED) {
            String title = e.getEventType() == ScanEventType.BOARDING ? "Student boarded" : "Student exited";
            return new ActivityItem("SCAN_ACCEPTED", title, e.getStudentName() + " · " + e.getBusNumber(), e.getScannedAt());
        }
        return new ActivityItem("SCAN_REJECTED", "Scan rejected", e.getMessage(), e.getScannedAt());
    }

    private static ActivityItem toItem(Notification n) {
        if (n.getStatus() == NotificationStatus.DELIVERED) {
            Instant at = n.getDeliveredAt() != null ? n.getDeliveredAt() : n.getCreatedAt();
            return new ActivityItem("NOTIFICATION_DELIVERED", "Parent notified",
                    n.getRecipientName() + " · " + n.getStudentName(), at);
        }
        return new ActivityItem("NOTIFICATION_FAILED", "Notification failed",
                n.getRecipientName() + " · " + n.getFailureReason(), n.getSentAt() != null ? n.getSentAt() : n.getCreatedAt());
    }

    private static long num(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v == null ? 0 : ((Number) v).longValue();
    }
}
