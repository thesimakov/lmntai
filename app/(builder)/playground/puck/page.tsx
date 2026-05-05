"use client";

import { Puck } from "@measured/puck";
import type { Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { ArrowLeft, ExternalLink, Loader2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { lemnityPuckConfig } from "@/lib/puck-lemnity-config";
import { mergePuckData } from "@/lib/puck-lemnity-data";
import { rememberBuildSessionForPuckReturn, readBuildSessionForPuckReturn } from "@/lib/lemnity-puck-build-nav";
import { cn } from "@/lib/utils";

function PlaygroundPuckPageInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sandboxId = searchParams.get("sandboxId");
  const sessionId = searchParams.get("sessionId");

  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sidePreviewOpen, setSidePreviewOpen] = useState(false);
  const [previewRev, setPreviewRev] = useState(0);

  const previewIframeSrc = useMemo(() => {
    if (!sandboxId) return null;
    const q = new URLSearchParams();
    q.set("sandboxId", sandboxId);
    if (sessionId) q.set("sessionId", sessionId);
    q.set("rev", String(previewRev));
    q.set("chrome", "none");
    return `/playground/puck/preview?${q.toString()}`;
  }, [sandboxId, sessionId, previewRev]);

  /** Полноэкранное превью в новой вкладке (удобно на мобильных, где панель рядом скрыта). */
  const previewNewTabHref = useMemo(() => {
    if (!sandboxId) return null;
    const q = new URLSearchParams();
    q.set("sandboxId", sandboxId);
    if (sessionId) q.set("sessionId", sessionId);
    q.set("rev", String(previewRev));
    return `/playground/puck/preview?${q.toString()}`;
  }, [sandboxId, sessionId, previewRev]);

  useEffect(() => {
    if (!sandboxId) {
      setLoadError("no_sandbox");
      setData(mergePuckData(null));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/puck`, {
          credentials: "include"
        });
        if (!res.ok) {
          if (res.status === 401) {
            setLoadError("unauthorized");
            if (!cancelled) setData(mergePuckData(null));
            return;
          }
          if (!cancelled) setData(mergePuckData(null));
          return;
        }
        const j = (await res.json()) as { data: unknown | null };
        if (!cancelled) {
          setData(mergePuckData(j.data));
          setLoadError(null);
        }
      } catch {
        if (!cancelled) setData(mergePuckData(null));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sandboxId]);

  const persist = useCallback(
    async (next: Data) => {
      if (!sandboxId) return;
      const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/puck`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ data: next })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Save failed");
      }
    },
    [sandboxId]
  );

  const onPublish = useCallback(
    async (next: Data) => {
      setData(next);
      try {
        await persist(next);
        if (!sandboxId) return;
        setPreviewRev((n) => n + 1);
        toast.success(t("puck_page_saved"));
        try {
          if (typeof window !== "undefined" && window.parent && window.parent !== window) {
            window.parent.postMessage(
              { type: "lemnity-puck-published", sandboxId: sandboxId ?? undefined },
              "*"
            );
          }
        } catch {
          /* ignore */
        }
      } catch {
        toast.error(t("puck_page_save_failed"));
      }
    },
    [persist, sandboxId, t]
  );

  const onChange = useCallback((next: Data) => {
    setData(next);
  }, []);

  const [backToBuildHref, setBackToBuildHref] = useState(() =>
    sessionId ? `/playground/build?sessionId=${encodeURIComponent(sessionId)}` : "/playground/build"
  );

  useEffect(() => {
    if (sessionId) {
      rememberBuildSessionForPuckReturn(sessionId);
      setBackToBuildHref(`/playground/build?sessionId=${encodeURIComponent(sessionId)}`);
      return;
    }
    const stored = readBuildSessionForPuckReturn();
    setBackToBuildHref(
      stored ? `/playground/build?sessionId=${encodeURIComponent(stored)}` : "/playground/build"
    );
  }, [sessionId]);

  if (!data) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-background p-6 text-sm text-muted-foreground">
        {t("puck_page_loading")}
      </div>
    );
  }

  if (!sandboxId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 bg-background p-4">
        <Button type="button" variant="ghost" size="sm" className="w-fit" asChild>
          <a href={backToBuildHref} className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("puck_page_back_build")}
          </a>
        </Button>
        <p className="text-sm text-muted-foreground">{t("puck_page_need_sandbox")}</p>
      </div>
    );
  }

  if (loadError === "unauthorized") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 bg-background p-4">
        <p className="text-sm text-destructive">{t("puck_page_auth_required")}</p>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => router.push("/")}>
          {t("puck_page_login")}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex h-[100dvh] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background")}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" asChild>
          <a href={backToBuildHref} aria-label={t("puck_page_back_aria")}>
            <ArrowLeft className="h-5 w-5" />
          </a>
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{t("puck_page_title")}</span>
        {previewIframeSrc ? (
          <>
            <Button
              type="button"
              variant={sidePreviewOpen ? "secondary" : "ghost"}
              size="sm"
              className="hidden h-8 gap-1.5 text-xs md:inline-flex"
              onClick={() => setSidePreviewOpen((v) => !v)}
              aria-pressed={sidePreviewOpen}
            >
              {sidePreviewOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              {sidePreviewOpen ? t("puck_embed_preview_hide") : t("puck_embed_preview_show")}
            </Button>
            {previewNewTabHref ? (
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs md:hidden" asChild>
                <a href={previewNewTabHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  {t("puck_preview_open_tab")}
                </a>
              </Button>
            ) : null}
          </>
        ) : null}
        <code className="hidden max-w-[32vw] truncate rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground lg:block">
          puck.json
        </code>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          sidePreviewOpen && previewIframeSrc && "flex min-w-0 flex-row"
        )}
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <Puck
            config={lemnityPuckConfig}
            data={data}
            onChange={onChange}
            onPublish={onPublish}
            headerTitle={t("puck_page_header")}
          />
        </div>
        {sidePreviewOpen && previewIframeSrc ? (
          <div className="hidden h-full w-[min(100%,480px)] shrink-0 border-l border-border bg-muted/20 md:block">
            <iframe
              key={previewIframeSrc}
              title={t("puck_iframe_title")}
              className="h-full w-full min-h-0 border-0"
              src={previewIframeSrc}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PlaygroundPuckPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-background p-6 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
        </div>
      }
    >
      <PlaygroundPuckPageInner />
    </Suspense>
  );
}
