package com.workload.exception;

/** A division may only be deleted once it is empty — {@code branches.division_id} is RESTRICT. */
public class DivisionHasBranchesException extends RuntimeException {
  public DivisionHasBranchesException(long branchCount) {
    super("Cannot delete: division has " + branchCount + " branches");
  }
}
