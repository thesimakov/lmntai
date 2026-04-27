"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import {
  LemnityAiGridBackdrop,
  LemnityAiOrbitStack,
  LemnityAiScanBeam,
  LemnityAiWireframeBlocks,
  LemnityAiPreviewChrome
} from "@/components/playground/lemnity-ai-preview-animation";
import { PageTransitionBuildLoader } from "@/components/playground/page-transition-build-loader";
import { PreviewFrame } from "@/components/playground/preview-frame";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatBuildElapsed } from "@/lib/build-time-i18n";
import type { MessageKey } from "@/lib/i18n";
import type { ProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import { cn } from "@/lib/utils";

type RightPanelProps = {
  mode: "idle" | "generating" | "preview";
  progress: number;
  /** Время с начала сборки (текст), вместо процентов */
  buildElapsedLabel?: string | null;
  previewUrl: string | null;
  sandboxId: string | null;
  /** Подсказка из стрима (шаг / инструмент) */
  streamHint?: string | null;
  previewMimeType?: string | null;
  previewDownloadFilename?: string | null;
  projectKind?: ProjectKind | null;
  /** Визуальный редактор макета в iframe */
  visualEditMode?: boolean;
  /** Сохранение правок в песочницу (PATCH /api/sandbox) */
  visualEditPersist?: boolean;
  /** Второй файл презентации: PDF (сервер Lemnity AI) */
  presentationPdfExport?: { url: string; filename: string } | null;
  /** PDF и PPTX презентации — тарифы Pro / Team */
  presentationExportsPaid?: boolean;
  /** Режим отдельного редактора документа (вкладка «Документ») */
  previewVariant?: "default" | "document";
  /** Второй iframe с Puck при визуальном режиме (тот же URL, что кнопка Puck) */
  puckEditorHref?: string | null;
  /** Запрос в чат по выбранному в превью элементу (Lemnity AI) */
  onVisualAgentEdit?: (message: string) => void;
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

function generatingLineKey(kind: ProjectKind | null | undefined): MessageKey {
  switch (kind) {
    case "presentation":
      return "playground_right_generating_line1_presentation";
    case "resume":
      return "playground_right_generating_line1_resume";
    case "design":
      return "playground_right_generating_line1_design";
    case "visitcard":
      return "playground_right_generating_line1_visitcard";
    case "lovable":
      return "playground_right_generating_line1_lovable";
    default:
      return "playground_right_generating_line1_website";
  }
}

function GeneratingState({
  progress,
  buildElapsedLabel,
  streamHint,
  projectKind,
  overPreview = false
}: {
  progress: number;
  buildElapsedLabel?: string | null;
  streamHint?: string | null;
  projectKind?: ProjectKind | null;
  /** Поверх существующего превью: полупрозрачный слой, предыдущий макет остаётся видимым (меньше «пустой центр»). */
  overPreview?: boolean;
}) {
  const { t, lang } = useI18n();
  const [hintOpen, setHintOpen] = useState(false);
  const lineKey = generatingLineKey(projectKind);
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        overPreview
          ? "bg-zinc-950/45 backdrop-blur-md dark:bg-zinc-950/60"
          : "bg-background"
      )}
    >
      <LemnityAiGridBackdrop dense />
      <LemnityAiScanBeam />

      <div className="relative z-10 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col px-5 pb-16 pt-6 text-center sm:px-6 sm:pt-8">
        {streamHint ? (
          <div className="mb-2 w-full shrink-0 sm:mb-3">
            <motion.div
              key={streamHint}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mx-auto flex w-full max-w-3xl flex-col gap-1 rounded-xl border border-border/80 bg-muted/35 px-3 py-2 text-left text-xs text-muted-foreground shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    "min-w-0 flex-1 break-words",
                    hintOpen ? "whitespace-pre-wrap" : "line-clamp-2"
                  )}
                  title={streamHint}
                >
                  {streamHint}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1 px-2 text-[10px]"
                  onClick={() => setHintOpen((v) => !v)}
                >
                  {hintOpen ? t("playground_coach_collapse") : t("playground_coach_expand")}
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", hintOpen && "rotate-180")}
                  />
                </Button>
              </div>
            </motion.div>
          </div>
        ) : null}
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
          <div className="shrink-0 space-y-1.5">
            <p className="mx-auto max-w-2xl text-balance text-base font-medium text-foreground">
              {t(lineKey)}
            </p>
            <p className="mx-auto max-w-2xl text-balance text-sm text-muted-foreground">
              {t("playground_right_generating_line2")}
            </p>
            <p className="mx-auto max-w-2xl text-balance text-xs font-medium text-foreground/90">
              {t("playground_choose_assistant_hint")}
            </p>
          </div>
          <div
            className={cn(
              "relative min-h-0 w-full min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/50",
              "bg-muted/20 shadow-inner",
              !overPreview && "ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
            )}
          >
            <PageTransitionBuildLoader
              overPreview={overPreview}
              className="h-full min-h-[min(36vh,280px)] w-full"
            />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t border-border/80 bg-background/80 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <span className="text-xs text-muted-foreground">{t("playground_right_build_label")}</span>
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs tabular-nums text-muted-foreground">
              {buildElapsedLabel?.trim() ? buildElapsedLabel : formatBuildElapsed(0, lang)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RightPanel({
  mode,
  progress,
  buildElapsedLabel = null,
  previewUrl,
  sandboxId,
  streamHint,
  previewMimeType,
  previewDownloadFilename,
  projectKind,
  visualEditMode = false,
  visualEditPersist = false,
  presentationPdfExport = null,
  presentationExportsPaid = false,
  previewVariant = "default",
  puckEditorHref = null,
  onVisualAgentEdit
}: RightPanelProps) {
  const previewFrame = previewUrl && sandboxId && (
    <LemnityAiPreviewChrome>
      <PreviewFrame
        key={sandboxId}
        previewUrl={previewUrl}
        sandboxId={sandboxId}
        mimeType={previewMimeType}
        downloadFilename={previewDownloadFilename}
        visualEditMode={visualEditMode}
        visualEditPersist={visualEditPersist}
        projectKind={projectKind}
        presentationPdfExport={presentationPdfExport}
        presentationExportsPaid={presentationExportsPaid}
        previewVariant={previewVariant}
        puckEditorHref={puckEditorHref}
        onVisualAgentEdit={onVisualAgentEdit}
      />
    </LemnityAiPreviewChrome>
  );

  /** Идёт пересборка, но макет уже был — оставляем iframe под полупрозрачным оверлеем, не снимаем с монтирования. */
  if (mode === "generating" && previewUrl && sandboxId) {
    return (
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="absolute inset-0 z-0 min-h-0">{previewFrame}</div>
        <div className="absolute inset-0 z-20 flex min-h-0 min-w-0">
          <GeneratingState
            overPreview
            progress={progress}
            buildElapsedLabel={buildElapsedLabel}
            streamHint={streamHint}
            projectKind={projectKind}
          />
        </div>
      </div>
    );
  }

  if (mode === "generating") {
    return (
      <GeneratingState
        progress={progress}
        buildElapsedLabel={buildElapsedLabel}
        streamHint={streamHint}
        projectKind={projectKind}
      />
    );
  }

  /** Готовая сборка: показываем файл/превью, даже если mode ещё «idle» (рассинхрон или после ошибки сброса режима). */
  if (previewUrl && sandboxId) {
    return <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{previewFrame}</div>;
  }

  return <IdleState />;
}
