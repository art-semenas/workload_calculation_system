package com.workload.repository;

import com.workload.entity.DeviceType;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeviceTypeRepository extends JpaRepository<DeviceType, UUID> {}
