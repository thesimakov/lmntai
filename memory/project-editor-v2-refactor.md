---
name: project-editor-v2-refactor
description: Phase progress, file map, architectural decisions, and next steps for the slide editor React canvas rewrite
metadata:
  type: project
---

Phase 1 (React Canvas Editor) — COMPLETE as of 2026-05-19.

All 16 tasks shipped, 374 tests pass, build clean.

**What was built:**
- CSS-scale React canvas (960×540, `transform: scale()`) replacing iframe-based editor
- Two Zustand stores: `lib/stores/use-editor-store.ts` (UI state) and `lib/stores/use-slide-store.ts` (data + 800ms debounced server sync)
- Drag/resize interaction layer with 8 handles, setPointerCapture(), state machine (idle→ready→dragging→commit)
- Snap engine: grid (8px) → element edges/centers → canvas boundaries. Alt suppresses snap.
- Quality scorer: density (25%) + hierarchy (35%) + balance (20%) + readability (20%). Local, no network.
- Full panel system: ContextPanel routes by rightMode + element type. All property panels implemented.
- LayersPanel, AiInlineBar (posts to existing `/api/projects/[id]/slides/chat`), FloatingToolbar.
- `buildSlideDeckStyles` extended with `"react"` variant (scoped to `.lmnt-canvas-root`).
- `SlideElement` extended: `name?`, `locked?`, `visible?`. `SlideTheme` +5 tokens. `SlideTransition` added.

**Migration state:**
- New editor lives at: `app/(builder)/playground/presentations/presentation-editor.tsx`
- Old editor still at: `components/playground/slides/slide-visual-editor.tsx` (referenced by `/playground/slides/page.tsx`)
- **Pending:** switch `/playground/slides` route to new `PresentationEditorClient`, verify in browser, then delete `slide-visual-editor.tsx`

**Why:** Spec approved 2026-05-18. Replacing iframe + postMessage selection with native React drag/snap for Gamma-style UX.

**How to apply:** When continuing this feature — Phase 2 (Composition Engine), Phase 3 (Animation), Phase 4 (Export) each need their own spec → plan cycle. Start with `/superpowers:brainstorming`.
