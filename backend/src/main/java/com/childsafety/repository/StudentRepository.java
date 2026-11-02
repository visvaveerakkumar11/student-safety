package com.childsafety.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.childsafety.entity.Student;
import com.childsafety.entity.TransportStatus;

public interface StudentRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {

    @Override
    @EntityGraph(attributePaths = "bus")
    Page<Student> findAll(Specification<Student> spec, Pageable pageable);

    @EntityGraph(attributePaths = "bus")
    @Query("select s from Student s where s.id = :id")
    Optional<Student> findWithBusById(@Param("id") Long id);

    /**
     * Row lock that serialises scans and edits for one student. Kept as a plain native statement because
     * loading a Student outer-joins bus_assignments, and Postgres rejects FOR UPDATE on outer joins.
     * Call this before loading the student in the transaction.
     */
    @Query(value = "select id from students where id = :id for update", nativeQuery = true)
    Optional<Long> lockRow(@Param("id") Long id);

    @EntityGraph(attributePaths = "bus")
    List<Student> findByBus_IdOrderByFullName(Long busId);

    long countByTransportStatus(TransportStatus status);

    long countByBus_IdAndTransportStatus(Long busId, TransportStatus status);

    boolean existsByAdmissionNumberIgnoreCase(String admissionNumber);

    boolean existsByAdmissionNumberIgnoreCaseAndIdNot(String admissionNumber, Long id);

    @Query("select distinct s.className from Student s order by s.className")
    List<String> findDistinctClassNames();
}
