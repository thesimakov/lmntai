"use client";

import { useEffect } from "react";

/**
 * В dev Webpack иногда отдаёт 404 на клиентский chunk (гонка: HTML уже ссылается на .js,
 * файл ещё не записан) или хеш chunk'а меняется после пересборки. Пытаемся восстановиться:
 * HEAD по URL, при 404 — полный location.replace с query; иначе — reload с коротким debounce.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const DEBOUNCE_MS = 1200;
    const tsKey = "__lemnity_chunk_reload_ts";

    const chunkFailed = (reason: unknown): boolean => {
      const msg =
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : String(reason ?? "");
      const lower = msg.toLowerCase();
      return (
        lower.includes("chunkloaderror") ||
        lower.includes("loading chunk") ||
        lower.includes("failed to fetch dynamically imported module")
      );
    };

    const replaceWithChunkRecover = () => {
      sessionStorage.removeItem(tsKey);
      const u = new URL(window.location.href);
      u.searchParams.set("__chunk404", String(Date.now()));
      window.location.replace(u.toString());
    };

    const tryReload = () => {
      const now = Date.now();
      const last = Number(sessionStorage.getItem(tsKey) || "0");
      if (now - last < DEBOUNCE_MS) return;
      sessionStorage.setItem(tsKey, String(now));
      window.location.reload();
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      if (!chunkFailed(e.reason)) return;
      e.preventDefault();
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason ?? "");
      const match = msg.match(/https?:\/\/[^\s)]+/);
      const chunkUrl = match?.[0] ?? null;
      void (async () => {
        let headStatus: number | string = "no_url";
        if (chunkUrl) {
          try {
            const r = await fetch(chunkUrl, { method: "HEAD", cache: "no-store" });
            headStatus = r.status;
          } catch {
            headStatus = "head_fetch_error";
          }
        }
        if (headStatus === 404) {
          replaceWithChunkRecover();
          return;
        }
        tryReload();
      })();
    };

    const onError = (ev: Event) => {
      const t = ev.target;
      if (!(t instanceof HTMLScriptElement) && !(t instanceof HTMLLinkElement)) return;
      const url =
        t instanceof HTMLScriptElement ? t.src : t instanceof HTMLLinkElement ? t.href : "";
      if (!url.includes("/_next/static/chunks/")) return;

      void (async () => {
        let headStatus: number | string = "head_skip";
        try {
          const r = await fetch(url, { method: "HEAD", cache: "no-store" });
          headStatus = r.status;
        } catch {
          headStatus = "head_fetch_error";
        }
        if (headStatus === 404) {
          replaceWithChunkRecover();
          return;
        }
        tryReload();
      })();
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError, true);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError, true);
    };
  }, []);

  return null;
}
