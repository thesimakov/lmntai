import { PageTransitionBuildLoader } from "@/components/playground/page-transition-build-loader";

export default function PlaygroundBoxEditorLoading() {
  return (
    <div className="flex min-h-[min(100dvh,640px)] w-full flex-1 flex-col items-center justify-center gap-5 bg-background px-4 py-8">
      <span className="text-sm font-medium text-muted-foreground">Загрузка редактора…</span>
      <div className="relative h-[min(68vh,520px)] w-full max-w-5xl overflow-hidden rounded-2xl border border-border/30 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <PageTransitionBuildLoader className="h-full min-h-[min(56vh,440px)] w-full" />
      </div>
    </div>
  );
}
