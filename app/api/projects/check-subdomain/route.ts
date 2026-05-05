import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { normalizeProjectSubdomain } from "@/lib/project-context";
import { withApiLogging } from "@/lib/with-api-logging";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkSubdomain(req: NextRequest): Promise<Response> {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const raw = req.nextUrl.searchParams.get("subdomain")?.trim() ?? "";

  try {
    const subdomain = normalizeProjectSubdomain(raw);
    const exists = await prisma.project.findFirst({
      where: { subdomain },
      select: { id: true }
    });
    return Response.json({
      subdomain,
      available: !exists
    });
  } catch {
    return Response.json({ available: false, invalid: true }, { status: 400 });
  }
}

export const GET = withApiLogging("/api/projects/check-subdomain", checkSubdomain);
