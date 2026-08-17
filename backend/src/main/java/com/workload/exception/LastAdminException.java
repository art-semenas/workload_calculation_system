package com.workload.exception;

/**
 * Guards the one change no admin can undo. Every route that could restore an administrator — {@code
 * /admin/users} included — is itself admin-only, so demoting or deactivating the last active admin
 * locks the installation out of its own administration permanently, recoverable only by SQL against
 * the {@code users} table.
 */
public class LastAdminException extends RuntimeException {

  public LastAdminException() {
    super("Cannot remove the last administrator");
  }
}
