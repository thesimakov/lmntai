"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BuildBoxPanel } from "@/components/playground/build-box-panel";
import { PageTransition } from "@/components/page-transition";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export default function PlaygroundBoxPage() {
  const { t } = useI18n();

  return (
    <PageTransition>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
        <header className="shrink-0 border-b border-border pb-3">
          <Button type="button" variant="ghost" size="sm" className="h-9 w-fit gap-2 px-2" asChild>
            <Link href="/playground">
              <ArrowLeft className="h-4 w-4" />
              {t("playground_box_back")}
            </Link>
          </Button>
        </header>
        <BuildBoxPanel className="min-h-0 flex-1" />
      </div>
    </PageTransition>
  );
}
