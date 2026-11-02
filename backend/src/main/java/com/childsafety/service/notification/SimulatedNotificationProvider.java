package com.childsafety.service.notification;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Component;

import com.childsafety.config.AppProperties;

/**
 * Stand-in for a real SMS/WhatsApp gateway. Nothing is actually sent.
 * About half of the configured failure rate fails at submission and half at delivery,
 * and receipts arrive a few seconds after sending, so every status path can be demonstrated.
 */
@Component
public class SimulatedNotificationProvider implements NotificationProvider {

    private static final Duration RECEIPT_DELAY = Duration.ofSeconds(3);

    private final double failureRate;

    public SimulatedNotificationProvider(AppProperties props) {
        this.failureRate = Math.clamp(props.notifications().simulatedFailureRate(), 0.0, 1.0);
    }

    @Override
    public String name() {
        return "SIMULATED";
    }

    @Override
    public boolean isSimulated() {
        return true;
    }

    @Override
    public SendResult send(String recipientPhone, String message) {
        if (recipientPhone == null || recipientPhone.replaceAll("\\D", "").length() < 10) {
            return SendResult.rejected("Simulated: invalid recipient number");
        }
        if (ThreadLocalRandom.current().nextDouble() < failureRate / 2) {
            return SendResult.rejected("Simulated: gateway timeout while submitting message");
        }
        String id = "SIM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
        return SendResult.accepted(id);
    }

    @Override
    public DeliveryCheck checkDelivery(String providerMessageId, Instant sentAt) {
        if (sentAt == null || Duration.between(sentAt, Instant.now()).compareTo(RECEIPT_DELAY) < 0) {
            return new DeliveryCheck(DeliveryState.PENDING, null);
        }
        // Deterministic per message so repeated polls give the same answer.
        double roll = Math.floorMod(providerMessageId.hashCode(), 1000) / 1000.0;
        return roll < failureRate / 2
                ? new DeliveryCheck(DeliveryState.FAILED, "Simulated: handset unreachable")
                : new DeliveryCheck(DeliveryState.DELIVERED, null);
    }
}
