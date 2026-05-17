# Error Tracking System — Design Spec

**Date:** 2026-05-17  
**Status:** Approved  
**Scope:** Platform-wide error collection → admin panel `/admin/errors`

---

## Overview

Collect all user-facing errors across every module of the Lemnity platform (client JS exceptions, unhandled promise rejections, API 5xx, form action failures, AI stream errors) and surface them in a new admin panel section accessible only to ADMIN-role users.

Errors are silently logged — no UI disruption for end users.

---

## Architecture

```
Client side
  window.onerror               ─┐
  window.unhandledrejection    ─┤
  React ErrorBoundary          ─┤──> ErrorTracker.report() ──> POST /api/errors/report
  fetch interceptor (4xx/5xx)  ─┤                               (sendBeacon / keepalive)
  SSE AI stream errors         ─┘

Server side
  withErrorLog() wrapper ──────────> prisma.errorLog.create() (direct, no HTTP round-trip)
```

`ErrorTracker` is a singleton initialized once in `<Providers>`. It buffers up to 20 events in memory when the network is unavailable, draining on recovery.

---

## Database

New Prisma model added to `prisma/schema.prisma`:

```prisma
model ErrorLog {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  source      String   // "client" | "server" | "ai"
  errorType   String   // "js_exception" | "unhandled_rejection" | "api_5xx" | "form_action" | "ai_stream"
  module      String?  // "build_editor" | "box_editor" | "cms" | "puck" | "auth" | "admin" | ...

  message     String   @db.Text
  stack       String?  @db.Text

  url         String?
  method      String?
  statusCode  Int?

  userAgent   String?
  viewport    String?  // "1920x1080"
  ip          String?

  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  meta        Json?    // { component, action, aiModel, sandboxId, siteId, ... }

  resolved    Boolean  @default(false)
  resolvedAt  DateTime?

  @@index([createdAt])
  @@index([source, createdAt])
  @@index([errorType, createdAt])
  @@index([userId, createdAt])
  @@index([resolved, createdAt])
}
```

Migration: `npm run prisma:migrate` creates `20260517_add_error_log`.

`User` model gains a `errorLogs ErrorLog[]` relation field.

---

## New Files

| File | Purpose |
|---|---|
| `lib/error-tracker.ts` | Singleton client-side error collector |
| `lib/error-tracker-types.ts` | Shared types: `ErrorSource`, `ErrorType`, `ErrorReportPayload` |
| `lib/with-error-log.ts` | Server-side wrapper for API route handlers |
| `lib/error-log-db.ts` | `logServerError()` and `logClientError()` — Prisma write helpers |
| `app/api/errors/report/route.ts` | `POST /api/errors/report` — receives client errors |
| `app/api/admin/errors/route.ts` | `GET /api/admin/errors` — paginated list with filters |
| `app/api/admin/errors/[id]/route.ts` | `PATCH` — mark as resolved |
| `app/admin/errors/page.tsx` | Admin page: error log table |
| `components/admin/error-log-table.tsx` | Table component with accordion row detail |
| `components/admin/error-log-filters.tsx` | Filter bar (source, type, module, date range) |
| `components/error-boundary.tsx` | React ErrorBoundary that reports to ErrorTracker |

---

## Client-Side Collector (`lib/error-tracker.ts`)

```typescript
class ErrorTracker {
  private queue: ErrorReportPayload[] = [];
  private MAX_QUEUE = 20;

  init(): void   // attach window.onerror, unhandledrejection listeners
  report(payload: ErrorReportPayload): void
  interceptFetch(): void  // monkey-patch global fetch to catch 4xx/5xx
  private flush(payload: ErrorReportPayload): void  // sendBeacon or fetch keepalive
  private enqueue(payload: ErrorReportPayload): void
  private drainQueue(): void
}

export const errorTracker = new ErrorTracker();
```

`init()` is called inside a `useEffect` in `<Providers>` (client component). `interceptFetch()` wraps `window.fetch` to detect responses with `status >= 400` (`!response.ok`) and call `report()` with `errorType: "api_5xx"`. 2xx and 3xx responses are not reported.

Module detection: inferred from `window.location.pathname` via a lookup table:
- `/playground/build` → `"build_editor"`
- `/playground/box` → `"box_editor"`
- `/playground/cms` → `"cms"`
- `/playground/puck` → `"puck"`
- `/admin` → `"admin"`
- `/` → `"dashboard"`

Stack traces are truncated to 8 000 characters before sending.

---

## React ErrorBoundary (`components/error-boundary.tsx`)

Class component wrapping `componentDidCatch`. Reports to `errorTracker.report()` with `source: "client"`, `errorType: "js_exception"`, component name in `meta.component`. Does NOT render a fallback UI by default — re-throws so Next.js `error.tsx` can handle display if needed. Used as a wrapper in layout files for each route group.

