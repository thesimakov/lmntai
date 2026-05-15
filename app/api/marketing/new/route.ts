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
      name: "New Marketing Report",
      subdomain: `marketing-${Date.now()}`,
      preferredEditor: "marketing",
    });
    projectId = project.projectId;
  } catch {
    return apiError("Failed to create marketing project", 500);
  }

  redirect(`/playground/marketing?projectId=${projectId}`);
}
