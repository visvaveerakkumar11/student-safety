package com.childsafety.service;

import java.util.Locale;

import com.childsafety.exception.ApiException;

/**
 * RFID UIDs arrive in many formats ("04:a3:1f:6b", "04-A3-1F-6B", "04A31F6B").
 * They are stored and compared in one canonical form: uppercase hex, no separators.
 */
public final class RfidUids {

    private RfidUids() {}

    public static String normalize(String raw) {
        return raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT).replaceAll("[\\s:\\-]", "");
    }

    /** Normalizes a UID being registered to a student and rejects anything that is not a plausible card UID. */
    public static String normalizeForRegistration(String raw) {
        String uid = normalize(raw);
        if (!uid.matches("^[0-9A-F]{4,32}$")) {
            throw ApiException.badRequest("RFID UID must contain 4-32 hexadecimal characters");
        }
        return uid;
    }
}
