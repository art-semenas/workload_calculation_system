package com.workload.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.workload.entity.Branch;
import com.workload.entity.Division;
import com.workload.entity.ObjectEntity;
import com.workload.entity.RecordsTask;
import com.workload.entity.Role;
import com.workload.entity.Travel;
import com.workload.entity.User;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class RepositoryConstraintTest {

    @Autowired
    private DivisionRepository divisionRepository;
    @Autowired
    private BranchRepository branchRepository;
    @Autowired
    private ObjectRepository objectRepository;
    @Autowired
    private RecordsTaskRepository recordsTaskRepository;
    @Autowired
    private TravelRepository travelRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private EntityManager entityManager;

    @Test
    void findByNameReturnsSavedDivision() {
        Division division = saveDivision("Brest Division");
        assertThat(divisionRepository.findByName("Brest Division")).isPresent();
    }

    @Test
    void duplicateDivisionNameViolatesUniqueConstraint() {
        saveDivision("Unique Division");

        Division second = Division.builder()
                .id(UUID.randomUUID())
                .name("Unique Division")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        assertThatThrownBy(
                () -> {
                    divisionRepository.saveAndFlush(second);
                    entityManager.flush();
                })
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void findAllByDivisionIdReturnsBranches() {
        Division division = saveDivision("Div for branches");
        saveBranch(division, "Branch A");
        saveBranch(division, "Branch B");

        assertThat(branchRepository.findAllByDivisionId(division.getId())).hasSize(2);
    }

    @Test
    void findAllByBranchDivisionIdReturnsObjects() {
        Division division = saveDivision("Div for objects");
        Branch branch = saveBranch(division, "Branch X");
        saveObject(branch, "Object 1");
        saveObject(branch, "Object 2");

        assertThat(objectRepository.findAllByBranchDivisionId(division.getId())).hasSize(2);
    }

    @Test
    void recordsTaskFindByObjectId() {
        Division division = saveDivision("Div RT");
        Branch branch = saveBranch(division, "Branch RT");
        ObjectEntity obj = saveObject(branch, "Object RT");

        RecordsTask task = RecordsTask.builder()
                .id(UUID.randomUUID())
                .object(obj)
                .accessRequests(0)
                .monitoringRequests(0)
                .footageRequests(0)
                .backupControl(0)
                .securityAdmin(0)
                .updatedAt(OffsetDateTime.now())
                .build();
        recordsTaskRepository.saveAndFlush(task);

        assertThat(recordsTaskRepository.findByObjectId(obj.getId())).isPresent();
    }

    @Test
    void travelFindByObjectId() {
        Division division = saveDivision("Div Travel");
        Branch branch = saveBranch(division, "Branch Travel");
        ObjectEntity obj = saveObject(branch, "Object Travel");

        Travel travel = Travel.builder()
                .id(UUID.randomUUID())
                .object(obj)
                .distanceKm(BigDecimal.TEN)
                .oneWayTimeMin(BigDecimal.valueOf(30))
                .updatedAt(OffsetDateTime.now())
                .build();
        travelRepository.saveAndFlush(travel);

        assertThat(travelRepository.findByObjectId(obj.getId())).isPresent();
    }

    @Test
    void userFindByEmail() {
        assertThat(userRepository.findByEmail("admin@workload.local")).isPresent();
    }

    @Test
    void findAllByRoleAndIsActive() {
        assertThat(userRepository.findAllByRoleAndActive(Role.ADMIN, true)).isNotEmpty();
    }

    private Division saveDivision(String name) {
        Division division = Division.builder()
                .id(UUID.randomUUID())
                .name(name)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
        return divisionRepository.saveAndFlush(division);
    }

    private Branch saveBranch(Division division, String name) {
        Branch branch = Branch.builder()
                .id(UUID.randomUUID())
                .division(division)
                .name(name)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
        return branchRepository.saveAndFlush(branch);
    }

    private ObjectEntity saveObject(Branch branch, String name) {
        ObjectEntity obj = ObjectEntity.builder()
                .id(UUID.randomUUID())
                .branch(branch)
                .name(name)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
        return objectRepository.saveAndFlush(obj);
    }
}
