import { type NextRequest } from "next/server";
import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import {
  upsertSandboxProjectState,
  getSandboxProjectState,
} from "@/lib/sandbox-project-state-db";
import { ocrPdfBuffer } from "@/lib/ocr-pdf";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/json",
  "text/plain",
]);

function detectType(file: File): "pdf" | "xlsx" | "csv" | "json" | null {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (
    mime.includes("spreadsheetml") ||
    mime.includes("ms-excel") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  )
    return "xlsx";
  if (mime.includes("csv") || name.endsWith(".csv")) return "csv";
  if (mime.includes("json") || name.endsWith(".json")) return "json";
  return null;
}

function xlsxToText(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const lines: string[] = [];
  for (const sheetName of wb.SheetNames) {
    lines.push(`=== Sheet: ${sheetName} ===`);
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
    lines.push(csv);
  }
  return lines.join("\n\n");
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

  const file = formData.get("file");
  if (!(file instanceof File)) return apiError("No file provided", 400);

  const fileType = detectType(file);
  if (!fileType) {
    return apiError("Unsupported file type. Accepted: PDF, XLSX, XLS, CSV, JSON", 400);
  }

  if (file.size > MAX_FILE_BYTES) return apiError("File too large (max 50 MB)", 413);

  const buffer = Buffer.from(await file.arrayBuffer());

  let extractedText: string;
  let pageCount = 1;

  try {
    if (fileType === "pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      extractedText = result.text.trim();
      pageCount = result.total;
      if (extractedText.length < 50) {
        // Fallback: try Claude Vision OCR for image-only / scanned PDFs
        const ocrText = await ocrPdfBuffer(buffer).catch(() => null);
        if (!ocrText) {
          return apiError(
            "The PDF appears to be image-only. OCR failed or is unavailable — try a text-based PDF or Excel/CSV export.",
            422
          );
        }
        extractedText = `[OCR extracted]\n\n${ocrText}`;
      }
    } else if (fileType === "xlsx") {
      extractedText = xlsxToText(buffer);
      if (extractedText.trim().length < 10) {
        return apiError("The spreadsheet appears to be empty.", 422);
      }
    } else if (fileType === "csv") {
      extractedText = buffer.toString("utf-8");
      if (extractedText.trim().length < 10) {
        return apiError("The CSV file appears to be empty.", 422);
      }
    } else {
      // json
      const raw = buffer.toString("utf-8");
      try {
        const parsed = JSON.parse(raw) as unknown;
        extractedText = JSON.stringify(parsed, null, 2);
      } catch {
        return apiError("Invalid JSON file.", 422);
      }
    }
  } catch {
    return apiError(
      "Could not read the file. Please try a different file.",
      422
    );
  }

  const existing = await getSandboxProjectState(projectId);
  const existingFiles = existing?.files ?? {};

  const baseName = file.name.replace(/\.(pdf|xlsx|xls|csv|json)$/i, "");

  await upsertSandboxProjectState({
    projectId,
    sandboxId: existing?.sandboxId ?? "",
    ownerId: user.id,
    html: existing?.html ?? "",
    files: {
      ...existingFiles,
      "raw_text.txt": extractedText,
    },
    title: baseName,
  });

  return apiOk({ pages: pageCount, filename: file.name, fileType });
}
