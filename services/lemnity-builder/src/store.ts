import { randomUUID } from "node:crypto";

import type { ArtifactRecord, CreateArtifactInput, SessionRecord } from "./types.js";
import { ARTIFACT_MIME_HTML } from "./types.js";

export interface SessionStore {
  createSession(): Promise<string>;
  getSession(id: string): Promise<SessionRecord | null>;
  replaceSession(rec: SessionRecord): Promise<void>;
  deleteSession(id: string): Promise<void>;
  createArtifact(sessionId: string, input: CreateArtifactInput): Promise<ArtifactRecord>;
  getArtifact(id: string): Promise<ArtifactRecord | null>;
  /** Только HTML-артефакты (без file_data). */
  updateArtifactHtml(id: string, html: string): Promise<boolean>;
}

function emptyRecord(id: string): SessionRecord {
  return {
    session_id: id,
    title: null,
    status: "idle",
    events: [],
    is_shared: false,
    last_lovable_sources: null
  };
}

export class MemorySessionStore implements SessionStore {
  private readonly map = new Map<string, SessionRecord>();
  private readonly artifacts = new Map<string, ArtifactRecord>();

  async createSession(): Promise<string> {
    const id = randomUUID();
    this.map.set(id, emptyRecord(id));
    return id;
  }

  async getSession(id: string): Promise<SessionRecord | null> {
    const v = this.map.get(id);
    return v ? structuredClone(v) : null;
  }

  async replaceSession(rec: SessionRecord): Promise<void> {
    this.map.set(rec.session_id, structuredClone(rec));
  }

  async deleteSession(id: string): Promise<void> {
    this.map.delete(id);
  }

  async createArtifact(sessionId: string, input: CreateArtifactInput): Promise<ArtifactRecord> {
    const id = `artifact_${randomUUID()}`;
    let rec: ArtifactRecord;
    if (input.kind === "html") {
      rec = {
        artifact_id: id,
        session_id: sessionId,
        mime_type: ARTIFACT_MIME_HTML,
        filename: null,
        html: input.html,
        file_data: null,
        created_at: new Date().toISOString()
      };
    } else {
      rec = {
        artifact_id: id,
        session_id: sessionId,
        mime_type: input.mimeType,
        filename: input.filename,
        html: "",
        file_data: Buffer.from(input.data),
        created_at: new Date().toISOString()
      };
    }
    this.artifacts.set(id, structuredClone(rec));
    return rec;
  }

  async getArtifact(id: string): Promise<ArtifactRecord | null> {
    const v = this.artifacts.get(id);
    if (!v) return null;
    const clone = structuredClone(v) as ArtifactRecord;
    if (v.file_data) {
      clone.file_data = Buffer.from(v.file_data);
    }
    return clone;
  }

  async updateArtifactHtml(id: string, html: string): Promise<boolean> {
    const v = this.artifacts.get(id);
    if (!v) return false;
    if (v.file_data && v.file_data.length > 0) return false;
    v.html = html;
    this.artifacts.set(id, structuredClone(v));
    return true;
  }
}

type PgPool = import("pg").Pool;

