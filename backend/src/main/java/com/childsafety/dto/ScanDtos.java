package com.childsafety.dto;

import java.time.Instant;

import com.childsafety.entity.RejectionReason;
import com.childsafety.entity.ScanEvent;
import com.childsafety.entity.ScanEventType;
import com.childsafety.entity.ScanResult;
import com.childsafety.entity.ScanSource;
import com.childsafety.entity.TransportStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ScanDtos {

    private ScanDtos() {}

    /**
     * @param eventType optional: when omitted (typical for hardware readers) it is inferred from the
     *                  student's current status.
     */
    public record ScanRequest(
            @NotNull(message = "Bus is required") Long busId,
            @NotBlank(message = "RFID card UID is required") @Size(max = 64) String rfidUid,
            ScanEventType eventType) {}

    public record ScanEventDto(Long id, String rfidUid, Long studentId, String studentName, Long busId, String busNumber,
            ScanEventType eventType, ScanResult result, RejectionReason rejectionReason, String message,
            ScanSource source, Instant scannedAt) {

        public static ScanEventDto from(ScanEvent e) {
            return new ScanEventDto(e.getId(), e.getRfidUid(), e.getStudentId(), e.getStudentName(), e.getBusId(),
                    e.getBusNumber(), e.getEventType(), e.getResult(), e.getRejectionReason(), e.getMessage(),
                    e.getSource(), e.getScannedAt());
        }
    }

    public record ScannedStudent(Long id, String fullName, String admissionNumber, String className, String section,
            TransportStatus transportStatus) {}

    /**
     * Result of processing one scan. {@code accepted=false} is a normal, recorded outcome (not an HTTP error).
     */
    public record ScanResponse(boolean accepted, RejectionReason rejectionReason, String message, ScanEventDto event,
            ScannedStudent student, Integer busOnboardCount, Integer busCapacity, Long notificationId) {}
}
