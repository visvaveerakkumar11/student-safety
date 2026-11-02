package com.childsafety.repository;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.childsafety.entity.ScanEvent;

public interface ScanEventRepository extends JpaRepository<ScanEvent, Long>, JpaSpecificationExecutor<ScanEvent> {

    List<ScanEvent> findByStudentIdOrderByScannedAtDesc(Long studentId, Pageable pageable);

    List<ScanEvent> findByBusIdOrderByScannedAtDesc(Long busId, Pageable pageable);

    List<ScanEvent> findAllByOrderByScannedAtDesc(Pageable pageable);
}
