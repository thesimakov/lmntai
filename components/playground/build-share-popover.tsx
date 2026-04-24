"use client";

import { Check, Globe, Link2, Lock, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildPublicSharePageUrl, copyTextToClipboard } from "@/lib/preview-share";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n";

type BuildSharePopoverProps = {
  sandboxId: string | null;
  hasPreview: boolean;
  shareIsPublic: boolean;
  onShareIsPublicChange: (v: boolean) => void;
  t: (key: MessageKey) => string;
};

/**
 * Панель «Поделиться»: приват / публично, мгновенная публикация, копирование ссылки.
 */
export function BuildSharePopover({
  sandboxId,
  hasPreview,
  shareIsPublic,
  onShareIsPublicChange,
  t
}: BuildSharePopoverProps) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareMode = shareIsPublic ? "public" : "private" as "private" | "public";

  const refreshState = useCallback(async () => {
    if (!sandboxId) {
      onShareIsPublicChange(false);
      return;
    }
    const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`, { method: "GET" });
    if (res.status === 503) {
      return;
    }
    if (res.ok) {
      const data = (await res.json()) as { isPublic?: boolean };
      onShareIsPublicChange(Boolean(data.isPublic));
    }
  }, [sandboxId, onShareIsPublicChange]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const handleModeChange = async (mode: "private" | "public") => {
    if (!sandboxId || sharing) return;
    if (mode === shareMode) {
      setLinkCopied(false);
      return;
    }
    try {
      setSharing(true);
      const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`, {
        method: mode === "public" ? "POST" : "DELETE"
      });
      if (!res.ok) {
        const text = await res.text();
        toast.error(text || t("playground_build_share_error_settings"));
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { isPublic?: boolean };
      onShareIsPublicChange(data.isPublic ?? mode === "public");
      setLinkCopied(false);
    } catch {
      toast.error(t("playground_build_share_error_settings"));
    } finally {
      setSharing(false);
    }
  };

  const handleInstantShare = async () => {
    if (!sandboxId) return;
    try {
      setSharing(true);
      const res = await fetch(`/api/sandbox/${encodeURIComponent(sandboxId)}/share`, { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        toast.error(text || t("playground_build_share_error_instant"));
        return;
      }
      onShareIsPublicChange(true);
      setLinkCopied(false);
    } catch {
      toast.error(t("playground_build_share_error_instant"));
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!sandboxId || typeof window === "undefined") return;
    const url = buildPublicSharePageUrl(window.location.origin, sandboxId);
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 3000);
      toast.success(t("playground_build_share_link_copied_toast"));
    } else {
      toast.error(t("playground_toast_copy_failed"));
    }
  };

  const disabled = !hasPreview || !sandboxId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 min-w-0 max-w-full shrink rounded-lg px-2 sm:px-3"
          disabled={disabled}
          aria-label={t("playground_build_share_label")}
        >
          {t("playground_build_share_label")}
          <Share2 className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0">
        <div className="flex flex-col px-4 pb-4 pt-3">
          <div
            className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted/80", sharing && "pointer-events-none opacity-50")}
            onClick={() => void handleModeChange("private")}
            onKeyDown={(e) => e.key === "Enter" && void handleModeChange("private")}
            role="button"
            tabIndex={0}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md",
                shareMode === "private" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <Lock className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t("playground_build_share_only_you")}</div>
              <div className="text-[13px] text-muted-foreground">{t("playground_build_share_only_you_desc")}</div>
            </div>
            <Check className={cn("h-5 w-5 shrink-0", shareMode === "private" ? "text-primary" : "invisible")} />
          </div>
          <div
            className={cn("mt-1 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted/80", sharing && "pointer-events-none opacity-50")}
            onClick={() => void handleModeChange("public")}
            onKeyDown={(e) => e.key === "Enter" && void handleModeChange("public")}
            role="button"
            tabIndex={0}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md",
                shareMode === "public" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <Globe className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t("playground_build_share_public")}</div>
              <div className="text-[13px] text-muted-foreground">{t("playground_build_share_public_desc")}</div>
            </div>
            <Check className={cn("h-5 w-5 shrink-0", shareMode === "public" ? "text-primary" : "invisible")} />
          </div>

          <div className="mb-1 mt-2 border-t border-border" />

          {shareMode === "private" ? (
            <Button
              type="button"
              className="mt-2 w-full gap-1.5"
              disabled={sharing}
              onClick={() => void handleInstantShare()}
            >
              {sharing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {sharing ? t("playground_build_share_sharing") : t("playground_build_share_instant")}
            </Button>
          ) : (
            <Button
              type="button"
              variant={linkCopied ? "outline" : "default"}
              className="mt-2 w-full gap-1.5"
              onClick={() => void handleCopyLink()}
            >
              {linkCopied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              {linkCopied ? t("playground_build_share_link_copied") : t("playground_build_share_copy")}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
