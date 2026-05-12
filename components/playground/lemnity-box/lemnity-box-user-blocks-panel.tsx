"use client";

import { useState, useEffect, useCallback } from "react";
import { LemnityBoxSaveBlockDialog } from "@/components/playground/lemnity-box/lemnity-box-save-block-dialog";

type BlockMeta = {
  id: string;
  name: string;
  blockType: "grapesjs" | "zero";
  scope: "personal" | "team";
  createdAt: string;
};

interface Props {
  projectId?: string | null;
  onInsertBlock: (htmlContent: string, cssContent: string, blockType: "grapesjs" | "zero") => void;
  visible: boolean;
  onClose: () => void;
  /** If set, immediately opens the save dialog with these values (called from toolbar). */
  pendingSave?: { htmlContent: string; cssContent: string; blockType: "grapesjs" | "zero" } | null;
  onPendingSaveDone?: () => void;
}

export function LemnityBoxUserBlocksPanel({
  projectId,
  onInsertBlock,
  visible,
  onClose,
  pendingSave,
  onPendingSaveDone,
}: Props) {
  const [tab, setTab] = useState<"personal" | "team">("personal");
  const [search, setSearch] = useState("");
  const [blocks, setBlocks] = useState<BlockMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
      const res = await fetch(`/api/user-blocks${qs}`);
      if (!res.ok) return;
      const data = (await res.json()) as { blocks: BlockMeta[] };
      setBlocks(data.blocks);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (visible) fetchBlocks();
  }, [visible, fetchBlocks]);

  useEffect(() => {
    if (pendingSave) setSaveDialogOpen(true);
  }, [pendingSave]);

  async function handleInsert(id: string, blockType: "grapesjs" | "zero") {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const res = await fetch(`/api/user-blocks/${id}${qs}`);
    if (!res.ok) {
      alert("Не удалось загрузить блок. Попробуйте ещё раз.");
      return;
    }
    const data = await res.json() as { block: { htmlContent: string; cssContent: string } };
    onInsertBlock(data.block.htmlContent, data.block.cssContent, blockType);
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Удалить блок «${name}»?`)) return;
    await fetch(`/api/user-blocks/${id}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleRename(id: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenaming(null);
      return;
    }
    const res = await fetch(`/api/user-blocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, name: trimmed } : b)));
    }
    setRenaming(null);
  }

  const filtered = blocks
    .filter((b) => b.scope === tab)
    .filter((b) => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div
        className={`absolute bottom-0 left-0 top-0 z-30 flex min-h-0 flex-col overflow-hidden border-r border-[#eeeeee] bg-white text-[#0f172a] shadow-[4px_0_24px_rgba(15,23,42,0.12)] transition-transform duration-200 ease-out ${
          visible ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        style={{ width: 240 }}
        aria-hidden={!visible}
      >
        {/* Header */}
        <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid #eeeeee" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Мои блоки</span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
                fontSize: 16,
                lineHeight: 1,
                padding: "0 2px",
              }}
            >
              ‹
            </button>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              onClick={() => setTab("personal")}
              style={{
                background: tab === "personal" ? "#4f46e5" : "#f3f4f6",
                color: tab === "personal" ? "#fff" : "#6b7280",
                border: "none",
                borderRadius: 4,
                padding: "3px 10px",
                fontSize: 10,
                fontWeight: tab === "personal" ? 600 : 400,
                cursor: "pointer",
              }}
            >
              Личные ({blocks.filter((b) => b.scope === "personal").length})
            </button>
            {projectId ? (
              <button
                type="button"
                onClick={() => setTab("team")}
                style={{
                  background: tab === "team" ? "#4f46e5" : "#f3f4f6",
                  color: tab === "team" ? "#fff" : "#6b7280",
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 10px",
                  fontSize: 10,
                  fontWeight: tab === "team" ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                Команда ({blocks.filter((b) => b.scope === "team").length})
              </button>
            ) : null}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "6px 10px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти блок..."
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: "5px 8px",
              fontSize: 11,
              border: "1px solid #e5e7eb",
              borderRadius: 5,
              outline: "none",
              background: "#f9fafb",
            }}
          />
        </div>

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 8px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {loading ? (
            <div style={{ padding: "16px 0", textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
              Загрузка…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "16px 8px", textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
              {search ? "Ничего не найдено" : "Нет сохранённых блоков"}
            </div>
          ) : (
            filtered.map((block) => (
              <div
                key={block.id}
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  overflow: "hidden",
                  display: "flex",
                  cursor: "pointer",
                }}
                onClick={() => handleInsert(block.id, block.blockType)}
                title="Кликни чтобы вставить на холст"
              >
                {/* HTML mini-preview placeholder (56x40, grey) */}
                <div
                  style={{
                    width: 56,
                    height: 40,
                    flexShrink: 0,
                    overflow: "hidden",
                    position: "relative",
                    background: "#e2e8f0",
                    borderRight: "1px solid #e5e7eb",
                  }}
                />

                <div style={{ padding: "5px 7px", flex: 1, minWidth: 0 }}>
                  {renaming === block.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") handleRename(block.id);
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      onBlur={() => handleRename(block.id)}
                      style={{
                        fontSize: 10,
                        width: "100%",
                        border: "1px solid #3b82f6",
                        borderRadius: 3,
                        padding: "1px 4px",
                        outline: "none",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#0f172a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {block.name}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 9,
                      color: block.blockType === "zero" ? "#4ade80" : "#94a3b8",
                      marginTop: 1,
                    }}
                  >
                    {block.blockType === "zero" ? "Zero Block" : "GrapesJS"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: 4,
                    gap: 2,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    title="Переименовать"
                    onClick={() => {
                      setRenaming(block.id);
                      setRenameValue(block.name);
                    }}
                    style={{
                      width: 18,
                      height: 18,
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: 3,
                      cursor: "pointer",
                      fontSize: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    title="Удалить"
                    onClick={() => handleDelete(block.id, block.name)}
                    style={{
                      width: 18,
                      height: 18,
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: 3,
                      cursor: "pointer",
                      fontSize: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}

          <div
            style={{
              background: "#f9fafb",
              border: "1px dashed #e5e7eb",
              borderRadius: 6,
              padding: 8,
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 9, color: "#9ca3af" }}>Кликни на блок чтобы вставить на холст</span>
          </div>
        </div>
      </div>

      {saveDialogOpen && pendingSave ? (
        <LemnityBoxSaveBlockDialog
          htmlContent={pendingSave.htmlContent}
          cssContent={pendingSave.cssContent}
          blockType={pendingSave.blockType}
          projectId={projectId}
          onSaved={() => {
            fetchBlocks();
            onPendingSaveDone?.();
          }}
          onClose={() => {
            setSaveDialogOpen(false);
            onPendingSaveDone?.();
          }}
        />
      ) : null}
    </>
  );
}
