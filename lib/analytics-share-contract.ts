export type AnalyticsRole = "viewer" | "investor" | "analyst";

export const ANALYTICS_ROLES: Record<AnalyticsRole, { label: string; description: string }> = {
  viewer: { label: "Viewer", description: "KPIs and charts" },
  investor: { label: "Investor", description: "KPIs, charts, investor deck" },
  analyst: { label: "Analyst", description: "Full access including forecast, agents, benchmarks" },
};

export function isAnalyticsRole(r: string): r is AnalyticsRole {
  return r === "viewer" || r === "investor" || r === "analyst";
}
