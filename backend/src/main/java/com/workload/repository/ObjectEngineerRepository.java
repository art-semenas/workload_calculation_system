package com.workload.repository;

import com.workload.entity.ObjectEngineer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ObjectEngineerRepository extends JpaRepository<ObjectEngineer, UUID> {
  List<ObjectEngineer> findAllByObjectId(UUID objectId);

  List<ObjectEngineer> findAllByEngineerId(UUID engineerId);

  Optional<ObjectEngineer> findByObjectIdAndEngineerId(UUID objectId, UUID engineerId);

  int countByObjectId(UUID objectId);

  int countByEngineerId(UUID engineerId);

  @Query("SELECT oe.engineer.id FROM ObjectEngineer oe WHERE oe.object.id = :objectId")
  List<UUID> findEngineerIdsByObjectId(@Param("objectId") UUID objectId);

  @Query("SELECT DISTINCT oe.object.id FROM ObjectEngineer oe")
  List<UUID> findAllAssignedObjectIds();

  @Query(
      "SELECT DISTINCT oe.object.id FROM ObjectEngineer oe WHERE oe.object.branch.division.id ="
          + " :divisionId")
  List<UUID> findAllAssignedObjectIdsByDivision(@Param("divisionId") UUID divisionId);
}
