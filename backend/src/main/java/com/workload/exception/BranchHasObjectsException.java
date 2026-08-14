package com.workload.exception;

/** A branch may only be deleted once it is empty — {@code objects.branch_id} is RESTRICT. */
public class BranchHasObjectsException extends RuntimeException {
  public BranchHasObjectsException(long objectCount) {
    super("Cannot delete: branch has " + objectCount + " objects");
  }
}
