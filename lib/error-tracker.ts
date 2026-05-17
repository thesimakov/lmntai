"use client";

import { detectModule, type ErrorReportPayload, type ErrorSource, type ErrorType } from "./error-tracker-types";

const MSG_MAX   = 1_000;
const STACK_MAX = 8_000;
const MAX_QUEUE = 20;
const ENDPOINT  = "/api/errors/report";

export type RawInput = {
  source:      ErrorSource;
  errorType:   ErrorType;
  message:     string;
  stack?:      string;
  url?:        string;
  statusCode?: number;
  meta?:       Record<string, unknown>;
};

export function buildPayload(input: RawInput): ErrorReportPayload {
  const message = input.message.length > MSG_MAX
    ? `${input.message.slice(0, MSG_MAX - 1)}…`
    : input.message;
  const stack = input.stack && input.stack.length > STACK_MAX
    ? `${input.stack.slice(0, STACK_MAX - 1)}…`
    : input.stack;
  const viewport =
    typeof window !== "undefined"
      ? `${window.innerWidth}x${window.innerHeight}`
      : undefined;
  return {
    source:     input.source,
    errorType:  input.errorType,
    module:     typeof window !== "undefined" ? detectModule(window.location.pathname) : undefined,
    message,
    stack,
    url:        input.url ?? (typeof window !== "undefined" ? window.location.href : undefined),
    statusCode: input.statusCode,
    viewport,
    meta:       input.meta,
  };
}

class ErrorTracker {
  private initialized = false;
  private queue: ErrorReportPayload[] = [];

  init(): void {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    this.attachGlobalHandlers();
    this.interceptFetch();
  }

  report(input: RawInput): void {
    this.flush(buildPayload(input));
  }

  private attachGlobalHandlers(): void {
    window.addEventListener("error", (ev: ErrorEvent) => {
      if (!(ev.error instanceof Error)) return; // skip resource load errors
      this.report({
        source:    "client",
        errorType: "js_exception",
        message:   ev.message || ev.error.message || "Unknown JS error",
        stack:     ev.error.stack,
      });
    });

    window.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
      const err = ev.reason;
      const message = err instanceof Error ? err.message : String(err ?? "Unhandled rejection");
      const stack   = err instanceof Error ? err.stack   : undefined;
      this.report({ source: "client", errorType: "unhandled_rejection", message, stack });
    });
  }

  private interceptFetch(): void {
    const original = window.fetch.bind(window);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const response = await original(...args);
      if (!response.ok && response.status >= 400) {
        const input = args[0];
        const url =
          typeof input === "string"         ? input
          : input instanceof URL            ? input.href
          : input instanceof Request        ? input.url
          : "unknown";
        const init = args[1];
        const method = (typeof init === "object" && init?.method) ? init.method : "GET";
        this.report({
          source:     "client",
          errorType:  "api_5xx",
          message:    `HTTP ${response.status} ${response.statusText || "Error"}`,
          url,
          statusCode: response.status,
          meta:       { method },
        });
      }
      return response;
    };
  }

  private flush(payload: ErrorReportPayload): void {
    try {
      const body = JSON.stringify(payload);
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const sent = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
        if (sent) return;
      }
      void fetch(ENDPOINT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => this.enqueue(payload));
    } catch {
      this.enqueue(payload);
    }
  }

  private enqueue(payload: ErrorReportPayload): void {
    if (this.queue.length >= MAX_QUEUE) this.queue.shift();
    this.queue.push(payload);
  }
}

export const errorTracker = new ErrorTracker();
