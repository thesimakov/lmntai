import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/utils";
import { withApiLogging } from "@/lib/with-api-logging";

async function getProfile(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      avatar: true,
      apiKey: true,
      tokenBalance: true,
      tokenLimit: true,
      plan: true,
      role: true
    }
  });

  return Response.json({ user });
}

export const GET = withApiLogging("/api/profile", getProfile);

async function patchProfile(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { name?: string; company?: string; avatar?: string }
    | null;

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      name: body?.name,
      company: body?.company,
      avatar: body?.avatar
    },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      avatar: true,
      apiKey: true
    }
  });

  return Response.json({ user });
}

export const PATCH = withApiLogging("/api/profile", patchProfile);

async function postProfile(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action !== "generate-api-key") {
    return new Response("Unknown action", { status: 400 });
  }

  const apiKey = generateApiKey();

  await prisma.user.update({
    where: { email: session.user.email },
    data: { apiKey }
  });

  return Response.json({ apiKey });
}

export const POST = withApiLogging("/api/profile", postProfile);

