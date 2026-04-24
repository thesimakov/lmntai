import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import {
  buildManusApiUrl,
  manusApiFetch,
  readManusEnvelope,
  withManusAuthHeaders
} from "@/lib/manus-api-client";
import { isManusFullParityEnabledServer } from "@/lib/manus-parity-config";
import {
  createManusSessionLink,
  deleteManusSessionForUser,
  ensureManusSessionOwnership,
  listManusSessionsForUser,
  syncManusSessionSummary,
  chargeManusChatUsage
} from "@/lib/manus-session-links";
import { hasEnoughTokens } from "@/lib/token-manager";
import { MIN_TOKENS_GENERATE_STREAM } from "@/lib/plan-config";
import { estimateUsageFromText } from "@/lib/token-billing";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ path: string[] }> };

type ManusGetSessionData = {
  session_id: string;
  title?: string | null;
  status?: string | null;
  events?: Array<{ event?: string; data?: { role?: string; content?: string } }>;
  is_shared?: boolean;
};

function copyResponseHeaders(from: Headers): Headers {
  const out = new Headers();
  const pass = [
    "content-type",
    "cache-control",
    "connection",
    "content-encoding",
    "content-length",
    "x-request-id"
  ];
  for (const key of pass) {
    const v = from.get(key);
    if (v) out.set(key, v);
  }
  return out;
}

function passthrough(upstream: Response): Response {
  return new Response(upstream.body, {
    status: upstream.status,
    headers: copyResponseHeaders(upstream.headers)
  });
}

function toManusPath(parts: string[]): string {
  return `/${parts.join("/")}`;
}

function randomEventId(): string {
  return `lmnt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function summarizeLatestAssistant(events: ManusGetSessionData["events"]): string | null {
  if (!events?.length) return null;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (e?.event === "message" && e.data?.role === "assistant" && typeof e.data.content === "string") {
      return e.data.content;
    }
  }
  return null;
}

function parseSseBlock(block: string): { event: string; data: string | null } | null {
  if (!block.trim()) return null;
  const lines = block.split("\n");
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }
  return { event, data: dataLines.length ? dataLines.join("\n") : null };
}

async function sleepWithAbort(ms: number, signal: AbortSignal) {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    const stop = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", stop, { once: true });
  });
}

async function streamUserSessionsSse(userId: string, signal: AbortSignal): Promise<Response> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (!signal.aborted) {
          const sessions = await listManusSessionsForUser(userId);
          controller.enqueue(encoder.encode(`event: sessions\ndata: ${JSON.stringify({ sessions })}\n\n`));
          await sleepWithAbort(5000, signal);
        }
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive"
    }
  });
}

async function proxyChatStream(input: {
  userId: string;
  manusSessionId: string;
  upstream: Response;
  requestText: string;
}) {
  let requestJson: { message?: string; event_id?: string } = {};
  try {
    requestJson = JSON.parse(input.requestText || "{}") as { message?: string; event_id?: string };
  } catch {
    requestJson = {};
  }
  const userMessage = typeof requestJson.message === "string" ? requestJson.message : "";
  const eventId = typeof requestJson.event_id === "string" && requestJson.event_id ? requestJson.event_id : randomEventId();

  const reader = input.upstream.body?.getReader();
  if (!reader) return passthrough(input.upstream);

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let carry = "";
  let assistantText = "";
  let title: string | null = null;
  let latestAssistant: string | null = null;
  let status = "running";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);

          const text = decoder.decode(value, { stream: true });
          carry += text;
          const blocks = carry.split("\n\n");
          carry = blocks.pop() ?? "";
          for (const block of blocks) {
            const parsed = parseSseBlock(block);
            if (!parsed) continue;
            if (parsed.event === "done") {
              status = "completed";
              continue;
            }
            if (parsed.event === "error") {
              status = "failed";
              continue;
            }
            if (!parsed.data) continue;
            try {
              const payload = JSON.parse(parsed.data) as { role?: string; content?: string; title?: string };
              if (parsed.event === "message" && payload.role === "assistant" && typeof payload.content === "string") {
                assistantText += `${assistantText ? "\n" : ""}${payload.content}`;
                latestAssistant = payload.content;
              }
              if (parsed.event === "title" && typeof payload.title === "string") {
                title = payload.title;
              }
            } catch {
              // ignore invalid event payload
            }
          }
        }

        if (carry.trim()) {
          const parsed = parseSseBlock(carry);
          if (parsed?.event === "done") {
            status = "completed";
          }
        }

        const usage = estimateUsageFromText(userMessage, assistantText);
        const charge = await chargeManusChatUsage({
          userId: input.userId,
          manusSessionId: input.manusSessionId,
          eventId,
          usage,
          model: "manus/full-parity"
        });
        if (!charge.charged && charge.reason === "insufficient_balance") {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "Insufficient tokens. Please upgrade your plan." })}\n\n`)
          );
        }

        await syncManusSessionSummary({
          userId: input.userId,
          manusSessionId: input.manusSessionId,
          title,
          latestMessage: latestAssistant,
          status
        });
      } catch {
        await syncManusSessionSummary({
          userId: input.userId,
          manusSessionId: input.manusSessionId,
          status: "failed"
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: input.upstream.status,
    headers: copyResponseHeaders(input.upstream.headers)
  });
}

