import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIStream } from "@/lib/routerai-client";
import { splitSseLines, extractDataJson } from "@/lib/sse-parser";
import { buildChatPrompt } from "@/lib/analytics-prompt";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { chargeTokensSafely, estimateUsageFromText } from "@/lib/token-billing";
import type { ChatMessage } from "@/lib/stores/use-analytics-store";

const CHAT_MODEL = "anthropic/claude-haiku-4.5";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const user = guard.data.user;

  const { id: projectId } = await params;

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch {
    return apiError("Project not found or access denied", 403);
  }

  const body = (await req.json()) as { message: string; history: ChatMessage[] };
  if (!body.message?.trim()) return apiError("Empty message", 400);

  const state = await getSandboxProjectState(projectId);
  if (!state) return apiError("No analysis found. Upload and analyze a PDF first.", 400);
  const rawAnalysis = state.files["analysis.json"];
  if (!rawAnalysis) return apiError("No analysis found. Upload and analyze a PDF first.", 400);

  let dashboard: ReturnType<typeof analysisDashboardSchema.parse>;
  try {
    dashboard = analysisDashboardSchema.parse(JSON.parse(rawAnalysis));
  } catch {
    return apiError("Analysis data is corrupted or invalid.", 422);
  }
  const history = (body.history ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const messages = buildChatPrompt(dashboard, body.message, history);

  const routerRes = await requestRouterAIStream({
    messages,
    model: CHAT_MODEL,
    settings: { temperature: 0.3, max_completion_tokens: 2000 },
    user: user.id,
  });

  if (!routerRes.ok || !routerRes.body) {
    return apiError("AI service unavailable", 502);
  }

  const stream = new ReadableStream({
    async start(controller) {
      function sse(payload: unknown) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      }

      let assembled = "";
      let carry = "";
      let chargedFromStream = false;
      const decoder = new TextDecoder();
      // body is confirmed non-null by the guard above
      const reader = routerRes.body!.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          const result = splitSseLines(text, carry);
          carry = result.carry;
          for (const line of result.lines) {
            const data = extractDataJson(line);
            if (!data) continue;
            const d = data as Record<string, unknown>;
            const delta = (
              d?.choices as Array<{ delta?: { content?: unknown } }>
            )?.[0]?.delta?.content;
            if (typeof delta === "string") {
              assembled += delta;
              sse({ type: "delta", text: delta });
            }
            const usage = d?.usage as
              | {
                  prompt_tokens?: number;
                  completion_tokens?: number;
                  total_tokens?: number;
                }
              | undefined;
            if (usage?.total_tokens) {
              chargedFromStream = true;
              await chargeTokensSafely({
                userId: user.id,
                usage,
                projectId,
                model: CHAT_MODEL,
              });
            }
          }
        }

        if (!chargedFromStream) {
          await chargeTokensSafely({
            userId: user.id,
            usage: estimateUsageFromText(body.message, assembled),
            projectId,
            model: CHAT_MODEL,
          });
        }

        sse({ type: "done" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Chat error";
        sse({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
