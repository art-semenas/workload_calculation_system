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
import com.workload.dto.AdminUserPasswordRequest;
import com.workload.dto.AdminUserUpdateRequest;
import com.workload.entity.Role;
import com.workload.entity.User;
import com.workload.exception.EngineerHasActiveAssignmentsException;
import com.workload.exception.InvalidRoleForEndpointException;
import com.workload.exception.LastAdminException;
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

  private User engineerUser(Role role) {
    User user = user(role);
    user.setEngineer(true);
    return user;
  }

  private User lockedUser() {
    User user = user(Role.VIEWER);
    user.setFailedLoginCount(5);
    user.setLockedUntil(OffsetDateTime.now().plusMinutes(30));
    return user;
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
        u.isEngineer(),
        u.getLockedUntil(),
        u.getCreatedAt(),
        u.getUpdatedAt());
  }

  // --- findAll filter branches ---

  @Test
  void findAllWithoutFiltersUsesUnfilteredQuery() {
    when(userRepository.findAllFiltered(null, null, pageable))
        .thenReturn(new PageImpl<>(List.of(user(Role.VIEWER))));

    assertThat(adminUserService.findAll(null, null, pageable)).hasSize(1);
  }

  @Test
  void findAllByRoleOnly() {
    when(userRepository.findAllFiltered(Role.EDITOR, null, pageable))
        .thenReturn(new PageImpl<>(List.of(user(Role.EDITOR))));

    assertThat(adminUserService.findAll(Role.EDITOR, null, pageable)).hasSize(1);
  }

  @Test
  void findAllByActiveOnly() {
    when(userRepository.findAllFiltered(null, false, pageable))
        .thenReturn(new PageImpl<>(List.of()));

    assertThat(adminUserService.findAll(null, false, pageable)).isEmpty();
  }

  @Test
  void findAllByRoleAndActive() {
    when(userRepository.findAllFiltered(Role.VIEWER, true, pageable))
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
  void updateChangesFields() {
    User existing = user(Role.VIEWER);
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    UUID divisionId = UUID.randomUUID();
    adminUserService.update(
        existing.getId(),
        new AdminUserUpdateRequest("new@test.com", "New Name", Role.EDITOR, divisionId, null));

    assertThat(existing.getName()).isEqualTo("New Name");
    assertThat(existing.getEmail()).isEqualTo("new@test.com");
    assertThat(existing.getRole()).isEqualTo(Role.EDITOR);
    assertThat(existing.getDivisionId()).isEqualTo(divisionId);
  }

  @Test
  void updateWithUnlockClearsLockout() {
    User existing = lockedUser();
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.update(
        existing.getId(),
        new AdminUserUpdateRequest("user@test.com", "User", Role.VIEWER, null, true));

    assertThat(existing.getLockedUntil()).isNull();
    assertThat(existing.getFailedLoginCount()).isZero();
  }

  /** An edit is not an unlock: a locked account stays locked unless the admin asks. */
  @Test
  void updateWithoutUnlockKeepsLockout() {
    User existing = lockedUser();
    OffsetDateTime lockedUntil = existing.getLockedUntil();
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.update(
        existing.getId(),
        new AdminUserUpdateRequest("user@test.com", "Renamed", Role.VIEWER, null, null));

    assertThat(existing.getLockedUntil()).isEqualTo(lockedUntil);
    assertThat(existing.getFailedLoginCount()).isEqualTo(5);
  }

  @Test
  void updateWithUnlockFalseKeepsLockout() {
    User existing = lockedUser();
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.update(
        existing.getId(),
        new AdminUserUpdateRequest("user@test.com", "User", Role.VIEWER, null, false));

    assertThat(existing.getLockedUntil()).isNotNull();
  }

  @Test
  void updateRejectsEngineerRoleForNonEngineer() {
    User existing = user(Role.VIEWER);
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

    assertThatThrownBy(
            () ->
                adminUserService.update(
                    existing.getId(),
                    new AdminUserUpdateRequest("v@test.com", "V", Role.ENGINEER, null, null)))
        .isInstanceOf(InvalidRoleForEndpointException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  void updateKeepsExistingEngineerRole() {
    User existing = engineerUser(Role.ENGINEER);
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.update(
        existing.getId(),
        new AdminUserUpdateRequest("eng@test.com", "Eng", Role.ENGINEER, null, null));

    assertThat(existing.getName()).isEqualTo("Eng");
    assertThat(existing.getRole()).isEqualTo(Role.ENGINEER);
  }

  /** Role is the permission tier; the engineer flag is the job function and survives the change. */
  @Test
  void updatePromotesEngineerToEditorKeepingEngineerStatus() {
    User existing = engineerUser(Role.ENGINEER);
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.update(
        existing.getId(),
        new AdminUserUpdateRequest("lead@test.com", "Lead", Role.EDITOR, UUID.randomUUID(), null));

    assertThat(existing.getRole()).isEqualTo(Role.EDITOR);
    assertThat(existing.isEngineer()).isTrue();
  }

  /** An engineer holding another role may be given the engineer permission tier back. */
  @Test
  void updateAllowsEngineerRoleForFlaggedEngineer() {
    User existing = engineerUser(Role.EDITOR);
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.update(
        existing.getId(),
        new AdminUserUpdateRequest("eng@test.com", "Eng", Role.ENGINEER, null, null));

    assertThat(existing.getRole()).isEqualTo(Role.ENGINEER);
  }

  /** Deactivation is blocked by assignments regardless of which role the engineer holds. */
  @Test
  void deactivateEditorWhoIsAnEngineerWithAssignmentsBlocked() {
    User lead = engineerUser(Role.EDITOR);
    when(userRepository.findById(lead.getId())).thenReturn(Optional.of(lead));
    when(objectEngineerRepository.countByEngineerId(lead.getId())).thenReturn(1);

    assertThatThrownBy(() -> adminUserService.deactivate(lead.getId()))
        .isInstanceOf(EngineerHasActiveAssignmentsException.class);
  }

  // --- Last-admin protection ---

  /**
   * Losing the last admin is unrecoverable through the API: every admin-only route, including the
   * one that would restore an admin, answers 403 from then on. Recovery needs direct SQL.
   */
  @Test
  void updateCannotDemoteTheLastAdmin() {
    User onlyAdmin = user(Role.ADMIN);
    when(userRepository.findById(onlyAdmin.getId())).thenReturn(Optional.of(onlyAdmin));
    when(userRepository.countByRoleAndActiveTrue(Role.ADMIN)).thenReturn(1L);

    assertThatThrownBy(
            () ->
                adminUserService.update(
                    onlyAdmin.getId(),
                    new AdminUserUpdateRequest("a@test.com", "A", Role.EDITOR, null, null)))
        .isInstanceOf(LastAdminException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  void updateCanDemoteAnAdminWhenAnotherRemains() {
    User admin = user(Role.ADMIN);
    when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
    when(userRepository.countByRoleAndActiveTrue(Role.ADMIN)).thenReturn(2L);
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.update(
        admin.getId(), new AdminUserUpdateRequest("a@test.com", "A", Role.EDITOR, null, null));

    assertThat(admin.getRole()).isEqualTo(Role.EDITOR);
  }

  /** Renaming the last admin is fine — only losing the role is not. */
  @Test
  void updateAllowsEditingTheLastAdminWithoutRoleChange() {
    User onlyAdmin = user(Role.ADMIN);
    when(userRepository.findById(onlyAdmin.getId())).thenReturn(Optional.of(onlyAdmin));
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.update(
        onlyAdmin.getId(),
        new AdminUserUpdateRequest("a@test.com", "Renamed", Role.ADMIN, null, null));

    assertThat(onlyAdmin.getName()).isEqualTo("Renamed");
  }

  @Test
  void deactivateCannotRemoveTheLastAdmin() {
    User onlyAdmin = user(Role.ADMIN);
    when(userRepository.findById(onlyAdmin.getId())).thenReturn(Optional.of(onlyAdmin));
    when(userRepository.countByRoleAndActiveTrue(Role.ADMIN)).thenReturn(1L);

    assertThatThrownBy(() -> adminUserService.deactivate(onlyAdmin.getId()))
        .isInstanceOf(LastAdminException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  void deactivateCanRemoveAnAdminWhenAnotherRemains() {
    User admin = user(Role.ADMIN);
    when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
    when(userRepository.countByRoleAndActiveTrue(Role.ADMIN)).thenReturn(2L);

    adminUserService.deactivate(admin.getId());

    assertThat(admin.isActive()).isFalse();
  }

  /** An already-inactive admin does not count, so removing them cannot be the last-admin case. */
  @Test
  void deactivateInactiveAdminIsNotBlocked() {
    User admin = user(Role.ADMIN);
    admin.setActive(false);
    when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));

    adminUserService.deactivate(admin.getId());

    assertThat(admin.isActive()).isFalse();
  }

  // --- setPassword ---

  @Test
  void setPasswordEncodesAndClearsLockout() {
    User existing = lockedUser();
    when(userRepository.findById(existing.getId())).thenReturn(Optional.of(existing));
    when(passwordEncoder.encode("new-password")).thenReturn("new-hash");
    when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

    adminUserService.setPassword(existing.getId(), new AdminUserPasswordRequest("new-password"));

    assertThat(existing.getPasswordHash()).isEqualTo("new-hash");
    assertThat(existing.getLockedUntil()).isNull();
    assertThat(existing.getFailedLoginCount()).isZero();
  }

  @Test
  void setPasswordUnknownUserThrows() {
    UUID id = UUID.randomUUID();
    when(userRepository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(
            () -> adminUserService.setPassword(id, new AdminUserPasswordRequest("new-password")))
        .isInstanceOf(UserNotFoundException.class);
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
    User engineer = engineerUser(Role.ENGINEER);
    when(userRepository.findById(engineer.getId())).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.countByEngineerId(engineer.getId())).thenReturn(2);

    assertThatThrownBy(() -> adminUserService.deactivate(engineer.getId()))
        .isInstanceOf(EngineerHasActiveAssignmentsException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  void deactivateEngineerWithoutAssignmentsAllowed() {
    User engineer = engineerUser(Role.ENGINEER);
    when(userRepository.findById(engineer.getId())).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.countByEngineerId(engineer.getId())).thenReturn(0);

    adminUserService.deactivate(engineer.getId());

    assertThat(engineer.isActive()).isFalse();
  }
}
