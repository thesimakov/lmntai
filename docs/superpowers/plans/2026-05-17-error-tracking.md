# Error Tracking System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture all user-facing errors (client JS, server API, AI stream) into a new `ErrorLog` DB table and surface them in a new `/admin/errors` page accessible only to ADMIN-role users.

**Architecture:** New `ErrorLog` Prisma model stores errors from all sources. Client errors go through `POST /api/errors/report` via `sendBeacon`/`fetch keepalive`; server uncaught exceptions are written directly to Prisma by `withErrorLog()` wrapper. Admin reads via server-rendered page backed by `GET /api/admin/errors`.

**Tech Stack:** Next.js 15 App Router, Prisma ORM, Zod, Vitest, Tailwind CSS, shadcn/ui (Radix)

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `lib/error-tracker-types.ts` | Shared types + module detection |
| `lib/error-log-db.ts` | Prisma write helpers (`logClientError`, `logServerError`) |
| `lib/error-tracker.ts` | Client singleton (`window.onerror`, fetch interceptor, queue) |
| `lib/with-error-log.ts` | Server route wrapper that catches + logs unhandled exceptions |
| `components/error-boundary.tsx` | React ErrorBoundary class component |
| `app/api/errors/report/route.ts` | `POST` endpoint (no auth, IP rate-limited) |
| `app/api/admin/errors/route.ts` | `GET` paginated list (ADMIN only) |
| `app/api/admin/errors/[id]/route.ts` | `PATCH` resolve toggle (ADMIN only) |
| `app/admin/errors/page.tsx` | Server component admin page |
| `components/admin/error-log-table.tsx` | Client table with accordion row detail |
| `components/admin/error-log-filters.tsx` | Filter bar (source, type, module, status) |

### Modified files
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `ErrorLog` model + `User.errorLogs` back-relation |
| `lib/admin-rules.ts` | Add `"errors"` to `AdminSectionId` + `ADMIN_SECTION_RULES` |
| `components/providers.tsx` | Add `useEffect` to call `errorTracker.init()` |
| `app/api/generate-stream/route.ts` | Wrap handler with `withErrorLog` |

---

### Task 1: DB Schema — Add ErrorLog model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ErrorLog model to schema**

Open `prisma/schema.prisma`. At the very end of the file, append:

```prisma
model ErrorLog {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  source      String
  errorType   String
  module      String?

  message     String   @db.Text
  stack       String?  @db.Text

  url         String?
  method      String?
  statusCode  Int?

  userAgent   String?
  viewport    String?
  ip          String?

  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  meta        Json?

  resolved    Boolean  @default(false)
  resolvedAt  DateTime?

  @@index([createdAt])
  @@index([source, createdAt])
  @@index([errorType, createdAt])
  @@index([userId, createdAt])
  @@index([resolved, createdAt])
}
```

Also find `model User {` in the file and add inside it (alongside other relation fields):

```prisma
  errorLogs      ErrorLog[]
```

- [ ] **Step 2: Run migration**

```bash
npm run prisma:migrate
```

When prompted for migration name, enter: `add_error_log`

Expected: new migration file in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ErrorLog prisma model for platform error tracking"
```

---

### Task 2: Types — error-tracker-types.ts

**Files:**
- Create: `lib/error-tracker-types.ts`
- Create: `lib/error-tracker-types.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/error-tracker-types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  ERROR_SOURCES,
  ERROR_TYPES,
  detectModule,
  type ErrorSource,
  type ErrorReportPayload,
} from "./error-tracker-types";

describe("ERROR_SOURCES", () => {
  it("contains client, server, ai", () => {
    expect(ERROR_SOURCES).toContain("client");
    expect(ERROR_SOURCES).toContain("server");
    expect(ERROR_SOURCES).toContain("ai");
  });
});

describe("ERROR_TYPES", () => {
  it("contains all expected types", () => {
    expect(ERROR_TYPES).toContain("js_exception");
    expect(ERROR_TYPES).toContain("unhandled_rejection");
    expect(ERROR_TYPES).toContain("api_5xx");
    expect(ERROR_TYPES).toContain("form_action");
    expect(ERROR_TYPES).toContain("ai_stream");
  });
});

