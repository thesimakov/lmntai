import { DefaultSession } from "next-auth";

export type Plan = "FREE" | "PRO" | "BUSINESS";
export type UserRole = "USER" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      plan: Plan;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    plan?: Plan;
  }
}
