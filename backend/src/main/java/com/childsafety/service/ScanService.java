package com.childsafety.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.childsafety.config.AppProperties;
import com.childsafety.dto.PageResponse;
import com.childsafety.dto.ScanDtos.ScanEventDto;
import com.childsafety.dto.ScanDtos.ScanRequest;
import com.childsafety.dto.ScanDtos.ScanResponse;
import com.childsafety.dto.ScanDtos.ScannedStudent;
import com.childsafety.entity.Bus;
import com.childsafety.entity.BusStatus;
import com.childsafety.entity.CardStatus;
import com.childsafety.entity.Notification;
import com.childsafety.entity.RejectionReason;
import com.childsafety.entity.RfidCard;
import com.childsafety.entity.ScanEvent;
import com.childsafety.entity.ScanEventType;
import com.childsafety.entity.ScanResult;
import com.childsafety.entity.ScanSource;
import com.childsafety.entity.Student;
import com.childsafety.entity.TransportStatus;
import com.childsafety.exception.ApiException;
import com.childsafety.repository.BusRepository;
import com.childsafety.repository.RfidCardRepository;
import com.childsafety.repository.ScanEventRepository;
import com.childsafety.repository.StudentRepository;

import jakarta.persistence.criteria.Predicate;

/**
 * Core RFID verification workflow. Every scan is recorded, accepted or rejected.
 *
 * <p>Concurrency: the bus row and then the student row are locked (always in that order), so
 * concurrent taps for the same student or simultaneous boardings on a full bus are serialised.
 */
@Service
public class ScanService {

    private final BusRepository buses;
    private final StudentRepository students;
    private final RfidCardRepository cards;
    private final ScanEventRepository scanEvents;
    private final NotificationService notifications;
    private final Duration duplicateWindow;
    private final ZoneId zone;

    public ScanService(BusRepository buses, StudentRepository students, RfidCardRepository cards,
            ScanEventRepository scanEvents, NotificationService notifications, AppProperties props) {
        this.buses = buses;
        this.students = students;
        this.cards = cards;
        this.scanEvents = scanEvents;
        this.notifications = notifications;
        this.duplicateWindow = Duration.ofSeconds(props.rfid().duplicateScanWindowSeconds());
        this.zone = props.zoneId();
    }

