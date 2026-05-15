import { requireDbUser } from "@/lib/auth-guards";
import { apiGuardError, apiError } from "@/lib/api-response";
import { upsertProjectCell } from "@/lib/project-context";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

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

  redirect(`/playground/build?projectId=${projectId}&projectKind=presentation`);
}
