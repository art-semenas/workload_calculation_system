package com.workload.repository;

import com.workload.entity.Division;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DivisionRepository extends JpaRepository<Division, UUID> {
    Optional<Division> findByName(String name);
}
