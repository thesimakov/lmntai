# CLAUDE.md — Lemnity Dashboard

## Project Overview

**Lemnity** — production SaaS platform for AI-assisted website generation and business intelligence. Users can generate, edit and publish websites via a conversational AI interface or visual canvas editor, and analyse financial/marketing data via BI dashboards.

**Tech stack:**
- **Framework**: Next.js 15 App Router, React 19, TypeScript (strict)
- **Styling**: Tailwind CSS, Radix UI, shadcn/ui, NextUI components
- **Database**: PostgreSQL + Prisma ORM (`prisma/schema.prisma`)
- **Auth**: NextAuth.js v4 with Prisma adapter (email/password, Google, GitHub, VK, Yandex)
- **Visual editor**: GrapesJS 0.22 (`components/playground/lemnity-box/`)
- **Drag-and-drop builder**: Puck (`@measured/puck`) — config in `lib/puck-lemnity-config.tsx`
- **State management**: Zustand (stores in `lib/stores/`), React Query v5 for server state
- **AI**: Anthropic Claude, OpenAI, DeepSeek, Gemini, Groq — routed via RouterAI gateway
- **Sandboxes**: E2B or Docker (Lemnity AI) for code execution
- **Email**: NotiSend API (transactional), nodemailer/SMTP (magic links, verification)
- **Payments/billing**: Custom billing webhook (`lib/billing-webhook.ts`)
- **i18n**: `lib/i18n.ts` — ru/en/tg language support
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
| `(dashboard)` | `/` | Projects list, settings, integrations, team, billing |
| `(dashboard)` | `/analytics/*` | Analytics BI dashboard (financial + marketing analysis) |
| `(dashboard)` | `/presentations/*` | Presentations list and viewer |
| `(builder)` | `/playground/*` | All editors: build, box, cms, puck, slides, marketing |
| `(marketing)` | landing, pricing | Public marketing pages |
| `admin` | `/admin/*` | Admin panel (role-gated): users, tariffs, promo codes, error log, settings |
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
| `slides/page.tsx` | AI slide presentation editor |
| `marketing/page.tsx` | Marketing analysis / BI editor |

### API Routes (`app/api/`)

Key groups:
- `/api/auth/*` — NextAuth + custom forgot/reset password, email verification
- `/api/projects/*` — CRUD, export, subdomain check
- `/api/sandbox/*` — sandbox state, share, file access
- `/api/box/[id]/*` — box canvas operations (save, preview, status)
- `/api/box-image-library/*` — image library for box editor
- `/api/cms/sites/*` — CMS sites, pages, content types, entries, publishing
- `/api/headless/*` — Public headless CMS API
- `/api/public/*` — Unauthenticated endpoints (form submissions, etc.)
- `/api/generate-stream` — AI generation SSE stream
- `/api/prompt-builder` — RouterAI prompt builder proxy
- `/api/prompt-coach/*` — Prompt coaching API
- `/api/routerai/*` — RouterAI proxy + health
- `/api/billing/webhook` — billing events
- `/api/admin/*` — admin APIs (economics, users, promo-codes, plan-config, error log)
- `/api/lemnity-ai/[...path]` — proxy to Lemnity AI upstream (also aliased `/api/manus/*`)
- `/api/team/*` — team invitations
- `/api/referrals/*` — referral wallet and earnings
- `/api/publish/*` — domain publish, resolve, provision
- `/api/user-blocks/*` — user-saved GrapesJS blocks
- `/api/promo/*` — promo code validation
- `/api/profile/*` — user profile (virtual workspace)
- `/api/pricing/*` — pricing info
- `/api/export/*` — HTML/PDF export
- `/api/build-templates/*` — AI build template presets (DB-backed)
- `/api/showcase-images/*` — showcase image library
- `/api/analytics/*` — Analytics BI: upload, analyze, report, shared view, assets, chat
- `/api/errors/*` — Client + server error reporting (`/api/errors/report`)
- `/api/brand-kit/*` — Brand kit CRUD (user-level and project-level)
- `/api/presentation/*` — Presentation generation (slides)
- `/api/presentations/*` — Presentations CRUD
- `/api/marketing/*` — Marketing analysis BI

---

## Key Library Files (`lib/`)

