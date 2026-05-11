"use client";

import { useState, useRef, useEffect } from "react";
import { useZbEditorStore } from "@/lib/zero-block-editor/store";
import { zbCreateElement } from "@/lib/zero-block-editor/defaults";
import { ZB_TEMPLATE_BLOCKS } from "@/lib/zero-block-editor/templates";
import type { ZbElementType } from "@/lib/zero-block-editor/types";

function gridPlacement(type: ZbElementType, gridWidth: number, elementCount: number) {
  const margin = 40;
  const colW = (gridWidth - margin * 2) / 12;
  const colSpans: Record<ZbElementType, number> = {
    text: 6, image: 6, shape: 4, button: 3, vector: 2,
    video: 8, html: 6, tooltip: 3, form: 5, gallery: 10,
  };
  const defaultHeights: Record<ZbElementType, number> = {
    text: 54, image: 240, shape: 120, button: 50, vector: 80,
    video: 315, html: 200, tooltip: 44, form: 320, gallery: 420,
  };
  const cols = colSpans[type] ?? 4;
  const w = Math.round(cols * colW);
  const h = defaultHeights[type] ?? 80;
  const y = 60 + (elementCount % 4) * 24;
  return { x: margin, y, w, h };
}

interface ElementCategory {
  label: string;
  items: Array<{ type: ZbElementType; label: string; icon: React.ReactNode }>;
}

