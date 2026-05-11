package com.workload.repository;

import com.workload.entity.Summary;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SummaryRepository extends JpaRepository<Summary, UUID> {
  Optional<Summary> findByObjectId(UUID objectId);

  void deleteByObjectId(UUID objectId);

  @Query(
      "SELECT s FROM Summary s"
          + " JOIN FETCH s.object o"
          + " JOIN FETCH o.branch b"
          + " JOIN FETCH b.division d"
          + " ORDER BY s.itogoChisloWithTravel DESC NULLS LAST")
  List<Summary> findAllWithOrgHierarchy();

  @Query(
      "SELECT s.object.branch.division.id as divisionId,"
          + " SUM(COALESCE(s.itogoChisloWithTravel, 0)) as requiredFte"
          + " FROM Summary s GROUP BY s.object.branch.division.id")
  List<DivisionFteSum> findRequiredFteGroupedByDivision();

  @Query(
      "SELECT s.object.branch.division.id as divisionId, COUNT(DISTINCT s.object) as count"
          + " FROM Summary s"
          + " WHERE NOT EXISTS"
          + " (SELECT oe FROM ObjectEngineer oe WHERE oe.object.id = s.object.id)"
          + " GROUP BY s.object.branch.division.id")
  List<DivisionCount> findUnassignedCountGroupedByDivision();

  @Query(
      "SELECT COALESCE(SUM(COALESCE(s.itogoChisloWithTravel, 0)), 0)"
          + " FROM Summary s WHERE s.object.branch.division.id = :divisionId")
  BigDecimal findRequiredFteByDivisionId(@Param("divisionId") UUID divisionId);

  @Query(
      "SELECT COUNT(DISTINCT s.object) FROM Summary s"
          + " WHERE s.object.branch.division.id = :divisionId"
          + " AND NOT EXISTS"
          + " (SELECT oe FROM ObjectEngineer oe WHERE oe.object.id = s.object.id)")
  Long findUnassignedCountByDivisionId(@Param("divisionId") UUID divisionId);

  @Query(
      "SELECT s FROM Summary s"
          + " JOIN FETCH s.object o"
          + " JOIN FETCH o.branch b"
          + " JOIN FETCH b.division d"
          + " WHERE d.id = :divisionId"
          + " ORDER BY s.itogoChisloWithTravel DESC NULLS LAST")
  List<Summary> findAllByDivisionIdWithOrgHierarchy(@Param("divisionId") UUID divisionId);

  @Query(
      "SELECT s FROM Summary s"
          + " JOIN FETCH s.object o"
          + " JOIN FETCH o.branch b"
          + " JOIN FETCH b.division d"
          + " WHERE b.id = :branchId"
          + " ORDER BY s.itogoChisloWithTravel DESC NULLS LAST")
  List<Summary> findAllByBranchIdWithOrgHierarchy(@Param("branchId") UUID branchId);
}
