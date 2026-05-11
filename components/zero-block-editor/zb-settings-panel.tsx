"use client";

import { useZbEditorStore } from "@/lib/zero-block-editor/store";
import { getEffectiveGeometry } from "@/lib/zero-block-editor/responsive";
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
import { useState, useCallback } from "react";

// ─── Primitives ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </div>
  );
}

function Row({ children, gap = 6 }: { children: React.ReactNode; gap?: number }) {
  return <div style={{ display: "flex", gap, alignItems: "center" }}>{children}</div>;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  label,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
      {label && <span style={{ fontSize: 10, color: "#94a3b8" }}>{label}</span>}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: "100%",
            height: 28,
            padding: "0 6px",
            border: "1px solid #e2e8f0",
            borderRadius: 5,
            fontSize: 12,
            background: "#f8fafc",
            color: "#1e293b",
            outline: "none",
          }}
        />
        {suffix && <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
      {label && <span style={{ fontSize: 10, color: "#94a3b8" }}>{label}</span>}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input
          type="color"
          value={value.startsWith("#") ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 28, height: 28, border: "1px solid #e2e8f0", borderRadius: 5, padding: 2, cursor: "pointer" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            height: 28,
            padding: "0 6px",
            border: "1px solid #e2e8f0",
            borderRadius: 5,
            fontSize: 11,
            background: "#f8fafc",
            color: "#1e293b",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  label?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
      {label && <span style={{ fontSize: 10, color: "#94a3b8" }}>{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 28,
          padding: "0 6px",
          border: "1px solid #e2e8f0",
          borderRadius: 5,
          fontSize: 12,
          background: "#f8fafc",
          color: "#1e293b",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextInput({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label?: string; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
      {label && <span style={{ fontSize: 10, color: "#94a3b8" }}>{label}</span>}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 28,
          padding: "0 6px",
          border: "1px solid #e2e8f0",
          borderRadius: 5,
          fontSize: 12,
          background: "#f8fafc",
          color: "#1e293b",
          outline: "none",
          width: "100%",
        }}
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#374151" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          background: checked ? "#2563eb" : "#e2e8f0",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 14 : 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
          }}
        />
      </div>
      {label}
    </label>
  );
}

// ─── Common geometry panel ────────────────────────────────────────────────────

function GeometryPanel({ el }: { el: ZbElement }) {
  const { updateElement, updateElementResponsive, breakpoint } = useZbEditorStore();
  const eff = getEffectiveGeometry(el, breakpoint);
  const isResponsive = breakpoint !== "desktop";

  const updGeom = (patch: ZbResponsiveOverride) => {
    if (isResponsive) {
      updateElementResponsive(el.id, breakpoint, patch);
    } else {
      updateElement(el.id, patch as Partial<ZbElement>);
    }
  };

  const updBase = (patch: Partial<ZbElement>) => updateElement(el.id, patch);

  return (
    <Group label="Позиция и размер">
      {isResponsive && (
        <div style={{
          fontSize: 10,
          color: "#2563eb",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 4,
          padding: "3px 6px",
          marginBottom: 4,
        }}>
          Адаптация: {breakpoint}px — изменения только для этого брейкпоинта
        </div>
      )}
      <Row>
        <NumberInput label="X" value={Math.round(eff.x)} onChange={(v) => updGeom({ x: v })} suffix="px" />
        <NumberInput label="Y" value={Math.round(eff.y)} onChange={(v) => updGeom({ y: v })} suffix="px" />
      </Row>
      <Row>
        <NumberInput label="W" value={Math.round(eff.w)} onChange={(v) => updGeom({ w: Math.max(1, v) })} min={1} suffix="px" />
        <NumberInput label="H" value={Math.round(eff.h)} onChange={(v) => updGeom({ h: Math.max(1, v) })} min={1} suffix="px" />
      </Row>
      <Row>
        <NumberInput label="Поворот" value={Math.round(el.rot)} onChange={(v) => updBase({ rot: v })} suffix="°" min={-360} max={360} />
        <NumberInput label="Прозрачность" value={Math.round(el.opacity * 100)} onChange={(v) => updBase({ opacity: Math.min(1, Math.max(0, v / 100)) })} min={0} max={100} suffix="%" />
      </Row>
      <Row>
        <NumberInput label="Z-index" value={el.zIndex} onChange={(v) => updBase({ zIndex: v })} min={0} />
      </Row>
    </Group>
  );
}

