package com.workload.repository;

import com.workload.entity.ObjectRepair;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectRepairRepository extends JpaRepository<ObjectRepair, UUID> {
  List<ObjectRepair> findAllByObjectId(UUID objectId);

  Optional<ObjectRepair> findByObjectIdAndRepairTypeId(UUID objectId, UUID repairTypeId);

  boolean existsByRepairTypeIdAndCountGreaterThan(UUID repairTypeId, int count);
}
