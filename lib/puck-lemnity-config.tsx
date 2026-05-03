"use client";

import type { Config, CustomField } from "@measured/puck";
import type { ReactNode } from "react";

type HeadingProps = { text: string; level: "1" | "2" | "3" | "4"; linkEnabled: boolean; href: string };
type TextBlockProps = { text: string; size: "sm" | "md" | "lg"; linkEnabled: boolean; href: string };
type ImageBlockProps = { src: string; alt: string; width: "full" | "narrow" };
type ButtonBlockProps = { label: string; href: string; variant: "solid" | "ghost" };
type SpacerProps = { height: number };
type CardProps = { title: string; body: string };

const levelToTag: Record<HeadingProps["level"], "h1" | "h2" | "h3" | "h4"> = {
  "1": "h1",
  "2": "h2",
  "3": "h3",
  "4": "h4"
};

const textSize: Record<TextBlockProps["size"], string> = {
  sm: "0.9rem",
  md: "1.05rem",
  lg: "1.2rem"
};

const puckLinkCheckbox: CustomField<boolean> = {
  type: "custom",
  label: "Ссылка",
  render: ({ value, onChange }) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        className="size-4 rounded border-input accent-foreground"
        checked={Boolean(value)}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
      <span>Это ссылка</span>
    </label>
  )
};

function puckHrefField(visible: boolean) {
  return {
    type: "text",
    label: "Адрес (URL)",
    placeholder: "https://… или /path",
    visible
  } as const;
}

function readLinkFields(props: object): { linkOn: boolean; hrefRaw: string } {
  const p = props as Record<string, unknown>;
  return {
    linkOn: Boolean(p.linkEnabled),
    hrefRaw: typeof p.href === "string" ? p.href.trim() : ""
  };
}

function isProbablyRemoteHref(href: string) {
  return /^https?:\/\//i.test(href.trim());
}

function sanitizeHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("#")) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizeImageSrc(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export const lemnityPuckConfig: Config = {
  components: {
    Heading: {
      label: "Заголовок",
      resolveFields: (data) => {
        const linkOn = readLinkFields(data.props ?? {}).linkOn;
        return {
          text: { type: "text", label: "Текст" },
          linkEnabled: puckLinkCheckbox,
          href: puckHrefField(linkOn),
          level: {
            type: "select",
            label: "Уровень",
            options: [
              { label: "H1", value: "1" },
              { label: "H2", value: "2" },
              { label: "H3", value: "3" },
              { label: "H4", value: "4" }
            ]
          }
        };
      },
      defaultProps: {
        text: "Заголовок",
        level: "1",
        linkEnabled: false,
        href: ""
      } satisfies Partial<HeadingProps>,
      render: (props) => {
        const text = typeof props.text === "string" ? props.text : "Заголовок";
        const level = (props.level as HeadingProps["level"] | undefined) ?? "1";
        const safe = level in levelToTag ? level : "1";
        const L = levelToTag[safe];
        const { linkOn, hrefRaw } = readLinkFields(props);
        const safeHref = sanitizeHref(hrefRaw);
        const inner =
          linkOn && safeHref ? (
            <a
              href={safeHref}
              className="text-inherit underline decoration-muted-foreground/60 underline-offset-2 hover:decoration-foreground"
              {...(isProbablyRemoteHref(safeHref)
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {text}
            </a>
          ) : (
            text
          );
        return <L className="m-0 font-semibold leading-tight text-foreground">{inner}</L>;
      }
    },
    TextBlock: {
      label: "Текст",
      resolveFields: (data) => {
        const linkOn = readLinkFields(data.props ?? {}).linkOn;
        return {
          text: { type: "textarea", label: "Абзац" },
          linkEnabled: puckLinkCheckbox,
          href: puckHrefField(linkOn),
          size: {
            type: "select",
            label: "Размер",
            options: [
              { label: "Мелкий", value: "sm" },
              { label: "Обычный", value: "md" },
              { label: "Крупный", value: "lg" }
            ]
          }
        };
      },
      defaultProps: {
        text: "Текст абзаца…",
        size: "md",
        linkEnabled: false,
        href: ""
      } satisfies Partial<TextBlockProps>,
      render: (props) => {
        const text = typeof props.text === "string" ? props.text : "";
        const size = (props.size as TextBlockProps["size"] | undefined) ?? "md";
        const { linkOn, hrefRaw } = readLinkFields(props);
        const safeHref = sanitizeHref(hrefRaw);
        const fontSize = size in textSize ? textSize[size] : "1.05rem";
        const body =
          linkOn && safeHref ? (
            <a
              href={safeHref}
              className="text-inherit text-primary underline underline-offset-2 hover:opacity-90"
              style={{ fontSize, lineHeight: 1.55 }}
              {...(isProbablyRemoteHref(safeHref)
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {text}
            </a>
          ) : (
            text
          );

        return (
          <p
            className="m-0 max-w-prose text-foreground/90"
            style={{
              fontSize,
              lineHeight: 1.55
            }}
          >
            {body}
          </p>
        );
      }
    },
    ImageBlock: {
      label: "Картинка",
      fields: {
        src: { type: "text", label: "URL" },
        alt: { type: "text", label: "Alt" },
        width: {
          type: "select",
          label: "Ширина",
          options: [
            { label: "Контент", value: "narrow" },
            { label: "На ширину", value: "full" }
          ]
        }
      },
      defaultProps: { src: "https://placehold.co/800x400/1a1a1a/fff?text=image", alt: "", width: "narrow" } satisfies Partial<ImageBlockProps>,
      render: (props) => {
        const srcRaw = typeof props.src === "string" ? props.src : "";
        const src = sanitizeImageSrc(srcRaw);
        const alt = typeof props.alt === "string" ? props.alt : "";
        const width = (props.width as ImageBlockProps["width"] | undefined) ?? "narrow";
        if (!src) {
          return (
            <div
              className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground"
              style={width === "full" ? { width: "100%" } : { maxWidth: 640 }}
            >
              Некорректный URL изображения
            </div>
          );
        }
        return (
          <figure className="m-0" style={width === "full" ? { width: "100%" } : { maxWidth: 640 }}>
            <img
              className="h-auto w-full rounded-lg border border-border object-cover"
              src={src}
              alt={alt}
              sizes="(max-width: 768px) 100vw, 640px"
              loading="lazy"
            />
          </figure>
        );
      }
    },
    ButtonBlock: {
      label: "Кнопка / ссылка",
      fields: {
        label: { type: "text", label: "Текст" },
        href: { type: "text", label: "Ссылка" },
        variant: {
          type: "select",
          label: "Стиль",
          options: [
            { label: "Заливка", value: "solid" },
            { label: "Контур", value: "ghost" }
          ]
        }
      },
      defaultProps: { label: "Действие", href: "#", variant: "solid" } satisfies Partial<ButtonBlockProps>,
      render: (props) => {
        const label = typeof props.label === "string" ? props.label : "—";
        const hrefRaw = typeof props.href === "string" ? props.href : "#";
        const href = sanitizeHref(hrefRaw) ?? "#";
        const variant = (props.variant as ButtonBlockProps["variant"] | undefined) ?? "solid";
        return (
          <a
            href={href}
            {...(isProbablyRemoteHref(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={
              variant === "ghost"
                ? "inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/60"
                : "inline-flex items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            }
          >
            {label}
          </a>
        );
      }
    },
    Spacer: {
      label: "Отступ",
      fields: {
        height: { type: "number", label: "Высота (px)", min: 0, max: 200 }
      },
      defaultProps: { height: 24 } satisfies Partial<SpacerProps>,
      render: (props) => {
        const h = typeof props.height === "number" ? props.height : 16;
        return <div style={{ height: Math.min(200, Math.max(0, h)) }} aria-hidden />;
      }
    },
    Card: {
      label: "Карточка",
      fields: {
        title: { type: "text", label: "Заголовок" },
        body: { type: "textarea", label: "Текст" }
      },
      defaultProps: { title: "Карточка", body: "Краткое описание…" } satisfies Partial<CardProps>,
      render: (props) => {
        const title = typeof props.title === "string" ? props.title : "";
        const body = typeof props.body === "string" ? props.body : "";
        return (
          <div data-lmnt-layer="raised" className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
            <h3 className="m-0 text-lg font-semibold">{title}</h3>
            <p className="mt-2 m-0 text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        );
      }
    }
  },
  root: {
    defaultProps: { title: "Страница" },
    render: ({ children }: { children: ReactNode }) => (
      <div
        data-lmnt-layout-root
        className="min-h-0 w-full min-w-0 text-foreground"
        style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.5rem" }}
      >
        {children}
      </div>
    )
  }
};

export { defaultLemnityPuckData } from "./puck-lemnity-data";
