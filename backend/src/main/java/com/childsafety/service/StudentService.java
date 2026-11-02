package com.childsafety.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.childsafety.dto.NotificationDtos.NotificationDto;
import com.childsafety.dto.PageResponse;
import com.childsafety.dto.ScanDtos.ScanEventDto;
import com.childsafety.dto.StudentDtos.StudentDetailDto;
import com.childsafety.dto.StudentDtos.StudentDto;
import com.childsafety.dto.StudentDtos.StudentRequest;
import com.childsafety.entity.Bus;
import com.childsafety.entity.RfidCard;
import com.childsafety.entity.Student;
import com.childsafety.entity.TransportStatus;
import com.childsafety.exception.ApiException;
import com.childsafety.repository.BusRepository;
import com.childsafety.repository.NotificationRepository;
import com.childsafety.repository.RfidCardRepository;
import com.childsafety.repository.ScanEventRepository;
import com.childsafety.repository.StudentRepository;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

@Service
public class StudentService {

    private static final Map<String, String> SORTABLE = Map.of(
            "fullName", "fullName", "admissionNumber", "admissionNumber", "className", "className",
            "transportStatus", "transportStatus", "lastScanAt", "lastScanAt");

    private final StudentRepository students;
    private final BusRepository buses;
    private final RfidCardRepository cards;
    private final ScanEventRepository scanEvents;
    private final NotificationRepository notifications;

    public StudentService(StudentRepository students, BusRepository buses, RfidCardRepository cards,
            ScanEventRepository scanEvents, NotificationRepository notifications) {
        this.students = students;
        this.buses = buses;
        this.cards = cards;
        this.scanEvents = scanEvents;
        this.notifications = notifications;
    }

