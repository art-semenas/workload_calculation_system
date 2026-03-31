package com.workload.repository;

import com.workload.entity.ObjectEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectRepository extends JpaRepository<ObjectEntity, UUID> {
    List<ObjectEntity> findAllByBranchId(UUID branchId);

    List<ObjectEntity> findAllByBranchDivisionId(UUID divisionId);
}