// ─── Type-specific panels ─────────────────────────────────────────────────────

const FONT_FAMILIES = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Times New Roman, serif", label: "Times New Roman" },
  { value: "Courier New, monospace", label: "Courier New" },
  { value: "Roboto, sans-serif", label: "Roboto" },
  { value: "Montserrat, sans-serif", label: "Montserrat" },
  { value: "Playfair Display, serif", label: "Playfair Display" },
];

function TextPanel({ el }: { el: ZbElement }) {
  const { updateElementProps, breakpoint, updateElementResponsive } = useZbEditorStore();
  const p = el.props as unknown as ZbTextProps;
  const u = (patch: Partial<ZbTextProps>) => updateElementProps(el.id, patch as Record<string, unknown>);
  const isResponsive = breakpoint !== "desktop";
  const override = el.responsive[breakpoint] ?? {};
  const ur = (patch: Partial<ZbResponsiveOverride>) => updateElementResponsive(el.id, breakpoint, patch);

  return (
    <>
      <Group label="Шрифт">
        <SelectInput value={p.fontFamily} onChange={(v) => u({ fontFamily: v })} options={FONT_FAMILIES} label="Гарнитура" />
        <Row>
          <NumberInput label="Размер" value={p.fontSize} onChange={(v) => u({ fontSize: v })} min={1} max={300} suffix="px" />
          <NumberInput label="Насыщенность" value={p.fontWeight} onChange={(v) => u({ fontWeight: v })} min={100} max={900} step={100} />
        </Row>
        <Row>
          <NumberInput label="Межстрочный" value={p.lineHeight} onChange={(v) => u({ lineHeight: v })} min={0.5} max={5} step={0.1} />
          <NumberInput label="Трекинг" value={p.letterSpacing} onChange={(v) => u({ letterSpacing: v })} suffix="px" />
        </Row>
      </Group>
      <Group label="Цвет и выравнивание">
        <ColorInput value={p.color} onChange={(v) => u({ color: v })} label="Цвет текста" />
        <SelectInput
          value={p.textAlign}
          onChange={(v) => u({ textAlign: v as ZbTextProps["textAlign"] })}
          options={[
            { value: "left", label: "По левому краю" },
            { value: "center", label: "По центру" },
            { value: "right", label: "По правому краю" },
          ]}
          label="Выравнивание"
        />
      </Group>
      {isResponsive && (
        <Group label={`Адаптация ${breakpoint}px`}>
          <div style={{ fontSize: 10, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4, padding: "3px 6px", marginBottom: 4 }}>
            Переопределения для {breakpoint}px
          </div>
          <NumberInput label="Размер шрифта" value={override.fontSize ?? p.fontSize} onChange={(v) => ur({ fontSize: v })} min={1} max={300} suffix="px" />
          <NumberInput label="Насыщенность" value={override.fontWeight ?? p.fontWeight} onChange={(v) => ur({ fontWeight: v })} min={100} max={900} step={100} />
          <NumberInput label="Межстрочный" value={override.lineHeight ?? p.lineHeight} onChange={(v) => ur({ lineHeight: v })} min={0.5} max={5} step={0.1} />
          <NumberInput label="Трекинг" value={override.letterSpacing ?? p.letterSpacing} onChange={(v) => ur({ letterSpacing: v })} suffix="px" />
          <ColorInput value={override.color ?? p.color} onChange={(v) => ur({ color: v })} label="Цвет текста" />
        </Group>
      )}
      <Group label="Дополнительно">
        <TextInput value={p.hyperlink ?? ""} onChange={(v) => u({ hyperlink: v || undefined })} label="Ссылка (href)" placeholder="https://..." />
        <TextInput value={p.textShadow ?? ""} onChange={(v) => u({ textShadow: v || undefined })} label="Тень текста" placeholder="1px 1px 4px #000" />
        <Toggle checked={p.autoHeight} onChange={(v) => u({ autoHeight: v })} label="Авто-высота" />
      </Group>
    </>
  );
}

