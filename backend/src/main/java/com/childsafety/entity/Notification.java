package com.childsafety.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "scan_event_id")
    private Long scanEventId;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "student_name", nullable = false)
    private String studentName;

    @Column(name = "bus_number", nullable = false)
    private String busNumber;

    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false)
    private String recipientPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private ScanEventType eventType;

    @Column(nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationStatus status = NotificationStatus.PENDING;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false)
    private boolean simulated;

    @Column(name = "provider_message_id")
    private String providerMessageId;

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Notification() {}

    public Notification(ScanEvent event, Student student, String message, String provider, boolean simulated) {
        this.scanEventId = event.getId();
        this.studentId = student.getId();
        this.studentName = student.getFullName();
        this.busNumber = event.getBusNumber();
        this.recipientName = student.getParentName();
        this.recipientPhone = student.getParentPhone();
        this.eventType = event.getEventType();
        this.message = message;
        this.provider = provider;
        this.simulated = simulated;
    }

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public void markSent(String providerMessageId) {
        this.status = NotificationStatus.SENT;
        this.providerMessageId = providerMessageId;
        this.failureReason = null;
        this.sentAt = Instant.now();
    }

    public void markDelivered() {
        this.status = NotificationStatus.DELIVERED;
        this.deliveredAt = Instant.now();
    }

    public void markFailed(String reason) {
        this.status = NotificationStatus.FAILED;
        this.failureReason = reason;
    }

    public void requeue() {
        this.status = NotificationStatus.PENDING;
        this.failureReason = null;
        this.providerMessageId = null;
        this.sentAt = null;
        this.deliveredAt = null;
    }

    public void recordAttempt() {
        this.attempts++;
    }

    public Long getId() { return id; }
    public Long getScanEventId() { return scanEventId; }
    public Long getStudentId() { return studentId; }
    public String getStudentName() { return studentName; }
    public String getBusNumber() { return busNumber; }
    public String getRecipientName() { return recipientName; }
    public String getRecipientPhone() { return recipientPhone; }
    public ScanEventType getEventType() { return eventType; }
    public String getMessage() { return message; }
    public NotificationStatus getStatus() { return status; }
    public String getProvider() { return provider; }
    public boolean isSimulated() { return simulated; }
    public String getProviderMessageId() { return providerMessageId; }
    public String getFailureReason() { return failureReason; }
    public int getAttempts() { return attempts; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getSentAt() { return sentAt; }
    public Instant getDeliveredAt() { return deliveredAt; }
}
