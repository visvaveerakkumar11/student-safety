package com.childsafety.dto;

import java.time.Instant;

import com.childsafety.entity.Notification;
import com.childsafety.entity.NotificationStatus;
import com.childsafety.entity.ScanEventType;

public final class NotificationDtos {

    private NotificationDtos() {}

    /**
     * @param recipientPhone masked in list responses, full only on the detail endpoint.
     */
    public record NotificationDto(Long id, Long scanEventId, Long studentId, String studentName, String busNumber,
            String recipientName, String recipientPhone, ScanEventType eventType, String message,
            NotificationStatus status, String provider, boolean simulated, String providerMessageId,
            String failureReason, int attempts, Instant createdAt, Instant sentAt, Instant deliveredAt) {

        public static NotificationDto from(Notification n, boolean revealContact) {
            return new NotificationDto(n.getId(), n.getScanEventId(), n.getStudentId(), n.getStudentName(),
                    n.getBusNumber(), n.getRecipientName(),
                    revealContact ? n.getRecipientPhone() : PhoneMask.mask(n.getRecipientPhone()),
                    n.getEventType(), n.getMessage(), n.getStatus(), n.getProvider(), n.isSimulated(),
                    n.getProviderMessageId(), n.getFailureReason(), n.getAttempts(), n.getCreatedAt(),
                    n.getSentAt(), n.getDeliveredAt());
        }
    }
}
