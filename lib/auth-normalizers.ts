import type { JWT } from "next-auth/jwt";

import { normalizePlanId } from "@/lib/plan-config";

type UserRole = NonNullable<JWT["role"]>;
type Plan = NonNullable<JWT["plan"]>;

export function toUserRole(value: string | null | undefined): UserRole {
  if (value === "ADMIN") return "ADMIN";
  if (value === "MANAGER") return "MANAGER";
  return "USER";
}

export function toPlan(value: string | null | undefined): Plan {
  return normalizePlanId(value);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