    /**
     * @param busId     filter by assigned bus; {@code 0} means "no bus assigned"
     */
    @Transactional(readOnly = true)
    public PageResponse<StudentDto> list(String query, String className, Long busId, TransportStatus status,
            String sort, String direction, int page, int size) {
        Specification<Student> spec = (root, q, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(query)) {
                String like = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
                String uidLike = "%" + RfidUids.normalize(query) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), like),
                        cb.like(cb.lower(root.get("admissionNumber")), like),
                        cb.like(cb.lower(root.get("parentName")), like),
                        cb.like(root.get("cardUid"), uidLike)));
            }
            if (StringUtils.hasText(className)) {
                predicates.add(cb.equal(root.get("className"), className));
            }
            if (busId != null) {
                var bus = root.join("bus", JoinType.LEFT);
                predicates.add(busId == 0 ? cb.isNull(bus.get("id")) : cb.equal(bus.get("id"), busId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("transportStatus"), status));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        String sortField = SORTABLE.getOrDefault(sort, "fullName");
        Sort.Direction dir = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        PageRequest pageable = PageRequest.of(page, size, Sort.by(dir, sortField).and(Sort.by("id")));
        return PageResponse.of(students.findAll(spec, pageable), s -> StudentDto.from(s, false));
    }

    @Transactional(readOnly = true)
    public List<String> classNames() {
        return students.findDistinctClassNames();
    }

    @Transactional(readOnly = true)
    public StudentDetailDto get(Long id) {
        Student student = students.findWithBusById(id)
                .orElseThrow(() -> ApiException.notFound("Student " + id + " not found"));
        List<ScanEventDto> scans = scanEvents.findByStudentIdOrderByScannedAtDesc(id, PageRequest.of(0, 10))
                .stream().map(ScanEventDto::from).toList();
        List<NotificationDto> recent = notifications.findByStudentIdOrderByCreatedAtDesc(id, PageRequest.of(0, 10))
                .stream().map(n -> NotificationDto.from(n, true)).toList();
        return new StudentDetailDto(StudentDto.from(student, true), scans, recent);
    }

    @Transactional
    public StudentDto create(StudentRequest request) {
        String admission = request.admissionNumber().trim();
        if (students.existsByAdmissionNumberIgnoreCase(admission)) {
            throw ApiException.conflict("Admission number " + admission + " already exists");
        }
        String uid = RfidUids.normalizeForRegistration(request.rfidUid());
        RfidCard card = availableCard(uid, null);

        Student student = new Student();
        apply(student, request);
        student.setBus(resolveBus(request.busId()));
        students.saveAndFlush(student);

        card.assignTo(student.getId());
        cards.save(card);
        return withCard(student, uid);
    }

    @Transactional
    public StudentDto update(Long id, StudentRequest request) {
        Student student = lock(id);
        String admission = request.admissionNumber().trim();
        if (students.existsByAdmissionNumberIgnoreCaseAndIdNot(admission, id)) {
            throw ApiException.conflict("Admission number " + admission + " already exists");
        }
        Bus newBus = resolveBus(request.busId());
        Long currentBusId = student.getBus() == null ? null : student.getBus().getId();
        Long newBusId = newBus == null ? null : newBus.getId();
        if (!Objects.equals(currentBusId, newBusId) && student.getTransportStatus() == TransportStatus.ONBOARD) {
            throw ApiException.conflict(student.getFullName() + " is currently onboard. Record an exit before changing the bus.");
        }

        String uid = RfidUids.normalizeForRegistration(request.rfidUid());
        if (!uid.equals(student.getCardUid())) {
            RfidCard newCard = availableCard(uid, id);
            cards.findByStudentId(id).ifPresent(old -> {
                old.release();
                cards.saveAndFlush(old); // free the unique student_id before linking the new card
            });
            newCard.assignTo(id);
            cards.save(newCard);
        }

        apply(student, request);
        student.setBus(newBus);
        return withCard(student, uid);
    }

    @Transactional
    public void delete(Long id) {
        Student student = lock(id);
        if (student.getTransportStatus() == TransportStatus.ONBOARD) {
            throw ApiException.conflict(student.getFullName() + " is currently onboard and cannot be deleted.");
        }
        cards.findByStudentId(id).ifPresent(card -> {
            card.release();
            cards.saveAndFlush(card);
        });
        // Scan events and notifications keep their history (FKs are ON DELETE SET NULL).
        students.delete(student);
    }

    /** Assigns or clears a student's bus; used by the bus management screen. */
    @Transactional
    public void assignBus(Long studentId, Bus bus) {
        Student student = lock(studentId);
        boolean changing = bus == null ? student.getBus() != null
                : student.getBus() == null || !student.getBus().getId().equals(bus.getId());
        if (changing && student.getTransportStatus() == TransportStatus.ONBOARD) {
            throw ApiException.conflict(student.getFullName() + " is currently onboard and cannot be reassigned.");
        }
        student.setBus(bus);
    }

    private Student lock(Long id) {
        students.lockRow(id).orElseThrow(() -> ApiException.notFound("Student " + id + " not found"));
        return students.findWithBusById(id).orElseThrow();
    }

    /** Returns the card for this UID if it is free (or already belongs to {@code studentId}), else a new card. */
    private RfidCard availableCard(String uid, Long studentId) {
        return cards.findByUid(uid).map(card -> {
            if (card.getStudentId() != null && !card.getStudentId().equals(studentId)) {
                String owner = students.findById(card.getStudentId()).map(Student::getFullName).orElse("another student");
                throw ApiException.conflict("RFID card " + uid + " is already assigned to " + owner);
            }
            return card;
        }).orElseGet(() -> new RfidCard(uid));
    }

    private Bus resolveBus(Long busId) {
        if (busId == null) {
            return null;
        }
        return buses.findById(busId).orElseThrow(() -> ApiException.notFound("Bus " + busId + " not found"));
    }

    private static void apply(Student s, StudentRequest r) {
        s.setAdmissionNumber(r.admissionNumber().trim());
        s.setFullName(r.fullName().trim());
        s.setClassName(r.className().trim());
        s.setSection(r.section().trim().toUpperCase(Locale.ROOT));
        s.setParentName(r.parentName().trim());
        s.setParentPhone(r.parentPhone().trim());
    }

    /** The card UID is a read-only formula that is not refreshed inside this transaction. */
    private static StudentDto withCard(Student s, String uid) {
        StudentDto dto = StudentDto.from(s, true);
        return new StudentDto(dto.id(), dto.admissionNumber(), dto.fullName(), dto.className(), dto.section(),
                dto.parentName(), dto.parentPhone(), uid, dto.bus(), dto.transportStatus(), dto.lastScanAt(),
                dto.createdAt());
    }
}
