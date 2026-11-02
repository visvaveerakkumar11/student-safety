package com.childsafety.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.childsafety.dto.AuthDtos.AdminDto;
import com.childsafety.dto.AuthDtos.ChangePasswordRequest;
import com.childsafety.dto.AuthDtos.LoginRequest;
import com.childsafety.dto.AuthDtos.LoginResponse;
import com.childsafety.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request);
    }

    @GetMapping("/me")
    public AdminDto me(@AuthenticationPrincipal Jwt jwt) {
        return auth.me(Long.valueOf(jwt.getSubject()));
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChangePasswordRequest request) {
        auth.changePassword(Long.valueOf(jwt.getSubject()), request);
    }
}