function ImagePanel({ el }: { el: ZbElement }) {
  const { updateElementProps } = useZbEditorStore();
  const p = el.props as unknown as ZbImageProps;
  const u = (patch: Partial<ZbImageProps>) => updateElementProps(el.id, patch as Record<string, unknown>);

  return (
    <>
      <Group label="Изображение">
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Загрузить файл</span>
          <input
            type="file"
            accept="image/*"
            style={{ fontSize: 11 }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => u({ src: ev.target?.result as string });
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <TextInput value={p.src} onChange={(v) => u({ src: v })} label="URL" placeholder="https://..." />
        <TextInput value={p.alt} onChange={(v) => u({ alt: v })} label="Alt-текст" />
      </Group>
      <Group label="Стиль">
        <SelectInput
          value={p.objectFit}
          onChange={(v) => u({ objectFit: v as ZbImageProps["objectFit"] })}
          options={[
            { value: "cover", label: "Cover (заполнение)" },
            { value: "contain", label: "Contain (вписать)" },
          ]}
          label="Режим заполнения"
        />
        <NumberInput value={p.borderRadius} onChange={(v) => u({ borderRadius: v })} min={0} label="Скругление" suffix="px" />
        <TextInput value={p.boxShadow ?? ""} onChange={(v) => u({ boxShadow: v || undefined })} label="Тень" placeholder="0 4px 12px #0002" />
        <Toggle checked={p.lazyLoad} onChange={(v) => u({ lazyLoad: v })} label="Lazy load" />
      </Group>
      <Group label="Ссылка">
        <TextInput value={p.link ?? ""} onChange={(v) => u({ link: v || undefined })} label="href" placeholder="https://..." />
      </Group>
    </>
  );
}

function ShapePanel({ el }: { el: ZbElement }) {
  const { updateElementProps } = useZbEditorStore();
  const p = el.props as unknown as ZbShapeProps;
  const u = (patch: Partial<ZbShapeProps>) => updateElementProps(el.id, patch as Record<string, unknown>);

  return (
    <Group label="Фигура">
      <SelectInput
        value={p.shapeType}
        onChange={(v) => u({ shapeType: v as ZbShapeProps["shapeType"] })}
        options={[
          { value: "rectangle", label: "Прямоугольник" },
          { value: "circle", label: "Круг / Эллипс" },
          { value: "line", label: "Линия" },
        ]}
        label="Тип"
      />
      <ColorInput value={p.fill} onChange={(v) => u({ fill: v })} label="Заливка" />
      <TextInput value={p.gradient ?? ""} onChange={(v) => u({ gradient: v || undefined })} label="Градиент (CSS)" placeholder="linear-gradient(90deg,#f00,#00f)" />
      <NumberInput value={p.borderRadius} onChange={(v) => u({ borderRadius: v })} min={0} label="Скругление" suffix="px" />
      <TextInput value={p.border ?? ""} onChange={(v) => u({ border: v || undefined })} label="Обводка" placeholder="2px solid #000" />
    </Group>
  );
}

function ButtonPanel({ el }: { el: ZbElement }) {
  const { updateElementProps } = useZbEditorStore();
  const p = el.props as unknown as ZbButtonProps;
  const u = (patch: Partial<ZbButtonProps>) => updateElementProps(el.id, patch as Record<string, unknown>);

  return (
    <>
      <Group label="Текст и ссылка">
        <TextInput value={p.text} onChange={(v) => u({ text: v })} label="Текст кнопки" />
        <TextInput value={p.link} onChange={(v) => u({ link: v })} label="Ссылка" placeholder="https://..." />
        <Toggle checked={p.targetBlank} onChange={(v) => u({ targetBlank: v })} label="Открывать в новой вкладке" />
      </Group>
      <Group label="Стиль">
        <Row>
          <ColorInput value={p.backgroundColor} onChange={(v) => u({ backgroundColor: v })} label="Фон" />
          <ColorInput value={p.textColor} onChange={(v) => u({ textColor: v })} label="Текст" />
        </Row>
        <Row>
          <NumberInput value={p.fontSize} onChange={(v) => u({ fontSize: v })} min={8} label="Размер шрифта" suffix="px" />
          <NumberInput value={p.fontWeight} onChange={(v) => u({ fontWeight: v })} min={100} max={900} step={100} label="Насыщенность" />
        </Row>
        <NumberInput value={p.borderRadius} onChange={(v) => u({ borderRadius: v })} min={0} label="Скругление" suffix="px" />
        <TextInput value={p.border ?? ""} onChange={(v) => u({ border: v || undefined })} label="Обводка" placeholder="2px solid #000" />
      </Group>
    </>
  );
}

function VectorPanel({ el }: { el: ZbElement }) {
  const { updateElementProps } = useZbEditorStore();
  const p = el.props as unknown as ZbVectorProps;
  const u = (patch: Partial<ZbVectorProps>) => updateElementProps(el.id, patch as Record<string, unknown>);

  return (
    <Group label="Вектор (SVG)">
      <ColorInput value={p.fill} onChange={(v) => u({ fill: v })} label="Заливка" />
      <ColorInput value={p.stroke} onChange={(v) => u({ stroke: v })} label="Обводка" />
      <NumberInput value={p.strokeWidth} onChange={(v) => u({ strokeWidth: v })} min={0} label="Толщина обводки" />
      <label style={{ fontSize: 10, color: "#94a3b8" }}>
        Загрузить SVG файл
        <input
          type="file"
          accept=".svg,image/svg+xml"
          style={{ display: "block", marginTop: 4, fontSize: 11 }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => u({ svgContent: ev.target?.result as string });
            reader.readAsText(file);
          }}
        />
      </label>
    </Group>
  );
}

