# CLAUDE.md — Lemnity Dashboard

## Project Overview

**Lemnity** — production SaaS platform for AI-assisted website generation. Users can generate, edit and publish websites via a conversational AI interface or visual canvas editor.

**Tech stack:**
- **Framework**: Next.js 15 App Router, React 19, TypeScript (strict)
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui components
- **Database**: PostgreSQL + Prisma ORM (`prisma/schema.prisma`)
- **Auth**: NextAuth.js v4 with Prisma adapter (email/password, Google, GitHub, VK, Yandex)
- **Visual editor**: GrapesJS 0.22 (`components/playground/lemnity-box/`)
- **Drag-and-drop builder**: Puck (`@measured/puck`)
- **State management**: Zustand (stores in `lib/stores/`)
- **AI**: Anthropic Claude, OpenAI, Gemini, Groq — routed via RouterAI gateway
- **Sandboxes**: E2B or Docker (Lemnity AI) for code execution
- **Email**: NotiSend API (transactional), nodemailer (magic links)
- **Payments/billing**: Custom billing webhook (`lib/billing-webhook.ts`)
- **Testing**: Vitest
- **Package manager**: npm

---

## Common Commands

```bash
# Development
npm run dev            # prisma generate + next dev on :3001
npm run dev:clean      # rm -rf .next + dev (use when chunks are stale)

# Build & test
npm run build
npm run test
npm run test:watch
npx tsc --noEmit       # type-check without emitting

# Database
npm run db:setup       # docker compose up + wait + prisma migrate deploy
npm run db:reset       # full wipe + setup
npm run prisma:migrate # prisma migrate dev (creates new migration)
npm run prisma:studio  # Prisma Studio GUI

# Services
npm run builder:dev    # lemnity-builder upstream on :8787
npm run lemnity-ai:up  # docker stack for Lemnity AI sandbox
```

---

## Project Architecture

### App Routes (`app/`)

| Route group | Path | Description |
|---|---|---|
| `(dashboard)` | `/` | Projects list, settings, analytics, team, billing |
| `(builder)` | `/playground/*` | All editors: build, box, cms, puck, grid |
| `(marketing)` | landing, pricing | Public marketing pages |
| `admin` | `/admin/*` | Admin panel (role-gated) |
| `auth` | `/login`, `/forgot-password`, `/reset-password` | Auth pages |
| `share` | `/share/:id` | Public sandbox preview |

### Builder playground pages (`app/(builder)/playground/`)

| Page | Description |
|---|---|
| `build/page.tsx` | AI build editor — main conversation + sandbox view |
| `box/page.tsx` | Lemnity Box editor selector |
| `box/editor/page.tsx` | Lemnity Box visual canvas editor (GrapesJS) |
| `box/editor/zero/page.tsx` | Dedicated Zero Block editor page |
| `box/editor/zero/layout.tsx` | Standalone layout (no shared sidebar) |
| `cms/page.tsx` | CMS pages list |
| `cms/playground-cms-page-client.tsx` | Full CMS page editor (~2700 lines) |
| `puck/page.tsx` | Puck drag-and-drop editor |
| `grid-editor/` | Grid editor |

### API Routes (`app/api/`)

Key groups:
- `/api/auth/*` — NextAuth + custom forgot/reset password
- `/api/projects/*` — CRUD, export, subdomain check
- `/api/sandbox/*` — sandbox state, share, file access
- `/api/cms/sites/*` — CMS sites, pages, content types, entries, publishing
- `/api/headless/*` — Public headless CMS API
- `/api/public/*` — Unauthenticated endpoints (form submissions, etc.)
- `/api/generate-stream` — AI generation SSE stream
- `/api/billing/webhook` — billing events
- `/api/admin/*` — admin APIs (economics, users, promo codes, plan config)
- `/api/lemnity-ai/[...path]` — proxy to Lemnity AI upstream (also aliased `/api/manus/*`)
- `/api/team/*` — team invitations
- `/api/referrals/*` — referral wallet and earnings
- `/api/publish/*` — domain publish, resolve, provision

---

## Key Library Files (`lib/`)