### API layer
- `lib/api-response.ts` — `apiOk()`, `apiError()`, `apiGuardError()` — unified response helpers
- `lib/api-schemas.ts` — Zod schemas + `parseBody()` utility
- `lib/api-client/` — typed fetch client: `base.ts`, `cms.ts`, `projects.ts`, `sandbox.ts`, `share.ts`, `index.ts`
- `lib/auth-guards.ts` — `requireSession()`, `requireAdmin()`, etc. — always use in API routes
- `lib/with-api-logging.ts` — wrap handlers to log to `RequestLog`
- `lib/with-error-log.ts` — `withErrorLog(module, handler)` — wraps route handler, catches unhandled errors, logs to `ErrorLog` DB, returns 500

### AI / routing
- `lib/routerai-client.ts` — RouterAI gateway client (`getGatewayConfig()`, `requestRouterAIJsonWithFallback()`)
- `lib/agent-models.ts` — agent model selection per plan and project kind
- `lib/deepseek-client.ts` — DeepSeek AI client (for specific model routing overrides)
- `lib/structured-json-ai.ts` — generic RouterAI JSON generation with model fallback chain; used by analytics, marketing, and other BI modules
- `lib/prompt-coach.ts` — prompt quality coaching
- `lib/prompt-model-fallback.ts` — model fallback logic
- `lib/lemnity-ai-prompt-spec.ts` — AI prompt spec for Lemnity AI (includes site footer, stock image, layer rules); defines `ProjectKind` type
- `lib/lmnt-layer-spec.ts` — LMNT layer prompt rules
- `lib/affirmative-reply.ts` — detect positive user affirmations in chat
- `lib/ai-unavailable-message.ts` — standard "AI unavailable" error messages
- `lib/stream-step-title.ts` — extract step titles from AI stream events
- `lib/sse-parser.ts` — SSE event stream parser utilities

### Analytics BI (`lib/analytics-*.ts`, `lib/forecast-*.ts`, `lib/investor-*.ts`)
Full financial analysis pipeline: upload → extract text → RAG → AI dashboard generation → share.

- `lib/analytics-schema.ts` — Zod schemas: `AnalysisDashboard`, `Kpi`, `Chart`, `Table` (KPIs, charts, tables, narrative)
- `lib/analytics-prompt.ts` — system/user prompt builders for financial analysis
- `lib/analytics-stats.ts` — dashboard stats computation
- `lib/analytics-share-db.ts` — `createAnalyticsShare()`, analytics share CRUD
- `lib/analytics-share-contract.ts` — `AnalyticsRole` (`viewer`/`investor`/`analyst`), role descriptions
- `lib/analytics-embedding-store.ts` — hybrid BM25 + vector search for analytics chunk retrieval (stores in `AnalyticsChunkEmbedding`)
- `lib/analytics-benchmarks.ts` — industry benchmark definitions and comparison logic
- `lib/analytics-pdf-export.ts` — PDF export from analytics dashboard
- `lib/analytics-pptx-export.ts` — PPTX export from analytics dashboard
- `lib/analytics-dashboard-localization.ts` — localization helpers for analytics dashboards
- `lib/benchmark-db.ts` — persist/retrieve anonymised KPI benchmark samples in `BenchmarkSample` table
- `lib/bi-upload-limits.ts` — `BI_UPLOAD_MAX_BYTES` (10 MB) — max single-file size for BI uploads
- `lib/forecast-schema.ts` — `ForecastReport` schema (metrics with historical/projected points, CAGR)
- `lib/forecast-prompt.ts` / `lib/forecast-report-normalize.ts` / `lib/forecast-pptx-export.ts` — forecast pipeline
- `lib/investor-schema.ts` — `InvestorReport` schema (risk score, VC pitch deck, board report, due diligence)
- `lib/investor-prompt.ts` / `lib/investor-report-normalize.ts` / `lib/investor-pptx-export.ts` — investor report pipeline

### Marketing BI (`lib/marketing-*.ts`)
- `lib/marketing-schema.ts` — `MarketingDashboard` schema (channels, KPIs, charts, narrative)
- `lib/marketing-prompt.ts` — prompt builders for marketing analysis
- `lib/marketing-pptx-export.ts` — PPTX export from marketing dashboard
- `lib/marketing-dashboard-localization.ts` / `lib/marketing-docs-sections.ts` — localization and doc section helpers

