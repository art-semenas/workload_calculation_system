package com.workload.repository;

import com.workload.entity.ObjectSystemAssignment;
import com.workload.entity.SystemType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectSystemAssignmentRepository
        extends JpaRepository<ObjectSystemAssignment, UUID> {
    List<ObjectSystemAssignment> findAllByObjectId(UUID objectId);

    Optional<ObjectSystemAssignment> findByObjectIdAndDeviceTypeIdAndSystemType(
            UUID objectId, UUID deviceTypeId, SystemType systemType);
}
