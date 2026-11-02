package com.childsafety.service.notification;

import java.time.Instant;

/**
 * Outbound parent-notification channel (SMS, WhatsApp, push...). The simulated provider is used
 * until a real gateway is integrated; a real implementation replaces it as the single bean.
 */
public interface NotificationProvider {

    /** Provider name stored on each notification, e.g. "SIMULATED", "TWILIO_SMS". */
    String name();

    /** True when no real message is sent; statuses are then simulated and labelled as such. */
    boolean isSimulated();

    /** Submits a message. Accepted means the provider took the request (status SENT), not that it was delivered. */
    SendResult send(String recipientPhone, String message);

    /** Asks the provider whether a sent message has been delivered (delivery receipt). */
    DeliveryCheck checkDelivery(String providerMessageId, Instant sentAt);

    record SendResult(boolean accepted, String providerMessageId, String error) {
        public static SendResult accepted(String providerMessageId) {
            return new SendResult(true, providerMessageId, null);
        }

        public static SendResult rejected(String error) {
            return new SendResult(false, null, error);
        }
    }

    enum DeliveryState { PENDING, DELIVERED, FAILED }

    record DeliveryCheck(DeliveryState state, String error) {}
}
