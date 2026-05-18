"use client";

import { useCallback, useState } from "react";
import { FileText, FileSpreadsheet, FileJson, FileType, UploadCloud } from "lucide-react";
import { BI_UPLOAD_MAX_BYTES } from "@/lib/bi-upload-limits";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".csv", ".json", ".docx"];
const ACCEPT_ATTR =
  "application/pdf,.xlsx,.xls,text/csv,application/json,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return FileSpreadsheet;
  if (ext === "json") return FileJson;
  if (ext === "docx") return FileType;
  return FileText;
}

export function AnalyticsUploadZone({ onFile, disabled }: Props) {
  const { t } = useI18n();
  const [dragging, setDragging] = useState(false);
  const DocxIcon = getFileIcon("sample.docx");

  const handle = useCallback(
    (file: File) => {
      const name = file.name.toLowerCase();
      const ok = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
      if (!ok) return;
      if (file.size > BI_UPLOAD_MAX_BYTES) return;
      onFile(file);
    },
    [onFile]
  );

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center gap-4 w-full max-w-md",
        "rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150",
        "px-8 py-10",
        dragging
          ? "border-foreground/40 bg-foreground/[0.03]"
          : "border-border hover:border-foreground/25 bg-white",
        disabled && "opacity-50 pointer-events-none"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handle(f);
      }}
    >
      <input
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.currentTarget.value = ""; }}
      />
      <div className="w-10 h-10 rounded-lg border border-border bg-muted/50 flex items-center justify-center">
        <UploadCloud className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{t("analytics_bi_drop_hint")}</p>
        <p className="mt-1 text-xs leading-[10px] text-muted-foreground">{t("analytics_bi_format_hint")}</p>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" /> PDF
        </span>
        <span className="text-border">·</span>
        <span className="flex items-center gap-1">
          <FileSpreadsheet className="w-3 h-3" /> XLSX / CSV
        </span>
        <span className="text-border">·</span>
        <span className="flex items-center gap-1">
          <FileJson className="w-3 h-3" /> JSON
        </span>
        <span className="text-border">·</span>
        <span className="flex items-center gap-1">
          <DocxIcon className="w-3 h-3" /> DOCX
        </span>
      </div>
    </label>
  );
}
