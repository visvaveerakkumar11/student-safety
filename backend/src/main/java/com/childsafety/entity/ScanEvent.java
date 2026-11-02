package com.childsafety.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Immutable audit record of one RFID scan. Student and bus are kept as plain ids plus
 * name/number snapshots so history stays readable after a student or bus is deleted.
 */
@Entity
@Table(name = "scan_events")
public class ScanEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rfid_uid", nullable = false, updatable = false)
    private String rfidUid;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "bus_id")
    private Long busId;

    @Column(name = "student_name")
    private String studentName;

    @Column(name = "bus_number")
    private String busNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type")
    private ScanEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScanResult result;

    @Enumerated(EnumType.STRING)
    @Column(name = "rejection_reason")
    private RejectionReason rejectionReason;

    @Column(nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private ScanSource source;

    @Column(name = "scanned_at", nullable = false, updatable = false)
    private Instant scannedAt;

    protected ScanEvent() {}

    public ScanEvent(String rfidUid, ScanSource source, Instant scannedAt) {
        this.rfidUid = rfidUid;
        this.source = source;
        this.scannedAt = scannedAt;
    }

    public void setBus(Bus bus) {
        this.busId = bus.getId();
        this.busNumber = bus.getBusNumber();
    }

    public void setStudent(Student student) {
        this.studentId = student.getId();
        this.studentName = student.getFullName();
    }

    public void accept(String message) {
        this.result = ScanResult.ACCEPTED;
        this.rejectionReason = null;
        this.message = message;
    }

    public void reject(RejectionReason reason, String message) {
        this.result = ScanResult.REJECTED;
        this.rejectionReason = reason;
        this.message = message;
    }

    public Long getId() { return id; }
    public String getRfidUid() { return rfidUid; }
    public Long getStudentId() { return studentId; }
    public Long getBusId() { return busId; }
    public String getStudentName() { return studentName; }
    public String getBusNumber() { return busNumber; }
    public ScanEventType getEventType() { return eventType; }
    public void setEventType(ScanEventType eventType) { this.eventType = eventType; }
    public ScanResult getResult() { return result; }
    public RejectionReason getRejectionReason() { return rejectionReason; }
    public String getMessage() { return message; }
    public ScanSource getSource() { return source; }
    public Instant getScannedAt() { return scannedAt; }
}
