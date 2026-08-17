package com.workload.repository;

import com.workload.entity.Role;
import com.workload.entity.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmail(String email);

  List<User> findAllByRole(Role role);

  /** Engineers by job function, not permission tier — an engineer may hold any role. */
  List<User> findAllByEngineerTrue();

  List<User> findAllByRoleAndActive(Role role, boolean active);

  /**
   * Both filters are optional, expressed the way the other repositories do it, so adding a third
   * does not double a branch count in the service.
   */
  @Query(
      "SELECT u FROM User u"
          + " WHERE (:role IS NULL OR u.role = :role)"
          + " AND (:active IS NULL OR u.active = :active)")
  Page<User> findAllFiltered(
      @Param("role") Role role, @Param("active") Boolean active, Pageable pageable);

  long countByHomeDivisionIdAndActiveTrue(UUID homeDivisionId);

  /** Guards against removing the last administrator — see {@code LastAdminException}. */
  long countByRoleAndActiveTrue(Role role);

  @Query(
      "SELECT u.homeDivisionId as divisionId, COUNT(u) as count FROM User u"
          + " WHERE u.active = true AND u.homeDivisionId IS NOT NULL"
          + " GROUP BY u.homeDivisionId")
  List<DivisionCount> findActiveCountsGroupedByDivisionId();
}
