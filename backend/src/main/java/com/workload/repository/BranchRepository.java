package com.workload.repository;

import com.workload.entity.Branch;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BranchRepository extends JpaRepository<Branch, UUID> {
  List<Branch> findAllByDivisionId(UUID divisionId);

  long countByDivisionId(UUID divisionId);

  @Query(
      "SELECT b.division.id as divisionId, COUNT(b) as count FROM Branch b GROUP BY b.division.id")
  List<DivisionCount> findCountsGroupedByDivisionId();
}
