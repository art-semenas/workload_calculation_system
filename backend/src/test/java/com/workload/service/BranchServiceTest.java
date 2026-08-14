package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.workload.dto.BranchCreateRequest;
import com.workload.dto.BranchDto;
import com.workload.dto.BranchUpdateRequest;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.exception.BranchHasObjectsException;
import com.workload.exception.BranchNotFoundException;
import com.workload.exception.DivisionNotFoundException;
import com.workload.mapper.BranchMapper;
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
class BranchServiceTest {

  @Mock private BranchRepository branchRepository;
  @Mock private DivisionRepository divisionRepository;
  @Mock private ObjectRepository objectRepository;
  @Mock private BranchMapper branchMapper;

  @InjectMocks private BranchService branchService;

  private final UUID divisionId = UUID.randomUUID();
  private final Division division =
      Division.builder()
          .id(divisionId)
          .name("Brest")
          .createdAt(OffsetDateTime.now())
          .updatedAt(OffsetDateTime.now())
          .build();

  @Test
  void findByDivisionReturnsBranchDtos() {
    Branch branch =
        Branch.builder()
            .id(UUID.randomUUID())
            .division(division)
            .name("Branch1")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    when(divisionRepository.findById(divisionId)).thenReturn(Optional.of(division));
    when(branchRepository.findAllByDivisionId(divisionId)).thenReturn(List.of(branch));
    when(objectRepository.countByBranchId(branch.getId())).thenReturn(3L);
    BranchDto dto =
        new BranchDto(
            branch.getId(),
            divisionId,
            "Branch1",
            3L,
            branch.getCreatedAt(),
            branch.getUpdatedAt());
    when(branchMapper.toDto(branch, 3L)).thenReturn(dto);

    List<BranchDto> result = branchService.findByDivision(divisionId);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).objectCount()).isEqualTo(3L);
  }

  @Test
  void findByDivisionThrowsWhenDivisionMissing() {
    UUID unknownId = UUID.randomUUID();
    when(divisionRepository.findById(unknownId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> branchService.findByDivision(unknownId))
        .isInstanceOf(DivisionNotFoundException.class);
  }

  @Test
  void findByIdThrowsWhenMissing() {
    UUID id = UUID.randomUUID();
    when(branchRepository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> branchService.findById(id))
        .isInstanceOf(BranchNotFoundException.class);
  }

  @Test
  void createBranchRejectsUnknownDivision() {
    UUID unknownId = UUID.randomUUID();
    when(divisionRepository.findById(unknownId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> branchService.create(unknownId, new BranchCreateRequest("X")))
        .isInstanceOf(DivisionNotFoundException.class);
  }

  @Test
  void createBranchSavesSuccessfully() {
    when(divisionRepository.findById(divisionId)).thenReturn(Optional.of(division));
    when(branchRepository.save(any(Branch.class))).thenAnswer(inv -> inv.getArgument(0));
    when(objectRepository.countByBranchId(any())).thenReturn(0L);
    when(branchMapper.toDto(any(Branch.class), eq(0L)))
        .thenAnswer(
            inv -> {
              Branch b = inv.getArgument(0);
              return new BranchDto(
                  b.getId(), divisionId, b.getName(), 0L, b.getCreatedAt(), b.getUpdatedAt());
            });

    BranchDto result = branchService.create(divisionId, new BranchCreateRequest("New Branch"));

    assertThat(result.name()).isEqualTo("New Branch");
    verify(branchRepository).save(any(Branch.class));
  }

  @Test
  void updateRenamesBranch() {
    Branch branch =
        Branch.builder()
            .id(UUID.randomUUID())
            .division(division)
            .name("OldName")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    when(branchRepository.findById(branch.getId())).thenReturn(Optional.of(branch));
    when(branchRepository.save(any(Branch.class))).thenAnswer(inv -> inv.getArgument(0));
    when(objectRepository.countByBranchId(branch.getId())).thenReturn(0L);
    when(branchMapper.toDto(any(Branch.class), eq(0L)))
        .thenAnswer(
            inv -> {
              Branch b = inv.getArgument(0);
              return new BranchDto(
                  b.getId(), divisionId, b.getName(), 0L, b.getCreatedAt(), b.getUpdatedAt());
            });

    BranchDto result = branchService.update(branch.getId(), new BranchUpdateRequest("NewName"));

    assertThat(result.name()).isEqualTo("NewName");
  }

  @Test
  void deleteRemovesEmptyBranch() {
    UUID id = UUID.randomUUID();
    when(branchRepository.existsById(id)).thenReturn(true);
    when(objectRepository.countByBranchId(id)).thenReturn(0L);

    branchService.delete(id);

    verify(branchRepository).deleteById(id);
  }

  @Test
  void deleteThrowsWhenBranchMissing() {
    UUID id = UUID.randomUUID();
    when(branchRepository.existsById(id)).thenReturn(false);

    assertThatThrownBy(() -> branchService.delete(id)).isInstanceOf(BranchNotFoundException.class);
  }

  @Test
  void deleteBlockedWhenBranchHasObjects() {
    UUID id = UUID.randomUUID();
    when(branchRepository.existsById(id)).thenReturn(true);
    when(objectRepository.countByBranchId(id)).thenReturn(4L);

    assertThatThrownBy(() -> branchService.delete(id))
        .isInstanceOf(BranchHasObjectsException.class)
        .hasMessage("Cannot delete: branch has 4 objects");
    verify(branchRepository, never()).deleteById(id);
  }
}
