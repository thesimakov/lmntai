"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRESENTATION_TEMPLATES } from "@/lib/slide-graph/templates";

interface TemplatePickerProps {
  projectId: string;
  error?: string;
}

export function TemplatePicker({ projectId, error }: TemplatePickerProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(error ?? null);

  async function handleGenerate() {
    if (!selectedId || !brief.trim()) return;
    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/presentations/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedId, brief: brief.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Ошибка генерации. Попробуйте снова.");
        return;
      }
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Новая презентация</h1>
            <p className="text-sm text-muted-foreground">Выберите шаблон и опишите вашу презентацию</p>
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
          <label className="text-sm font-medium">Описание презентации</label>
          <textarea
            className="w-full min-h-[120px] rounded-lg border border-border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            placeholder="Опишите вашу компанию, продукт, аудиторию, ключевые метрики и цели. Чем подробнее — тем лучше результат."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            maxLength={4000}
          />
          <p className="text-xs text-muted-foreground text-right">{brief.length}/4000</p>
        </div>

        {genError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">{genError}</p>
        )}

        <Button
          className="w-full h-11"
          disabled={!selectedId || !brief.trim() || generating}
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