### API layer
- `lib/api-response.ts` — `apiOk()`, `apiError()`, `apiGuardError()` — unified response helpers
- `lib/api-schemas.ts` — Zod schemas + `parseBody()` utility
- `lib/api-client/` — typed fetch client: `base.ts`, `cms.ts`, `projects.ts`, `sandbox.ts`, `share.ts`, `index.ts`
- `lib/auth-guards.ts` — `requireSession()`, `requireAdmin()`, etc. — always use in API routes
- `lib/with-api-logging.ts` — wrap handlers to log to `RequestLog`

### Database
- `lib/prisma.ts` — singleton Prisma client
- `lib/cms-core.ts` — CMS access guards: `requireCmsSiteAccess()`, `requireCmsContentTypeAccess()`
- `lib/sandbox-share-db.ts` — sandbox share read/write (use `prisma.$transaction()` for mutations)
- `lib/sandbox-project-state-db.ts` — sandbox file state persistence

### State management (`lib/stores/`)
- `use-build-editor-store.ts` — build editor (AI chat + sandbox) global state
- `use-cms-store.ts` — CMS editor global state
- `use-projects-store.ts` — projects list + refresh
- `use-sandbox-files-store.ts` — sandbox file tree state
- `use-share-store.ts` — share popover state

### Visual editor (GrapesJS)
- `lib/lemnity-box-editor-schema.ts` — `PageDocument` type, `emptyPageDocument()`
- `lib/lemnity-box-editor-persistence.ts` — `readLemnityBoxCanvasDraft()`, `writeLemnityBoxCanvasDraft()`
- `lib/lemnity-zero-block-session.ts` — Zero Block cross-page session (localStorage hand-off)

### Other
- `lib/billing-webhook.ts` — billing event processing
- `lib/token-billing.ts` / `lib/token-manager.ts` — token accounting
- `lib/pricing-billing.ts` / `lib/pricing-economics.ts` — tariff logic
- `lib/promo-service.ts` — promo code validation and application
- `lib/referrals.ts` / `lib/referral-wallet.ts` — referral system
- `lib/publish-domain.ts` / `lib/publish-host.ts` — domain publishing and TLS
- `lib/cms-form-submission-webhook-queue.ts` — async webhook delivery with logging
- `lib/unknown-error-message.ts` — `unknownToErrorMessage()` for safe catch blocks
- `lib/utils.ts` — `cn()` classnames util

---

## GrapesJS / Lemnity Box Editor

All visual editor code lives in `components/playground/lemnity-box/`.

### Key files

| File | Role |
|---|---|
| `lemnity-box-canvas-editor.tsx` | Core editor (~1500 lines): GrapesJS init, all plugins, Zero Block runtime |
| `lemnity-box-visual-editor.tsx` | Thin wrapper with `forwardRef` — use this in pages |
| `lemnity-box-block-library-flyout.tsx` | Left-side block picker panel |
| `lemnity-box-image-library-modal.tsx` | Image picker modal |
| `lemnity-box-device-dock-menu.ts` | Device switch (desktop/tablet/phone) |
| `lemnity-box-block-registry.ts` | GrapesJS block definitions |
| `lemnity-box-*-blocks-content.ts` | HTML templates for block categories |

### Zero Block system

Zero Blocks are `<section class="lemnity-zero-block" data-ln-zero-id="zb_xxx">` elements that allow free absolute positioning inside.

**Flow: main editor → dedicated editor → back**

1. User clicks "Редактировать" on a zero block → `handleOpenZeroBlockEditor(blockId)` in `box/editor/page.tsx`
2. Canvas snapshot is flushed via `canvasRef.current?.flushCanvasSnapshot()`
3. `startZeroBlockSession()` writes session to `localStorage` (`lemnity.zero-block.session`)
4. Router navigates to `/playground/box/editor/zero?blockId=...`
5. Zero editor page reads session, initializes canvas with just that section's HTML/CSS
6. On save: `commitZeroBlockEdit()` patches the full canvas draft in localStorage, optionally saves to CMS API / sandbox
7. Router returns to `returnUrl?zeroBlockSaved={blockId}`
8. `useEffect` in `box/editor/page.tsx` detects `zeroBlockSaved` param, increments `canvasKey` to remount canvas (picks up patched draft)

