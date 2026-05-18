"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Paperclip, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRESENTATION_TEMPLATES } from "@/lib/slide-graph/templates";
import { PLAYGROUND_HOME_PROJECTS_HREF } from "@/lib/playground-project-edit-url";
import { useI18n } from "@/components/i18n-provider";
import { BI_UPLOAD_MAX_BYTES } from "@/lib/bi-upload-limits";
import { isPresentationSourceFile } from "@/lib/presentation-source-document-client";
import { readUploadApiErrorMessage } from "@/lib/api-upload-error";

interface TemplatePickerProps {
  projectId: string;
  projectTitle?: string;
  error?: string;
}

type SourceAttachment = {
  fileName: string;
  text: string;
  truncated?: boolean;
};

export function TemplatePicker({ projectId, projectTitle, error }: TemplatePickerProps) {
  const { t } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [sourceAttachment, setSourceAttachment] = useState<SourceAttachment | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(error ?? null);

  const canGenerate = Boolean(selectedId && (brief.trim() || sourceAttachment?.text.trim()));

  async function handleAttachFile(file: File) {
    setAttachError(null);
    if (!isPresentationSourceFile(file)) {
      setAttachError(t("presentations_attach_unsupported"));
      return;
    }
    if (file.size > BI_UPLOAD_MAX_BYTES) {
      setAttachError(t("analytics_bi_file_too_large"));
      return;
    }

    setParsingFile(true);
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch(`/api/projects/${projectId}/presentations/parse-source`, {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const message = await readUploadApiErrorMessage(res, {
          fallback: t("presentations_attach_parse_error"),
          tooLarge: t("analytics_bi_upload_too_large"),
        });
        throw new Error(message);
      }
      const data = (await res.json()) as {
        data?: SourceAttachment;
        fileName?: string;
        text?: string;
        truncated?: boolean;
      };
      const payload = data.data ?? data;
      if (!payload.text?.trim()) {
        throw new Error(t("presentations_attach_empty"));
      }
      setSourceAttachment({
        fileName: payload.fileName ?? file.name,
        text: payload.text,
        truncated: payload.truncated,
      });
    } catch (e) {
      setSourceAttachment(null);
      setAttachError(e instanceof Error ? e.message : t("presentations_attach_parse_error"));
    } finally {
      setParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/presentations/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedId,
          brief: brief.trim(),
          ...(sourceAttachment
            ? {
                sourceText: sourceAttachment.text,
                sourceFileName: sourceAttachment.fileName,
              }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        details?: string;
      };
      if (!res.ok) {
        const hint =
          data.code === "SCHEMA_MISMATCH"
            ? "Модель вернула невалидную структуру. Укоротите описание или смените шаблон."
            : null;
        setGenError(hint ?? data.error ?? "Ошибка генерации. Попробуйте снова.");
        return;
      }
      router.replace(`/playground/presentations?projectId=${projectId}&t=${Date.now()}`);
      router.refresh();
    } catch {
      setGenError("Сетевая ошибка. Проверьте соединение.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-6 py-10 space-y-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(PLAYGROUND_HOME_PROJECTS_HREF)}
            aria-label={t("nav_projects")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold truncate">
              {projectTitle?.trim() || t("presentations_new_default_title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("presentations_template_picker_subtitle")}
            </p>
          </div>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PRESENTATION_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "group relative flex flex-col gap-3 rounded-xl border-2 p-5 text-left transition-all hover:shadow-md",
                selectedId === t.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40"
              )}
            >
              <span className="text-3xl">{t.thumbnail}</span>
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full w-fit">
                {t.slideCount} слайдов
              </span>
              {selectedId === t.id && (
                <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Brief input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("presentations_brief_label")}</label>
          <textarea
            className="w-full min-h-[120px] rounded-lg border border-border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            placeholder={t("presentations_brief_placeholder")}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            maxLength={4000}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx,.pdf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="sr-only"
                disabled={parsingFile || generating}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAttachFile(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={parsingFile || generating}
                onClick={() => fileInputRef.current?.click()}
              >
                {parsingFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
                {t("presentations_attach_doc")}
              </Button>
              <span className="text-[11px] text-muted-foreground">{t("presentations_attach_hint")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{brief.length}/4000</p>
          </div>

          {sourceAttachment && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs truncate flex-1">{sourceAttachment.fileName}</span>
              {sourceAttachment.truncated && (
                <span className="text-[10px] text-amber-700 dark:text-amber-400 shrink-0">
                  {t("presentations_attach_truncated")}
                </span>
              )}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground shrink-0"
                disabled={parsingFile || generating}
                onClick={() => setSourceAttachment(null)}
                aria-label={t("presentations_attach_remove")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {attachError && <p className="text-xs text-destructive">{attachError}</p>}
        </div>

        {genError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">{genError}</p>
        )}

        <Button
          className="w-full h-11"
          disabled={!canGenerate || generating || parsingFile}
          onClick={handleGenerate}
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Генерируем презентацию…
            </>
          ) : (
            "Создать презентацию"
          )}
        </Button>
      </div>
    </div>
  );
}
