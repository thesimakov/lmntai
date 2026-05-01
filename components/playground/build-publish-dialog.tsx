"use client";

import { ChevronDown, ChevronUp, Copy, ExternalLink, Link as LinkIcon, Lock, Server } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  PUBLISH_BUILTIN_BASE_DOMAIN,
  normalizePublishCustomHost,
  normalizePublishSubdomainLabel,
  suggestPublishSubdomain
} from "@/lib/publish-host";
import { buildBuiltinPublishBrowseUrl, copyTextToClipboard } from "@/lib/preview-share";
import { cn } from "@/lib/utils";
import NextLink from "next/link";

type BuildPublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (detail: { openUrl: string }) => Promise<void> | void;
  publishPending?: boolean;
  sandboxId: string | null;
  seedText?: string;
  hasCustomDomainAccess: boolean;
};

type VerificationInfo = {
  status: "PENDING" | "VERIFIED";
  recordType: "TXT" | null;
  recordName: string | null;
  recordValue: string | null;
  verifiedAt: string | null;
};

function buildNginxCommands(hostname: string, sandboxId: string | null): string {
  void sandboxId;
  const targetPath = "/share";
  return [
    "# 1) Проверьте, что DNS-запись домена указывает на ваш сервер",
    `dig +short ${hostname}`,
    "",
    "# 2) Проксируйте домен на страницу публикации в Nginx",
    `export SITE_HOST="${hostname}"`,
    `export TARGET_PATH="${targetPath}"`,
    "sudo tee /etc/nginx/sites-available/$SITE_HOST >/dev/null <<'EOF'",
    "server {",
    "  listen 80;",
    "  server_name $SITE_HOST;",
    "",
    "  location / {",
    "    proxy_set_header Host $host;",
    "    proxy_set_header X-Forwarded-Proto $scheme;",
    "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "    proxy_pass http://127.0.0.1:3000$TARGET_PATH;",
    "  }",
    "}",
    "EOF",
    "sudo ln -sf /etc/nginx/sites-available/$SITE_HOST /etc/nginx/sites-enabled/$SITE_HOST",
    "sudo nginx -t && sudo systemctl reload nginx",
    "",
    "# 3) Выпустите SSL-сертификат",
    "sudo certbot --nginx -d $SITE_HOST",
    "",
    "# 4) Проверка",
    `curl -I https://${hostname}`
  ].join("\n");
}

