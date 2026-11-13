package com.childsafety.config;

import java.time.ZoneId;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String timezone,
        Cors cors,
        Security security,
        Bootstrap bootstrap,
        Rfid rfid,
        Notifications notifications) {

    public record Cors(List<String> allowedOrigins) {}

    public record Security(String jwtSecret, long jwtExpirationMinutes, String readerApiKey) {}

    public record Bootstrap(String adminEmail, String adminPassword, String adminName) {}

    public record Rfid(int duplicateScanWindowSeconds) {}

    /** @param provider "simulated" (default) or "sms-gate" (real SMS from an Android phone). */
    public record Notifications(String provider, double simulatedFailureRate, long dispatchIntervalMs, SmsGate smsGate) {}

    public record SmsGate(String username, String password) {}

    public ZoneId zoneId() {
        return ZoneId.of(timezone);
    }
}
