package com.childsafety.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.childsafety.dto.InsightDtos.AnalyticsSummary;
import com.childsafety.dto.InsightDtos.TimeSeriesPoint;
import com.childsafety.service.AnalyticsService;
import com.childsafety.service.AnalyticsService.Granularity;

/** Dates are calendar days in the school's timezone; {@code to} is inclusive. */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analytics;

    public AnalyticsController(AnalyticsService analytics) {
        this.analytics = analytics;
    }

    @GetMapping("/daily")
    public List<TimeSeriesPoint> daily(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end = to != null ? to : analytics.today();
        return analytics.series(Granularity.DAY, from != null ? from : end.minusDays(13), end);
    }

    @GetMapping("/weekly")
    public List<TimeSeriesPoint> weekly(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end = to != null ? to : analytics.today();
        return analytics.series(Granularity.WEEK, from != null ? from : end.minusWeeks(11), end);
    }

    @GetMapping("/monthly")
    public List<TimeSeriesPoint> monthly(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end = to != null ? to : analytics.today();
        return analytics.series(Granularity.MONTH, from != null ? from : end.minusMonths(5), end);
    }

    @GetMapping("/summary")
    public AnalyticsSummary summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end = to != null ? to : analytics.today();
        return analytics.summary(from != null ? from : end.minusDays(29), end);
    }
}
