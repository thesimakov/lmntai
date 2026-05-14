"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const busy = isUploading || isAnalyzing;

  return (
    <div className="flex flex-col gap-4 p-4">
      <label
        className={cn(
          "flex flex-col items-center justify-center gap-4 w-full h-48",
          "border-2 border-dashed rounded-xl cursor-pointer transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50",
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
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="p-3 rounded-full bg-primary/10">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-medium text-sm">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, XLS, PDF</p>
        </div>
      </label>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">{f.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(f.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(f.name)}
                disabled={busy}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <Button
        onClick={handleAnalyze}
        disabled={files.length === 0 || busy}
        className="w-full"
      >
        {isUploading ? "Загружаем..." : isAnalyzing ? "Анализируем..." : "Анализировать"}
      </Button>
    </div>
  );
}
