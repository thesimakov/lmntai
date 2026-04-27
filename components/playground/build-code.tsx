"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileCode2, FolderOpen } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
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

function sortFileKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === "generated.txt") return 1;
    if (b === "generated.txt") return -1;
    if (a === "puck.json") return 1;
    if (b === "puck.json") return -1;
    return a.localeCompare(b, "en", { sensitivity: "base" });
  });
}

export function BuildCode({ sandboxId, artifactMimeType, className }: BuildCodeProps) {
  const { t } = useI18n();
  const [files, setFiles] = useState<Record<string, string>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPptxArtifact, setIsPptxArtifact] = useState(false);

  const sortedKeys = useMemo(() => sortFileKeys(Object.keys(files)), [files]);

  useEffect(() => {
    if (sortedKeys.length && (selectedPath == null || !files[selectedPath])) {
      setSelectedPath(sortedKeys[0] ?? null);
    }
  }, [sortedKeys, files, selectedPath]);

  useEffect(() => {
    if (!sandboxId) {
      setFiles({});
      setError(null);
      setIsPptxArtifact(false);
      setSelectedPath(null);
      return;
    }

    if (sandboxId.startsWith("artifact_") && isPptxMime(artifactMimeType)) {
      setFiles({});
      setError(null);
      setIsPptxArtifact(true);
      setSelectedPath(null);
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
              setFiles({});
            }
            return;
          }
          const text = await res.text();
          if (!cancelled) {
            setFiles({ "index.html": text });
            setSelectedPath("index.html");
          }
          return;
        }
        const res = await fetch(`/api/sandbox/${sandboxId}?format=json`);
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || res.statusText);
        }
        const data = (await res.json()) as { files?: Record<string, string> };
        const f = data.files ?? {};
        if (!cancelled) {
          setFiles(f);
        }
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

  const activeBody = selectedPath && files[selectedPath] != null ? files[selectedPath]! : "";
  const onPickFile = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

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

  if (sortedKeys.length === 0) {
    return (
      <div className={cn("flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground", className)}>
        Пока нет файлов в песочнице.
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden sm:flex-row", className)}
    >
      <div className="flex w-full min-w-0 shrink-0 flex-col border-b border-border sm:w-[min(12rem,40%)] sm:border-b-0 sm:border-r">
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/30 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" aria-hidden />
          {t("playground_build_code_files")}
        </div>
        <div className="h-[min(32vh,200px)] overflow-y-auto sm:h-full sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
          <nav className="flex flex-col p-1" aria-label={t("playground_build_code_files")}>
            {sortedKeys.map((path) => {
              const isGen = path === "generated.txt";
              const isSecondary = isGen || path === "puck.json";
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => onPickFile(path)}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs",
                    isSecondary && "text-muted-foreground",
                    selectedPath === path
                      ? "bg-accent font-medium text-accent-foreground"
                      : "hover:bg-muted/80"
                  )}
                  title={path}
                >
                  <FileCode2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-mono leading-snug">
                    {isGen ? t("playground_build_code_generated") : path}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border/60 bg-muted/20 px-2 py-1 text-[10px] font-mono text-muted-foreground">
          {selectedPath ?? "—"}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <pre className="m-0 p-3 text-xs leading-relaxed text-zinc-100">
            <code>{activeBody}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
