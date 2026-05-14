import { Suspense } from "react";
import { AnalyticsEditor } from "@/components/playground/analytics/analytics-editor";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>}>
      <AnalyticsEditor />
    </Suspense>
  );
}
