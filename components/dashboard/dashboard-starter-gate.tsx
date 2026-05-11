"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { StarterCabinetWall } from "@/components/dashboard/starter-cabinet-wall";

/** Страницы, которые должны быть доступны даже при блокировке FREE после триала (оплата / выбор тарифа). */
const STARTER_GATE_BYPASS_PREFIXES = ["/pricing"] as const;

type WallState = {
  show: boolean;
  message?: string | null;
};

type Props = {
  wall: WallState;
  children: ReactNode;
};

export function DashboardStarterGate({ wall, children }: Props) {
  const pathname = usePathname() ?? "";

  const bypassWall =
    !wall.show ||
    STARTER_GATE_BYPASS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (bypassWall) {
    return <>{children}</>;
  }

  return <StarterCabinetWall message={wall.message ?? ""} />;
}
