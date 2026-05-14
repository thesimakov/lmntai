"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { BookOpen, ChevronRight, HelpCircle, LogOut, Settings, UserCircle2, Users } from "lucide-react";
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

type AccountMenuRow =
  | {
      type: "link";
      href: string;
      icon: typeof UserCircle2;
      labelKey: MessageKey;
      chevron?: boolean;
      external?: boolean;
    }
  | { type: "logout" };

/** Как нижний блок аккаунта в сайдбаре дашборда — поддержка, доки, сообщество. */
const LOWER_ACCOUNT_ROWS: AccountMenuRow[] = [
  { type: "link", href: "/integrations", icon: HelpCircle, labelKey: "sidebar_popover_support", chevron: true },
  { type: "link", href: "/", icon: BookOpen, labelKey: "sidebar_popover_docs", chevron: true },
  {
    type: "link",
    href: "https://t.me/lemnity",
    icon: Users,
    labelKey: "sidebar_popover_community",
    external: true,
  },
  { type: "logout" },
];

/** Кнопка аватара + выпадающее «окно профиля» для синей студийной полосы. */
export function PlaygroundStudioProfileMenu() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, lang } = useI18n();
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  const numberLocale = lang === "en" ? "en-US" : lang === "tg" ? "tg-TJ" : "ru-RU";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/profile");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { user: { tokenBalance: number } | null };
      if (!cancelled) setTokenBalance(data.user?.tokenBalance ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayInitials = useMemo(() => {
    const source = session?.user?.name ?? session?.user?.email ?? "?";
    return source
      .split(/\s+/)
      .map((chunk) => chunk[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  }, [session?.user?.email, session?.user?.name]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("nav_profile")}
          className="h-7 w-7 shrink-0 rounded-full p-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          {session?.user?.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={session.user.image}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-semibold uppercase leading-none text-white">
              {displayInitials}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" sideOffset={8} className="z-[220] w-72 rounded-xl border p-2 shadow-xl">
        <div className="border-b border-border px-2 pb-2 pt-1">
          <p className="truncate text-sm font-semibold">{session?.user?.name ?? t("user_display_fallback")}</p>
          <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
          <p className="mt-2 text-xs text-muted-foreground">
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
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-2 py-2",
              pathname === "/profile" && "bg-accent/60",
            )}
          >
            <UserCircle2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="flex-1">{t("nav_profile")}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2 py-2",
              pathname === "/settings" || pathname.startsWith("/settings/")
                ? "bg-accent/60"
                : undefined,
            )}
          >
            <Settings className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="flex-1">{t("nav_settings")}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2" />
        {LOWER_ACCOUNT_ROWS.map((row, idx) => {
          if (row.type === "logout") {
            return (
              <div key="logout">
                <DropdownMenuItem
                  className="cursor-pointer gap-2 rounded-lg py-2 text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    void signOut({ callbackUrl: `${SITE_URL}/` });
                  }}
                >
                  <LogOut className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  {t("logout")}
                </DropdownMenuItem>
              </div>
            );
          }
          const Icon = row.icon;
          const active =
            !row.external && (pathname === row.href || pathname.startsWith(`${row.href}/`));
          return (
            <DropdownMenuItem key={`${row.href}-${row.labelKey}`} asChild className="rounded-lg">
              <Link
                href={row.href}
                {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn("flex cursor-pointer items-center gap-2 py-2", active && "bg-accent/60")}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="flex-1 truncate">{t(row.labelKey)}</span>
                {row.chevron ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-70" aria-hidden />
                ) : null}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
