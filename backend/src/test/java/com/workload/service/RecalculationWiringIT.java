package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.workload.dto.AssignmentCreateRequest;
import com.workload.dto.ObjectDeviceUpsertRequest;
import com.workload.dto.RecordsUpdateRequest;
import com.workload.dto.RepairUpdateRequest;
import com.workload.dto.TravelUpdateRequest;
import com.workload.entity.Branch;
import com.workload.entity.DeviceSystemContext;
import com.workload.entity.DeviceType;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.RepairType;
import com.workload.entity.Summary;
import com.workload.entity.SystemType;
import com.workload.repository.BranchRepository;
import com.workload.repository.DeviceSystemContextRepository;
import com.workload.repository.DeviceTypeRepository;
import com.workload.repository.DivisionRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.RepairTypeRepository;
import com.workload.repository.SummaryRepository;
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
class RecalculationWiringIT {

  @Autowired private EquipmentService equipmentService;
  @Autowired private RecordsService recordsService;
  @Autowired private RepairService repairService;
  @Autowired private TravelService travelService;

  @Autowired private DivisionRepository divisionRepository;
  @Autowired private BranchRepository branchRepository;
  @Autowired private ObjectRepository objectRepository;
  @Autowired private DeviceTypeRepository deviceTypeRepository;
  @Autowired private DeviceSystemContextRepository deviceSystemContextRepository;
  @Autowired private RepairTypeRepository repairTypeRepository;
  @Autowired private SummaryRepository summaryRepository;

  @Autowired private EntityManager entityManager;

  // -------------------------------------------------------------------------
  // Helper: build minimal data hierarchy
  // -------------------------------------------------------------------------

  private ObjectEntity createObject() {
    Division division =
        Division.builder()
            .id(UUID.randomUUID())
            .name("WiringIT-Div-" + UUID.randomUUID())
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    divisionRepository.saveAndFlush(division);

    Branch branch =
        Branch.builder()
            .id(UUID.randomUUID())
            .division(division)
            .name("WiringIT-Branch-" + UUID.randomUUID())
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    branchRepository.saveAndFlush(branch);

    ObjectEntity object =
        ObjectEntity.builder()
            .id(UUID.randomUUID())
            .branch(branch)
            .name("WiringIT-Object-" + UUID.randomUUID())
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
            .description("Test device for wiring test")
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

  private RepairType createRepairType() {
    RepairType repairType =
        RepairType.builder()
            .id(UUID.randomUUID())
            .name("TestRepair-" + UUID.randomUUID())
            .timeMinutes(new BigDecimal("30"))
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return repairTypeRepository.saveAndFlush(repairType);
  }

  // -------------------------------------------------------------------------
  // Tests
  // -------------------------------------------------------------------------

  @Test
  void updateDeviceQuantity_triggersRecalculation() {
    // Given: object with a device type and system context
    ObjectEntity object = createObject();
    UUID objectId = object.getId();
    DeviceType deviceType = createDeviceType();
    createContext(deviceType, SystemType.OS);

    assertThat(summaryRepository.findByObjectId(objectId)).isEmpty();

    // When: add device to inventory (triggers recalculation)
    equipmentService.upsertDevice(
        objectId, new ObjectDeviceUpsertRequest(deviceType.getId(), new BigDecimal("2")));

    entityManager.flush();
    entityManager.clear();

    // Then: summary exists with a computed itogoChisloWithTravel
    Optional<Summary> summary = summaryRepository.findByObjectId(objectId);
    assertThat(summary).isPresent();
    assertThat(summary.get().getItogoChisloWithTravel()).isNotNull();
  }

  @Test
  void updateRecords_triggersRecalculation() {
    // Given: object with no records
    ObjectEntity object = createObject();
    UUID objectId = object.getId();

    assertThat(summaryRepository.findByObjectId(objectId)).isEmpty();

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

    // Then: summary exists with recordsMonthly > 0
    Optional<Summary> summary = summaryRepository.findByObjectId(objectId);
    assertThat(summary).isPresent();
    assertThat(summary.get().getRecordsMonthly()).isGreaterThan(BigDecimal.ZERO);
  }

  @Test
  void updateTravel_triggersRecalculation() {
    // Given: object with a device + assignment (non-zero work) and travel
    ObjectEntity object = createObject();
    UUID objectId = object.getId();
    DeviceType deviceType = createDeviceType();
    createContext(deviceType, SystemType.OS);

    // Add device to inventory first
    equipmentService.upsertDevice(
        objectId, new ObjectDeviceUpsertRequest(deviceType.getId(), new BigDecimal("1")));

    // Add assignment so work components are non-zero
    equipmentService.addAssignment(
        objectId,
        new AssignmentCreateRequest(deviceType.getId(), SystemType.OS, new BigDecimal("1")));

    // When: update travel with a known one-way time
    BigDecimal oneWayMin = new BigDecimal("15");
    travelService.update(
        objectId, new TravelUpdateRequest("CAR", BigDecimal.ZERO, oneWayMin, null));

    entityManager.flush();
    entityManager.clear();

    // Then: summary exists with roundTripMin = oneWayMin * 2
    Optional<Summary> summary = summaryRepository.findByObjectId(objectId);
    assertThat(summary).isPresent();
    assertThat(summary.get().getRoundTripMin())
        .isEqualByComparingTo(oneWayMin.multiply(BigDecimal.valueOf(2)));
  }

  @Test
  void updateRepair_triggersRecalculation() {
    // Given: object with equipment but zero repairs
    ObjectEntity object = createObject();
    UUID objectId = object.getId();
    DeviceType deviceType = createDeviceType();
    createContext(deviceType, SystemType.OS);

    // Add device inventory + assignment so work components are non-zero
    equipmentService.upsertDevice(
        objectId, new ObjectDeviceUpsertRequest(deviceType.getId(), new BigDecimal("1")));
    equipmentService.addAssignment(
        objectId,
        new AssignmentCreateRequest(deviceType.getId(), SystemType.OS, new BigDecimal("1")));

    RepairType repairType = createRepairType();

    assertThat(summaryRepository.findByObjectId(objectId)).isPresent();

    // When: update repair count to > 0
    repairService.update(objectId, repairType.getId(), new RepairUpdateRequest(3));

    entityManager.flush();
    entityManager.clear();

    // Then: summary exists with repairNoTravelMonthly > 0
    Optional<Summary> summary = summaryRepository.findByObjectId(objectId);
    assertThat(summary).isPresent();
    assertThat(summary.get().getRepairNoTravelMonthly()).isGreaterThan(BigDecimal.ZERO);
  }
}
