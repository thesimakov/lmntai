import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { parseAgentPickerLabel } from "@/lib/agent-models";
import { buildTemplateSlidePrompt, TEMPLATE_SLIDE_RETRY_MESSAGE } from "@/lib/slide-graph/prompt";
import { generateSlideGraphFromAi } from "@/lib/slide-graph/generate-from-ai";
import { renderSlideGraph } from "@/lib/slide-graph/renderer";
import { getTemplate } from "@/lib/slide-graph/templates";
import {
  chargeStructuredJsonUsageSafely,
  requestStructuredJsonForProjectKind,
} from "@/lib/structured-json-ai";
import {
  applyBrandKitToSlideGraph,
  resolveProjectBrandKitForSlides,
} from "@/lib/brand-kit-prompt";
import { userFacingAiUnavailableMessage } from "@/lib/ai-unavailable-message";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";
import type { SlideGraph } from "@/lib/slide-graph/types";
import { PRESENTATION_SOURCE_MAX_CHARS } from "@/lib/presentation-source-document";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    templateId: z.string().min(1),
    brief: z.string().max(4000).default(""),
    sourceText: z.string().max(PRESENTATION_SOURCE_MAX_CHARS).optional(),
    sourceFileName: z.string().max(255).optional(),
    agentHint: z.string().max(64).optional(),
  })
  .refine((d) => d.brief.trim().length > 0 || (d.sourceText?.trim().length ?? 0) > 0, {
    message: "Укажите описание или прикрепите документ с текстом",
  });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const { id: projectId } = await params;

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch {
    return apiError("Project not found or access denied", 403);
  }

  const body = await parseBody(req, bodySchema);
  if (!body.ok) return body.response;
  const { templateId, brief, sourceText, sourceFileName, agentHint: agentHintRaw } = body.data;
  const agentHint = parseAgentPickerLabel(agentHintRaw) ?? agentHintRaw ?? null;

  const template = getTemplate(templateId);
  if (!template) {
    return apiError(`Unknown template: ${templateId}`, 400);
  }

  const trimmedBrief = (brief ?? "").trim();
  const trimmedSource = sourceText?.trim() ?? "";
  const trimmedSourceFileName = sourceFileName?.trim() ?? "";

  const sourceDocument = trimmedSource
    ? {
        fileName: trimmedSourceFileName || "document",
        text: trimmedSource,
      }
    : null;

  const { promptBlock: brandKitBlock, manifest: brandKitManifest } =
    await resolveProjectBrandKitForSlides(projectId);

  const messages = buildTemplateSlidePrompt(
    template,
    trimmedBrief,
    sourceDocument,
    brandKitBlock
  );

  let generated: Awaited<ReturnType<typeof generateSlideGraphFromAi>>;
  try {
    generated = await generateSlideGraphFromAi({
      messages,
      template,
      retryMessage: TEMPLATE_SLIDE_RETRY_MESSAGE,
      logLabel: "generate-presentation",
      callAI: async (msgs, settings) => {
        const result = await requestStructuredJsonForProjectKind(
          { messages: msgs, settings },
          {
            plan: user.plan,
            projectKind: "presentation",
            userId: user.id,
            agentHint,
            autoFromPrompt: trimmedBrief,
          }
        );
        await chargeStructuredJsonUsageSafely({
          userId: user.id,
          projectId,
          usage: result.usage,
          model: result.model ?? result.requestedModel,
          label: "generate-presentation-template",
        });
        return { text: result.text };
      },
    });
  } catch (e) {
    console.error("[generate-presentation]", unknownToErrorMessage(e));
    return apiError(userFacingAiUnavailableMessage(e), 502, { code: "AI_UNAVAILABLE" });
  }

  if (!generated.ok) {
    return apiError(
      "Не удалось собрать презентацию из ответа AI. Попробуйте укоротить описание или выбрать другой шаблон.",
      422,
      { code: "SCHEMA_MISMATCH" }
    );
  }

  const now = new Date().toISOString();
  const finalGraph: SlideGraph = applyBrandKitToSlideGraph(
    {
      ...generated.graph,
      meta: { ...generated.graph.meta, generatedAt: now, templateId },
    },
    brandKitManifest
  );
  const html = renderSlideGraph(finalGraph);
  const existing = await getSandboxProjectState(projectId);
  await upsertSandboxProjectState({
    projectId,
    sandboxId: existing?.sandboxId ?? projectId,
    ownerId: user.id,
    title: existing?.title ?? finalGraph.meta.title,
    html,
    files: {
      ...(existing?.files ?? {}),
      "slide_graph.json": JSON.stringify(finalGraph, null, 2),
    },
  });

  return apiOk({ graph: finalGraph, html, attempts: generated.attempts });
}
