package com.workload.repository;

import com.workload.entity.Travel;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelRepository extends JpaRepository<Travel, UUID> {
    Optional<Travel> findByObjectId(UUID objectId);
}
