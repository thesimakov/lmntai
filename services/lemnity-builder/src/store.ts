import { randomUUID } from "node:crypto";

import type { SessionRecord } from "./types.js";

export interface SessionStore {
  createSession(): Promise<string>;
  getSession(id: string): Promise<SessionRecord | null>;
  replaceSession(rec: SessionRecord): Promise<void>;
  deleteSession(id: string): Promise<void>;
}

function emptyRecord(id: string): SessionRecord {
  return {
    session_id: id,
    title: null,
    status: "idle",
    events: [],
    is_shared: false
  };
}

export class MemorySessionStore implements SessionStore {
  private readonly map = new Map<string, SessionRecord>();

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
    return structuredClone({
      session_id: p.session_id ?? id,
      title: p.title ?? null,
      status: p.status ?? "idle",
      events: Array.isArray(p.events) ? p.events : [],
      is_shared: Boolean(p.is_shared)
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
}