describe("detectModule", () => {
  it("detects zero_block_editor before box_editor (prefix ordering)", () => {
    expect(detectModule("/playground/box/editor/zero?blockId=123")).toBe("zero_block_editor");
  });

  it("detects build_editor", () => {
    expect(detectModule("/playground/build")).toBe("build_editor");
  });

  it("detects box_editor from /playground/box", () => {
    expect(detectModule("/playground/box")).toBe("box_editor");
  });

  it("detects cms", () => {
    expect(detectModule("/playground/cms/some-page")).toBe("cms");
  });

  it("detects admin from nested path", () => {
    expect(detectModule("/admin/users")).toBe("admin");
  });

  it("detects auth from /login", () => {
    expect(detectModule("/login")).toBe("auth");
  });

  it("falls back to dashboard for unknown paths", () => {
    expect(detectModule("/billing/upgrade")).toBe("dashboard");
  });

  it("strips query string before matching", () => {
    expect(detectModule("/playground/build?projectId=123")).toBe("build_editor");
  });
});

describe("ErrorReportPayload shape", () => {
  it("accepts minimal payload", () => {
    const payload: ErrorReportPayload = {
      source: "client",
      errorType: "js_exception",
      message: "Something broke",
    };
    expect(payload.source).toBe("client");
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
npx vitest run lib/error-tracker-types.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Create lib/error-tracker-types.ts**

```typescript
export const ERROR_SOURCES = ["client", "server", "ai"] as const;
export type ErrorSource = (typeof ERROR_SOURCES)[number];

export const ERROR_TYPES = [
  "js_exception",
  "unhandled_rejection",
  "api_5xx",
  "form_action",
  "ai_stream",
] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

export type ErrorReportPayload = {
  source: ErrorSource;
  errorType: ErrorType;
  module?: string;
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  viewport?: string;
  meta?: Record<string, unknown>;
};

// Priority-ordered: first matching prefix wins.
const MODULE_PATHS: [string, string][] = [
  ["/playground/box/editor/zero", "zero_block_editor"],
  ["/playground/build",           "build_editor"],
  ["/playground/box",             "box_editor"],
  ["/playground/cms",             "cms"],
  ["/playground/puck",            "puck"],
  ["/admin",                      "admin"],
  ["/login",                      "auth"],
  ["/forgot-password",            "auth"],
  ["/reset-password",             "auth"],
];

export function detectModule(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;
  for (const [prefix, module] of MODULE_PATHS) {
    if (path.startsWith(prefix)) return module;
  }
  return "dashboard";
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
npx vitest run lib/error-tracker-types.test.ts
```

Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/error-tracker-types.ts lib/error-tracker-types.test.ts
git commit -m "feat: add error tracker types and detectModule helper"
```

---

### Task 3: DB helpers — error-log-db.ts

**Files:**
- Create: `lib/error-log-db.ts`

- [ ] **Step 1: Create lib/error-log-db.ts**

```typescript
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request-log";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";
import type { ErrorReportPayload } from "@/lib/error-tracker-types";

const STACK_MAX = 8_000;
const MSG_MAX   = 1_000;
const URL_MAX   = 500;
const UA_MAX    = 300;

function trunc(s: string | null | undefined, max: number): string | undefined {
  if (!s) return undefined;
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

async function resolveUserId(req: Request): Promise<string | undefined> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return undefined;
  try {
    const token = await getToken({ req: req as NextRequest, secret });
    const id = token?.userId ?? token?.sub;
    return typeof id === "string" ? id : undefined;
  } catch {
    return undefined;
  }
}

export async function logClientError(
  payload: ErrorReportPayload,
  req: Request,
): Promise<void> {
  const userId = await resolveUserId(req);
  try {
    await prisma.errorLog.create({
      data: {
        source:     payload.source,
        errorType:  payload.errorType,
        module:     payload.module,
        message:    trunc(payload.message, MSG_MAX) ?? "Unknown error",
        stack:      trunc(payload.stack, STACK_MAX),
        url:        trunc(payload.url, URL_MAX),
        method:     payload.method,
        statusCode: payload.statusCode,
        userAgent:  trunc(req.headers.get("user-agent"), UA_MAX),
        viewport:   payload.viewport,
        ip:         getClientIp(req),
        userId,
        meta:       payload.meta as object | undefined,
      },
    });
  } catch (e) {
    console.error("[error-log-db] write failed:", unknownToErrorMessage(e));
  }
}

export async function logServerError(
  err: unknown,
  req: Request,
  extra?: { module?: string; meta?: Record<string, unknown> },
): Promise<void> {
  const message = unknownToErrorMessage(err);
  const stack   = err instanceof Error ? err.stack : undefined;
  try {
    await prisma.errorLog.create({
      data: {
        source:     "server",
        errorType:  "api_5xx",
        module:     extra?.module,
        message:    trunc(message, MSG_MAX) ?? "Unknown error",
        stack:      trunc(stack, STACK_MAX),
        url:        trunc(req.url, URL_MAX),
        method:     req.method,
        statusCode: 500,
        userAgent:  trunc(req.headers.get("user-agent"), UA_MAX),
        ip:         getClientIp(req),
        meta:       extra?.meta as object | undefined,
      },
    });
  } catch (e) {
    console.error("[error-log-db] server write failed:", unknownToErrorMessage(e));
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/error-log-db.ts
git commit -m "feat: add error-log-db Prisma write helpers (logClientError, logServerError)"
```

---

### Task 4: Report API endpoint

**Files:**
- Create: `app/api/errors/report/route.ts`

- [ ] **Step 1: Create app/api/errors/report/route.ts**

```typescript
import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiOk, apiError } from "@/lib/api-response";
import { logClientError } from "@/lib/error-log-db";
import { ERROR_SOURCES, ERROR_TYPES } from "@/lib/error-tracker-types";

// In-memory sliding-window rate limiter: 30 req/min per IP.
const ipWindows = new Map<string, number[]>();
const RATE_LIMIT  = 30;
const WINDOW_MS   = 60_000;

function isRateLimited(ip: string): boolean {
  const now    = Date.now();
  const cutoff = now - WINDOW_MS;
  const prev   = (ipWindows.get(ip) ?? []).filter((t) => t > cutoff);
  if (prev.length >= RATE_LIMIT) return true;
  ipWindows.set(ip, [...prev, now]);
  return false;
}

const ReportBody = z.object({
  source:     z.enum(ERROR_SOURCES),
  errorType:  z.enum(ERROR_TYPES),
  module:     z.string().max(64).optional(),
  message:    z.string().max(1000),
  stack:      z.string().max(8000).optional(),
  url:        z.string().max(500).optional(),
  method:     z.string().max(10).optional(),
  statusCode: z.number().int().optional(),
  viewport:   z.string().max(20).optional(),
  meta:       z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) return apiError("Too many requests", 429);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const result = ReportBody.safeParse(raw);
  if (!result.success) return apiError("Invalid payload", 400);

  await logClientError(result.data, req);

  return apiOk({});
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/errors/report/route.ts
git commit -m "feat: add POST /api/errors/report with IP rate limiting"
```

---

### Task 5: Server wrapper — with-error-log.ts

**Files:**
- Create: `lib/with-error-log.ts`

- [ ] **Step 1: Create lib/with-error-log.ts**

The wrapper is composable with the existing `withApiLogging`. Apply it as the *inner* wrapper so `withApiLogging` still records status=500 in `RequestLog`.

```typescript
import type { NextRequest } from "next/server";

import { apiError } from "@/lib/api-response";
import { logServerError } from "@/lib/error-log-db";

// Matches the generic context shape Next.js App Router passes to route handlers.
type AnyCtx = { params: Promise<Record<string, string | string[]>> };

export function withErrorLog(
  module: string,
  handler: (req: NextRequest, ctx: AnyCtx) => Promise<Response>,
): (req: NextRequest, ctx: AnyCtx) => Promise<Response> {
  return async (req: NextRequest, ctx: AnyCtx): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      await logServerError(err, req, { module });
      return apiError("Internal Server Error", 500);
    }
  };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/with-error-log.ts
git commit -m "feat: add withErrorLog server route wrapper"
```

---

### Task 6: Client tracker — error-tracker.ts

**Files:**
- Create: `lib/error-tracker.ts`
- Create: `lib/error-tracker.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/error-tracker.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildPayload } from "./error-tracker";

describe("buildPayload", () => {
  it("truncates message longer than 1000 chars", () => {
    const long = "x".repeat(2000);
    const p = buildPayload({ source: "client", errorType: "js_exception", message: long });
    expect(p.message.length).toBeLessThanOrEqual(1000);
    expect(p.message.endsWith("…")).toBe(true);
  });

  it("truncates stack longer than 8000 chars", () => {
    const stack = "s".repeat(10_000);
    const p = buildPayload({ source: "client", errorType: "js_exception", message: "e", stack });
    expect((p.stack ?? "").length).toBeLessThanOrEqual(8000);
  });

  it("leaves short messages unchanged", () => {
    const p = buildPayload({ source: "server", errorType: "api_5xx", message: "short" });
    expect(p.message).toBe("short");
  });

  it("preserves source and errorType", () => {
    const p = buildPayload({ source: "ai", errorType: "ai_stream", message: "stream broke" });
    expect(p.source).toBe("ai");
    expect(p.errorType).toBe("ai_stream");
  });

  it("passes meta through", () => {
    const meta = { aiModel: "claude-opus-4-7", sandboxId: "sb_abc" };
    const p = buildPayload({ source: "ai", errorType: "ai_stream", message: "e", meta });
    expect(p.meta).toEqual(meta);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
npx vitest run lib/error-tracker.test.ts
```

Expected: FAIL — `buildPayload` not found.

- [ ] **Step 3: Create lib/error-tracker.ts**

```typescript
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
    ? `${input.message.slice(0, MSG_MAX)}…`
    : input.message;
  const stack = input.stack && input.stack.length > STACK_MAX
    ? `${input.stack.slice(0, STACK_MAX)}…`
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
```

- [ ] **Step 4: Run test — verify PASS**

```bash
npx vitest run lib/error-tracker.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/error-tracker.ts lib/error-tracker.test.ts
git commit -m "feat: add client ErrorTracker singleton with fetch interceptor and error queue"
```

---

### Task 7: React ErrorBoundary

**Files:**
- Create: `components/error-boundary.tsx`

- [ ] **Step 1: Create components/error-boundary.tsx**

```tsx
"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { errorTracker } from "@/lib/error-tracker";

type Props = {
  children: ReactNode;
  componentName?: string;
};

type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    errorTracker.report({
      source:    "client",
      errorType: "js_exception",
      message:   error.message || error.name || "React render error",
      stack:     error.stack,
      meta: {
        component:      this.props.componentName,
        componentStack: info.componentStack?.slice(0, 2000),
      },
    });
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/error-boundary.tsx
git commit -m "feat: add React ErrorBoundary that silently reports to ErrorTracker"
```

---

### Task 8: Wire ErrorTracker into Providers

**Files:**
- Modify: `components/providers.tsx`

- [ ] **Step 1: Add imports**

Open `components/providers.tsx`. Find the existing imports block and add `useEffect` to the React import. Since there is no React import yet (only named imports), add a new line after the `"use client"` directive:

```typescript
import { useEffect } from "react";
```

Also add the ErrorTracker import after the existing local imports:

```typescript
import { errorTracker } from "@/lib/error-tracker";
```

- [ ] **Step 2: Add init call inside Providers function**

Find the `Providers` function body. Add before the `return` statement:

```typescript
  useEffect(() => {
    errorTracker.init();
  }, []);
```

The full function signature + first lines become:

```tsx
export function Providers({ children, initialLang, session }: ProvidersProps) {
  const isProd = process.env.NODE_ENV === "production";

  useEffect(() => {
    errorTracker.init();
  }, []);

  return (
    <SessionProvider
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/providers.tsx
git commit -m "feat: initialize ErrorTracker in root Providers on mount"
```

---

### Task 9: Admin navigation — add Errors section

**Files:**
- Modify: `lib/admin-rules.ts`

- [ ] **Step 1: Extend AdminSectionId type**

Open `lib/admin-rules.ts`. Find:

```typescript
export type AdminSectionId = "users" | "tariffs" | "promocodes" | "team" | "settings";
```

Replace with:

```typescript
export type AdminSectionId = "users" | "tariffs" | "promocodes" | "team" | "settings" | "errors";
```

- [ ] **Step 2: Add errors entry to ADMIN_SECTION_RULES**

Find `ADMIN_SECTION_RULES` array. Add before the closing `]`:

```typescript
  { id: "errors", href: "/admin/errors", label: "Ошибки", superOnly: true },
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/admin-rules.ts
git commit -m "feat: add Errors section to admin panel navigation (ADMIN only)"
```

---

### Task 10: Admin API — list and resolve

**Files:**
- Create: `app/api/admin/errors/route.ts`
- Create: `app/api/admin/errors/[id]/route.ts`

- [ ] **Step 1: Create GET /api/admin/errors**

Create `app/api/admin/errors/route.ts`:

```typescript
import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiOk, apiGuardError } from "@/lib/api-response";
import { requireAdminUser } from "@/lib/auth-guards";
import { parseQuery } from "@/lib/api-schemas";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

const ListQuery = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(50),
  source:    z.string().optional(),
  errorType: z.string().optional(),
  module:    z.string().optional(),
  resolved:  z.enum(["true", "false"]).optional(),
  from:      z.string().optional(),
  to:        z.string().optional(),
});

async function getAdminErrors(req: NextRequest) {
  const guard = await requireAdminUser();
  if (!guard.ok) return apiGuardError(guard);

  const q = parseQuery(req.nextUrl.searchParams, ListQuery);
  if (!q.ok) return q.response;

  const { page, limit, source, errorType, module: mod, resolved, from, to } = q.data;

  const where = {
    ...(source    ? { source }      : {}),
    ...(errorType ? { errorType }   : {}),
    ...(mod       ? { module: mod } : {}),
    ...(resolved !== undefined
      ? { resolved: resolved === "true" }
      : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.errorLog.count({ where }),
    prisma.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      include: { user: { select: { id: true, email: true } } },
    }),
  ]);

  return apiOk({ items, total, page, limit });
}

export const GET = withApiLogging("/api/admin/errors", getAdminErrors);
```

- [ ] **Step 2: Create PATCH /api/admin/errors/[id]**

Create `app/api/admin/errors/[id]/route.ts`:

```typescript
import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiOk, apiError, apiGuardError } from "@/lib/api-response";
import { requireAdminUser } from "@/lib/auth-guards";
import { parseBody } from "@/lib/api-schemas";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/with-api-logging";

const PatchBody = z.object({
  resolved: z.boolean(),
});

async function patchAdminError(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminUser();
  if (!guard.ok) return apiGuardError(guard);

  const { id } = await ctx.params;

  const body = await parseBody(req, PatchBody);
  if (!body.ok) return body.response;

  const existing = await prisma.errorLog.findUnique({ where: { id } });
  if (!existing) return apiError("Not found", 404);

  const updated = await prisma.errorLog.update({
    where: { id },
    data: {
      resolved:   body.data.resolved,
      resolvedAt: body.data.resolved ? new Date() : null,
    },
  });

  return apiOk({ item: updated });
}

export const PATCH = withApiLogging("/api/admin/errors/[id]", patchAdminError);
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/errors/
git commit -m "feat: add GET /api/admin/errors and PATCH /api/admin/errors/[id]"
```

---

### Task 11: Admin UI components

**Files:**
- Create: `components/admin/error-log-filters.tsx`
- Create: `components/admin/error-log-table.tsx`

- [ ] **Step 1: Create error-log-filters.tsx**

Create `components/admin/error-log-filters.tsx`:

```tsx
"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SOURCES     = ["client", "server", "ai"] as const;
const ERROR_TYPES = [
  "js_exception",
  "unhandled_rejection",
  "api_5xx",
  "form_action",
  "ai_stream",
] as const;

export function ErrorLogFilters() {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== "all") {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Источник</Label>
        <Select
          value={params.get("source") ?? "all"}
          onValueChange={(v) => update("source", v)}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="Все" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">Тип</Label>
        <Select
          value={params.get("errorType") ?? "all"}
          onValueChange={(v) => update("errorType", v)}
        >
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Все" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {ERROR_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">Модуль</Label>
        <Input
          className="h-8 w-36 text-xs"
          placeholder="cms, build_editor…"
          defaultValue={params.get("module") ?? ""}
          onBlur={(e) => update("module", e.target.value || null)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">Статус</Label>
        <Select
          value={params.get("resolved") ?? "false"}
          onValueChange={(v) => update("resolved", v)}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Открытые</SelectItem>
            <SelectItem value="true">Разобранные</SelectItem>
            <SelectItem value="all">Все</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs"
        onClick={() => router.push(pathname)}
      >
        Сбросить
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create error-log-table.tsx**

Create `components/admin/error-log-table.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import type { Prisma } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorLogWithUser = Prisma.ErrorLogGetPayload<{
  include: { user: { select: { id: true; email: true } } };
}>;

type Props = {
  items: ErrorLogWithUser[];
  total: number;
  page:  number;
  limit: number;
};

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString("ru-RU", {
    day:    "2-digit",
    month:  "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

function trunc(s: string | null | undefined, max: number): string {
  if (!s) return "—";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function SourceBadge({ source }: { source: string }) {
  const cls =
    source === "client" ? "bg-blue-100 text-blue-700"
    : source === "server" ? "bg-red-100 text-red-700"
    : "bg-purple-100 text-purple-700";
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", cls)}>{source}</span>
  );
}

function ErrorRow({ item }: { item: ErrorLogWithUser }) {
  const [open,     setOpen]     = useState(false);
  const [resolved, setResolved] = useState(item.resolved);
  const [pending,  startTrans]  = useTransition();

  const toggleResolved = () => {
    startTrans(async () => {
      const res = await fetch(`/api/admin/errors/${item.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ resolved: !resolved }),
      });
      if (res.ok) setResolved((p) => !p);
    });
  };

  return (
    <>
      <tr
        className="cursor-pointer border-b hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(item.createdAt)}
        </td>
        <td className="px-3 py-2">
          <SourceBadge source={item.source} />
        </td>
        <td className="px-3 py-2 text-xs">{item.errorType}</td>
        <td className="px-3 py-2 text-xs text-muted-foreground">{item.module ?? "—"}</td>
        <td className="px-3 py-2 text-xs max-w-xs">{trunc(item.message, 80)}</td>
        <td className="px-3 py-2 text-xs text-muted-foreground">
          {item.user?.email ?? "—"}
        </td>
      </tr>
      {open && (
        <tr className="border-b bg-muted/20">
          <td colSpan={6} className="px-4 py-3 text-xs">
            <div className="space-y-3">
              {item.stack && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Stack trace</p>
                  <pre className="whitespace-pre-wrap break-all font-mono text-[11px] bg-muted p-2 rounded max-h-48 overflow-auto">
                    {item.stack}
                  </pre>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {item.url       && <div><span className="text-muted-foreground">URL: </span>{item.url}</div>}
                {item.ip        && <div><span className="text-muted-foreground">IP: </span>{item.ip}</div>}
                {item.viewport  && <div><span className="text-muted-foreground">Viewport: </span>{item.viewport}</div>}
                {item.userAgent && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">UA: </span>{item.userAgent}
                  </div>
                )}
              </div>
              {item.meta && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Meta</p>
                  <pre className="whitespace-pre-wrap font-mono text-[11px] bg-muted p-2 rounded max-h-32 overflow-auto">
                    {JSON.stringify(item.meta, null, 2)}
                  </pre>
                </div>
              )}
              <Button
                size="sm"
                variant={resolved ? "outline" : "default"}
                disabled={pending}
                onClick={(e) => { e.stopPropagation(); toggleResolved(); }}
              >
                {resolved ? "Снять отметку" : "✓ Разобрано"}
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ErrorLogTable({ items, total, page, limit }: Props) {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Всего: {total.toLocaleString("ru-RU")}
      </p>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Время</th>
              <th className="px-3 py-2 text-left font-medium">Источник</th>
              <th className="px-3 py-2 text-left font-medium">Тип</th>
              <th className="px-3 py-2 text-left font-medium">Модуль</th>
              <th className="px-3 py-2 text-left font-medium">Сообщение</th>
              <th className="px-3 py-2 text-left font-medium">Пользователь</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Ошибок не найдено
                </td>
              </tr>
            ) : (
              items.map((item) => <ErrorRow key={item.id} item={item} />)
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          Страница {page} / {totalPages}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/admin/error-log-filters.tsx components/admin/error-log-table.tsx
git commit -m "feat: add admin ErrorLogTable and ErrorLogFilters UI components"
```

---

### Task 12: Admin Page

**Files:**
- Create: `app/admin/errors/page.tsx`

- [ ] **Step 1: Create app/admin/errors/page.tsx**

```tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ErrorLogFilters } from "@/components/admin/error-log-filters";
import { ErrorLogTable } from "@/components/admin/error-log-table";
import { requireAdminUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminErrorsPage({ searchParams }: PageProps) {
  const g = await requireAdminUser();
  if (!g.ok) redirect(g.status === 401 ? "/" : "/playground");

  const sp = await searchParams;
  const page  = Math.max(1, Number(sp.page  ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(sp.limit ?? "50")));

  // Default: show unresolved errors only.
  const resolved =
    sp.resolved === "true"  ? true
    : sp.resolved === "false" ? false
    : sp.resolved === "all"   ? undefined
    : false;

  const where = {
    ...(sp.source    ? { source:    sp.source }    : {}),
    ...(sp.errorType ? { errorType: sp.errorType } : {}),
    ...(sp.module    ? { module:    sp.module }    : {}),
    ...(resolved !== undefined ? { resolved } : {}),
    ...(sp.from || sp.to
      ? {
          createdAt: {
            ...(sp.from ? { gte: new Date(sp.from) } : {}),
            ...(sp.to   ? { lte: new Date(sp.to)   } : {}),
          },
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.errorLog.count({ where }),
    prisma.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      include: { user: { select: { id: true, email: true } } },
    }),
  ]);

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">Ошибки платформы</h1>

      <Suspense>
        <ErrorLogFilters />
      </Suspense>

      <ErrorLogTable items={items} total={total} page={page} limit={limit} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/errors/page.tsx
git commit -m "feat: add /admin/errors server page with filter and table"
```

---

### Task 13: Wrap high-traffic server route

**Files:**
- Modify: `app/api/generate-stream/route.ts`

- [ ] **Step 1: Add withErrorLog to generate-stream**

Open `app/api/generate-stream/route.ts`. Add import after existing imports:

```typescript
import { withErrorLog } from "@/lib/with-error-log";
```

Find the last export line:

```typescript
export const POST = withApiLogging("/api/generate-stream", postGenerateStream);
```

Replace with:

```typescript
export const POST = withApiLogging(
  "/api/generate-stream",
  withErrorLog("build_editor", postGenerateStream),
);
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/generate-stream/route.ts
git commit -m "feat: wrap /api/generate-stream with withErrorLog"
```

---

### Task 14: Final verification

- [ ] **Step 1: Full type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors across all files.

- [ ] **Step 2: Full test suite**

```bash
npm test
```

Expected: all existing tests pass, new tests pass, no regressions.

- [ ] **Step 3: Smoke test (manual)**

```bash
npm run dev
```

Open browser → DevTools console → paste:

```javascript
window.dispatchEvent(new ErrorEvent("error", {
  error: new Error("smoke test error"),
  message: "smoke test error"
}));
```

Check Network tab: `POST /api/errors/report` returns 200.

Navigate to `http://localhost:3001/admin/errors` (log in as ADMIN first).

Expected: smoke test error appears in the table with source=`client`, type=`js_exception`.

- [ ] **Step 4: Verify admin navigation**

Navigate to `http://localhost:3001/admin`. Confirm "Ошибки" appears in the left sidebar.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete error tracking system

Platform-wide error collection with ErrorLog DB table,
client tracker, server wrapper, and /admin/errors UI."
```