    @Transactional
    public ScanResponse processScan(ScanRequest request, ScanSource source) {
        Instant now = Instant.now();
        String uid = RfidUids.normalize(request.rfidUid());
        ScanEvent event = new ScanEvent(uid.length() > 64 ? uid.substring(0, 64) : uid, source, now);
        event.setEventType(request.eventType());

        // 1. Bus must exist and be in service.
        Bus bus = buses.findByIdForUpdate(request.busId()).orElse(null);
        if (bus == null) {
            return reject(event, null, null, RejectionReason.BUS_NOT_FOUND,
                    "Bus #" + request.busId() + " is not registered in the system");
        }
        event.setBus(bus);
        if (bus.getStatus() != BusStatus.ACTIVE) {
            return reject(event, null, bus, RejectionReason.BUS_NOT_ACTIVE,
                    bus.getBusNumber() + " is " + bus.getStatus().name().toLowerCase(Locale.ROOT) + " and cannot accept scans");
        }

        // 2. Card must be registered, active and linked to a student.
        RfidCard card = cards.findByUid(uid).orElse(null);
        if (card == null) {
            return reject(event, null, bus, RejectionReason.UNKNOWN_CARD, "Card " + uid + " is not registered to any student");
        }
        if (card.getStatus() != CardStatus.ACTIVE || card.getStudentId() == null) {
            return reject(event, null, bus, RejectionReason.CARD_INACTIVE, "Card " + uid + " is deactivated");
        }
        students.lockRow(card.getStudentId());
        Student student = students.findWithBusById(card.getStudentId())
                .orElseThrow(() -> new IllegalStateException("Card " + uid + " references a missing student"));
        event.setStudent(student);

        // Hardware readers usually send no event type: infer it from the current state.
        ScanEventType type = request.eventType() != null ? request.eventType()
                : student.getTransportStatus() == TransportStatus.ONBOARD ? ScanEventType.EXIT : ScanEventType.BOARDING;
        event.setEventType(type);

        // 3. Student must be assigned to this bus.
        if (student.getBus() == null) {
            return reject(event, student, bus, RejectionReason.STUDENT_NOT_ASSIGNED,
                    student.getFullName() + " is not assigned to any bus");
        }
        if (!student.getBus().getId().equals(bus.getId())) {
            return reject(event, student, bus, RejectionReason.UNAUTHORIZED_BUS,
                    student.getFullName() + " is assigned to " + student.getBus().getBusNumber() + ", not " + bus.getBusNumber());
        }

        // 4. Ignore repeated taps within the protection window.
        if (student.getLastScanAt() != null && student.getLastScanAt().plus(duplicateWindow).isAfter(now)) {
            long seconds = Duration.between(student.getLastScanAt(), now).toSeconds();
            return reject(event, student, bus, RejectionReason.DUPLICATE_SCAN,
                    "Duplicate scan ignored: " + student.getFullName() + " was scanned " + seconds
                            + "s ago (protection window " + duplicateWindow.toSeconds() + "s)");
        }

        // 5. The transition must be valid for the current state.
        if (type == ScanEventType.BOARDING && student.getTransportStatus() == TransportStatus.ONBOARD) {
            return reject(event, student, bus, RejectionReason.ALREADY_ONBOARD,
                    student.getFullName() + " is already onboard " + bus.getBusNumber() + " and must exit first");
        }
        if (type == ScanEventType.EXIT && student.getTransportStatus() != TransportStatus.ONBOARD) {
            return reject(event, student, bus, RejectionReason.NOT_ONBOARD,
                    student.getFullName() + " has not boarded, so an exit cannot be recorded");
        }

        // 6. Capacity (bus row is locked, so this count cannot race with another boarding).
        if (type == ScanEventType.BOARDING) {
            long onboard = students.countByBus_IdAndTransportStatus(bus.getId(), TransportStatus.ONBOARD);
            if (onboard >= bus.getCapacity()) {
                return reject(event, student, bus, RejectionReason.BUS_FULL,
                        bus.getBusNumber() + " is at full capacity (" + onboard + "/" + bus.getCapacity() + ")");
            }
        }

        // Accepted: update state, record the event and queue the parent notification.
        student.setTransportStatus(type == ScanEventType.BOARDING ? TransportStatus.ONBOARD : TransportStatus.EXITED);
        student.setLastScanAt(now);
        event.accept(student.getFullName() + (type == ScanEventType.BOARDING ? " boarded " : " exited ") + bus.getBusNumber());
        scanEvents.save(event);
        Notification notification = notifications.createForScan(event, student);

        long onboardAfter = students.countByBus_IdAndTransportStatus(bus.getId(), TransportStatus.ONBOARD);
        return new ScanResponse(true, null, event.getMessage(), ScanEventDto.from(event), toScanned(student),
                (int) onboardAfter, bus.getCapacity(), notification.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<ScanEventDto> list(ScanResult result, ScanEventType eventType, Long busId, String query,
            LocalDate fromDate, LocalDate toDate, int page, int size) {
        Instant from = fromDate == null ? null : fromDate.atStartOfDay(zone).toInstant();
        Instant to = toDate == null ? null : toDate.plusDays(1).atStartOfDay(zone).toInstant();
        Specification<ScanEvent> spec = (root, q, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (result != null) {
                predicates.add(cb.equal(root.get("result"), result));
            }
            if (eventType != null) {
                predicates.add(cb.equal(root.get("eventType"), eventType));
            }
            if (busId != null) {
                predicates.add(cb.equal(root.get("busId"), busId));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("scannedAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThan(root.get("scannedAt"), to));
            }
            if (StringUtils.hasText(query)) {
                String like = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                String uidLike = "%" + RfidUids.normalize(query) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("studentName"), "")), like),
                        cb.like(root.get("rfidUid"), uidLike)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "scannedAt", "id"));
        return PageResponse.of(scanEvents.findAll(spec, pageable), ScanEventDto::from);
    }

    @Transactional(readOnly = true)
    public ScanEventDto get(Long id) {
        return scanEvents.findById(id).map(ScanEventDto::from)
                .orElseThrow(() -> ApiException.notFound("Scan event " + id + " not found"));
    }

    private ScanResponse reject(ScanEvent event, Student student, Bus bus, RejectionReason reason, String message) {
        event.reject(reason, message);
        scanEvents.save(event);
        Integer onboard = bus == null ? null
                : (int) students.countByBus_IdAndTransportStatus(bus.getId(), TransportStatus.ONBOARD);
        return new ScanResponse(false, reason, message, ScanEventDto.from(event),
                student == null ? null : toScanned(student), onboard, bus == null ? null : bus.getCapacity(), null);
    }

    private static ScannedStudent toScanned(Student s) {
        return new ScannedStudent(s.getId(), s.getFullName(), s.getAdmissionNumber(), s.getClassName(), s.getSection(),
                s.getTransportStatus());
    }
}
