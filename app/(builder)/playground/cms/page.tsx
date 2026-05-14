import dynamic from "next/dynamic";

const PlaygroundCmsPageClient = dynamic(() => import("./playground-cms-page-client"), {
  loading: () => (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 bg-[#EBEBEA] px-4 text-sm text-muted-foreground">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden />
      Загрузка CMS…
    </div>
  ),
});

export default function PlaygroundCmsPage() {
  return <PlaygroundCmsPageClient />;
}