### Slide/presentation engine (`lib/slide-graph/`)
Standalone slide graph engine for AI-generated presentations:
- `types.ts` — `Slide`, `SlideElement`, `SlideLayout`, `SlideTheme` interfaces
- `schema.ts` / `renderer.ts` — slide schema validation and HTML rendering
- `prompt.ts` — slide generation prompts
- `patch.ts` — incremental slide patching
- `pdf-export.ts` / `pptx-export.ts` — export to PDF/PPTX

### Component graph (`lib/component-graph/`)
- `types.ts` / `schema.ts` / `renderer.ts` / `prompt.ts` / `patch.ts` — component graph pipeline (used for marketing/analytics UI generation)

### Brand kit (`lib/brand-kit-*.ts`, `lib/project-brand-kit-*.ts`)
- `lib/brand-kit-library.ts` — `BrandKitManifest` type, `formatBrandKitForAiPrompt()`, manifest ↔ state converters
- `lib/brand-kit-service.ts` — user-level brand kit CRUD (read/write/delete assets)
- `lib/brand-kit-storage.ts` — file system storage for brand assets
- `lib/brand-kit-client.ts` — client-side brand kit API helpers
- `lib/project-brand-kit-library.ts` / `lib/project-brand-kit-service.ts` / `lib/project-brand-kit-storage.ts` — project-scoped brand kit (same structure, project-level)

### Error tracking (`lib/error-*.ts`, `lib/with-error-log.ts`)
- `lib/error-tracker-types.ts` — `ErrorReportPayload`, `ErrorSource`, `ErrorType`, `detectModule()`
- `lib/error-tracker.ts` — client-side error tracker: batches JS errors, failed fetches, streams → `/api/errors/report`
- `lib/error-log-db.ts` — `logClientError()`, `logServerError()` — persist to `ErrorLog` table
- `lib/with-error-log.ts` — `withErrorLog(module, handler)` — server handler wrapper

### Document parsing & RAG
- `lib/docx-parser.ts` — `docxToText(buffer)` — extract raw text from DOCX via mammoth
- `lib/ocr-pdf.ts` — OCR fallback for image-only PDFs via Claude Haiku (`claude-haiku-4-5-20251001`); max 20 MB
- `lib/text-rag.ts` — lightweight BM25-style retrieval: chunk text → rank by keyword relevance (no external API)
- `lib/embeddings.ts` — `embedText()`, `embedBatch()`, `cosineSimilarity()` — OpenAI `text-embedding-3-small` (1536-dim)

### Database
- `lib/prisma.ts` — singleton Prisma client
- `lib/cms-core.ts` — CMS access guards: `requireCmsSiteAccess()`, `requireCmsContentTypeAccess()`
- `lib/sandbox-share-db.ts` — sandbox share read/write (use `prisma.$transaction()` for mutations)
- `lib/sandbox-project-state-db.ts` — sandbox file state persistence
- `lib/project-storage.ts` — file-based project storage (`.project-storage/projects/`): messages, files, images, embeddings
- `lib/project-context.ts` — `ProjectScope` type, project resolution helpers

### State management (`lib/stores/`)
- `use-build-editor-store.ts` — build editor (AI chat + sandbox) global state
- `use-cms-store.ts` — CMS editor global state
- `use-projects-store.ts` — projects list + refresh
- `use-sandbox-files-store.ts` — sandbox file tree state
- `use-share-store.ts` — share popover state
- `use-analytics-store.ts` — analytics BI state (dashboard, investor report, forecast, chat messages)
- `use-marketing-store.ts` — marketing analysis BI state
- `use-landing-files-store.ts` — pending file uploads on landing/playground page

### Plans & billing
- `lib/plan-config.ts` — `PlanId` (`FREE` / `PRO` / `TEAM`), token allowances, per-plan limits
- `lib/platform-plan-settings.ts` — `PlatformPlanSettings` DB model helpers
- `lib/platform-plan-catalog.ts` — `PLATFORM_FEATURE_CATALOG` feature IDs, `PlanRow`, admin plan editing
- `lib/starter-plan.ts` — FREE plan daily quota + 3-day trial logic
- `lib/project-limits.ts` — per-plan project/page count limits
- `lib/token-billing.ts` / `lib/token-manager.ts` — token accounting
- `lib/token-monthly-rollover.ts` — monthly token rollover
- `lib/pricing-billing.ts` / `lib/pricing-economics.ts` — tariff logic
- `lib/promo-service.ts` — promo code validation and application
- `lib/billing-webhook.ts` — billing event processing

