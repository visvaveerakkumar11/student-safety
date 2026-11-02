package com.childsafety.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.childsafety.dto.BusDtos.BusDetailDto;
import com.childsafety.dto.BusDtos.BusDto;
import com.childsafety.dto.BusDtos.BusRequest;
import com.childsafety.dto.ScanDtos.ScanEventDto;
import com.childsafety.dto.StudentDtos.StudentDto;
import com.childsafety.entity.Bus;
import com.childsafety.entity.TransportStatus;
import com.childsafety.exception.ApiException;
import com.childsafety.repository.BusRepository;
import com.childsafety.repository.ScanEventRepository;
import com.childsafety.repository.StudentRepository;

@Service
public class BusService {

    private final BusRepository buses;
    private final StudentRepository students;
    private final ScanEventRepository scanEvents;
    private final StudentService studentService;

    public BusService(BusRepository buses, StudentRepository students, ScanEventRepository scanEvents,
            StudentService studentService) {
        this.buses = buses;
        this.students = students;
        this.scanEvents = scanEvents;
        this.studentService = studentService;
    }

    @Transactional(readOnly = true)
    public List<BusDto> list() {
        return buses.findAll().stream()
                .sorted(Comparator.comparing(Bus::getBusNumber))
                .map(BusDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public BusDetailDto get(Long id) {
        Bus bus = find(id);
        List<StudentDto> assigned = students.findByBus_IdOrderByFullName(id).stream()
                .map(s -> StudentDto.from(s, false)).toList();
        List<ScanEventDto> scans = scanEvents.findByBusIdOrderByScannedAtDesc(id, PageRequest.of(0, 15))
                .stream().map(ScanEventDto::from).toList();
        return new BusDetailDto(BusDto.from(bus), assigned, scans);
    }

    @Transactional
    public BusDto create(BusRequest request) {
        String number = request.busNumber().trim().toUpperCase();
        String registration = request.registrationNumber().trim().toUpperCase();
        if (buses.existsByBusNumberIgnoreCase(number)) {
            throw ApiException.conflict("Bus number " + number + " already exists");
        }
        if (buses.existsByRegistrationNumberIgnoreCase(registration)) {
            throw ApiException.conflict("Registration number " + registration + " already exists");
        }
        Bus bus = new Bus();
        apply(bus, request);
        return BusDto.from(buses.save(bus));
    }

    @Transactional
    public BusDto update(Long id, BusRequest request) {
        Bus bus = buses.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound("Bus " + id + " not found"));
        String number = request.busNumber().trim().toUpperCase();
        String registration = request.registrationNumber().trim().toUpperCase();
        if (buses.existsByBusNumberIgnoreCaseAndIdNot(number, id)) {
            throw ApiException.conflict("Bus number " + number + " already exists");
        }
        if (buses.existsByRegistrationNumberIgnoreCaseAndIdNot(registration, id)) {
            throw ApiException.conflict("Registration number " + registration + " already exists");
        }
        long onboard = students.countByBus_IdAndTransportStatus(id, TransportStatus.ONBOARD);
        if (request.capacity() < onboard) {
            throw ApiException.conflict("Capacity cannot be lower than the " + onboard + " students currently onboard");
        }
        apply(bus, request);
        return BusDto.from(bus);
    }

    @Transactional
    public void delete(Long id) {
        Bus bus = buses.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound("Bus " + id + " not found"));
        long onboard = students.countByBus_IdAndTransportStatus(id, TransportStatus.ONBOARD);
        if (onboard > 0) {
            throw ApiException.conflict(bus.getBusNumber() + " has " + onboard + " students onboard and cannot be deleted");
        }
        // Assignments are removed by the FK cascade; scan history keeps the bus number snapshot.
        buses.delete(bus);
    }

    @Transactional
    public void assignStudents(Long busId, List<Long> studentIds) {
        Bus bus = find(busId);
        studentIds.stream().distinct().forEach(studentId -> studentService.assignBus(studentId, bus));
    }

    @Transactional
    public void unassignStudent(Long busId, Long studentId) {
        find(busId);
        StudentDto student = students.findWithBusById(studentId).map(s -> StudentDto.from(s, false))
                .orElseThrow(() -> ApiException.notFound("Student " + studentId + " not found"));
        if (student.bus() == null || !student.bus().id().equals(busId)) {
            throw ApiException.badRequest(student.fullName() + " is not assigned to this bus");
        }
        studentService.assignBus(studentId, null);
    }

    private Bus find(Long id) {
        return buses.findById(id).orElseThrow(() -> ApiException.notFound("Bus " + id + " not found"));
    }

    private static void apply(Bus bus, BusRequest r) {
        bus.setBusNumber(r.busNumber().trim().toUpperCase());
        bus.setRegistrationNumber(r.registrationNumber().trim().toUpperCase());
        bus.setDriverName(r.driverName().trim());
        bus.setDriverPhone(r.driverPhone().trim());
        bus.setRouteName(r.routeName().trim());
        bus.setCapacity(r.capacity());
        bus.setStatus(r.status());
    }
}
