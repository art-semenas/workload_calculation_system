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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(
    name = "object_engineers",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uq_oe_object_engineer",
            columnNames = {"object_id", "engineer_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObjectEngineer {

  @Id private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "object_id", nullable = false)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private ObjectEntity object;

  @ManyToOne(optional = false)
  @JoinColumn(name = "engineer_id", nullable = false)
  @OnDelete(action = OnDeleteAction.RESTRICT)
  private User engineer;

  @Column(name = "assigned_at", nullable = false)
  private OffsetDateTime assignedAt;

  @Column(name = "assigned_by")
  private UUID assignedBy;
}
