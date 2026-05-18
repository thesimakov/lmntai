"use client";

import { useZbEditorStore } from "@/lib/zero-block-editor/store";
import { ZB_BREAKPOINTS } from "@/lib/zero-block-editor/types";
import { ZB_BREAKPOINT_PRESETS } from "@/lib/zero-block-editor/breakpoints";

interface Props {
  onSave?: () => void;
  onClose?: () => void;
  onSaveToLibrary?: () => void;
}

const BREAKPOINT_LABELS: Record<string, string> = {
  desktop: "Десктоп",
  "1200": "1200",
  "980": "980",
  "640": "640",
  "480": "480",
  "320": "320",
};

const BREAKPOINT_ICONS: Record<string, React.ReactNode> = {
  desktop: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  "1200": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  "980": (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M10 18h4" />
    </svg>
  ),
  "640": (
    <svg width="14" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M10 18h4" />
    </svg>
  ),
  "480": (
    <svg width="12" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M10 18h4" />
    </svg>
  ),
  "320": (
    <svg width="12" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M10 18h4" />
    </svg>
  ),
};

export function ZbTopBar({ onSave, onClose, onSaveToLibrary }: Props) {
  const {
    breakpoint,
    setBreakpoint,
    updateCanvas,
    canvas,
    layersPanelOpen,
    setLayersPanelOpen,
    settingsPanelOpen,
    setSettingsPanelOpen,
    clearSelection,
    undo,
    redo,
    history,
    future,
    selectedIds,
    removeElements,
    duplicateElements,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    alignElements,
  } = useZbEditorStore();

  return (
    <header
      style={{
        height: 48,
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 4,
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Undo / Redo */}
      <div style={{ display: "flex", gap: 2 }}>
        <TopButton title="Отменить (Ctrl+Z)" onClick={undo} disabled={history.length === 0}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 14L4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </TopButton>
        <TopButton title="Повторить (Ctrl+Y)" onClick={redo} disabled={future.length === 0}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 14l5-5-5-5" />
            <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
          </svg>
        </TopButton>
      </div>

      <Divider />

      {/* Breakpoints */}
      <div style={{ display: "flex", gap: 2 }}>
        {ZB_BREAKPOINTS.map((bp) => (
          <TopButton
            key={bp}
            title={bp === "desktop" ? BREAKPOINT_LABELS.desktop : `${BREAKPOINT_LABELS[bp] ?? bp}px`}
            onClick={() => {
              setBreakpoint(bp);
              const preset = ZB_BREAKPOINT_PRESETS[bp];
              if (preset.canvasWidth) {
                const availW = window.innerWidth - 520; // ~240 left panel + 256 right panel + 24 padding
                const zoom = Math.min(1, Math.max(0.25, availW / preset.canvasWidth));
                updateCanvas({
                  canvasWidth: preset.canvasWidth,
                  columns: preset.columns,
                  gridWidth: preset.gridWidth,
                  zoom,
                });
              } else {
                updateCanvas({
                  canvasWidth: null,
                  columns: 12,
                  gridWidth: 1200,
                  zoom: 1,
                });
              }
            }}
            active={breakpoint === bp}
          >
            {BREAKPOINT_ICONS[bp]}
          </TopButton>
        ))}
      </div>

      <Divider />

      {/* Zoom */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <TopButton title="Уменьшить" onClick={() => updateCanvas({ zoom: Math.max(0.25, canvas.zoom - 0.1) })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M8 11h6"/>
          </svg>
        </TopButton>
        <span style={{ fontSize: 12, color: "#64748b", minWidth: 36, textAlign: "center" }}>
          {Math.round(canvas.zoom * 100)}%
        </span>
        <TopButton title="Увеличить" onClick={() => updateCanvas({ zoom: Math.min(3, canvas.zoom + 0.1) })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
          </svg>
        </TopButton>
      </div>

      <Divider />

      {/* Layers */}
      <TopButton
        title="Слои"
        onClick={() => setLayersPanelOpen(!layersPanelOpen)}
        active={layersPanelOpen}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 2 10 6.5-10 6.5L2 8.5z"/>
          <path d="m2 15 10 6.5 10-6.5"/>
        </svg>
      </TopButton>

      <div style={{ flex: 1 }} />

      {/* Element actions (when selected) */}
      {selectedIds.length > 0 && (
        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#94a3b8", marginRight: 2, whiteSpace: "nowrap" }}>
            {selectedIds.length === 1 ? "1 эл." : `${selectedIds.length} эл.`}
          </span>

          {/* Alignment — only when 2+ selected */}
          {selectedIds.length >= 2 && (
            <>
              <TopButton title="По левому краю" onClick={() => alignElements(selectedIds, "left")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v16"/><rect x="8" y="6" width="12" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>
                </svg>
              </TopButton>
              <TopButton title="По центру (гориз.)" onClick={() => alignElements(selectedIds, "centerH")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4v16"/><rect x="4" y="7" width="16" height="4" rx="1"/><rect x="6" y="13" width="12" height="4" rx="1"/>
                </svg>
              </TopButton>
              <TopButton title="По правому краю" onClick={() => alignElements(selectedIds, "right")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 4v16"/><rect x="4" y="6" width="12" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>
                </svg>
              </TopButton>
              <TopButton title="По верхнему краю" onClick={() => alignElements(selectedIds, "top")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16"/><rect x="6" y="8" width="4" height="12" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>
                </svg>
              </TopButton>
              <TopButton title="По центру (верт.)" onClick={() => alignElements(selectedIds, "centerV")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12h16"/><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="6" width="4" height="12" rx="1"/>
                </svg>
              </TopButton>
              <TopButton title="По нижнему краю" onClick={() => alignElements(selectedIds, "bottom")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 20h16"/><rect x="6" y="4" width="4" height="12" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>
                </svg>
              </TopButton>
              <Divider />
            </>
          )}

          <TopButton title="Дублировать (Ctrl+D)" onClick={() => duplicateElements(selectedIds)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="8" y="8" width="13" height="13" rx="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
          </TopButton>
          <TopButton title="Поднять вперёд" onClick={() => bringForward(selectedIds)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 11 4-4 4 4"/><path d="M7 7v6"/><rect x="13" y="13" width="8" height="8" rx="1"/>
            </svg>
          </TopButton>
          <TopButton title="Опустить назад" onClick={() => sendBackward(selectedIds)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 13 4 4 4-4"/><path d="M7 17v-6"/><rect x="13" y="3" width="8" height="8" rx="1"/>
            </svg>
          </TopButton>
          <TopButton title="На передний план" onClick={() => bringToFront(selectedIds)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 8 4-4 4 4"/><path d="M7 4v9"/><rect x="13" y="12" width="8" height="8" rx="1"/>
            </svg>
          </TopButton>
          <TopButton title="На задний план" onClick={() => sendToBack(selectedIds)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 16 4 4 4-4"/><path d="M7 20v-9"/><rect x="13" y="4" width="8" height="8" rx="1"/>
            </svg>
          </TopButton>
          <TopButton title="Удалить (Delete)" onClick={() => removeElements(selectedIds)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6l-1 14H6L5 6M9 6V4h6v2"/>
            </svg>
          </TopButton>
          <Divider />
        </div>
      )}

      {/* Container settings */}
      <button
        onClick={() => {
          clearSelection();
          setSettingsPanelOpen(!settingsPanelOpen);
        }}
        title="Настройки контейнера"
        style={{
          height: 32,
          padding: "0 12px",
          background: settingsPanelOpen && selectedIds.length === 0 ? "#f0f4ff" : "transparent",
          color: settingsPanelOpen && selectedIds.length === 0 ? "#2563eb" : "#374151",
          border: settingsPanelOpen && selectedIds.length === 0 ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
        Контейнер
      </button>

      {/* Save / Close */}
      <div style={{ display: "flex", gap: 6 }}>
        {onSaveToLibrary && (
          <button
            onClick={onSaveToLibrary}
            style={{
              height: 32,
              padding: "0 14px",
              background: "transparent",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            В библиотеку
          </button>
        )}
        {onSave && (
          <button
            onClick={onSave}
            style={{
              height: 32,
              padding: "0 16px",
              background: "#f26b4f",
              color: "#fff",
              border: "none",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Сохранить
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              height: 32,
              padding: "0 14px",
              background: "transparent",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Закрыть
          </button>
        )}
      </div>
    </header>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 24, background: "#e5e7eb", margin: "0 4px" }} />;
}

function TopButton({
  children,
  title,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "#eff6ff" : "transparent",
        color: active ? "#2563eb" : disabled ? "#d1d5db" : "#374151",
        border: active ? "1px solid #bfdbfe" : "1px solid transparent",
        borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
        transition: "background 0.1s",
      }}
    >
      {children}
    </button>
  );
}
