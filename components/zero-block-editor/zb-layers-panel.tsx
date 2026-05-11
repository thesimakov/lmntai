"use client";

import { useState } from "react";
import { useZbEditorStore } from "@/lib/zero-block-editor/store";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  ),
  image: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
    </svg>
  ),
  shape: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  button: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="10" rx="3" />
    </svg>
  ),
  vector: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 19h20L12 2z" />
    </svg>
  ),
  video: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  html: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  ),
  tooltip: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  form: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  gallery: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
};

export function ZbLayersPanel() {
  const {
    elements,
    selectedIds,
    selectIds,
    toggleSelection,
    lockElements,
    toggleVisibility,
    removeElements,
    bringToFront,
    sendToBack,
    renameElement,
    setLayersPanelOpen,
  } = useZbEditorStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);

  // Render layers top-to-bottom (highest z-index first)
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div
      style={{
        width: 200,
        background: "#fafafa",
        borderRight: "1px solid #e5e7eb",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          padding: "8px 10px",
          borderBottom: "1px solid #e5e7eb",
          fontSize: 11,
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <span style={{ flex: 1 }}>Слои</span>
        <button
          onClick={() => setLayersPanelOpen(false)}
          title="Закрыть"
          style={{
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderRadius: 3,
            cursor: "pointer",
            color: "#94a3b8",
            padding: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#374151"; (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {sorted.length === 0 && (
          <div
            style={{
              padding: "16px 12px",
              fontSize: 12,
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            Нет элементов
          </div>
        )}

        {sorted.map((el) => {
          const isSelected = selectedIds.includes(el.id);
          const isRenaming = renamingId === el.id;

          return (
            <div
              key={el.id}
              onClick={(e) => {
                if (e.shiftKey) {
                  toggleSelection(el.id);
                } else {
                  selectIds([el.id]);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 8px",
                background: isSelected ? "#eff6ff" : "transparent",
                borderLeft: isSelected ? "2px solid #2563eb" : "2px solid transparent",
                cursor: "pointer",
                userSelect: "none",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              {/* Type icon */}
              <div style={{ color: "#94a3b8", flexShrink: 0, display: "flex" }}>
                {TYPE_ICONS[el.type] ?? null}
              </div>

              {/* Name */}
              {isRenaming ? (
                <input
                  autoFocus
                  defaultValue={el.name}
                  style={{
                    flex: 1,
                    fontSize: 12,
                    border: "1px solid #2563eb",
                    borderRadius: 3,
                    padding: "1px 4px",
                    outline: "none",
                  }}
                  onBlur={(e) => {
                    renameElement(el.id, e.target.value || el.name);
                    setRenamingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      if (e.key === "Enter") renameElement(el.id, (e.target as HTMLInputElement).value || el.name);
                      setRenamingId(null);
                    }
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(el.id);
                  }}
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: "#374151",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    opacity: el.visible ? 1 : 0.4,
                  }}
                >
                  {el.name}
                </span>
              )}

              {/* Action icons */}
              <div
                style={{ display: "flex", gap: 2, flexShrink: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Visibility */}
                <LayerBtn
                  title={el.visible ? "Скрыть" : "Показать"}
                  onClick={() => toggleVisibility([el.id])}
                  active={!el.visible}
                >
                  {el.visible ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                    </svg>
                  )}
                </LayerBtn>

                {/* Lock */}
                <LayerBtn
                  title={el.locked ? "Разблокировать" : "Заблокировать"}
                  onClick={() => lockElements([el.id], !el.locked)}
                  active={el.locked}
                >
                  {el.locked ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                  )}
                </LayerBtn>

                {/* Delete */}
                <LayerBtn title="Удалить" onClick={() => removeElements([el.id])}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6l-1 14H6L5 6M9 6V4h6v2" />
                  </svg>
                </LayerBtn>
              </div>
            </div>
          );
        })}
      </div>

      {/* Canvas settings */}
      <CanvasSettings />
    </div>
  );
}

function LayerBtn({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 18,
        height: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        color: active ? "#2563eb" : "#94a3b8",
        cursor: "pointer",
        borderRadius: 3,
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function CanvasSettings() {
  const { canvas, updateCanvas } = useZbEditorStore();

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", padding: "10px 10px 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        Холст
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#94a3b8", width: 48, flexShrink: 0 }}>Ширина</span>
          <input
            type="number"
            value={canvas.gridWidth}
            min={320}
            max={2560}
            onChange={(e) => updateCanvas({ gridWidth: Number(e.target.value) })}
            style={{ flex: 1, height: 24, padding: "0 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 11, background: "#f8fafc" }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#94a3b8", width: 48, flexShrink: 0 }}>Высота</span>
          <input
            type="number"
            value={canvas.height}
            min={100}
            max={5000}
            onChange={(e) => updateCanvas({ height: Number(e.target.value) })}
            style={{ flex: 1, height: 24, padding: "0 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 11, background: "#f8fafc" }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#94a3b8", width: 48, flexShrink: 0 }}>Фон</span>
          <input
            type="color"
            value={canvas.background.startsWith("#") ? canvas.background : "#ffffff"}
            onChange={(e) => updateCanvas({ background: e.target.value })}
            style={{ width: 24, height: 24, border: "1px solid #e2e8f0", borderRadius: 4, padding: 2, cursor: "pointer" }}
          />
          <input
            type="text"
            value={canvas.background}
            onChange={(e) => updateCanvas({ background: e.target.value })}
            style={{ flex: 1, height: 24, padding: "0 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 11, background: "#f8fafc" }}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: "#374151" }}>
          <input
            type="checkbox"
            checked={canvas.snapToGrid}
            onChange={(e) => updateCanvas({ snapToGrid: e.target.checked })}
          />
          Привязка к сетке
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: "#374151" }}>
          <input
            type="checkbox"
            checked={canvas.snapToElements}
            onChange={(e) => updateCanvas({ snapToElements: e.target.checked })}
          />
          Привязка к элементам
        </label>
      </div>
    </div>
  );
}
