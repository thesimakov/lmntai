"use client";

import type { Config } from "@measured/puck";
import type { ReactNode } from "react";

type HeadingProps = { text: string; level: "1" | "2" | "3" | "4" };
type TextBlockProps = { text: string; size: "sm" | "md" | "lg" };
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

export const lemnityPuckConfig: Config = {
  components: {
    Heading: {
      label: "Заголовок",
      fields: {
        text: { type: "text", label: "Текст" },
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
      },
      defaultProps: { text: "Заголовок", level: "1" } satisfies Partial<HeadingProps>,
      render: (props) => {
        const text = typeof props.text === "string" ? props.text : "Заголовок";
        const level = (props.level as HeadingProps["level"] | undefined) ?? "1";
        const safe = level in levelToTag ? level : "1";
        const L = levelToTag[safe];
        return <L className="m-0 font-semibold leading-tight text-foreground">{text}</L>;
      }
    },
    TextBlock: {
      label: "Текст",
      fields: {
        text: { type: "textarea", label: "Абзац" },
        size: {
          type: "select",
          label: "Размер",
          options: [
            { label: "Мелкий", value: "sm" },
            { label: "Обычный", value: "md" },
            { label: "Крупный", value: "lg" }
          ]
        }
      },
      defaultProps: { text: "Текст абзаца…", size: "md" } satisfies Partial<TextBlockProps>,
      render: (props) => {
        const text = typeof props.text === "string" ? props.text : "";
        const size = (props.size as TextBlockProps["size"] | undefined) ?? "md";
        return (
          <p
            className="m-0 max-w-prose text-foreground/90"
            style={{
              fontSize: size in textSize ? textSize[size] : "1.05rem",
              lineHeight: 1.55
            }}
          >
            {text}
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
        const src = typeof props.src === "string" ? props.src : "";
        const alt = typeof props.alt === "string" ? props.alt : "";
        const width = (props.width as ImageBlockProps["width"] | undefined) ?? "narrow";
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
        const href = typeof props.href === "string" ? props.href : "#";
        const variant = (props.variant as ButtonBlockProps["variant"] | undefined) ?? "solid";
        return (
          <a
            href={href}
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
          <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
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
        className="min-h-0 w-full min-w-0 text-foreground"
        style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.5rem" }}
      >
        {children}
      </div>
    )
  }
};

export function defaultLemnityPuckData() {
  return { root: { props: { title: "Страница" } }, content: [] as [] };
}
