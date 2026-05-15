import { requireDbUser } from "@/lib/auth-guards";
import { apiGuardError, apiError } from "@/lib/api-response";
import { upsertProjectCell } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  // Reuse existing presentation project instead of always creating new ones
  const existing = await prisma.project.findFirst({
    where: { ownerId: user.id, preferredEditor: "presentation" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existing) {
    redirect(`/playground/build?sessionId=${existing.id}&projectKind=presentation`);
  }

  let projectId: string;
  try {
    const project = await upsertProjectCell({
      projectId: crypto.randomUUID(),
      ownerId: user.id,
      name: "New Presentation",
      subdomain: `presentation-${Date.now()}`,
      preferredEditor: "presentation",
    });
    projectId = project.projectId;
  } catch {
    return apiError("Failed to create presentation project", 500);
  }

  redirect(`/playground/build?sessionId=${projectId}&projectKind=presentation`);
}
