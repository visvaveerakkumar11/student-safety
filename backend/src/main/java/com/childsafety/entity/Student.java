package com.childsafety.entity;

import java.time.Instant;

import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.Formula;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Dynamic updates keep admin edits from overwriting transport status written by a concurrent scan.
 */
@Entity
@Table(name = "students")
@DynamicUpdate
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admission_number", nullable = false, unique = true)
    private String admissionNumber;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "class_name", nullable = false)
    private String className;

    @Column(nullable = false)
    private String section;

    @Column(name = "parent_name", nullable = false)
    private String parentName;

    @Column(name = "parent_phone", nullable = false)
    private String parentPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "transport_status", nullable = false)
    private TransportStatus transportStatus = TransportStatus.NOT_BOARDED;

    @Column(name = "last_scan_at")
    private Instant lastScanAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    /** Current bus assignment, stored in the bus_assignments table. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinTable(name = "bus_assignments",
            joinColumns = @JoinColumn(name = "student_id"),
            inverseJoinColumns = @JoinColumn(name = "bus_id"))
    private Bus bus;

    /** UID of the student's active RFID card (read-only; cards are managed through RfidCard). */
    @Formula("(select c.uid from rfid_cards c where c.student_id = id)")
    private String cardUid;

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getAdmissionNumber() { return admissionNumber; }
    public void setAdmissionNumber(String admissionNumber) { this.admissionNumber = admissionNumber; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }
    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }
    public String getParentName() { return parentName; }
    public void setParentName(String parentName) { this.parentName = parentName; }
    public String getParentPhone() { return parentPhone; }
    public void setParentPhone(String parentPhone) { this.parentPhone = parentPhone; }
    public TransportStatus getTransportStatus() { return transportStatus; }
    public void setTransportStatus(TransportStatus transportStatus) { this.transportStatus = transportStatus; }
    public Instant getLastScanAt() { return lastScanAt; }
    public void setLastScanAt(Instant lastScanAt) { this.lastScanAt = lastScanAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Bus getBus() { return bus; }
    public void setBus(Bus bus) { this.bus = bus; }
    public String getCardUid() { return cardUid; }
}
