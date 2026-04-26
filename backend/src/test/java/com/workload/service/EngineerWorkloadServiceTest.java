package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.workload.config.WorkloadConfig;
import com.workload.entity.EngineerSummary;
import com.workload.entity.ObjectEngineer;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Summary;
import com.workload.entity.User;
import com.workload.repository.EngineerSummaryRepository;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.SummaryRepository;
import com.workload.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class EngineerWorkloadServiceTest {

  @Mock private ObjectEngineerRepository objectEngineerRepository;
  @Mock private SummaryRepository summaryRepository;
  @Mock private EngineerSummaryRepository engineerSummaryRepository;
  @Mock private UserRepository userRepository;

  private WorkloadConfig config;
  private EngineerSummaryService service;

  @BeforeEach
  void setUp() {
    config = new WorkloadConfig();
    config.setPlanningPeriodMonths(6);
    config.setRepairProductiveMonths(5);
    config.setRepairTravelZeroThreshold(5);
    config.setRepairTravelCap(10);
    config.setPzvMinutes(20);
    config.setEngineerWarningThreshold(new BigDecimal("0.9"));
    config.setEngineerOverloadThreshold(new BigDecimal("1.0"));
    config.setOsR1VisitsPerYear(12);
    config.setOsR2VisitsPerYear(4);
    config.setPsR1VisitsPerYear(12);
    config.setPsR2VisitsPerYear(4);
    config.setVideoR1VisitsPerYear(12);
    config.setVideoR2VisitsPerYear(4);
    config.setRecordsAccessMinutes(30);
    config.setRecordsMonitoringMinutes(20);
    config.setRecordsFootageMinutes(15);
    config.setRecordsBackupMinutes(10);
    config.setRecordsAdminMinutes(5);
    config.setMonthlyHoursFund(new BigDecimal("142.8"));
    config.setAbsenceCoefficient(new BigDecimal("1.12"));

    service =
        new EngineerSummaryService(
            objectEngineerRepository,
            summaryRepository,
            engineerSummaryRepository,
            userRepository,
            config);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private User buildEngineer(UUID id, BigDecimal capacityFte) {
    return User.builder()
        .id(id)
        .email("engineer@test.com")
        .name("Test Engineer")
        .passwordHash("hash")
        .capacityFte(capacityFte)
        .active(true)
        .requiresActivation(false)
        .build();
  }

  private ObjectEntity buildObject(UUID id) {
    ObjectEntity obj = new ObjectEntity();
    obj.setId(id);
    return obj;
  }

  private ObjectEngineer buildAssignment(ObjectEntity object, User engineer) {
    return ObjectEngineer.builder().id(UUID.randomUUID()).object(object).engineer(engineer).build();
  }

  private Summary buildSummary(
      UUID objectId,
      BigDecimal itogo,
      BigDecimal osMonthlyAvg,
      BigDecimal psMonthlyAvg,
      BigDecimal videoMonthlyAvg,
      BigDecimal recordsMonthly,
      BigDecimal repairWithTravelMonthly) {
    ObjectEntity obj = buildObject(objectId);
    return Summary.builder()
        .id(UUID.randomUUID())
        .object(obj)
        .itogoChisloWithTravel(itogo)
        .osMonthlyAvg(osMonthlyAvg)
        .psMonthlyAvg(psMonthlyAvg)
        .videoMonthlyAvg(videoMonthlyAvg)
        .recordsMonthly(recordsMonthly)
        .repairWithTravelMonthly(repairWithTravelMonthly)
        .build();
  }

  // -------------------------------------------------------------------------
  // Object share / workload split tests
  // -------------------------------------------------------------------------

  @Test
  void singleEngineer_fullObjectLoad() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("0.032327"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    assertThat(saved.getTotalLoad()).isEqualByComparingTo(new BigDecimal("0.032327"));
    assertThat(saved.getObjectCount()).isEqualTo(1);
  }

  @Test
  void twoCoEngineers_equalSplit() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("0.032327"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(2);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    BigDecimal expected =
        new BigDecimal("0.032327").divide(new BigDecimal("2"), 10, java.math.RoundingMode.HALF_UP);
    assertThat(saved.getTotalLoad()).isEqualByComparingTo(expected);
    assertThat(saved.getObjectCount()).isEqualTo(1);
  }

  @Test
  void threeCoEngineers_equalSplit() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("0.032327"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(3);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    BigDecimal expected =
        new BigDecimal("0.032327").divide(new BigDecimal("3"), 10, java.math.RoundingMode.HALF_UP);
    assertThat(saved.getTotalLoad()).isEqualByComparingTo(expected);
    assertThat(saved.getObjectCount()).isEqualTo(1);
  }

  @Test
  void engineerOnMultipleObjects_sumsShares() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId1 = UUID.randomUUID();
    UUID objectId2 = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object1 = buildObject(objectId1);
    ObjectEntity object2 = buildObject(objectId2);
    ObjectEngineer assignment1 = buildAssignment(object1, engineer);
    ObjectEngineer assignment2 = buildAssignment(object2, engineer);
    Summary summary1 =
        buildSummary(
            objectId1,
            new BigDecimal("0.032327"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);
    Summary summary2 =
        buildSummary(
            objectId2,
            new BigDecimal("0.020000"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId))
        .thenReturn(List.of(assignment1, assignment2));
    when(objectEngineerRepository.countByObjectId(objectId1)).thenReturn(1);
    when(objectEngineerRepository.countByObjectId(objectId2)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId1)).thenReturn(Optional.of(summary1));
    when(summaryRepository.findByObjectId(objectId2)).thenReturn(Optional.of(summary2));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    // 0.032327 + 0.020000 = 0.052327
    assertThat(saved.getTotalLoad()).isEqualByComparingTo(new BigDecimal("0.052327"));
    assertThat(saved.getObjectCount()).isEqualTo(2);
  }

  @Test
  void engineerOnMultipleObjects_withDifferentCounts() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId1 = UUID.randomUUID();
    UUID objectId2 = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object1 = buildObject(objectId1);
    ObjectEntity object2 = buildObject(objectId2);
    ObjectEngineer assignment1 = buildAssignment(object1, engineer);
    ObjectEngineer assignment2 = buildAssignment(object2, engineer);
    Summary summary1 =
        buildSummary(
            objectId1,
            new BigDecimal("0.04"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);
    Summary summary2 =
        buildSummary(
            objectId2,
            new BigDecimal("0.03"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId))
        .thenReturn(List.of(assignment1, assignment2));
    when(objectEngineerRepository.countByObjectId(objectId1)).thenReturn(2);
    when(objectEngineerRepository.countByObjectId(objectId2)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId1)).thenReturn(Optional.of(summary1));
    when(summaryRepository.findByObjectId(objectId2)).thenReturn(Optional.of(summary2));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    // 0.04/2 + 0.03/1 = 0.02 + 0.03 = 0.05
    assertThat(saved.getTotalLoad()).isEqualByComparingTo(new BigDecimal("0.05"));
  }

  // -------------------------------------------------------------------------
  // Load ratio and status tests
  // -------------------------------------------------------------------------

  @Test
  void loadRatio_normal() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("0.032"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    assertThat(saved.getLoadRatio()).isEqualByComparingTo(new BigDecimal("0.032"));
    assertThat(saved.getStatus()).isEqualTo("normal");
  }

  @Test
  void loadRatio_warning() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("0.95"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    assertThat(saved.getLoadRatio()).isEqualByComparingTo(new BigDecimal("0.95"));
    assertThat(saved.getStatus()).isEqualTo("warning");
  }

  @Test
  void loadRatio_exactlyAtWarning() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("0.9"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    assertThat(saved.getLoadRatio()).isEqualByComparingTo(new BigDecimal("0.9"));
    assertThat(saved.getStatus()).isEqualTo("warning");
  }

  @Test
  void loadRatio_overloaded() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("1.0"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    assertThat(saved.getLoadRatio()).isEqualByComparingTo(new BigDecimal("1.0"));
    assertThat(saved.getStatus()).isEqualTo("overloaded");
  }

  @Test
  void loadRatio_overloadedAbove() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("1.5"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    assertThat(saved.getLoadRatio()).isEqualByComparingTo(new BigDecimal("1.5"));
    assertThat(saved.getStatus()).isEqualTo("overloaded");
  }

  @Test
  void loadRatio_partTimeEngineer() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("0.5"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("0.5"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    // 0.5 / 0.5 = 1.0, which is overloaded (>= 1.0)
    assertThat(saved.getLoadRatio()).isEqualByComparingTo(new BigDecimal("1.0"));
    assertThat(saved.getStatus()).isEqualTo("overloaded");
  }

  // -------------------------------------------------------------------------
  // Component breakdown tests
  // -------------------------------------------------------------------------

  @Test
  void componentBreakdown_singleObject() {
    // Reference: Brest Archive object with known summary values.
    // os_monthly_avg=40.683, ps_monthly_avg=30.417, video=0, records=0,
    // repair_with_travel_monthly=136.2, itogo=0.032327
    // component_coef = monthly_avg / 60 / 142.8 * 1.12
    // os_load   = 40.683 / 60 / 142.8 * 1.12 ≈ 0.005318
    // ps_load   = 30.417 / 60 / 142.8 * 1.12 ≈ 0.003977
    // repair_load = 136.2 / 60 / 142.8 * 1.12 ≈ 0.017808
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("0.032327"),
            new BigDecimal("40.683"),
            new BigDecimal("30.417"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            new BigDecimal("136.2"));

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    // Verify component loads are in the expected range
    assertThat(saved.getOsLoad())
        .usingComparator(BigDecimal::compareTo)
        .isBetween(new BigDecimal("0.005300"), new BigDecimal("0.005340"));
    assertThat(saved.getPsLoad())
        .usingComparator(BigDecimal::compareTo)
        .isBetween(new BigDecimal("0.003960"), new BigDecimal("0.004000"));
    assertThat(saved.getVideoLoad()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(saved.getRecordsLoad()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(saved.getRepairLoad())
        .usingComparator(BigDecimal::compareTo)
        .isBetween(new BigDecimal("0.017780"), new BigDecimal("0.017840"));
  }

  @Test
  void componentBreakdown_sumsLessThanTotalLoad() {
    // Component sum < total_load because PZV + travel overhead are not attributed to any component.
    // sum ≈ 0.027103, total = 0.032327, gap ≈ 0.005224
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);
    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("0.032327"),
            new BigDecimal("40.683"),
            new BigDecimal("30.417"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            new BigDecimal("136.2"));

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    BigDecimal componentSum =
        saved
            .getOsLoad()
            .add(saved.getPsLoad())
            .add(saved.getVideoLoad())
            .add(saved.getRecordsLoad())
            .add(saved.getRepairLoad());

    // Component sum must be strictly less than total_load
    assertThat(componentSum.compareTo(saved.getTotalLoad())).isLessThan(0);
  }

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  @Test
  void noAssignments_totalLoadZero() {
    UUID engineerId = UUID.randomUUID();

    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of());
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    assertThat(saved.getTotalLoad()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(saved.getObjectCount()).isEqualTo(0);
    assertThat(saved.getLoadRatio()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(saved.getStatus()).isEqualTo("normal");
  }

  // -------------------------------------------------------------------------
  // recalculateAllForObject tests
  // -------------------------------------------------------------------------

  @Test
  void recalculateAllForObject_updatesAllEngineers() {
    UUID objectId = UUID.randomUUID();
    UUID engineerId1 = UUID.randomUUID();
    UUID engineerId2 = UUID.randomUUID();

    User engineer1 = buildEngineer(engineerId1, new BigDecimal("1.0"));
    User engineer2 = buildEngineer(engineerId2, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);

    ObjectEngineer assignment1 = buildAssignment(object, engineer1);
    ObjectEngineer assignment2 = buildAssignment(object, engineer2);

    Summary summary =
        buildSummary(
            objectId,
            new BigDecimal("0.032327"),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO);

    when(objectEngineerRepository.findAllByObjectId(objectId))
        .thenReturn(List.of(assignment1, assignment2));

    // For each engineer's recalculate call:
    when(userRepository.findById(engineerId1)).thenReturn(Optional.of(engineer1));
    when(userRepository.findById(engineerId2)).thenReturn(Optional.of(engineer2));
    when(objectEngineerRepository.findAllByEngineerId(engineerId1))
        .thenReturn(List.of(assignment1));
    when(objectEngineerRepository.findAllByEngineerId(engineerId2))
        .thenReturn(List.of(assignment2));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(2);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.of(summary));
    when(engineerSummaryRepository.findByEngineerId(engineerId1)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.findByEngineerId(engineerId2)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculateAllForObject(objectId);

    // Both engineer summaries must have been saved
    verify(engineerSummaryRepository, times(2)).save(any(EngineerSummary.class));
  }

  // -------------------------------------------------------------------------
  // deleteByEngineerId tests
  // -------------------------------------------------------------------------

  @Test
  void deleteByEngineerId_delegatesToRepository() {
    UUID engineerId = UUID.randomUUID();
    service.deleteByEngineerId(engineerId);
    verify(engineerSummaryRepository).deleteByEngineerId(engineerId);
  }

  // -------------------------------------------------------------------------
  // Missing summary edge case
  // -------------------------------------------------------------------------

  @Test
  void missingObjectSummary_treatedAsZeroContribution() {
    UUID engineerId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();
    User engineer = buildEngineer(engineerId, new BigDecimal("1.0"));
    ObjectEntity object = buildObject(objectId);
    ObjectEngineer assignment = buildAssignment(object, engineer);

    when(userRepository.findById(engineerId)).thenReturn(Optional.of(engineer));
    when(objectEngineerRepository.findAllByEngineerId(engineerId)).thenReturn(List.of(assignment));
    when(objectEngineerRepository.countByObjectId(objectId)).thenReturn(1);
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.findByEngineerId(engineerId)).thenReturn(Optional.empty());
    when(engineerSummaryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    service.recalculate(engineerId);

    ArgumentCaptor<EngineerSummary> captor = ArgumentCaptor.forClass(EngineerSummary.class);
    verify(engineerSummaryRepository).save(captor.capture());
    EngineerSummary saved = captor.getValue();

    // Object is counted even though it has no summary yet
    assertThat(saved.getObjectCount()).isEqualTo(1);
    // But the load contribution is zero
    assertThat(saved.getTotalLoad().compareTo(BigDecimal.ZERO)).isEqualTo(0);
    assertThat(saved.getStatus()).isEqualTo("normal");
  }
}
