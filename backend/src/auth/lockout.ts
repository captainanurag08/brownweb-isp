export interface LockoutState {
  failedAttempts: number;
  lockedUntil: Date | null;
}

export interface LockoutPolicy {
  threshold: number;
  durationMinutes: number;
}

/** Is the account currently locked, given `now`? Pure function, easy to test. */
export function isLocked(state: LockoutState, now: Date): boolean {
  return !!state.lockedUntil && state.lockedUntil.getTime() > now.getTime();
}

/** Compute the next state after a failed login attempt. */
export function onFailedAttempt(
  state: LockoutState,
  policy: LockoutPolicy,
  now: Date
): LockoutState {
  const failedAttempts = state.failedAttempts + 1;
  if (failedAttempts >= policy.threshold) {
    return {
      failedAttempts,
      lockedUntil: new Date(now.getTime() + policy.durationMinutes * 60_000),
    };
  }
  return { failedAttempts, lockedUntil: state.lockedUntil };
}

/** Compute the next state after a successful login: counters reset. */
export function onSuccessfulLogin(): LockoutState {
  return { failedAttempts: 0, lockedUntil: null };
}
