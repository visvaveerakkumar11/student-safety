package com.childsafety.entity;

/** Why an RFID scan was rejected. Order mirrors the verification pipeline in ScanService. */
public enum RejectionReason {
    BUS_NOT_FOUND,
    BUS_NOT_ACTIVE,
    UNKNOWN_CARD,
    CARD_INACTIVE,
    STUDENT_NOT_ASSIGNED,
    UNAUTHORIZED_BUS,
    DUPLICATE_SCAN,
    ALREADY_ONBOARD,
    NOT_ONBOARD,
    BUS_FULL
}
