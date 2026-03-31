package com.workload.repository;

import com.workload.entity.RecordsTask;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecordsTaskRepository extends JpaRepository<RecordsTask, UUID> {
  Optional<RecordsTask> findByObjectId(UUID objectId);
}