function VideoPanel({ el }: { el: ZbElement }) {
  const { updateElementProps } = useZbEditorStore();
  const p = el.props as unknown as ZbVideoProps;
  const u = (patch: Partial<ZbVideoProps>) => updateElementProps(el.id, patch as Record<string, unknown>);

  return (
    <Group label="Видео">
      <SelectInput
        value={p.videoType}
        onChange={(v) => u({ videoType: v as ZbVideoProps["videoType"] })}
        options={[
          { value: "youtube", label: "YouTube" },
          { value: "vimeo", label: "Vimeo" },
          { value: "mp4", label: "MP4" },
        ]}
        label="Источник"
      />
      <TextInput value={p.url} onChange={(v) => u({ url: v })} label="URL" placeholder="https://..." />
      <Toggle checked={p.autoplay} onChange={(v) => u({ autoplay: v })} label="Автовоспроизведение" />
      <Toggle checked={p.muted} onChange={(v) => u({ muted: v })} label="Без звука" />
      <Toggle checked={p.controls} onChange={(v) => u({ controls: v })} label="Панель управления" />
      <Toggle checked={p.loop} onChange={(v) => u({ loop: v })} label="Зацикленность" />
    </Group>
  );
}

function HtmlPanel({ el }: { el: ZbElement }) {
  const { updateElementProps } = useZbEditorStore();
  const p = el.props as unknown as ZbHtmlProps;
  const u = (patch: Partial<ZbHtmlProps>) => updateElementProps(el.id, patch as Record<string, unknown>);

  return (
    <Group label="HTML / CSS">
      <label style={{ fontSize: 10, color: "#94a3b8" }}>HTML</label>
      <textarea
        value={p.html}
        onChange={(e) => u({ html: e.target.value })}
        rows={5}
        style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 11, fontFamily: "monospace", resize: "vertical", background: "#f8fafc", color: "#1e293b", outline: "none" }}
      />
      <label style={{ fontSize: 10, color: "#94a3b8" }}>CSS</label>
      <textarea
        value={p.css}
        onChange={(e) => u({ css: e.target.value })}
        rows={3}
        style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 11, fontFamily: "monospace", resize: "vertical", background: "#f8fafc", color: "#1e293b", outline: "none" }}
      />
    </Group>
  );
}

// ─── Animation panel ──────────────────────────────────────────────────────────

