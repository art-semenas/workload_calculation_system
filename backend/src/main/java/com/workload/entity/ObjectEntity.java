package com.workload.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "objects")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObjectEntity {

  @Id private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "branch_id", nullable = false)
  private Branch branch;

  @Column(nullable = false, length = 500)
  private String name;

  @Column(name = "import_seq_no")
  private Integer importSeqNo;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;
}