### Referrals
- `lib/referrals.ts` / `lib/referral-wallet.ts` / `lib/referral-revenue.ts` — referral system
- `lib/referral-token-packs.ts` — referral token pack definitions
- `lib/referrals-constants.ts` / `lib/referrals-currency.ts` / `lib/referrals-client.ts` — referral utilities

### Publishing
- `lib/publish-domain.ts` / `lib/publish-host.ts` — domain publishing and TLS
- `lib/publish-domain-provision.ts` / `lib/publish-domain-service.ts` — domain provision hooks
- `lib/project-domain-resolution.ts` — domain → project resolution

### Visual editor (GrapesJS)
- `lib/lemnity-box-editor-schema.ts` — `PageDocument` type, `emptyPageDocument()`
- `lib/lemnity-box-editor-persistence.ts` — `readLemnityBoxCanvasDraft()`, `writeLemnityBoxCanvasDraft()`
- `lib/lemnity-zero-block-session.ts` — Zero Block cross-page session (localStorage hand-off)
- `lib/box-image-library-*.ts` — image library sidebar, fallback, types, gallery insert
- `lib/user-saved-blocks.ts` — user-saved GrapesJS block library
- `lib/box-new-page-starters.ts` — new page starter templates for Box editor
- `lib/visual-html-shrink.ts` — compress GrapesJS HTML before save
- `lib/visual-preview-editor.ts` — visual preview editor helpers
- `lib/visual-save-client-body.ts` / `lib/visual-save-decode-patch-body.ts` — visual save payload encoding
- `lib/lemnity-box-push-sandbox.ts` — push box canvas content to sandbox
- `lib/lemnity-box-build-index-html.ts` — build final index.html from box canvas
- `lib/lemnity-box-section-motion.ts` — section motion/animation helpers
- `lib/lemnity-anchor-runtime.ts` / `lib/lemnity-anchor-slug.ts` — anchor link runtime and slug helpers
- `lib/lemnity-carousel-nav-runtime.ts` — carousel navigation runtime
- `lib/lemnity-details-tabs-runtime.ts` — tabs/accordion runtime
- `lib/lemnity-box-html-embed-expand.ts` — expand HTML embeds in box canvas
- `lib/lemnity-box-locale-ru.ts` — Russian localization for GrapesJS UI

### Zero Block editor module (`lib/zero-block-editor/`)
Full standalone zero-block editor engine:
- `types.ts` — `ZbElementType`, `ZbBreakpoint`, element props interfaces
- `breakpoints.ts` — breakpoint definitions (`desktop`/`1200`/`980`/`640`/`480`/`320`)
- `store.ts` — editor state store
- `snap-engine.ts` — snapping/alignment engine
- `responsive.ts` — responsive layout helpers
- `html-export.ts` / `html-import.ts` — serialize/deserialize zero block HTML
- `templates.ts` / `defaults.ts` — starter templates and element defaults

### Template layer editor (`lib/template-layer-editor/`)
- `types.ts` / `store.ts` — layer editor types and state
- `grid-logic.ts` — grid layout logic

### Editor module (`lib/editor/`)
- `AICommandBuilder.ts` — build AI edit commands from user intent
- `apply-visual-updates.ts` — apply model-suggested DOM changes
- `canvas-overlay.ts` — canvas selection/highlight overlay
- `layout-element.ts` — layout element helpers
- `reorder-block.ts` — block reordering logic
- `lmny-svg-icons.ts` — SVG icon set for the editor

### Build templates
- `lib/build-templates.ts` — AI build template definitions (DB-backed via `BuildTemplate` model)
- `lib/build-template-presets/` — preset templates: IT startup landing, lead PR, massage, web studio
- `lib/playground-templates.ts` — `PLAYGROUND_QUICK_TEMPLATES` — quick-template chips on the playground home

### Chat / SSE
- `lib/client-sse.ts` — SSE client for streaming AI responses
- `lib/chat-attachments.ts` — file attachment handling in build editor chat
- `lib/chat-artifact-ui.ts` — artifact card UI helpers in build editor

