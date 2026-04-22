"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bot,
  CreditCard,
  FolderKanban,
  Menu,
  Puzzle,
  Settings,
  Users,
  UserCircle2
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/playground", label: "Главная / Playground", icon: Bot },
  { href: "/projects", label: "Мои проекты", icon: FolderKanban },
  { href: "/pricing", label: "Тарифы", icon: CreditCard },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/integrations", label: "Интеграции", icon: Puzzle },
  { href: "/profile", label: "Профиль", icon: UserCircle2 },
  { href: "/team", label: "Команда", icon: Users },
  { href: "/settings", label: "Настройки", icon: Settings }
];

function SidebarBody() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const initials = useMemo(() => {
    const source = session?.user?.name ?? session?.user?.email ?? "Lemnity";
    return source
      .split(" ")
      .map((chunk) => chunk[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  }, [session?.user?.email, session?.user?.name]);

  return (
    <aside className="glass relative z-20 flex h-full w-full flex-col rounded-3xl p-4">
      <div className="mb-6 rounded-2xl border bg-card/70 p-3 shadow-sm">
        <div className="flex items-center justify-center rounded-2xl bg-background/60 px-4 py-3">
          <Image
            src="/logo-w.svg"
            alt="Lemnity"
            width={160}
            height={36}
            priority
            className="invert"
          />
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "pointer-events-auto group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-3">
        <div className="pointer-events-auto rounded-2xl border bg-muted/40 p-3">
          <p className="text-sm font-semibold text-foreground">Перейти на Pro</p>
          <p className="mt-1 text-xs text-muted-foreground">Больше токенов, быстрее генерации, больше песочниц.</p>
          <Button className="mt-3 w-full" onClick={() => (window.location.href = "/pricing")}>
            Открыть тарифы
          </Button>
        </div>
      </div>

      <div className="mt-auto space-y-3 pt-6">
        <div className="flex items-center justify-between rounded-2xl border bg-card/70 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-foreground">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium">{session?.user?.name ?? "Пользователь"}</p>
              <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: `${SITE_URL}/login` })}
          >
            Выйти
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="lg:hidden">
        <Button variant="outline" size="icon" onClick={() => setIsOpen((prev) => !prev)} aria-label="Открыть меню">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="hidden h-[calc(100vh-2rem)] w-80 lg:block">
        <SidebarBody />
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 p-4 lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              className="h-full max-w-xs"
              onClick={(event) => event.stopPropagation()}
            >
              <SidebarBody />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
