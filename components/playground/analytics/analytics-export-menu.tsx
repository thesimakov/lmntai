"use client";

import { useState } from "react";
import { Download, FileText, Link2, Loader2, Presentation, TableIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { AnalyticsRole } from "@/lib/analytics-share-contract";
import { ANALYTICS_ROLES } from "@/lib/analytics-share-contract";

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareRole, setShareRole] = useState<AnalyticsRole>("viewer");
  const { dashboard } = useAnalyticsStore();

  async function createShareLink() {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/analytics/${projectId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: shareRole }),
      });
      if (!res.ok) throw new Error(t("analytics_bi_share_error"));
      const data = await res.json() as { data: { url: string } };
      setShareUrl(data.data.url);
    } catch {
      toast.error(t("analytics_bi_share_error"));
    } finally {
      setShareLoading(false);
    }
  }

  function copyShareUrl() {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl);
    toast.success(t("analytics_bi_share_copied"));
  }

  async function exportPptx() {
    if (!dashboard) return;
    setLoadingPptx(true);
    try {
      const res = await fetch(`/api/analytics/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pptx" }),
      });
      if (!res.ok) throw new Error(t("analytics_bi_export"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${dashboard.meta.companyName}_${dashboard.meta.period}.pptx`.replace(/\s+/g, "_");
        a.click();
      } finally {
        URL.revokeObjectURL(url);
      }
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
      toast.error(t("build_export_pdf_error"));
    }
  }

  function exportCsv() {
    if (!dashboard) return;
    const csv = dashboardToCsv(dashboard);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dashboard.meta.companyName}_${dashboard.meta.period}_data.csv`.replace(/\s+/g, "_");
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs" disabled={!dashboard}>
            <Download className="w-3.5 h-3.5" />
            {t("analytics_bi_export")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => { setShareUrl(null); setShareDialogOpen(true); }}
            className="gap-2 cursor-pointer text-sm"
          >
            <Link2 className="w-3.5 h-3.5" />
            {t("analytics_bi_share_link")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{t("analytics_bi_share_dialog_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">{t("analytics_bi_share_access_level")}</p>
              <div className="grid gap-1.5">
                {(Object.entries(ANALYTICS_ROLES) as [AnalyticsRole, { label: string; description: string }][]).map(([role, info]) => (
                  <label key={role} className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border p-2.5 hover:bg-muted/40 has-[:checked]:border-foreground/40 has-[:checked]:bg-muted/30">
                    <input
                      type="radio"
                      name="share-role"
                      value={role}
                      checked={shareRole === role}
                      onChange={() => { setShareRole(role); setShareUrl(null); }}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-medium">{info.label}</p>
                      <p className="text-[11px] text-muted-foreground">{info.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {shareUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="flex-1 truncate text-xs font-mono text-foreground/70">{shareUrl}</span>
                  <button type="button" onClick={copyShareUrl} className="shrink-0 text-xs font-medium text-primary hover:underline">
                    {t("analytics_bi_share_copy")}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">{t("analytics_bi_share_hint")}</p>
              </div>
            ) : (
              <Button
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={() => void createShareLink()}
                disabled={shareLoading}
              >
                {shareLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                {t("analytics_bi_share_generate")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
