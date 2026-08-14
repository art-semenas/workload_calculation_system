package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private ObjectEngineerRepository objectEngineerRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private UserMapper userMapper;

  @InjectMocks private AdminUserService adminUserService;

  private final Pageable pageable = PageRequest.of(0, 20);

  @BeforeEach
  void stubMapper() {
    lenient()
        .when(userMapper.toAdminDto(any(User.class)))
        .thenAnswer(inv -> dtoOf(inv.getArgument(0)));
  }

  private User user(Role role) {
    return User.builder()
        .id(UUID.randomUUID())
        .email("user@test.com")
        .name("User")
        .passwordHash("hash")
        .role(role)
        .capacityFte(BigDecimal.ONE)
        .active(true)
        .requiresActivation(false)
        .createdAt(OffsetDateTime.now())
        .updatedAt(OffsetDateTime.now())
        .build();
  }

  private AdminUserDto dtoOf(User u) {
    return new AdminUserDto(
        u.getId(),
        u.getEmail(),
        u.getName(),
        u.getRole(),
        u.getDivisionId(),
        u.getHomeDivisionId(),
        u.getCapacityFte(),
        u.getEmployeeId(),
        u.isActive(),
        u.isRequiresActivation(),
        u.getLockedUntil(),
        u.getCreatedAt(),
        u.getUpdatedAt());
  }

  // --- findAll filter branches ---

  @Test
  void findAllWithoutFiltersUsesUnfilteredQuery() {
    when(userRepository.findAll(pageable)).thenReturn(new PageImpl<>(List.of(user(Role.VIEWER))));

    assertThat(adminUserService.findAll(null, null, pageable)).hasSize(1);
  }

  @Test
  void findAllByRoleOnly() {
    when(userRepository.findAllByRole(Role.EDITOR, pageable))
        .thenReturn(new PageImpl<>(List.of(user(Role.EDITOR))));

    assertThat(adminUserService.findAll(Role.EDITOR, null, pageable)).hasSize(1);
  }

  @Test
  void findAllByActiveOnly() {
    when(userRepository.findAllByActive(false, pageable)).thenReturn(new PageImpl<>(List.of()));

    assertThat(adminUserService.findAll(null, false, pageable)).isEmpty();
  }

  @Test
  void findAllByRoleAndActive() {
    when(userRepository.findAllByRoleAndActive(Role.VIEWER, true, pageable))
        .thenReturn(new PageImpl<>(List.of(user(Role.VIEWER))));

    assertThat(adminUserService.findAll(Role.VIEWER, true, pageable)).hasSize(1);
  }

  // --- findById ---

  @Test
  void findByIdUnknownThrows() {
    UUID id = UUID.randomUUID();
    when(userRepository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> adminUserService.findById(id))
        .isInstanceOf(UserNotFoundException.class);
  }

  // --- create ---

  @Test
  void createRejectsEngineerRole() {
    AdminUserCreateRequest request =
        new AdminUserCreateRequest("e@test.com", "E", Role.ENGINEER, null, "password123");

    assertThatThrownBy(() -> adminUserService.create(request))
        .isInstanceOf(InvalidRoleForEndpointException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  void createWithPasswordActivatesAccount() {
    AdminUserCreateRequest request =
        new AdminUserCreateRequest("v@test.com", "V", Role.VIEWER, null, "password123");
    when(passwordEncoder.encode("password123")).thenReturn("hashed");
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.create(request);

    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(captor.capture());
    assertThat(captor.getValue().getPasswordHash()).isEqualTo("hashed");
    assertThat(captor.getValue().isActive()).isTrue();
    assertThat(captor.getValue().isRequiresActivation()).isFalse();
  }

  @Test
  void createWithoutPasswordMakesPlaceholder() {
    AdminUserCreateRequest request =
        new AdminUserCreateRequest("p@test.com", "P", Role.EDITOR, UUID.randomUUID(), null);
    when(passwordEncoder.encode(any())).thenReturn("unusable");
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.create(request);

    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(captor.capture());
    assertThat(captor.getValue().isActive()).isFalse();
    assertThat(captor.getValue().isRequiresActivation()).isTrue();
  }

  // --- update ---

  @Test
  void updateChangesFieldsAndClearsLockout() {
    User existing = user(Role.VIEWER);
    existing.setFailedLoginCount(5);
    existing.setLockedUntil(OffsetDateTime.now().plusMinutes(30));
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    UUID divisionId = UUID.randomUUID();
    adminUserService.update(
        existing.getId(),
        new AdminUserUpdateRequest("new@test.com", "New Name", Role.EDITOR, divisionId));

    assertThat(existing.getName()).isEqualTo("New Name");
    assertThat(existing.getEmail()).isEqualTo("new@test.com");
    assertThat(existing.getRole()).isEqualTo(Role.EDITOR);
    assertThat(existing.getDivisionId()).isEqualTo(divisionId);
    assertThat(existing.getLockedUntil()).isNull();
    assertThat(existing.getFailedLoginCount()).isZero();
  }

  @Test
  void updateRejectsPromotionToEngineer() {
    User existing = user(Role.VIEWER);
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

    assertThatThrownBy(
            () ->
                adminUserService.update(
                    existing.getId(),
                    new AdminUserUpdateRequest("v@test.com", "V", Role.ENGINEER, null)))
        .isInstanceOf(InvalidRoleForEndpointException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  void updateKeepsExistingEngineerRole() {
    User existing = user(Role.ENGINEER);
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.update(
        existing.getId(), new AdminUserUpdateRequest("eng@test.com", "Eng", Role.ENGINEER, null));

    assertThat(existing.getName()).isEqualTo("Eng");
    assertThat(existing.getRole()).isEqualTo(Role.ENGINEER);
  }

  // --- activate ---

  @Test
  void activateSetsFlags() {
    User placeholder = user(Role.VIEWER);
    placeholder.setActive(false);
    placeholder.setRequiresActivation(true);
    when(userRepository.findById(placeholder.getId())).thenReturn(Optional.of(placeholder));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.activate(placeholder.getId());

    assertThat(placeholder.isActive()).isTrue();
    assertThat(placeholder.isRequiresActivation()).isFalse();
  }

  // --- deactivate ---

  @Test
  void deactivateSetsInactive() {
    User existing = user(Role.VIEWER);
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

    adminUserService.deactivate(existing.getId());

    assertThat(existing.isActive()).isFalse();
    verify(userRepository).save(existing);
  }

  @Test
  void deactivateEngineerWithAssignmentsBlocked() {
    User engineer = user(Role.ENGINEER);
    when(userRepository.findById(engineer.getId())).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.countByEngineerId(engineer.getId())).thenReturn(2);

    assertThatThrownBy(() -> adminUserService.deactivate(engineer.getId()))
        .isInstanceOf(EngineerHasActiveAssignmentsException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  void deactivateEngineerWithoutAssignmentsAllowed() {
    User engineer = user(Role.ENGINEER);
    when(userRepository.findById(engineer.getId())).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.countByEngineerId(engineer.getId())).thenReturn(0);

    adminUserService.deactivate(engineer.getId());

    assertThat(engineer.isActive()).isFalse();
  }
}