**Key props on `LemnityBoxVisualEditor`:**
- `onOpenZeroBlockEditor?: (blockId: string) => void` — called when user clicks "Редактировать"
- `autoActivateZeroBlock?: boolean` — auto-enters editing mode for first zero block on load (used in zero editor page)

---

## Database Schema (Prisma)

### Core models

| Model | Purpose |
|---|---|
| `Project` | Root container: links to all user data. Has `preferredEditor` (`build`/`box`) |
| `SandboxShare` | Public share link for sandbox preview |
| `SandboxProjectState` | Sandbox file state snapshot |
| `PublishDomainBinding` | Custom domain → project binding |
| `User` | Auth user: email, passwordHash, role, tokenBalance, plan |
| `UserVirtualWorkspace` / `UserVirtualEntry` | Virtual file storage |

### CMS models

| Model | Purpose |
|---|---|
| `CmsSite` | CMS site (1:1 with Project) |
| `CmsSiteMember` | CMS access control |
| `CmsPage` / `CmsPageRevision` | Pages with revision history |
| `CmsContentType` / `CmsContentField` | Headless CMS schema |
| `CmsEntry` / `CmsEntryVersion` | CMS content with versioning |
| `CmsMediaAsset` | Uploaded media |
| `CmsPublishJob` | Async publish jobs |
| `CmsFormSubmission` | Form submission records |
| `WebhookDeliveryLog` | Webhook delivery attempts and retry state |

### Billing/referrals

| Model | Purpose |
|---|---|
| `TokenUsageLog` | Per-request token usage |
| `PlatformPlanSettings` | Global plan config |
| `PromoCode` | Promo codes |
| `ReferralWallet` / `ReferralEarning` / `ReferralWalletEntry` | Referral system |
| `WithdrawalRequest` | Referral payouts |
| `ProjectActionLog` | Audit log (used for billing events) |

### Auth/team

| Model | Purpose |
|---|---|
| `Account` | OAuth provider accounts (NextAuth) |
| `Session` | Active sessions (NextAuth) |
| `PasswordResetToken` | Password reset flow |
| `TeamInvitation` | Team member invitations |
| `RequestLog` / `AuthEventLog` | Request and auth event logs |

---

## Authentication & Guards

Always use auth guards in API routes — never access session directly:

```typescript
import { requireSession } from "@/lib/auth-guards";

export async function GET(req: Request) {
  const guard = await requireSession(req);
  if (guard.status !== 200) return apiGuardError(guard);
  const { session } = guard;
  // ...
}
```

Available guards: `requireSession()`, `requireAdmin()`, `requireProjectAccess(projectId, userId)`, `requireCmsSiteAccess(siteId, userId)`, `requireCmsContentTypeAccess(siteId, typeId, userId)`.

---

## API Response Format

Always use helpers from `lib/api-response.ts`:

```typescript
import { apiOk, apiError, apiGuardError } from "@/lib/api-response";

return apiOk({ data });                          // 200 { data }
return apiError("Not found", 404);               // 404 { error: "Not found" }
return apiError("Bad request", 400, { code: "INVALID_INPUT" }); // with code
return apiGuardError(guard);                     // forwards status+message from guard
```

Do NOT use `new Response("text", { status: 404 })` or `Response.json({ ok: false, error: "..." })`.

---

## Environment Variables

### Required

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://lemnity.com
NEXT_PUBLIC_SITE_URL=https://lemnity.com
ANTHROPIC_API_KEY=...
AI_GATEWAY_BASE_URL=https://routerai.ru/api/v1
AI_GATEWAY_API_KEY=...
FIRECRAWL_API_KEY=...
SANDBOX_PROVIDER=e2b
E2B_API_KEY=...
```

### Optional

```
# OAuth providers
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
GITHUB_ID / GITHUB_SECRET  (also GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET)
VK_CLIENT_ID / VK_CLIENT_SECRET
YANDEX_CLIENT_ID / YANDEX_CLIENT_SECRET

# Other AI providers
OPENAI_API_KEY
GEMINI_API_KEY
GROQ_API_KEY

# Email
EMAIL_SERVER_HOST / EMAIL_SERVER_PORT / EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD
EMAIL_FROM
NOTISEND_API_KEY
NOTISEND_WELCOME_TEMPLATE_ID / NOTISEND_PASSWORD_RESET_TEMPLATE_ID

