import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireDbUser } from "@/lib/auth-guards";
import { requireProjectScopeForOwner } from "@/lib/project-context";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { slideGraphSchema } from "@/lib/slide-graph/schema";
import { SlideVisualEditor } from "@/components/playground/slides/slide-visual-editor";

interface Props {
  searchParams: Promise<{ projectId?: string }>;
}

async function SlidesEditorLoader({ projectId }: { projectId: string }) {
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
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <p className="text-lg font-medium">Презентация не создана</p>
        <p className="text-sm text-muted-foreground">
          Вернитесь в AI Chat и попросите сгенерировать презентацию.
        </p>
      </div>
    );
  }

  const parse = slideGraphSchema.safeParse(JSON.parse(graphJson));
  if (!parse.success) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-destructive">Данные презентации повреждены. Попросите AI сгенерировать заново.</p>
      </div>
    );
  }

  return <SlideVisualEditor projectId={projectId} initialGraph={parse.data} />;
}

export default async function SlidesPage({ searchParams }: Props) {
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
        <SlidesEditorLoader projectId={projectId} />
      </Suspense>
    </div>
  );
}
