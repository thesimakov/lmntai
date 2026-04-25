"use client";

import JSZip from "jszip";
import { Download, ExternalLink, Monitor, Presentation, Smartphone, Tablet } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type DeviceMode = "desktop" | "tablet" | "mobile";

const modeStyles: Record<DeviceMode, string> = {
  desktop: "w-full",
  tablet: "mx-auto w-[768px] max-w-full",
  mobile: "mx-auto w-[390px] max-w-full"
};

function isPptxArtifact(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.includes("presentationml") || mimeType.includes("ms-powerpoint");
}

type PreviewFrameProps = {
  previewUrl: string;
  sandboxId: string;
  /** С сервера (SSE preview): для .pptx не показываем iframe */
  mimeType?: string | null;
  /** Имя файла для скачивания */
  downloadFilename?: string | null;
};

export function PreviewFrame({ previewUrl, sandboxId, mimeType, downloadFilename }: PreviewFrameProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [isExporting, setIsExporting] = useState(false);
  const isPptx = isPptxArtifact(mimeType);

  const controlButtons = useMemo(
    () => [
      { id: "desktop" as const, icon: Monitor, label: "Десктоп" },
      { id: "tablet" as const, icon: Tablet, label: "Планшет" },
      { id: "mobile" as const, icon: Smartphone, label: "Мобайл" }
    ],
    []
  );

  async function handleExport() {
    setIsExporting(true);
    try {
      if (isPptx) {
        const response = await fetch(previewUrl);
        if (!response.ok) {
          throw new Error(`Export failed: ${response.status}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = downloadFilename?.trim() || `presentation-${sandboxId.slice(0, 8)}.pptx`;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }

      const zip = new JSZip();
      if (previewUrl.includes("/api/lemnity-ai/artifacts/") || sandboxId.startsWith("artifact_")) {
        const response = await fetch(previewUrl);
        if (!response.ok) {
          throw new Error(`Export failed: ${response.status}`);
        }
        zip.file("index.html", await response.text());
      } else {
        const response = await fetch(`/api/sandbox/${sandboxId}?format=json`);
        if (!response.ok) {
          throw new Error(`Export failed: ${response.status}`);
        }
        const payload = (await response.json()) as { files: Record<string, string> };
        Object.entries(payload.files ?? {}).forEach(([path, content]) => {
          zip.file(path, content);
        });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lemnity-project-${sandboxId.slice(0, 8)}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-1.5">
        {!isPptx
          ? controlButtons.map((row) => {
              const RowIcon = row.icon;
              return (
                <Button
                  key={row.id}
                  size="sm"
                  variant={deviceMode === row.id ? "default" : "outline"}
                  className="h-8"
                  onClick={() => setDeviceMode(row.id)}
                >
                  <RowIcon className="h-4 w-4" />
                  {row.label}
                </Button>
              );
            })
          : (
            <span className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <Presentation className="h-4 w-4 shrink-0 text-primary" />
              Файл PowerPoint (.pptx) — скачайте и откройте в Keynote / PowerPoint / Google Slides (импорт).
            </span>
            )}

        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="h-8" onClick={() => window.open(previewUrl, "_blank")}>
            <ExternalLink className="h-4 w-4" />
            Новая вкладка
          </Button>
          <Button size="sm" className="h-8" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4" />
            {isExporting ? "Экспорт..." : isPptx ? "Скачать .pptx" : "Экспорт"}
          </Button>
        </div>
      </div>

      {isPptx ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-muted/20 p-8 text-center">
          <Presentation className="h-16 w-16 text-primary/80" strokeWidth={1.25} />
          <div className="max-w-md space-y-2">
            <p className="text-base font-medium text-foreground">Презентация готова</p>
            <p className="text-sm text-muted-foreground">
              Превью HTML для .pptx недоступно. Скачайте файл и откройте в редакторе презентаций.
            </p>
          </div>
          <Button size="lg" onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            {isExporting ? "Скачивание…" : "Скачать презентацию"}
          </Button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/20 p-2">
          <div className={modeStyles[deviceMode]}>
            <iframe src={previewUrl} title="Lemnity Preview" className="h-[min(100%,calc(100vh-16rem))] min-h-[420px] w-full rounded-md bg-background" />
          </div>
        </div>
      )}
    </div>
  );
}
