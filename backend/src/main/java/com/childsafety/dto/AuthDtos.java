package com.childsafety.dto;

import java.time.Instant;

import com.childsafety.entity.Admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    public record LoginRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email") String email,
            @NotBlank(message = "Password is required") String password) {}

    public record LoginResponse(String token, Instant expiresAt, AdminDto admin) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Current password is required") String currentPassword,
            @NotBlank(message = "New password is required")
            @Size(min = 8, max = 72, message = "Password must be 8-72 characters") String newPassword) {}

    public record AdminDto(Long id, String email, String fullName, Instant lastLoginAt) {
        public static AdminDto from(Admin admin) {
            return new AdminDto(admin.getId(), admin.getEmail(), admin.getFullName(), admin.getLastLoginAt());
        }
    }
}
