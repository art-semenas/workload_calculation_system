package com.workload.repository;

import com.workload.entity.Branch;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BranchRepository extends JpaRepository<Branch, UUID> {

  /** Division of a branch, for scoping writes that name a branch rather than an object. */
  @Query("SELECT b.division.id FROM Branch b WHERE b.id = :branchId")
  Optional<UUID> findDivisionIdByBranchId(@Param("branchId") UUID branchId);

  List<Branch> findAllByDivisionId(UUID divisionId);

  long countByDivisionId(UUID divisionId);

  @Query(
      "SELECT b.division.id as divisionId, COUNT(b) as count FROM Branch b GROUP BY b.division.id")
  List<DivisionCount> findCountsGroupedByDivisionId();
}
