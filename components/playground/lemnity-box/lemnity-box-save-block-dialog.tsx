"use client";

import { useState } from "react";

interface Props {
  htmlContent: string;
  cssContent: string;
  blockType: "grapesjs" | "zero";
  projectId?: string | null;
  onSaved?: () => void;
  onClose: () => void;
}

export function LemnityBoxSaveBlockDialog({
  htmlContent,
  cssContent,
  blockType,
  projectId,
  onSaved,
  onClose,
}: Props) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"personal" | "team">("personal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: trimmed,
        blockType,
        htmlContent,
        cssContent,
      };
      if (scope === "team" && projectId) body.teamProjectId = projectId;

      const res = await fetch("/api/user-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Ошибка ${res.status}`);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "20px 20px 16px",
          width: 340,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111827" }}>
          Сохранить блок в библиотеку
        </h3>

        <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
          Название
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onClose();
          }}
          maxLength={100}
          placeholder="Название блока"
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            padding: "7px 10px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            marginBottom: 12,
            outline: "none",
          }}
        />

        <label style={{ display: "block", fontSize: 11, color: "#6b7280", marginBottom: 6 }}>
          Видимость
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setScope("personal")}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 12,
              fontWeight: scope === "personal" ? 600 : 400,
              background: scope === "personal" ? "#eff6ff" : "#f3f4f6",
              color: scope === "personal" ? "#1d4ed8" : "#6b7280",
              border: scope === "personal" ? "1.5px solid #3b82f6" : "1px solid #e5e7eb",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            👤 Личный
          </button>
          {projectId ? (
            <button
              type="button"
              onClick={() => setScope("team")}
              style={{
                flex: 1,
                padding: "6px 0",
                fontSize: 12,
                fontWeight: scope === "team" ? 600 : 400,
                background: scope === "team" ? "#eff6ff" : "#f3f4f6",
                color: scope === "team" ? "#1d4ed8" : "#6b7280",
                border: scope === "team" ? "1.5px solid #3b82f6" : "1px solid #e5e7eb",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              👥 Команда
            </button>
          ) : null}
        </div>

        {error ? <p style={{ fontSize: 11, color: "#ef4444", marginBottom: 10 }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 12,
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 12,
              fontWeight: 600,
              background: !name.trim() || saving ? "#a5b4fc" : "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: !name.trim() || saving ? "default" : "pointer",
            }}
          >
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
