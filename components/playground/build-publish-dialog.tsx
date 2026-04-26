"use client";

import { ChevronDown, ChevronUp, Copy, ExternalLink, Link as LinkIcon, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { copyTextToClipboard } from "@/lib/preview-share";
import { cn } from "@/lib/utils";

type BuildPublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: () => Promise<void> | void;
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
  const targetPath = sandboxId ? `/share/${encodeURIComponent(sandboxId)}` : "/share/<sandbox-id>";
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
  const [customDomainOpen, setCustomDomainOpen] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [bindingPending, setBindingPending] = useState(false);
  const [verificationInfo, setVerificationInfo] = useState<VerificationInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubdomain((prev) => prev || suggestPublishSubdomain(seedText, sandboxId));
    setVerificationInfo(null);
  }, [open, seedText, sandboxId]);

  const cleanSubdomain = useMemo(() => {
    const normalized = normalizePublishSubdomainLabel(subdomain);
    return normalized || suggestPublishSubdomain(seedText, sandboxId);
  }, [subdomain, seedText, sandboxId]);

  const defaultHost = `${cleanSubdomain}.${PUBLISH_BUILTIN_BASE_DOMAIN}`;
  const manualHost = normalizePublishCustomHost(customDomain);
  const publishHost =
    hasCustomDomainAccess && customDomainOpen && manualHost ? manualHost : defaultHost;
  const nginxCommands = useMemo(() => buildNginxCommands(publishHost, sandboxId), [publishHost, sandboxId]);

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
      const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/publish-domain`, {
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
        toast.message("Добавьте TXT-запись и нажмите «Проверить домен»");
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
      const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/publish-domain`, {
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
      <DialogContent className="max-w-xl rounded-3xl p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogHeader className="gap-1 border-b px-6 py-5 text-left">
          <DialogTitle className="text-3xl font-semibold">Публикация</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Настройте адрес, опубликуйте превью и используйте команды для подключения домена.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <section className="space-y-2">
            <p className="text-sm font-semibold">Адрес сайта</p>
            <p className="text-sm text-muted-foreground">Введите поддомен для публикации.</p>
            <div className="flex items-center gap-2 rounded-2xl border bg-muted/20 p-2">
              <div className="flex min-h-12 flex-1 items-center rounded-xl border bg-background px-3">
                <span className="shrink-0 text-xl text-muted-foreground">https://</span>
                <Input
                  value={cleanSubdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  className="h-auto border-0 bg-transparent px-1 py-0 text-3xl font-medium shadow-none focus-visible:ring-0"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <span className="shrink-0 text-3xl text-muted-foreground">.{PUBLISH_BUILTIN_BASE_DOMAIN}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-12 rounded-xl p-0"
                onClick={() => void copyValue(`https://${defaultHost}`, "Адрес публикации скопирован")}
                aria-label="Скопировать адрес"
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>
          </section>

          <section className="space-y-2 border-t pt-4">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left"
              onClick={() => setCustomDomainOpen((v) => !v)}
            >
              <span className="inline-flex items-center gap-2 text-2xl font-semibold">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
                Свой домен
                <Lock className="h-5 w-5 text-muted-foreground" />
              </span>
              {customDomainOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>

            {customDomainOpen ? (
              hasCustomDomainAccess ? (
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium">Домен Pro/Team</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Укажите свой домен (например, `app.your-company.com`). Сейчас настройка выполняется вручную командами ниже.
                  </p>
                  <Input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="app.your-company.com"
                    className="mt-3"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-300/80 bg-amber-50/70 p-4 dark:border-amber-700/50 dark:bg-amber-950/20">
                  <p className="text-lg font-semibold text-amber-900 dark:text-amber-200">Недоступно в бесплатном тарифе</p>
                  <p className="mt-1 text-base text-amber-800 dark:text-amber-300">
                    Подключите свой домен с тарифом Pro или Team.
                  </p>
                  <Button
                    type="button"
                    className="mt-3 bg-amber-500 text-white hover:bg-amber-600"
                    onClick={() => {
                      if (typeof window !== "undefined") window.location.href = "/pricing";
                    }}
                  >
                    Перейти на Pro
                  </Button>
                </div>
              )
            ) : null}
          </section>

          <section className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Команды для подключения домена</p>
                <p className="text-xs text-muted-foreground">Хост: {publishHost}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyValue(nginxCommands, "Команды скопированы")}
              >
                <Copy className="mr-1.5 h-4 w-4" />
                Копировать
              </Button>
            </div>
            <pre
              className={cn(
                "max-h-56 overflow-auto rounded-xl border bg-muted/20 p-3",
                "text-xs leading-relaxed text-foreground"
              )}
            >
              {nginxCommands}
            </pre>
          </section>

          {verificationInfo?.status === "PENDING" && verificationInfo.recordName && verificationInfo.recordValue ? (
            <section className="space-y-2 border-t pt-4">
              <p className="text-sm font-semibold">Подтверждение домена (TXT)</p>
              <p className="text-xs text-muted-foreground">
                Добавьте DNS-запись и дождитесь обновления. После этого нажмите «Проверить домен».
              </p>
              <div className="rounded-xl border bg-muted/20 p-3 text-xs">
                <p>
                  <b>Type:</b> TXT
                </p>
                <p>
                  <b>Name:</b> {verificationInfo.recordName}
                </p>
                <p className="break-all">
                  <b>Value:</b> {verificationInfo.recordValue}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyValue(verificationInfo.recordValue!, "TXT-значение скопировано")}
                >
                  Скопировать value
                </Button>
                <Button type="button" onClick={() => void verifyDomainNow()} disabled={bindingPending}>
                  Проверить домен
                </Button>
              </div>
            </section>
          ) : null}
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            className="gap-1.5"
            disabled={publishPending || bindingPending}
            onClick={async () => {
              const result = await bindPublishHostBeforeOpen();
              if (!result.ok) return;
              if (!result.verified) return;
              await onPublish();
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
