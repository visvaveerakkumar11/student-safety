package com.childsafety.security;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.childsafety.config.AppProperties;
import com.childsafety.entity.Admin;

@Service
public class TokenService {

    public record IssuedToken(String value, Instant expiresAt) {}

    private final JwtEncoder encoder;
    private final long expirationMinutes;

    public TokenService(JwtEncoder encoder, AppProperties props) {
        this.encoder = encoder;
        this.expirationMinutes = props.security().jwtExpirationMinutes();
    }

    public IssuedToken issue(Admin admin) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(expirationMinutes, ChronoUnit.MINUTES);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("child-safety-backend")
                .subject(admin.getId().toString())
                .claim("email", admin.getEmail())
                .claim("scope", "admin")
                .issuedAt(now)
                .expiresAt(expiresAt)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new IssuedToken(token, expiresAt);
    }
}
