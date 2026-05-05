import { redirect } from "next/navigation";

import { StarterCabinetWall } from "@/components/dashboard/starter-cabinet-wall";
import { getSafeServerSession } from "@/lib/auth";
import { getStarterCabinetWallState } from "@/lib/starter-cabinet-server";

export default async function BuilderLayout({ children }: { children: React.ReactNode }) {
  const session = await getSafeServerSession();
  if (!session) {
    redirect("/");
  }

  let wall: Awaited<ReturnType<typeof getStarterCabinetWallState>> = { show: false };
  try {
    wall = await getStarterCabinetWallState(session.user.email, Boolean(session.user.demoOffline));
  } catch (err) {
    console.error("[builder-layout] getStarterCabinetWallState failed", err);
  }

  return (
    <div className="box-border h-[100dvh] min-h-0 w-full min-w-0 overflow-x-hidden p-0">
      <main className="glass box-border flex h-full min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden rounded-none border p-0">
        <div className="flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">
          {wall.show ? (
            <div className="box-border flex h-full items-stretch justify-center overflow-y-auto p-4 md:p-6">
              <StarterCabinetWall message={wall.message ?? ""} />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

