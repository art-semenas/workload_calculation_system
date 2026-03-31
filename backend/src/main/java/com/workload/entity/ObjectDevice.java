package com.workload.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "object_devices", uniqueConstraints = @UniqueConstraint(name = "uq_od_object_device", columnNames = {
        "object_id", "device_type_id" }))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ObjectDevice {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "object_id", nullable = false)
    private ObjectEntity object;

    @ManyToOne(optional = false)
    @JoinColumn(name = "device_type_id", nullable = false)
    private DeviceType deviceType;

    @Column(name = "quantity_physical", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityPhysical;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
