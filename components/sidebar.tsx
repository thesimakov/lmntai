"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart2,
  BarChart3,
  BookOpen,
  Bot,
  TrendingUp,
  Presentation,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LogOut,
  Menu,
  Puzzle,
  Settings,
  Users,
  UserCircle2,
  Shield
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SITE_URL } from "@/lib/site";
import { normalizePlanId, type PlanId } from "@/lib/plan-config";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n";

const navItems: { href: string; labelKey: MessageKey; icon: typeof Bot; fullNav?: boolean; activePath?: string }[] = [
  { href: "/playground", labelKey: "nav_playground", icon: Bot },
  { href: "/pricing", labelKey: "nav_pricing", icon: CreditCard },
  { href: "/analytics", labelKey: "nav_analytics", icon: BarChart3 },
  { href: "/api/analytics/new", labelKey: "nav_analytics_bi", icon: BarChart2, fullNav: true, activePath: "/playground/analytics" },
  { href: "/api/marketing/new", labelKey: "nav_marketing_bi", icon: TrendingUp, fullNav: true, activePath: "/playground/marketing" },
  { href: "/presentations", labelKey: "nav_presentation", icon: Presentation, fullNav: true, activePath: "/presentations" },
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
      /** Внешняя ссылка (например Telegram) — открывается в новой вкладке */
      external?: boolean;
    }
  | {
      type: "logout";
    };

const ACCOUNT_MENU_ROWS: AccountMenuRow[] = [
  { type: "link", href: "/integrations", icon: HelpCircle, labelKey: "sidebar_popover_support", chevron: true },
  { type: "link", href: "/", icon: BookOpen, labelKey: "sidebar_popover_docs", chevron: true },
  {
    type: "link",
    href: "https://t.me/lemnity",
    icon: Users,
    labelKey: "sidebar_popover_community",
    external: true
  },
  { type: "logout" }
];

function activePlanLabelKey(plan: PlanId): MessageKey {
  switch (plan) {
    case "PRO":
      return "pricing_plan_pro_name";
    case "TEAM":
      return "pricing_plan_team_name";
    default:
      return "pricing_plan_starter_name";
  }
}

const navLinkClass = (isActive: boolean) =>
  cn(
    "group flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[15px] leading-snug transition-colors",
    isActive
      ? "bg-zinc-100 font-semibold text-black"
      : "text-black hover:bg-zinc-100"
  );

const navIconClass = (isActive: boolean) =>
  cn(
    "h-[18px] w-[18px] shrink-0",
    isActive ? "text-black" : "text-zinc-700 group-hover:text-black"
  );

function SidebarBody({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, lang } = useI18n();
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  const activePlan = useMemo(() => normalizePlanId(session?.user?.plan), [session?.user?.plan]);

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
    <aside
      className={cn(
        "relative z-20 flex h-full min-h-0 w-full flex-col bg-white p-0 outline-none",
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <Image
          src="/logo-w.svg"
          alt="Lemnity"
          width={110}
          height={26}
          priority
          className="invert"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const hrefWithLang =
              item.fullNav && item.href.startsWith("/api/")
                ? `${item.href}?lang=${encodeURIComponent(lang)}`
                : item.href;
            const isActive =
              (item.activePath && pathname.startsWith(item.activePath)) ||
              (!item.fullNav && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
            const itemClass = navLinkClass(isActive);
            const itemContent = (
              <>
                <Icon className={navIconClass(isActive)} />
                <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                {item.href === "/pricing" ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-auto shrink-0 truncate px-1.5 py-0 text-[11px] font-medium",
                      isActive ? "bg-zinc-200 text-black" : "text-zinc-700"
                    )}
                    title={t(activePlanLabelKey(activePlan))}
                  >
                    {t(activePlanLabelKey(activePlan))}
                  </Badge>
                ) : null}
              </>
            );
            return item.fullNav ? (
              <a key={item.href} href={hrefWithLang} className={itemClass}>
                {itemContent}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={itemClass}>
                {itemContent}
              </Link>
            );
          })}
          {session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER" ? (
            <Link
              href="/admin/users"
              className={navLinkClass(pathname === "/admin" || pathname.startsWith("/admin/"))}
            >
              <Shield
                className={navIconClass(pathname === "/admin" || pathname.startsWith("/admin/"))}
              />
              <span>{t("nav_admin")}</span>
            </Link>
          ) : null}
        </div>

        {/* Upgrade nudge */}
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-[15px] font-semibold text-black">{t("profile_upgrade_to_pro")}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-zinc-800">{t("sidebar_pro_desc")}</p>
          <Button size="sm" className="mt-2.5 h-8 w-full text-sm" onClick={() => (window.location.href = "/pricing")}>
            {t("sidebar_open_pricing")}
          </Button>
        </div>
      </nav>

      {/* Account */}
      <div className="shrink-0 border-t border-border p-2">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[11px] font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium leading-tight text-black">
                  {session?.user?.name ?? t("user_display_fallback")}
                </p>
                <p className="truncate text-[13px] text-zinc-800">
                  {tokenBalance === null ? (
                    <>{t("playground_home_tokens")} {t("playground_home_tokens_none")}</>
                  ) : (
                    <><span className="font-medium text-black">{tokenBalance.toLocaleString(numberLocale)}</span>{" "}{t("playground_home_tokens_suffix")}</>
                  )}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="z-[200] w-60 border bg-popover p-1.5 shadow-lg"
          >
            {ACCOUNT_MENU_ROWS.map((row, idx) => {
              if (row.type === "logout") {
                return (
                  <div key={`logout-${idx}`}>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 rounded-md py-2 text-[15px] text-destructive focus:text-destructive"
                      onSelect={(e) => {
                        e.preventDefault();
                        void signOut({ callbackUrl: `${SITE_URL}/` });
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5 shrink-0" />
                      {t("logout")}
                    </DropdownMenuItem>
                  </div>
                );
              }
              const Icon = row.icon;
              const active =
                !row.external && (pathname === row.href || pathname.startsWith(`${row.href}/`));
              return (
                <DropdownMenuItem key={`${row.href}-${row.labelKey}`} asChild>
                  <Link
                    href={row.href}
                    {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md py-2 text-[15px] text-black",
                      active && "bg-zinc-100 font-semibold"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-zinc-700" />
                    <span className="flex-1 truncate">{t(row.labelKey)}</span>
                    {row.chevron ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
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

      <div className="hidden h-full w-[220px] shrink-0 lg:block">
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
              className="flex h-full max-w-[220px] overflow-hidden shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <SidebarBody className="overflow-y-auto border-r border-border bg-white" />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
