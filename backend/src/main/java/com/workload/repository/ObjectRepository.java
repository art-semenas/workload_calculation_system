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

  // PoC (S-02): both aggregates rely on the Summary–ObjectEntity 1:1 constraint.
  //   - MAX(itogoChisloWithTravel): at most one Summary per object, so MAX == "the value".
  //   - COUNT(oe.id): the LEFT JOIN to Summary does NOT inflate engineer count because
  //     each object joins to ≤1 Summary row. If MVP M-06 (background recalc) allows multiple
  //     Summary rows per object, this query will over-count engineers by n_summaries; rewrite
  //     to use a subquery or DISTINCT before merging that change.
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
