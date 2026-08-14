package com.workload.repository;

import com.workload.entity.ObjectEngineer;
import com.workload.repository.projection.EngineerObjectLoad;
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

  @Query("SELECT DISTINCT oe.engineer.id FROM ObjectEngineer oe")
  List<UUID> findAllAssignedEngineerIds();

  /**
   * All of one engineer's object loads in a single query, including the shared-engineer count used
   * as the split divisor. Left join: an object may be assigned before its summary exists.
   */
  @Query(
      "SELECT new com.workload.repository.projection.EngineerObjectLoad("
          + " oe.object.id,"
          + " (SELECT COUNT(oe2) FROM ObjectEngineer oe2 WHERE oe2.object.id = oe.object.id),"
          + " s.itogoChisloWithTravel, s.osMonthlyAvg, s.psMonthlyAvg,"
          + " s.videoMonthlyAvg, s.recordsMonthly, s.repairWithTravelMonthly)"
          + " FROM ObjectEngineer oe"
          + " LEFT JOIN Summary s ON s.object.id = oe.object.id"
          + " WHERE oe.engineer.id = :engineerId")
  List<EngineerObjectLoad> findObjectLoadsByEngineerId(@Param("engineerId") UUID engineerId);

  @Query(
      "SELECT DISTINCT oe.object.id FROM ObjectEngineer oe WHERE oe.object.branch.division.id ="
          + " :divisionId")
  List<UUID> findAllAssignedObjectIdsByDivision(@Param("divisionId") UUID divisionId);
}