async function handleManus(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  if (!isManusFullParityEnabledServer()) {
    return new Response("Manus full parity is disabled", { status: 404 });
  }

  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }
  const user = guard.data.user;

  const { path } = await ctx.params;
  if (!path?.length) {
    return new Response("Not found", { status: 404 });
  }

  // /api/manus/sessions
  if (path.length === 1 && path[0] === "sessions") {
    if (req.method === "GET") {
      const sessions = await listManusSessionsForUser(user.id);
      return Response.json({ code: 0, msg: "success", data: { sessions } });
    }
    if (req.method === "POST") {
      return streamUserSessionsSse(user.id, req.signal);
    }
    if (req.method === "PUT") {
      const upstream = await manusApiFetch("/sessions", { method: "PUT" });
      const envelope = await readManusEnvelope<{ session_id?: string }>(upstream.clone());
      const sessionId = envelope?.data?.session_id;
      if (upstream.ok && envelope?.code === 0 && typeof sessionId === "string" && sessionId) {
        try {
          await createManusSessionLink(user.id, sessionId);
        } catch (error) {
          if (error instanceof Error && error.message === "MANUS_SESSION_ALREADY_OWNED") {
            return Response.json({ code: 409, msg: "Session already linked to another user", data: null }, { status: 409 });
          }
          throw error;
        }
      }
      return passthrough(upstream);
    }
    return new Response("Method not allowed", { status: 405 });
  }

  if (path[0] !== "sessions" || path.length < 2) {
    return new Response("Not found", { status: 404 });
  }

  if (path[1] === "shared" && path.length === 3 && req.method === "GET") {
    const upstream = await manusApiFetch(toManusPath(path), { method: "GET" });
    return passthrough(upstream);
  }

  const manusSessionId = path[1];
  try {
    await ensureManusSessionOwnership(user.id, manusSessionId);
  } catch (error) {
    if (error instanceof Error && error.message === "MANUS_SESSION_NOT_FOUND") {
      return new Response("Session not found", { status: 404 });
    }
    throw error;
  }

  const tail = path.slice(2);
  const upstreamPath = toManusPath(path);

  if (tail.length === 0 && req.method === "GET") {
    const upstream = await manusApiFetch(upstreamPath, { method: "GET" });
    const envelope = await readManusEnvelope<ManusGetSessionData>(upstream.clone());
    if (upstream.ok && envelope?.code === 0 && envelope.data) {
      await syncManusSessionSummary({
        userId: user.id,
        manusSessionId,
        title: envelope.data.title ?? null,
        latestMessage: summarizeLatestAssistant(envelope.data.events),
        status: envelope.data.status ?? null,
        isShared: envelope.data.is_shared ?? null
      });
    }
    return passthrough(upstream);
  }

  if (tail.length === 0 && req.method === "DELETE") {
    const upstream = await manusApiFetch(upstreamPath, { method: "DELETE" });
    if (upstream.ok) {
      await deleteManusSessionForUser(user.id, manusSessionId);
    }
    return passthrough(upstream);
  }

  const requestText =
    req.method === "GET" || req.method === "HEAD" ? "" : await req.text().catch(() => "");
  const headers = withManusAuthHeaders({
    "Content-Type": req.headers.get("content-type") || "application/json",
    Accept: req.headers.get("accept") || "*/*",
    "x-lmnt-user-id": user.id,
    "x-lmnt-plan": user.plan,
    "x-lmnt-token-balance": String(user.tokenBalance),
    "x-lmnt-token-limit": String(user.tokenLimit)
  });

  if (tail[0] === "chat" && req.method === "POST") {
    if (!hasEnoughTokens(user, MIN_TOKENS_GENERATE_STREAM)) {
      return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
    }
    await syncManusSessionSummary({
      userId: user.id,
      manusSessionId,
      status: "running"
    });

    const upstream = await fetch(buildManusApiUrl(upstreamPath), {
      method: "POST",
      headers,
      body: requestText
    });
    if (!upstream.ok || !upstream.body) {
      return passthrough(upstream);
    }
    return proxyChatStream({
      userId: user.id,
      manusSessionId,
      upstream,
      requestText
    });
  }

  const upstream = await fetch(buildManusApiUrl(upstreamPath), {
    method: req.method,
    headers,
    body: requestText || undefined
  });

  if (upstream.ok && tail[0] === "share") {
    if (req.method === "POST") {
      await syncManusSessionSummary({ userId: user.id, manusSessionId, isShared: true });
    } else if (req.method === "DELETE") {
      await syncManusSessionSummary({ userId: user.id, manusSessionId, isShared: false });
    }
  }
  if (upstream.ok && tail[0] === "clear_unread_message_count" && req.method === "POST") {
    await syncManusSessionSummary({ userId: user.id, manusSessionId, unreadMessageCount: 0 });
  }
  if (upstream.ok && tail[0] === "stop" && req.method === "POST") {
    await syncManusSessionSummary({ userId: user.id, manusSessionId, status: "stopped" });
  }

  return passthrough(upstream);
}

export const GET = withApiLogging("/api/manus/[...path]", handleManus);
export const POST = withApiLogging("/api/manus/[...path]", handleManus);
export const PUT = withApiLogging("/api/manus/[...path]", handleManus);
export const PATCH = withApiLogging("/api/manus/[...path]", handleManus);
export const DELETE = withApiLogging("/api/manus/[...path]", handleManus);
