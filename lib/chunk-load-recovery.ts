/** Debounce between automatic chunk-recovery navigations (ms). */
export const CHUNK_RECOVER_DEBOUNCE_MS = 1200;

export const CHUNK_RELOAD_TS_KEY = "__lemnity_chunk_reload_ts";
export const CHUNK_RECOVER_QUERY = "__chunk404";

export function chunkFailureMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return String(reason ?? "");
}

export function isChunkLoadFailure(reason: unknown): boolean {
  if (reason instanceof Error && reason.name === "ChunkLoadError") return true;
  const lower = chunkFailureMessage(reason).toLowerCase();
  return (
    lower.includes("chunkloaderror") ||
    lower.includes("loading chunk") ||
    lower.includes("failed to fetch dynamically imported module")
  );
}

export function isNextStaticChunkUrl(url: string): boolean {
  return url.includes("/_next/static/chunks/");
}

/** @returns false when debounced (another recovery just ran). */
export function recoverFromChunkLoadFailure(mode: "replace" | "reload" = "replace"): boolean {
  if (typeof window === "undefined") return false;

  const now = Date.now();
  const last = Number(sessionStorage.getItem(CHUNK_RELOAD_TS_KEY) || "0");
  if (now - last < CHUNK_RECOVER_DEBOUNCE_MS) return false;

  if (mode === "replace") {
    sessionStorage.removeItem(CHUNK_RELOAD_TS_KEY);
    const u = new URL(window.location.href);
    u.searchParams.set(CHUNK_RECOVER_QUERY, String(now));
    window.location.replace(u.toString());
    return true;
  }

  sessionStorage.setItem(CHUNK_RELOAD_TS_KEY, String(now));
  window.location.reload();
  return true;
}

export type ChunkLoadRecoveryOptions = {
  /** Skip HEAD probe — typical stale-deploy case on production. */
  skipHeadProbe?: boolean;
};

export function attachChunkLoadRecoveryHandlers(
  options: ChunkLoadRecoveryOptions = {}
): () => void {
  const skipHeadProbe =
    options.skipHeadProbe ?? process.env.NODE_ENV === "production";

  const onRejection = (e: PromiseRejectionEvent) => {
    if (!isChunkLoadFailure(e.reason)) return;
    e.preventDefault();

    if (skipHeadProbe) {
      recoverFromChunkLoadFailure("replace");
      return;
    }

    const msg = chunkFailureMessage(e.reason);
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
        recoverFromChunkLoadFailure("replace");
        return;
      }
      recoverFromChunkLoadFailure("reload");
    })();
  };

  const onError = (ev: ErrorEvent) => {
    if (isChunkLoadFailure(ev.error ?? ev.message)) {
      ev.preventDefault();
      recoverFromChunkLoadFailure("replace");
      return;
    }

    const t = ev.target;
    if (!(t instanceof HTMLScriptElement) && !(t instanceof HTMLLinkElement)) return;
    const url =
      t instanceof HTMLScriptElement ? t.src : t instanceof HTMLLinkElement ? t.href : "";
    if (!isNextStaticChunkUrl(url)) return;

    void (async () => {
      if (skipHeadProbe) {
        recoverFromChunkLoadFailure("replace");
        return;
      }
      let headStatus: number | string = "head_skip";
      try {
        const r = await fetch(url, { method: "HEAD", cache: "no-store" });
        headStatus = r.status;
      } catch {
        headStatus = "head_fetch_error";
      }
      if (headStatus === 404) {
        recoverFromChunkLoadFailure("replace");
        return;
      }
      recoverFromChunkLoadFailure("reload");
    })();
  };

  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("error", onError, true);
  return () => {
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("error", onError, true);
  };
}

/**
 * Runs before React hydration — same recovery logic as {@link attachChunkLoadRecoveryHandlers}.
 * Must stay self-contained (no imports) for `beforeInteractive` injection.
 */
export const CHUNK_RECOVERY_INLINE_SCRIPT = `(function(){
  var DEBOUNCE=1200;
  var TS_KEY="${CHUNK_RELOAD_TS_KEY}";
  var QUERY="${CHUNK_RECOVER_QUERY}";
  function msg(r){
    if(r&&r.message)return r.message;
    if(typeof r==="string")return r;
    return String(r||"");
  }
  function failed(r,m){
    if(r&&r.name==="ChunkLoadError")return true;
    var s=(m||msg(r)).toLowerCase();
    return s.indexOf("chunkloaderror")!==-1||s.indexOf("loading chunk")!==-1||s.indexOf("failed to fetch dynamically imported module")!==-1;
  }
  function isChunkUrl(u){return typeof u==="string"&&u.indexOf("/_next/static/chunks/")!==-1;}
  function recover(){
    var now=Date.now();
    var last=Number(sessionStorage.getItem(TS_KEY)||"0");
    if(now-last<DEBOUNCE)return;
    sessionStorage.removeItem(TS_KEY);
    var u=new URL(location.href);
    u.searchParams.set(QUERY,String(now));
    location.replace(u.href);
  }
  window.addEventListener("unhandledrejection",function(e){
    if(!failed(e.reason))return;
    e.preventDefault();
    recover();
  });
  window.addEventListener("error",function(e){
    if(failed(e.error,e.message)){e.preventDefault();recover();return;}
    var t=e.target;
    if(!t||t.tagName!=="SCRIPT"||!t.src||!isChunkUrl(t.src))return;
    recover();
  },true);
})();`;
