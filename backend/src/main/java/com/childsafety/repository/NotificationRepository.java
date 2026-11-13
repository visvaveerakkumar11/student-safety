package com.childsafety.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

import com.childsafety.entity.Notification;
import com.childsafety.entity.NotificationStatus;

public interface NotificationRepository extends JpaRepository<Notification, Long>, JpaSpecificationExecutor<Notification> {

    List<Notification> findByStatusAndProviderOrderByCreatedAtAsc(NotificationStatus status, String provider,
            Pageable pageable);

    List<Notification> findByStatusAndProviderAndSentAtAfterOrderBySentAtAsc(NotificationStatus status, String provider,
            Instant sentAfter, Pageable pageable);

    /** Row lock so two backend instances sharing the database never send or update the same notification at once. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from Notification n where n.id = :id")
    Optional<Notification> findForUpdate(Long id);

    List<Notification> findByStudentIdOrderByCreatedAtDesc(Long studentId, Pageable pageable);

    List<Notification> findByStatusInOrderByUpdatedAtDesc(List<NotificationStatus> statuses, Pageable pageable);
}
