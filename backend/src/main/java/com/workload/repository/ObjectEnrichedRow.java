package com.workload.repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Projection returned by the enriched object list query (includes FTE and engineer count). */
public interface ObjectEnrichedRow {
  UUID getId();

  UUID getBranchId();

  String getBranchName();

  UUID getDivisionId();

  String getDivisionName();

  String getName();

  Integer getImportSeqNo();

  BigDecimal getItogoChisloWithTravel();

  Long getEngineerCount();

  OffsetDateTime getCreatedAt();

  OffsetDateTime getUpdatedAt();
}
