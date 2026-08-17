package com.workload.service;

import com.workload.dto.EngineerCreateRequest;
import com.workload.dto.EngineerDto;
import com.workload.dto.EngineerUpdateRequest;
import com.workload.entity.EngineerSummary;
import com.workload.entity.Role;
import com.workload.entity.User;
import com.workload.exception.EngineerHasActiveAssignmentsException;
import com.workload.exception.EntityNotFoundException;
import com.workload.mapper.EngineerMapper;
import com.workload.repository.DivisionRepository;
import com.workload.repository.EngineerSummaryRepository;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.UserRepository;
import com.workload.security.RbacService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EngineerService {

  private final UserRepository userRepository;
  private final EngineerSummaryRepository engineerSummaryRepository;
  private final ObjectEngineerRepository objectEngineerRepository;
  private final DivisionRepository divisionRepository;
  private final EngineerSummaryService engineerSummaryService;
  private final EngineerMapper engineerMapper;
  private final PasswordEncoder passwordEncoder;
  private final RbacService rbacService;

  public List<EngineerDto> findAll(Optional<String> status, Optional<UUID> homeDivisionId) {
    List<User> engineers = userRepository.findAllByEngineerTrue();

    // TOR §12: an engineer sees only their own row here — API-level filtering, not a denial, so the
    // frontend can render the same table component with a single row. This keys on the *role*, not
    // the engineer flag: an engineer who is also an editor has the editor's permission to see
    // everyone.
    User current = rbacService.currentUser();
    if (current.getRole() == Role.ENGINEER) {
      engineers = engineers.stream().filter(e -> e.getId().equals(current.getId())).toList();
    }

    return engineers.stream()
        .filter(
            eng -> homeDivisionId.map(divId -> divId.equals(eng.getHomeDivisionId())).orElse(true))
        .flatMap(
            eng -> {
              EngineerSummary summary =
                  engineerSummaryRepository.findByEngineerId(eng.getId()).orElse(null);
              boolean statusMatch =
                  status
                      .map(
                          s ->
                              summary != null
                                  && summary.getStatus() != null
                                  && s.equalsIgnoreCase(summary.getStatus()))
                      .orElse(true);
              if (!statusMatch) return java.util.stream.Stream.empty();
              return java.util.stream.Stream.of(buildDto(eng, summary));
            })
        .toList();
  }

  public EngineerDto findById(UUID id) {
    // Filtering the list would achieve nothing if the detail route stayed open (TOR §12).
    User current = rbacService.currentUser();
    if (current.getRole() == Role.ENGINEER && !current.getId().equals(id)) {
      throw new AccessDeniedException("You may only view your own engineer record");
    }
    User user = loadEngineerById(id);
    EngineerSummary summary = engineerSummaryRepository.findByEngineerId(id).orElse(null);
    return buildDto(user, summary);
  }

  @Transactional
  public EngineerDto create(EngineerCreateRequest request) {
    OffsetDateTime now = OffsetDateTime.now();
    User user =
        User.builder()
            .id(UUID.randomUUID())
            .email(request.email())
            .name(request.name())
            .passwordHash(passwordEncoder.encode(request.password()))
            .role(Role.ENGINEER)
            .engineer(true)
            .homeDivisionId(request.homeDivisionId())
            .capacityFte(request.capacityFte())
            .employeeId(request.employeeId())
            .active(true)
            .requiresActivation(false)
            .createdAt(now)
            .updatedAt(now)
            .build();
    user = userRepository.save(user);
    log.info("Created engineer: id={}, email={}", user.getId(), user.getEmail());
    return buildDto(user, null);
  }

  @Transactional
  public EngineerDto update(UUID id, EngineerUpdateRequest request) {
    User user = loadEngineerById(id);
    boolean capacityChanged = user.getCapacityFte().compareTo(request.capacityFte()) != 0;
    user.setName(request.name());
    user.setCapacityFte(request.capacityFte());
    user.setHomeDivisionId(request.homeDivisionId());
    user.setEmployeeId(request.employeeId());
    user.setUpdatedAt(OffsetDateTime.now());
    user = userRepository.save(user);
    if (capacityChanged) {
      // PoC (S-02): recalculates synchronously on capacity change.
      engineerSummaryService.recalculate(id);
    }
    EngineerSummary summary = engineerSummaryRepository.findByEngineerId(id).orElse(null);
    return buildDto(user, summary);
  }

  @Transactional
  public void deactivate(UUID id) {
    User user = loadEngineerById(id);
    int assignmentCount = objectEngineerRepository.countByEngineerId(id);
    if (assignmentCount > 0) {
      throw new EngineerHasActiveAssignmentsException(id.toString());
    }
    user.setActive(false);
    user.setUpdatedAt(OffsetDateTime.now());
    userRepository.save(user);
    log.info("Deactivated engineer: id={}", id);
  }

  // -------------------------------------------------------------------------

  private User loadEngineerById(UUID id) {
    User user =
        userRepository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Engineer", id.toString()));
    if (!user.isEngineer()) {
      throw new EntityNotFoundException("Engineer", id.toString());
    }
    return user;
  }

  private EngineerDto buildDto(User user, EngineerSummary summary) {
    String homeDivisionName =
        user.getHomeDivisionId() != null
            ? divisionRepository
                .findById(user.getHomeDivisionId())
                .map(d -> d.getName())
                .orElse(null)
            : null;
    return engineerMapper.toDto(user, summary, homeDivisionName);
  }
}
