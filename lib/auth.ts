import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import VK from "next-auth/providers/vk";
import Yandex from "next-auth/providers/yandex";

import { prisma } from "@/lib/prisma";
import { logAuthEvent } from "@/lib/request-log";
import { PLAN_LIMITS, ensureUser } from "@/lib/token-manager";

type UserRole = NonNullable<JWT["role"]>;
type Plan = NonNullable<JWT["plan"]>;

function toUserRole(value: string | null | undefined): UserRole {
  return value === "ADMIN" ? "ADMIN" : "USER";
}

function toPlan(value: string | null | undefined): Plan {
  if (value === "PRO" || value === "BUSINESS") return value;
  return "FREE";
}

function smtpConfigured() {
  return Boolean(
    process.env.EMAIL_SERVER_HOST &&
      process.env.EMAIL_SERVER_USER &&
      process.env.EMAIL_SERVER_PASSWORD &&
      process.env.EMAIL_FROM
  );
}

export const authOptions: NextAuthOptions = {
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email (быстрый вход)",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Имя", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const user = await ensureUser(credentials.email, credentials.name);
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? credentials.name ?? "User"
        };
      }
    }),
    ...(smtpConfigured()
      ? [
          EmailProvider({
            server: {
              host: process.env.EMAIL_SERVER_HOST!,
              port: Number(process.env.EMAIL_SERVER_PORT ?? "587"),
              auth: {
                user: process.env.EMAIL_SERVER_USER!,
                pass: process.env.EMAIL_SERVER_PASSWORD!
              }
            },
            from: process.env.EMAIL_FROM!,
            maxAge: 60 * 60
          })
        ]
      : []),
    ...(process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET
      ? [
          VK({
            clientId: process.env.VK_CLIENT_ID,
            clientSecret: process.env.VK_CLIENT_SECRET,
            profile(profile, tokens) {
              const raw = profile as {
                response?: Array<{
                  id?: number;
                  first_name?: string;
                  last_name?: string;
                  photo_100?: string;
                }>;
              };
              const p = raw.response?.[0] ?? {};
              const id = String(p.id ?? "");
              const tokenRecord = tokens as { email?: string };
              const emailFromToken =
                typeof tokenRecord.email === "string" ? tokenRecord.email.toLowerCase() : null;
              return {
                id,
                name: [p.first_name, p.last_name].filter(Boolean).join(" "),
                email: emailFromToken ?? `vk-${id}@users.lemnity.com`,
                image: p.photo_100 ?? null
              };
            }
          })
        ]
      : []),
    ...(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET
      ? [
          Yandex({
            clientId: process.env.YANDEX_CLIENT_ID,
            clientSecret: process.env.YANDEX_CLIENT_SECRET
          })
        ]
      : [])
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        if (user.email) {
          token.email = user.email;
        }
      }

      const email = token.email as string | undefined;
      if (!email) {
        return token;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { email }
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
        session.user.plan = (token.plan as "FREE" | "PRO" | "BUSINESS") ?? "FREE";
        if (token.email) {
          session.user.email = token.email as string;
        }
      }
      return session;
    }
  },
  events: {
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          tokenBalance: PLAN_LIMITS.FREE,
          tokenLimit: PLAN_LIMITS.FREE
        }
      });
    },
    async signIn({ user, account, isNewUser }) {
      await logAuthEvent({
        userId: user.id,
        action: "sign_in",
        provider: account?.provider ?? null,
        email: user.email ?? null,
        metadata: { isNewUser: Boolean(isNewUser) }
      });
    },
    async signOut({ token }) {
      await logAuthEvent({
        userId: typeof token.userId === "string" ? token.userId : undefined,
        action: "sign_out",
        email: typeof token.email === "string" ? token.email : null
      });
    },
    async linkAccount({ user, account }) {
      await logAuthEvent({
        userId: user.id,
        action: "link_account",
        provider: account.provider,
        email: user.email ?? null,
        metadata: { providerAccountId: account.providerAccountId }
      });
    }
  },
  pages: {
    signIn: "/login"
  },
  secret: process.env.NEXTAUTH_SECRET
};

export async function getSafeServerSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("[next-auth] getServerSession failed", error);
    return null;
  }
}