export function BuildPublishDialog({
  open,
  onOpenChange,
  onPublish,
  publishPending = false,
  sandboxId,
  seedText,
  hasCustomDomainAccess
}: BuildPublishDialogProps) {
  const [subdomain, setSubdomain] = useState("");
  /** Активный вариант при нажатии «Опубликовать»: поддомен *.lemnity.com или свой домен. */
  const [publishHostMode, setPublishHostMode] = useState<"subdomain" | "custom">("subdomain");
  const [ownServerProxyOpen, setOwnServerProxyOpen] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [bindingPending, setBindingPending] = useState(false);
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo | null>(null);

  const fetchPublishApi = useCallback(
    async (init?: RequestInit): Promise<Response> => {
      let res = await fetch("/api/sandbox/publish-domain", {
        credentials: "include",
        ...init
      });
      if (res.status === 404 && sandboxId) {
        res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/publish-domain`, {
          credentials: "include",
          ...init
        });
      }
      return res;
    },
    [sandboxId]
  );

  useEffect(() => {
    if (!open) return;
    const suggested = suggestPublishSubdomain(seedText, sandboxId);
    setSubdomain(suggested);
    setCustomDomain("");
    setVerificationInfo(null);
    setPublishHostMode("subdomain");

    if (!sandboxId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchPublishApi();
        if (!res.ok) return;
        const body = (await res.json().catch(() => null)) as
          | {
              domains?: Array<{
                host?: string | null;
                verification?: VerificationInfo | null;
              }>;
            }
          | null;
        const host = body?.domains?.[0]?.host?.trim().toLowerCase() ?? "";
        if (!host || cancelled) return;
        const suffix = `.${PUBLISH_BUILTIN_BASE_DOMAIN.toLowerCase()}`;
        if (host.endsWith(suffix)) {
          const label = host.slice(0, -suffix.length);
          if (label) setSubdomain(label);
          setPublishHostMode("subdomain");
        } else {
          setCustomDomain(host);
          setPublishHostMode("custom");
        }
        if (body?.domains?.[0]?.verification) {
          setVerificationInfo(body.domains[0].verification);
        }
      } catch {
        /* keep local suggestion fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, seedText, sandboxId, fetchPublishApi]);

  const cleanSubdomain = useMemo(() => {
    const normalized = normalizePublishSubdomainLabel(subdomain);
    return normalized || suggestPublishSubdomain(seedText, sandboxId);
  }, [subdomain, seedText, sandboxId]);

  const defaultHost = `${cleanSubdomain}.${PUBLISH_BUILTIN_BASE_DOMAIN}`;
  const manualHost = normalizePublishCustomHost(customDomain);
  const publishHost =
    publishHostMode === "custom" && hasCustomDomainAccess && manualHost ? manualHost : defaultHost;

  const customPublishBlocked =
    publishHostMode === "custom" && (!hasCustomDomainAccess || !normalizePublishCustomHost(customDomain.trim()));
  const nginxCommands = useMemo(() => buildNginxCommands(publishHost, sandboxId), [publishHost, sandboxId]);

  const resolveBuiltinSubdomainBrowseUrl = useCallback((): string => {
    const host = defaultHost;
    if (typeof window === "undefined") {
      return `https://${host}`;
    }
    return buildBuiltinPublishBrowseUrl(window.location.origin, sandboxId, host);
  }, [defaultHost, sandboxId]);

  const resolvePublishBrowseUrl = useCallback((): string => {
    if (publishHostMode === "custom" && hasCustomDomainAccess && manualHost) {
      return `https://${manualHost}`;
    }
    if (typeof window === "undefined") {
      return `https://${publishHost}`;
    }
    return buildBuiltinPublishBrowseUrl(window.location.origin, sandboxId, publishHost);
  }, [publishHostMode, hasCustomDomainAccess, manualHost, publishHost, sandboxId]);

  async function copyValue(value: string, successText: string) {
    const ok = await copyTextToClipboard(value);
    if (ok) {
      toast.success(successText);
    } else {
      toast.error("Не удалось скопировать");
    }
  }

  async function bindPublishHostBeforeOpen(): Promise<{ ok: boolean; verified: boolean }> {
    if (!sandboxId) return { ok: true, verified: true };
    try {
      setBindingPending(true);
      const res = await fetchPublishApi({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: publishHost })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const code = body.error;
        if (code === "forbidden_plan") {
          toast.error("Свой домен доступен на тарифах Pro/Team.");
        } else if (code === "forbidden_owner") {
          toast.error("Этот домен уже привязан к другому проекту.");
        } else if (code === "reserved_host") {
          toast.error("Этот хост зарезервирован системой.");
        } else {
          toast.error("Не удалось привязать домен.");
        }
        return { ok: false, verified: false };
      }
      const data = (await res.json().catch(() => null)) as
        | { verification?: VerificationInfo | null }
        | null;
      const verification = data?.verification ?? null;
      setVerificationInfo(verification);
      if (verification?.status === "PENDING") {
        if (verification.recordValue?.trim()) {
          const copied = await copyTextToClipboard(verification.recordValue.trim());
          if (copied) {
            toast.success("Строка для TXT уже в буфере обмена", {
              description:
                "Вставьте её в поле Value у регистратора DNS. Имя записи (Host / Name) — в поле блоком выше, рядом кнопка копирования.",
              duration: 12_000
            });
          } else {
            toast.message("Скопируйте значение TXT вручную — поля ниже", {
              duration: 10_000
            });
          }
        }
        return { ok: true, verified: false };
      }
      return { ok: true, verified: true };
    } catch {
      toast.error("Ошибка сети при привязке домена");
      return { ok: false, verified: false };
    } finally {
      setBindingPending(false);
    }
  }

  async function verifyDomainNow() {
    if (!sandboxId) return;
    try {
      setBindingPending(true);
      const res = await fetchPublishApi({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: publishHost })
      });
      const data = (await res.json().catch(() => null)) as
        | { verified?: boolean; verification?: VerificationInfo; error?: string }
        | null;
      if (!res.ok) {
        toast.error("Не удалось проверить домен");
        return;
      }
      if (data?.verification) {
        setVerificationInfo(data.verification);
      }
      if (data?.verified) {
        toast.success("Домен подтверждён");
      } else {
        toast.message("TXT-запись пока не найдена. Подождите 1-5 минут и проверьте снова.");
      }
    } catch {
      toast.error("Ошибка сети при проверке домена");
    } finally {
      setBindingPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,700px)] w-full max-w-lg flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 gap-1 border-b border-border/80 px-5 py-4 text-left">
          <DialogTitle className="text-xl font-semibold leading-tight sm:text-2xl">Публикация</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Выберите вариант адреса — при публикации используется только он. Свой VPS / Nginx — ниже при необходимости.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-0 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-gutter:stable]">
          {/* Выбор типа адреса (влияет только на активный publishHost при «Опубликовать»). */}
          <section className="space-y-3 pb-5" role="radiogroup" aria-label="Способ адреса публикации">
            <p className="text-base font-medium leading-tight">Адрес сайта</p>

            <div
              role="presentation"
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                publishHostMode === "subdomain"
                  ? "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/25"
                  : "border-border/80 hover:bg-muted/35"
              )}
              onClick={() => setPublishHostMode("subdomain")}
            >
              <input
                type="radio"
                name="publish-host-mode"
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
                checked={publishHostMode === "subdomain"}
                onChange={() => setPublishHostMode("subdomain")}
              />
              <div className="min-w-0 flex-1 space-y-2.5">
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    Поддомен на <span className="text-primary">.{PUBLISH_BUILTIN_BASE_DOMAIN}</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    Стандартный адрес без своего DNS и сертификата.
                  </p>
                </div>
                <div className="flex items-stretch gap-2">
                  <div className="flex min-h-11 min-w-0 flex-1 items-center rounded-lg border border-border bg-muted/30 px-3">
                    <span className="shrink-0 text-sm text-muted-foreground">https://</span>
                    <Input
                      value={cleanSubdomain}
                      onChange={(e) => setSubdomain(e.target.value)}
                      onFocus={() => setPublishHostMode("subdomain")}
                      className="h-10 min-w-0 flex-1 border-0 bg-transparent px-1 text-base font-semibold shadow-none focus-visible:ring-0"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      aria-label="Поддомен"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="shrink-0 truncate text-sm text-muted-foreground">
                      .{PUBLISH_BUILTIN_BASE_DOMAIN}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyValue(resolveBuiltinSubdomainBrowseUrl(), "Адрес поддомена скопирован");
                    }}
                    aria-label="Скопировать адрес поддомена"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div
              role="presentation"
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                publishHostMode === "custom"
                  ? "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/25"
                  : "border-border/80 hover:bg-muted/35"
              )}
              onClick={() => setPublishHostMode("custom")}
            >
              <input
                type="radio"
                name="publish-host-mode"
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
                checked={publishHostMode === "custom"}
                onChange={() => setPublishHostMode("custom")}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm font-semibold leading-tight">Свой домен</p>
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground opacity-70" aria-hidden />
                </div>

                {!hasCustomDomainAccess ? (
                  <div
                    className="rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2.5 dark:border-amber-500/25 dark:bg-amber-500/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-sm font-medium text-amber-950 dark:text-amber-100">Только Pro / Team</p>
                    <p className="mt-1 text-xs leading-snug text-amber-900/85 dark:text-amber-200/90">
                      Свой домен недоступен на бесплатном тарифе — выберите поддомен выше или оформите тариф.
                    </p>
                    <NextLink
                      href="/pricing"
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "mt-2 inline-flex h-9 bg-amber-600 text-white hover:bg-amber-500"
                      )}
                    >
                      Тарифы
                    </NextLink>
                  </div>
                ) : (
                  <div
                    className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Pro/Team: укажите хост (например{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-[11px]">app.example.com</code>). Ниже — Nginx под
                      этот хост.
                    </p>
                    <Input
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      onFocus={() => setPublishHostMode("custom")}
                      placeholder="app.your-company.com"
                      className="mt-2 h-10 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="border-t border-border/60" />

          {/* Свой VPS + Nginx — для большинства пользователей не нужно */}
          <section className="py-3 pb-2">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-2 rounded-lg py-2 pr-1 text-left transition-colors hover:bg-muted/40"
              onClick={() => setOwnServerProxyOpen((v) => !v)}
            >
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 text-base font-medium">
                  <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
                  Свой сервер (Nginx)
                </span>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Не нужно для адреса на <span className="whitespace-nowrap">.{PUBLISH_BUILTIN_BASE_DOMAIN}</span> — только
                  если проксируете домен на свой VPS.
                </p>
              </div>
              {ownServerProxyOpen ? (
                <ChevronUp className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
            </button>

            {ownServerProxyOpen ? (
              <div className="mt-3 space-y-2 border-l-2 border-border/80 pl-3.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Пример конфигурации</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{publishHost}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 gap-1.5 text-sm"
                    onClick={() => void copyValue(nginxCommands, "Команды скопированы")}
                  >
                    <Copy className="h-4 w-4" />
                    Копировать
                  </Button>
                </div>
                <pre
                  className={cn(
                    "max-h-[min(28vh,220px)] overflow-auto rounded-lg border border-border/80 bg-muted/25 p-3",
                    "text-xs leading-relaxed text-foreground"
                  )}
                >
                  {nginxCommands}
                </pre>
              </div>
            ) : null}
          </section>

          {verificationInfo?.status === "PENDING" && verificationInfo.recordName && verificationInfo.recordValue ? (
            <>
              <div className="border-t border-border/60" />
              <section className="space-y-2.5 pt-4">
                <p className="text-sm font-semibold">TXT для подтверждения домена</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Добавьте запись в DNS, подождите распространение, затем «Проверить домен». После успешной привязки домена
                  строку для поля Value мы копируем в буфер автоматически; при необходимости поля ниже можно выделить
                  и скопировать вручную.
                </p>
                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Type:</span> <span className="font-medium">TXT</span>
                  </p>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Имя записи (Name / Host)</p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={verificationInfo.recordName}
                        className="h-10 min-h-0 font-mono text-xs"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 shrink-0"
                        aria-label="Скопировать имя записи"
                        onClick={() => void copyValue(verificationInfo.recordName!, "Имя записи скопировано")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Значение (Value)</p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={verificationInfo.recordValue}
                        className="h-10 min-h-0 font-mono text-xs"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 shrink-0"
                        aria-label="Скопировать значение TXT"
                        onClick={() => void copyValue(verificationInfo.recordValue!, "Значение TXT скопировано")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" className="h-9 text-sm" onClick={() => void verifyDomainNow()} disabled={bindingPending}>
                    Проверить домен
                  </Button>
                </div>
              </section>
            </>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border/80 px-5 py-4 sm:flex-row sm:justify-between sm:gap-3">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            className="w-full gap-2 sm:w-auto"
            disabled={publishPending || bindingPending || customPublishBlocked}
            onClick={async () => {
              if (customPublishBlocked && publishHostMode === "custom") {
                toast.error(hasCustomDomainAccess ? "Укажите свой домен" : "Свой домен доступен на тарифах Pro/Team.");
                return;
              }
              const result = await bindPublishHostBeforeOpen();
              const openUrl = resolvePublishBrowseUrl();
              if (!result.ok) return;
              if (!result.verified) return;
              await onPublish({ openUrl });
            }}
          >
            <ExternalLink className="h-4 w-4" />
            {publishPending || bindingPending ? "Публикация…" : "Опубликовать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
