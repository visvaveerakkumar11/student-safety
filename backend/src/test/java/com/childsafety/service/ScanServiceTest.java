package com.childsafety.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import com.childsafety.config.AppProperties;
import com.childsafety.dto.ScanDtos.ScanRequest;
import com.childsafety.dto.ScanDtos.ScanResponse;
import com.childsafety.entity.Bus;
import com.childsafety.entity.BusStatus;
import com.childsafety.entity.Notification;
import com.childsafety.entity.RejectionReason;
import com.childsafety.entity.RfidCard;
import com.childsafety.entity.ScanEvent;
import com.childsafety.entity.ScanEventType;
import com.childsafety.entity.ScanResult;
import com.childsafety.entity.ScanSource;
import com.childsafety.entity.Student;
import com.childsafety.entity.TransportStatus;
import com.childsafety.repository.BusRepository;
import com.childsafety.repository.RfidCardRepository;
import com.childsafety.repository.ScanEventRepository;
import com.childsafety.repository.StudentRepository;

class ScanServiceTest {

    private static final String UID = "04A31F6B";

    private final BusRepository buses = mock(BusRepository.class);
    private final StudentRepository students = mock(StudentRepository.class);
    private final RfidCardRepository cards = mock(RfidCardRepository.class);
    private final ScanEventRepository scanEvents = mock(ScanEventRepository.class);
    private final NotificationService notifications = mock(NotificationService.class);

    private ScanService service;
    private Bus bus;
    private Student student;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties("Asia/Kolkata", new AppProperties.Cors(List.of()),
                new AppProperties.Security("x".repeat(32), 60, null), new AppProperties.Bootstrap(null, null, null),
                new AppProperties.Rfid(10), new AppProperties.Notifications(0, 2000));
        service = new ScanService(buses, students, cards, scanEvents, notifications, props);

        bus = bus(1L, "BUS-01", 20);
        student = new Student();
        ReflectionTestUtils.setField(student, "id", 7L);
        student.setFullName("Aarav Sharma");
        student.setParentName("Vikram Sharma");
        student.setParentPhone("+91 98400 11201");
        student.setBus(bus);

        RfidCard card = new RfidCard(UID);
        card.assignTo(7L);