# Publishing
NEXT_PUBLIC_PUBLISH_BASE_DOMAIN=lemnity.com
PUBLISH_DOMAIN_PROVISION_HOOK=...
LETSENCRYPT_EMAIL=...

# Billing
BILLING_WEBHOOK_SECRET=...

# Admin
ADMIN_DEFAULT_EMAIL / ADMIN_DEFAULT_PASSWORD
ADMIN_BOOTSTRAP_ENABLED=0

# Lemnity AI / builder upstream
LEMNITY_AI_BRIDGE_ENABLED=1
NEXT_PUBLIC_LEMNITY_AI_BRIDGE_ENABLED=1
LEMNITY_AI_UPSTREAM_URL=http://127.0.0.1:8787

# Misc
UNSPLASH_ACCESS_KEY=
ENABLE_HTML_SANITIZATION=true
```

---

## Middleware

`middleware.ts` handles custom domain resolution for published sites. Any request on a non-reserved host calls `/api/publish/resolve?host=...` to find the associated project, then rewrites to `/share/{sandboxId}`.

Bypassed for: `/api/publish/resolve`, `/api/auth/*`, `localhost`, reserved app hosts.

---

## Services

### `services/lemnity-builder/`

Node.js upstream service that acts as a bridge between the Next.js app and AI sandbox execution. Started separately with `npm run builder:dev` (port 8787).

### `docker/manus-sandbox/`

Docker image for Lemnity AI code execution sandbox (alternative to E2B).

### `docker/postgres/`

Local PostgreSQL for development via `docker compose`.

---

## Key Patterns

### Avoid

- `new Response("text", { status: N })` — use `apiError()`
- Raw `prisma` calls in route handlers without guards
- `findFirst` + `upsert` without `prisma.$transaction()` for share mutations
- `window.dispatchEvent(new CustomEvent(...))` — use Zustand stores instead
- Hardcoded magic numbers — use `lib/editor-constants.ts` for editor values

### Prefer

- `apiOk()` / `apiError()` / `apiGuardError()` for all API responses
- `requireSession()` and resource-specific guards before any data access
- `prisma.$transaction()` for any read-then-write that must be atomic
- Zustand stores (`lib/stores/`) for cross-component state instead of prop drilling
- `parseBody(req, ZodSchema)` from `lib/api-schemas.ts` for request validation
- `unknownToErrorMessage(e)` from `lib/unknown-error-message.ts` in catch blocks

### TypeScript

- Run `npx tsc --noEmit` after any significant change — build must be clean
- No `any` except at true external boundaries (GrapesJS event payloads, etc.)
- Non-null assertions (`!`) only after explicit guard checks

---

## Testing

Tests use Vitest. Test files are co-located: `lib/foo.test.ts` next to `lib/foo.ts`.

```bash
npm test            # run all tests once
npm run test:watch  # watch mode
```

Integration tests (e.g., `agent-routing.integration.test.ts`) may require env vars or a running DB — check the test file header.

---

## Important Gotchas

1. **`preferredEditor` field on `Project`**: Added to Prisma schema. If queries fail with "Unknown field", run `npm run prisma:generate` — the generated client may be stale.

2. **GrapesJS canvas remount**: When the canvas needs to re-read from localStorage after a navigation round-trip, increment a `canvasKey` state to force React unmount/remount.

3. **Zero Block `data-ln-zero-id`**: Set via `section.setAttributes()` on the GrapesJS model (not DOM directly) so it survives serialization. Auto-assigned in `lockZeroBlockSectionInStructure()`.

4. **`dev:clean` script**: Use when Next.js serves stale chunks or shows hydration errors after major refactors — it wipes `.next/` before restarting.

5. **Server external packages**: `esbuild`, `nodemailer`, `@prisma/client` are server-only — never import in client components.

6. **CMS cross-resource access**: When operating on `typeId` under a `siteId`, always validate with `requireCmsContentTypeAccess(siteId, typeId, userId)` — not just site access.

7. **Sandbox HTML sanitization**: `ENABLE_HTML_SANITIZATION=true` env flag gates HTML sanitization in `app/api/sandbox/[id]/route.ts`. GrapesJS generates complex HTML; test thoroughly before enabling in production.
