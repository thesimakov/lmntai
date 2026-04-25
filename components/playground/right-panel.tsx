"use client";

import { motion } from "framer-motion";

import { useI18n } from "@/components/i18n-provider";
import { CodepenIsometricBuildLoader } from "@/components/playground/codepen-isometric-build";
import {
  LemnityAiGridBackdrop,
  LemnityAiOrbitStack,
  LemnityAiScanBeam,
  LemnityAiWireframeBlocks,
  LemnityAiPreviewChrome
} from "@/components/playground/lemnity-ai-preview-animation";
import { PreviewFrame } from "@/components/playground/preview-frame";
import { Progress } from "@/components/ui/progress";

type RightPanelProps = {
  mode: "idle" | "generating" | "preview";
  progress: number;
  previewUrl: string | null;
  sandboxId: string | null;
  /** Подсказка из стрима (шаг / инструмент) */
  streamHint?: string | null;
  previewMimeType?: string | null;
  previewDownloadFilename?: string | null;
};

function IdleState() {
  const { t } = useI18n();
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-between overflow-hidden bg-background py-3">
      <LemnityAiGridBackdrop />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(168,85,247,.11),transparent_42%),radial-gradient(circle_at_78%_72%,rgba(236,72,153,.1),transparent_44%)]" />
      <LemnityAiScanBeam />
      <div className="relative z-10 flex w-full min-h-0 flex-1 flex-col items-center justify-center gap-1 px-4">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <LemnityAiOrbitStack />
        </motion.div>
        <LemnityAiWireframeBlocks animated className="mt-2" />
      </div>
      <p className="relative z-10 max-w-sm shrink-0 px-6 text-center text-sm text-muted-foreground">
        {t("playground_right_idle_hint")}
      </p>
    </div>
  );
}

function GeneratingState({ progress, streamHint }: { progress: number; streamHint?: string | null }) {
  const { t } = useI18n();
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <LemnityAiGridBackdrop dense />
      <LemnityAiScanBeam />

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
        <p className="max-w-md text-base font-medium text-foreground">{t("playground_right_generating_line1")}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("playground_right_generating_line2")}</p>
        <div className="relative z-10 mt-3 w-full max-h-[min(48vh,340px)] min-h-[180px]">
          <CodepenIsometricBuildLoader />
        </div>
        <LemnityAiWireframeBlocks animated className="mt-3" />
        <div className="absolute bottom-0 left-0 right-0 border-t border-border/80 bg-background/80 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <span className="text-xs text-muted-foreground">{t("playground_right_build_label")}</span>
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RightPanel({
  mode,
  progress,
  previewUrl,
  sandboxId,
  streamHint,
  previewMimeType,
  previewDownloadFilename
}: RightPanelProps) {
  if (mode === "generating") {
    return <GeneratingState progress={progress} streamHint={streamHint} />;
  }

  /** Готовая сборка: показываем файл/превью, даже если mode ещё «idle» (рассинхрон или после ошибки сброса режима). */
  if (previewUrl && sandboxId) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <LemnityAiPreviewChrome>
          <PreviewFrame
            previewUrl={previewUrl}
            sandboxId={sandboxId}
            mimeType={previewMimeType}
            downloadFilename={previewDownloadFilename}
          />
        </LemnityAiPreviewChrome>
      </div>
    );
  }

  return <IdleState />;
}
