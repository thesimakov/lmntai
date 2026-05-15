import { requireDbUser } from "@/lib/auth-guards";
import { apiGuardError, apiOk } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireDbUser();
  if (!guard.ok) return apiGuardError(guard);
  const { user } = guard.data;

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id, preferredEditor: "presentation" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });

  const states = await Promise.all(
    projects.map((p) =>
      getSandboxProjectState(p.id).then((s) => ({
        projectId: p.id,
        hasSlides: Boolean(s?.files?.["slide_graph.json"]),
        slideTitle: (() => {
          const raw = s?.files?.["slide_graph.json"];
          if (!raw) return null;
          try {
            return (JSON.parse(raw) as { meta?: { title?: string } }).meta?.title ?? null;
          } catch {
            return null;
          }
        })(),
      }))
    )
  );

  const byId = new Map(states.map((s) => [s.projectId, s]));

  return apiOk({
    presentations: projects.map((p) => {
      const s = byId.get(p.id);
      return {
        id: p.id,
        name: s?.slideTitle ?? p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        hasSlides: s?.hasSlides ?? false,
        editUrl: s?.hasSlides
          ? `/playground/slides?projectId=${p.id}`
          : `/playground/build?sessionId=${p.id}&projectKind=presentation`,
      };
    }),
  });
}
