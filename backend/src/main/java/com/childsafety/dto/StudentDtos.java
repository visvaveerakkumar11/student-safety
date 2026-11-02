package com.childsafety.dto;

import java.time.Instant;
import java.util.List;

import com.childsafety.dto.BusDtos.BusRef;
import com.childsafety.entity.Student;
import com.childsafety.entity.TransportStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class StudentDtos {

    private StudentDtos() {}

    public record StudentRequest(
            @NotBlank(message = "Admission number is required") @Size(max = 30) String admissionNumber,
            @NotBlank(message = "Full name is required") @Size(max = 100) String fullName,
            @NotBlank(message = "Class is required") @Size(max = 30) String className,
            @NotBlank(message = "Section is required") @Size(max = 10) String section,
            @NotBlank(message = "Parent/guardian name is required") @Size(max = 100) String parentName,
            @NotBlank(message = "Parent contact is required")
            @Pattern(regexp = "^\\+?[0-9 ()-]{7,20}$", message = "Enter a valid phone number") String parentPhone,
            @NotBlank(message = "RFID card UID is required")
            @Pattern(regexp = "^[0-9A-Fa-f:\\- ]{4,64}$", message = "UID must be hexadecimal, e.g. 04:A3:1F:6B") String rfidUid,
            Long busId) {}

    /**
     * @param parentPhone masked in list responses, full only on the detail endpoint.
     */
    public record StudentDto(Long id, String admissionNumber, String fullName, String className, String section,
            String parentName, String parentPhone, String rfidUid, BusRef bus, TransportStatus transportStatus,
            Instant lastScanAt, Instant createdAt) {

        public static StudentDto from(Student s, boolean revealContact) {
            return new StudentDto(s.getId(), s.getAdmissionNumber(), s.getFullName(), s.getClassName(), s.getSection(),
                    s.getParentName(), revealContact ? s.getParentPhone() : PhoneMask.mask(s.getParentPhone()),
                    s.getCardUid(), BusRef.from(s.getBus()), s.getTransportStatus(), s.getLastScanAt(), s.getCreatedAt());
        }
    }

    public record StudentDetailDto(StudentDto student, List<ScanDtos.ScanEventDto> recentScans,
            List<NotificationDtos.NotificationDto> recentNotifications) {}
}
