package com.workload.repository;

import com.workload.entity.Summary;
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
