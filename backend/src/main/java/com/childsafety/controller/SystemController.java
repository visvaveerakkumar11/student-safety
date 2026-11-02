package com.childsafety.controller;

import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.childsafety.config.AppProperties;
import com.childsafety.dto.InsightDtos.SystemSettings;
import com.childsafety.service.notification.NotificationProvider;

@RestController
@RequestMapping("/api")
public class SystemController {

    private final AppProperties props;
    private final NotificationProvider provider;
    private final JdbcTemplate jdbc;

    public SystemController(AppProperties props, NotificationProvider provider, JdbcTemplate jdbc) {
        this.props = props;
        this.provider = provider;
        this.jdbc = jdbc;
    }

    /** Public liveness check that also confirms database connectivity. */
    @GetMapping("/health")
    public Map<String, String> health() {
        String database;
        try {
            jdbc.queryForObject("select 1", Integer.class);
            database = "UP";
        } catch (RuntimeException e) {
            database = "DOWN";
        }
        return Map.of("status", "UP", "database", database);
    }

    /** Read-only view of the runtime configuration (secrets are never returned). */
    @GetMapping("/settings")
    public SystemSettings settings() {
        String readerKey = props.security().readerApiKey();
        return new SystemSettings(props.timezone(), props.rfid().duplicateScanWindowSeconds(), provider.name(),
                provider.isSimulated(), props.notifications().simulatedFailureRate(),
                readerKey != null && !readerKey.isBlank());
    }
}
