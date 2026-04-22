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
      <div className="mx-auto flex max-w-[1600px] gap-4">
        <Sidebar />
        <main className="glass flex h-[calc(100vh-2rem)] min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
