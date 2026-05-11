"use client";

import { useState, useRef, useCallback } from "react";
import { useZbEditorStore } from "@/lib/zero-block-editor/store";
import { getEffectiveGeometry, getEffectiveTypography } from "@/lib/zero-block-editor/responsive";
import type { ZbElement, ZbResizeHandle, ZbTextProps, ZbImageProps, ZbShapeProps, ZbButtonProps, ZbVectorProps, ZbVideoProps, ZbHtmlProps, ZbTooltipProps, ZbFormProps, ZbGalleryProps } from "@/lib/zero-block-editor/types";

interface Props {
  element: ZbElement;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeHandleMouseDown: (e: React.MouseEvent, handle: ZbResizeHandle) => void;
}

const HANDLES: Array<{ h: ZbResizeHandle; style: React.CSSProperties }> = [
  { h: "nw", style: { top: -4, left: -4, cursor: "nw-resize" } },
  { h: "n",  style: { top: -4, left: "50%", transform: "translateX(-50%)", cursor: "n-resize" } },
  { h: "ne", style: { top: -4, right: -4, cursor: "ne-resize" } },
  { h: "e",  style: { top: "50%", right: -4, transform: "translateY(-50%)", cursor: "e-resize" } },
  { h: "se", style: { bottom: -4, right: -4, cursor: "se-resize" } },
  { h: "s",  style: { bottom: -4, left: "50%", transform: "translateX(-50%)", cursor: "s-resize" } },
  { h: "sw", style: { bottom: -4, left: -4, cursor: "sw-resize" } },
  { h: "w",  style: { top: "50%", left: -4, transform: "translateY(-50%)", cursor: "w-resize" } },
];

function ElementContent({ el }: { el: ZbElement }) {
  const { updateElementProps, breakpoint } = useZbEditorStore();
  const [editing, setEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const stopEdit = useCallback(() => {
    setEditing(false);
    if (contentRef.current) {
      updateElementProps(el.id, { content: contentRef.current.innerHTML });
    }
  }, [el.id, updateElementProps]);

  switch (el.type) {
    case "text": {
      const p = el.props as unknown as ZbTextProps;
      const typo = getEffectiveTypography(el, breakpoint);
      return (
        <div
          ref={contentRef}
          contentEditable={editing}
          suppressContentEditableWarning
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); contentRef.current?.focus(); }}
          onBlur={stopEdit}
          style={{
            width: "100%",
            height: "100%",
            fontFamily: typo.fontFamily ?? p.fontFamily,
            fontSize: `${typo.fontSize ?? p.fontSize}px`,
            fontWeight: typo.fontWeight ?? p.fontWeight,
            lineHeight: typo.lineHeight ?? p.lineHeight,
            letterSpacing: `${typo.letterSpacing ?? p.letterSpacing}px`,
            color: typo.color ?? p.color,
            textAlign: p.textAlign,
            outline: "none",
            cursor: editing ? "text" : "default",
            userSelect: editing ? "text" : "none",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
          dangerouslySetInnerHTML={editing ? undefined : { __html: p.content }}
        />
      );
    }

    case "image": {
      const p = el.props as unknown as ZbImageProps;
      if (!p.src) {
        return (
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              background: "#f3f4f6",
              cursor: "pointer",
              gap: 6,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Загрузить фото</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  useZbEditorStore.getState().updateElementProps(el.id, { src: ev.target?.result as string });
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        );
      }
      return (
        <img
          src={p.src}
          alt={p.alt}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: p.objectFit,
            borderRadius: `${p.borderRadius}px`,
            boxShadow: p.boxShadow,
            display: "block",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      );
    }

    case "shape": {
      const p = el.props as unknown as ZbShapeProps;
      const isLine = p.shapeType === "line";
      if (isLine) {
        return (
          <svg width="100%" height="100%" style={{ overflow: "visible" }}>
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke={p.fill} strokeWidth="2" />
          </svg>
        );
      }
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: p.gradient ?? p.fill,
            borderRadius: p.shapeType === "circle" ? "50%" : `${p.borderRadius}px`,
            border: p.border,
          }}
        />
      );
    }

    case "button": {
      const p = el.props as unknown as ZbButtonProps;
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: p.backgroundColor,
            color: p.textColor,
            borderRadius: `${p.borderRadius}px`,
            fontSize: `${p.fontSize}px`,
            fontWeight: p.fontWeight,
            border: p.border ?? "none",
            cursor: "default",
            userSelect: "none",
          }}
        >
          {p.text}
        </div>
      );
    }

    case "vector": {
      const p = el.props as unknown as ZbVectorProps;
      return (
        <div
          style={{ width: "100%", height: "100%", color: p.fill }}
          dangerouslySetInnerHTML={{ __html: p.svgContent }}
        />
      );
    }

    case "video": {
      const p = el.props as unknown as ZbVideoProps;
      if (!p.url) {
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span style={{ color: "#666", fontSize: 12 }}>Видео URL не задан</span>
          </div>
        );
      }
      if (p.videoType === "youtube") {
        const id = p.url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] ?? "";
        return (
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            style={{ width: "100%", height: "100%", border: "none" }}
            allowFullScreen
          />
        );
      }
      return (
        <video
          src={p.url}
          controls={p.controls}
          autoPlay={p.autoplay}
          muted={p.muted}
          loop={p.loop}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      );
    }

    case "html": {
      const p = el.props as unknown as ZbHtmlProps;
      return (
        <iframe
          srcDoc={`<style>${p.css}</style>${p.html}`}
          style={{ width: "100%", height: "100%", border: "none" }}
          sandbox="allow-scripts"
        />
      );
    }

    case "tooltip": {
      const p = el.props as unknown as ZbTooltipProps;
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "#f1f5f9",
            borderRadius: 6,
            fontSize: 14,
            cursor: "default",
            userSelect: "none",
          }}
        >
          {p.triggerText}
        </div>
      );
    }

    case "form": {
      const p = el.props as unknown as ZbFormProps;
      const fields = p.fields as Array<{ id: string; fieldType: string; label: string; required: boolean; placeholder?: string }>;
      return (
        <div style={{ width: "100%", padding: "12px", boxSizing: "border-box", pointerEvents: "none" }}>
          {fields.slice(0, 3).map((f) => (
            <div key={f.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{f.label}{f.required ? " *" : ""}</div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4, height: 34 }} />
            </div>
          ))}
          <div style={{ background: "#f26b4f", color: "#fff", borderRadius: 6, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>
            {p.submitText}
          </div>
        </div>
      );
    }

    case "gallery": {
      const p = el.props as unknown as ZbGalleryProps;
      const imgs = p.images as string[];
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 4,
            overflow: "hidden",
          }}
        >
          {imgs.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ background: "#e2e8f0", borderRadius: 4, aspectRatio: "4/3" }} />
              ))
            : imgs.slice(0, 3).map((src, i) => (
                <img key={i} src={src} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />
              ))}
        </div>
      );
    }

    default:
      return null;
  }
}

