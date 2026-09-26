import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, isPasswordAcceptable } from '../src/auth/password';

describe('password hashing', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('wrong password', hash)).toBe(false);
  });

  it('never stores the plaintext password in the hash', async () => {
    const hash = await hashPassword('hunter2hunter2');
    expect(hash).not.toContain('hunter2');
  });
});

describe('isPasswordAcceptable', () => {
  it('rejects short passwords', () => {
    expect(isPasswordAcceptable('short')).toBe(false);
  });

  it('accepts a reasonable password', () => {
    expect(isPasswordAcceptable('a-decent-passphrase')).toBe(true);
  });
});
