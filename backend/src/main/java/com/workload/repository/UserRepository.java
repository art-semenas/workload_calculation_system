package com.workload.repository;

import com.workload.entity.Role;
import com.workload.entity.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmail(String email);

  List<User> findAllByRole(Role role);

  List<User> findAllByRoleAndActive(Role role, boolean active);

  long countByHomeDivisionIdAndActiveTrue(UUID homeDivisionId);
}
