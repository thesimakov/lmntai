import type { NextRequest } from "next/server";
import NextAuth from "next-auth/next";

import { authOptions } from "@/lib/auth";

/** App Router: Next 15 передаёт `context.params` (Promise) — важно прокидывать оба аргумента, иначе путь /callback/yandex ломается. */
const handler = NextAuth(authOptions);

type NextAuthContext = { params: Promise<{ nextauth: string[] }> };

export async function GET(req: NextRequest, context: NextAuthContext) {
  return handler(req, context);
}

export async function POST(req: NextRequest, context: NextAuthContext) {
  return handler(req, context);
}

