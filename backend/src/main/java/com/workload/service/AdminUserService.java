package com.workload.service;

import com.workload.dto.AdminUserCreateRequest;
import com.workload.dto.AdminUserDto;
import com.workload.dto.AdminUserUpdateRequest;
import com.workload.entity.Role;
import com.workload.entity.User;
import com.workload.exception.EngineerHasActiveAssignmentsException;
import com.workload.exception.InvalidRoleForEndpointException;
import com.workload.exception.UserNotFoundException;
import com.workload.mapper.UserMapper;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.UserRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * User administration for the {@code /admin/users} screen (MVP M-02). Engineers appear in the
 * listing and can be edited here, but are created through {@code /engineers} — that endpoint owns
 * capacity and summary state this one does not manage.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUserService {

  private final UserRepository userRepository;
  private final ObjectEngineerRepository objectEngineerRepository;
  private final PasswordEncoder passwordEncoder;
  private final UserMapper userMapper;

  @Transactional(readOnly = true)
  public Page<AdminUserDto> findAll(Role role, Boolean active, Pageable pageable) {
    Page<User> users;
    if (role != null && active != null) {
      users = userRepository.findAllByRoleAndActive(role, active, pageable);
    } else if (role != null) {
      users = userRepository.findAllByRole(role, pageable);
    } else if (active != null) {
      users = userRepository.findAllByActive(active, pageable);
    } else {
      users = userRepository.findAll(pageable);
    }
    return users.map(userMapper::toAdminDto);
  }

  @Transactional(readOnly = true)
  public AdminUserDto findById(UUID id) {
    return userMapper.toAdminDto(loadById(id));
  }

  @Transactional
  public AdminUserDto create(AdminUserCreateRequest request) {
    if (request.role() == Role.ENGINEER) {
      throw new InvalidRoleForEndpointException();
    }
    // No password means a placeholder account: it is created inactive with an unusable hash, and
    // stays unusable until an administrator activates it and a password is issued.
    boolean placeholder = request.password() == null || request.password().isBlank();
    String rawPassword = placeholder ? UUID.randomUUID().toString() : request.password();

    OffsetDateTime now = OffsetDateTime.now();
    User user =
        User.builder()
            .id(UUID.randomUUID())
            .email(request.email())
            .name(request.name())
            .passwordHash(passwordEncoder.encode(rawPassword))
            .role(request.role())
            .divisionId(request.divisionId())
            .capacityFte(BigDecimal.ONE)
            .active(!placeholder)
            .requiresActivation(placeholder)
            .createdAt(now)
            .updatedAt(now)
            .build();
    user = userRepository.save(user);
    log.info("Created user: id={}, role={}", user.getId(), user.getRole().getValue());
    return userMapper.toAdminDto(user);
  }

  @Transactional
  public AdminUserDto update(UUID id, AdminUserUpdateRequest request) {
    User user = loadById(id);
    if (request.role() == Role.ENGINEER && user.getRole() != Role.ENGINEER) {
      throw new InvalidRoleForEndpointException();
    }
    user.setEmail(request.email());
    user.setName(request.name());
    user.setRole(request.role());
    user.setDivisionId(request.divisionId());
    // Epic MVP M-02 §"Account Lockout": PUT is the administrator's unlock surface — an edited
    // account leaves this endpoint unlocked and with a clean failure counter.
    user.setFailedLoginCount(0);
    user.setLockedUntil(null);
    user.setUpdatedAt(OffsetDateTime.now());
    user = userRepository.save(user);
    log.info("Updated user: id={}, role={}", user.getId(), user.getRole().getValue());
    return userMapper.toAdminDto(user);
  }

  @Transactional
  public AdminUserDto activate(UUID id) {
    User user = loadById(id);
    user.setActive(true);
    user.setRequiresActivation(false);
    user.setUpdatedAt(OffsetDateTime.now());
    user = userRepository.save(user);
    log.info("Activated user: id={}", id);
    return userMapper.toAdminDto(user);
  }

  /**
   * Deactivation rather than deletion: {@code object_engineers.engineer_id} is ON DELETE RESTRICT.
   */
  @Transactional
  public void deactivate(UUID id) {
    User user = loadById(id);
    if (user.getRole() == Role.ENGINEER && objectEngineerRepository.countByEngineerId(id) > 0) {
      throw new EngineerHasActiveAssignmentsException(id.toString());
    }
    user.setActive(false);
    user.setUpdatedAt(OffsetDateTime.now());
    userRepository.save(user);
    log.info("Deactivated user: id={}", id);
  }

  private User loadById(UUID id) {
    return userRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id.toString()));
  }
}
