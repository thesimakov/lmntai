import bcrypt from "bcryptjs";

import { MIN_PASSWORD_LENGTH } from "@/lib/auth-constants";

const SALT_ROUNDS = 10;

export { MIN_PASSWORD_LENGTH };

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