---

## AI Stream Error Integration

`lib/client-sse.ts` already manages the SSE connection. Add a call to `errorTracker.report()` in its `onerror` handler with:
```typescript
{ source: "ai", errorType: "ai_stream", meta: { aiModel, sandboxId } }
```
No structural changes to `client-sse.ts` — only the error handler extended.

---

## Server-Side Wrapper (`lib/with-error-log.ts`)

```typescript
export function withErrorLog(
  handler: (req: Request, ctx: RouteContext) => Promise<Response>
) {
  return async (req: Request, ctx: RouteContext): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      await logServerError(e, req);
      return apiError("Internal Server Error", 500);
    }
  };
}
```

`logServerError()` in `lib/error-log-db.ts` extracts session userId if present, writes to `ErrorLog` directly via Prisma. Does **not** use `POST /api/errors/report` to avoid HTTP round-trip on the server.

Wrapping existing route handlers is opt-in. Start with high-traffic routes: `/api/generate-stream`, `/api/box/[id]/*`, `/api/cms/sites/*`, `/api/sandbox/*`.

---

## API: `POST /api/errors/report`

No auth required. Protected by:
- Rate limiting: 30 req/min per IP (in-memory sliding window, reset on server restart)
- Max body size: 32 KB
- Zod validation

Request body:
```typescript
{
  source:     "client" | "server" | "ai"
  errorType:  "js_exception" | "unhandled_rejection" | "api_5xx" | "form_action" | "ai_stream"
  module?:    string (max 64)
  message:    string (max 1000)
  stack?:     string (max 8000)
  url?:       string (max 500)
  method?:    string (max 10)
  statusCode?: number
  viewport?:  string (max 20)
  meta?:      Record<string, unknown>
}
```

Server enriches with: `ip` (from `x-forwarded-for`), `userAgent` (from headers), `userId` (from NextAuth session if present).

Returns `200 {}` on success, `429` on rate limit, `400` on validation failure.

---

## API: `GET /api/admin/errors`

Requires ADMIN role via `requireAdmin()` guard.

Query params:
```
page=1&limit=50&source=client&errorType=js_exception&module=cms
&resolved=false&from=2025-01-01T00:00:00Z&to=2025-12-31T23:59:59Z
```

Response:
```typescript
{
  items: ErrorLog[]
  total: number
  page: number
  limit: number
}
```

## API: `PATCH /api/admin/errors/[id]`

Body: `{ resolved: boolean }`. Sets `resolved` and `resolvedAt` (or clears `resolvedAt` when unresolving).

---

## Admin UI (`app/admin/errors/page.tsx`)

Server component — fetches first page, passes to `<ErrorLogTable>` client component.

**Navigation:** New entry in `lib/admin-rules.ts`:
```typescript
{ id: "errors", href: "/admin/errors", label: "Ошибки", superOnly: true }
```

`AdminSectionId` type extended to include `"errors"`.

**Layout:**
- Header: "Ошибки платформы" + toggle "Показать разобранные"
- Filter bar: Source dropdown, Type dropdown, Module dropdown, date range picker, Reset button
- Table columns: Время | Источник | Тип | Модуль | Сообщение (truncated) | Пользователь
- Accordion row detail: full stack trace, meta JSON (pretty-printed), IP, user agent, viewport, [✓ Разобрано] button
- Pagination: 50 per page

All UI components follow existing admin patterns (same Radix/shadcn primitives as `components/admin/`).

---

## Module Detection Map

```typescript
const MODULE_PATHS: [string, string][] = [
  ["/playground/build",       "build_editor"],
  ["/playground/box/editor/zero", "zero_block_editor"],
  ["/playground/box",         "box_editor"],
  ["/playground/cms",         "cms"],
  ["/playground/puck",        "puck"],
  ["/admin",                  "admin"],
  ["/login",                  "auth"],
  ["/forgot-password",        "auth"],
  ["/reset-password",         "auth"],
];
```

Matched by `pathname.startsWith()` in priority order. Unmatched → `"dashboard"`.

---

## Error Handling & Edge Cases

- **Server restart flushes in-memory rate limit** — acceptable; limits are advisory.
- **`sendBeacon` unavailable** (e.g., older Safari) — falls back to `fetch({ keepalive: true })`.
- **Report endpoint itself throws** — swallowed silently by `ErrorTracker`; tracking must never crash the app.
- **Prisma unavailable on server** — `logServerError` wraps DB write in try/catch, logs to `console.error` instead; does not bubble to user.
- **Queue overflow** (>20 in-memory) — oldest entry dropped, `meta.__dropped: true` added to newest.

---

## Out of Scope

- Email/Slack alerting when error rate spikes (future iteration)
- Deduplication / fingerprinting (future iteration)  
- Error replay / session recording
- Frontend performance metrics (separate concern)
