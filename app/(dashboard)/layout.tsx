import { redirect } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { getSafeServerSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSafeServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto flex max-w-[1420px] gap-3">
        <Sidebar />
        <main className="glass flex h-[calc(100vh-2rem)] min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden rounded-3xl border p-4 md:p-6 [scrollbar-gutter:stable]">
          <div className="flex w-full min-w-0 flex-col overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
