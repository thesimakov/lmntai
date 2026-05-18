import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { extractPresentationSourceText } from "@/lib/presentation-source-document";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const { id: projectId } = await params;

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch {
    return apiError("Project not found or access denied", 403);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError("No file provided", 400);
  }

  try {
    const result = await extractPresentationSourceText(file);
    return apiOk(result);
  } catch (e) {
    const message = unknownToErrorMessage(e);
    if (message.includes("макс.") || message.includes("Поддерживаются")) {
      return apiError(message, 400);
    }
    return apiError(message, 400);
  }
}
