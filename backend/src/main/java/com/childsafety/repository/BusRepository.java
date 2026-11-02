package com.childsafety.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.childsafety.entity.Bus;
import com.childsafety.entity.BusStatus;

import jakarta.persistence.LockModeType;

public interface BusRepository extends JpaRepository<Bus, Long> {

    /** Row lock that serialises boardings on a bus so the capacity check cannot race. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Bus b where b.id = :id")
    Optional<Bus> findByIdForUpdate(@Param("id") Long id);

    boolean existsByBusNumberIgnoreCase(String busNumber);

    boolean existsByBusNumberIgnoreCaseAndIdNot(String busNumber, Long id);

    boolean existsByRegistrationNumberIgnoreCase(String registrationNumber);

    boolean existsByRegistrationNumberIgnoreCaseAndIdNot(String registrationNumber, Long id);

    long countByStatus(BusStatus status);
}
