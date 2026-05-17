"use client";

import { Loader2, Pencil, Plus, X } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteBrandKitLibrary, saveBrandKitLibrary } from "@/lib/brand-kit-client";
import { manifestToProjectState } from "@/lib/brand-kit-library";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
export type BrandTypographySlot = {
  family: string;
  sizePx: number;
};

export type BrandTypography = {
  heading: BrandTypographySlot;
  body: BrandTypographySlot;
};

export type BrandColorEntry = {
  id: string;
  hex: string;
};

export type BrandMediaAsset = {
  id: string;
  name: string;
  fileName?: string;
  url?: string;
};

export type ProjectBrandKitState = {
  companyDescription: string;
  slogan: string;
  brandValues: string;
  brandAesthetics: string;
  colors: BrandColorEntry[];
  typography: BrandTypography;
  logos: BrandMediaAsset[];
  images: BrandMediaAsset[];
};

function newAssetId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `asset_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `asset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function newColorId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `color-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeHexColor(raw: string): string {
  const trimmed = raw.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const h = trimmed.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return trimmed;
}

function colorInputValue(hex: string): string {
  const normalized = normalizeHexColor(hex);
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : "#000000";
}

const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Georgia",
  "Merriweather",
  "Playfair Display",
  "JetBrains Mono"
] as const;

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 130;
/** Шаг 2px: 12 … 130 */
const FONT_SIZE_OPTIONS: readonly number[] = Array.from(
  { length: Math.floor((FONT_SIZE_MAX - FONT_SIZE_MIN) / 2) + 1 },
  (_, i) => FONT_SIZE_MIN + i * 2
);

const DEFAULT_TYPOGRAPHY: BrandTypography = {
  heading: { family: "Montserrat", sizePx: 32 },
  body: { family: "Inter", sizePx: 16 }
};

export const emptyProjectBrandKit = (): ProjectBrandKitState => ({
  companyDescription: "",
  slogan: "",
  brandValues: "",
  brandAesthetics: "",
  colors: [],
  typography: { ...DEFAULT_TYPOGRAPHY },
  logos: [],
  images: [],
});

type ProjectBrandKitFieldsProps = {
  value: ProjectBrandKitState;
  onChange: (next: ProjectBrandKitState) => void;
};

function UploadTile({
  label,
  accept,
  previews,
  onAdd,
  onRemove
}: {
  label: string;
  accept: string;
  previews: BrandMediaAsset[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
}) {
  const inputId = useId();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {previews.length > 0 ? (
          <span className="rounded-md p-1 text-muted-foreground" aria-hidden>
            <Pencil className="size-3.5" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {previews.map((item) => (
          <div
            key={item.id}
            className="group relative size-20 overflow-hidden rounded-xl border border-border bg-muted/30"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url ?? ""} alt="" className="size-full object-cover" />
            <button
              type="button"
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => onRemove(item.id)}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
        <label
          htmlFor={inputId}
          className="flex size-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40"
        >
          <Plus className="size-5" aria-hidden />
          <input
            id={inputId}
            type="file"
            accept={accept}
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) onAdd(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

export function ProjectBrandKitFields({ value, onChange }: ProjectBrandKitFieldsProps) {
  const { t } = useI18n();
  const pendingFilesRef = useRef<Map<string, File>>(new Map());
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const patch = (partial: Partial<ProjectBrandKitState>) => onChange({ ...value, ...partial });

  const revokeBlobUrl = useCallback((url: string | undefined) => {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
      blobUrlsRef.current.delete(url);
    }
  }, []);

  const addMediaFiles = (files: FileList, field: "logos" | "images") => {
    const nextAssets: BrandMediaAsset[] = [];
    Array.from(files).forEach((file) => {
      const id = newAssetId();
      const url = URL.createObjectURL(file);
      blobUrlsRef.current.add(url);
      pendingFilesRef.current.set(id, file);
      nextAssets.push({ id, name: file.name, url });
    });
    patch({ [field]: [...value[field], ...nextAssets] });
  };

  const removeMedia = (field: "logos" | "images", id: string) => {
    const item = value[field].find((a) => a.id === id);
    if (item?.url) revokeBlobUrl(item.url);
    pendingFilesRef.current.delete(id);
    patch({ [field]: value[field].filter((a) => a.id !== id) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dto = await saveBrandKitLibrary(value, pendingFilesRef.current);
      pendingFilesRef.current.clear();
      for (const url of blobUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      blobUrlsRef.current.clear();
      onChange(manifestToProjectState(dto.manifest, dto.assetUrls));
      toast.success(t("projects_brand_save_success"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("projects_brand_save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBrandKitLibrary();
      for (const asset of [...value.logos, ...value.images]) {
        revokeBlobUrl(asset.url);
      }
      pendingFilesRef.current.clear();
      blobUrlsRef.current.clear();
      onChange(emptyProjectBrandKit());
      toast.success(t("projects_brand_delete_success"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("projects_brand_delete_error"));
    } finally {
      setDeleting(false);
    }
  };

  const addColor = () => {
    const palette = ["#111827", "#2563eb", "#7c3aed", "#059669", "#ea580c"];
    const nextHex = palette.find((c) => !value.colors.some((entry) => entry.hex === c)) ?? "#111827";
    patch({
      colors: [...value.colors, { id: newColorId(), hex: nextHex }]
    });
  };

  const updateColor = (id: string, hex: string) => {
    patch({
      colors: value.colors.map((entry) =>
        entry.id === id ? { ...entry, hex: normalizeHexColor(hex) } : entry
      )
    });
  };

  const removeColor = (id: string) => {
    patch({ colors: value.colors.filter((entry) => entry.id !== id) });
  };

  const updateTypographySlot = (
    role: keyof BrandTypography,
    partial: Partial<BrandTypographySlot>
  ) => {
    const base = value.typography ?? DEFAULT_TYPOGRAPHY;
    patch({
      typography: {
        ...base,
        [role]: { ...base[role], ...partial }
      }
    });
  };

  return (
    <div className="space-y-6 rounded-xl border border-border/70 bg-background/80 p-4 sm:p-5">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{t("projects_brand_kit_title")}</h3>
        <Textarea
          value={value.companyDescription}
          onChange={(e) => patch({ companyDescription: e.target.value })}
          placeholder={t("projects_brand_company_description_placeholder")}
          rows={2}
          className="min-h-0 resize-none border-0 bg-transparent px-0 py-1 text-sm shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0"
        />
      </div>

      <UploadTile
        label={t("projects_brand_logos")}
        accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
        previews={value.logos}
        onAdd={(files) => addMediaFiles(files, "logos")}
        onRemove={(id) => removeMedia("logos", id)}
      />

      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">{t("projects_brand_colors")}</p>
        {value.colors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("projects_brand_colors_empty")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {value.colors.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1"
              >
                <input
                  type="color"
                  value={colorInputValue(entry.hex)}
                  onInput={(e) => updateColor(entry.id, e.currentTarget.value)}
                  onChange={(e) => updateColor(entry.id, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="size-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label={t("projects_brand_colors")}
                />
                <Input
                  value={entry.hex}
                  onChange={(e) => updateColor(entry.id, e.target.value)}
                  className="h-8 w-24 border-0 bg-transparent px-1 font-mono text-xs shadow-none focus-visible:ring-0"
                />
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => removeColor(entry.id)}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" size="sm" className="rounded-full px-4" onClick={addColor}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          {t("projects_brand_add_color")}
        </Button>
      </div>

      <UploadTile
        label={t("projects_brand_images")}
        accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
        previews={value.images}
        onAdd={(files) => addMediaFiles(files, "images")}
        onRemove={(id) => removeMedia("images", id)}
      />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{t("projects_brand_slogan")}</p>
        <Textarea
          value={value.slogan}
          onChange={(e) => patch({ slogan: e.target.value })}
          placeholder={t("projects_brand_slogan_empty")}
          rows={2}
          className="resize-none border-border/80 bg-background/80 text-sm italic placeholder:not-italic"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{t("projects_brand_values")}</p>
        <Textarea
          value={value.brandValues}
          onChange={(e) => patch({ brandValues: e.target.value })}
          placeholder={t("projects_brand_values_empty")}
          rows={2}
          className="resize-none border-border/80 bg-background/80 text-sm"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{t("projects_brand_aesthetics")}</p>
        <Textarea
          value={value.brandAesthetics}
          onChange={(e) => patch({ brandAesthetics: e.target.value })}
          placeholder={t("projects_brand_aesthetics_empty")}
          rows={2}
          className="resize-none border-border/80 bg-background/80 text-sm"
        />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("projects_brand_typography")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("projects_brand_typography_hint")}</p>
        </div>

        <ul className="space-y-3">
          {(
            [
              {
                role: "heading" as const,
                titleKey: "projects_brand_font_heading" as const,
                previewKey: "projects_brand_font_heading_preview" as const
              },
              {
                role: "body" as const,
                titleKey: "projects_brand_font_body" as const,
                previewKey: "projects_brand_font_body_preview" as const
              }
            ] as const
          ).map(({ role, titleKey, previewKey }) => {
            const slot = value.typography?.[role] ?? DEFAULT_TYPOGRAPHY[role];
            return (
              <li
                key={role}
                className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4"
              >
                <p className="mb-3 text-sm font-semibold text-foreground">{t(titleKey)}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t("projects_brand_font_family")}
                    </label>
                    <Select
                      value={slot.family}
                      onValueChange={(family) => updateTypographySlot(role, { family })}
                    >
                      <SelectTrigger className="h-9 w-full border-border/80 bg-background/90 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((family) => (
                          <SelectItem key={family} value={family}>
                            <span style={{ fontFamily: family }}>{family}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t("projects_brand_font_size")}
                    </label>
                    <Select
                      value={String(slot.sizePx)}
                      onValueChange={(size) => {
                        const sizePx = Math.min(
                          FONT_SIZE_MAX,
                          Math.max(FONT_SIZE_MIN, Number(size))
                        );
                        updateTypographySlot(role, { sizePx });
                      }}
                    >
                      <SelectTrigger className="h-9 w-full border-border/80 bg-background/90 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}px
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p
                  className="mt-3 text-foreground leading-snug"
                  style={{
                    fontFamily: slot.family,
                    fontSize: `${slot.sizePx}px`,
                    fontWeight: role === "heading" ? 600 : 400
                  }}
                >
                  {t(previewKey)}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        <Button type="button" onClick={() => void handleSave()} disabled={saving || deleting}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
          {t("projects_brand_save")}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" disabled={saving || deleting}>
              {deleting ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              {t("projects_brand_delete")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("projects_brand_delete_confirm_title")}</AlertDialogTitle>
              <AlertDialogDescription>{t("projects_brand_delete_confirm_message")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("projects_brand_delete_confirm_no")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void handleDelete()}
              >
                {t("projects_brand_delete_confirm_yes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
