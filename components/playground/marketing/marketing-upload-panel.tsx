"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface Props {
  onAnalyze: () => void;
  isUploading: boolean;
  isAnalyzing: boolean;
  projectId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MarketingUploadPanel({ onAnalyze, isUploading, isAnalyzing, projectId }: Props) {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const next = Array.from(incoming).filter((f) => !existing.has(f.name));
      return [...prev, ...next];
    });
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleAnalyze = async () => {
    if (files.length === 0 || isUploading || isAnalyzing) return;
    setError(null);
    const body = new FormData();
    files.forEach((f) => body.append("files", f));
    try {
      const res = await fetch(`/api/marketing/${projectId}/upload`, { method: "POST", body });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `Upload failed (${res.status})`);
      }
      onAnalyze();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("marketing_bi_upload_error"));
    }
  };

  const busy = isUploading || isAnalyzing;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Drop zone */}
      <label
        className={cn(
          "flex flex-col items-center justify-center gap-3 w-full py-8",
          "rounded-lg border-2 border-dashed cursor-pointer transition-all duration-150",
          dragging
            ? "border-foreground/30 bg-foreground/[0.03]"
            : "border-border hover:border-foreground/20 bg-[#FAFAFA]",
          busy && "opacity-50 pointer-events-none"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
        <div className="w-8 h-8 rounded-lg border border-border bg-white flex items-center justify-center">
          <UploadCloud className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="text-center px-2">
          <p className="text-xs font-medium text-foreground">{t("marketing_bi_drop_hint")}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{t("marketing_bi_format_hint")}</p>
        </div>
      </label>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs truncate flex-1 text-foreground">{f.name}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">{formatFileSize(f.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(f.name)}
                disabled={busy}
                aria-label={t("marketing_bi_remove_file")}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <Button
        onClick={() => void handleAnalyze()}
        disabled={files.length === 0 || busy}
        size="sm"
        className="w-full text-xs h-8"
      >
        {isUploading
          ? t("marketing_bi_uploading")
          : isAnalyzing
          ? t("marketing_bi_analyzing")
          : t("marketing_bi_analyze")}
      </Button>
    </div>
  );
}
