import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { parseSlideGraphPayload } from "@/lib/slide-graph/normalize";
import { getTemplate } from "@/lib/slide-graph/templates";
import { PresentationEditorClient } from "./presentation-editor";
import { TemplatePicker } from "./template-picker";

interface Props {
  searchParams: Promise<{ projectId?: string }>;
}

async function PresentationsLoader({ projectId }: { projectId: string }) {
  const guard = await requireDbUser();
  if (!guard.ok) notFound();
  const { user } = guard.data;

  let projectTitle: string;
  try {
    const scope = await requireProjectScopeForOwner(projectId, user.id);
    projectTitle = scope.name;
  } catch {
    notFound();
  }

  const state = await getSandboxProjectState(projectId);
  const graphJson = state?.files?.["slide_graph.json"];

  if (!graphJson) {
    return <TemplatePicker projectId={projectId} projectTitle={projectTitle} />;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(graphJson) as unknown;
  } catch {
    return (
      <TemplatePicker
        projectId={projectId}
        projectTitle={projectTitle}
        error="Данные повреждены — выберите шаблон заново."
      />
    );
  }

  const meta =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as { meta?: { templateId?: string } }).meta
      : undefined;
  const template = meta?.templateId ? getTemplate(meta.templateId) : undefined;

  const parse = parseSlideGraphPayload(raw, { template });
  if (!parse.success) {
    return (
      <TemplatePicker
        projectId={projectId}
        projectTitle={projectTitle}
        error="Данные повреждены — выберите шаблон заново."
      />
    );
  }

  return <PresentationEditorClient projectId={projectId} initialGraph={parse.data} />;
}

export default async function PresentationsPage({ searchParams }: Props) {
  const { projectId } = await searchParams;
  if (!projectId) notFound();

  return (
    <div className="flex flex-col w-full h-full">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Загружаем презентацию…
          </div>
        }
      >
        <PresentationsLoader projectId={projectId} />
      </Suspense>
    </div>
  );
}
