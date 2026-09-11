import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';

const PASSWORD_SALT_ROUNDS = 12;
const REGISTRATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function hashWithSecret(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function generateDeviceToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateRegistrationCode(): string {
  const segment = (length: number): string =>
    Array.from({ length }, () => {
      const index = randomBytes(1)[0] % REGISTRATION_CODE_ALPHABET.length;
      return REGISTRATION_CODE_ALPHABET[index];
    }).join('');

  return `${segment(4)}-${segment(4)}`;
}

export function normalizeRegistrationCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
