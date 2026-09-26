import { describe, it, expect } from 'vitest';
import { isLocked, onFailedAttempt, onSuccessfulLogin } from '../src/auth/lockout';

const policy = { threshold: 5, durationMinutes: 15 };
const now = new Date('2026-01-01T00:00:00Z');

describe('account lockout', () => {
  it('does not lock before the threshold', () => {
    let state = { failedAttempts: 0, lockedUntil: null as Date | null };
    for (let i = 0; i < 4; i++) {
      state = onFailedAttempt(state, policy, now);
    }
    expect(state.failedAttempts).toBe(4);
    expect(isLocked(state, now)).toBe(false);
  });

  it('locks exactly at the threshold', () => {
    let state = { failedAttempts: 0, lockedUntil: null as Date | null };
    for (let i = 0; i < 5; i++) {
      state = onFailedAttempt(state, policy, now);
    }
    expect(isLocked(state, now)).toBe(true);
  });

  it('unlocks after the lockout duration passes', () => {
    let state = { failedAttempts: 0, lockedUntil: null as Date | null };
    for (let i = 0; i < 5; i++) {
      state = onFailedAttempt(state, policy, now);
    }
    const later = new Date(now.getTime() + 16 * 60_000);
    expect(isLocked(state, later)).toBe(false);
  });

  it('resets counters on successful login', () => {
    const state = onSuccessfulLogin();
    expect(state.failedAttempts).toBe(0);
    expect(state.lockedUntil).toBeNull();
  });
});
