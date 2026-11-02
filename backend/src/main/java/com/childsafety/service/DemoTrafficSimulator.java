package com.childsafety.service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.childsafety.dto.ScanDtos.ScanRequest;
import com.childsafety.entity.Bus;
import com.childsafety.entity.BusStatus;
import com.childsafety.entity.ScanSource;
import com.childsafety.entity.Student;
import com.childsafety.repository.BusRepository;
import com.childsafety.repository.StudentRepository;

/**
 * Demo traffic for showcasing the dashboard: periodically taps a card on an active bus through the normal
 * verification path, so scans, onboard counts and parent notifications keep changing. Most taps are a rider
 * of that bus (boarding or exit is inferred); a few are an unregistered card or a rider of another bus, which
 * the verification rules reject. Enabled only when {@code app.demo.traffic-enabled=true}.
 */
@Component
@ConditionalOnProperty(name = "app.demo.traffic-enabled", havingValue = "true")
class DemoTrafficSimulator {

    private static final Logger log = LoggerFactory.getLogger(DemoTrafficSimulator.class);

    private final BusRepository buses;
    private final StudentRepository students;
    private final ScanService scans;

    DemoTrafficSimulator(BusRepository buses, StudentRepository students, ScanService scans) {
        this.buses = buses;
        this.students = students;
        this.scans = scans;
    }

    @Scheduled(fixedDelay = 20_000, initialDelay = 15_000)
    void tap() {
        try {
            List<Bus> active = buses.findAll().stream().filter(b -> b.getStatus() == BusStatus.ACTIVE).toList();
            if (active.isEmpty()) {
                return;
            }
            ThreadLocalRandom random = ThreadLocalRandom.current();
            Bus bus = pick(active);
            int roll = random.nextInt(100);
            String uid;
            if (roll < 4) {
                uid = "%08X".formatted(random.nextInt());
            } else {
                Bus cardBus = roll < 7 && active.size() > 1 ? pick(active.stream().filter(b -> b != bus).toList()) : bus;
                List<Student> riders = students.findByBus_IdOrderByFullName(cardBus.getId()).stream()
                        .filter(s -> s.getCardUid() != null).toList();
                if (riders.isEmpty()) {
                    return;
                }
                uid = pick(riders).getCardUid();
            }
            scans.processScan(new ScanRequest(bus.getId(), uid, null), ScanSource.READER);
        } catch (RuntimeException e) {
            log.warn("Demo traffic tap failed: {}", e.getMessage());
        }
    }

    private static <T> T pick(List<T> items) {
        return items.get(ThreadLocalRandom.current().nextInt(items.size()));
    }
}
