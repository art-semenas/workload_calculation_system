package com.workload.repository;

import com.workload.entity.RepairType;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepairTypeRepository extends JpaRepository<RepairType, UUID> {}
