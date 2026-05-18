import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { slideGraphSchema } from "@/lib/slide-graph/schema";
import { PresentationEditorClient } from "./presentation-editor";
import { TemplatePicker } from "./template-picker";

interface Props {
  searchParams: Promise<{ projectId?: string }>;
}

async function PresentationsLoader({ projectId }: { projectId: string }) {
  const guard = await requireDbUser();
  if (!guard.ok) notFound();
  const { user } = guard.data;

  try {
    await requireProjectScopeForOwner(projectId, user.id);
  } catch {
    notFound();
  }

  const state = await getSandboxProjectState(projectId);
  const graphJson = state?.files?.["slide_graph.json"];

  if (!graphJson) {
    return <TemplatePicker projectId={projectId} />;
  }

  const parse = slideGraphSchema.safeParse(JSON.parse(graphJson));
  if (!parse.success) {
    return <TemplatePicker projectId={projectId} error="Данные повреждены — выберите шаблон заново." />;
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
