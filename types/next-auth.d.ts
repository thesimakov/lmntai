import { DefaultSession } from "next-auth";

import type { PlanId } from "@/lib/plan-config";

export type Plan = PlanId;
export type UserRole = "USER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      plan: Plan;
      /** Вход без PostgreSQL (локальная разработка) */
      demoOffline?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    plan?: Plan;
    demoOffline?: boolean;
  }
}