### Lemnity AI bridge (Manus upstream)
- `lib/lemnity-ai-bridge-config.ts` — `isLemnityAiBridgeEnabledServer/Client()`, upstream URL/token resolution; supports both `LEMNITY_AI_*` and `MANUS_*` env vars
- `lib/lemnity-ai-upstream-client.ts` — `lemnityAiUpstreamFetch()`, auth header helpers for upstream FastAPI
- `lib/lemnity-ai-bridge-session-artifact.ts` — extract artifact sandboxId from upstream session events
- `lib/lemnity-ai-build-session-storage.ts` — localStorage session storage for Lemnity AI build sessions
- `lib/lemnity-ai-session-links.ts` — session link helpers (`ManusSessionLink` DB)
- `lib/lemnity-builder-sandbox-api.ts` — HTTP client to FastAPI inside sandbox container (port 8080)
- `lib/lemnity-puck-build-nav.ts` — navigation helpers for Puck inside Lemnity AI build

### Lovable bundler
- `lib/lovable-bundler.ts` — "Lovable mode": parse multi-file React+TSX fenced blocks from AI response → single ESM bundle via esbuild for iframe preview; supports ` ```tsx:src/App.tsx` and `// file:` comment conventions

### CMS utilities
- `lib/cms-form-bridge.ts` — CMS form → sandbox bridge
- `lib/cms-sandbox-form-sync.ts` — sync CMS form submissions to sandbox
- `lib/cms-form-submission-webhook-queue.ts` — async webhook delivery with logging
- `lib/cms-html-robots-meta.ts` — inject robots/SEO meta into CMS HTML
- `lib/cms-robots-site.ts` — robots.txt generation for CMS sites
- `lib/cms-editor-client.ts` — CMS editor API client
- `lib/cms-form-submissions-kanban.ts` / `lib/cms-form-submissions-server.ts` — form submissions kanban board and server helpers

### Admin
- `lib/admin-service.ts` — admin operations (token grants, plan changes)
- `lib/admin-rules.ts` — admin access rule validation
- `lib/staff-permissions.ts` — MANAGER role granular permissions (`users.read`, `users.write`, `tariffs`, `team`, `stats`, etc.)
- `lib/admin-env-bootstrap.ts` — bootstrap default admin from env

### Auth
- `lib/auth.ts` / `lib/auth-guards.ts` / `lib/auth-callbacks.ts` / `lib/auth-providers.ts` — NextAuth config split by concern
- `lib/auth-constants.ts` — auth magic constants
- `lib/auth-events.ts` — auth event handlers (login, signup hooks)
- `lib/auth-normalizers.ts` — normalise provider profile data
- `lib/email-verification.ts` — email verification token logic (`EmailVerificationToken` model)
- `lib/password-reset-service.ts` — password reset flow
- `lib/password-crypto.ts` — bcrypt wrappers
- `lib/post-login-redirect.ts` — post-login redirect logic
- `lib/offline-demo-auth.ts` — demo mode authentication bypass

### Images & assets
- `lib/image-content-validation.ts` — `detectBrandKitAssetMime()`, allowed MIME types for brand assets
- `lib/project-image-gallery.ts` — project image gallery helpers
- `lib/materialize-remote-images.ts` — download and store remote images locally
- `lib/sandbox-image-assets.ts` — manage image assets in sandbox
- `lib/sandbox-preview-asset-access.ts` — asset access for sandbox preview
- `lib/sandbox-empty-preview-html.ts` — empty preview HTML placeholder

