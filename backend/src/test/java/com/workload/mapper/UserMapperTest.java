package com.workload.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.AdminUserDto;
import com.workload.dto.UserDto;
import com.workload.entity.Role;
import com.workload.entity.User;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class UserMapperTest {

  private final UserMapper mapper = Mappers.getMapper(UserMapper.class);

  @Test
  void mapsUserToDto() {
    UUID id = UUID.randomUUID();
    User user =
        User.builder()
            .id(id)
            .email("test@example.com")
            .name("Test User")
            .passwordHash("hashed")
            .role(Role.ENGINEER)
            .capacityFte(new BigDecimal("0.75"))
            .active(true)
            .requiresActivation(false)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    UserDto dto = mapper.toDto(user);

    assertThat(dto.id()).isEqualTo(id);
    assertThat(dto.email()).isEqualTo("test@example.com");
    assertThat(dto.name()).isEqualTo("Test User");
    assertThat(dto.role()).isEqualTo(Role.ENGINEER);
    assertThat(dto.capacityFte()).isEqualByComparingTo("0.75");
    assertThat(dto.active()).isTrue();
  }

  @Test
  void mapsUserToAdminDtoIncludingLockState() {
    OffsetDateTime lockedUntil = OffsetDateTime.now().plusMinutes(30);
    UUID divisionId = UUID.randomUUID();
    User user =
        User.builder()
            .id(UUID.randomUUID())
            .email("locked@example.com")
            .name("Locked User")
            .passwordHash("hashed")
            .role(Role.EDITOR)
            .divisionId(divisionId)
            .capacityFte(BigDecimal.ONE)
            .active(false)
            .requiresActivation(true)
            .failedLoginCount(5)
            .lockedUntil(lockedUntil)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();

    AdminUserDto dto = mapper.toAdminDto(user);

    assertThat(dto.role()).isEqualTo(Role.EDITOR);
    assertThat(dto.divisionId()).isEqualTo(divisionId);
    assertThat(dto.active()).isFalse();
    assertThat(dto.requiresActivation()).isTrue();
    assertThat(dto.lockedUntil()).isEqualTo(lockedUntil);
  }
}
