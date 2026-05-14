import { type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import {
  upsertSandboxProjectState,
  getSandboxProjectState,
} from "@/lib/sandbox-project-state-db";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 5;
const SUPPORTED_TYPES = new Set([
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/pdf",
]);

function isCsvOrXlsx(file: File): boolean {
  return (
    file.type === "text/csv" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    file.name.endsWith(".csv") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
  );
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.endsWith(".pdf");
}

async function extractCsvText(buffer: Buffer, filename: string): Promise<string> {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const parts: string[] = [`=== File: ${filename} ===`];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        parts.push(`--- Sheet: ${sheetName} ---`);
        parts.push(csv);
      }
    }
    return parts.join("\n");
  } catch {
    throw new Error(`Could not parse file "${filename}" — check format`);
  }
}

async function extractPdfText(buffer: Buffer, filename: string): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text.trim();
    if (text.length < 20) {
      throw new Error(`The PDF "${filename}" appears to be empty or image-only.`);
    }
    return `=== File: ${filename} ===\n${text}`;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`Could not extract text from "${filename}".`);
  }
}

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

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return apiError("No files provided", 400);
  if (files.length > MAX_FILES) return apiError(`Maximum ${MAX_FILES} files allowed`, 400);

  const textParts: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return apiError(`File "${file.name}" exceeds 50 MB limit`, 413);
    }
    if (!SUPPORTED_TYPES.has(file.type) && !isCsvOrXlsx(file) && !isPdf(file)) {
      return apiError(
        `Unsupported file type for "${file.name}". Use CSV, XLSX, or PDF.`,
        400
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;
    try {
      if (isPdf(file)) {
        text = await extractPdfText(buffer, file.name);
      } else {
        text = await extractCsvText(buffer, file.name);
      }
    } catch (err) {
      return apiError(err instanceof Error ? err.message : `Could not parse "${file.name}"`, 400);
    }

    textParts.push(text);
  }

  const combined = textParts.join("\n\n");
  if (combined.trim().length < 20) {
    return apiError("No usable data found in uploaded files", 400);
  }

  const existing = await getSandboxProjectState(projectId);
  const existingFiles = existing?.files ?? {};

  await upsertSandboxProjectState({
    projectId,
    sandboxId: existing?.sandboxId ?? "",
    ownerId: user.id,
    html: existing?.html ?? "",
    files: { ...existingFiles, "marketing_raw.txt": combined },
    title: existing?.title ?? "Marketing Analysis",
  });

  return apiOk({ data: { fileCount: files.length, charCount: combined.length } });
}
