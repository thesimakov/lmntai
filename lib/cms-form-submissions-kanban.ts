export const CMS_FORM_SUBMISSION_KANBAN_NEW = "new";
export const CMS_FORM_SUBMISSION_KANBAN_IN_PROGRESS = "in_progress";
export const CMS_FORM_SUBMISSION_KANBAN_DONE = "done";

export const CMS_FORM_SUBMISSION_KANBAN_BUILTIN = [
  CMS_FORM_SUBMISSION_KANBAN_NEW,
  CMS_FORM_SUBMISSION_KANBAN_IN_PROGRESS,
  CMS_FORM_SUBMISSION_KANBAN_DONE,
] as const;

export type CmsFormSubmissionKanbanBuiltin = (typeof CMS_FORM_SUBMISSION_KANBAN_BUILTIN)[number];

export function isBuiltinKanbanColumnKey(k: string): boolean {
  return (
    k === CMS_FORM_SUBMISSION_KANBAN_NEW ||
    k === CMS_FORM_SUBMISSION_KANBAN_IN_PROGRESS ||
    k === CMS_FORM_SUBMISSION_KANBAN_DONE
  );
}

export type CmsKanbanCustomColumnDef = { id: string; label: string };

export function parseKanbanCustomColumnsJson(raw: unknown): CmsKanbanCustomColumnDef[] {
  if (!Array.isArray(raw)) return [];
  const out: CmsKanbanCustomColumnDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id.trim() : "";
    const label = typeof rec.label === "string" ? rec.label.trim().slice(0, 120) : "";
    if (!/^col_[a-f0-9]{8,48}$/.test(id) || label.length < 1) continue;
    out.push({ id, label });
  }
  return out;
}

export function newKanbanCustomColumnId(): string {
  const hex = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return `col_${hex.slice(0, 24)}`;
}

export function collectAllowedKanbanKeys(custom: Pick<CmsKanbanCustomColumnDef, "id">[]): Set<string> {
  const s = new Set<string>([...CMS_FORM_SUBMISSION_KANBAN_BUILTIN]);
  for (const c of custom) s.add(c.id);
  return s;
}

export function normalizeSubmissionKanbanKey(raw: string | null | undefined, allowed: Set<string>): string {
  const k = (raw ?? "").trim();
  if (k && allowed.has(k)) return k;
  return CMS_FORM_SUBMISSION_KANBAN_NEW;
}
