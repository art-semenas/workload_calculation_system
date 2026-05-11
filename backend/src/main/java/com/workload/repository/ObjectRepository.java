package com.workload.repository;

import com.workload.entity.ObjectEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ObjectRepository extends JpaRepository<ObjectEntity, UUID> {
  List<ObjectEntity> findAllByBranchId(UUID branchId);

  List<ObjectEntity> findAllByBranchDivisionId(UUID divisionId);

  long countByBranchId(UUID branchId);

  long countByBranchDivisionId(UUID divisionId);

  @Query("SELECT o.id FROM ObjectEntity o")
  List<UUID> findAllIds();

  // MAX(itogoChisloWithTravel) is safe because PoC S-02 guarantees at most one active Summary
  // per object (sync recalc, no background worker). Revisit when MVP M-06 adds background recalc.
  @Query(
      """
      SELECT o.id          as id,
             o.branch.id   as branchId,
             o.branch.name as branchName,
             o.branch.division.id   as divisionId,
             o.branch.division.name as divisionName,
             o.name         as name,
             o.importSeqNo  as importSeqNo,
             MAX(s.itogoChisloWithTravel) as itogoChisloWithTravel,
             COUNT(oe.id)   as engineerCount,
             o.createdAt    as createdAt,
             o.updatedAt    as updatedAt
      FROM ObjectEntity o
      LEFT JOIN Summary s ON s.object.id = o.id
      LEFT JOIN ObjectEngineer oe ON oe.object.id = o.id
      WHERE (:divisionId IS NULL OR o.branch.division.id = :divisionId)
      GROUP BY o.id, o.branch.id, o.branch.name,
               o.branch.division.id, o.branch.division.name,
               o.name, o.importSeqNo, o.createdAt, o.updatedAt
      """)
  List<ObjectEnrichedRow> findAllEnriched(@Param("divisionId") UUID divisionId);

  @Query(
      "SELECT o.branch.division.id as divisionId, COUNT(o) as count"
          + " FROM ObjectEntity o GROUP BY o.branch.division.id")
  List<DivisionCount> findCountsGroupedByDivisionId();
}
