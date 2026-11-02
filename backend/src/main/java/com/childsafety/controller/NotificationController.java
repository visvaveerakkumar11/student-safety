package com.childsafety.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.childsafety.dto.NotificationDtos.NotificationDto;
import com.childsafety.dto.PageResponse;
import com.childsafety.entity.NotificationStatus;
import com.childsafety.entity.ScanEventType;
import com.childsafety.service.NotificationService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    public PageResponse<NotificationDto> list(
            @RequestParam(required = false) NotificationStatus status,
            @RequestParam(required = false) ScanEventType eventType,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return notifications.list(status, eventType, q, Math.max(page, 0), Math.clamp(size, 1, 100));
    }

    @GetMapping("/{id}")
    public NotificationDto get(@PathVariable Long id) {
        return notifications.get(id);
    }

    @PostMapping("/{id}/retry")
    public NotificationDto retry(@PathVariable Long id) {
        return notifications.retry(id);
    }
}