export class PgSessionStore implements SessionStore {
  constructor(private readonly pool: PgPool) {}

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS lemnity_builder_session (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lemnity_builder_artifact (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        html TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        mime_type TEXT NOT NULL DEFAULT 'text/html; charset=utf-8',
        file_name TEXT,
        file_data BYTEA
      );

      CREATE INDEX IF NOT EXISTS lemnity_builder_artifact_session_id_created_at_idx
        ON lemnity_builder_artifact (session_id, created_at DESC);
    `);
    await this.pool.query(`
      ALTER TABLE lemnity_builder_artifact ADD COLUMN IF NOT EXISTS mime_type TEXT NOT NULL DEFAULT 'text/html; charset=utf-8';
      ALTER TABLE lemnity_builder_artifact ADD COLUMN IF NOT EXISTS file_name TEXT;
      ALTER TABLE lemnity_builder_artifact ADD COLUMN IF NOT EXISTS file_data BYTEA;
    `);
  }

  async createSession(): Promise<string> {
    const id = randomUUID();
    const rec = emptyRecord(id);
    await this.pool.query(
      `INSERT INTO lemnity_builder_session (id, payload, updated_at) VALUES ($1, $2::jsonb, NOW())`,
      [id, JSON.stringify(rec)]
    );
    return id;
  }

  async getSession(id: string): Promise<SessionRecord | null> {
    const { rows } = await this.pool.query<{ payload: SessionRecord }>(
      `SELECT payload FROM lemnity_builder_session WHERE id = $1`,
      [id]
    );
    const row = rows[0];
    if (!row?.payload) return null;
    const p = row.payload;
    let lastLovableSources: Record<string, string> | null = null;
    const rawLv = (p as { last_lovable_sources?: unknown }).last_lovable_sources;
    if (rawLv && typeof rawLv === "object" && rawLv !== null && !Array.isArray(rawLv)) {
      lastLovableSources = {};
      for (const [k, v] of Object.entries(rawLv as Record<string, unknown>)) {
        if (!k || typeof v !== "string") continue;
        lastLovableSources[k] = v;
      }
      if (Object.keys(lastLovableSources).length === 0) lastLovableSources = null;
    }
    return structuredClone({
      session_id: p.session_id ?? id,
      title: p.title ?? null,
      status: p.status ?? "idle",
      events: Array.isArray(p.events) ? p.events : [],
      is_shared: Boolean(p.is_shared),
      last_lovable_sources: lastLovableSources
    });
  }

  async replaceSession(rec: SessionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO lemnity_builder_session (id, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [rec.session_id, JSON.stringify(rec)]
    );
  }

  async deleteSession(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM lemnity_builder_session WHERE id = $1`, [id]);
  }

  async createArtifact(sessionId: string, input: CreateArtifactInput): Promise<ArtifactRecord> {
    const id = `artifact_${randomUUID()}`;
    if (input.kind === "html") {
      const { rows } = await this.pool.query<{
        id: string;
        session_id: string;
        html: string;
        created_at: Date;
        mime_type: string;
        file_name: string | null;
      }>(
        `INSERT INTO lemnity_builder_artifact (id, session_id, html, mime_type, file_name, file_data, created_at)
         VALUES ($1, $2, $3, $4, NULL, NULL, NOW())
         RETURNING id, session_id, html, created_at, mime_type, file_name`,
        [id, sessionId, input.html, ARTIFACT_MIME_HTML]
      );
      const row = rows[0];
      return {
        artifact_id: row.id,
        session_id: row.session_id,
        mime_type: row.mime_type,
        filename: row.file_name,
        html: row.html,
        file_data: null,
        created_at: row.created_at.toISOString()
      };
    }

    const { rows } = await this.pool.query<{
      id: string;
      session_id: string;
      html: string;
      created_at: Date;
      mime_type: string;
      file_name: string | null;
    }>(
      `INSERT INTO lemnity_builder_artifact (id, session_id, html, mime_type, file_name, file_data, created_at)
       VALUES ($1, $2, '', $3, $4, $5, NOW())
       RETURNING id, session_id, html, created_at, mime_type, file_name`,
      [id, sessionId, input.mimeType, input.filename, input.data]
    );
    const row = rows[0];
    return {
      artifact_id: row.id,
      session_id: row.session_id,
      mime_type: row.mime_type,
      filename: row.file_name,
      html: row.html,
      file_data: null,
      created_at: row.created_at.toISOString()
    };
  }

  async getArtifact(id: string): Promise<ArtifactRecord | null> {
    const { rows } = await this.pool.query<{
      id: string;
      session_id: string;
      html: string;
      created_at: Date;
      mime_type: string;
      file_name: string | null;
      file_data: Buffer | null;
    }>(
      `SELECT id, session_id, html, created_at, mime_type, file_name, file_data FROM lemnity_builder_artifact WHERE id = $1`,
      [id]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      artifact_id: row.id,
      session_id: row.session_id,
      mime_type: row.mime_type,
      filename: row.file_name,
      html: row.html,
      file_data: row.file_data ? Buffer.from(row.file_data) : null,
      created_at: row.created_at.toISOString()
    };
  }

  async updateArtifactHtml(id: string, html: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE lemnity_builder_artifact SET html = $2
       WHERE id = $1 AND file_data IS NULL`,
      [id, html]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
