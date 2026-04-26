import { DefaultSession } from "next-auth";

import type { PlanId } from "@/lib/plan-config";

export type Plan = PlanId;
export type UserRole = "USER" | "ADMIN" | "MANAGER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      plan: Plan;
      /** Ключи прав для роли MANAGER. */
      adminPermissionKeys?: string[];
      /** Вход без PostgreSQL (локальная разработка) */
      demoOffline?: boolean;
      /** Разовая оплата снятия «Сделано на Lemnity» на /share (тариф FREE). */
      shareBrandingRemovalPaid?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    name?: string;
    role?: UserRole;
    plan?: Plan;
    adminPermissionKeys?: string[];
    demoOffline?: boolean;
    shareBrandingRemovalPaid?: boolean;
  }
}
