package com.workload.repository;

import com.workload.entity.Role;
import com.workload.entity.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmail(String email);

  List<User> findAllByRole(Role role);

  List<User> findAllByRoleAndActive(Role role, boolean active);

  long countByHomeDivisionIdAndActiveTrue(UUID homeDivisionId);

  @Query(
      "SELECT u.homeDivision.id, COUNT(u) FROM User u"
          + " WHERE u.active = true AND u.homeDivision IS NOT NULL"
          + " GROUP BY u.homeDivision.id")
  List<Object[]> findActiveCountsGroupedByDivisionId();
}
