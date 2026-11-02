package com.childsafety.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.childsafety.entity.Notification;
import com.childsafety.entity.NotificationStatus;

public interface NotificationRepository extends JpaRepository<Notification, Long>, JpaSpecificationExecutor<Notification> {

    List<Notification> findByStatusOrderByCreatedAtAsc(NotificationStatus status, Pageable pageable);

    List<Notification> findByStatusAndSentAtAfterOrderBySentAtAsc(NotificationStatus status, Instant sentAfter, Pageable pageable);

    List<Notification> findByStudentIdOrderByCreatedAtDesc(Long studentId, Pageable pageable);

    List<Notification> findByStatusInOrderByUpdatedAtDesc(List<NotificationStatus> statuses, Pageable pageable);
}
