import type {
  ZbElement,
  ZbCanvasConfig,
  ZbTextProps,
  ZbImageProps,
  ZbShapeProps,
  ZbButtonProps,
  ZbVectorProps,
  ZbVideoProps,
  ZbHtmlProps,
  ZbFormProps,
  ZbResponsiveOverride,
  ZbBreakpoint,
} from "./types";

function styleStr(obj: Record<string, string | number | undefined>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      return `${prop}:${String(v)}`;
    })
    .join(";");
}

function attr(name: string, val: string | undefined): string {
  return val ? ` ${name}="${val.replace(/"/g, "&quot;")}"` : "";
}

function encodeResponsive(responsive: ZbElement["responsive"]): string {
  const keys = Object.keys(responsive) as ZbBreakpoint[];
  if (!keys.length) return "";
  const entries = keys.map((bp) => {
    const ov = responsive[bp] as ZbResponsiveOverride;
    return `${bp}:${JSON.stringify(ov)}`;
  });
  return entries.join("|");
}

function elementToHtml(el: ZbElement): string {
  if (!el.visible) return "";

  const wrapStyle = styleStr({
    position: "absolute",
    left: `${el.x}px`,
    top: `${el.y}px`,
    width: `${el.w}px`,
    height: `${el.h}px`,
    ...(el.rot !== 0 ? { transform: `rotate(${el.rot}deg)` } : {}),
    ...(el.opacity !== 1 ? { opacity: String(el.opacity) } : {}),
    zIndex: String(el.zIndex),
  });

  // Metadata attributes for lossless round-trip
  const metaAttrs = [
    `data-zb-id="${el.id}"`,
    `data-zb-type="${el.type}"`,
    `data-zb-name="${(el.name ?? "").replace(/"/g, "&quot;")}"`,
    el.locked ? `data-zb-locked="1"` : "",
    el.animation ? `data-zb-anim="${JSON.stringify(el.animation).replace(/"/g, "&quot;")}"` : "",
    Object.keys(el.responsive).length ? `data-zb-responsive="${encodeResponsive(el.responsive).replace(/"/g, "&quot;")}"` : "",
  ].filter(Boolean).join(" ");

  switch (el.type) {
    case "text": {
      const p = el.props as unknown as ZbTextProps;
      const inner = styleStr({
        fontFamily: p.fontFamily,
        fontSize: `${p.fontSize}px`,
        fontWeight: String(p.fontWeight),
        lineHeight: String(p.lineHeight),
        letterSpacing: `${p.letterSpacing}px`,
        color: p.color,
        textAlign: p.textAlign,
        width: "100%",
      });
      const content = p.hyperlink
        ? `<a href="${p.hyperlink}" style="color:inherit;text-decoration:none;">${p.content}</a>`
        : p.content;
      return `<div ${metaAttrs} style="${wrapStyle}"><div style="${inner}">${content}</div></div>`;
    }

    case "image": {
      const p = el.props as unknown as ZbImageProps;
      const imgStyle = styleStr({
        width: "100%",
        height: "100%",
        objectFit: p.objectFit,
        borderRadius: `${p.borderRadius}px`,
        ...(p.boxShadow ? { boxShadow: p.boxShadow } : {}),
        display: "block",
      });
      const img = `<img${attr("src", p.src)}${attr("alt", p.alt)} loading="${p.lazyLoad ? "lazy" : "eager"}" style="${imgStyle}"/>`;
      return `<div ${metaAttrs} style="${wrapStyle}">${p.link ? `<a href="${p.link}" style="display:block;width:100%;height:100%;">${img}</a>` : img}</div>`;
    }

    case "shape": {
      const p = el.props as unknown as ZbShapeProps;
      const shapeStyle = styleStr({
        width: "100%",
        height: "100%",
        background: p.gradient ?? p.fill,
        borderRadius: p.shapeType === "circle" ? "50%" : `${p.borderRadius}px`,
        ...(p.border ? { border: p.border } : {}),
      });
      return `<div ${metaAttrs} style="${wrapStyle}"><div style="${shapeStyle}"></div></div>`;
    }

    case "button": {
      const p = el.props as unknown as ZbButtonProps;
      const btnStyle = styleStr({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: p.backgroundColor,
        color: p.textColor,
        borderRadius: `${p.borderRadius}px`,
        fontSize: `${p.fontSize}px`,
        fontWeight: String(p.fontWeight),
        border: p.border ?? "none",
        cursor: "pointer",
        textDecoration: "none",
        boxSizing: "border-box",
      });
      const tag = p.link ? "a" : "button";
      const extra = p.link
        ? `href="${p.link}"${p.targetBlank ? ' target="_blank" rel="noopener"' : ""}`
        : `type="button"`;
      return `<div ${metaAttrs} style="${wrapStyle}"><${tag} ${extra} style="${btnStyle}">${p.text}</${tag}></div>`;
    }

    case "vector": {
      const p = el.props as unknown as ZbVectorProps;
      const svgStyled = p.svgContent
        .replace(/(<svg[^>]*)(>)/, `$1 style="width:100%;height:100%;fill:${p.fill};color:${p.fill};" $2`);
      return `<div ${metaAttrs} style="${wrapStyle}">${svgStyled}</div>`;
    }

    case "video": {
      const p = el.props as unknown as ZbVideoProps;
      let videoHtml = "";
      if (p.videoType === "youtube") {
        const id = p.url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] ?? "";
        const params = new URLSearchParams();
        if (p.autoplay) params.set("autoplay", "1");
        if (p.muted) params.set("mute", "1");
        if (p.loop) params.set("loop", "1");
        if (!p.controls) params.set("controls", "0");
        videoHtml = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}?${params}" frameborder="0" allowfullscreen></iframe>`;
      } else if (p.videoType === "vimeo") {
        const id = p.url.match(/vimeo\.com\/(\d+)/)?.[1] ?? "";
        videoHtml = `<iframe width="100%" height="100%" src="https://player.vimeo.com/video/${id}" frameborder="0" allowfullscreen></iframe>`;
      } else {
        videoHtml = `<video width="100%" height="100%"${p.autoplay ? " autoplay" : ""}${p.muted ? " muted" : ""}${p.controls ? " controls" : ""}${p.loop ? " loop" : ""}${p.posterImage ? ` poster="${p.posterImage}"` : ""} style="object-fit:cover;"><source src="${p.url}"/></video>`;
      }
      return `<div ${metaAttrs} style="${wrapStyle}">${videoHtml}</div>`;
    }

    case "html": {
      const p = el.props as unknown as ZbHtmlProps;
      let content = p.html;
      if (p.css) content = `<style>${p.css}</style>${content}`;
      return `<div ${metaAttrs} style="${wrapStyle}">${content}</div>`;
    }

    case "form": {
      const p = el.props as unknown as ZbFormProps;
      const fields = (p.fields as Array<{ id: string; fieldType: string; label: string; required: boolean; placeholder?: string }>)
        .map(
          (f) => `<div style="margin-bottom:12px;"><label style="display:block;margin-bottom:4px;font-size:14px;">${f.label}${f.required ? " *" : ""}</label><input type="text" placeholder="${f.placeholder ?? ""}" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:4px;font-size:14px;box-sizing:border-box;"/></div>`,
        )
        .join("");
      return `<div ${metaAttrs} style="${wrapStyle}"><form style="padding:0;" onsubmit="return false;">${fields}<button type="submit" style="padding:10px 24px;background:#f26b4f;color:#fff;border:none;border-radius:6px;font-size:15px;cursor:pointer;">${p.submitText}</button></form></div>`;
    }

    default:
      return `<div ${metaAttrs} style="${wrapStyle}"></div>`;
  }
}

export function zbExportToHtml(
  elements: ZbElement[],
  canvas: Pick<ZbCanvasConfig, "gridWidth" | "height" | "background">,
  blockId: string,
): string {
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  const inner = sorted.map(elementToHtml).filter(Boolean).join("\n  ");
  const canvasWrap = `<div class="lemnity-zero-canvas" data-ln-zero-canvas="1" style="position:relative;width:100%;min-height:100%;box-sizing:border-box">\n  ${inner}\n</div>`;
  const sectionStyle = styleStr({
    position: "relative",
    width: "100%",
    minHeight: `${canvas.height}px`,
    background: canvas.background,
    overflow: "hidden",
    boxSizing: "border-box",
  });
  return `<section class="lemnity-zero-block" data-ln-zero-id="${blockId}" style="${sectionStyle}">\n  ${canvasWrap}\n</section>`;
}

export function zbExportToCss(_elements: ZbElement[]): string {
  return "";
}
