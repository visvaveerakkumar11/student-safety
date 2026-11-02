package com.childsafety.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.childsafety.entity.RfidCard;

public interface RfidCardRepository extends JpaRepository<RfidCard, Long> {

    Optional<RfidCard> findByUid(String uid);

    Optional<RfidCard> findByStudentId(Long studentId);
}
