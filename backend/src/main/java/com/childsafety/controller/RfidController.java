package com.childsafety.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.childsafety.dto.PageResponse;
import com.childsafety.dto.ScanDtos.ScanEventDto;
import com.childsafety.dto.ScanDtos.ScanRequest;
import com.childsafety.dto.ScanDtos.ScanResponse;
import com.childsafety.entity.ScanEventType;
import com.childsafety.entity.ScanResult;
import com.childsafety.entity.ScanSource;
import com.childsafety.security.SecurityConfig;
import com.childsafety.service.ScanService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/rfid")
public class RfidController {

    private final ScanService scans;

    public RfidController(ScanService scans) {
        this.scans = scans;
    }

    /**
     * Entry point for both the admin simulator (bearer token) and physical readers (X-Reader-Key).
     * Rejected scans are a normal outcome: they are recorded and returned with {@code accepted=false}.
     */
    @PostMapping("/scan")
    public ScanResponse scan(@Valid @RequestBody ScanRequest request, Authentication authentication) {
        boolean fromReader = authentication.getAuthorities().stream()
                .anyMatch(a -> SecurityConfig.READER_AUTHORITY.equals(a.getAuthority()));
        return scans.processScan(request, fromReader ? ScanSource.READER : ScanSource.SIMULATOR);
    }

    @GetMapping("/activity")
    public PageResponse<ScanEventDto> activity(
            @RequestParam(required = false) ScanResult result,
            @RequestParam(required = false) ScanEventType eventType,
            @RequestParam(required = false) Long busId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        return scans.list(result, eventType, busId, q, from, to, Math.max(page, 0), Math.clamp(size, 1, 100));
    }

    @GetMapping("/activity/{id}")
    public ScanEventDto get(@PathVariable Long id) {
        return scans.get(id);
    }
}
