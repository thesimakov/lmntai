export type BuilderEvent = { event: string; data?: Record<string, unknown> };

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
