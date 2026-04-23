import type { NextRequest } from "next/server";

import { requireAdminUser } from "@/lib/auth-guards";
import { getGatewayConfig, requestRouterAIJson } from "@/lib/routerai-client";
import { withApiLogging } from "@/lib/with-api-logging";

async function getRouterAiHealth(req: NextRequest) {
  void req;
  const guard = await requireAdminUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  const startedAt = Date.now();
  const model = process.env.AI_GATEWAY_HEALTH_MODEL || "openai/gpt-4.1";

  try {
    const { baseUrl } = getGatewayConfig();
    const result = await requestRouterAIJson({
      prompt: "Ответь одним словом: ok",
      model,
      settings: {
        temperature: 0,
        max_completion_tokens: 16
      },
      user: guard.data.user.id
    });

    return Response.json({
      ok: true,
      model,
      baseUrl,
      latencyMs: Date.now() - startedAt,
      textPreview: result.text.slice(0, 80),
      usage: result.usage ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RouterAI health check failed";
    const status = message.includes("AI_GATEWAY_BASE_URL") || message.includes("AI_GATEWAY_API_KEY") ? 500 : 502;
    return Response.json(
      {
        ok: false,
        model,
        latencyMs: Date.now() - startedAt,
        error: message
      },
      { status }
    );
  }
}

export const GET = withApiLogging("/api/routerai/health", getRouterAiHealth);
