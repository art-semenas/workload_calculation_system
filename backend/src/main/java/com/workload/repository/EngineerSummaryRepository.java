package com.workload.repository;

import com.workload.entity.EngineerSummary;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EngineerSummaryRepository extends JpaRepository<EngineerSummary, UUID> {
  Optional<EngineerSummary> findByEngineerId(UUID engineerId);

  void deleteByEngineerId(UUID engineerId);
}
