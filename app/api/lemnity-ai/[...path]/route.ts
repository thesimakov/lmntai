import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { isLemnityAiBridgeEnabledServer } from "@/lib/lemnity-ai-bridge-config";
import {
  buildLemnityAiUpstreamUrl,
  lemnityAiUpstreamFetch,
  readLemnityAiUpstreamEnvelope,
  withLemnityAiUpstreamAuthHeaders
} from "@/lib/lemnity-ai-upstream-client";
import {
  chargeLemnityAiChatUsage,
  createLemnityAiSessionLink,
  deleteLemnityAiSessionForUser,
  ensureLemnityAiSessionOwnership,
  ensureUserCanEditLemnityArtifact,
  listLemnityAiSessionsForUser,
  syncLemnityAiSessionSummary
} from "@/lib/lemnity-ai-session-links";
import { resolveAgentForTask } from "@/lib/agent-models";
import { isProjectKind } from "@/lib/lemnity-ai-prompt-spec";
import { getEffectiveStreamMinimum } from "@/lib/platform-plan-settings";
import { hasEnoughTokens } from "@/lib/token-manager";
import { estimateUsageFromText } from "@/lib/token-billing";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ path: string[] }> };

type BridgeUpstreamSessionData = {
  session_id: string;
  title?: string | null;
  status?: string | null;
  events?: Array<{ event?: string; data?: Record<string, unknown> }>;
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

function toUpstreamApiPath(parts: string[]): string {
  return `/${parts.join("/")}`;
}

function randomEventId(): string {
  return `lmnt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function summarizeLatestAssistant(events: BridgeUpstreamSessionData["events"]): string | null {
  if (!events?.length) return null;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    const role = e?.data?.role;
    const content = e?.data?.content;
    if (e?.event === "message" && role === "assistant" && typeof content === "string") {
      return content;
    }
  }
  return null;
}

function lastPreviewArtifactFromEvents(events: BridgeUpstreamSessionData["events"]): string | null {
  if (!events?.length) return null;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (e?.event === "preview") {
      const sid = e.data?.sandboxId;
      if (typeof sid === "string" && sid.startsWith("artifact_")) return sid;
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
          const sessions = await listLemnityAiSessionsForUser(userId);
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

function enrichChatRequestForRouterModel(
  requestText: string,
  plan: string
): string {
  try {
    const parsed = JSON.parse(requestText || "{}") as Record<string, unknown>;
    const hintRaw = parsed.agent_hint;
    const hint = typeof hintRaw === "string" ? hintRaw : null;
    const pkRaw = parsed.project_kind;
    const projectKind =
      typeof pkRaw === "string" && isProjectKind(pkRaw) ? pkRaw : undefined;
    const agent = resolveAgentForTask({
      plan,
      projectKind: projectKind ?? null,
      task: "generate-stream",
      hint
    });
    const next: Record<string, unknown> = { ...parsed, model: agent.modelId };
    delete next.agent_hint;
    if (projectKind) {
      next.project_kind = projectKind;
    } else {
      delete next.project_kind;
    }
    return JSON.stringify(next);
  } catch {
    return requestText;
  }
}

async function proxyChatStream(input: {
  userId: string;
  upstreamSessionId: string;
  upstream: Response;
  requestText: string;
}) {
  let requestJson: { message?: string; event_id?: string; model?: string } = {};
  try {
    requestJson = JSON.parse(input.requestText || "{}") as {
      message?: string;
      event_id?: string;
      model?: string;
    };
  } catch {
    requestJson = {};
  }
  const userMessage = typeof requestJson.message === "string" ? requestJson.message : "";
  const eventId = typeof requestJson.event_id === "string" && requestJson.event_id ? requestJson.event_id : randomEventId();
  const billingModel =
    typeof requestJson.model === "string" && requestJson.model.trim()
      ? requestJson.model.trim()
      : "lemnity-ai/full-parity";

  const reader = input.upstream.body?.getReader();
  if (!reader) return passthrough(input.upstream);

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let carry = "";
  let assistantText = "";
  let title: string | null = null;
  let latestAssistant: string | null = null;
  let status = "running";
  let previewArtifactId: string | null = null;

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
              const payload = JSON.parse(parsed.data) as {
                role?: string;
                content?: string;
                title?: string;
                sandboxId?: string;
              };
              if (parsed.event === "preview" && typeof payload.sandboxId === "string" && payload.sandboxId.startsWith("artifact_")) {
                previewArtifactId = payload.sandboxId;
                continue;
              }
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
        const charge = await chargeLemnityAiChatUsage({
          userId: input.userId,
          upstreamSessionId: input.upstreamSessionId,
          eventId,
          usage,
          model: billingModel
        });
        if (!charge.charged && charge.reason === "insufficient_balance") {
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "Insufficient tokens. Please upgrade your plan." })}\n\n`)
          );
        }

        await syncLemnityAiSessionSummary({
          userId: input.userId,
          upstreamSessionId: input.upstreamSessionId,
          title,
          latestMessage: latestAssistant,
          status,
          ...(previewArtifactId ? { previewArtifactId } : {})
        });
      } catch {
        await syncLemnityAiSessionSummary({
          userId: input.userId,
          upstreamSessionId: input.upstreamSessionId,
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

async function handleLemnityAiBridge(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const { path } = await ctx.params;

  if (req.method === "GET" && path?.length === 1 && path[0] === "bootstrap") {
    return Response.json({ fullParity: isLemnityAiBridgeEnabledServer() });
  }

  if (!isLemnityAiBridgeEnabledServer()) {
    return new Response("Lemnity AI bridge is disabled", { status: 404 });
  }

  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }
  const user = guard.data.user;
  if (!path?.length) {
    return new Response("Not found", { status: 404 });
  }

  if (path[0] === "artifacts" && path.length === 2 && req.method === "PATCH") {
    const artifactId = path[1];
    try {
      await ensureUserCanEditLemnityArtifact(user.id, artifactId);
    } catch {
      return new Response("Not found", { status: 404 });
    }
    let bodyText: string;
    try {
      bodyText = await req.text();
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    const upstream = await fetch(buildLemnityAiUpstreamUrl(toUpstreamApiPath(path)), {
      method: "PATCH",
      headers: withLemnityAiUpstreamAuthHeaders({
        "Content-Type": req.headers.get("content-type") || "application/json"
      }),
      body: bodyText
    });
    if (upstream.status === 204) return new Response(null, { status: 204 });
    return passthrough(upstream);
  }

  if (path[0] === "artifacts" && path.length === 2 && req.method === "GET") {
    const upstream = await fetch(buildLemnityAiUpstreamUrl(toUpstreamApiPath(path)), {
      method: "GET",
      headers: withLemnityAiUpstreamAuthHeaders({
        Accept: req.headers.get("accept") || "text/html"
      })
    });
    return passthrough(upstream);
  }

  if (path.length === 1 && path[0] === "sessions") {
    if (req.method === "GET") {
      const sessions = await listLemnityAiSessionsForUser(user.id);
      return Response.json({ code: 0, msg: "success", data: { sessions } });
    }
    if (req.method === "POST") {
      return streamUserSessionsSse(user.id, req.signal);
    }
    if (req.method === "PUT") {
      const upstream = await lemnityAiUpstreamFetch("/sessions", { method: "PUT" });
      const envelope = await readLemnityAiUpstreamEnvelope<{ session_id?: string }>(upstream.clone());
      const sessionId = envelope?.data?.session_id;
      if (upstream.ok && envelope?.code === 0 && typeof sessionId === "string" && sessionId) {
        try {
          await createLemnityAiSessionLink(user.id, sessionId);
        } catch (error) {
          if (error instanceof Error && error.message === "LEMNITY_AI_SESSION_ALREADY_OWNED") {
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
    const upstream = await lemnityAiUpstreamFetch(toUpstreamApiPath(path), { method: "GET" });
    return passthrough(upstream);
  }

  const upstreamSessionId = path[1];
  try {
    await ensureLemnityAiSessionOwnership(user.id, upstreamSessionId);
  } catch (error) {
    if (error instanceof Error && error.message === "LEMNITY_AI_SESSION_NOT_FOUND") {
      return new Response("Session not found", { status: 404 });
    }
    throw error;
  }

  const tail = path.slice(2);
  const upstreamPath = toUpstreamApiPath(path);

  if (tail.length === 0 && req.method === "GET") {
    const upstream = await lemnityAiUpstreamFetch(upstreamPath, { method: "GET" });
    const envelope = await readLemnityAiUpstreamEnvelope<BridgeUpstreamSessionData>(upstream.clone());
    if (upstream.ok && envelope?.code === 0 && envelope.data) {
      const artifact = lastPreviewArtifactFromEvents(envelope.data.events);
      await syncLemnityAiSessionSummary({
        userId: user.id,
        upstreamSessionId,
        title: envelope.data.title ?? null,
        latestMessage: summarizeLatestAssistant(envelope.data.events),
        status: envelope.data.status ?? null,
        isShared: envelope.data.is_shared ?? null,
        ...(artifact ? { previewArtifactId: artifact } : {})
      });
    }
    return passthrough(upstream);
  }

  if (tail.length === 0 && req.method === "DELETE") {
    const upstream = await lemnityAiUpstreamFetch(upstreamPath, { method: "DELETE" });
    if (upstream.ok) {
      await deleteLemnityAiSessionForUser(user.id, upstreamSessionId);
    }
    return passthrough(upstream);
  }

  const requestText =
    req.method === "GET" || req.method === "HEAD" ? "" : await req.text().catch(() => "");
  const headers = withLemnityAiUpstreamAuthHeaders({
    "Content-Type": req.headers.get("content-type") || "application/json",
    Accept: req.headers.get("accept") || "*/*",
    "x-lmnt-user-id": user.id,
    "x-lmnt-plan": user.plan,
    "x-lmnt-token-balance": String(user.tokenBalance),
    "x-lmnt-token-limit": String(user.tokenLimit)
  });

  if (tail[0] === "chat" && req.method === "POST") {
    const minStreamBalance = await getEffectiveStreamMinimum(user.plan);
    if (!hasEnoughTokens(user, minStreamBalance)) {
      return new Response("Insufficient tokens. Please upgrade your plan.", { status: 402 });
    }
    await syncLemnityAiSessionSummary({
      userId: user.id,
      upstreamSessionId,
      status: "running"
    });

    const chatBody = enrichChatRequestForRouterModel(requestText, user.plan);

    const upstream = await fetch(buildLemnityAiUpstreamUrl(upstreamPath), {
      method: "POST",
      headers,
      body: chatBody
    });
    if (!upstream.ok || !upstream.body) {
      return passthrough(upstream);
    }
    return proxyChatStream({
      userId: user.id,
      upstreamSessionId,
      upstream,
      requestText: chatBody
    });
  }

  const upstream = await fetch(buildLemnityAiUpstreamUrl(upstreamPath), {
    method: req.method,
    headers,
    body: requestText || undefined
  });

  if (upstream.ok && tail[0] === "share") {
    if (req.method === "POST") {
      await syncLemnityAiSessionSummary({ userId: user.id, upstreamSessionId, isShared: true });
    } else if (req.method === "DELETE") {
      await syncLemnityAiSessionSummary({ userId: user.id, upstreamSessionId, isShared: false });
    }
  }
  if (upstream.ok && tail[0] === "clear_unread_message_count" && req.method === "POST") {
    await syncLemnityAiSessionSummary({ userId: user.id, upstreamSessionId, unreadMessageCount: 0 });
  }
  if (upstream.ok && tail[0] === "stop" && req.method === "POST") {
    await syncLemnityAiSessionSummary({ userId: user.id, upstreamSessionId, status: "stopped" });
  }

  return passthrough(upstream);
}

export const GET = withApiLogging("/api/lemnity-ai/[...path]", handleLemnityAiBridge);
export const POST = withApiLogging("/api/lemnity-ai/[...path]", handleLemnityAiBridge);
export const PUT = withApiLogging("/api/lemnity-ai/[...path]", handleLemnityAiBridge);
export const PATCH = withApiLogging("/api/lemnity-ai/[...path]", handleLemnityAiBridge);
export const DELETE = withApiLogging("/api/lemnity-ai/[...path]", handleLemnityAiBridge);
