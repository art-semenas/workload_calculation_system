package com.workload.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.workload.dto.ObjectCreateRequest;
import com.workload.dto.ObjectDto;
import com.workload.dto.ObjectUpdateRequest;
import com.workload.dto.SummaryDto;
import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Summary;
import com.workload.exception.BranchNotFoundException;
import com.workload.exception.ObjectNotFoundException;
import com.workload.exception.SummaryNotFoundException;
import com.workload.mapper.ObjectMapper;
import com.workload.mapper.SummaryMapper;
import com.workload.repository.BranchRepository;
import com.workload.repository.ObjectEngineerRepository;
import com.workload.repository.ObjectRepository;
import com.workload.repository.SummaryRepository;
import jakarta.persistence.EntityManager;
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
class ObjectServiceTest {

  @Mock private ObjectRepository objectRepository;
  @Mock private BranchRepository branchRepository;
  @Mock private ObjectMapper objectMapper;
  @Mock private SummaryRepository summaryRepository;
  @Mock private SummaryMapper summaryMapper;
  @Mock private ObjectEngineerRepository objectEngineerRepository;
  @Mock private EngineerSummaryService engineerSummaryService;
  @Mock private EntityManager entityManager;

  @InjectMocks private ObjectService objectService;

  private final UUID divisionId = UUID.randomUUID();
  private final Division division =
      Division.builder()
          .id(divisionId)
          .name("Brest")
          .createdAt(OffsetDateTime.now())
          .updatedAt(OffsetDateTime.now())
          .build();
  private final UUID branchId = UUID.randomUUID();
  private final Branch branch =
      Branch.builder()
          .id(branchId)
          .division(division)
          .name("Branch1")
          .createdAt(OffsetDateTime.now())
          .updatedAt(OffsetDateTime.now())
          .build();

  @Test
  void findAllReturnsAllObjects() {
    ObjectEntity entity = buildObject("Archive");
    when(objectRepository.findAll()).thenReturn(List.of(entity));
    ObjectDto dto =
        new ObjectDto(
            entity.getId(),
            branchId,
            divisionId,
            "Archive",
            null,
            entity.getCreatedAt(),
            entity.getUpdatedAt());
    when(objectMapper.toDto(entity)).thenReturn(dto);

    List<ObjectDto> result = objectService.findAll(Optional.empty());

    assertThat(result).hasSize(1);
  }

  @Test
  void findAllFiltersByDivision() {
    ObjectEntity entity = buildObject("Archive");
    when(objectRepository.findAllByBranchDivisionId(divisionId)).thenReturn(List.of(entity));
    ObjectDto dto =
        new ObjectDto(
            entity.getId(),
            branchId,
            divisionId,
            "Archive",
            null,
            entity.getCreatedAt(),
            entity.getUpdatedAt());
    when(objectMapper.toDto(entity)).thenReturn(dto);

    List<ObjectDto> result = objectService.findAll(Optional.of(divisionId));

    assertThat(result).hasSize(1);
  }

  @Test
  void findByIdThrowsWhenMissing() {
    UUID id = UUID.randomUUID();
    when(objectRepository.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> objectService.findById(id))
        .isInstanceOf(ObjectNotFoundException.class);
  }

  @Test
  void createRejectsUnknownBranch() {
    UUID unknownBranchId = UUID.randomUUID();
    when(branchRepository.findById(unknownBranchId)).thenReturn(Optional.empty());

    assertThatThrownBy(
            () -> objectService.create(new ObjectCreateRequest(unknownBranchId, "X", null)))
        .isInstanceOf(BranchNotFoundException.class);
  }

