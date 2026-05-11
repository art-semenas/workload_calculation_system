package com.workload.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Summary;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class SummaryRepositoryTest {

  @Autowired private SummaryRepository summaryRepository;
  @Autowired private DivisionRepository divisionRepository;
  @Autowired private BranchRepository branchRepository;
  @Autowired private ObjectRepository objectRepository;
  @Autowired private EntityManager entityManager;

  @Test
  void findByObjectId_returnsSummary() {
    Division division = saveDivision("Div Summary Find");
    Branch branch = saveBranch(division, "Branch Summary Find");
    ObjectEntity obj = saveObject(branch, "Object Summary Find");

    Summary summary =
        Summary.builder()
            .id(UUID.randomUUID())
            .object(obj)
            .itogoChisloWithTravel(BigDecimal.ONE)
            .computedAt(OffsetDateTime.now())
            .build();
    summaryRepository.saveAndFlush(summary);

    assertThat(summaryRepository.findByObjectId(obj.getId()))
        .isPresent()
        .hasValueSatisfying(
            s -> assertThat(s.getItogoChisloWithTravel()).isEqualByComparingTo(BigDecimal.ONE));
  }

  @Test
  void cascadeDeleteWhenObjectDeleted() {
    Division division = saveDivision("Div Summary Cascade");
    Branch branch = saveBranch(division, "Branch Summary Cascade");
    ObjectEntity obj = saveObject(branch, "Object Summary Cascade");

    Summary summary =
        Summary.builder()
            .id(UUID.randomUUID())
            .object(obj)
            .itogoChisloWithTravel(BigDecimal.TEN)
            .computedAt(OffsetDateTime.now())
            .build();
    summaryRepository.saveAndFlush(summary);

    UUID objectId = obj.getId();
    // @OnDelete(CASCADE) is a DB-level FK cascade. Clear the first-level cache first
    // so that no managed entity holds a stale reference to ObjectEntity during flush,
    // then delete via a direct JPQL query to avoid Hibernate's JPA-level cascade walk.
    entityManager.clear();
    objectRepository.deleteById(objectId);
    entityManager.flush();
    entityManager.clear();

    assertThat(summaryRepository.findByObjectId(objectId)).isEmpty();
  }

  @Test
  void uniqueConstraintOnObjectId() {
    Division division = saveDivision("Div Summary Unique");
    Branch branch = saveBranch(division, "Branch Summary Unique");
    ObjectEntity obj = saveObject(branch, "Object Summary Unique");

    Summary first =
        Summary.builder()
            .id(UUID.randomUUID())
            .object(obj)
            .itogoChisloWithTravel(BigDecimal.ONE)
            .computedAt(OffsetDateTime.now())
            .build();
    summaryRepository.saveAndFlush(first);

    Summary second =
        Summary.builder()
            .id(UUID.randomUUID())
            .object(obj)
            .itogoChisloWithTravel(BigDecimal.TWO)
            .computedAt(OffsetDateTime.now())
            .build();

    assertThatThrownBy(() -> summaryRepository.saveAndFlush(second))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  // Test 2b-bis: findUnassignedCountGroupedByDivision uses COUNT(DISTINCT s.object)
  // so each unassigned object is counted exactly once per division.
  @Test
  void findUnassignedCount_countsDistinctObjects_notSummaryRows() {
    Division div = saveDivision("Div Distinct Count");
    Branch br = saveBranch(div, "Branch Distinct Count");
    ObjectEntity obj1 = saveObject(br, "Object Distinct Count 1");
    ObjectEntity obj2 = saveObject(br, "Object Distinct Count 2");

    // Two summaries for two distinct objects — both unassigned (no ObjectEngineer row)
    summaryRepository.saveAndFlush(
        Summary.builder()
            .id(UUID.randomUUID())
            .object(obj1)
            .itogoChisloWithTravel(BigDecimal.ONE)
            .computedAt(OffsetDateTime.now())
            .build());
    summaryRepository.saveAndFlush(
        Summary.builder()
            .id(UUID.randomUUID())
            .object(obj2)
            .itogoChisloWithTravel(BigDecimal.ONE)
            .computedAt(OffsetDateTime.now())
            .build());

    // Act — filter result to just the division created in this test
    List<DivisionCount> result = summaryRepository.findUnassignedCountGroupedByDivision();
    DivisionCount divisionResult =
        result.stream()
            .filter(r -> div.getId().equals(r.getDivisionId()))
            .findFirst()
            .orElseThrow(() -> new AssertionError("No result found for division " + div.getId()));

    // Assert — two distinct objects counted, not zero or some other number
    assertThat(divisionResult.getCount()).isEqualTo(2L);
  }

  private Division saveDivision(String name) {
    Division division =
        Division.builder()
            .id(UUID.randomUUID())
            .name(name)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return divisionRepository.saveAndFlush(division);
  }

  private Branch saveBranch(Division division, String name) {
    Branch branch =
        Branch.builder()
            .id(UUID.randomUUID())
            .division(division)
            .name(name)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return branchRepository.saveAndFlush(branch);
  }

  private ObjectEntity saveObject(Branch branch, String name) {
    ObjectEntity obj =
        ObjectEntity.builder()
            .id(UUID.randomUUID())
            .branch(branch)
            .name(name)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return objectRepository.saveAndFlush(obj);
  }
}
