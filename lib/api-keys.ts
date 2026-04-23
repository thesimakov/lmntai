import { randomBytes } from "node:crypto";

const API_KEY_PREFIX = "lmnt_";

export function generateApiKey() {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("hex")}`;
}
