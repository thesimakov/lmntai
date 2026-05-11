"use client";

import { BuildBoxPanel } from "@/components/playground/build-box-panel";
import { PlaygroundStudioChrome } from "@/components/playground/playground-studio-chrome";
import { PageTransition } from "@/components/page-transition";
import { useI18n } from "@/components/i18n-provider";

export default function PlaygroundBoxPage() {
  const { t } = useI18n();

  return (
    <PageTransition>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
        <PlaygroundStudioChrome
          backHref="/playground"
          backLabel={t("playground_box_back")}
          segmentLabel={
            <span className="block max-w-[min(54vw,14rem)] truncate sm:max-w-md md:max-w-xl">
              {t("build_box_title")}
            </span>
          }
        />
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
          <BuildBoxPanel className="h-full min-h-0 flex-1" />
        </div>
      </div>
    </PageTransition>
  );
}
