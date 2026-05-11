package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.workload.dto.DivisionCreateRequest;
import com.workload.dto.DivisionDto;
import com.workload.dto.DivisionUpdateRequest;
import com.workload.entity.Division;
import com.workload.exception.DivisionNotFoundException;
import com.workload.mapper.DivisionMapper;
import com.workload.repository.BranchRepository;
import com.workload.repository.DivisionCount;
import com.workload.repository.DivisionRepository;
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

@ExtendWith(MockitoExtension.class)
class DivisionServiceTest {

  @Mock private DivisionRepository divisionRepository;
  @Mock private BranchRepository branchRepository;
  @Mock private ObjectRepository objectRepository;
  @Mock private DivisionMapper divisionMapper;
  @Mock private SummaryRepository summaryRepository;
  @Mock private UserRepository userRepository;

  @InjectMocks private DivisionService divisionService;

  @Test
  void findAllReturnsMappedDtosWithCounts() {
    Division div =
        Division.builder()
            .id(UUID.randomUUID())
            .name("Brest")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    when(divisionRepository.findAll()).thenReturn(List.of(div));

    DivisionCount branchRow = mockCount(div.getId(), 2L);
    when(branchRepository.findCountsGroupedByDivisionId()).thenReturn(List.of(branchRow));

    DivisionCount objectRow = mockCount(div.getId(), 5L);
    when(objectRepository.findCountsGroupedByDivisionId()).thenReturn(List.of(objectRow));

    when(userRepository.findActiveCountsGroupedByDivisionId()).thenReturn(List.of());
    when(summaryRepository.findRequiredFteGroupedByDivision()).thenReturn(List.of());
    when(summaryRepository.findUnassignedCountGroupedByDivision()).thenReturn(List.of());

    DivisionDto dto =
        new DivisionDto(
            div.getId(),
            "Brest",
            2L,
            5L,
            div.getCreatedAt(),
            div.getUpdatedAt(),
            0L,
            BigDecimal.ZERO,
            0L,
            null);
    when(divisionMapper.toDto(div, 2L, 5L, 0L, BigDecimal.ZERO, 0L, null)).thenReturn(dto);

    List<DivisionDto> result = divisionService.findAll();

    assertThat(result).hasSize(1);
    assertThat(result.get(0).branchCount()).isEqualTo(2L);
    assertThat(result.get(0).objectCount()).isEqualTo(5L);
  }

  @Test
  void findByIdThrowsWhenMissing() {
    UUID id = UUID.randomUUID();
    when(divisionRepository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> divisionService.findById(id))
        .isInstanceOf(DivisionNotFoundException.class);
  }

  @Test
  void findByIdReturnsMappedDto() {
    Division div =
        Division.builder()
            .id(UUID.randomUUID())
            .name("Brest")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    when(divisionRepository.findById(div.getId())).thenReturn(Optional.of(div));
    when(branchRepository.countByDivisionId(div.getId())).thenReturn(1L);
    when(objectRepository.countByBranchDivisionId(div.getId())).thenReturn(3L);
    when(userRepository.countByHomeDivisionIdAndActiveTrue(div.getId())).thenReturn(0L);
    when(summaryRepository.findRequiredFteByDivisionId(div.getId())).thenReturn(BigDecimal.ZERO);
    when(summaryRepository.findUnassignedCountByDivisionId(div.getId())).thenReturn(0L);
    DivisionDto dto =
        new DivisionDto(
            div.getId(),
            "Brest",
            1L,
            3L,
            div.getCreatedAt(),
            div.getUpdatedAt(),
            0L,
            BigDecimal.ZERO,
            0L,
            null);
    when(divisionMapper.toDto(div, 1L, 3L, 0L, BigDecimal.ZERO, 0L, null)).thenReturn(dto);

    DivisionDto result = divisionService.findById(div.getId());

    assertThat(result.name()).isEqualTo("Brest");
  }

  @Test
  void createSavesNewDivision() {
    DivisionCreateRequest request = new DivisionCreateRequest("Minsk");
    when(divisionRepository.save(any(Division.class))).thenAnswer(inv -> inv.getArgument(0));
    when(branchRepository.countByDivisionId(any())).thenReturn(0L);
    when(objectRepository.countByBranchDivisionId(any())).thenReturn(0L);
    when(userRepository.countByHomeDivisionIdAndActiveTrue(any())).thenReturn(0L);
    when(summaryRepository.findRequiredFteByDivisionId(any())).thenReturn(BigDecimal.ZERO);
    when(summaryRepository.findUnassignedCountByDivisionId(any())).thenReturn(0L);
    when(divisionMapper.toDto(any(Division.class), eq(0L), eq(0L), eq(0L), any(), eq(0L), any()))
        .thenAnswer(
            inv -> {
              Division d = inv.getArgument(0);
              return new DivisionDto(
                  d.getId(),
                  d.getName(),
                  0L,
                  0L,
                  d.getCreatedAt(),
                  d.getUpdatedAt(),
                  0L,
                  BigDecimal.ZERO,
                  0L,
                  null);
            });

    DivisionDto result = divisionService.create(request);

    assertThat(result.name()).isEqualTo("Minsk");
    verify(divisionRepository).save(any(Division.class));
  }

