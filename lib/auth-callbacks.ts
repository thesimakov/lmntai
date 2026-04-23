import type { NextAuthOptions } from "next-auth";

import { OFFLINE_DEMO_USER_ID } from "@/lib/offline-demo-auth";
import { prisma } from "@/lib/prisma";
import { toPlan, toUserRole } from "@/lib/auth-normalizers";

export const authCallbacks: NextAuthOptions["callbacks"] = {
  async jwt({ token, user }) {
    if (user) {
      token.userId = user.id;
      if (user.email) {
        token.email = user.email.toLowerCase();
      }
      if (user.id === OFFLINE_DEMO_USER_ID) {
        token.demoOffline = true;
        token.role = "USER";
        token.plan = "FREE";
        return token;
      }
    }

    if (token.demoOffline) {
      return token;
    }

    const email = token.email as string | undefined;
    if (!email) {
      return token;
    }

    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (dbUser) {
        token.userId = dbUser.id;
        token.role = toUserRole(dbUser.role);
        token.plan = toPlan(dbUser.plan);
      }
    } catch (err) {
      console.error("[next-auth] jwt: prisma.user.findUnique failed", err);
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
    }
    return session;
  }
};
