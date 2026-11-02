package com.childsafety.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Authenticates physical RFID readers on POST /api/rfid/scan via a shared key header.
 * Disabled when RFID_READER_API_KEY is not configured.
 */
class ReaderApiKeyFilter extends OncePerRequestFilter {

    static final String HEADER = "X-Reader-Key";
    static final String READER_PRINCIPAL = "rfid-reader";

    private final byte[] apiKey;

    ReaderApiKeyFilter(String apiKey) {
        this.apiKey = apiKey == null || apiKey.isBlank() ? null : apiKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String provided = request.getHeader(HEADER);
        if (apiKey != null && provided != null
                && "POST".equals(request.getMethod())
                && "/api/rfid/scan".equals(request.getRequestURI())
                && MessageDigest.isEqual(apiKey, provided.getBytes(StandardCharsets.UTF_8))) {
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                    READER_PRINCIPAL, null, List.of(new SimpleGrantedAuthority(SecurityConfig.READER_AUTHORITY))));
            SecurityContextHolder.setContext(context);
        }
        chain.doFilter(request, response);
    }
}
