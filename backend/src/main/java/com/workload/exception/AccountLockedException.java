package com.workload.exception;

import java.time.Duration;
import java.time.OffsetDateTime;

/**
 * Raised when a login is attempted against an account locked by brute-force protection (§21.3).
 *
 * <p>The wait is stated as a <b>duration</b>, not a wall-clock time. A clock time has to be
 * formatted in some zone, and the only zone the server knows is its own — UTC in the container — so
 * a user in UTC+3 was being told a retry time three hours in the past. A duration needs no zone and
 * reads the same everywhere.
 *
 * <p>This does disclose that the address belongs to a real account; the TOR accepts that, and the
 * alternative — a generic failure — leaves a locked-out user with no idea what happened.
 */
public class AccountLockedException extends RuntimeException {

  public AccountLockedException(OffsetDateTime lockedUntil) {
    super("Account locked. Try again in " + minutesRemaining(lockedUntil) + " minutes.");
  }

  /**
   * Rounded up, and never below 1: a caller told to "try again in 0 minutes" would retry at once
   * and be refused again.
   */
  private static long minutesRemaining(OffsetDateTime lockedUntil) {
    long seconds = Duration.between(OffsetDateTime.now(), lockedUntil).getSeconds();
    return Math.max(1, (seconds + 59) / 60);
  }
}
