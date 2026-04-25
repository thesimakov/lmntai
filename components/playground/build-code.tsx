"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type BuildCodeProps = {
  sandboxId: string | null;
  /** Если артефакт — бинарный (.pptx), исходник в редакторе не показываем */
  artifactMimeType?: string | null;
  className?: string;
};

function isPptxMime(m: string | null | undefined): boolean {
  if (!m) return false;
  return m.includes("presentationml") || m.includes("ms-powerpoint");
}

export function BuildCode({ sandboxId, artifactMimeType, className }: BuildCodeProps) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPptxArtifact, setIsPptxArtifact] = useState(false);

  useEffect(() => {
    if (!sandboxId) {
      setText("");
      setError(null);
      setIsPptxArtifact(false);
      return;
    }

    if (sandboxId.startsWith("artifact_") && isPptxMime(artifactMimeType)) {
      setText("");
      setError(null);
      setIsPptxArtifact(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setIsPptxArtifact(false);
      try {
        if (sandboxId.startsWith("artifact_")) {
          const res = await fetch(`/api/lemnity-ai/artifacts/${encodeURIComponent(sandboxId)}`);
          if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || res.statusText);
          }
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("presentationml") || ct.includes("ms-powerpoint")) {
            if (!cancelled) {
              setIsPptxArtifact(true);
              setText("");
            }
            return;
          }
          if (!cancelled) setText(`/* --- index.html --- */\n${await res.text()}`);
          return;
        }
        const res = await fetch(`/api/sandbox/${sandboxId}?format=json`);
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || res.statusText);
        }
        const data = (await res.json()) as { files?: Record<string, string> };
        const files = data.files ?? {};
        const parts = Object.entries(files).map(([name, body]) => `/* --- ${name} --- */\n${body}`);
        if (!cancelled) setText(parts.join("\n\n") || "// Пока нет файлов в песочнице.");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sandboxId, artifactMimeType]);

  if (!sandboxId) {
    return (
      <div className={cn("flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground", className)}>
        Сгенерируйте превью — здесь появится код из песочницы.
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground", className)}>
        Загрузка файлов…
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive", className)}>
        {error}
      </div>
    );
  }

  if (isPptxArtifact && sandboxId.startsWith("artifact_")) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        <p className="font-medium text-foreground">Двоичный артефакт (.pptx)</p>
        <p>Исходный код недоступен. Скачай презентацию на вкладке «Превью».</p>
      </div>
    );
  }

  return (
    <pre
      className={cn(
        "h-full max-h-[min(70vh,560px)] overflow-auto rounded-lg border border-border bg-zinc-950 p-4 text-xs text-zinc-100",
        className
      )}
    >
      <code>{text}</code>
    </pre>
  );
}
