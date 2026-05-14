"use client";

import { useCallback, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function AnalyticsUploadZone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);

  const handle = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") return;
      if (file.size > 50 * 1024 * 1024) return;
      onFile(file);
    },
    [onFile]
  );

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center gap-4 w-full max-w-lg h-64",
        "border-2 border-dashed rounded-xl cursor-pointer transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
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
        accept="application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
      />
      <div className="p-4 rounded-full bg-primary/10">
        <FileText className="w-8 h-8 text-primary" />
      </div>
      <div className="text-center">
        <p className="font-medium">Drop a PDF here or click to browse</p>
        <p className="text-sm text-muted-foreground mt-1">P&L, balance sheets, cash flow reports · max 50 MB</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Upload className="w-3 h-3" /> PDF only
      </div>
    </label>
  );
}
