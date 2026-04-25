import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { MemorySessionStore, PgSessionStore, type SessionStore } from "./store.js";
import type { SessionRecord } from "./types.js";
import { toEnvelopeData } from "./types.js";
import { buildPdfFromOutline } from "./presentation-pdf.js";
import { buildPptxFromOutline, getPresentationOutline } from "./presentation-pptx.js";
import {
  createPlan,
  executePlanToHtml,
  generateSummary,
  makeEvent
} from "./workflow.js";
import { ARTIFACT_MIME_HTML } from "./types.js";

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function envelope<T>(data: T) {
  return { code: 0, msg: "success", data };
}

function readBearer(req: IncomingMessage): string | null {
  const raw = req.headers.authorization;
  if (!raw || !raw.startsWith("Bearer ")) return null;
  return raw.slice("Bearer ".length).trim();
}

function authOk(req: IncomingMessage): boolean {
  const need =
    process.env.LEMNITY_BUILDER_BEARER_TOKEN?.trim() ||
    process.env.LEMNITY_AI_UPSTREAM_BEARER_TOKEN?.trim();
  if (!need) return true;
  return readBearer(req) === need;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const ch of req) {
    chunks.push(ch as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function parsePath(pathname: string): string[] {
  return pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}

async function buildStore(): Promise<SessionStore> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.warn("[lemnity-builder] DATABASE_URL не задан — сессии только в памяти (перезапуск = потеря).");
    return new MemorySessionStore();
  }
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url });
  const store = new PgSessionStore(pool);
  await store.ensureSchema();
  return store;
}

function sseHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    Connection: "keep-alive"
  };
}

