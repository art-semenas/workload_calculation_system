package com.workload.repository;

import com.workload.entity.DeviceSystemContext;
import com.workload.entity.SystemType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeviceSystemContextRepository extends JpaRepository<DeviceSystemContext, UUID> {
    List<DeviceSystemContext> findAllByDeviceTypeId(UUID deviceTypeId);

    Optional<DeviceSystemContext> findByDeviceTypeIdAndSystemType(
            UUID deviceTypeId, SystemType systemType);
}
