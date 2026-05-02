import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";

export default async function BuilderLayout({ children }: { children: React.ReactNode }) {
  const session = await getSafeServerSession();
  if (!session) redirect("/login");

  return (
    <div className="box-border min-h-screen w-full min-w-0 overflow-x-hidden p-2">
      <main className="glass box-border flex h-[calc(100vh-1rem)] min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden rounded-3xl border p-2">
        <div className="flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}

