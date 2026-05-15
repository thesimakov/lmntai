import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden border-l border-border bg-white">
        {children}
      </div>
    </div>
  );
}
