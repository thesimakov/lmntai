import { notFound } from "next/navigation";
import { getAnalyticsShareByToken, isShareExpired, ANALYTICS_ROLES } from "@/lib/analytics-share-db";
import { getSandboxProjectState } from "@/lib/sandbox-project-state-db";
import { analysisDashboardSchema } from "@/lib/analytics-schema";
import { AnalyticsDashboard } from "@/components/playground/analytics/analytics-dashboard";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedAnalyticsPage({ params }: Props) {
  const { token } = await params;

  const share = await getAnalyticsShareByToken(token);
  if (!share || isShareExpired(share)) notFound();

  const state = await getSandboxProjectState(share.projectId);
  const analysisJson = state?.files?.["analysis.json"];
  if (!analysisJson) notFound();

  const parse = analysisDashboardSchema.safeParse(JSON.parse(analysisJson));
  if (!parse.success) notFound();

  const dashboard = parse.data;
  const roleInfo = ANALYTICS_ROLES[share.role as keyof typeof ANALYTICS_ROLES] ?? ANALYTICS_ROLES.viewer;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 h-11 border-b border-border bg-white">
        <span className="text-sm font-medium text-foreground truncate">
          {dashboard.meta.companyName || "Analytics Dashboard"}
        </span>
        {dashboard.meta.period && (
          <span className="text-xs text-muted-foreground">{dashboard.meta.period}</span>
        )}
        <div className="flex-1" />
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          {roleInfo.label} · {share.label ?? "Shared view"}
        </span>
      </header>

      <AnalyticsDashboard dashboard={dashboard} />
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  const share = await getAnalyticsShareByToken(token).catch(() => null);
  if (!share || isShareExpired(share)) return { title: "Not found" };
  const state = await getSandboxProjectState(share.projectId).catch(() => null);
  const analysisJson = state?.files?.["analysis.json"];
  let company = "Analytics";
  if (analysisJson) {
    try {
      const d = JSON.parse(analysisJson) as { meta?: { companyName?: string } };
      company = d?.meta?.companyName ?? company;
    } catch { /* ignore */ }
  }
  return { title: `${company} — Analytics Dashboard` };
}
