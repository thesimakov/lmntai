# GrapesJS UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five independent UX improvements to the GrapesJS canvas editor: section background picker from toolbar, inline RTE, Ctrl+Shift+V paste HTML, section navigator badge, and Delete/Backspace shortcut.

**Architecture:** Each feature is isolated — toolbar monkey-patch (bg picker), `grapesjs.init()` config additions (RTE, keymaps), and two new React components (bg popover, section nav). All wired into `lemnity-box-canvas-editor.tsx` which is the single integration point.

**Tech Stack:** GrapesJS 0.22, React 19, TypeScript strict, Tailwind CSS / inline styles for overlay components.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `components/playground/lemnity-box/lemnity-box-toolbar-bg-picker.ts` | Monkey-patch toolbar to add 🎨 button on sections; register command |
| Create | `components/playground/lemnity-box/lemnity-box-section-bg-popover.tsx` | React popover: Color / Gradient / Image tabs |
| Create | `components/playground/lemnity-box/lemnity-box-section-nav.tsx` | Floating section navigator badge |
| Modify | `components/playground/lemnity-box/lemnity-box-canvas-editor.tsx` | Wire all five features into init + JSX |

---

### Task 1: Section Background Picker — Toolbar Registration

**Files:**
- Create: `components/playground/lemnity-box/lemnity-box-toolbar-bg-picker.ts`

- [ ] **Step 1: Create `lemnity-box-toolbar-bg-picker.ts`**

```typescript
import type { Component, Editor } from "grapesjs";

const BG_PICKER_ID = "lemnity-bg-picker-btn";
const BG_PICKER_CMD = "lemnity-bg-picker";

const BG_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`;

type ToolbarRow = { id?: string; label?: string; command?: string; attributes?: Record<string, string> };

