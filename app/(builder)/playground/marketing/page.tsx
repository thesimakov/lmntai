import { Suspense } from "react";
import { MarketingEditor } from "@/components/playground/marketing/marketing-editor";

export default function MarketingPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>}>
      <MarketingEditor />
    </Suspense>
  );
}
