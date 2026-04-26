import type { NextAuthOptions } from "next-auth";

import { OFFLINE_DEMO_USER_ID } from "@/lib/offline-demo-auth";
import { prisma } from "@/lib/prisma";
import { toPlan, toUserRole } from "@/lib/auth-normalizers";

function permsFromJson(p: unknown): string[] {
  if (!p || !Array.isArray(p)) return [];
  return p.filter((x): x is string => typeof x === "string");
}

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
        token.shareBrandingRemovalPaid = false;
        return token;
      }
      // OAuth: иногда в первом круге `user.email` пуст, хотя в БД уже создан User.
      if (!user.email && user.id) {
        try {
          const row = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              email: true,
              role: true,
              plan: true,
              name: true,
              shareBrandingRemovalPaidAt: true,
              adminPermissions: true
            }
          });
          if (row?.email) {
            token.email = row.email.toLowerCase();
            token.role = toUserRole(row.role);
            token.plan = toPlan(row.plan);
            token.shareBrandingRemovalPaid = Boolean(row.shareBrandingRemovalPaidAt);
            token.adminPermissionKeys = permsFromJson(row.adminPermissions);
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
          select: {
            email: true,
            role: true,
            plan: true,
            name: true,
            shareBrandingRemovalPaidAt: true,
            adminPermissions: true
          }
        });
        if (byId?.email) {
          token.email = byId.email.toLowerCase();
          token.role = toUserRole(byId.role);
          token.plan = toPlan(byId.plan);
          token.shareBrandingRemovalPaid = Boolean(byId.shareBrandingRemovalPaidAt);
          token.adminPermissionKeys = permsFromJson(byId.adminPermissions);
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
          where: { email: emailForLookup },
          select: {
            id: true,
            name: true,
            role: true,
            plan: true,
            shareBrandingRemovalPaidAt: true,
            adminPermissions: true
          }
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = toUserRole(dbUser.role);
          token.plan = toPlan(dbUser.plan);
          token.shareBrandingRemovalPaid = Boolean(dbUser.shareBrandingRemovalPaidAt);
          token.adminPermissionKeys = permsFromJson(dbUser.adminPermissions);
          if (typeof dbUser.name === "string") {
            token.name = dbUser.name;
          }
        }
      } catch (err) {
        console.error("[next-auth] jwt: prisma.user.findUnique failed", err);
      }
    }

    if (user) {
      // #region agent log
      fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f7c7f0" },
        body: JSON.stringify({
          sessionId: "f7c7f0",
          hypothesisId: "E",
          location: "lib/auth-callbacks.ts:jwt",
          message: "jwt_after_signin",
          data: { role: (token as { role?: string }).role ?? "unset" },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = (token.userId as string) ?? "";
      session.user.role = (token.role as "USER" | "ADMIN" | "MANAGER") ?? "USER";
      session.user.plan = (token.plan as "FREE" | "PRO" | "TEAM") ?? "FREE";
      session.user.adminPermissionKeys = Array.isArray(token.adminPermissionKeys)
        ? (token.adminPermissionKeys as string[])
        : undefined;
      session.user.demoOffline = Boolean(token.demoOffline);
      session.user.shareBrandingRemovalPaid = Boolean(token.shareBrandingRemovalPaid);
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