const CATEGORIES: ElementCategory[] = [
  {
    label: "Текст",
    items: [
      {
        type: "text",
        label: "Текст",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V4h16v3M9 20h6M12 4v16" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Медиа",
    items: [
      {
        type: "image",
        label: "Картинка",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        ),
      },
      {
        type: "video",
        label: "Видео",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <polygon points="10 9 16 12 10 15 10 9" />
          </svg>
        ),
      },
      {
        type: "gallery",
        label: "Галерея",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        type: "vector",
        label: "Вектор",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2 2 19h20L12 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Фигуры",
    items: [
      {
        type: "shape",
        label: "Фигура",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Интерактив",
    items: [
      {
        type: "button",
        label: "Кнопка",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="10" rx="3" />
            <path d="M7 12h10" />
          </svg>
        ),
      },
      {
        type: "form",
        label: "Форма",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        ),
      },
      {
        type: "tooltip",
        label: "Тултип",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        type: "html",
        label: "HTML",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
          </svg>
        ),
      },
    ],
  },
];

const BLOCK_CATEGORIES = Array.from(new Set(ZB_TEMPLATE_BLOCKS.map((b) => b.category)));

type ActivePanel = "elements" | "blocks" | null;

export function ZbAddPanel() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const { addElement, elements, canvas } = useZbEditorStore();
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    if (!activePanel) return;
    const onMouseDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setActivePanel(null);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [activePanel]);

  const handleAddType = (type: ZbElementType) => {
    const { x, y, w, h } = gridPlacement(type, canvas.gridWidth, elements.length);
    const el = zbCreateElement(type, x, y);
    addElement({ ...el, w, h });
    setActivePanel(null);
  };

  const handleAddTemplate = (templateId: string) => {
    const tpl = ZB_TEMPLATE_BLOCKS.find((t) => t.id === templateId);
    if (!tpl) return;
    const newEls = tpl.elements();
    const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    newEls.forEach((el, i) => {
      addElement({ ...el, zIndex: maxZ + i + 1 });
    });
    setActivePanel(null);
  };

  const toggle = (panel: ActivePanel) =>
    setActivePanel((cur) => (cur === panel ? null : panel));

  return (
    <div ref={popupRef} style={{ position: "relative", display: "flex", flexShrink: 0 }}>
      {/* Narrow static sidebar strip */}
      <div
        style={{
          width: 52,
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 8,
          gap: 2,
          flexShrink: 0,
        }}
      >
        <SidebarBtn
          label="Элементы"
          active={activePanel === "elements"}
          onClick={() => toggle("elements")}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        />
        <SidebarBtn
          label="Блоки"
          active={activePanel === "blocks"}
          onClick={() => toggle("blocks")}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
        />
      </div>

      {/* Floating popup panel */}
      {activePanel && (
        <div
          style={{
            position: "absolute",
            left: 52,
            top: 0,
            width: 220,
            height: "100%",
            background: "#fff",
            borderRight: "1px solid #e5e7eb",
            boxShadow: "4px 0 16px rgba(0,0,0,0.10)",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* Popup header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderBottom: "1px solid #e5e7eb",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", fontFamily: "Inter, sans-serif" }}>
              {activePanel === "elements" ? "Элементы" : "Блоки"}
            </span>
            <button
              onClick={() => setActivePanel(null)}
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
                color: "#9ca3af",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Popup content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {activePanel === "elements" ? (
              <ElementsTab onAdd={handleAddType} />
            ) : (
              <BlocksTab onAdd={handleAddTemplate} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar icon button ───────────────────────────────────────────────────────

function SidebarBtn({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        width: 42,
        height: 42,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        background: active ? "#eff6ff" : "transparent",
        color: active ? "#2563eb" : "#6b7280",
        border: active ? "1px solid #bfdbfe" : "1px solid transparent",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 9,
        fontWeight: 600,
        fontFamily: "Inter, sans-serif",
        letterSpacing: "0.02em",
        transition: "background 0.1s, color 0.1s",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Elements tab ──────────────────────────────────────────────────────────────

function ElementsTab({ onAdd }: { onAdd: (type: ZbElementType) => void }) {
  return (
    <div>
      {CATEGORIES.map((cat) => (
        <div key={cat.label} style={{ marginBottom: 4 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "8px 12px 4px",
            }}
          >
            {cat.label}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "0 8px" }}>
            {cat.items.map((item) => (
              <ElementBtn key={item.type} label={item.label} icon={item.icon} onClick={() => onAdd(item.type)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ElementBtn({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "10px 4px",
        background: hover ? "#f8fafc" : "transparent",
        border: hover ? "1px solid #e2e8f0" : "1px solid transparent",
        borderRadius: 8,
        cursor: "pointer",
        color: hover ? "#374151" : "#6b7280",
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "Inter, sans-serif",
        transition: "background 0.1s, border 0.1s, color 0.1s",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Blocks tab ────────────────────────────────────────────────────────────────

function BlocksTab({ onAdd }: { onAdd: (id: string) => void }) {
  return (
    <div>
      {BLOCK_CATEGORIES.map((cat) => (
        <div key={cat} style={{ marginBottom: 4 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "8px 12px 4px",
            }}
          >
            {cat}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" }}>
            {ZB_TEMPLATE_BLOCKS.filter((b) => b.category === cat).map((tpl) => (
              <BlockBtn key={tpl.id} name={tpl.name} onClick={() => onAdd(tpl.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BlockBtn({ name, onClick }: { name: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 10px",
        background: hover ? "#f8fafc" : "transparent",
        border: hover ? "1px solid #e2e8f0" : "1px solid #f1f5f9",
        borderRadius: 8,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "background 0.1s, border 0.1s",
      }}
    >
      <div
        style={{
          width: 40,
          height: 28,
          borderRadius: 4,
          background: "#f1f5f9",
          border: "1px solid #e2e8f0",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <rect x="1" y="1" width="14" height="2" rx="1" fill="#cbd5e1" />
          <rect x="1" y="5" width="10" height="1.5" rx="0.75" fill="#e2e8f0" />
          <rect x="1" y="8" width="6" height="1.5" rx="0.75" fill="#e2e8f0" />
        </svg>
      </div>
      <span style={{ fontSize: 12, color: "#374151", fontWeight: 500, fontFamily: "Inter, sans-serif" }}>
        {name}
      </span>
      <div style={{ marginLeft: "auto", color: "#94a3b8", opacity: hover ? 1 : 0, transition: "opacity 0.1s" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
    </button>
  );
}
