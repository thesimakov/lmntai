import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError } from "@/lib/api-response";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { buildAnalysisPrompt } from "@/lib/analytics-prompt";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { chargeTokensSafely } from "@/lib/token-billing";
import { resolveUiLanguageFromRequest } from "@/lib/request-ui-language";

function sseEncode(controller: ReadableStreamDefaultController, payload: unknown) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
  );
}

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

  const state = await getSandboxProjectState(projectId);
  const rawText = state?.files?.["raw_text.txt"];
  if (!rawText) {
    return apiError("No document uploaded. Upload a PDF first.", 400);
  }

  const MAX_CHARS = 200_000;
  const truncatedText = rawText.length > MAX_CHARS
    ? rawText.slice(0, MAX_CHARS) + "\n\n[Document truncated for analysis — first 200k characters shown]"
    : rawText;
  const uiLanguage = resolveUiLanguageFromRequest(req);
  const messages = buildAnalysisPrompt(truncatedText, uiLanguage);

  const stream = new ReadableStream({
    async start(controller) {
      sseEncode(controller, { type: "progress", progress: 0 });
      sseEncode(controller, { type: "progress", progress: 10 });

      let fakeProgress = 10;
      const ticker = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + 4, 75);
        sseEncode(controller, { type: "progress", progress: fakeProgress });
      }, 2500);

      try {
        const result = await requestRouterAIJson({
          messages,
          model: "anthropic/claude-sonnet-4.5",
          settings: { temperature: 0.1, max_completion_tokens: 8000 },
          user: user.id,
        });

        clearInterval(ticker);

        if (result.usage) {
          await chargeTokensSafely({
            userId: user.id,
            projectId,
            usage: result.usage,
            model: result.model ?? "anthropic/claude-sonnet-4.5",
          });
        }

        sseEncode(controller, { type: "progress", progress: 85 });

        let jsonText = result.text.trim();
        const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) jsonText = fenceMatch[1].trim();

        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          sseEncode(controller, {
            type: "error",
            message: "AI returned invalid JSON. Please try again.",
          });
          return;
        }

        const validation = analysisDashboardSchema.safeParse(parsed);
        if (!validation.success) {
          sseEncode(controller, {
            type: "error",
            message: "AI response did not match expected schema. Please try again.",
          });
          return;
        }

        const dashboard = validation.data;

        await upsertSandboxProjectState({
          projectId,
          sandboxId: state.sandboxId,
          ownerId: user.id,
          title: state.title,
          html: state.html,
          files: {
            ...state.files,
            "analysis.json": JSON.stringify(dashboard),
          },
        });

        sseEncode(controller, { type: "progress", progress: 100 });
        sseEncode(controller, { type: "complete", dashboard });
      } catch (err) {
        clearInterval(ticker);
        const msg = err instanceof Error ? err.message : "Analysis failed";
        sseEncode(controller, { type: "error", message: msg });
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
