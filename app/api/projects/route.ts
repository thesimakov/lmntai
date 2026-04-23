import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

async function getProjects(req: NextRequest) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const rows = await sandboxManager.listSandboxesByOwner(guard.data.user.id);
  const projects = rows.map((row) => ({
    id: row.sandboxId,
    name: row.title || "Новый проект",
    status: row.updatedAt === row.createdAt ? "Черновик" : "Готов",
    updatedAt: new Date(row.updatedAt).toISOString(),
    previewUrl: row.previewUrl
  }));

  return Response.json({ projects });
}

export const GET = withApiLogging("/api/projects", getProjects);
