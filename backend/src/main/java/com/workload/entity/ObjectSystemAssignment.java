package com.workload.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "object_system_assignments", uniqueConstraints = @UniqueConstraint(name = "uq_osa_object_device_system", columnNames = {
        "object_id", "device_type_id", "system_type" }))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObjectSystemAssignment {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "object_id", nullable = false)
    private ObjectEntity object;

    @ManyToOne(optional = false)
    @JoinColumn(name = "device_type_id", nullable = false)
    private DeviceType deviceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "system_type", nullable = false, length = 10)
    private SystemType systemType;

    @Column(name = "quantity_maintained", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityMaintained;

    @ManyToOne(optional = false)
    @JoinColumn(name = "context_id", nullable = false)
    private DeviceSystemContext context;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
