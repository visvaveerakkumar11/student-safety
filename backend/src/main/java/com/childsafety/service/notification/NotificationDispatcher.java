package com.childsafety.service.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.childsafety.service.NotificationService;

/** Background worker that moves notifications through PENDING -> SENT -> DELIVERED/FAILED. */
@Component
class NotificationDispatcher {

    private static final Logger log = LoggerFactory.getLogger(NotificationDispatcher.class);

    private final NotificationService notifications;

    NotificationDispatcher(NotificationService notifications) {
        this.notifications = notifications;
    }

    @Scheduled(fixedDelayString = "${app.notifications.dispatch-interval-ms}", initialDelay = 3000)
    void run() {
        try {
            notifications.dispatchPending();
            notifications.refreshDeliveryStatuses();
        } catch (RuntimeException e) {
            log.warn("Notification dispatch cycle failed: {}", e.getMessage());
        }
    }
}
