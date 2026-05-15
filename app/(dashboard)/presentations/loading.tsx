import { Loader2 } from "lucide-react";
import { PageTransition } from "@/components/page-transition";

export default function PresentationsLoading() {
  return (
    <PageTransition>
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-border/60 bg-card/20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    </PageTransition>
  );
}
