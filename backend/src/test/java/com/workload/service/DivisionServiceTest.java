package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.workload.dto.DivisionCreateRequest;
import com.workload.dto.DivisionDto;
import com.workload.dto.DivisionUpdateRequest;
import com.workload.entity.Division;
import com.workload.exception.DivisionNotFoundException;
import com.workload.mapper.DivisionMapper;
import com.workload.repository.BranchRepository;
import com.workload.repository.DivisionRepository;
import com.workload.repository.ObjectRepository;
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
    when(branchRepository.countByDivisionId(div.getId())).thenReturn(2L);
    when(objectRepository.countByBranchDivisionId(div.getId())).thenReturn(5L);
    DivisionDto dto =
        new DivisionDto(div.getId(), "Brest", 2L, 5L, div.getCreatedAt(), div.getUpdatedAt());
    when(divisionMapper.toDto(div, 2L, 5L)).thenReturn(dto);

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
    DivisionDto dto =
        new DivisionDto(div.getId(), "Brest", 1L, 3L, div.getCreatedAt(), div.getUpdatedAt());
    when(divisionMapper.toDto(div, 1L, 3L)).thenReturn(dto);

    DivisionDto result = divisionService.findById(div.getId());

    assertThat(result.name()).isEqualTo("Brest");
  }

  @Test
  void createSavesNewDivision() {
    DivisionCreateRequest request = new DivisionCreateRequest("Minsk");
    when(divisionRepository.save(any(Division.class))).thenAnswer(inv -> inv.getArgument(0));
    when(branchRepository.countByDivisionId(any())).thenReturn(0L);
    when(objectRepository.countByBranchDivisionId(any())).thenReturn(0L);
    when(divisionMapper.toDto(any(Division.class), eq(0L), eq(0L)))
        .thenAnswer(
            inv -> {
              Division d = inv.getArgument(0);
              return new DivisionDto(
                  d.getId(), d.getName(), 0L, 0L, d.getCreatedAt(), d.getUpdatedAt());
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
    when(divisionMapper.toDto(any(Division.class), eq(0L), eq(0L)))
        .thenAnswer(
            inv -> {
              Division d = inv.getArgument(0);
              return new DivisionDto(
                  d.getId(), d.getName(), 0L, 0L, d.getCreatedAt(), d.getUpdatedAt());
            });

    DivisionDto result = divisionService.update(div.getId(), new DivisionUpdateRequest("NewName"));

    assertThat(result.name()).isEqualTo("NewName");
  }
}
