"use client";

import { Puck } from "@measured/puck";
import type { Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { defaultLemnityPuckData, lemnityPuckConfig } from "@/lib/puck-lemnity-config";
import { cn } from "@/lib/utils";

function mergePuckData(loaded: unknown | null | undefined): Data {
  const base = defaultLemnityPuckData() as Data;
  if (!loaded || typeof loaded !== "object") return base;
  const o = loaded as Record<string, unknown>;
  return {
    ...base,
    ...o,
    root:
      o.root && typeof o.root === "object"
        ? {
            ...((base as { root?: object }).root ?? {}),
            ...(o.root as object)
          }
        : (base as { root: unknown }).root
  } as Data;
}

function PlaygroundPuckPageInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sandboxId = searchParams.get("sandboxId");
  const sessionId = searchParams.get("sessionId");

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
        toast.success(t("puck_page_saved"));
      } catch {
        toast.error(t("puck_page_save_failed"));
      }
    },
    [persist, t]
  );

  const onChange = useCallback((next: Data) => {
    setData(next);
  }, []);

  const backHref = sessionId
    ? `/playground/build?sessionId=${encodeURIComponent(sessionId)}`
    : "/playground/build";

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
          <a href={backHref} className="inline-flex items-center gap-2">
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
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => router.push("/login")}>
          {t("puck_page_login")}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex h-[100dvh] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background")}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" asChild>
          <a href={backHref} aria-label={t("puck_page_back_aria")}>
            <ArrowLeft className="h-5 w-5" />
          </a>
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{t("puck_page_title")}</span>
        <code className="hidden max-w-[40vw] truncate rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground sm:block">
          puck.json
        </code>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Puck config={lemnityPuckConfig} data={data} onChange={onChange} onPublish={onPublish} headerTitle={t("puck_page_header")} />
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
