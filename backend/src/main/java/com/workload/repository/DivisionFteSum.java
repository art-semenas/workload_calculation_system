package com.workload.repository;

import java.math.BigDecimal;
import java.util.UUID;

/** Projection used by the summary FTE aggregate query that groups by division. */
public interface DivisionFteSum {
  UUID getDivisionId();

  BigDecimal getRequiredFte();
}
