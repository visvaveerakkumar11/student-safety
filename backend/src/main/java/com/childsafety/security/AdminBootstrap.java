package com.childsafety.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.childsafety.config.AppProperties;
import com.childsafety.entity.Admin;
import com.childsafety.repository.AdminRepository;

/** Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists yet. */
@Component
class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AdminRepository admins;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties.Bootstrap config;

    AdminBootstrap(AdminRepository admins, PasswordEncoder passwordEncoder, AppProperties props) {
        this.admins = admins;
        this.passwordEncoder = passwordEncoder;
        this.config = props.bootstrap();
    }

    @Override
    public void run(ApplicationArguments args) {
        if (admins.count() > 0) {
            return;
        }
        String email = config.adminEmail();
        String password = config.adminPassword();
        if (email == null || email.isBlank() || password == null || password.length() < 8) {
            log.warn("No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) and restart to create one.");
            return;
        }
        Admin admin = new Admin();
        admin.setEmail(email.trim().toLowerCase());
        admin.setFullName(config.adminName());
        admin.setPasswordHash(passwordEncoder.encode(password));
        admins.save(admin);
        log.info("Created initial admin account {}", admin.getEmail());
    }
}