  @Test
  void createSavesObject() {
    when(branchRepository.findById(branchId)).thenReturn(Optional.of(branch));
    when(objectRepository.save(any(ObjectEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    when(objectMapper.toDto(any(ObjectEntity.class)))
        .thenAnswer(
            inv -> {
              ObjectEntity e = inv.getArgument(0);
              return new ObjectDto(
                  e.getId(),
                  branchId,
                  divisionId,
                  e.getName(),
                  e.getImportSeqNo(),
                  e.getCreatedAt(),
                  e.getUpdatedAt());
            });

    ObjectDto result = objectService.create(new ObjectCreateRequest(branchId, "NewObj", 42));

    assertThat(result.name()).isEqualTo("NewObj");
    assertThat(result.importSeqNo()).isEqualTo(42);
    verify(objectRepository).save(any(ObjectEntity.class));
  }

  @Test
  void updateReplacesMetadata() {
    ObjectEntity entity = buildObject("OldName");
    when(objectRepository.findById(entity.getId())).thenReturn(Optional.of(entity));
    when(objectRepository.save(any(ObjectEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    when(objectMapper.toDto(any(ObjectEntity.class)))
        .thenAnswer(
            inv -> {
              ObjectEntity e = inv.getArgument(0);
              return new ObjectDto(
                  e.getId(),
                  branchId,
                  divisionId,
                  e.getName(),
                  e.getImportSeqNo(),
                  e.getCreatedAt(),
                  e.getUpdatedAt());
            });

    ObjectDto result =
        objectService.update(entity.getId(), new ObjectUpdateRequest("NewName", 99, null));

    assertThat(result.name()).isEqualTo("NewName");
    assertThat(result.importSeqNo()).isEqualTo(99);
  }

  @Test
  void updateMovesObjectToNewBranch() {
    UUID newBranchId = UUID.randomUUID();
    Branch newBranch =
        Branch.builder()
            .id(newBranchId)
            .division(division)
            .name("NewBranch")
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    ObjectEntity entity = buildObject("OldName");
    when(objectRepository.findById(entity.getId())).thenReturn(Optional.of(entity));
    when(branchRepository.findById(newBranchId)).thenReturn(Optional.of(newBranch));
    when(objectRepository.save(any(ObjectEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    when(objectMapper.toDto(any(ObjectEntity.class)))
        .thenAnswer(
            inv -> {
              ObjectEntity e = inv.getArgument(0);
              return new ObjectDto(
                  e.getId(),
                  e.getBranch().getId(),
                  divisionId,
                  e.getName(),
                  e.getImportSeqNo(),
                  e.getCreatedAt(),
                  e.getUpdatedAt());
            });

    ObjectDto result =
        objectService.update(entity.getId(), new ObjectUpdateRequest("OldName", null, newBranchId));

    assertThat(result.branchId()).isEqualTo(newBranchId);
    verify(branchRepository).findById(newBranchId);
    verify(objectRepository).save(any(ObjectEntity.class));
  }

  @Test
  void updateThrowsWhenNewBranchNotFound() {
    UUID missingBranchId = UUID.randomUUID();
    ObjectEntity entity = buildObject("OldName");
    when(objectRepository.findById(entity.getId())).thenReturn(Optional.of(entity));
    when(branchRepository.findById(missingBranchId)).thenReturn(Optional.empty());

    assertThatThrownBy(
            () ->
                objectService.update(
                    entity.getId(), new ObjectUpdateRequest("OldName", null, missingBranchId)))
        .isInstanceOf(BranchNotFoundException.class);
  }

  @Test
  void deleteDeletesObject() {
    UUID id = UUID.randomUUID();
    when(objectRepository.existsById(id)).thenReturn(true);
    when(objectEngineerRepository.findEngineerIdsByObjectId(any())).thenReturn(List.of());

    objectService.delete(id);

    verify(objectRepository).deleteById(id);
    verify(objectEngineerRepository).findEngineerIdsByObjectId(id);
  }

  @Test
  void deleteThrowsWhenMissing() {
    UUID id = UUID.randomUUID();
    when(objectRepository.existsById(id)).thenReturn(false);

    assertThatThrownBy(() -> objectService.delete(id)).isInstanceOf(ObjectNotFoundException.class);
  }

  @Test
  void getSummaryThrowsWhenObjectMissing() {
    UUID id = UUID.randomUUID();
    when(objectRepository.existsById(id)).thenReturn(false);

    assertThatThrownBy(() -> objectService.getSummary(id))
        .isInstanceOf(ObjectNotFoundException.class);
  }

  @Test
  void getSummaryThrowsWhenNoSummaryRow() {
    UUID id = UUID.randomUUID();
    when(objectRepository.existsById(id)).thenReturn(true);
    when(summaryRepository.findByObjectId(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> objectService.getSummary(id))
        .isInstanceOf(SummaryNotFoundException.class);
  }

  @Test
  void getSummaryReturnsDtoWhenExists() {
    ObjectEntity obj = buildObject("Archive");
    Summary summary = Summary.builder().id(UUID.randomUUID()).object(obj).build();
    SummaryDto dto =
        new SummaryDto(
            summary.getId(),
            obj.getId(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null);
    when(objectRepository.existsById(obj.getId())).thenReturn(true);
    when(summaryRepository.findByObjectId(obj.getId())).thenReturn(Optional.of(summary));
    when(summaryMapper.toDto(summary)).thenReturn(dto);

    SummaryDto result = objectService.getSummary(obj.getId());

    assertThat(result.objectId()).isEqualTo(obj.getId());
  }

  private ObjectEntity buildObject(String name) {
    return ObjectEntity.builder()
        .id(UUID.randomUUID())
        .branch(branch)
        .name(name)
        .createdAt(OffsetDateTime.now())
        .updatedAt(OffsetDateTime.now())
        .build();
  }
}