export function ZbElementLayer({ element: el, selected, onMouseDown, onResizeHandleMouseDown }: Props) {
  const { breakpoint } = useZbEditorStore();
  const eff = getEffectiveGeometry(el, breakpoint);

  if (!eff.visible) return null;

  const wrapStyle: React.CSSProperties = {
    position: "absolute",
    left: eff.x,
    top: eff.y,
    width: eff.w,
    height: eff.h,
    transform: el.rot !== 0 ? `rotate(${el.rot}deg)` : undefined,
    opacity: el.opacity,
    zIndex: el.zIndex,
    cursor: el.locked ? "default" : "move",
    userSelect: "none",
    outline: selected ? "2px solid #2563eb" : undefined,
    outlineOffset: selected ? 0 : undefined,
    boxSizing: "border-box",
  };

  return (
    <div style={wrapStyle} onMouseDown={onMouseDown}>
      <ElementContent el={el} />

      {/* Resize handles */}
      {selected && !el.locked && (
        <>
          {HANDLES.map(({ h, style }) => (
            <div
              key={h}
              onMouseDown={(e) => onResizeHandleMouseDown(e, h)}
              style={{
                position: "absolute",
                width: 8,
                height: 8,
                background: "#2563eb",
                border: "1.5px solid #fff",
                borderRadius: 2,
                zIndex: 1000,
                ...style,
              }}
            />
          ))}
        </>
      )}

      {/* Locked indicator */}
      {selected && el.locked && (
        <div
          style={{
            position: "absolute",
            top: -20,
            left: 0,
            fontSize: 10,
            color: "#94a3b8",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          🔒 Заблокировано
        </div>
      )}
    </div>
  );
}
