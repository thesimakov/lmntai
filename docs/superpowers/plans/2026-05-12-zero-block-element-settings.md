# Zero Block Element Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add missing settings panels for `tooltip`, `form`, and `gallery` element types in the Zero Block editor so users can configure them after placing them on the canvas.

**Architecture:** All changes are confined to a single file — `components/zero-block-editor/zb-settings-panel.tsx`. Three new panel functions (`TooltipPanel`, `FormPanel`, `GalleryPanel`) are added following the exact same pattern as existing panels (`VideoPanel`, `HtmlPanel`, etc.), then wired into the `ElementTypePanel` switch statement.

**Tech Stack:** React 19, TypeScript strict, Zustand store (`useZbEditorStore`), inline styles matching existing panel components.

---

## File Map

| File | Change |
|---|---|
| `components/zero-block-editor/zb-settings-panel.tsx` | Add imports + 3 panel functions + 3 switch cases |

No new files. No other files touched.

---

## Context for the implementer

`zb-settings-panel.tsx` exports `ZbSettingsPanel` — the right-side panel that appears when an element is selected in the Zero Block editor. It reads the selected element from `useZbEditorStore()` and renders a type-specific settings form.

The file has these sections (read the full file before starting):
1. **Imports** — types from `lib/zero-block-editor/types.ts`
2. **Primitive UI components** — `Label`, `Row`, `Group`, `NumberInput`, `ColorInput`, `SelectInput`, `TextInput`, `Toggle` — **use these, don't invent new ones**
3. **Per-type panel functions** — `TextPanel`, `ImagePanel`, `ShapePanel`, `ButtonPanel`, `VectorPanel`, `VideoPanel`, `HtmlPanel`
4. **`ElementTypePanel`** — `switch(el.type)` that dispatches to the above; currently `tooltip`, `form`, `gallery` hit `default: return null`
5. **`ZbSettingsPanel`** — main exported component

The store mutation pattern is always:
```typescript
const { updateElementProps } = useZbEditorStore();
const p = el.props as unknown as ZbSomeProps;
const u = (patch: Partial<ZbSomeProps>) => updateElementProps(el.id, patch as Record<string, unknown>);
```

All types are defined in `lib/zero-block-editor/types.ts`. Read that file too — specifically `ZbTooltipProps`, `ZbFormProps`, `ZbFormField`, `ZbGalleryProps`.

---

## Task 1: TooltipPanel

**Files:**
- Modify: `components/zero-block-editor/zb-settings-panel.tsx`

- [ ] **Step 1: Add missing imports**

Find the import block at the top of `zb-settings-panel.tsx`:

```typescript
import type {
  ZbElement,
  ZbResponsiveOverride,
  ZbTextProps,
  ZbImageProps,
  ZbShapeProps,
  ZbButtonProps,
  ZbVectorProps,
  ZbVideoProps,
  ZbHtmlProps,
  ZbAnimationConfig,
} from "@/lib/zero-block-editor/types";
```

Replace with:

```typescript
import type {
  ZbElement,
  ZbResponsiveOverride,
  ZbTextProps,
  ZbImageProps,
  ZbShapeProps,
  ZbButtonProps,
  ZbVectorProps,
  ZbVideoProps,
  ZbHtmlProps,
  ZbTooltipProps,
  ZbFormProps,
  ZbFormField,
  ZbGalleryProps,
  ZbAnimationConfig,
} from "@/lib/zero-block-editor/types";
```

- [ ] **Step 2: Add `TooltipPanel` function after `HtmlPanel`**

Find the end of `HtmlPanel` (the closing `}` of the function, around line 515, just before the `// ─── Animation panel` comment). Insert this new function between `HtmlPanel` and the animation section:

