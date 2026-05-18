import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { apiError, apiGuardError, apiOk, apiServerError } from "@/lib/api-response";
import { parseBody } from "@/lib/api-schemas";
import { getSandboxProjectState, upsertSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { renderSlideGraph } from "@/lib/slide-graph/renderer";
import {
  loadSlideGraphFromJson,
  parseSlideFromAiText,
} from "@/lib/slide-graph/normalize";
import { getTemplate } from "@/lib/slide-graph/templates";
import { requestRouterAIJson } from "@/lib/routerai-client";
import { chargeTokensSafely } from "@/lib/token-billing";
import { unknownToErrorMessage } from "@/lib/unknown-error-message";
import type { Slide, SlideGraph } from "@/lib/slide-graph/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADD_SLIDE_MODEL = "anthropic/claude-haiku-4-5-20251001";

const bodySchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("delete"),
    slideId: z.string().min(1),
  }),
  z.object({
    op: z.literal("reorder"),
    slideIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    op: z.literal("add"),
    afterSlideId: z.string().min(1).optional(),
    prompt: z.string().max(500).optional(),
  }),
  z.object({
    op: z.literal("update-notes"),
    slideId: z.string().min(1),
    notes: z.string().max(2000),
  }),
]);

function fallbackSlide(hint: string): Slide {
  const id = `slide_${Date.now()}`;
  return {
    id,
    layout: "content",
    elements: [
      { id: `${id}_h`, type: "heading", content: hint || "Новый слайд" },
      { id: `${id}_b`, type: "body", content: "Добавьте содержимое." },
    ],
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const state = await getSandboxProjectState(projectId);
    const graphJson = state?.files?.["slide_graph.json"];
    if (!graphJson) {
      return apiError("No slide graph found.", 400);
    }

    let metaTemplateId: string | undefined;
    try {
      const raw = JSON.parse(graphJson) as { meta?: { templateId?: string } };
      metaTemplateId = raw.meta?.templateId;
    } catch {
      return apiError("Slide graph JSON is invalid.", 422);
    }

    const template = metaTemplateId ? getTemplate(metaTemplateId) : undefined;
    const graphParse = loadSlideGraphFromJson(graphJson, { template });
    if (!graphParse?.success) {
      return apiError("Slide graph is corrupted.", 422);
    }

    let graph = graphParse.data;
    const op = body.data;

    if (op.op === "delete") {
      if (graph.slides.length <= 1) {
        return apiError("Cannot delete the last slide.", 400);
      }
      const { slideId } = op;
      graph = { ...graph, slides: graph.slides.filter((s) => s.id !== slideId) };
    }

    if (op.op === "reorder") {
      const { slideIds } = op;
      const slideMap = new Map(graph.slides.map((s) => [s.id, s]));
      const reordered = slideIds
        .map((id) => slideMap.get(id))
        .filter((s): s is Slide => s !== undefined);
      if (reordered.length !== graph.slides.length) {
        return apiError("Slide IDs do not match the current slide set.", 400);
      }
      graph = { ...graph, slides: reordered };
    }

    if (op.op === "update-notes") {
      const { slideId, notes } = op;
      graph = {
        ...graph,
        slides: graph.slides.map((s) =>
          s.id === slideId ? { ...s, notes } : s
        ),
      };
    }

    if (op.op === "add") {
      const forbiddenIds = new Set(graph.slides.map((s) => s.id));
      const newSlide = await generateNewSlide(
        graph,
        op.prompt ?? "",
        user.id,
        projectId,
        forbiddenIds
      );
      const insertAfter = op.afterSlideId;
      if (insertAfter) {
        const idx = graph.slides.findIndex((s) => s.id === insertAfter);
        const slides = [...graph.slides];
        if (idx === -1) {
          slides.push(newSlide);
        } else {
          slides.splice(idx + 1, 0, newSlide);
        }
        graph = { ...graph, slides };
      } else {
        graph = { ...graph, slides: [...graph.slides, newSlide] };
      }
    }

    const html = renderSlideGraph(graph);
    await upsertSandboxProjectState({
      projectId,
      sandboxId: state.sandboxId ?? projectId,
      ownerId: user.id,
      title: state.title,
      html,
      files: {
        ...state.files,
        "slide_graph.json": JSON.stringify(graph, null, 2),
      },
    });

    return apiOk({ graph });
  } catch (e) {
    return apiServerError(e, "slides-manage");
  }
}

async function generateNewSlide(
  graph: SlideGraph,
  hint: string,
  userId: string,
  projectId: string,
  forbiddenIds: Set<string>
): Promise<Slide> {
  const existingIds = graph.slides.map((s) => `"${s.id}"`).join(", ");
  const prompt = `You are adding ONE new slide to an existing presentation titled "${graph.meta.title}".
Existing slide IDs: [${existingIds}].

${hint ? `User wants: ${hint}` : "Generate a logical continuation slide for this presentation."}

Return ONLY a JSON object for a single slide. No markdown, no code fences.
meta.language must be "ru" or "en" if you include meta (omit meta entirely).
Schema:
{
  "id": "slide_unique_snake_case",
  "layout": "content" | "title" | "two-column" | "metrics-cards" | "feature-grid-6" | "section-divider",
  "background": { "color": "#optional-hex" },
  "elements": [
    { "id": "elem_unique", "type": "heading"|"subheading"|"body"|"bullet-list"|"metric-card"|"feature-card", "content": "...", "items": ["..."] }
  ],
  "notes": "Optional speaker notes"
}`;

  try {
    const result = await requestRouterAIJson({
      messages: [{ role: "user", content: prompt }],
      model: ADD_SLIDE_MODEL,
      settings: { temperature: 0.4, max_completion_tokens: 1500 },
      user: userId,
    });

    if (result.usage) {
      await chargeTokensSafely({
        userId,
        projectId,
        usage: result.usage,
        model: result.model ?? ADD_SLIDE_MODEL,
      });
    }

    const parsed = parseSlideFromAiText(result.text, { forbiddenIds });
    if (parsed) return parsed;
  } catch (e) {
    console.warn("[slides-manage] add slide AI failed:", unknownToErrorMessage(e));
  }

  return fallbackSlide(hint);
}
