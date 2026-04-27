import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { formatBuildTemplateBlock, getBuildTemplateBySlug } from "@/lib/build-templates";
import { sandboxManager } from "@/lib/sandbox-manager";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function postBuildTemplatePreview(req: NextRequest) {
  const guard = await requireDbUser();
  if (!guard.ok) {
    return new Response(guard.message, { status: guard.status });
  }

  let body: { slug?: string };
  try {
    body = (await req.json()) as { slug?: string };
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) {
    return new Response("slug required", { status: 400 });
  }

  const t = await getBuildTemplateBySlug(slug);
  if (!t) {
    return new Response("Template not found", { status: 404 });
  }

  const { sandboxId } = await sandboxManager.createSandbox(`bt-${t.slug}`, guard.data.user.id);
  const generatedTxt = formatBuildTemplateBlock(t.rules, t.files);
  const { previewUrl } = await sandboxManager.applyLovableFromProjectFiles(sandboxId, t.files, generatedTxt);

  return Response.json({ previewUrl, sandboxId });
}

export const POST = withApiLogging("/api/build-templates/preview", postBuildTemplatePreview);
