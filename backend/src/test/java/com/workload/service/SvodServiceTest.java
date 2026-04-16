package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.workload.dto.SvodRowDto;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Summary;
import com.workload.exception.ObjectNotFoundException;
import com.workload.mapper.SummaryMapper;
import com.workload.repository.SummaryRepository;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class SvodServiceTest {

  @Mock private SummaryRepository summaryRepository;
  @Mock private SummaryMapper summaryMapper;

  @InjectMocks private SvodService svodService;

  private Summary buildSummary(
      UUID objectId, String objectName, String divisionName, String branchName) {
    Division division =
        Division.builder()
            .id(UUID.randomUUID())
            .name(divisionName)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    Branch branch =
        Branch.builder()
            .id(UUID.randomUUID())
            .division(division)
            .name(branchName)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    ObjectEntity object =
        ObjectEntity.builder()
            .id(objectId)
            .branch(branch)
            .name(objectName)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return Summary.builder()
        .id(UUID.randomUUID())
        .object(object)
        .osMonthlyAvg(new BigDecimal("1.0"))
        .psMonthlyAvg(new BigDecimal("2.0"))
        .videoMonthlyAvg(new BigDecimal("3.0"))
        .recordsMonthly(BigDecimal.ZERO)
        .repairNoTravelMonthly(BigDecimal.ZERO)
        .repairWithTravelMonthly(BigDecimal.ZERO)
        .roundTripMin(BigDecimal.ZERO)
        .pzvMinutes(BigDecimal.ZERO)
        .totalNoTravelMin(BigDecimal.ZERO)
        .itogoChisloNoTravel(BigDecimal.ZERO)
        .totalWithTravelMin(BigDecimal.ZERO)
        .itogoChisloWithTravel(new BigDecimal("0.05"))
        .r1PerVisitTotal(BigDecimal.ZERO)
        .r2PerVisitTotal(BigDecimal.ZERO)
        .computedAt(OffsetDateTime.now())
        .build();
  }

  @Test
  void getSvod_returnsPaginatedResults() {
    UUID objectId = UUID.randomUUID();
    Summary summary = buildSummary(objectId, "Object A", "Division 1", "Branch 1");
    when(summaryRepository.findAllWithOrgHierarchy()).thenReturn(List.of(summary));

    Pageable pageable = PageRequest.of(0, 100);
    Page<SvodRowDto> result = svodService.getSvod(pageable, null);

    assertThat(result.getTotalElements()).isEqualTo(1);
    assertThat(result.getContent()).hasSize(1);
    SvodRowDto row = result.getContent().get(0);
    assertThat(row.objectId()).isEqualTo(objectId);
    assertThat(row.objectName()).isEqualTo("Object A");
    assertThat(row.divisionName()).isEqualTo("Division 1");
    assertThat(row.branchName()).isEqualTo("Branch 1");
  }

  @Test
  void getSvod_filtersByDivision() {
    UUID divisionId = UUID.randomUUID();
    UUID objectId = UUID.randomUUID();
    Summary summary = buildSummary(objectId, "Object B", "Division 2", "Branch 2");
    when(summaryRepository.findAllByDivisionIdWithOrgHierarchy(divisionId))
        .thenReturn(List.of(summary));

    Pageable pageable = PageRequest.of(0, 100);
    Page<SvodRowDto> result = svodService.getSvod(pageable, divisionId);

    assertThat(result.getTotalElements()).isEqualTo(1);
    assertThat(result.getContent().get(0).objectId()).isEqualTo(objectId);
  }

  @Test
  void getObjectSummary_notFound_throws() {
    UUID objectId = UUID.randomUUID();
    when(summaryRepository.findByObjectId(objectId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> svodService.getObjectSummary(objectId))
        .isInstanceOf(ObjectNotFoundException.class);
  }
}
