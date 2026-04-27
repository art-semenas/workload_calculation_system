package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.AssignmentCreateRequest;
import com.workload.dto.ObjectDeviceUpsertRequest;
import com.workload.dto.RecordsUpdateRequest;
import com.workload.entity.Branch;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.Division;
import com.workload.entity.EngineerSummary;
import com.workload.entity.ObjectEngineer;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Role;
import com.workload.entity.SystemType;
import com.workload.entity.User;
import com.workload.repository.BranchRepository;
import com.workload.repository.DeviceSystemContextRepository;
import com.workload.repository.DeviceTypeRepository;
import com.workload.repository.DivisionRepository;
import com.workload.repository.EngineerSummaryRepository;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.UserRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Transactional
class EngineerRecalculationWiringIT {

  @Autowired private EquipmentService equipmentService;
  @Autowired private RecordsService recordsService;
  @Autowired private ObjectService objectService;
  @Autowired private EngineerSummaryService engineerSummaryService;

  @Autowired private DivisionRepository divisionRepository;
  @Autowired private BranchRepository branchRepository;
  @Autowired private ObjectRepository objectRepository;
  @Autowired private DeviceTypeRepository deviceTypeRepository;
  @Autowired private DeviceSystemContextRepository deviceSystemContextRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private ObjectEngineerRepository objectEngineerRepository;
  @Autowired private EngineerSummaryRepository engineerSummaryRepository;

  @Autowired private EntityManager entityManager;

  // -------------------------------------------------------------------------
  // Helper: build minimal data hierarchy
  // -------------------------------------------------------------------------

  private ObjectEntity createObject() {
    Division division =
        Division.builder()
            .id(UUID.randomUUID())
            .name("EngWiringIT-Div-" + UUID.randomUUID())
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    divisionRepository.saveAndFlush(division);

    Branch branch =
        Branch.builder()
            .id(UUID.randomUUID())
            .division(division)
            .name("EngWiringIT-Branch-" + UUID.randomUUID())
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    branchRepository.saveAndFlush(branch);

    ObjectEntity object =
        ObjectEntity.builder()
            .id(UUID.randomUUID())
            .branch(branch)
            .name("EngWiringIT-Object-" + UUID.randomUUID())
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return objectRepository.saveAndFlush(object);
  }

  private DeviceType createDeviceType() {
    DeviceType deviceType =
        DeviceType.builder()
            .id(UUID.randomUUID())
            .name("TestDevice-" + UUID.randomUUID())
            .description("Test device for engineer wiring test")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return deviceTypeRepository.saveAndFlush(deviceType);
  }

  private DeviceSystemContext createContext(DeviceType deviceType, SystemType systemType) {
    DeviceSystemContext ctx =
        DeviceSystemContext.builder()
            .id(UUID.randomUUID())
            .deviceType(deviceType)
            .systemType(systemType)
            .r1Minutes(new BigDecimal("10"))
            .r2Minutes(new BigDecimal("5"))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return deviceSystemContextRepository.saveAndFlush(ctx);
  }

  private User createEngineer(String tag) {
    User engineer =
        User.builder()
            .id(UUID.randomUUID())
            .email("eng_" + tag + "_" + UUID.randomUUID() + "@test.com")
            .name("Test Engineer " + tag)
            .passwordHash("hash")
            .role(Role.ENGINEER)
            .active(true)
            .requiresActivation(false)
            .capacityFte(BigDecimal.ONE)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return userRepository.saveAndFlush(engineer);
  }

  private ObjectEngineer assignEngineerToObject(ObjectEntity object, User engineer) {
    ObjectEngineer oe =
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .object(object)
            .engineer(engineer)
            .assignedAt(OffsetDateTime.now())
            .build();
    return objectEngineerRepository.saveAndFlush(oe);
  }

  // -------------------------------------------------------------------------
  // Tests
  // -------------------------------------------------------------------------

  @Test
  void updateDeviceQuantity_updatesEngineerSummary() {
    // Given: object with a device type, system context, and assigned engineer
    ObjectEntity object = createObject();
    UUID objectId = object.getId();
    DeviceType deviceType = createDeviceType();
    createContext(deviceType, SystemType.OS);

    User engineer = createEngineer("A");
    assignEngineerToObject(object, engineer);

    assertThat(engineerSummaryRepository.findByEngineerId(engineer.getId())).isEmpty();

    // Add assignment so work components are non-zero (device must be in inventory first)
    equipmentService.upsertDevice(
        objectId, new ObjectDeviceUpsertRequest(deviceType.getId(), new BigDecimal("1")));
    equipmentService.addAssignment(
        objectId,
        new AssignmentCreateRequest(deviceType.getId(), SystemType.OS, new BigDecimal("1")));

    entityManager.flush();
    entityManager.clear();

    // When: update device quantity — triggers object recalculation which wires engineer recalc
    equipmentService.upsertDevice(
        objectId, new ObjectDeviceUpsertRequest(deviceType.getId(), new BigDecimal("2")));

    entityManager.flush();
    entityManager.clear();

    // Then: engineer summary exists with a non-zero total_load
    Optional<EngineerSummary> es = engineerSummaryRepository.findByEngineerId(engineer.getId());
    assertThat(es).isPresent();
    assertThat(es.get().getTotalLoad()).isGreaterThan(BigDecimal.ZERO);
  }