  @Test
  void updateRenamesDivision() {
    Division div =
        Division.builder()
            .id(UUID.randomUUID())
            .name("OldName")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    when(divisionRepository.findById(div.getId())).thenReturn(Optional.of(div));
    when(divisionRepository.save(any(Division.class))).thenAnswer(inv -> inv.getArgument(0));
    when(branchRepository.countByDivisionId(div.getId())).thenReturn(0L);
    when(objectRepository.countByBranchDivisionId(div.getId())).thenReturn(0L);
    when(userRepository.countByHomeDivisionIdAndActiveTrue(div.getId())).thenReturn(0L);
    when(summaryRepository.findRequiredFteByDivisionId(div.getId())).thenReturn(BigDecimal.ZERO);
    when(summaryRepository.findUnassignedCountByDivisionId(div.getId())).thenReturn(0L);
    when(divisionMapper.toDto(any(Division.class), eq(0L), eq(0L), eq(0L), any(), eq(0L), any()))
        .thenAnswer(
            inv -> {
              Division d = inv.getArgument(0);
              return new DivisionDto(
                  d.getId(),
                  d.getName(),
                  0L,
                  0L,
                  d.getCreatedAt(),
                  d.getUpdatedAt(),
                  0L,
                  BigDecimal.ZERO,
                  0L,
                  null);
            });

    DivisionDto result = divisionService.update(div.getId(), new DivisionUpdateRequest("NewName"));

    assertThat(result.name()).isEqualTo("NewName");
  }

  @Test
  void findAllIncludesMetricsFields() {
    UUID divId = UUID.randomUUID();
    Division div =
        Division.builder()
            .id(divId)
            .name("Brest")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    when(divisionRepository.findAll()).thenReturn(List.of(div));

    DivisionCount branchRow = mockCount(divId, 1L);
    when(branchRepository.findCountsGroupedByDivisionId()).thenReturn(List.of(branchRow));

    DivisionCount objectRow = mockCount(divId, 5L);
    when(objectRepository.findCountsGroupedByDivisionId()).thenReturn(List.of(objectRow));

    DivisionCount engineerRow = mockCount(divId, 1L);
    when(userRepository.findActiveCountsGroupedByDivisionId()).thenReturn(List.of(engineerRow));

    when(summaryRepository.findRequiredFteGroupedByDivision()).thenReturn(List.of());
    when(summaryRepository.findUnassignedCountGroupedByDivision()).thenReturn(List.of());

    DivisionDto dto =
        new DivisionDto(
            divId,
            "Brest",
            1L,
            5L,
            div.getCreatedAt(),
            div.getUpdatedAt(),
            1L,
            BigDecimal.ZERO,
            0L,
            null);
    when(divisionMapper.toDto(
            eq(div), eq(1L), eq(5L), eq(1L), any(BigDecimal.class), eq(0L), any()))
        .thenReturn(dto);

    List<DivisionDto> result = divisionService.findAll();

    assertThat(result).hasSize(1);
    assertThat(result.get(0).engineerCount()).isEqualTo(1L);
    assertThat(result.get(0).requiredFte()).isNotNull();
    assertThat(result.get(0).coverageGap()).isEqualTo(0L);
  }

  @Test
  void findByIdCoverageGapUsesRepositoryQuery() {
    UUID divId = UUID.randomUUID();
    Division div =
        Division.builder()
            .id(divId)
            .name("Test")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    when(divisionRepository.findById(divId)).thenReturn(Optional.of(div));
    when(branchRepository.countByDivisionId(divId)).thenReturn(1L);
    when(objectRepository.countByBranchDivisionId(divId)).thenReturn(3L);
    when(userRepository.countByHomeDivisionIdAndActiveTrue(divId)).thenReturn(2L);
    when(summaryRepository.findRequiredFteByDivisionId(divId)).thenReturn(BigDecimal.valueOf(1.5));
    when(summaryRepository.findUnassignedCountByDivisionId(divId)).thenReturn(2L);

    DivisionDto dto =
        new DivisionDto(
            divId,
            "Test",
            1L,
            3L,
            div.getCreatedAt(),
            div.getUpdatedAt(),
            2L,
            BigDecimal.valueOf(1.5),
            2L,
            null);
    when(divisionMapper.toDto(div, 1L, 3L, 2L, BigDecimal.valueOf(1.5), 2L, null)).thenReturn(dto);

    DivisionDto result = divisionService.findById(divId);

    assertThat(result.coverageGap()).isEqualTo(2L);
    assertThat(result.requiredFte()).isEqualByComparingTo(BigDecimal.valueOf(1.5));
  }

  private static DivisionCount mockCount(UUID divisionId, long count) {
    DivisionCount row = mock(DivisionCount.class);
    when(row.getDivisionId()).thenReturn(divisionId);
    when(row.getCount()).thenReturn(count);
    return row;
  }
}
