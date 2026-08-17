package com.workload.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEngineer;
import com.workload.entity.ObjectEntity;
import com.workload.entity.Role;
import com.workload.entity.User;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
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
class ObjectEngineerRepositoryTest {

  @Autowired private ObjectEngineerRepository objectEngineerRepository;
  @Autowired private DivisionRepository divisionRepository;
  @Autowired private BranchRepository branchRepository;
  @Autowired private ObjectRepository objectRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private EntityManager entityManager;

  @Test
  void findAllByObjectId_returnsAssignments() {
    Division division = saveDivision("Div OE FindByObj");
    Branch branch = saveBranch(division, "Branch OE FindByObj");
    ObjectEntity obj = saveObject(branch, "Object OE FindByObj");
    User engineer1 = saveEngineer("eng1-findbyobj@test.com", "Engineer One FindByObj");
    User engineer2 = saveEngineer("eng2-findbyobj@test.com", "Engineer Two FindByObj");

    saveAssignment(obj, engineer1);
    saveAssignment(obj, engineer2);

    assertThat(objectEngineerRepository.findAllByObjectId(obj.getId())).hasSize(2);
  }

  @Test
  void findAllByEngineerId_returnsAssignments() {
    Division division = saveDivision("Div OE FindByEng");
    Branch branch = saveBranch(division, "Branch OE FindByEng");
    ObjectEntity obj1 = saveObject(branch, "Object OE FindByEng 1");
    ObjectEntity obj2 = saveObject(branch, "Object OE FindByEng 2");
    User engineer = saveEngineer("eng-findbyeng@test.com", "Engineer FindByEng");

    saveAssignment(obj1, engineer);
    saveAssignment(obj2, engineer);

    assertThat(objectEngineerRepository.findAllByEngineerId(engineer.getId())).hasSize(2);
  }

  @Test
  void countByObjectId_returnsCorrectCount() {
    Division division = saveDivision("Div OE Count");
    Branch branch = saveBranch(division, "Branch OE Count");
    ObjectEntity obj = saveObject(branch, "Object OE Count");
    User engineer1 = saveEngineer("eng1-count@test.com", "Engineer One Count");
    User engineer2 = saveEngineer("eng2-count@test.com", "Engineer Two Count");
    User engineer3 = saveEngineer("eng3-count@test.com", "Engineer Three Count");

    saveAssignment(obj, engineer1);
    saveAssignment(obj, engineer2);
    saveAssignment(obj, engineer3);

    assertThat(objectEngineerRepository.countByObjectId(obj.getId())).isEqualTo(3);
  }

  @Test
  void uniqueConstraint_sameObjectAndEngineer() {
    Division division = saveDivision("Div OE Unique");
    Branch branch = saveBranch(division, "Branch OE Unique");
    ObjectEntity obj = saveObject(branch, "Object OE Unique");
    User engineer = saveEngineer("eng-unique@test.com", "Engineer Unique");

    saveAssignment(obj, engineer);

    ObjectEngineer duplicate =
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .object(obj)
            .engineer(engineer)
            .assignedAt(OffsetDateTime.now())
            .build();

    assertThatThrownBy(() -> objectEngineerRepository.saveAndFlush(duplicate))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void cascadeDeleteFromObject() {
    Division division = saveDivision("Div OE Cascade");
    Branch branch = saveBranch(division, "Branch OE Cascade");
    ObjectEntity obj = saveObject(branch, "Object OE Cascade");
    User engineer = saveEngineer("eng-cascade@test.com", "Engineer Cascade");

    saveAssignment(obj, engineer);
    UUID objectId = obj.getId();

    entityManager.clear();
    objectRepository.deleteById(objectId);
    entityManager.flush();
    entityManager.clear();

    assertThat(objectEngineerRepository.findAllByObjectId(objectId)).isEmpty();
  }

  @Test
  void restrictDeleteForEngineer() {
    Division division = saveDivision("Div OE Restrict");
    Branch branch = saveBranch(division, "Branch OE Restrict");
    ObjectEntity obj = saveObject(branch, "Object OE Restrict");
    User engineer = saveEngineer("eng-restrict@test.com", "Engineer Restrict");

    saveAssignment(obj, engineer);
    UUID engineerId = engineer.getId();

    entityManager.clear();

    // DB-level ON DELETE RESTRICT fires when the DELETE statement is issued.
    // Spring Data's exception translation wraps it as DataIntegrityViolationException
    // when the statement executes, but Hibernate may surface its own
    // ConstraintViolationException before Spring can wrap it. Accept both.
    assertThatThrownBy(
            () -> {
              userRepository.deleteById(engineerId);
              entityManager.flush();
            })
        .isInstanceOfAny(
            DataIntegrityViolationException.class,
            org.hibernate.exception.ConstraintViolationException.class);
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

  private User saveEngineer(String email, String name) {
    User engineer =
        User.builder()
            .id(UUID.randomUUID())
            .email(email)
            .name(name)
            .passwordHash("hash")
            .role(Role.ENGINEER)
            .engineer(true)
            .capacityFte(new BigDecimal("1.00"))
            .active(true)
            .requiresActivation(false)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
    return userRepository.saveAndFlush(engineer);
  }

  private ObjectEngineer saveAssignment(ObjectEntity object, User engineer) {
    ObjectEngineer assignment =
        ObjectEngineer.builder()
            .id(UUID.randomUUID())
            .object(object)
            .engineer(engineer)
            .assignedAt(OffsetDateTime.now())
            .build();
    return objectEngineerRepository.saveAndFlush(assignment);
  }
}
