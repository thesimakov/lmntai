"use client";

import { useState } from "react";
import { Download, FileText, Presentation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";

interface Props {
  projectId: string;
  dashboardRef: React.RefObject<HTMLDivElement | null>;
}

export function AnalyticsExportMenu({ projectId, dashboardRef }: Props) {
  const [loadingPptx, setLoadingPptx] = useState(false);
  const { dashboard } = useAnalyticsStore();

  async function exportPptx() {
    if (!dashboard) return;
    setLoadingPptx(true);
    try {
      const res = await fetch(`/api/analytics/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pptx" }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dashboard.meta.companyName}_${dashboard.meta.period}.pptx`.replace(/\s+/g, "_");
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoadingPptx(false);
    }
  }

  async function exportPdf() {
    if (!dashboardRef.current) return;
    try {
      const { downloadHtmlAsPdf } = await import("@/lib/export-html-pdf");
      await downloadHtmlAsPdf(
        dashboardRef.current,
        `${dashboard?.meta.companyName ?? "report"}_analysis.pdf`
      );
    } catch (err) {
      console.error("[analytics] PDF export failed:", err);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={!dashboard}>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void exportPdf()} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          PDF Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void exportPptx()} disabled={loadingPptx} className="gap-2 cursor-pointer">
          {loadingPptx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
          PowerPoint (PPTX)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
