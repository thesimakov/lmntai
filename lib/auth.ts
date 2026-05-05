import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";

import { authCallbacks } from "@/lib/auth-callbacks";
import { authEvents } from "@/lib/auth-events";
import { buildAuthProviders } from "@/lib/auth-providers";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  providers: buildAuthProviders(),
  callbacks: authCallbacks,
  events: authEvents,
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET
};

function isExpectedDynamicServerUsage(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { digest?: unknown; description?: unknown; message?: unknown };
  if (maybe.digest === "DYNAMIC_SERVER_USAGE") return true;
  if (typeof maybe.description === "string" && maybe.description.includes("Dynamic server usage")) return true;
  if (typeof maybe.message === "string" && maybe.message.includes("Dynamic server usage")) return true;
  return false;
}

export async function getSafeServerSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    if (!isExpectedDynamicServerUsage(error)) {
      console.error("[next-auth] getServerSession failed", error);
    }
    return null;
  }
}
