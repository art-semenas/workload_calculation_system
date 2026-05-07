package com.workload.repository;

import java.util.UUID;

/** Projection used by aggregate count queries that group by division. */
public interface DivisionCount {
  UUID getDivisionId();

  Long getCount();
}
