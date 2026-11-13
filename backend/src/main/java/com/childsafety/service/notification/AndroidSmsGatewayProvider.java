package com.childsafety.service.notification;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.childsafety.config.AppProperties;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Sends parent alerts as real SMS from an Android phone running the open-source "SMS Gateway for Android"
 * app (https://sms-gate.app), through its public cloud API. Messages go out over that phone's SIM, so
 * there is no gateway fee or DLT registration, and the phone reports delivery back.
 * Active when {@code app.notifications.provider=sms-gate}.
 */
@Component
@ConditionalOnProperty(name = "app.notifications.provider", havingValue = "sms-gate")
public class AndroidSmsGatewayProvider implements NotificationProvider {

    private static final String API_URL = "https://api.sms-gate.app/3rdparty/v1";
    /** Numbers entered without a country code are treated as Indian mobile numbers. */
    private static final String DEFAULT_COUNTRY_CODE = "91";

    private final RestClient client;

    public AndroidSmsGatewayProvider(AppProperties props) {
        AppProperties.SmsGate gate = props.notifications().smsGate();
        if (gate == null || !StringUtils.hasText(gate.username()) || !StringUtils.hasText(gate.password())) {
            throw new IllegalStateException("NOTIFICATION_PROVIDER=sms-gate requires SMS_GATE_USERNAME and SMS_GATE_PASSWORD");
        }
        String credentials = Base64.getEncoder()
                .encodeToString((gate.username().trim() + ":" + gate.password().trim()).getBytes(StandardCharsets.UTF_8));
        this.client = RestClient.builder()
                .baseUrl(API_URL)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Basic " + credentials)
                .build();
    }

    @Override
    public String name() {
        return "ANDROID_SMS";
    }

    @Override
    public boolean isSimulated() {
        return false;
    }

    @Override
    public SendResult send(String recipientPhone, String message) {
        String to = toE164(recipientPhone);
        if (to == null) {
            return SendResult.rejected("Invalid recipient number: " + recipientPhone);
        }
        try {
            GatewayMessage sent = client.post().uri("/messages")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("textMessage", Map.of("text", message), "phoneNumbers", List.of(to)))
                    .retrieve()
                    .body(GatewayMessage.class);
            return sent != null && StringUtils.hasText(sent.id())
                    ? SendResult.accepted(sent.id())
                    : SendResult.rejected("SMS gateway returned no message id");
        } catch (RestClientResponseException e) {
            return SendResult.rejected("SMS gateway rejected the message: " + e.getStatusCode()
                    + (e.getStatusCode().value() == 401 ? " (check SMS_GATE_USERNAME / SMS_GATE_PASSWORD)" : ""));
        } catch (RestClientException e) {
            return SendResult.rejected("SMS gateway unreachable: " + e.getMessage());
        }
    }

    @Override
    public DeliveryCheck checkDelivery(String providerMessageId, Instant sentAt) {
        try {
            GatewayMessage m = client.get().uri("/messages/{id}", providerMessageId)
                    .retrieve()
                    .body(GatewayMessage.class);
            if (m == null || m.state() == null) {
                return new DeliveryCheck(DeliveryState.PENDING, null);
            }
            return switch (m.state()) {
                case "Delivered" -> new DeliveryCheck(DeliveryState.DELIVERED, null);
                case "Failed", "Cancelled" -> new DeliveryCheck(DeliveryState.FAILED, "Phone reported: " + m.failureReason());
                default -> new DeliveryCheck(DeliveryState.PENDING, null); // Pending, Processed, Sent, Cancelling
            };
        } catch (RestClientException e) {
            // Transient lookup problem: keep the message SENT and poll again on the next cycle.
            return new DeliveryCheck(DeliveryState.PENDING, null);
        }
    }

    /** "+91 70107 47232", "07010747232" and "7010747232" all become "+917010747232". */
    static String toE164(String phone) {
        if (phone == null) {
            return null;
        }
        String digits = phone.replaceAll("\\D", "");
        if (phone.trim().startsWith("+")) {
            return digits.length() >= 8 ? "+" + digits : null;
        }
        digits = digits.replaceFirst("^0+", "");
        if (digits.length() == 10) {
            return "+" + DEFAULT_COUNTRY_CODE + digits;
        }
        return digits.length() > 10 ? "+" + digits : null;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GatewayMessage(String id, String state, List<Recipient> recipients) {

        String failureReason() {
            return recipients == null ? state : recipients.stream()
                    .map(Recipient::error).filter(StringUtils::hasText).findFirst().orElse(state);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Recipient(String phoneNumber, String state, String error) {}
}
