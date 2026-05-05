"use client";

import { Render } from "@measured/puck";
import type { Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { lemnityPuckConfig } from "@/lib/puck-lemnity-config";
import { mergePuckData } from "@/lib/puck-lemnity-data";
import { rememberBuildSessionForPuckReturn, readBuildSessionForPuckReturn } from "@/lib/lemnity-puck-build-nav";
import { cn } from "@/lib/utils";

type PreviewChrome = "none" | "minimal";

function PlaygroundPuckPreviewInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sandboxId = searchParams.get("sandboxId");
  const sessionId = searchParams.get("sessionId");
  const rev = searchParams.get("rev");
  const chrome = (searchParams.get("chrome") as PreviewChrome | null) === "none" ? "none" : "minimal";

  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          credentials: "include",
          cache: "no-store"
        });
        if (!res.ok) {
          if (res.status === 401) {
            if (!cancelled) {
              setLoadError("unauthorized");
              setData(mergePuckData(null));
            }
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
  }, [sandboxId, rev]);

  const [backToBuildHref, setBackToBuildHref] = useState(() =>
    sessionId ? `/playground/build?sessionId=${encodeURIComponent(sessionId)}` : "/playground/build"
  );

  const [editorHref, setEditorHref] = useState(() => {
    if (!sandboxId) return "/playground/puck";
    const q = new URLSearchParams();
    q.set("sandboxId", sandboxId);
    if (sessionId) q.set("sessionId", sessionId);
    return `/playground/puck?${q.toString()}`;
  });

  useEffect(() => {
    if (sessionId) {
      rememberBuildSessionForPuckReturn(sessionId);
      setBackToBuildHref(`/playground/build?sessionId=${encodeURIComponent(sessionId)}`);
    } else {
      const stored = readBuildSessionForPuckReturn();
      setBackToBuildHref(
        stored ? `/playground/build?sessionId=${encodeURIComponent(stored)}` : "/playground/build"
      );
    }
    if (!sandboxId) {
      setEditorHref("/playground/puck");
      return;
    }
    const sid = sessionId ?? readBuildSessionForPuckReturn();
    const q = new URLSearchParams();
    q.set("sandboxId", sandboxId);
    if (sid) q.set("sessionId", sid);
    setEditorHref(`/playground/puck?${q.toString()}`);
  }, [sessionId, sandboxId]);

  if (!data) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-background p-6 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
        {t("puck_page_loading")}
      </div>
    );
  }

  if (!sandboxId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 bg-background p-4">
        <p className="text-sm text-muted-foreground">{t("puck_page_need_sandbox")}</p>
        <Button type="button" variant="outline" size="sm" className="w-fit" asChild>
          <Link href={backToBuildHref}>{t("puck_page_back_build")}</Link>
        </Button>
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

  const body = (
    <div className={cn("min-h-0 w-full min-w-0", chrome === "none" && "h-full min-h-full")}>
      <Render config={lemnityPuckConfig} data={data} />
    </div>
  );

  if (chrome === "none") {
    return <div className="h-full min-h-full w-full min-w-0 overflow-auto bg-background">{body}</div>;
  }

  return (
    <div className="flex h-[100dvh] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-2 py-1.5">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground sm:text-sm">
          {t("puck_preview_title")}
        </span>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
          <a href={editorHref} className="inline-flex items-center gap-1">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            {t("puck_preview_open_editor")}
          </a>
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <a href={backToBuildHref} aria-label={t("puck_page_back_aria")}>
            <ArrowLeft className="h-4 w-4" />
          </a>
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{body}</div>
    </div>
  );
}

export default function PlaygroundPuckPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 min-h-[200px] flex-1 flex-col items-center justify-center gap-2 bg-background p-6 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
        </div>
      }
    >
      <PlaygroundPuckPreviewInner />
    </Suspense>
  );
}