```typescript
function TooltipPanel({ el }: { el: ZbElement }) {
  const { updateElementProps } = useZbEditorStore();
  const p = el.props as unknown as ZbTooltipProps;
  const u = (patch: Partial<ZbTooltipProps>) => updateElementProps(el.id, patch as Record<string, unknown>);

  return (
    <>
      <Group label="Содержимое">
        <TextInput value={p.triggerText} onChange={(v) => u({ triggerText: v })} label="Текст триггера" />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Текст подсказки</span>
          <textarea
            value={p.content}
            onChange={(e) => u({ content: e.target.value })}
            rows={3}
            style={{
              width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0",
              borderRadius: 5, fontSize: 12, background: "#f8fafc", color: "#1e293b",
              outline: "none", resize: "vertical",
            }}
          />
        </div>
      </Group>
      <Group label="Поведение">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Триггер</span>
          <Row>
            {(["hover", "click"] as const).map((t) => (
              <button
                key={t}
                onClick={() => u({ trigger: t })}
                style={{
                  flex: 1, height: 28, borderRadius: 5, fontSize: 11, cursor: "pointer",
                  background: p.trigger === t ? "#eff6ff" : "#f8fafc",
                  color: p.trigger === t ? "#2563eb" : "#374151",
                  border: p.trigger === t ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                  fontWeight: p.trigger === t ? 600 : 400,
                }}
              >
                {t === "hover" ? "Наведение" : "Клик"}
              </button>
            ))}
          </Row>
        </div>
        {p.trigger === "hover" && (
          <NumberInput
            value={p.delay}
            onChange={(v) => u({ delay: Math.max(0, v) })}
            min={0}
            label="Задержка"
            suffix="мс"
          />
        )}
      </Group>
      <Group label="Позиция">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {(["top", "bottom", "left", "right"] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => u({ position: pos })}
              style={{
                height: 28, borderRadius: 5, fontSize: 11, cursor: "pointer",
                background: p.position === pos ? "#eff6ff" : "#f8fafc",
                color: p.position === pos ? "#2563eb" : "#374151",
                border: p.position === pos ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                fontWeight: p.position === pos ? 600 : 400,
              }}
            >
              {pos === "top" ? "↑ Сверху" : pos === "bottom" ? "↓ Снизу" : pos === "left" ? "← Слева" : "→ Справа"}
            </button>
          ))}
        </div>
      </Group>
    </>
  );
}
```

- [ ] **Step 3: Wire `TooltipPanel` into `ElementTypePanel` switch**

Find `ElementTypePanel` in the file — the `switch (el.type)` block. Change `default: return null` to add the new case before it:

```typescript
function ElementTypePanel({ el }: { el: ZbElement }) {
  switch (el.type) {
    case "text":    return <TextPanel el={el} />;
    case "image":   return <ImagePanel el={el} />;
    case "shape":   return <ShapePanel el={el} />;
    case "button":  return <ButtonPanel el={el} />;
    case "vector":  return <VectorPanel el={el} />;
    case "video":   return <VideoPanel el={el} />;
    case "html":    return <HtmlPanel el={el} />;
    case "tooltip": return <TooltipPanel el={el} />;
    default:        return null;
  }
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open Zero Block editor, add a Tooltip element, select it. The right panel should show three groups: «Содержимое», «Поведение», «Позиция». Change trigger to «Клик» — the delay field should disappear. Change back to «Наведение» — delay should reappear.

- [ ] **Step 6: Commit**

```bash
git add components/zero-block-editor/zb-settings-panel.tsx
git commit -m "feat: add TooltipPanel settings in Zero Block editor"
```

---

## Task 2: FormPanel

**Files:**
- Modify: `components/zero-block-editor/zb-settings-panel.tsx`

- [ ] **Step 1: Add `FormPanel` function after `TooltipPanel`**

Insert this function directly after `TooltipPanel`'s closing `}`:

```typescript
function FormPanel({ el }: { el: ZbElement }) {
  const { updateElementProps } = useZbEditorStore();
  const p = el.props as unknown as ZbFormProps;
  const u = (patch: Partial<ZbFormProps>) => updateElementProps(el.id, patch as Record<string, unknown>);

  const addField = () => {
    if (p.fields.length >= 10) return;
    const newField: ZbFormField = {
      id: `field_${Date.now()}`,
      fieldType: "input",
      label: "Новое поле",
      required: false,
      placeholder: "",
    };
    u({ fields: [...p.fields, newField] });
  };

  const updateField = (idx: number, patch: Partial<ZbFormField>) => {
    u({ fields: p.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)) });
  };

  const removeField = (idx: number) => {
    u({ fields: p.fields.filter((_, i) => i !== idx) });
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const arr = [...p.fields];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    u({ fields: arr });
  };

  return (
    <>
      <Group label="Поля">
        {p.fields.length === 0 ? (
          <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>
            Нет полей — нажмите + Поле
          </div>
        ) : (
          p.fields.map((field, idx) => (
            <div
              key={field.id}
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}
            >
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <SelectInput
                  value={field.fieldType}
                  onChange={(v) => updateField(idx, { fieldType: v as ZbFormField["fieldType"] })}
                  options={[
                    { value: "input", label: "Текст" },
                    { value: "textarea", label: "Textarea" },
                    { value: "select", label: "Select" },
                    { value: "checkbox", label: "Checkbox" },
                    { value: "radio", label: "Radio" },
                  ]}
                />
                <button
                  onClick={() => moveField(idx, -1)}
                  disabled={idx === 0}
                  style={{ width: 22, height: 22, border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", cursor: idx === 0 ? "default" : "pointer", fontSize: 11, flexShrink: 0 }}
                >↑</button>
                <button
                  onClick={() => moveField(idx, 1)}
                  disabled={idx === p.fields.length - 1}
                  style={{ width: 22, height: 22, border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", cursor: idx === p.fields.length - 1 ? "default" : "pointer", fontSize: 11, flexShrink: 0 }}
                >↓</button>
                <button
                  onClick={() => removeField(idx)}
                  style={{ width: 22, height: 22, border: "1px solid #fca5a5", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 11, color: "#ef4444", flexShrink: 0 }}
                >🗑</button>
              </div>
              <TextInput value={field.label} onChange={(v) => updateField(idx, { label: v })} label="Название" />
              {!["checkbox", "radio"].includes(field.fieldType) && (
                <TextInput
                  value={field.placeholder ?? ""}
                  onChange={(v) => updateField(idx, { placeholder: v })}
                  label="Placeholder"
                />
              )}
              <Toggle checked={field.required} onChange={(v) => updateField(idx, { required: v })} label="Обязательное" />
            </div>
          ))
        )}
        <button
          onClick={addField}
          disabled={p.fields.length >= 10}
          title={p.fields.length >= 10 ? "Максимум 10 полей" : undefined}
          style={{
            width: "100%", height: 28, borderRadius: 5, fontSize: 11,
            cursor: p.fields.length >= 10 ? "not-allowed" : "pointer",
            background: "#f8fafc",
            color: p.fields.length >= 10 ? "#94a3b8" : "#2563eb",
            border: "1px dashed #e2e8f0",
          }}
        >
          + Поле
        </button>
      </Group>
      <Group label="Отправка">
        <TextInput value={p.submitText} onChange={(v) => u({ submitText: v })} label="Текст кнопки" placeholder="Отправить" />
        <TextInput value={p.successMessage} onChange={(v) => u({ successMessage: v })} label="Сообщение об успехе" placeholder="Спасибо!" />
        <TextInput
          value={p.action ?? ""}
          onChange={(v) => u({ action: v || undefined })}
          label="URL отправки (action)"
          placeholder="https://..."
        />
      </Group>
    </>
  );
}
```

- [ ] **Step 2: Wire `FormPanel` into `ElementTypePanel` switch**

Update the switch (add `case "form"` before `default`):

```typescript
function ElementTypePanel({ el }: { el: ZbElement }) {
  switch (el.type) {
    case "text":    return <TextPanel el={el} />;
    case "image":   return <ImagePanel el={el} />;
    case "shape":   return <ShapePanel el={el} />;
    case "button":  return <ButtonPanel el={el} />;
    case "vector":  return <VectorPanel el={el} />;
    case "video":   return <VideoPanel el={el} />;
    case "html":    return <HtmlPanel el={el} />;
    case "tooltip": return <TooltipPanel el={el} />;
    case "form":    return <FormPanel el={el} />;
    default:        return null;
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

Add a Form element to the canvas, select it. Verify:
- Two groups appear: «Поля» and «Отправка»
- Default fields (Имя, Email) are listed
- «+ Поле» adds a new field row; limit at 10 disables the button
- ↑↓ buttons reorder fields
- 🗑 removes a field; when all removed, placeholder text appears
- Placeholder field hidden for checkbox/radio
- Submit settings update in the store

- [ ] **Step 5: Commit**

```bash
git add components/zero-block-editor/zb-settings-panel.tsx
git commit -m "feat: add FormPanel settings in Zero Block editor"
```

---

## Task 3: GalleryPanel

**Files:**
- Modify: `components/zero-block-editor/zb-settings-panel.tsx`

- [ ] **Step 1: Add `GalleryPanel` function after `FormPanel`**

Insert this function directly after `FormPanel`'s closing `}`:

```typescript
function GalleryPanel({ el }: { el: ZbElement }) {
  const { updateElementProps } = useZbEditorStore();
  const p = el.props as unknown as ZbGalleryProps;
  const u = (patch: Partial<ZbGalleryProps>) => updateElementProps(el.id, patch as Record<string, unknown>);

  const addImage = () => {
    if (p.images.length >= 20) return;
    u({ images: [...p.images, ""] });
  };

  const updateImage = (idx: number, val: string) => {
    u({ images: p.images.map((img, i) => (i === idx ? val : img)) });
  };

  const removeImage = (idx: number) => {
    u({ images: p.images.filter((_, i) => i !== idx) });
  };

  return (
    <>
      <Group label="Изображения">
        {p.images.length === 0 ? (
          <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>
            Нет изображений
          </div>
        ) : (
          p.images.map((img, idx) => (
            <div key={idx} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <TextInput value={img} onChange={(v) => updateImage(idx, v)} placeholder="https://..." />
              <button
                onClick={() => removeImage(idx)}
                style={{ width: 22, height: 22, border: "1px solid #fca5a5", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 11, color: "#ef4444", flexShrink: 0 }}
              >🗑</button>
            </div>
          ))
        )}
        <button
          onClick={addImage}
          disabled={p.images.length >= 20}
          title={p.images.length >= 20 ? "Максимум 20 изображений" : undefined}
          style={{
            width: "100%", height: 28, borderRadius: 5, fontSize: 11,
            cursor: p.images.length >= 20 ? "not-allowed" : "pointer",
            background: "#f8fafc",
            color: p.images.length >= 20 ? "#94a3b8" : "#2563eb",
            border: "1px dashed #e2e8f0",
          }}
        >
          + Изображение
        </button>
      </Group>
      <Group label="Вид">
        <div style={{ display: "flex", gap: 4 }}>
          {(
            [
              ["slider", "Слайдер"],
              ["grid", "Сетка"],
              ["masonry", "Мозаика"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => u({ layout: val })}
              style={{
                flex: 1, height: 28, borderRadius: 5, fontSize: 10, cursor: "pointer",
                background: p.layout === val ? "#eff6ff" : "#f8fafc",
                color: p.layout === val ? "#2563eb" : "#374151",
                border: p.layout === val ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                fontWeight: p.layout === val ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <Toggle checked={p.lightbox} onChange={(v) => u({ lightbox: v })} label="Lightbox" />
        <Toggle checked={p.arrows} onChange={(v) => u({ arrows: v })} label="Стрелки" />
      </Group>
      <Group label="Поведение">
        <Toggle checked={p.autoplay} onChange={(v) => u({ autoplay: v })} label="Автопроигрывание" />
        {p.autoplay && (
          <NumberInput
            value={p.autoplayInterval ?? 3000}
            onChange={(v) => u({ autoplayInterval: Math.max(500, v) })}
            min={500}
            label="Интервал"
            suffix="мс"
          />
        )}
      </Group>
    </>
  );
}
```

- [ ] **Step 2: Wire `GalleryPanel` into `ElementTypePanel` switch**

Final state of the switch:

```typescript
function ElementTypePanel({ el }: { el: ZbElement }) {
  switch (el.type) {
    case "text":    return <TextPanel el={el} />;
    case "image":   return <ImagePanel el={el} />;
    case "shape":   return <ShapePanel el={el} />;
    case "button":  return <ButtonPanel el={el} />;
    case "vector":  return <VectorPanel el={el} />;
    case "video":   return <VideoPanel el={el} />;
    case "html":    return <HtmlPanel el={el} />;
    case "tooltip": return <TooltipPanel el={el} />;
    case "form":    return <FormPanel el={el} />;
    case "gallery": return <GalleryPanel el={el} />;
    default:        return null;
  }
}
```

- [ ] **Step 3: TypeScript check + full test suite**

```bash
npx tsc --noEmit && npm test
```

Expected: no TypeScript errors, all 148 tests pass.

- [ ] **Step 4: Manual verification**

Add a Gallery element to the canvas, select it. Verify:
- Three groups appear: «Изображения», «Вид», «Поведение»
- «Нет изображений» placeholder shown initially
- «+ Изображение» adds URL input rows; limit at 20 disables button
- 🗑 removes images
- Layout buttons (Слайдер/Сетка/Мозаика) toggle active style
- Autoplay toggle reveals/hides interval input
- autoplayInterval clamped to minimum 500ms

- [ ] **Step 5: Commit**

```bash
git add components/zero-block-editor/zb-settings-panel.tsx
git commit -m "feat: add GalleryPanel settings in Zero Block editor"
```