### Other
- `lib/api-keys.ts` — API key management for users
- `lib/i18n.ts` / `lib/i18n-namespaces.ts` / `lib/i18n/` — UI language support (`UiLanguage`: ru/en/tg)
- `lib/export-html-pdf.ts` — HTML → PDF export
- `lib/compact-html-for-save.ts` — compact HTML before DB save
- `lib/html-sanitizer.ts` — sanitize HTML (see `ENABLE_HTML_SANITIZATION`)
- `lib/project-snapshots.ts` — project snapshot management
- `lib/project-export.ts` — project export to ZIP
- `lib/sandbox-stores.ts` — sandbox store helpers
- `lib/sandbox-manager.ts` — sandbox lifecycle management
- `lib/sandbox-upstream.ts` — sandbox upstream API helpers
- `lib/sandbox-preview-html-detect.ts` — detect preview HTML type in sandbox
- `lib/studio-integration-storage.ts` — studio integration settings storage
- `lib/read-login-features.ts` — feature flags from login response
- `lib/display-title.ts` — display title extraction from project data
- `lib/share-branding.ts` — branding on share page
- `lib/preview-share.ts` — preview share link helpers
- `lib/starter-cabinet-server.ts` — server-side starter cabinet data
- `lib/request-log.ts` — request logging helpers
- `lib/unknown-error-message.ts` — `unknownToErrorMessage()` for safe catch blocks
- `lib/utils.ts` — `cn()` classnames util
- `lib/editor-constants.ts` — editor magic numbers
- `lib/database-url.ts` — DATABASE_URL resolution helpers
- `lib/prisma-auth-errors.ts` — map Prisma errors to auth error codes
- `lib/subdomain-input.ts` — subdomain input validation helpers
- `lib/request-ui-language.ts` — resolve UI language from request headers
- `lib/user-virtual-storage.ts` — user virtual storage helpers
- `lib/user-starter-paid-until-raw.ts` — raw paid-until date for starter users
- `lib/zero-block-grid.ts` — zero block CSS grid helpers
- `lib/puck-lemnity-data.ts` — `defaultLemnityPuckData()`, `ensureComponentInstanceIds()` for Puck
- `lib/puck-merge-after-model-apply.ts` — merge Puck data after AI model suggests changes
- `lib/playground-project-edit-url.ts` — `PreferredPlaygroundEditor` type, URL resolution per editor
- `lib/landing-handoff.ts` — `BuilderHandoff` type, localStorage handoff from landing → playground
- `lib/landing-showcase.ts` — landing page showcase data
- `lib/site.ts` — site-level metadata helpers
- `lib/smtp-client.ts` — SMTP client wrappers
- `lib/notisend-email.ts` — NotiSend transactional email client
- `lib/prompt-site-footer.ts` / `lib/prompt-stock-images.ts` — prompt fragments for footer and stock images

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
| `lemnity-box-save-block-dialog.tsx` | Save custom block dialog |
| `lemnity-box-user-blocks-panel.tsx` | User-saved blocks panel |

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

### Zero Block editor components (`components/zero-block-editor/`)
Standalone React UI for the zero-block canvas editor:
- `zb-editor.tsx` — top-level editor component
- `zb-canvas.tsx` — canvas with absolute-positioned elements
- `zb-element-layer.tsx` — individual element layer (drag/resize)
- `zb-add-panel.tsx` — add element panel
- `zb-layers-panel.tsx` — layers panel
- `zb-settings-panel.tsx` — element settings panel
- `zb-snap-guides.tsx` — snap guide overlay
- `zb-top-bar.tsx` — editor toolbar

### AI Editor components (`components/ai-editor/`)
Shared AI-assisted editor UI (used in analytics, marketing, slides):
- `AiEditorShell.tsx` — top-level shell
- `AiEditorPreview.tsx` — preview panel
- `AiEditorSidebar.tsx` — sidebar with AI controls
- `AiEditorVersionHistoryButton.tsx` — version history toggle
- `AiPromptInput.tsx` — AI prompt input field
- `AiVersionDiffBadge.tsx` — version diff indicator
- `AiVersionList.tsx` — version list panel

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
| `ProjectMessage` | Chat messages stored per project (role, content, metadata) |
| `ProjectImageAsset` | Uploaded image assets per project (assetKey, mime, bytes, sourceUrl) |
| `ProjectEmbedding` | Vector embedding refs per project (namespace, vectorRef, metadata) |
| `BuildTemplate` | DB-backed AI build templates (slug, name, rules, files JSON, defaultUserPrompt) |

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

### Analytics / BI models

| Model | Purpose |
|---|---|
| `AnalyticsShare` | Analytics share link with role (`viewer`/`investor`/`analyst`), optional expiry |
| `AnalyticsChunkEmbedding` | Vector embeddings for analytics RAG (projectId, position, chunkText, vector JSON) |
| `BenchmarkSample` | Anonymized industry KPI benchmark samples (industry, metricKey, value, unit) |

### Brand kit models

| Model | Purpose |
|---|---|
| `UserBrandKitLibrary` | User-level brand kit manifest (JSON) |
| `ProjectBrandKit` | Project-level brand kit manifest (JSON) |

### Lemnity AI (Manus) models

| Model | Purpose |
|---|---|
| `ManusSessionLink` | Lemnity AI session linked to a project (manusSessionId, title, unread count) |
| `ManusChatCharge` | Token charges per Lemnity AI chat event (model, promptTokens, completionTokens) |

### Error tracking

