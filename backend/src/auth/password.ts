import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Minimum password policy. Intentionally simple: length is the strongest,
 * most user-friendly predictor of password strength. We don't demand a mix
 * of character classes, which tends to push people toward predictable
 * substitutions ("Password1!") rather than genuinely stronger secrets.
 */
export function isPasswordAcceptable(plain: string): boolean {
  return typeof plain === 'string' && plain.length >= 10 && plain.length <= 256;
}
