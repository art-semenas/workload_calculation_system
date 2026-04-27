package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.workload.dto.EngineerObjectDto;
import com.workload.dto.EngineerShareDto;
import com.workload.entity.Branch;
import com.workload.entity.EngineerSummary;
import com.workload.entity.ObjectEngineer;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Role;
import com.workload.entity.Summary;
import com.workload.entity.User;
import com.workload.exception.AssignmentNotFoundException;
import com.workload.exception.EngineerInactiveException;
import com.workload.exception.InvalidEngineerRoleException;
import com.workload.exception.ObjectNotFoundException;
import com.workload.mapper.EngineerSummaryMapper;
import com.workload.repository.EngineerSummaryRepository;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.SummaryRepository;
import com.workload.repository.UserRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class ObjectEngineerServiceTest {

  @Mock private ObjectEngineerRepository objectEngineerRepository;
  @Mock private SummaryRepository summaryRepository;
  @Mock private EngineerSummaryRepository engineerSummaryRepository;
  @Mock private UserRepository userRepository;
  @Mock private ObjectRepository objectRepository;
  @Mock private EngineerSummaryService engineerSummaryService;
  @Mock private EngineerSummaryMapper engineerSummaryMapper;

  @InjectMocks private ObjectEngineerService objectEngineerService;

  private final UUID objectId = UUID.randomUUID();
  private final UUID engineerId = UUID.randomUUID();
  private final UUID engineerId2 = UUID.randomUUID();

  // =========================================================================
  // Test: assign_validEngineer_createsRow
  // =========================================================================
  @Test
  void assign_validEngineer_createsRow() {
    // Setup: Valid engineer and object
    User engineer =
        User.builder()
            .id(engineerId)
            .name("Test Engineer")
            .role(Role.ENGINEER)
            .active(true)
            .build();

    ObjectEntity object = ObjectEntity.builder().id(objectId).name("Test Object").build();

    ObjectEngineer expected =
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .engineer(engineer)
            .object(object)
            .assignedAt(OffsetDateTime.now())
            .build();

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectRepository.findById(objectId)).thenReturn(Optional.of(object));
    when(objectEngineerRepository.save(any(ObjectEngineer.class))).thenReturn(expected);

    // Execute
    ObjectEngineer result = objectEngineerService.assignEngineerToObject(objectId, engineerId);

    // Assert
    assertThat(result).isNotNull();
    assertThat(result.getEngineer().getId()).isEqualTo(engineerId);
    assertThat(result.getObject().getId()).isEqualTo(objectId);
    verify(engineerSummaryService).recalculateAllForObject(objectId);
  }

  // =========================================================================
  // Test: assign_inactiveEngineer_throws422
  // =========================================================================
  @Test
  void assign_inactiveEngineer_throws422() {
    // Setup: Inactive engineer
    User inactiveEngineer =
        User.builder()
            .id(engineerId)
            .name("Inactive Engineer")
            .role(Role.ENGINEER)
            .active(false)
            .build();

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(inactiveEngineer));

    // Execute & Assert
    assertThatThrownBy(() -> objectEngineerService.assignEngineerToObject(objectId, engineerId))
        .isInstanceOf(EngineerInactiveException.class)
        .hasMessageContaining("Engineer is inactive");
  }

  // =========================================================================
  // Test: assign_nonEngineerRole_throws422
  // =========================================================================
  @Test
  void assign_nonEngineerRole_throws422() {
    // Setup: User with admin role
    User adminUser =
        User.builder().id(engineerId).name("Admin User").role(Role.ADMIN).active(true).build();

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(adminUser));

    // Execute & Assert
    assertThatThrownBy(() -> objectEngineerService.assignEngineerToObject(objectId, engineerId))
        .isInstanceOf(InvalidEngineerRoleException.class)
        .hasMessageContaining("not an engineer");
  }

  // =========================================================================
  // Test: assign_objectNotFound_throws404
  // =========================================================================
  @Test
  void assign_objectNotFound_throws404() {
    // Setup: Valid engineer, no object
    User engineer =
        User.builder()
            .id(engineerId)
            .name("Test Engineer")
            .role(Role.ENGINEER)
            .active(true)
            .build();

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectRepository.findById(objectId)).thenReturn(Optional.empty());

    // Execute & Assert
    assertThatThrownBy(() -> objectEngineerService.assignEngineerToObject(objectId, engineerId))
        .isInstanceOf(ObjectNotFoundException.class)
        .hasMessageContaining("not found");
  }

  // =========================================================================
  // Test: assign_duplicateAssignment_throws409
  // =========================================================================
  @Test
  void assign_duplicateAssignment_throws409() {
    // Setup: Valid engineer and object, but duplicate assignment exists
    User engineer =
        User.builder()
            .id(engineerId)
            .name("Test Engineer")
            .role(Role.ENGINEER)
            .active(true)
            .build();

    ObjectEntity object = ObjectEntity.builder().id(objectId).name("Test Object").build();

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectRepository.findById(objectId)).thenReturn(Optional.of(object));
    when(objectEngineerRepository.save(any(ObjectEngineer.class)))
        .thenThrow(
            new DataIntegrityViolationException(
                "Unique constraint violation: uq_oe_object_engineer"));

    // Execute & Assert
    assertThatThrownBy(() -> objectEngineerService.assignEngineerToObject(objectId, engineerId))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  // =========================================================================
  // Test: remove_existingAssignment_deletesAndRecalculates
  // =========================================================================
  @Test
  void remove_existingAssignment_deletesAndRecalculates() {
    // Setup: Existing assignment
    User engineer =
        User.builder()
            .id(engineerId)
            .name("Test Engineer")
            .role(Role.ENGINEER)
            .active(true)
            .build();

    ObjectEntity object = ObjectEntity.builder().id(objectId).name("Test Object").build();

    ObjectEngineer assignment =
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .engineer(engineer)
            .object(object)
            .assignedAt(OffsetDateTime.now())
            .build();

    when(objectEngineerRepository.findByObjectIdAndEngineerId(objectId, engineerId))
        .thenReturn(Optional.of(assignment));

    // Execute
    objectEngineerService.removeEngineerFromObject(objectId, engineerId);

    // Assert
    verify(objectEngineerRepository).delete(assignment);
    verify(engineerSummaryService).recalculateAllForObject(objectId);
    verify(engineerSummaryService).recalculate(engineerId);
  }

  // =========================================================================
  // Test: remove_nonexistentAssignment_throws404
  // =========================================================================
  @Test
  void remove_nonexistentAssignment_throws404() {
    // Setup: No assignment found
    when(objectEngineerRepository.findByObjectIdAndEngineerId(objectId, engineerId))
        .thenReturn(Optional.empty());

    // Execute & Assert
    assertThatThrownBy(() -> objectEngineerService.removeEngineerFromObject(objectId, engineerId))
        .isInstanceOf(AssignmentNotFoundException.class)
        .hasMessageContaining("not found");
  }

  // =========================================================================
  // Test: getEngineersForObject_computesShares
  // =========================================================================
  @Test
  void getEngineersForObject_computesShares() {
    // Setup: Object with 2 engineers, itogo_chislo = 100
    User engineer1 =
        User.builder()
            .id(engineerId)
            .name("Engineer 1")
            .role(Role.ENGINEER)
            .active(true)
            .capacityFte(BigDecimal.ONE)
            .build();

    User engineer2 =
        User.builder()
            .id(engineerId2)
            .name("Engineer 2")
            .role(Role.ENGINEER)
            .active(true)
            .capacityFte(BigDecimal.ONE)
            .build();

    ObjectEntity object = ObjectEntity.builder().id(objectId).name("Test Object").build();

    ObjectEngineer assignment1 =
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .engineer(engineer1)
            .object(object)
            .assignedAt(OffsetDateTime.now())
            .build();

    ObjectEngineer assignment2 =
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .engineer(engineer2)
            .object(object)
            .assignedAt(OffsetDateTime.now())
            .build();

    Summary summary =
        Summary.builder()
            .id(UUID.randomUUID())
            .object(object)
            .itogoChisloWithTravel(BigDecimal.valueOf(100))
            .build();

    EngineerSummary es1 =
        EngineerSummary.builder()
            .id(UUID.randomUUID())
            .engineer(engineer1)
            .totalLoad(BigDecimal.valueOf(50))
            .loadRatio(BigDecimal.valueOf(50))
            .status("normal")
            .build();

    EngineerSummary es2 =
        EngineerSummary.builder()
            .id(UUID.randomUUID())
            .engineer(engineer2)
            .totalLoad(BigDecimal.valueOf(50))
            .loadRatio(BigDecimal.valueOf(50))
            .status("normal")
            .build();

    when(objectEngineerRepository.findAllByObjectId(objectId))
        .thenReturn(List.of(assignment1, assignment2));
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.of(es1));
    when(engineerSummaryRepository.findByEngineerId(engineerId2)).thenReturn(Optional.of(es2));

    // Execute
    List<EngineerShareDto> result = objectEngineerService.getEngineersForObject(objectId);

    // Assert
    assertThat(result).hasSize(2);
    assertThat(result.get(0).objectShare()).isEqualByComparingTo(BigDecimal.valueOf(50)); // 100/2
    assertThat(result.get(1).objectShare()).isEqualByComparingTo(BigDecimal.valueOf(50)); // 100/2
  }

  // =========================================================================
  // Test: getObjectsForEngineer_computesShares
  // =========================================================================
  @Test
  void getObjectsForEngineer_computesShares() {
    // Setup: Engineer assigned to 2 objects
    User engineer =
        User.builder()
            .id(engineerId)
            .name("Test Engineer")
            .role(Role.ENGINEER)
            .active(true)
            .build();

    UUID objectId2 = UUID.randomUUID();

    Branch branch = Branch.builder().id(UUID.randomUUID()).name("Test Branch").build();

    ObjectEntity object1 =
        ObjectEntity.builder().id(objectId).name("Object 1").branch(branch).build();

    ObjectEntity object2 =
        ObjectEntity.builder().id(objectId2).name("Object 2").branch(branch).build();

    ObjectEngineer assignment1 =
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .engineer(engineer)
            .object(object1)
            .assignedAt(OffsetDateTime.now())
            .build();

    ObjectEngineer assignment2 =
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .engineer(engineer)
            .object(object2)
            .assignedAt(OffsetDateTime.now())
            .build();

    Summary summary1 =
        Summary.builder()
            .id(UUID.randomUUID())
            .object(object1)
            .itogoChisloWithTravel(BigDecimal.valueOf(100))
            .build();

    Summary summary2 =
        Summary.builder()
            .id(UUID.randomUUID())
            .object(object2)
            .itogoChisloWithTravel(BigDecimal.valueOf(100))
            .build();

    when(objectEngineerRepository.findAllByEngineerId(engineerId))
        .thenReturn(List.of(assignment1, assignment2));
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary1));
    when(summaryRepository.findByObjectId(objectId2)).thenReturn(Optional.of(summary2));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(objectEngineerRepository.countByObjectId(objectId2)).thenReturn(1);

    // Execute
    List<EngineerObjectDto> result = objectEngineerService.getObjectsForEngineer(engineerId);

    // Assert
    assertThat(result).hasSize(2);
    assertThat(result.get(0).engineerShare())
        .isEqualByComparingTo(BigDecimal.valueOf(100)); // 100/1
    assertThat(result.get(1).engineerShare())
        .isEqualByComparingTo(BigDecimal.valueOf(100)); // 100/1
  }
}
