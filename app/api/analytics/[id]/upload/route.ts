import { type NextRequest } from "next/server";
import { PDFParse } from "pdf-parse";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import {
  upsertSandboxProjectState,
  getSandboxProjectState,
} from "@/lib/sandbox-project-state-db";

const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB

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
  if (!(file instanceof File)) return apiError("No file provided", 400);
  if (!file.type.includes("pdf")) return apiError("Only PDF files are supported", 400);

  if (file.size > MAX_PDF_BYTES) return apiError("PDF too large (max 50 MB)", 413);
  const buffer = Buffer.from(await file.arrayBuffer());

  let extractedText: string;
  let pageCount: number;
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    extractedText = result.text.trim();
    pageCount = result.total;
  } catch {
    return apiError(
      "Could not read the PDF. Try a different file or a text-based PDF.",
      422
    );
  }

  if (extractedText.length < 50) {
    return apiError(
      "The PDF appears to be empty or image-only. Text-based PDFs are required.",
      422
    );
  }

  const existing = await getSandboxProjectState(projectId);
  const existingFiles = existing?.files ?? {};

  await upsertSandboxProjectState({
    projectId,
    sandboxId: existing?.sandboxId ?? "",
    ownerId: user.id,
    html: existing?.html ?? "",
    files: {
      ...existingFiles,
      "raw_text.txt": extractedText,
    },
    title: file.name.replace(/\.pdf$/i, ""),
  });

  return apiOk({ pages: pageCount, filename: file.name });
}