| Model | Purpose |
|---|---|
| `ErrorLog` | Platform error log: source, errorType, module, message, stack, url, userId, viewport, ip |

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
| `EmailVerificationToken` | Email verification token (userId, tokenHash, expiresAt) |
| `TeamInvitation` | Team member invitations |
| `RequestLog` / `AuthEventLog` | Request and auth event logs |
| `VerificationToken` | NextAuth magic-link verification |

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
OPENAI_API_KEY              # required for embeddings (text-embedding-3-small)
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

# Lemnity AI / builder upstream (two env naming conventions supported)
LEMNITY_AI_BRIDGE_ENABLED=1
NEXT_PUBLIC_LEMNITY_AI_BRIDGE_ENABLED=1
LEMNITY_AI_UPSTREAM_URL=http://127.0.0.1:8787
# Alternative Manus naming (also supported):
MANUS_API_BASE_URL=...
MANUS_FULL_PARITY_ENABLED=1
NEXT_PUBLIC_MANUS_FULL_PARITY_ENABLED=1

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
- Direct AI provider calls — all AI goes through RouterAI gateway (`lib/routerai-client.ts`)

### Prefer

- `apiOk()` / `apiError()` / `apiGuardError()` for all API responses
- `requireSession()` and resource-specific guards before any data access
- `prisma.$transaction()` for any read-then-write that must be atomic
- Zustand stores (`lib/stores/`) for cross-component state instead of prop drilling
- `parseBody(req, ZodSchema)` from `lib/api-schemas.ts` for request validation
- `unknownToErrorMessage(e)` from `lib/unknown-error-message.ts` in catch blocks
- `withErrorLog(module, handler)` from `lib/with-error-log.ts` for high-traffic API routes
- `structured-json-ai.ts` for any route that needs structured JSON from AI with model fallback

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

5. **Server external packages**: `esbuild`, `nodemailer`, `@prisma/client`, `mammoth` are server-only — never import in client components.

6. **CMS cross-resource access**: When operating on `typeId` under a `siteId`, always validate with `requireCmsContentTypeAccess(siteId, typeId, userId)` — not just site access.

7. **Sandbox HTML sanitization**: `ENABLE_HTML_SANITIZATION=true` env flag gates HTML sanitization in `app/api/sandbox/[id]/route.ts`. GrapesJS generates complex HTML; test thoroughly before enabling in production.

8. **Plan IDs**: Always use `PlanId` from `lib/plan-config.ts` (`FREE` / `PRO` / `TEAM`) — never raw strings. FREE plan has a 3-day trial and daily token quota logic in `lib/starter-plan.ts`.

9. **MANAGER role**: Has granular permissions defined in `lib/staff-permissions.ts`. Check `STAFF_PERMISSIONS` keys before gating admin features — ADMIN bypasses all, MANAGER is checked per-permission.

10. **RouterAI gateway**: All AI calls go through the gateway (`lib/routerai-client.ts`). Direct provider clients (`lib/deepseek-client.ts`) are only used for specific model routing overrides.

11. **Lemnity AI bridge env naming**: Both `LEMNITY_AI_*` and `MANUS_*` env var prefixes are supported (see `lib/lemnity-ai-bridge-config.ts`). The bridge routes `/api/lemnity-ai/*` and `/api/manus/*` to the same upstream.

12. **Embeddings require OpenAI**: `lib/embeddings.ts` uses `OPENAI_API_KEY` for `text-embedding-3-small`. The OCR fallback in `lib/ocr-pdf.ts` uses `ANTHROPIC_API_KEY` directly (not the gateway) via Claude Haiku.

13. **`BuildTemplate` is now DB-backed**: Templates are stored in the `BuildTemplate` table, not just in `lib/build-templates.ts`. The admin panel at `/admin/build-templates` manages them. The static definitions in `lib/build-template-presets/` are seed data.

14. **Analytics BI upload limit**: Single-file uploads for analytics/marketing are capped at 10 MB (`BI_UPLOAD_MAX_BYTES` in `lib/bi-upload-limits.ts`).

15. **Analytics share roles**: `AnalyticsRole` has three levels — `viewer` (KPIs/charts), `investor` (+ investor deck), `analyst` (full access including forecast and benchmarks). Always check role before exposing sensitive BI data.

16. **`.project-storage/` directory**: File-based project storage for messages, files, images, embeddings (used by `lib/project-storage.ts`). Not committed to git. Create via `npm run db:setup` or ensure the directory exists locally.
