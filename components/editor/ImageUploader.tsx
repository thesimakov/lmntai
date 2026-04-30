"use client";

import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImageUploaderProps = {
  sandboxId: string | null;
  disabled?: boolean;
  labels: { upload: string; uploading: string; errorType: string };
  onUploaded: (publicUrl: string) => void;
  className?: string;
};

const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/svg+xml";

export function ImageUploader({ sandboxId, disabled, labels, onUploaded, className }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!sandboxId || disabled || busy) return;
      setBusy(true);
      try {
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/image-upload`, {
          method: "POST",
          body: fd,
          credentials: "include"
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(j?.error ?? res.statusText);
        }
        const data = (await res.json()) as { url: string };
        onUploaded(data.url);
        try {
          window.dispatchEvent(
            new CustomEvent("lemnity:sandbox-files-updated", { detail: { sandboxId } })
          );
        } catch {
          /* noop */
        }
      } catch (e) {
        toast.error(labels.upload, {
          description: e instanceof Error ? e.message : String(e)
        });
      } finally {
        setBusy(false);
      }
    },
    [sandboxId, disabled, busy, onUploaded, labels.upload]
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(labels.upload, { description: labels.errorType });
      return;
    }
    void uploadFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={onDrop}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={onChange} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-2"
        disabled={disabled || !sandboxId || busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4 shrink-0" />
        {busy ? labels.uploading : labels.upload}
      </Button>
    </div>
  );
}