export function registerLemnityBoxToolbarBgPicker(
  editor: Editor,
  onOpen: (component: Component) => void,
): void {
  editor.Commands.add(BG_PICKER_CMD, {
    run(ed) {
      const sel = ed.getSelected();
      if (sel) onOpen(sel);
    },
  });

  const dc = editor.DomComponents;
  const type = dc.getType("default");
  const Model = type?.model as { prototype: { initToolbar: () => void; _lmnBgPatchApplied?: boolean } } | undefined;
  if (!Model?.prototype?.initToolbar) return;
  if (Model.prototype._lmnBgPatchApplied) return;
  Model.prototype._lmnBgPatchApplied = true;

  const proto = Model.prototype as {
    initToolbar: () => void;
    get: (k: string) => unknown;
    set: (k: string, v: unknown) => void;
  };
  const original = proto.initToolbar;

  proto.initToolbar = function patchedBgPickerToolbar(this: typeof proto) {
    original.call(this);
    if (String(this.get("tagName") ?? "").toLowerCase() !== "section") return;
    const raw = this.get("toolbar");
    if (!Array.isArray(raw)) return;
    const tb = raw.slice() as ToolbarRow[];
    if (tb.some((b) => b.id === BG_PICKER_ID)) {
      this.set("toolbar", tb);
      return;
    }
    // Insert before the last button (delete)
    tb.splice(tb.length - 1, 0, {
      id: BG_PICKER_ID,
      label: BG_ICON,
      command: BG_PICKER_CMD,
      attributes: { title: "Фон секции" },
    });
    this.set("toolbar", tb);
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "lemnity-box-toolbar-bg-picker"
```
Expected: no output (no errors in this file).

- [ ] **Step 3: Commit**

```bash
git add components/playground/lemnity-box/lemnity-box-toolbar-bg-picker.ts
git commit -m "feat: add lemnity-box-toolbar-bg-picker — toolbar 🎨 button for sections"
```

---

### Task 2: Section Background Picker — Popover Component

**Files:**
- Create: `components/playground/lemnity-box/lemnity-box-section-bg-popover.tsx`

- [ ] **Step 1: Create `lemnity-box-section-bg-popover.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Component } from "grapesjs";
import {
  LemnityBoxImageLibraryModal,
  type LemnityImageLibraryGrapesContext,
} from "@/components/playground/lemnity-box/lemnity-box-image-library-modal";

interface Props {
  component: Component;
  onClose: () => void;
  projectId?: string | null;
}

type Tab = "color" | "gradient" | "image";

const SWATCHES = [
  "#ffffff",
  "#f3f4f6",
  "#111827",
  "#312e81",
  "#166534",
  "#7f1d1d",
  "#fefce8",
  "#fdf4ff",
];

const GRADIENT_PRESETS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(to bottom, #1a1a2e 0%, #16213e 100%)",
];

function hexIsValid(hex: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function detectTab(style: Record<string, string>): Tab {
  const bg = style["background-image"] ?? "";
  if (bg.startsWith("url(")) return "image";
  if (bg.includes("gradient")) return "gradient";
  return "color";
}

export function LemnityBoxSectionBgPopover({ component, onClose, projectId }: Props) {
  const currentStyle = component.getStyle() as Record<string, string>;
  const [tab, setTab] = useState<Tab>(() => detectTab(currentStyle));
  const [hexInput, setHexInput] = useState<string>(currentStyle["background-color"] ?? "#ffffff");
  const [gradientAngle, setGradientAngle] = useState(135);
  const [gradientFrom, setGradientFrom] = useState("#667eea");
  const [gradientTo, setGradientTo] = useState("#764ba2");
  const [imageUrl, setImageUrl] = useState<string>(() => {
    const bg = currentStyle["background-image"] ?? "";
    const match = bg.match(/url\(["']?(.+?)["']?\)/);
    return match?.[1] ?? "";
  });
  const [imageLibraryCtx, setImageLibraryCtx] = useState<LemnityImageLibraryGrapesContext | null>(null);

  // Close when component is deselected
  useEffect(() => {
    const editor = (component as { collection?: { models?: unknown[] } }).collection;
    if (!editor) return;
    // Listen via the component's own editor reference
    const edRef = (component as unknown as { em?: { get?: (k: string) => unknown } }).em;
    if (!edRef) return;
    // Use component:deselected to close
    const handleDeselect = () => onClose();
    const editorInstance = edRef.get?.("Editor") as { on?: (ev: string, fn: () => void) => void; off?: (ev: string, fn: () => void) => void } | undefined;
    editorInstance?.on?.("component:deselected", handleDeselect);
    return () => {
      editorInstance?.off?.("component:deselected", handleDeselect);
    };
  }, [component, onClose]);

  const applyColor = (hex: string) => {
    if (!hexIsValid(hex)) return;
    component.setStyle({ ...component.getStyle() as Record<string, string>, "background-color": hex, "background-image": "" });
  };

  const applyGradient = (gradient: string) => {
    component.setStyle({ ...component.getStyle() as Record<string, string>, "background-image": gradient, "background-color": "" });
  };

  const applyImage = (url: string) => {
    if (!url.trim()) return;
    component.setStyle({
      ...component.getStyle() as Record<string, string>,
      "background-image": `url("${url.trim()}")`,
      "background-size": "cover",
      "background-position": "center",
      "background-color": "",
    });
  };

  const clearBackground = () => {
    component.setStyle({
      ...component.getStyle() as Record<string, string>,
      "background-color": "",
      "background-image": "",
      "background-size": "",
      "background-position": "",
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />
      {/* Popover */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 14,
          width: 256,
          boxShadow: "0 4px 20px rgba(0,0,0,.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 10 }}>Фон секции</div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
          {(["color", "gradient", "image"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                background: tab === t ? "#eff6ff" : "#f9fafb",
                border: tab === t ? "1.5px solid #3b82f6" : "1px solid #e5e7eb",
                color: tab === t ? "#1d4ed8" : "#6b7280",
                borderRadius: 5,
                padding: "3px 0",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t === "color" ? "Цвет" : t === "gradient" ? "Градиент" : "Картинка"}
            </button>
          ))}
        </div>

        {/* Color tab */}
        {tab === "color" && (
          <div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => { setHexInput(swatch); applyColor(swatch); }}
                  style={{
                    width: 24, height: 24,
                    background: swatch,
                    border: hexInput === swatch ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    borderRadius: 5,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 24, height: 24, background: hexIsValid(hexInput) ? hexInput : "#fff", borderRadius: 4, border: "1px solid #e5e7eb", flexShrink: 0 }} />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => {
                  setHexInput(e.target.value);
                  if (hexIsValid(e.target.value)) applyColor(e.target.value);
                }}
                style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 5, padding: "4px 8px", fontSize: 11, fontFamily: "monospace", color: "#374151" }}
                placeholder="#000000"
                maxLength={7}
              />
            </div>
          </div>
        )}

        {/* Gradient tab */}
        {tab === "gradient" && (
          <div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyGradient(preset)}
                  style={{ width: 36, height: 24, background: preset, border: "1px solid #e5e7eb", borderRadius: 5, cursor: "pointer" }}
                />
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
                Угол (0–360°)
                <input
                  type="number"
                  min={0}
                  max={360}
                  value={gradientAngle}
                  onChange={(e) => setGradientAngle(Number(e.target.value))}
                  onBlur={() => applyGradient(`linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`)}
                  style={{ display: "block", width: "100%", marginTop: 3, border: "1px solid #e2e8f0", borderRadius: 5, padding: "3px 8px", fontSize: 11, background: "#f8fafc" }}
                />
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <label style={{ flex: 1, fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
                  От
                  <input
                    type="text"
                    value={gradientFrom}
                    onChange={(e) => setGradientFrom(e.target.value)}
                    onBlur={() => applyGradient(`linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`)}
                    style={{ display: "block", width: "100%", marginTop: 3, border: "1px solid #e2e8f0", borderRadius: 5, padding: "3px 8px", fontSize: 11, background: "#f8fafc", fontFamily: "monospace" }}
                    maxLength={9}
                  />
                </label>
                <label style={{ flex: 1, fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
                  До
                  <input
                    type="text"
                    value={gradientTo}
                    onChange={(e) => setGradientTo(e.target.value)}
                    onBlur={() => applyGradient(`linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`)}
                    style={{ display: "block", width: "100%", marginTop: 3, border: "1px solid #e2e8f0", borderRadius: 5, padding: "3px 8px", fontSize: 11, background: "#f8fafc", fontFamily: "monospace" }}
                    maxLength={9}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Image tab */}
        {tab === "image" && (
          <div>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onBlur={() => applyImage(imageUrl)}
              placeholder="https://..."
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 5, padding: "4px 8px", fontSize: 11, background: "#f8fafc", marginBottom: 6, boxSizing: "border-box" }}
            />
            <button
              type="button"
              onClick={() =>
                setImageLibraryCtx({
                  close: () => setImageLibraryCtx(null),
                  select: (asset, _complete) => {
                    const src = typeof asset === "string" ? asset : (asset as { src?: string }).src ?? "";
                    setImageUrl(src);
                    applyImage(src);
                    setImageLibraryCtx(null);
                  },
                })
              }
              style={{ width: "100%", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 5, padding: "5px 0", fontSize: 11, color: "#374151", cursor: "pointer", marginBottom: 6 }}
            >
              Из библиотеки
            </button>
          </div>
        )}

        {/* Clear button */}
        <button
          type="button"
          onClick={clearBackground}
          style={{ width: "100%", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 5, padding: "5px 0", fontSize: 10, color: "#b91c1c", cursor: "pointer", marginTop: 8 }}
        >
          Убрать фон
        </button>
      </div>

      {/* Image library modal reuse */}
      <LemnityBoxImageLibraryModal
        context={imageLibraryCtx}
        getEditor={() => null}
        projectId={projectId ?? undefined}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "lemnity-box-section-bg-popover"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/playground/lemnity-box/lemnity-box-section-bg-popover.tsx
git commit -m "feat: add LemnityBoxSectionBgPopover — color/gradient/image tabs for section bg"
```

---

### Task 3: Section Navigator Component

**Files:**
- Create: `components/playground/lemnity-box/lemnity-box-section-nav.tsx`

- [ ] **Step 1: Create `lemnity-box-section-nav.tsx`**

```tsx
"use client";

import { useEffect, useState, type RefObject } from "react";
import type { Component, Editor } from "grapesjs";

interface Props {
  editorRef: RefObject<Editor | null>;
}

function getSectionIndex(editor: Editor): { idx: number; total: number } {
  const wrapper = editor.DomComponents.getWrapper();
  const sections = wrapper?.components().models ?? [];
  const selected = editor.getSelected();
  if (!selected) return { idx: -1, total: sections.length };
  const idx = (sections as Component[]).findIndex(
    (s) => s === selected || s.contains(selected as never),
  );
  return { idx, total: sections.length };
}

export function LemnityBoxSectionNav({ editorRef }: Props) {
  const [state, setState] = useState<{ idx: number; total: number }>({ idx: -1, total: 0 });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const update = () => setState(getSectionIndex(editor));
    editor.on("component:selected", update);
    editor.on("component:deselected", update);
    return () => {
      editor.off("component:selected", update);
      editor.off("component:deselected", update);
    };
  }, [editorRef]);

  // Re-attach if editorRef is populated after mount
  useEffect(() => {
    let raf: number;
    let tries = 0;
    const poll = () => {
      if (editorRef.current) {
        const editor = editorRef.current;
        const update = () => setState(getSectionIndex(editor));
        editor.on("component:selected", update);
        editor.on("component:deselected", update);
        return;
      }
      if (tries++ < 60) raf = requestAnimationFrame(poll);
    };
    poll();
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { idx, total } = state;
  const hidden = idx === -1 || total === 0;

  const goTo = (targetIdx: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    const wrapper = editor.DomComponents.getWrapper();
    const target = wrapper?.components().at(targetIdx) as Component | undefined;
    if (!target) return;
    editor.select(target);
    target.getEl()?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(31,41,55,0.88)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        borderRadius: 20,
        padding: "4px 10px",
        display: hidden ? "none" : "flex",
        alignItems: "center",
        gap: 8,
        zIndex: 9999,
        pointerEvents: hidden ? "none" : "auto",
      }}
    >
      <button
        type="button"
        onClick={() => goTo(idx - 1)}
        disabled={idx <= 0}
        style={{
          width: 22, height: 22,
          background: "rgba(255,255,255,.1)",
          border: "none",
          borderRadius: "50%",
          color: "#fff",
          fontSize: 14,
          cursor: idx <= 0 ? "default" : "pointer",
          opacity: idx <= 0 ? 0.4 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ‹
      </button>
      <span style={{ fontSize: 11, color: "#fff", whiteSpace: "nowrap" }}>
        Секция {idx + 1} / {total}
      </span>
      <button
        type="button"
        onClick={() => goTo(idx + 1)}
        disabled={idx >= total - 1}
        style={{
          width: 22, height: 22,
          background: "rgba(255,255,255,.1)",
          border: "none",
          borderRadius: "50%",
          color: "#fff",
          fontSize: 14,
          cursor: idx >= total - 1 ? "default" : "pointer",
          opacity: idx >= total - 1 ? 0.4 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ›
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "lemnity-box-section-nav"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/playground/lemnity-box/lemnity-box-section-nav.tsx
git commit -m "feat: add LemnityBoxSectionNav — floating section navigator badge"
```

---

### Task 4: Wire All Five Features into Canvas Editor

**Files:**
- Modify: `components/playground/lemnity-box/lemnity-box-canvas-editor.tsx`

This task wires all features: registers bg picker toolbar button (A), adds RTE config (B), adds paste HTML keymap (C), renders section nav (D), and adds Delete keymap (E).

**Context:** The editor init block is at line ~1430. Existing toolbar registrations are at lines 1499–1504. The ref is `editorRef` (line 1281). The JSX return starts at line 1990. The `containerRef` div is at line 2004–2007.

- [ ] **Step 1: Add imports at the top of `lemnity-box-canvas-editor.tsx`**

Find the block of imports ending with `registerLemnityBoxToolbarSaveBlock` (around line 42) and add after it:

```typescript
import { registerLemnityBoxToolbarBgPicker } from "@/components/playground/lemnity-box/lemnity-box-toolbar-bg-picker";
import { LemnityBoxSectionBgPopover } from "@/components/playground/lemnity-box/lemnity-box-section-bg-popover";
import { LemnityBoxSectionNav } from "@/components/playground/lemnity-box/lemnity-box-section-nav";
```

- [ ] **Step 2: Add `bgPickerComponent` state**

After the existing `useState` declarations (around line 1295, after `userBlocksPanelOpen` and `pendingBlockSave`), add:

```typescript
const [bgPickerComponent, setBgPickerComponent] = useState<Component | null>(null);
```

- [ ] **Step 3: Register bg picker + keymaps after existing toolbar registrations**

After the block ending with `registerLemnityBoxToolbarSaveBlock(...)` call (line ~1504), add:

```typescript
        registerLemnityBoxToolbarBgPicker(editor, (comp) => setBgPickerComponent(comp));

        editor.Keymaps.add(
          "lemnity:paste-html",
          "ctrl+shift+v, ⌘+shift+v",
          async () => {
            const text = await navigator.clipboard.readText().catch(() => "");
            if (text.trim()) editor.addComponents(text.trim());
          },
        );

        editor.Keymaps.add("lemnity:delete-selected", "delete, backspace", (ed) => {
          const sel = ed.getSelected();
          if (!sel) return;
          sel.remove();
        });
```

- [ ] **Step 4: Add RTE config to `grapesjs.init()`**

In the `grapesjs.init({ ... })` call (line ~1430), add `rte` as a top-level key alongside `storageManager`, `layerManager`, etc.:

```typescript
        rte: {
          actions: [
            "bold",
            "italic",
            "underline",
            "strikeThrough",
            {
              name: "link",
              icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
              attributes: { title: "Ссылка" },
              result: (rte: { exec: (cmd: string, val?: string) => void }) => {
                const url = window.prompt("URL ссылки");
                if (url) rte.exec("createLink", url);
              },
            },
          ],
        },
```

- [ ] **Step 5: Add section nav and bg popover to JSX**

The `containerRef` div at lines 2004–2007:
```tsx
      <div
        ref={containerRef}
        className="lemnity-box-gjs-mount relative z-0 h-full min-h-[240px] min-w-0 flex-1"
      />
```

Wrap it together with the section nav in a `relative` wrapper, and add the bg popover after the closing `</div>` of the outer `overlayRef` div. Replace the `containerRef` div with:

```tsx
      <div style={{ position: "relative", flex: 1, minWidth: 0 }} className="h-full min-h-[240px]">
        <div
          ref={containerRef}
          className="lemnity-box-gjs-mount relative z-0 h-full min-h-[240px] min-w-0 flex-1"
        />
        <LemnityBoxSectionNav editorRef={editorRef} />
      </div>
```

And inside the outer `overlayRef` div, after `<LemnityBoxUserBlocksPanel .../>`, add:

```tsx
      {bgPickerComponent && (
        <LemnityBoxSectionBgPopover
          component={bgPickerComponent}
          onClose={() => setBgPickerComponent(null)}
          projectId={projectId}
        />
      )}
```

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 7: Run tests**

```bash
npm test
```
Expected: all tests pass (no tests in this component — just confirm no regressions).

- [ ] **Step 8: Commit**

```bash
git add components/playground/lemnity-box/lemnity-box-canvas-editor.tsx
git commit -m "feat: wire GrapesJS UX improvements — bg picker, RTE, paste HTML, section nav, delete shortcut"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ А: `lemnity-box-toolbar-bg-picker.ts` registers button on sections only, opens popover via `onOpen()`
- ✅ А: `lemnity-box-section-bg-popover.tsx` has Color/Gradient/Image tabs, 8 swatches, hex input, 6 gradient presets, URL + library, Убрать фон
- ✅ А: `detectTab()` reads `component.getStyle()` on open to set initial tab
- ✅ А: `component:deselected` closes the popover
- ✅ Б: `rte:` config in `grapesjs.init()` with bold/italic/underline/strikeThrough/link
- ✅ В: `lemnity:paste-html` keymap with `ctrl+shift+v, ⌘+shift+v`, `.catch(() => '')`
- ✅ Г: `LemnityBoxSectionNav` positioned `bottom:16, left:50%, translateX(-50%)`, hidden when `idx===-1||total===0`
- ✅ Г: `scrollIntoView({ behavior:'smooth', block:'start' })` on navigate
- ✅ Г: `getSectionIndex` uses `s.contains()` to find section ancestor
- ✅ Д: `lemnity:delete-selected` keymap with `delete, backspace`

**Boundary cases covered:**
- ✅ Clipboard API failure: `.catch(() => '')` in paste keymap
- ✅ Double-patch guard: `_lmnBgPatchApplied` flag on prototype
- ✅ Bg picker section-only: `tagName !== 'section'` returns early
- ✅ Delete in RTE: GrapesJS Keymaps built-in protection
