package com.workload.repository.projection;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One object's contribution to an engineer's workload, fetched in a single query.
 *
 * <p>Replaces a per-assignment pair of lookups ({@code countByObjectId} + {@code findByObjectId})
 * that made engineer-summary recalculation N+1 in the size of the engineer's portfolio.
 *
 * <p>Summary fields are nullable: an object may be assigned before its summary exists.
 *
 * @param objectId the assigned object
 * @param engineerCount how many engineers share this object — the divisor for the equal split
 *     (§6.12.1); always at least 1, since the row exists because an assignment does
 */
public record EngineerObjectLoad(
    UUID objectId,
    long engineerCount,
    BigDecimal itogoWithTravel,
    BigDecimal osMonthly,
    BigDecimal psMonthly,
    BigDecimal videoMonthly,
    BigDecimal recordsMonthly,
    BigDecimal repairWithTravel) {}
