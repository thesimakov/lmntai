export type BuilderEvent = { event: string; data?: Record<string, unknown> };

export const ARTIFACT_MIME_HTML = "text/html; charset=utf-8";
export const ARTIFACT_MIME_PPTX =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type ArtifactRecord = {
  artifact_id: string;
  session_id: string;
  mime_type: string;
  /** Имя файла для Content-Disposition (например презентация.pptx) */
  filename: string | null;
  /** HTML-тело превью; для бинарных артефактов может быть пустым */
  html: string;
  file_data: Buffer | null;
  created_at: string;
};

export type SessionRecord = {
  session_id: string;
  title: string | null;
  status: string;
  events: BuilderEvent[];
  is_shared?: boolean;
};

export type SessionEnvelopeData = {
  session_id: string;
  title?: string | null;
  status?: string | null;
  events?: BuilderEvent[];
  is_shared?: boolean;
};

export function toEnvelopeData(rec: SessionRecord): SessionEnvelopeData {
  return {
    session_id: rec.session_id,
    title: rec.title,
    status: rec.status,
    events: rec.events,
    is_shared: rec.is_shared ?? false
  };
}

export type CreateArtifactInput =
  | { kind: "html"; html: string }
  | { kind: "binary"; data: Buffer; mimeType: string; filename: string };
