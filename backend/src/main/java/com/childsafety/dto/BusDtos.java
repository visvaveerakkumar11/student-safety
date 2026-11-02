package com.childsafety.dto;

import java.time.Instant;
import java.util.List;

import com.childsafety.entity.Bus;
import com.childsafety.entity.BusStatus;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class BusDtos {

    private BusDtos() {}

    public record BusRequest(
            @NotBlank(message = "Bus number is required") @Size(max = 20) String busNumber,
            @NotBlank(message = "Registration number is required") @Size(max = 20) String registrationNumber,
            @NotBlank(message = "Driver name is required") @Size(max = 100) String driverName,
            @NotBlank(message = "Driver contact is required")
            @Pattern(regexp = "^\\+?[0-9 ()-]{7,20}$", message = "Enter a valid phone number") String driverPhone,
            @NotBlank(message = "Route name is required") @Size(max = 120) String routeName,
            @NotNull(message = "Capacity is required")
            @Min(value = 1, message = "Capacity must be at least 1")
            @Max(value = 100, message = "Capacity cannot exceed 100") Integer capacity,
            @NotNull(message = "Status is required") BusStatus status) {}

    public record AssignStudentsRequest(@NotEmpty(message = "Select at least one student") List<Long> studentIds) {}

    /** Compact bus reference embedded in other DTOs. */
    public record BusRef(Long id, String busNumber, String routeName) {
        public static BusRef from(Bus bus) {
            return bus == null ? null : new BusRef(bus.getId(), bus.getBusNumber(), bus.getRouteName());
        }
    }

    public record BusDto(Long id, String busNumber, String registrationNumber, String driverName, String driverPhone,
            String routeName, int capacity, BusStatus status, int assignedCount, int onboardCount,
            Instant createdAt, Instant updatedAt) {
        public static BusDto from(Bus bus) {
            return new BusDto(bus.getId(), bus.getBusNumber(), bus.getRegistrationNumber(), bus.getDriverName(),
                    bus.getDriverPhone(), bus.getRouteName(), bus.getCapacity(), bus.getStatus(),
                    bus.getAssignedCount(), bus.getOnboardCount(), bus.getCreatedAt(), bus.getUpdatedAt());
        }
    }

    public record BusDetailDto(BusDto bus, List<StudentDtos.StudentDto> students, List<ScanDtos.ScanEventDto> recentScans) {}
}
