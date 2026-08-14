package com.workload.exception;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Raised when a login is attempted against an account locked by brute-force protection (§21.3).
 *
 * <p>The message names the unlock time so the user knows when to retry. That does disclose which
 * addresses correspond to real accounts; the TOR specifies this wording, and the alternative — a
 * generic failure — leaves a locked-out user with no way to understand what happened.
 */
public class AccountLockedException extends RuntimeException {

  public AccountLockedException(OffsetDateTime lockedUntil) {
    super(
        "Account locked. Try again after "
            + lockedUntil.format(DateTimeFormatter.ofPattern("HH:mm"))
            + ".");
  }
}
