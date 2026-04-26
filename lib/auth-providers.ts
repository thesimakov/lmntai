import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import VK from "next-auth/providers/vk";
import Yandex from "next-auth/providers/yandex";

import { getPostgresDatabaseUrlErrorMessage } from "@/lib/database-url";
import { isDemoDatabaseBypassed, OFFLINE_DEMO_USER_ID } from "@/lib/offline-demo-auth";
import { getAuthDatabaseUserMessage } from "@/lib/prisma-auth-errors";
import { applyAdminEnvBootstrap, tryAdminEnvCredentialsLogin } from "@/lib/admin-env-bootstrap";
import {
  ensureDemoUserWithPassword,
  ensureUser,
  loginWithPassword,
  registerUserWithPassword
} from "@/lib/token-manager";
import { normalizeEmail } from "@/lib/auth-normalizers";

function smtpConfigured() {
  return Boolean(
    process.env.EMAIL_SERVER_HOST &&
      process.env.EMAIL_SERVER_USER &&
      process.env.EMAIL_SERVER_PASSWORD &&
      process.env.EMAIL_FROM
  );
}

export function buildAuthProviders(): NextAuthOptions["providers"] {
  return [
    CredentialsProvider({
      id: "credentials",
      name: "Email (быстрый вход)",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Имя", type: "text" },
        company: { label: "Компания", type: "text" },
        password: { label: "Пароль", type: "password" },
        intent: { label: "register | login", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email.trim();
        const emailLower = normalizeEmail(email);
        const demoOn = process.env.DEMO_LOGIN_ENABLED === "true";
        const demoEmail = process.env.DEMO_LOGIN_EMAIL?.toLowerCase().trim();
        const demoPass = process.env.DEMO_LOGIN_PASSWORD;

        if (demoOn && demoEmail && emailLower === demoEmail) {
          const providedPw = (credentials as { password?: string }).password;
          if (isDemoDatabaseBypassed(process.env, process.env.NODE_ENV, emailLower, providedPw)) {
            const displayName =
              (credentials.name?.trim() || process.env.DEMO_LOGIN_NAME?.trim() || "Демо") || "Демо";
            return {
              id: OFFLINE_DEMO_USER_ID,
              email: emailLower,
              name: displayName
            };
          }

          if (!demoPass && process.env.NODE_ENV !== "development") {
            return null;
          }
          if (demoPass) {
            const pw = providedPw ?? "";
            if (pw !== demoPass) {
              return null;
            }
            try {
              const company = (credentials as { company?: string }).company;
              const user = await ensureDemoUserWithPassword(
                emailLower,
                credentials.name ?? null,
                company,
                pw
              );
              if (!user) {
                return null;
              }
              return {
                id: user.id,
                email: user.email,
                name: user.name ?? credentials.name ?? "Демо"
              };
            } catch (err) {
              console.error("[auth] ensureDemoUserWithPassword failed:", err);
              const dbMsg = getAuthDatabaseUserMessage(err);
              if (dbMsg) {
                throw new Error(dbMsg);
              }
              throw err;
            }
          } else {
            try {
              const company = (credentials as { company?: string }).company;
              const user = await ensureUser(emailLower, credentials.name, company);
              return {
                id: user.id,
                email: user.email,
                name: user.name ?? credentials.name ?? "Демо"
              };
            } catch (err) {
              console.error("[auth] ensureUser (demo, dev) failed:", err);
              const dbMsg = getAuthDatabaseUserMessage(err);
              if (dbMsg) {
                throw new Error(dbMsg);
              }
              throw err;
            }
          }
        }

        const urlErr = getPostgresDatabaseUrlErrorMessage();
        if (urlErr) {
          throw new Error(urlErr);
        }

        try {
          const password = (credentials as { password?: string }).password ?? "";
          const intent =
            (credentials as { intent?: string }).intent === "register" ? "register" : "login";
          const company = (credentials as { company?: string }).company;
          const displayName = credentials.name?.trim();

          if (intent === "register") {
            if (!displayName) {
              return null;
            }
            const created = await registerUserWithPassword(
              emailLower,
              password,
              displayName,
              company
            );
            if ("kind" in created) {
              return null;
            }
            try {
              await applyAdminEnvBootstrap(created.id, created.email, password);
            } catch (e) {
              console.error("[auth] admin env bootstrap (register) failed", e);
            }
            return {
              id: created.id,
              email: created.email,
              name: created.name ?? displayName
            };
          }

          if (!password) {
            return null;
          }
          const adminFromEnv = await tryAdminEnvCredentialsLogin(emailLower, password);
          if (adminFromEnv) {
            // #region agent log
            fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f7c7f0" },
              body: JSON.stringify({
                sessionId: "f7c7f0",
                hypothesisId: "A",
                location: "lib/auth-providers.ts:credentials:authorize",
                message: "login_via_admin_env",
                data: { userId: adminFromEnv.id },
                timestamp: Date.now()
              })
            }).catch(() => {});
            // #endregion
            return adminFromEnv;
          }
          const user = await loginWithPassword(emailLower, password);
          if (!user) {
            // #region agent log
            fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f7c7f0" },
              body: JSON.stringify({
                sessionId: "f7c7f0",
                hypothesisId: "A",
                location: "lib/auth-providers.ts:credentials:authorize",
                message: "login_failed_both_paths",
                data: {},
                timestamp: Date.now()
              })
            }).catch(() => {});
            // #endregion
            return null;
          }
          // #region agent log
          fetch("http://127.0.0.1:7420/ingest/7b0f12de-0977-4309-8ea6-029840641bbc", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f7c7f0" },
            body: JSON.stringify({
              sessionId: "f7c7f0",
              hypothesisId: "A",
              location: "lib/auth-providers.ts:credentials:authorize",
              message: "login_via_db_password",
              data: { userId: user.id },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion
          try {
            await applyAdminEnvBootstrap(user.id, user.email, password);
          } catch (e) {
            console.error("[auth] admin env bootstrap (login) failed", e);
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? "User"
          };
        } catch (err) {
          console.error("[auth] credentials login/register failed:", err);
          const dbMsg = getAuthDatabaseUserMessage(err);
          if (dbMsg) {
            throw new Error(dbMsg);
          }
          const detail = err instanceof Error ? err.message : String(err);
          if (process.env.NODE_ENV === "development") {
            throw new Error(`Вход не удалался (dev): ${detail}`);
          }
          throw new Error("Не удалось выполнить вход. Попробуйте позже.");
        }
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
            clientSecret: process.env.YANDEX_CLIENT_SECRET,
            // Тот же email, что уже в БД (credentials) — не создаём второго пользователя, клеим OAuth-аккаунт.
            allowDangerousEmailAccountLinking: true,
            // Дефолт next-auth: login:info+email+avatar — в кабинете Яндекса часто нет `login:avatar` → invalid_scope.
            // Минимум: профиль + email (аватар в профиле будет null, если API не отдаст).
            authorization: {
              url: "https://oauth.yandex.ru/authorize",
              params: {
                scope: "login:info login:email"
              }
            }
          })
        ]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
          })
        ]
      : []),
    ...(() => {
      const id = process.env.GITHUB_ID || process.env.GITHUB_CLIENT_ID;
      const secret = process.env.GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET;
      return id && secret ? [GitHub({ clientId: id, clientSecret: secret })] : [];
    })()
  ];
}
