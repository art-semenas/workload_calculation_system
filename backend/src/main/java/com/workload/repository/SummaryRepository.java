package com.workload.repository;

import com.workload.entity.Summary;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SummaryRepository extends JpaRepository<Summary, UUID> {
  Optional<Summary> findByObjectId(UUID objectId);

  void deleteByObjectId(UUID objectId);
}