function AnimationPanel({ el }: { el: ZbElement }) {
  const { updateElement } = useZbEditorStore();
  const anim = el.animation;

  const enableAnim = () =>
    updateElement(el.id, {
      animation: { animType: "fade", delay: 0, duration: 600, trigger: "scroll", easing: "ease" },
    });

  const disableAnim = () => updateElement(el.id, { animation: null });

  const u = (patch: Partial<ZbAnimationConfig>) =>
    updateElement(el.id, { animation: { ...el.animation!, ...patch } });

  return (
    <Group label="Анимация">
      <Toggle
        checked={!!anim}
        onChange={(v) => (v ? enableAnim() : disableAnim())}
        label="Включить анимацию"
      />
      {anim && (
        <>
          <SelectInput
            value={anim.animType}
            onChange={(v) => u({ animType: v as ZbAnimationConfig["animType"] })}
            options={[
              { value: "fade", label: "Fade (плавное появление)" },
              { value: "slide", label: "Slide (скольжение)" },
              { value: "zoom", label: "Zoom (масштаб)" },
              { value: "parallax", label: "Parallax" },
            ]}
            label="Тип"
          />
          <SelectInput
            value={anim.trigger}
            onChange={(v) => u({ trigger: v as ZbAnimationConfig["trigger"] })}
            options={[
              { value: "scroll", label: "При прокрутке" },
              { value: "load", label: "При загрузке страницы" },
            ]}
            label="Триггер"
          />
          <SelectInput
            value={anim.easing ?? "ease"}
            onChange={(v) => u({ easing: v as ZbAnimationConfig["easing"] })}
            options={[
              { value: "linear", label: "Linear" },
              { value: "ease", label: "Ease" },
              { value: "ease-in", label: "Ease In" },
              { value: "ease-out", label: "Ease Out" },
              { value: "ease-in-out", label: "Ease In-Out" },
            ]}
            label="Замедление"
          />
          <Row>
            <NumberInput value={anim.delay} onChange={(v) => u({ delay: v })} min={0} label="Задержка" suffix="ms" />
            <NumberInput value={anim.duration} onChange={(v) => u({ duration: v })} min={100} label="Длительность" suffix="ms" />
          </Row>
        </>
      )}
    </Group>
  );
}

// ─── Lock / Visibility ────────────────────────────────────────────────────────

function ElementActionsPanel({ el }: { el: ZbElement }) {
  const { updateElement, renameElement } = useZbEditorStore();
  return (
    <Group label="Элемент">
      <TextInput value={el.name} onChange={(v) => renameElement(el.id, v)} label="Название" />
      <Toggle checked={el.locked} onChange={(v) => updateElement(el.id, { locked: v })} label="Заблокировать" />
      <Toggle checked={!el.visible} onChange={(v) => updateElement(el.id, { visible: !v })} label="Скрыть" />
    </Group>
  );
}

// ─── Canvas settings panel (shown when nothing selected) ──────────────────────

