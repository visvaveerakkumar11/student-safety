package com.childsafety.service;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import com.childsafety.config.AppProperties;
import com.childsafety.dto.NotificationDtos.NotificationDto;
import com.childsafety.dto.PageResponse;
import com.childsafety.entity.Notification;
import com.childsafety.entity.NotificationStatus;
import com.childsafety.entity.ScanEvent;
import com.childsafety.entity.ScanEventType;
import com.childsafety.entity.Student;
import com.childsafety.exception.ApiException;
import com.childsafety.repository.NotificationRepository;
import com.childsafety.service.notification.NotificationProvider;
import com.childsafety.service.notification.NotificationProvider.DeliveryCheck;
import com.childsafety.service.notification.NotificationProvider.SendResult;

import jakarta.persistence.criteria.Predicate;

/**
 * Notification lifecycle: PENDING (created with the scan) -> SENT (provider accepted) ->
 * DELIVERED (provider receipt), or FAILED at either step. Failed notifications can be retried.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final int BATCH_SIZE = 25;
    /** Receipts are only polled for this long after sending; later ones stay SENT (no receipt). */
    private static final Duration RECEIPT_WINDOW = Duration.ofHours(24);

    private final NotificationRepository notifications;
    private final NotificationProvider provider;
    private final TransactionTemplate tx;
    private final DateTimeFormatter timeFormat;

    public NotificationService(NotificationRepository notifications, NotificationProvider provider,
            TransactionTemplate tx, AppProperties props) {
        this.notifications = notifications;
        this.provider = provider;
        this.tx = tx;
        this.timeFormat = DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH).withZone(props.zoneId());
    }

    /** Called inside the scan transaction: the notification exists if and only if the scan was accepted. */
    public Notification createForScan(ScanEvent event, Student student) {
        String action = event.getEventType() == ScanEventType.BOARDING ? "has successfully boarded" : "has exited";
        String message = "Dear Parent, your child " + student.getFullName() + " " + action + " school bus "
                + event.getBusNumber() + " at " + timeFormat.format(event.getScannedAt()) + ".";
        return notifications.save(new Notification(event, student, message, provider.name(), provider.isSimulated()));
    }

    /** Sends queued notifications, one short transaction per message. */
    public void dispatchPending() {
        List<Long> ids = notifications.findByStatusOrderByCreatedAtAsc(NotificationStatus.PENDING, PageRequest.of(0, BATCH_SIZE))
                .stream().map(Notification::getId).toList();
        for (Long id : ids) {
            tx.executeWithoutResult(status -> notifications.findById(id)
                    .filter(n -> n.getStatus() == NotificationStatus.PENDING)
                    .ifPresent(this::send));
        }
    }

    /** Polls the provider for delivery receipts of recently sent notifications. */
    public void refreshDeliveryStatuses() {
        List<Long> ids = notifications.findByStatusAndSentAtAfterOrderBySentAtAsc(NotificationStatus.SENT,
                Instant.now().minus(RECEIPT_WINDOW), PageRequest.of(0, BATCH_SIZE * 2))
                .stream().map(Notification::getId).toList();
        for (Long id : ids) {
            tx.executeWithoutResult(status -> notifications.findById(id)
                    .filter(n -> n.getStatus() == NotificationStatus.SENT)
                    .ifPresent(this::checkDelivery));
        }
    }

    @Transactional
    public NotificationDto retry(Long id) {
        Notification n = find(id);
        if (n.getStatus() != NotificationStatus.FAILED) {
            throw ApiException.conflict("Only failed notifications can be retried (current status: " + n.getStatus() + ")");
        }
        n.requeue();
        return NotificationDto.from(n, false);
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> list(NotificationStatus status, ScanEventType eventType, String query,
            int page, int size) {
        Specification<Notification> spec = (root, q, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (eventType != null) {
                predicates.add(cb.equal(root.get("eventType"), eventType));
            }
            if (StringUtils.hasText(query)) {
                String like = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("studentName")), like),
                        cb.like(cb.lower(root.get("recipientName")), like),
                        cb.like(cb.lower(root.get("busNumber")), like)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        return PageResponse.of(notifications.findAll(spec, pageable), n -> NotificationDto.from(n, false));
    }

    @Transactional(readOnly = true)
    public NotificationDto get(Long id) {
        return NotificationDto.from(find(id), true);
    }

    private Notification find(Long id) {
        return notifications.findById(id).orElseThrow(() -> ApiException.notFound("Notification " + id + " not found"));
    }

    private void send(Notification n) {
        n.recordAttempt();
        SendResult result;
        try {
            result = provider.send(n.getRecipientPhone(), n.getMessage());
        } catch (RuntimeException e) {
            log.warn("Notification provider error for notification {}: {}", n.getId(), e.getMessage());
            result = SendResult.rejected("Provider error: " + e.getMessage());
        }
        if (result.accepted()) {
            n.markSent(result.providerMessageId());
        } else {
            n.markFailed(result.error());
        }
    }

    private void checkDelivery(Notification n) {
        DeliveryCheck check = provider.checkDelivery(n.getProviderMessageId(), n.getSentAt());
        switch (check.state()) {
            case DELIVERED -> n.markDelivered();
            case FAILED -> n.markFailed(check.error());
            case PENDING -> { /* no receipt yet */ }
        }
    }
}
