package com.workload.repository;

import com.workload.dto.ObjectDto;
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

  @Query(
      """
      SELECT new com.workload.dto.ObjectDto(
          o.id,
          o.branch.id,
          o.branch.name,
          o.branch.division.id,
          o.branch.division.name,
          o.name,
          o.importSeqNo,
          s.itogoChisloWithTravel,
          COUNT(oe.id),
          o.createdAt,
          o.updatedAt)
      FROM ObjectEntity o
      LEFT JOIN Summary s ON s.object.id = o.id
      LEFT JOIN ObjectEngineer oe ON oe.object.id = o.id
      WHERE (:divisionId IS NULL OR o.branch.division.id = :divisionId)
      GROUP BY o.id, o.branch.id, o.branch.name,
               o.branch.division.id, o.branch.division.name,
               o.name, o.importSeqNo, s.itogoChisloWithTravel,
               o.createdAt, o.updatedAt
      """)
  List<ObjectDto> findAllEnriched(@Param("divisionId") UUID divisionId);

  @Query(
      "SELECT o.branch.division.id as divisionId, COUNT(o) as count"
          + " FROM ObjectEntity o GROUP BY o.branch.division.id")
  List<DivisionCount> findCountsGroupedByDivisionId();
}
