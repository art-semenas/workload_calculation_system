package com.workload.repository;

import com.workload.entity.ObjectEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ObjectRepository extends JpaRepository<ObjectEntity, UUID> {
  List<ObjectEntity> findAllByBranchId(UUID branchId);

  List<ObjectEntity> findAllByBranchDivisionId(UUID divisionId);

  long countByBranchId(UUID branchId);

  long countByBranchDivisionId(UUID divisionId);

  @Query("SELECT o.id FROM ObjectEntity o")
  List<UUID> findAllIds();
}
