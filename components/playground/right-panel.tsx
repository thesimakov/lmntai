"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { PreviewFrame } from "@/components/playground/preview-frame";
import { Progress } from "@/components/ui/progress";

type RightPanelProps = {
  mode: "idle" | "generating" | "preview";
  progress: number;
  previewUrl: string | null;
  sandboxId: string | null;
  /** Подсказка из стрима (шаг / инструмент), как в ai-manus right panel */
  streamHint?: string | null;
};

function WireframeBlocks() {
  return (
    <div className="pointer-events-none mx-auto mt-8 w-full max-w-lg space-y-3 opacity-[0.18]">
      <div className="h-3 w-1/3 rounded-md bg-foreground" />
      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-3 h-28 rounded-lg border-2 border-dashed border-foreground" />
        <div className="col-span-2 h-28 rounded-lg border-2 border-dashed border-foreground" />
      </div>
      <div className="h-16 w-full rounded-lg border-2 border-dashed border-foreground" />
      <div className="flex gap-2">
        <div className="h-2 flex-1 rounded bg-foreground" />
        <div className="h-2 flex-1 rounded bg-foreground" />
        <div className="h-2 flex-1 rounded bg-foreground" />
      </div>
    </div>
  );
}

function IdleState() {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,.12),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(236,72,153,.1),transparent_45%)]" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 14, ease: "linear" }}
        className="h-40 w-40 rounded-full border border-primary/20"
      />
      <p className="absolute bottom-12 max-w-sm px-6 text-center text-sm text-muted-foreground">
        Ожидание запроса. Опишите проект в чате и запустите генерацию.
      </p>
    </div>
  );
}

function GeneratingState({ progress, streamHint }: { progress: number; streamHint?: string | null }) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(hsl(var(--foreground)/0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-8 text-center">
        {streamHint ? (
          <motion.p
            key={streamHint}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-3 max-w-lg truncate rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
            title={streamHint}
          >
            {streamHint}
          </motion.p>
        ) : null}
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="max-w-md text-base font-medium text-foreground">Lemnity собирает сайт. Чуть-чуть подождите…</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Скачайте приложение и получите уведомление, когда превью будет готово (скоро).
        </p>
        <WireframeBlocks />
        <div className="absolute bottom-0 left-0 right-0 border-t border-border/80 bg-background/80 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <span className="text-xs text-muted-foreground">Сборка интерфейса</span>
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RightPanel({ mode, progress, previewUrl, sandboxId, streamHint }: RightPanelProps) {
  if (mode === "idle") {
    return <IdleState />;
  }

  if (mode === "generating") {
    return <GeneratingState progress={progress} streamHint={streamHint} />;
  }

  if (mode === "preview" && previewUrl && sandboxId) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <PreviewFrame previewUrl={previewUrl} sandboxId={sandboxId} />
      </div>
    );
  }

  return <IdleState />;
}
