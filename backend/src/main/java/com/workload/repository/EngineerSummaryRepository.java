package com.workload.repository;

import com.workload.entity.EngineerSummary;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface EngineerSummaryRepository extends JpaRepository<EngineerSummary, UUID> {
  Optional<EngineerSummary> findByEngineerId(UUID engineerId);

  @Modifying
  @Transactional
  void deleteByEngineerId(UUID engineerId);
}