        when(buses.findByIdForUpdate(1L)).thenReturn(Optional.of(bus));
        when(cards.findByUid(UID)).thenReturn(Optional.of(card));
        when(students.lockRow(7L)).thenReturn(Optional.of(7L));
        when(students.findWithBusById(7L)).thenReturn(Optional.of(student));
        when(scanEvents.save(any(ScanEvent.class))).thenAnswer(inv -> inv.getArgument(0));
        Notification notification = mock(Notification.class);
        when(notification.getId()).thenReturn(99L);
        when(notifications.createForScan(any(), any())).thenReturn(notification);
    }

    @Test
    void boardingIsAcceptedUpdatesStatusAndQueuesNotification() {
        ScanResponse response = service.processScan(new ScanRequest(1L, "04:a3:1f:6b", ScanEventType.BOARDING), ScanSource.SIMULATOR);

        assertThat(response.accepted()).isTrue();
        assertThat(student.getTransportStatus()).isEqualTo(TransportStatus.ONBOARD);
        assertThat(student.getLastScanAt()).isNotNull();
        assertThat(response.notificationId()).isEqualTo(99L);
        assertThat(savedEvent().getResult()).isEqualTo(ScanResult.ACCEPTED);
        assertThat(savedEvent().getRfidUid()).isEqualTo(UID);
    }

    @Test
    void exitAfterBoardingIsAccepted() {
        student.setTransportStatus(TransportStatus.ONBOARD);
        student.setLastScanAt(Instant.now().minusSeconds(600));

        ScanResponse response = service.processScan(new ScanRequest(1L, UID, ScanEventType.EXIT), ScanSource.SIMULATOR);

        assertThat(response.accepted()).isTrue();
        assertThat(student.getTransportStatus()).isEqualTo(TransportStatus.EXITED);
    }

    @Test
    void eventTypeIsInferredWhenReaderOmitsIt() {
        student.setTransportStatus(TransportStatus.ONBOARD);
        student.setLastScanAt(Instant.now().minusSeconds(600));

        ScanResponse response = service.processScan(new ScanRequest(1L, UID, null), ScanSource.READER);

        assertThat(response.accepted()).isTrue();
        assertThat(response.event().eventType()).isEqualTo(ScanEventType.EXIT);
        assertThat(response.event().source()).isEqualTo(ScanSource.READER);
    }

    @Test
    void cannotBoardTwice() {
        student.setTransportStatus(TransportStatus.ONBOARD);
        student.setLastScanAt(Instant.now().minusSeconds(600));
        assertRejected(ScanEventType.BOARDING, RejectionReason.ALREADY_ONBOARD);
    }

    @Test
    void cannotExitWithoutBoarding() {
        student.setTransportStatus(TransportStatus.EXITED);
        assertRejected(ScanEventType.EXIT, RejectionReason.NOT_ONBOARD);
    }

    @Test
    void repeatedTapWithinWindowIsDuplicate() {
        student.setTransportStatus(TransportStatus.ONBOARD);
        student.setLastScanAt(Instant.now().minusSeconds(3));
        assertRejected(ScanEventType.EXIT, RejectionReason.DUPLICATE_SCAN);
    }

    @Test
    void unknownCardIsRejectedAndRecorded() {
        when(cards.findByUid("DEADBEEF")).thenReturn(Optional.empty());

        ScanResponse response = service.processScan(new ScanRequest(1L, "DEADBEEF", ScanEventType.BOARDING), ScanSource.SIMULATOR);

        assertThat(response.rejectionReason()).isEqualTo(RejectionReason.UNKNOWN_CARD);
        assertThat(savedEvent().getBusId()).isEqualTo(1L);
        assertThat(savedEvent().getStudentId()).isNull();
    }

    @Test
    void scanOnAnotherBusIsUnauthorized() {
        when(buses.findByIdForUpdate(2L)).thenReturn(Optional.of(bus(2L, "BUS-02", 20)));

        ScanResponse response = service.processScan(new ScanRequest(2L, UID, ScanEventType.BOARDING), ScanSource.SIMULATOR);

        assertThat(response.rejectionReason()).isEqualTo(RejectionReason.UNAUTHORIZED_BUS);
        assertThat(student.getTransportStatus()).isEqualTo(TransportStatus.NOT_BOARDED);
    }

    @Test
    void fullBusRejectsBoarding() {
        when(students.countByBus_IdAndTransportStatus(1L, TransportStatus.ONBOARD)).thenReturn(20L);
        assertRejected(ScanEventType.BOARDING, RejectionReason.BUS_FULL);
    }

    @Test
    void inactiveBusRejectsScans() {
        bus.setStatus(BusStatus.MAINTENANCE);
        assertRejected(ScanEventType.BOARDING, RejectionReason.BUS_NOT_ACTIVE);
    }

    @Test
    void unknownBusIsRecordedAsRejected() {
        when(buses.findByIdForUpdate(404L)).thenReturn(Optional.empty());

        ScanResponse response = service.processScan(new ScanRequest(404L, UID, ScanEventType.BOARDING), ScanSource.SIMULATOR);

        assertThat(response.rejectionReason()).isEqualTo(RejectionReason.BUS_NOT_FOUND);
        verify(scanEvents).save(any(ScanEvent.class));
    }

    private void assertRejected(ScanEventType type, RejectionReason reason) {
        TransportStatus before = student.getTransportStatus();

        ScanResponse response = service.processScan(new ScanRequest(1L, UID, type), ScanSource.SIMULATOR);

        assertThat(response.accepted()).isFalse();
        assertThat(response.rejectionReason()).isEqualTo(reason);
        assertThat(savedEvent().getResult()).isEqualTo(ScanResult.REJECTED);
        assertThat(student.getTransportStatus()).isEqualTo(before);
        verify(notifications, never()).createForScan(any(), any());
    }

    private ScanEvent savedEvent() {
        ArgumentCaptor<ScanEvent> captor = ArgumentCaptor.forClass(ScanEvent.class);
        verify(scanEvents).save(captor.capture());
        return captor.getValue();
    }

    private static Bus bus(Long id, String number, int capacity) {
        Bus b = new Bus();
        ReflectionTestUtils.setField(b, "id", id);
        b.setBusNumber(number);
        b.setCapacity(capacity);
        b.setStatus(BusStatus.ACTIVE);
        return b;
    }
}
