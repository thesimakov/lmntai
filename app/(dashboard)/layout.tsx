import { redirect } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { DashboardStarterGate } from "@/components/dashboard/dashboard-starter-gate";
import { getSafeServerSession } from "@/lib/auth";
import { getStarterCabinetWallState } from "@/lib/starter-cabinet-server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSafeServerSession();

  if (!session) {
    redirect("/");
  }

  let wall: Awaited<ReturnType<typeof getStarterCabinetWallState>> = { show: false };
  try {
    wall = await getStarterCabinetWallState(session.user.email, Boolean(session.user.demoOffline));
  } catch (err) {
    console.error("[dashboard-layout] getStarterCabinetWallState failed", err);
  }

  return (
    <div className="flex h-screen w-full min-w-0 overflow-hidden bg-background">
      <Sidebar />
      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden border-l border-border bg-white [scrollbar-gutter:stable]">
        <div className="flex w-full min-w-0 flex-1 flex-col px-8 py-7 overflow-x-hidden">
          <DashboardStarterGate wall={wall}>{children}</DashboardStarterGate>
        </div>
      </main>
    </div>
  );
}
