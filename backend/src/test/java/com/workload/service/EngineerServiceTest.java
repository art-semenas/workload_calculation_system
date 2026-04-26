package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class EngineerServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private EngineerSummaryRepository engineerSummaryRepository;
  @Mock private ObjectEngineerRepository objectEngineerRepository;
  @Mock private DivisionRepository divisionRepository;
  @Mock private EngineerSummaryService engineerSummaryService;
  @Mock private EngineerMapper engineerMapper;
  @Mock private PasswordEncoder passwordEncoder;

  @InjectMocks private EngineerService engineerService;

  private User buildEngineer(UUID id, BigDecimal capacityFte) {
    return User.builder()
        .id(id)
        .email("eng@test.com")
        .name("Test Engineer")
        .passwordHash("hash")
        .role(Role.ENGINEER)
        .capacityFte(capacityFte)
        .active(true)
        .requiresActivation(false)
        .createdAt(OffsetDateTime.now())
        .updatedAt(OffsetDateTime.now())
        .build();
  }

  @Test
  void create_setsRoleToEngineer() {
    UUID id = UUID.randomUUID();
    EngineerCreateRequest request =
        new EngineerCreateRequest(
            "eng@test.com", "Test", "password1", new BigDecimal("1.0"), null, null);

    when(passwordEncoder.encode("password1")).thenReturn("hashed");
    User savedUser = buildEngineer(id, new BigDecimal("1.0"));
    when(userRepository.save(any(User.class))).thenReturn(savedUser);
    when(engineerSummaryRepository.findByEngineerId(id)).thenReturn(Optional.empty());
    when(engineerMapper.toDto(any(), any(), any())).thenReturn(stubDto(id));

    engineerService.create(request);

    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(captor.capture());
    assertThat(captor.getValue().getRole()).isEqualTo(Role.ENGINEER);
    assertThat(captor.getValue().isActive()).isTrue();
  }

  @Test
  void create_hashesPassword() {
    EngineerCreateRequest request =
        new EngineerCreateRequest(
            "eng@test.com", "Test", "password1", new BigDecimal("1.0"), null, null);
    UUID id = UUID.randomUUID();
    when(passwordEncoder.encode("password1")).thenReturn("hashed");
    User savedUser = buildEngineer(id, new BigDecimal("1.0"));
    when(userRepository.save(any(User.class))).thenReturn(savedUser);
    when(engineerSummaryRepository.findByEngineerId(id)).thenReturn(Optional.empty());
    when(engineerMapper.toDto(any(), any(), any())).thenReturn(stubDto(id));

    engineerService.create(request);

    verify(passwordEncoder).encode("password1");
    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(captor.capture());
    assertThat(captor.getValue().getPasswordHash()).isEqualTo("hashed");
  }

  @Test
  void findAll_filtersEngineersOnly() {
    UUID id = UUID.randomUUID();
    User eng = buildEngineer(id, new BigDecimal("1.0"));
    when(userRepository.findAllByRole(Role.ENGINEER)).thenReturn(List.of(eng));
    when(engineerSummaryRepository.findByEngineerId(id)).thenReturn(Optional.empty());
    when(engineerMapper.toDto(any(), any(), any())).thenReturn(stubDto(id));

    List<EngineerDto> result = engineerService.findAll(Optional.empty(), Optional.empty());

    assertThat(result).hasSize(1);
    verify(userRepository).findAllByRole(Role.ENGINEER);
  }

  @Test
  void findAll_filtersByStatus() {
    UUID id1 = UUID.randomUUID();
    UUID id2 = UUID.randomUUID();
    User eng1 = buildEngineer(id1, new BigDecimal("1.0"));
    User eng2 = buildEngineer(id2, new BigDecimal("1.0"));
    EngineerSummary warningSum =
        EngineerSummary.builder().id(UUID.randomUUID()).engineer(eng1).status("warning").build();
    EngineerSummary normalSum =
        EngineerSummary.builder().id(UUID.randomUUID()).engineer(eng2).status("normal").build();
    when(userRepository.findAllByRole(Role.ENGINEER)).thenReturn(List.of(eng1, eng2));
    when(engineerSummaryRepository.findByEngineerId(id1)).thenReturn(Optional.of(warningSum));
    when(engineerSummaryRepository.findByEngineerId(id2)).thenReturn(Optional.of(normalSum));
    when(engineerMapper.toDto(any(), any(), any())).thenReturn(stubDto(id1));

    List<EngineerDto> result = engineerService.findAll(Optional.of("warning"), Optional.empty());

    assertThat(result).hasSize(1);
  }

  @Test
  void findAll_filtersByHomeDivision() {
    UUID divId = UUID.randomUUID();
    UUID id1 = UUID.randomUUID();
    UUID id2 = UUID.randomUUID();
    User eng1 =
        User.builder()
            .id(id1)
            .email("a@test.com")
            .name("A")
            .passwordHash("h")
            .role(Role.ENGINEER)
            .capacityFte(BigDecimal.ONE)
            .homeDivisionId(divId)
            .active(true)
            .requiresActivation(false)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    User eng2 =
        User.builder()
            .id(id2)
            .email("b@test.com")
            .name("B")
            .passwordHash("h")
            .role(Role.ENGINEER)
            .capacityFte(BigDecimal.ONE)
            .homeDivisionId(UUID.randomUUID())
            .active(true)
            .requiresActivation(false)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    when(userRepository.findAllByRole(Role.ENGINEER)).thenReturn(List.of(eng1, eng2));
    when(engineerSummaryRepository.findByEngineerId(id1)).thenReturn(Optional.empty());
    when(engineerMapper.toDto(any(), any(), any())).thenReturn(stubDto(id1));

    List<EngineerDto> result = engineerService.findAll(Optional.empty(), Optional.of(divId));

    assertThat(result).hasSize(1);
  }

  @Test
  void findById_notAnEngineer_throws() {
    UUID id = UUID.randomUUID();
    User admin =
        User.builder()
            .id(id)
            .email("admin@test.com")
            .name("Admin")
            .passwordHash("h")
            .role(Role.ADMIN)
            .capacityFte(BigDecimal.ONE)
            .active(true)
            .requiresActivation(false)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    when(userRepository.findById(id)).thenReturn(Optional.of(admin));

    assertThatThrownBy(() -> engineerService.findById(id))
        .isInstanceOf(EntityNotFoundException.class);
  }

  @Test
  void update_capacityChange_triggersRecalc() {
    UUID id = UUID.randomUUID();
    User eng = buildEngineer(id, new BigDecimal("1.0"));
    when(userRepository.findById(id)).thenReturn(Optional.of(eng));
    when(userRepository.save(any())).thenReturn(eng);
    when(engineerSummaryRepository.findByEngineerId(id)).thenReturn(Optional.empty());
    when(engineerMapper.toDto(any(), any(), any())).thenReturn(stubDto(id));

    EngineerUpdateRequest request =
        new EngineerUpdateRequest("New Name", new BigDecimal("0.5"), null, null);
    engineerService.update(id, request);

    verify(engineerSummaryService).recalculate(id);
  }

  @Test
  void update_capacityUnchanged_noRecalc() {
    UUID id = UUID.randomUUID();
    User eng = buildEngineer(id, new BigDecimal("1.0"));
    when(userRepository.findById(id)).thenReturn(Optional.of(eng));
    when(userRepository.save(any())).thenReturn(eng);
    when(engineerSummaryRepository.findByEngineerId(id)).thenReturn(Optional.empty());
    when(engineerMapper.toDto(any(), any(), any())).thenReturn(stubDto(id));

    EngineerUpdateRequest request =
        new EngineerUpdateRequest("New Name", new BigDecimal("1.0"), null, null);
    engineerService.update(id, request);

    verify(engineerSummaryService, never()).recalculate(id);
  }

  @Test
  void deactivate_noAssignments_setsInactive() {
    UUID id = UUID.randomUUID();
    User eng = buildEngineer(id, BigDecimal.ONE);
    when(userRepository.findById(id)).thenReturn(Optional.of(eng));
    when(objectEngineerRepository.countByEngineerId(id)).thenReturn(0);

    engineerService.deactivate(id);

    assertThat(eng.isActive()).isFalse();
    verify(userRepository).save(eng);
  }

  @Test
  void deactivate_hasAssignments_blockedWith409() {
    UUID id = UUID.randomUUID();
    User eng = buildEngineer(id, BigDecimal.ONE);
    when(userRepository.findById(id)).thenReturn(Optional.of(eng));
    when(objectEngineerRepository.countByEngineerId(id)).thenReturn(2);

    assertThatThrownBy(() -> engineerService.deactivate(id))
        .isInstanceOf(EngineerHasActiveAssignmentsException.class);
  }

  private EngineerDto stubDto(UUID id) {
    return new EngineerDto(
        id, "eng@test.com", "Test", "engineer", null, null,
        BigDecimal.ONE, null, true, null, null, null, null, OffsetDateTime.now());
  }
}
