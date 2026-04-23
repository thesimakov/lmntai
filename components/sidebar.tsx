"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronRight,
  CreditCard,
  FolderKanban,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  Puzzle,
  Settings,
  SunMoon,
  Users,
  UserCircle2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n";

const navItems: { href: string; labelKey: MessageKey; icon: typeof Bot }[] = [
  { href: "/playground", labelKey: "nav_playground", icon: Bot },
  { href: "/projects", labelKey: "nav_projects", icon: FolderKanban },
  { href: "/pricing", labelKey: "nav_pricing", icon: CreditCard },
  { href: "/analytics", labelKey: "nav_analytics", icon: BarChart3 },
  { href: "/integrations", labelKey: "nav_integrations", icon: Puzzle },
  { href: "/profile", labelKey: "nav_profile", icon: UserCircle2 },
  { href: "/team", labelKey: "nav_team", icon: Users },
  { href: "/settings", labelKey: "nav_settings", icon: Settings }
];

type AccountMenuRow =
  | {
      type: "link";
      href: string;
      icon: typeof UserCircle2;
      labelKey: MessageKey;
      chevron?: boolean;
    }
  | {
      type: "logout";
    };

const ACCOUNT_MENU_ROWS: AccountMenuRow[] = [
  { type: "link", href: "/profile", icon: UserCircle2, labelKey: "nav_profile" },
  { type: "link", href: "/settings", icon: Settings, labelKey: "settings_title" },
  { type: "link", href: "/settings", icon: SunMoon, labelKey: "sidebar_popover_appearance", chevron: true },
  { type: "link", href: "/integrations", icon: HelpCircle, labelKey: "sidebar_popover_support", chevron: true },
  { type: "link", href: "/", icon: BookOpen, labelKey: "sidebar_popover_docs", chevron: true },
  { type: "link", href: "/team", icon: Users, labelKey: "sidebar_popover_community" },
  { type: "link", href: "/playground", icon: Home, labelKey: "sidebar_popover_home" },
  { type: "logout" }
];

function SidebarBody() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, lang } = useI18n();
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  const numberLocale = lang === "en" ? "en-US" : lang === "tg" ? "tg-TJ" : "ru-RU";

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = (await res.json()) as { user: { tokenBalance: number } | null };
      setTokenBalance(data.user?.tokenBalance ?? null);
    })();
  }, []);

  const initials = useMemo(() => {
    const source = session?.user?.name ?? session?.user?.email ?? "Lemnity";
    return source
      .split(" ")
      .map((chunk) => chunk[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  }, [session?.user?.email, session?.user?.name]);

  return (
    <aside className="relative z-20 flex h-full w-full flex-col border-0 bg-transparent p-0 shadow-none outline-none">
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
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-3">
        <div className="pointer-events-auto rounded-2xl border bg-muted/40 p-3">
          <p className="text-sm font-semibold text-foreground">{t("profile_upgrade_to_pro")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("sidebar_pro_desc")}</p>
          <Button className="mt-3 w-full" onClick={() => (window.location.href = "/pricing")}>
            {t("sidebar_open_pricing")}
          </Button>
        </div>
      </div>

      <div className="mt-auto space-y-3 pt-6">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-start gap-2 rounded-2xl border bg-card/70 p-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {session?.user?.name ?? t("user_display_fallback")}
                </p>
                <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {tokenBalance === null ? (
                    <>
                      {t("playground_home_tokens")} {t("playground_home_tokens_none")}
                    </>
                  ) : (
                    <>
                      {t("playground_home_tokens")}{" "}
                      <span className="font-semibold text-foreground">
                        {tokenBalance.toLocaleString(numberLocale)}
                      </span>{" "}
                      {t("playground_home_tokens_suffix")}
                    </>
                  )}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={10}
            className="z-[200] w-64 rounded-2xl border bg-popover p-2 shadow-xl"
          >
            <div className="px-2 pb-2 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white">
                  {initials}
                </div>
                <p className="min-w-0 truncate text-sm font-medium text-foreground">
                  {session?.user?.email ?? "—"}
                </p>
              </div>
              <p className="mt-2 pl-[42px] text-xs text-muted-foreground">
                {tokenBalance === null ? (
                  <>
                    {t("playground_home_tokens")} {t("playground_home_tokens_none")}
                  </>
                ) : (
                  <>
                    {t("playground_home_tokens")}{" "}
                    <span className="font-medium text-foreground">
                      {tokenBalance.toLocaleString(numberLocale)}
                    </span>{" "}
                    {t("playground_home_tokens_suffix")}
                  </>
                )}
              </p>
            </div>
            <DropdownMenuSeparator className="my-1 bg-border/80" />
            {ACCOUNT_MENU_ROWS.map((row, idx) => {
              if (row.type === "logout") {
                return (
                  <div key={`logout-${idx}`}>
                    <DropdownMenuSeparator className="my-1 bg-border/80" />
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 rounded-xl py-2 text-destructive focus:text-destructive"
                      onSelect={(e) => {
                        e.preventDefault();
                        void signOut({ callbackUrl: `${SITE_URL}/` });
                      }}
                    >
                      <LogOut className="h-4 w-4 shrink-0 opacity-90" />
                      {t("logout")}
                    </DropdownMenuItem>
                  </div>
                );
              }
              const Icon = row.icon;
              const active = pathname === row.href || pathname.startsWith(`${row.href}/`);
              return (
                <DropdownMenuItem key={`${row.href}-${row.labelKey}`} asChild>
                  <Link
                    href={row.href}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl py-2",
                      active && "bg-accent/60"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="flex-1 truncate">{t(row.labelKey)}</span>
                    {row.chevron ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-70" />
                    ) : null}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <div className="lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={t("sidebar_aria_open_menu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="hidden h-[calc(100vh-2rem)] w-[17.5rem] shrink-0 lg:block">
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
