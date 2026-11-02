package com.childsafety.service;

import java.time.Instant;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.childsafety.dto.AuthDtos.AdminDto;
import com.childsafety.dto.AuthDtos.ChangePasswordRequest;
import com.childsafety.dto.AuthDtos.LoginRequest;
import com.childsafety.dto.AuthDtos.LoginResponse;
import com.childsafety.entity.Admin;
import com.childsafety.exception.ApiException;
import com.childsafety.repository.AdminRepository;
import com.childsafety.security.TokenService;
import com.childsafety.security.TokenService.IssuedToken;

@Service
public class AuthService {

    private final AdminRepository admins;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;

    public AuthService(AdminRepository admins, PasswordEncoder passwordEncoder, TokenService tokens) {
        this.admins = admins;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Admin admin = admins.findByEmail(request.email().trim().toLowerCase(Locale.ROOT))
                .filter(a -> passwordEncoder.matches(request.password(), a.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        admin.setLastLoginAt(Instant.now());
        IssuedToken token = tokens.issue(admin);
        return new LoginResponse(token.value(), token.expiresAt(), AdminDto.from(admin));
    }

    @Transactional(readOnly = true)
    public AdminDto me(Long adminId) {
        return AdminDto.from(find(adminId));
    }

    @Transactional
    public void changePassword(Long adminId, ChangePasswordRequest request) {
        Admin admin = find(adminId);
        if (!passwordEncoder.matches(request.currentPassword(), admin.getPasswordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        admin.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    private Admin find(Long id) {
        return admins.findById(id).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Account no longer exists"));
    }
}