function CanvasSettingsPanel() {
  const { canvas, updateCanvas } = useZbEditorStore();

  const [heightMode, setHeightMode] = useState<"px" | "vh">("px");
  const [heightInput, setHeightInput] = useState(canvas.height);

  const applyHeight = useCallback(
    (val: number, mode: "px" | "vh") => {
      const h = mode === "px" ? val : Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * val / 100);
      updateCanvas({ height: Math.max(100, h) });
    },
    [updateCanvas],
  );

  const switchMode = (newMode: "px" | "vh") => {
    if (newMode === heightMode) return;
    if (newMode === "vh") {
      const vh = Math.round(canvas.height / (typeof window !== "undefined" ? window.innerHeight : 800) * 100);
      setHeightInput(vh);
    } else {
      const px = Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * heightInput / 100);
      setHeightInput(px);
    }
    setHeightMode(newMode);
  };

  return (
    <>
      <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Блок</div>
      </div>

      <Group label="Высота">
        <Row>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Значение</span>
            <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 2 }}>
              <input
                type="number"
                value={heightInput}
                min={heightMode === "vh" ? 1 : 100}
                max={heightMode === "vh" ? 100 : 9999}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setHeightInput(v);
                  applyHeight(v, heightMode);
                }}
                style={{
                  flex: 1,
                  height: 28,
                  padding: "0 6px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 5,
                  fontSize: 12,
                  background: "#f8fafc",
                  color: "#1e293b",
                  outline: "none",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Единица</span>
            <select
              value={heightMode}
              onChange={(e) => switchMode(e.target.value as "px" | "vh")}
              style={{
                height: 28,
                padding: "0 6px",
                border: "1px solid #e2e8f0",
                borderRadius: 5,
                fontSize: 12,
                background: "#f8fafc",
                color: "#1e293b",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="px">px</option>
              <option value="vh">% экр.</option>
            </select>
          </div>
        </Row>
        <div style={{ fontSize: 10, color: "#94a3b8" }}>
          Текущая высота: {canvas.height}px
        </div>
      </Group>

      <Group label="Фон блока">
        <ColorInput
          value={canvas.background}
          onChange={(v) => updateCanvas({ background: v })}
          label="Цвет фона"
        />
      </Group>

      <Group label="Фоновое изображение">
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Загрузить файл</span>
          <input
            type="file"
            accept="image/*"
            style={{ fontSize: 11 }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => updateCanvas({ backgroundImage: ev.target?.result as string });
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <TextInput
          value={canvas.backgroundImage ?? ""}
          onChange={(v) => updateCanvas({ backgroundImage: v || undefined })}
          label="URL изображения"
          placeholder="https://..."
        />
        {canvas.backgroundImage && (
          <button
            onClick={() => updateCanvas({ backgroundImage: undefined })}
            style={{
              fontSize: 11,
              color: "#ef4444",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textAlign: "left",
            }}
          >
            Удалить изображение
          </button>
        )}
      </Group>
    </>
  );
}

// ─── Root settings panel ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  text: "Текст",
  image: "Изображение",
  shape: "Фигура",
  button: "Кнопка",
  vector: "Вектор",
  video: "Видео",
  html: "HTML",
  tooltip: "Тултип",
  form: "Форма",
  gallery: "Галерея",
};

function ElementTypePanel({ el }: { el: ZbElement }) {
  switch (el.type) {
    case "text":    return <TextPanel el={el} />;
    case "image":   return <ImagePanel el={el} />;
    case "shape":   return <ShapePanel el={el} />;
    case "button":  return <ButtonPanel el={el} />;
    case "vector":  return <VectorPanel el={el} />;
    case "video":   return <VideoPanel el={el} />;
    case "html":    return <HtmlPanel el={el} />;
    default:        return null;
  }
}

const PANEL_STYLE: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: 0,
  bottom: 0,
  width: 256,
  background: "#fff",
  borderLeft: "1px solid #e5e7eb",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  zIndex: 50,
  boxShadow: "-4px 0 16px rgba(0,0,0,0.08)",
};

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      title="Закрыть"
      style={{
        width: 24,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
        color: "#94a3b8",
        flexShrink: 0,
        padding: 0,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#374151"; (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

export function ZbSettingsPanel() {
  const { selectedIds, elements, clearSelection, setSettingsPanelOpen } = useZbEditorStore();
  const [activeTab, setActiveTab] = useState<"style" | "anim">("style");

  const handleClose = () => {
    clearSelection();
    setSettingsPanelOpen(false);
  };

  if (selectedIds.length === 0) {
    return (
      <div style={PANEL_STYLE}>
        <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", flex: 1 }}>Блок</span>
          <CloseBtn onClose={handleClose} />
        </div>
        <CanvasSettingsPanel />
      </div>
    );
  }

  const el = elements.find((e) => e.id === selectedIds[0]);
  if (!el) {
    return (
      <div style={PANEL_STYLE}>
        <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", flex: 1 }}>Блок</span>
          <CloseBtn onClose={handleClose} />
        </div>
        <CanvasSettingsPanel />
      </div>
    );
  }

  return (
    <div style={PANEL_STYLE}>
      {/* Header */}
      <div
        style={{
          padding: "10px 12px 8px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", flex: 1 }}>
          {TYPE_LABELS[el.type] ?? el.type}
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{el.name}</span>
        <CloseBtn onClose={handleClose} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
        {(["style", "anim"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              height: 34,
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === tab ? "#2563eb" : "#64748b",
              fontSize: 12,
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {tab === "style" ? "Стиль" : "Анимация"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab === "style" ? (
          <>
            <GeometryPanel el={el} />
            <ElementTypePanel el={el} />
            <ElementActionsPanel el={el} />
          </>
        ) : (
          <AnimationPanel el={el} />
        )}
      </div>
    </div>
  );
}
