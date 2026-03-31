package com.workload.repository;

import com.workload.entity.ObjectDevice;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectDeviceRepository extends JpaRepository<ObjectDevice, UUID> {
  List<ObjectDevice> findAllByObjectId(UUID objectId);

  Optional<ObjectDevice> findByObjectIdAndDeviceTypeId(UUID objectId, UUID deviceTypeId);

  void deleteByObjectIdAndDeviceTypeId(UUID objectId, UUID deviceTypeId);
}
