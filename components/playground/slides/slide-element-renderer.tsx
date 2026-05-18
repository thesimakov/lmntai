"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { cn } from "@/lib/utils";

function esc(s: unknown): string {
  if (typeof s !== "string") return "";
  return s;
}

export function SlideElementRenderer({ el }: { el: SlideElement }) {
  const style: React.CSSProperties = {
    ...(el.style?.color ? { color: el.style.color } : {}),
    ...(el.style?.fontSize ? { fontSize: el.style.fontSize } : {}),
    ...(el.style?.fontWeight === "bold" ? { fontWeight: 700 } : {}),
    ...(el.style?.italic ? { fontStyle: "italic" } : {}),
    ...(el.style?.textAlign
      ? { textAlign: el.style.textAlign as React.CSSProperties["textAlign"] }
      : {}),
    ...(el.style?.opacity != null ? { opacity: el.style.opacity } : {}),
  };

  switch (el.type) {
    case "heading":
      return (
        <h2
          className="lmnt-slide__heading"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          {esc(el.content)}
        </h2>
      );

    case "subheading":
      return (
        <p
          className="lmnt-slide__subheading"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          {esc(el.content)}
        </p>
      );

    case "body":
      return (
        <p
          className="lmnt-slide__body"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          {esc(el.content)}
        </p>
      );

    case "bullet-list":
      return (
        <ul
          className="lmnt-slide__bullets"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          {(el.items ?? []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case "image":
      return (
        <img
          className="lmnt-slide__image"
          src={el.src ?? ""}
          alt={el.alt ?? ""}
          data-lmnt-elem-id={el.id}
          style={style}
        />
      );

    case "quote":
      return (
        <blockquote
          className="lmnt-slide__quote"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          {esc(el.content)}
        </blockquote>
      );

    case "caption":
      return (
        <p
          className="lmnt-slide__caption"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          {esc(el.content)}
        </p>
      );

    case "label":
      return (
        <span
          className="lmnt-slide__label"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          {esc(el.content)}
        </span>
      );

    case "metric-card":
      return (
        <div
          className="lmnt-card lmnt-metric-card"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          <p className="lmnt-metric-card__label">{esc(el.label ?? el.content)}</p>
          <p className="lmnt-metric-card__description">{esc(el.description)}</p>
        </div>
      );

    case "stat-number":
      return (
        <div
          className="lmnt-stat-number"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          <span className="lmnt-stat-number__value">{esc(el.value)}</span>
          {el.change && (
            <span className="lmnt-stat-number__change">{esc(el.change)}</span>
          )}
          <span className="lmnt-stat-number__label">{esc(el.label)}</span>
        </div>
      );

    case "feature-card":
      return (
        <div
          className="lmnt-card lmnt-feature-card"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          {el.badge && (
            <span className="lmnt-feature-card__badge">{esc(el.badge)}</span>
          )}
          <p className="lmnt-feature-card__title">{esc(el.content ?? el.label)}</p>
          <p className="lmnt-feature-card__desc">{esc(el.description)}</p>
        </div>
      );

    case "step-card":
      return (
        <div
          className="lmnt-card lmnt-step-card"
          data-lmnt-elem-id={el.id}
          style={style}
        >
          <div className="lmnt-step-card__num">
            {el.stepNumber != null ? String(el.stepNumber) : ""}
          </div>
          <p className="lmnt-step-card__title">{esc(el.content ?? el.label)}</p>
          <p className="lmnt-step-card__desc">{esc(el.description)}</p>
        </div>
      );

    case "pricing-card":
      return (
        <div
          className={cn(
            "lmnt-card lmnt-pricing-card",
            el.popular && "lmnt-pricing-card--popular"
          )}
          data-lmnt-elem-id={el.id}
          style={style}
        >
          <p className="lmnt-pricing-card__plan">{esc(el.planName ?? el.content)}</p>
          {el.popular && (
            <span className="lmnt-pricing-card__badge">ПОПУЛЯРНЫЙ</span>
          )}
          <p className="lmnt-pricing-card__price">
            {esc(el.price)}
            <span className="lmnt-pricing-card__period"> {esc(el.period)}</span>
          </p>
          <ul className="lmnt-pricing-card__feats">
            {(el.features ?? []).map((f, i) => (
              <li key={i} className="lmnt-pricing-card__feat">
                {f}
              </li>
            ))}
          </ul>
        </div>
      );

    case "timeline-col":
      return (
        <div
          className={cn(
            "lmnt-timeline-col",
            el.highlighted && "lmnt-timeline-col--highlighted"
          )}
          data-lmnt-elem-id={el.id}
          style={style}
        >
          <span className="lmnt-timeline-col__period">
            {esc(el.period ?? el.label)}
          </span>
          <p className="lmnt-timeline-col__title">{esc(el.content ?? el.planName)}</p>
          <ul className="lmnt-timeline-col__items">
            {(el.items ?? []).map((item, i) => (
              <li key={i} className="lmnt-timeline-col__item">
                {item}
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return (
        <div data-lmnt-elem-id={el.id}>{esc((el as SlideElement).content ?? "")}</div>
      );
  }
}
