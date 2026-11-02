package com.childsafety.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Read models for the dashboard, analytics and settings screens. */
public final class InsightDtos {

    private InsightDtos() {}

    public record DashboardSummary(
            long totalStudents, long studentsOnboard, long unassignedStudents,
            long totalBuses, long activeBuses, long busesOnRoute,
            long notificationsSent, long notificationsDelivered, long notificationsFailed, long notificationsPending,
            double deliveryRate,
            long scansToday, long boardingsToday, long exitsToday, long rejectedToday,
            long boardingsYesterday, long notificationsToday, long notificationsYesterday) {}

    /**
     * @param kind SCAN_ACCEPTED, SCAN_REJECTED, NOTIFICATION_DELIVERED or NOTIFICATION_FAILED
     */
    public record ActivityItem(String kind, String title, String description, Instant timestamp) {}

    public record TimeSeriesPoint(LocalDate periodStart, long boardings, long exits, long rejected) {}

    public record ReasonCount(String reason, long count) {}

    public record StatusCount(String status, long count) {}

    public record BusUsage(Long busId, String busNumber, int capacity, int assigned, int onboard,
            long boardings, double averageDailyBoardings) {}

    public record AnalyticsSummary(LocalDate from, LocalDate to, long totalScans, long acceptedScans,
            long rejectedScans, double verificationSuccessRate, List<ReasonCount> rejectionsByReason,
            List<StatusCount> notificationsByStatus, double notificationDeliveryRate, List<BusUsage> busUsage) {}

    public record SystemSettings(String timezone, int duplicateScanWindowSeconds, String notificationProvider,
            boolean notificationsSimulated, double simulatedFailureRate, boolean readerApiKeyConfigured) {}
}
