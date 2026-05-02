import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";

export default async function BuilderLayout({ children }: { children: React.ReactNode }) {
  const session = await getSafeServerSession();
  if (!session) redirect("/login");

  return (
    <div className="box-border h-[100dvh] min-h-0 w-full min-w-0 overflow-x-hidden p-0">
      <main className="glass box-border flex h-full min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden rounded-none border p-0">
        <div className="flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}

