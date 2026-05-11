import type { ZbElement, ZbElementType, ZbCanvasConfig } from "./types";

let _counter = 0;
export function zbNewId(): string {
  return `zb_${Date.now().toString(36)}_${(_counter++).toString(36)}`;
}

export const ZB_DEFAULT_CANVAS: ZbCanvasConfig = {
  gridWidth: 1200,
  canvasWidth: null,
  height: 550,
  background: "#ffffff",
  columns: 12,
  snapToGrid: true,
  snapToElements: true,
  showGuides: true,
  showColumns: false,
  zoom: 1,
};

const BASE: Omit<ZbElement, "id" | "type" | "x" | "y" | "w" | "h" | "name" | "props"> = {
  rot: 0,
  opacity: 1,
  zIndex: 1,
  locked: false,
  visible: true,
  responsive: {},
  animation: null,
};

export function zbCreateElement(type: ZbElementType, x = 100, y = 100): ZbElement {
  switch (type) {
    case "text":
      return {
        ...BASE,
        id: zbNewId(),
        type,
        x,
        y,
        w: 320,
        h: 54,
        name: "Текст",
        props: {
          content: "Введите текст",
          fontFamily: "Inter, sans-serif",
          fontSize: 18,
          fontWeight: 400,
          lineHeight: 1.5,
          letterSpacing: 0,
          color: "#1a1a1a",
          textAlign: "left",
          autoHeight: true,
        },
      };

    case "image":
      return {
        ...BASE,
        id: zbNewId(),
        type,
        x,
        y,
        w: 320,
        h: 220,
        name: "Изображение",
        props: {
          src: "",
          alt: "",
          objectFit: "cover",
          borderRadius: 0,
          lazyLoad: true,
        },
      };

    case "shape":
      return {
        ...BASE,
        id: zbNewId(),
        type,
        x,
        y,
        w: 200,
        h: 120,
        name: "Фигура",
        props: {
          shapeType: "rectangle",
          fill: "#e2e8f0",
          borderRadius: 0,
        },
      };

    case "button":
      return {
        ...BASE,
        id: zbNewId(),
        type,
        x,
        y,
        w: 180,
        h: 50,
        name: "Кнопка",
        props: {
          text: "Нажмите",
          link: "",
          targetBlank: false,
          backgroundColor: "#f26b4f",
          textColor: "#ffffff",
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          action: "link",
        },
      };

    case "vector":
      return {
        ...BASE,
        id: zbNewId(),
        type,
        x,
        y,
        w: 80,
        h: 80,
        name: "Вектор",
        props: {
          svgContent:
            '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/></svg>',
          fill: "#1a1a1a",
          stroke: "none",
          strokeWidth: 0,
        },
      };

    case "video":
      return {
        ...BASE,
        id: zbNewId(),
        type,
        x,
        y,
        w: 560,
        h: 315,
        name: "Видео",
        props: {
          url: "",
          videoType: "youtube",
          autoplay: false,
          muted: false,
          controls: true,
          loop: false,
        },
      };

    case "html":
      return {
        ...BASE,
        id: zbNewId(),
        type,
        x,
        y,
        w: 300,
        h: 200,
        name: "HTML-блок",
        props: {
          html: "<p style=\"font-family:sans-serif;margin:0;\">Введите HTML</p>",
          css: "",
          js: "",
        },
      };

    case "tooltip":
      return {
        ...BASE,
        id: zbNewId(),
        type,
        x,
        y,
        w: 140,
        h: 44,
        name: "Тултип",
        props: {
          triggerText: "Наведите",
          content: "Текст подсказки",
          trigger: "hover",
          delay: 0,
          position: "top",
        },
      };

    case "form":
      return {
        ...BASE,
        id: zbNewId(),
        type,
        x,
        y,
        w: 440,
        h: 320,
        name: "Форма",
        props: {
          fields: [
            { id: zbNewId(), fieldType: "input", label: "Имя", required: true, placeholder: "Введите имя" },
            { id: zbNewId(), fieldType: "input", label: "Email", required: true, placeholder: "email@example.com" },
          ],
          submitText: "Отправить",
          successMessage: "Спасибо! Мы свяжемся с вами.",
        },
      };

    case "gallery":
      return {
        ...BASE,
        id: zbNewId(),
        type,
        x,
        y,
        w: 640,
        h: 420,
        name: "Галерея",
        props: {
          images: [],
          layout: "slider",
          lightbox: true,
          autoplay: false,
          arrows: true,
          autoplayInterval: 3000,
        },
      };
  }
}
