package com.workload.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "records_tasks",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_rt_object",
            columnNames = {"object_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordsTask {

  @Id private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "object_id", nullable = false)
  private ObjectEntity object;

  @Column(name = "access_requests", nullable = false)
  private Integer accessRequests;

  @Column(name = "monitoring_requests", nullable = false)
  private Integer monitoringRequests;

  @Column(name = "footage_requests", nullable = false)
  private Integer footageRequests;

  @Column(name = "backup_control", nullable = false)
  private Integer backupControl;

  @Column(name = "security_admin", nullable = false)
  private Integer securityAdmin;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
