package com.workload.entity;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class EntityStructureTest {

  @Autowired private EntityManager entityManager;

  @Test
  void managedEntitiesAreRegistered() {
    assertThat(entityManager.getMetamodel().entity(Division.class).getName()).isEqualTo("Division");
    assertThat(entityManager.getMetamodel().entity(Branch.class).getName()).isEqualTo("Branch");
    assertThat(entityManager.getMetamodel().entity(ObjectEntity.class).getName())
        .isEqualTo("ObjectEntity");
    assertThat(entityManager.getMetamodel().entity(DeviceType.class).getName())
        .isEqualTo("DeviceType");
    assertThat(entityManager.getMetamodel().entity(DeviceSystemContext.class).getName())
        .isEqualTo("DeviceSystemContext");
    assertThat(entityManager.getMetamodel().entity(ObjectDevice.class).getName())
        .isEqualTo("ObjectDevice");
    assertThat(entityManager.getMetamodel().entity(ObjectSystemAssignment.class).getName())
        .isEqualTo("ObjectSystemAssignment");
    assertThat(entityManager.getMetamodel().entity(RepairType.class).getName())
        .isEqualTo("RepairType");
    assertThat(entityManager.getMetamodel().entity(ObjectRepair.class).getName())
        .isEqualTo("ObjectRepair");
    assertThat(entityManager.getMetamodel().entity(RecordsTask.class).getName())
        .isEqualTo("RecordsTask");
    assertThat(entityManager.getMetamodel().entity(Travel.class).getName()).isEqualTo("Travel");
    assertThat(entityManager.getMetamodel().entity(User.class).getName()).isEqualTo("User");
  }
}
