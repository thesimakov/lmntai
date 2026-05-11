import type { ZbElement } from "./types";
import { zbNewId } from "./defaults";

export interface ZbTemplateBlock {
  id: string;
  name: string;
  category: string;
  elements: () => ZbElement[];
}

function base(overrides: Partial<ZbElement> & Pick<ZbElement, "id" | "type" | "x" | "y" | "w" | "h" | "name" | "props" | "zIndex">): ZbElement {
  return { rot: 0, opacity: 1, locked: false, visible: true, responsive: {}, animation: null, ...overrides };
}

function titleElements(): ZbElement[] {
  return [
    base({ id: zbNewId(), type: "text", x: 40, y: 60, w: 900, h: 60, name: "Заголовок", zIndex: 1, props: { content: "Заголовок секции", fontFamily: "Inter, sans-serif", fontSize: 42, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, color: "#1a1a1a", textAlign: "left", autoHeight: true } }),
    base({ id: zbNewId(), type: "text", x: 40, y: 142, w: 640, h: 48, name: "Подзаголовок", zIndex: 2, props: { content: "Краткое описание того, о чём этот раздел страницы", fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0, color: "#6b7280", textAlign: "left", autoHeight: true } }),
  ];
}

function heroElements(): ZbElement[] {
  return [
    base({ id: zbNewId(), type: "text", x: 40, y: 80, w: 660, h: 80, name: "Заголовок", zIndex: 1, props: { content: "Заголовок вашего сайта", fontFamily: "Inter, sans-serif", fontSize: 52, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.5, color: "#1a1a1a", textAlign: "left", autoHeight: true } }),
    base({ id: zbNewId(), type: "text", x: 40, y: 178, w: 540, h: 52, name: "Подзаголовок", zIndex: 2, props: { content: "Опишите ценность вашего продукта или услуги", fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0, color: "#64748b", textAlign: "left", autoHeight: true } }),
    base({ id: zbNewId(), type: "button", x: 40, y: 258, w: 210, h: 52, name: "CTA Кнопка", zIndex: 3, props: { text: "Начать бесплатно", link: "#", targetBlank: false, backgroundColor: "#f26b4f", textColor: "#ffffff", borderRadius: 8, fontSize: 16, fontWeight: 600, action: "link" } }),
    base({ id: zbNewId(), type: "image", x: 640, y: 60, w: 520, h: 360, name: "Фото героя", zIndex: 1, props: { src: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800", alt: "Hero image", objectFit: "cover", borderRadius: 12, lazyLoad: false } }),
  ];
}

function textImageElements(): ZbElement[] {
  return [
    base({ id: zbNewId(), type: "text", x: 40, y: 60, w: 500, h: 50, name: "Заголовок", zIndex: 1, props: { content: "О нашем продукте", fontFamily: "Inter, sans-serif", fontSize: 36, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, color: "#1a1a1a", textAlign: "left", autoHeight: true } }),
    base({ id: zbNewId(), type: "text", x: 40, y: 132, w: 500, h: 120, name: "Описание", zIndex: 2, props: { content: "Здесь расскажите подробнее о том, что делает ваш продукт уникальным. Опишите ключевые преимущества и то, как они решают задачи клиентов.", fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 400, lineHeight: 1.7, letterSpacing: 0, color: "#374151", textAlign: "left", autoHeight: true } }),
    base({ id: zbNewId(), type: "image", x: 620, y: 40, w: 540, h: 380, name: "Изображение", zIndex: 1, props: { src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800", alt: "Product image", objectFit: "cover", borderRadius: 8, lazyLoad: true } }),
  ];
}

function featuresElements(): ZbElement[] {
  const colW = 340;
  const gap = 30;
  const xs = [40, 40 + colW + gap, 40 + 2 * (colW + gap)];
  const labels = ["Быстро", "Надёжно", "Удобно"];
  const texts = [
    "Работает молниеносно, без задержек и лагов.",
    "Стабильная работа 24/7 без простоев.",
    "Интуитивный интерфейс — просто начните.",
  ];
  return xs.flatMap((x, i) => [
    base({ id: zbNewId(), type: "shape", x, y: 40, w: 48, h: 48, name: `Иконка ${i + 1}`, zIndex: i * 3 + 1, props: { shapeType: "circle", fill: "#fef0ec", borderRadius: 0 } }),
    base({ id: zbNewId(), type: "text", x, y: 106, w: colW, h: 30, name: labels[i], zIndex: i * 3 + 2, props: { content: labels[i], fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: 700, lineHeight: 1.3, letterSpacing: 0, color: "#1a1a1a", textAlign: "left", autoHeight: true } }),
    base({ id: zbNewId(), type: "text", x, y: 148, w: colW, h: 70, name: `Текст ${i + 1}`, zIndex: i * 3 + 3, props: { content: texts[i], fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0, color: "#6b7280", textAlign: "left", autoHeight: true } }),
  ]);
}

function ctaElements(): ZbElement[] {
  return [
    base({ id: zbNewId(), type: "text", x: 200, y: 80, w: 800, h: 60, name: "CTA Заголовок", zIndex: 1, props: { content: "Готовы начать? Это бесплатно.", fontFamily: "Inter, sans-serif", fontSize: 40, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, color: "#1a1a1a", textAlign: "center", autoHeight: true } }),
    base({ id: zbNewId(), type: "text", x: 300, y: 162, w: 600, h: 40, name: "CTA описание", zIndex: 2, props: { content: "Тысячи команд уже используют нашу платформу", fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 400, lineHeight: 1.5, letterSpacing: 0, color: "#64748b", textAlign: "center", autoHeight: true } }),
    base({ id: zbNewId(), type: "button", x: 490, y: 232, w: 220, h: 52, name: "CTA кнопка", zIndex: 3, props: { text: "Попробовать бесплатно", link: "#", targetBlank: false, backgroundColor: "#f26b4f", textColor: "#ffffff", borderRadius: 8, fontSize: 16, fontWeight: 600, action: "link" } }),
  ];
}

function galleryElements(): ZbElement[] {
  return [
    base({ id: zbNewId(), type: "text", x: 40, y: 30, w: 600, h: 48, name: "Заголовок галереи", zIndex: 1, props: { content: "Наши работы", fontFamily: "Inter, sans-serif", fontSize: 36, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, color: "#1a1a1a", textAlign: "left", autoHeight: true } }),
    base({ id: zbNewId(), type: "gallery", x: 40, y: 106, w: 1120, h: 400, name: "Галерея", zIndex: 2, props: { images: [], layout: "slider", lightbox: true, autoplay: false, arrows: true, autoplayInterval: 3000 } }),
  ];
}

function contactElements(): ZbElement[] {
  return [
    base({ id: zbNewId(), type: "text", x: 40, y: 40, w: 500, h: 48, name: "Заголовок формы", zIndex: 1, props: { content: "Свяжитесь с нами", fontFamily: "Inter, sans-serif", fontSize: 36, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, color: "#1a1a1a", textAlign: "left", autoHeight: true } }),
    base({ id: zbNewId(), type: "form", x: 40, y: 116, w: 500, h: 320, name: "Форма обратной связи", zIndex: 2, props: { fields: [{ id: zbNewId(), fieldType: "input", label: "Имя", required: true, placeholder: "Введите имя" }, { id: zbNewId(), fieldType: "input", label: "Email", required: true, placeholder: "email@example.com" }, { id: zbNewId(), fieldType: "input", label: "Сообщение", required: false, placeholder: "Ваш вопрос" }], submitText: "Отправить", successMessage: "Спасибо! Мы свяжемся с вами." } }),
    base({ id: zbNewId(), type: "image", x: 620, y: 40, w: 540, h: 400, name: "Фото контакты", zIndex: 1, props: { src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800", alt: "Contact", objectFit: "cover", borderRadius: 12, lazyLoad: true } }),
  ];
}

export const ZB_TEMPLATE_BLOCKS: ZbTemplateBlock[] = [
  { id: "tpl_title", name: "Заголовок", category: "Текст", elements: titleElements },
  { id: "tpl_hero", name: "Герой", category: "Страница", elements: heroElements },
  { id: "tpl_text_image", name: "Текст + Фото", category: "Страница", elements: textImageElements },
  { id: "tpl_features", name: "3 преимущества", category: "Страница", elements: featuresElements },
  { id: "tpl_cta", name: "Призыв к действию", category: "Страница", elements: ctaElements },
  { id: "tpl_gallery", name: "Галерея", category: "Медиа", elements: galleryElements },
  { id: "tpl_contact", name: "Форма контакта", category: "Интерактив", elements: contactElements },
];
