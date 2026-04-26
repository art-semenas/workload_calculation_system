package com.workload.repository;

import com.workload.entity.ObjectEngineer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectEngineerRepository extends JpaRepository<ObjectEngineer, UUID> {
  List<ObjectEngineer> findAllByObjectId(UUID objectId);

  List<ObjectEngineer> findAllByEngineerId(UUID engineerId);

  Optional<ObjectEngineer> findByObjectIdAndEngineerId(UUID objectId, UUID engineerId);

  int countByObjectId(UUID objectId);
}