function sseWrite(res: ServerResponse, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function eventData(event: ReturnType<typeof makeEvent>): Record<string, unknown> {
  return event.data ?? {};
}

export async function main() {
  const store = await buildStore();
  const port = Number(process.env.LEMNITY_BUILDER_PORT ?? process.env.PORT ?? "8787");

  const server = createServer(async (req, res) => {
    if (!authOk(req)) {
      json(res, 401, { code: 401, msg: "Unauthorized", data: null });
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const parts = parsePath(url.pathname);
    const method = req.method ?? "GET";

    if (method === "GET" && parts.length === 1 && parts[0] === "health") {
      json(res, 200, { ok: true, service: "lemnity-builder" });
      return;
    }

    if (method === "GET" && parts.length === 1 && parts[0] === "sessions") {
      json(res, 200, envelope({ sessions: [] as unknown[] }));
      return;
    }

    if (method === "GET" && parts.length === 2 && parts[0] === "artifacts") {
      const artifact = await store.getArtifact(parts[1]);
      if (!artifact) {
        json(res, 404, { code: 404, msg: "not_found", data: null });
        return;
      }
      if (artifact.file_data && artifact.file_data.length > 0) {
        const safeName = (artifact.filename || "file").replace(/[/\\?%*:|"<>]/g, "_");
        res.writeHead(200, {
          "Content-Type": artifact.mime_type,
          "Content-Disposition": `attachment; filename="${safeName}"`,
          "Cache-Control": "no-store"
        });
        res.end(artifact.file_data);
        return;
      }
      res.writeHead(200, {
        "Content-Type": ARTIFACT_MIME_HTML,
        "Cache-Control": "no-store"
      });
      res.end(artifact.html);
      return;
    }

    if (method === "PUT" && parts.length === 1 && parts[0] === "sessions") {
      const id = await store.createSession();
      json(res, 200, envelope({ session_id: id }));
      return;
    }

    if (method === "GET" && parts.length === 3 && parts[0] === "sessions" && parts[1] === "shared") {
      const id = parts[2];
      const rec = await store.getSession(id);
      if (!rec) {
        json(res, 404, { code: 404, msg: "not_found", data: null });
        return;
      }
      json(res, 200, envelope(toEnvelopeData({ ...rec, is_shared: true })));
      return;
    }

    if (method === "GET" && parts.length === 2 && parts[0] === "sessions") {
      const id = parts[1];
      const rec = await store.getSession(id);
      if (!rec) {
        json(res, 404, { code: 404, msg: "not_found", data: null });
        return;
      }
      json(res, 200, envelope(toEnvelopeData(rec)));
      return;
    }

    if (method === "DELETE" && parts.length === 2 && parts[0] === "sessions") {
      const id = parts[1];
      await store.deleteSession(id);
      res.writeHead(204);
      res.end();
      return;
    }

    if (method === "POST" && parts.length === 3 && parts[0] === "sessions" && parts[2] === "chat") {
      const id = parts[1];
      const rec = await store.getSession(id);
      if (!rec) {
        json(res, 404, { code: 404, msg: "not_found", data: null });
        return;
      }

      const body = (await readJsonBody(req)) as {
        message?: string;
        model?: string;
      } | null;
      const userMessage = typeof body?.message === "string" ? body.message.trim() : "";
      const model = typeof body?.model === "string" && body.model.trim() ? body.model.trim() : "gpt-4o-mini";
      if (!userMessage) {
        json(res, 400, { code: 400, msg: "message_required", data: null });
        return;
      }

      const lmntUser = req.headers["x-lmnt-user-id"];
      const routerUser = typeof lmntUser === "string" ? lmntUser : undefined;

      rec.events.push({ event: "message", data: { role: "user", content: userMessage } });
      if (!rec.title) {
        rec.title = userMessage.length > 120 ? `${userMessage.slice(0, 117)}…` : userMessage;
      }
      rec.status = "running";
      await store.replaceSession(rec);

      res.writeHead(200, sseHeaders());

      const emit = (eventName: string, data: Record<string, unknown>, persist = true) => {
        const event = makeEvent(eventName, data);
        sseWrite(res, event.event, eventData(event));
        if (persist) {
          rec.events.push(event);
        }
        return event;
      };

      try {
        emit("step", { id: "planner", description: "Планирование сборки", status: "running" });
        const plan = await createPlan({
          message: userMessage,
          model,
          user: routerUser
        });
        rec.title = plan.title || rec.title;
        emit("title", { title: rec.title });
        emit("plan", {
          steps: plan.steps.map((step) => ({
            id: step.id,
            description: step.description,
            status: "pending"
          }))
        });
        emit("step", { id: "planner", description: "Планирование сборки", status: "completed" });
        await store.replaceSession(rec);

        const previewPath = `/api/lemnity-ai/artifacts/`;

        if (plan.artifact_kind === "presentation") {
          emit("step", { id: "outline", description: "Структура слайдов", status: "running" });
          const outline = await getPresentationOutline({
            message: userMessage,
            plan,
            model,
            user: routerUser
          });
          emit("step", { id: "outline", description: "Структура слайдов", status: "completed" });

          emit("step", { id: "pptx", description: "Сборка PowerPoint (.pptx)", status: "running" });
          const { buffer, filename, mimeType } = await buildPptxFromOutline(outline);
          const artifact = await store.createArtifact(id, {
            kind: "binary",
            data: buffer,
            mimeType,
            filename
          });
          emit("step", { id: "pptx", description: "Сборка PowerPoint (.pptx)", status: "completed" });
          emit("tool", {
            tool_call_id: `export-${artifact.artifact_id}`,
            name: "file",
            status: "called",
            function: "artifact_export",
            args: { format: "pptx", file: filename },
            content: { path: `${previewPath}${artifact.artifact_id}` }
          });

          emit("step", { id: "pdf", description: "Экспорт PDF", status: "running" });
          const pdfFile = await buildPdfFromOutline(outline);
          const artifactPdf = await store.createArtifact(id, {
            kind: "binary",
            data: pdfFile.buffer,
            mimeType: pdfFile.mimeType,
            filename: pdfFile.filename
          });
          emit("step", { id: "pdf", description: "Экспорт PDF", status: "completed" });
          emit("tool", {
            tool_call_id: `export-${artifactPdf.artifact_id}`,
            name: "file",
            status: "called",
            function: "artifact_export",
            args: { format: "pdf", file: pdfFile.filename },
            content: { path: `${previewPath}${artifactPdf.artifact_id}` }
          });

          emit("preview", {
            previewUrl: `${previewPath}${artifact.artifact_id}`,
            sandboxId: artifact.artifact_id,
            mimeType,
            filename,
            pdfExport: {
              previewUrl: `${previewPath}${artifactPdf.artifact_id}`,
              filename: pdfFile.filename
            }
          });
        } else {
          const html = await executePlanToHtml({
            message: userMessage,
            model,
            plan,
            user: routerUser,
            emit: (eventName, data) => emit(eventName, data, eventName !== "delta")
          });
          const artifact = await store.createArtifact(id, { kind: "html", html });
          emit("tool", {
            tool_call_id: `preview-${artifact.artifact_id}`,
            name: "browser",
            status: "called",
            function: "preview_render",
            args: { artifact: "index.html" },
            content: { screenshot: `${previewPath}${artifact.artifact_id}` }
          });
          emit("preview", {
            previewUrl: `${previewPath}${artifact.artifact_id}`,
            sandboxId: artifact.artifact_id,
            mimeType: ARTIFACT_MIME_HTML,
            filename: null
          });
        }
        const assistant = await generateSummary({ message: userMessage, model, plan, user: routerUser });
        emit("message", { role: "assistant", content: assistant });
        rec.status = "completed";
        await store.replaceSession(rec);
        emit("done", {});
      } catch (e) {
        rec.status = "failed";
        const event = makeEvent("error", { error: e instanceof Error ? e.message : "chat_failed" });
        rec.events.push(event);
        await store.replaceSession(rec);
        sseWrite(res, event.event, eventData(event));
        sseWrite(res, "done", eventData(makeEvent("done")));
      }
      res.end();
      return;
    }

    json(res, 404, { code: 404, msg: "not_found", data: null });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[lemnity-builder] listening on http://0.0.0.0:${port}`);
  });
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
