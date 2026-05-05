import dynamic from "next/dynamic";

const PlaygroundCmsPageClient = dynamic(() => import("./playground-cms-page-client"), {
  loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Загрузка CMS…
    </div>
  ),
});

export default function PlaygroundCmsPage() {
  return <PlaygroundCmsPageClient />;
}
