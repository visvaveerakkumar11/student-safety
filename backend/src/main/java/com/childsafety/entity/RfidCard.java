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
@Table(name = "rfid_cards")
public class RfidCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Canonical form: uppercase hex without separators. */
    @Column(nullable = false, unique = true)
    private String uid;

    @Column(name = "student_id", unique = true)
    private Long studentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CardStatus status = CardStatus.ACTIVE;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private Instant issuedAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected RfidCard() {}

    public RfidCard(String uid) {
        this.uid = uid;
    }

    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public void assignTo(Long studentId) {
        this.studentId = studentId;
        this.status = CardStatus.ACTIVE;
    }

    public void release() {
        this.studentId = null;
        this.status = CardStatus.INACTIVE;
    }

    public Long getId() { return id; }
    public String getUid() { return uid; }
    public Long getStudentId() { return studentId; }
    public CardStatus getStatus() { return status; }
    public Instant getIssuedAt() { return issuedAt; }
}