  @Test
  void updateRecords_updatesEngineerSummary() {
    // Given: object with an assigned engineer, no records initially
    ObjectEntity object = createObject();
    UUID objectId = object.getId();

    User engineer = createEngineer("B");
    assignEngineerToObject(object, engineer);

    assertThat(engineerSummaryRepository.findByEngineerId(engineer.getId())).isEmpty();

    // When: update records with non-zero access requests
    recordsService.update(
        objectId,
        new RecordsUpdateRequest(
            new BigDecimal("5"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO));

    entityManager.flush();
    entityManager.clear();

    // Then: engineer summary has records_load > 0
    Optional<EngineerSummary> es = engineerSummaryRepository.findByEngineerId(engineer.getId());
    assertThat(es).isPresent();
    assertThat(es.get().getRecordsLoad()).isGreaterThan(BigDecimal.ZERO);
  }

  @Test
  void deleteObject_recalculatesAffectedEngineers() {
    // Given: object with 2 assigned engineers, summaries populated
    ObjectEntity object = createObject();
    UUID objectId = object.getId();

    User engineer1 = createEngineer("C1");
    User engineer2 = createEngineer("C2");

    assignEngineerToObject(object, engineer1);
    assignEngineerToObject(object, engineer2);

    // Add records so the object has a non-zero summary; wiring triggers engineer summaries too
    recordsService.update(
        objectId,
        new RecordsUpdateRequest(
            new BigDecimal("3"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO));

    entityManager.flush();
    entityManager.clear();

    // Verify summaries exist with non-zero load before delete (wiring created them automatically)
    assertThat(engineerSummaryRepository.findByEngineerId(engineer1.getId())).isPresent();
    assertThat(engineerSummaryRepository.findByEngineerId(engineer2.getId())).isPresent();

    // When: delete the object
    objectService.delete(objectId);

    entityManager.flush();
    entityManager.clear();

    // Then: both engineers' summaries are updated — total_load and object_count are 0
    Optional<EngineerSummary> es1 = engineerSummaryRepository.findByEngineerId(engineer1.getId());
    Optional<EngineerSummary> es2 = engineerSummaryRepository.findByEngineerId(engineer2.getId());

    assertThat(es1).isPresent();
    assertThat(es1.get().getTotalLoad()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(es1.get().getObjectCount()).isEqualTo(0);

    assertThat(es2).isPresent();
    assertThat(es2.get().getTotalLoad()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(es2.get().getObjectCount()).isEqualTo(0);
  }

  @Test
  void endToEnd_assignEquipmentAndEngineer_verifySummary() {
    // Given: object with device inventory + assignment, then engineer assigned
    ObjectEntity object = createObject();
    UUID objectId = object.getId();
    DeviceType deviceType = createDeviceType();
    createContext(deviceType, SystemType.OS);

    // Add device and assignment so work components are non-zero
    equipmentService.upsertDevice(
        objectId, new ObjectDeviceUpsertRequest(deviceType.getId(), new BigDecimal("1")));
    equipmentService.addAssignment(
        objectId,
        new AssignmentCreateRequest(deviceType.getId(), SystemType.OS, new BigDecimal("1")));

    entityManager.flush();
    entityManager.clear();

    // Assign engineer after object summary is computed
    User engineer = createEngineer("D");
    ObjectEntity freshObject = objectRepository.findById(objectId).orElseThrow();
    assignEngineerToObject(freshObject, engineer);

    // Trigger engineer summary recalculation (simulating what a subsequent object recalc would do)
    engineerSummaryService.recalculate(engineer.getId());

    entityManager.flush();
    entityManager.clear();

    // Then: engineer summary exists and total_load > 0 matching the object summary
    Optional<EngineerSummary> es = engineerSummaryRepository.findByEngineerId(engineer.getId());
    assertThat(es).isPresent();
    assertThat(es.get().getTotalLoad()).isGreaterThan(BigDecimal.ZERO);
    assertThat(es.get().getObjectCount()).isEqualTo(1);
    assertThat(es.get().getStatus()).isNotNull();
  }
}
