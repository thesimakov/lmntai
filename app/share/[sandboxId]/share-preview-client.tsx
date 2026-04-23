"use client";

type SharePreviewClientProps = {
  sandboxId: string;
};

/** Публичная оболочка превью: iframe на /api/sandbox (эталон ai-manus /share/:sessionId). */
export function SharePreviewClient({ sandboxId }: SharePreviewClientProps) {
  const src = `/api/sandbox/${encodeURIComponent(sandboxId)}`;
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-4">
        <a href="/" className="text-sm font-medium text-foreground hover:underline">
          Lemnity
        </a>
        <span className="truncate text-center text-sm text-muted-foreground sm:flex-1" title="Публичное превью">
          Публичное превью
        </span>
        <span className="w-14" aria-hidden />
      </header>
      <iframe title="Превью" className="min-h-0 w-full flex-1 border-0" src={src} sandbox="allow-scripts allow-same-origin" />
    </div>
  );
}
