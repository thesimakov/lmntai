"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Settings, Users, Wrench, Shield, LayoutDashboard, Sparkles, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ADMIN_SECTION_RULES, canAccessAdminSection } from "@/lib/admin-rules";
import type { StaffPermission } from "@/lib/staff-permissions";
import { cn } from "@/lib/utils";

const ITEM_ICONS = {
  users: Users,
  tariffs: Wrench,
  promocodes: Tag,
  team: Shield,
  settings: Settings
} as const;

type Props = {
  role: "ADMIN" | "MANAGER";
  permissionKeys: StaffPermission[];
  email: string;
  children: React.ReactNode;
};

export function AdminShell({ role, permissionKeys, email, children }: Props) {
  const pathname = usePathname();
  const nav = ADMIN_SECTION_RULES.filter((r) => canAccessAdminSection(role, permissionKeys, r));

  return (
    <div className="min-h-screen bg-muted/50 p-4 text-foreground">
      <div className="mx-auto flex max-w-6xl gap-4">
        <aside className="w-64 shrink-0 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Администрирование</p>
              <p className="truncate text-sm font-medium">Lemnity</p>
            </div>
          </div>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <nav className="space-y-1">
            {nav.map(({ id, href, label }) => {
              const Icon = ITEM_ICONS[id];
              const active = pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border pt-3">
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <Link href="/playground">
                <Sparkles className="mr-2 h-4 w-4" />
                В песочницу
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
