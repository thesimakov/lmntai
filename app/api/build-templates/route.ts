import type { NextRequest } from "next/server";

import { requireDbUser } from "@/lib/auth-guards";
import { getBuiltinBuildTemplateCatalogList, listBuildTemplates } from "@/lib/build-templates";
import { withApiLogging } from "@/lib/with-api-logging";

export const runtime = "nodejs";

async function getBuildTemplates(req: NextRequest) {
  void req;
  const guard = await requireDbUser();
  if (!guard.ok) {
    // Клиент ожидает JSON; при 401/404/503 список шаблонов «пропадал». Встроенный каталог не секретен.
    return Response.json({ templates: getBuiltinBuildTemplateCatalogList() });
  }
  const templates = await listBuildTemplates();

  return Response.json({ templates });
}

export const GET = withApiLogging("/api/build-templates", getBuildTemplates);
