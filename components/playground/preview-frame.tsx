"use client";

import JSZip from "jszip";
import { Download, ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type DeviceMode = "desktop" | "tablet" | "mobile";

const modeStyles: Record<DeviceMode, string> = {
  desktop: "w-full",
  tablet: "mx-auto w-[768px] max-w-full",
  mobile: "mx-auto w-[390px] max-w-full"
};

type PreviewFrameProps = {
  previewUrl: string;
  sandboxId: string;
};

export function PreviewFrame({ previewUrl, sandboxId }: PreviewFrameProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [isExporting, setIsExporting] = useState(false);

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
        {controlButtons.map((row) => {
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
        })}

        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="h-8" onClick={() => window.open(previewUrl, "_blank")}>
            <ExternalLink className="h-4 w-4" />
            Новая вкладка
          </Button>
          <Button size="sm" className="h-8" onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4" />
            {isExporting ? "Экспорт..." : "Экспорт"}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/20 p-2">
        <div className={modeStyles[deviceMode]}>
          <iframe src={previewUrl} title="Lemnity Preview" className="h-[min(100%,calc(100vh-16rem))] min-h-[420px] w-full rounded-md bg-background" />
        </div>
      </div>
    </div>
  );
}
