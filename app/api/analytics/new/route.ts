import type { NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { apiGuardError, apiError } from "@/lib/api-response";
import { upsertProjectCell } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { resolveUiLanguageFromRequest } from "@/lib/request-ui-language";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;
  const lang = resolveUiLanguageFromRequest(req);

  // Reuse existing analytics project instead of always creating new ones
  const existing = await prisma.project.findFirst({
    where: { ownerId: user.id, preferredEditor: "analytics" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existing) {
    redirect(`/playground/analytics?projectId=${existing.id}&lang=${lang}`);
  }

  let projectId: string;
  try {
    const project = await upsertProjectCell({
      projectId: crypto.randomUUID(),
      ownerId: user.id,
      name: "New Analytics Report",
      subdomain: `analytics-${Date.now()}`,
      preferredEditor: "analytics",
    });
    projectId = project.projectId;
  } catch {
    return apiError("Failed to create analytics project", 500);
  }

  redirect(`/playground/analytics?projectId=${projectId}&lang=${lang}`);
}
