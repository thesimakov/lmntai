"use client";

import { useState } from "react";
import { Download, FileText, Presentation, TableIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";
import { useI18n } from "@/components/i18n-provider";
import type { AnalysisDashboard } from "@/lib/analytics-schema";

interface Props {
  projectId: string;
  dashboardRef: React.RefObject<HTMLDivElement | null>;
}

function dashboardToCsv(dashboard: AnalysisDashboard): string {
  const lines: string[] = [];

  lines.push("=== KPI Metrics ===");
  lines.push("Metric,Value,Change,Trend,Period");
  for (const kpi of dashboard.kpis) {
    const change = kpi.change !== undefined ? String(kpi.change) : "";
    const trend = kpi.trend ?? "";
    lines.push(`"${kpi.label}","${kpi.value}","${change}","${trend}","${dashboard.meta.period}"`);
  }

  if (dashboard.charts.length > 0) {
    lines.push("");
    lines.push("=== Chart Data ===");
    for (const chart of dashboard.charts) {
      lines.push(`"${chart.title}" (${chart.type})`);
      if (chart.data.length > 0) {
        const keys = Object.keys(chart.data[0] ?? {});
        lines.push(keys.map((k) => `"${k}"`).join(","));
        for (const row of chart.data) {
          lines.push(keys.map((k) => `"${String((row as Record<string, unknown>)[k] ?? "")}"`).join(","));
        }
      }
      lines.push("");
    }
  }

  lines.push("=== Summary ===");
  lines.push(`Executive,"${dashboard.summary.executive}"`);
  if (dashboard.summary.keyFindings.length > 0) {
    lines.push("Key Findings:");
    dashboard.summary.keyFindings.forEach((f, i) => lines.push(`${i + 1},"${f}"`));
  }
  if (dashboard.summary.redFlags.length > 0) {
    lines.push("Red Flags:");
    dashboard.summary.redFlags.forEach((f, i) => lines.push(`${i + 1},"${f}"`));
  }
  if (dashboard.summary.opportunities.length > 0) {
    lines.push("Opportunities:");
    dashboard.summary.opportunities.forEach((o, i) => lines.push(`${i + 1},"${o}"`));
  }

  return lines.join("\n");
}

export function AnalyticsExportMenu({ projectId, dashboardRef }: Props) {
  const { t } = useI18n();
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

  function exportCsv() {
    if (!dashboard) return;
    const csv = dashboardToCsv(dashboard);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dashboard.meta.companyName}_${dashboard.meta.period}_data.csv`.replace(/\s+/g, "_");
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8 text-xs" disabled={!dashboard}>
          <Download className="w-3.5 h-3.5" />
          {t("analytics_bi_export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => void exportPdf()} className="gap-2 cursor-pointer text-sm">
          <FileText className="w-3.5 h-3.5" />
          {t("analytics_bi_export_pdf")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void exportPptx()} disabled={loadingPptx} className="gap-2 cursor-pointer text-sm">
          {loadingPptx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
          {t("analytics_bi_export_pptx")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportCsv} className="gap-2 cursor-pointer text-sm">
          <TableIcon className="w-3.5 h-3.5" />
          {t("analytics_bi_export_csv")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
