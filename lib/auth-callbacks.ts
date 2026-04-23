import type { NextAuthOptions } from "next-auth";

import { OFFLINE_DEMO_USER_ID } from "@/lib/offline-demo-auth";
import { prisma } from "@/lib/prisma";
import { toPlan, toUserRole } from "@/lib/auth-normalizers";

export const authCallbacks: NextAuthOptions["callbacks"] = {
  async jwt({ token, user, trigger, session }) {
    if (trigger === "update" && typeof session?.name === "string") {
      token.name = session.name;
    }

    if (user) {
      token.userId = user.id;
      if (user.email) {
        token.email = user.email.toLowerCase();
      }
      if (typeof user.name === "string") {
        token.name = user.name;
      }
      if (user.id === OFFLINE_DEMO_USER_ID) {
        token.demoOffline = true;
        token.role = "USER";
        token.plan = "FREE";
        return token;
      }
      // OAuth: иногда в первом круге `user.email` пуст, хотя в БД уже создан User.
      if (!user.email && user.id) {
        try {
          const row = await prisma.user.findUnique({
            where: { id: user.id },
            select: { email: true, role: true, plan: true, name: true }
          });
          if (row?.email) {
            token.email = row.email.toLowerCase();
            token.role = toUserRole(row.role);
            token.plan = toPlan(row.plan);
            if (typeof row.name === "string") {
              token.name = row.name;
            }
            return token;
          }
        } catch (err) {
          console.error("[next-auth] jwt: prisma.user.findUnique by id failed", err);
        }
      }
    }

    if (token.demoOffline) {
      return token;
    }

    const email = token.email as string | undefined;
    const userId = token.userId as string | undefined;
    if (!email && userId) {
      try {
        const byId = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, role: true, plan: true, name: true }
        });
        if (byId?.email) {
          token.email = byId.email.toLowerCase();
          token.role = toUserRole(byId.role);
          token.plan = toPlan(byId.plan);
          if (typeof byId.name === "string") {
            token.name = byId.name;
          }
        }
      } catch (err) {
        console.error("[next-auth] jwt: prisma.user by userId failed", err);
      }
    }

    const emailForLookup = (token.email as string | undefined)?.toLowerCase();
    if (emailForLookup) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: emailForLookup }
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = toUserRole(dbUser.role);
          token.plan = toPlan(dbUser.plan);
          if (typeof dbUser.name === "string") {
            token.name = dbUser.name;
          }
        }
      } catch (err) {
        console.error("[next-auth] jwt: prisma.user.findUnique failed", err);
      }
    }

    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = (token.userId as string) ?? "";
      session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      session.user.plan = (token.plan as "FREE" | "PRO" | "TEAM") ?? "FREE";
      session.user.demoOffline = Boolean(token.demoOffline);
      if (token.email) {
        session.user.email = token.email as string;
      }
      if (typeof token.name === "string") {
        session.user.name = token.name;
      }
    }
    return session;
  }
};
