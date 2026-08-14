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
  long findUnassignedCountByDivisionId(@Param("divisionId") UUID divisionId);

  @Query(
      "SELECT s FROM Summary s"
          + " JOIN FETCH s.object o"
          + " JOIN FETCH o.branch b"
          + " JOIN FETCH b.division d"
          + " WHERE d.id = :divisionId"
          + " ORDER BY s.itogoChisloWithTravel DESC NULLS LAST")
  List<Summary> findAllByDivisionIdWithOrgHierarchy(@Param("divisionId") UUID divisionId);

  /**
   * СВОД rows with both optional narrowings applied in the query: {@code divisionId} is the user's
   * filter, {@code engineerId} is the engineer read scope from TOR §12. Scoping here rather than
   * after the fetch keeps the page size and total correct.
   */
  @Query(
      "SELECT s FROM Summary s"
          + " JOIN FETCH s.object o"
          + " JOIN FETCH o.branch b"
          + " JOIN FETCH b.division d"
          + " WHERE (:divisionId IS NULL OR d.id = :divisionId)"
          + " AND (:engineerId IS NULL"
          + "      OR EXISTS (SELECT 1 FROM ObjectEngineer scope"
          + "                 WHERE scope.object.id = o.id AND scope.engineer.id = :engineerId))"
          + " ORDER BY s.itogoChisloWithTravel DESC NULLS LAST")
  List<Summary> findAllScoped(
      @Param("divisionId") UUID divisionId, @Param("engineerId") UUID engineerId);

  @Query(
      "SELECT s FROM Summary s"
          + " JOIN FETCH s.object o"
          + " JOIN FETCH o.branch b"
          + " JOIN FETCH b.division d"
          + " WHERE b.id = :branchId"
          + " ORDER BY s.itogoChisloWithTravel DESC NULLS LAST")
  List<Summary> findAllByBranchIdWithOrgHierarchy(@Param("branchId") UUID branchId);
}
