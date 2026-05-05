import { LEMNITY_ABOUT_BLOCK_VARIANTS } from "@/components/playground/lemnity-box/lemnity-box-about-blocks-content";
import { LEMNITY_BASIC_WIDGET_BLOCK_VARIANTS, LEMNITY_ACCORDION_LIBRARY_BASIC_WIDGET_VARIANTS } from "@/components/playground/lemnity-box/lemnity-box-basic-widgets-blocks-content";
import { LEMNITY_ACCORDION_BLOCK_VARIANTS } from "@/components/playground/lemnity-box/lemnity-box-accordion-blocks-content";
import { LEMNITY_BUTTON_BLOCK_VARIANTS } from "@/components/playground/lemnity-box/lemnity-box-button-blocks-content";
import { LEMNITY_CONTACT_BLOCK_VARIANTS } from "@/components/playground/lemnity-box/lemnity-box-contact-blocks-content";
import { LEMNITY_FORM_BLOCK_VARIANTS } from "@/components/playground/lemnity-box/lemnity-box-form-blocks-content";
import { LEMNITY_HEADER_BLOCK_VARIANTS } from "@/components/playground/lemnity-box/lemnity-box-header-blocks-content";
import { TILDA_COVER_PICKER_ITEMS } from "@/components/playground/lemnity-box/lemnity-box-tilda-cover-blocks";
import { LEMNITY_LIST_BLOCK_VARIANTS } from "@/components/playground/lemnity-box/lemnity-box-list-blocks-content";
import { LEMNITY_SHOP_BLOCK_VARIANTS } from "@/components/playground/lemnity-box/lemnity-box-shop-blocks-content";
import { LEMNITY_TEAM_BLOCK_VARIANTS } from "@/components/playground/lemnity-box/lemnity-box-team-blocks-content";

/**
 * Варианты визуальных блоков для боковой «библиотеки» (как в Tilda).
 * Ключ = id блока в BlockManager встроенного редактора Lemnity Box.
 */
export type LemnityBoxLibraryVariant = {
  id: string;
  badge: string;
  title: string;
  hint?: string;
  /** Контент для вставки на холст (как у Block.content) */
  content: string;
  /** Доп. стили только для iframe-превью (добавляются в head снимка) */
  previewCss?: string;
};

function coverPickerItemToVariant(item: (typeof TILDA_COVER_PICKER_ITEMS)[number]): LemnityBoxLibraryVariant {
  const sep = " · ";
  const i = item.label.indexOf(sep);
  if (i === -1) {
    return {
      id: item.id,
      badge: "AB01",
      title: item.label,
      hint: "упрощённый первый экран",
      content: item.content,
    };
  }
  return {
    id: item.id,
    badge: item.label.slice(0, i).trim(),
    title: item.label.slice(i + sep.length).trim(),
    content: item.content,
  };
}

export type LemnityBoxBlockLibraryEntry = {
  blockId: string;
  /** Заголовок панели */
  flyoutTitle: string;
  variants: LemnityBoxLibraryVariant[];
};

/** Обложки (CR) + простые первые экраны — всё в одной библиотеке «Главный экран». */
const LANDING_HERO_EXTRA_VARIANTS: LemnityBoxLibraryVariant[] = [
  {
    id: "hero-ab101",
    badge: "AB101",
    title: "Минимальный экран",
    hint: "заголовок и короткий текст",
    content: `<section class="lemnity-section" style="margin:0;padding:72px 24px;text-align:center;background:#f0f0f0;font-family:system-ui,sans-serif;color:#111;">
  <h1 style="margin:0 0 16px;font-size:42px;font-weight:700;line-height:1.1;">Сильный заголовок</h1>
  <p style="margin:0 auto;max-width:520px;font-size:18px;line-height:1.5;color:#444;">Краткое описание продукта или услуги без отвлечений.</p>
</section>`,
  },
  {
    id: "hero-ab102",
    badge: "AB102",
    title: "Текст и кнопка",
    hint: "опционально: кнопка",
    content: `<section class="lemnity-section" style="margin:0;padding:64px 24px;background:#fafafa;font-family:system-ui,sans-serif;color:#111;">
  <h2 style="margin:0 0 12px;font-size:32px;font-weight:700;text-align:center;">О наших занятиях</h2>
  <p style="margin:0 auto 24px;max-width:560px;font-size:16px;line-height:1.6;text-align:center;color:#555;">Короткий абзац с деталями предложения.</p>
  <div style="text-align:center;">
    <a href="#" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Подробнее</a>
  </div>
</section>`,
  },
  {
    id: "hero-ab103",
    badge: "AB103",
    title: "Надзаголовок и фон",
    hint: "опционально: кнопка",
    content: `<section class="lemnity-section" style="margin:0;padding:80px 24px;background:linear-gradient(135deg,#1d4ed8,#0ea5e9);font-family:system-ui,sans-serif;color:#fff;">
  <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;text-align:center;">курс / продукт</p>
  <h2 style="margin:0 0 16px;font-size:36px;font-weight:800;text-align:center;line-height:1.15;">О наших занятиях</h2>
  <p style="margin:0 auto;max-width:560px;font-size:17px;line-height:1.65;text-align:center;opacity:0.95;">Длиннее описание с акцентом на выгоды и атмосферу.</p>
</section>`,
  },
];

export const LEMNITY_BOX_BLOCK_LIBRARIES: Record<string, LemnityBoxBlockLibraryEntry> = {
  "landing-hero": {
    blockId: "landing-hero",
    flyoutTitle: "Главный экран",
    variants: [...TILDA_COVER_PICKER_ITEMS.map(coverPickerItemToVariant), ...LANDING_HERO_EXTRA_VARIANTS],
  },
  "lemnity-header": {
    blockId: "lemnity-header",
    flyoutTitle: "Шапка и меню",
    variants: [...LEMNITY_HEADER_BLOCK_VARIANTS],
  },
  "lemnity-buttons": {
    blockId: "lemnity-buttons",
    flyoutTitle: "Кнопки",
    variants: [...LEMNITY_BUTTON_BLOCK_VARIANTS],
  },
  "lemnity-about": {
    blockId: "lemnity-about",
    flyoutTitle: "О нас",
    variants: [...LEMNITY_ABOUT_BLOCK_VARIANTS],
  },
  "text-section": {
    blockId: "text-section",
    flyoutTitle: "Текст",
    variants: [
      {
        id: "txt-a",
        badge: "TX01",
        title: "Две колонки текста",
        hint: "для сравнения или списков",
        content: `<section class="lemnity-section" style="margin:0;padding:56px 24px;font-family:system-ui,sans-serif;color:#111;background:#fff;">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;max-width:960px;margin:0 auto;">
    <div>
      <h3 style="margin:0 0 12px;font-size:22px;font-weight:700;">Пункт один</h3>
      <p style="margin:0;font-size:15px;line-height:1.65;color:#444;">Краткий абзац с пояснением.</p>
    </div>
    <div>
      <h3 style="margin:0 0 12px;font-size:22px;font-weight:700;">Пункт два</h3>
      <p style="margin:0;font-size:15px;line-height:1.65;color:#444;">Второй абзац для баланса.</p>
    </div>
  </div>
</section>`,
      },
      {
        id: "txt-b",
        badge: "TX02",
        title: "Цитата и подпись",
        hint: "акцент на отзыв или тезис",
        content: `<section class="lemnity-section" style="margin:0;padding:64px 24px;background:#f8fafc;font-family:system-ui,sans-serif;">
  <blockquote style="margin:0 auto;max-width:720px;padding:0;border:0;text-align:center;">
    <p style="margin:0;font-size:22px;line-height:1.5;font-weight:600;color:#0f172a;">«Команда закрыла задачу быстрее, чем мы ожидали»</p>
    <footer style="margin-top:16px;font-size:14px;color:#64748b;">— Имя, роль</footer>
  </blockquote>
</section>`,
      },
    ],
  },
  "lemnity-list": {
    blockId: "lemnity-list",
    flyoutTitle: "Список",
    variants: [...LEMNITY_LIST_BLOCK_VARIANTS],
  },
  "lemnity-team": {
    blockId: "lemnity-team",
    flyoutTitle: "Команда",
    variants: [...LEMNITY_TEAM_BLOCK_VARIANTS],
  },
  "lemnity-contacts": {
    blockId: "lemnity-contacts",
    flyoutTitle: "Контакты",
    variants: [...LEMNITY_CONTACT_BLOCK_VARIANTS],
  },
  "lemnity-forms": {
    blockId: "lemnity-forms",
    flyoutTitle: "Формы",
    variants: [...LEMNITY_FORM_BLOCK_VARIANTS],
  },
  "lemnity-shop": {
    blockId: "lemnity-shop",
    flyoutTitle: "Магазин",
    variants: [...LEMNITY_SHOP_BLOCK_VARIANTS],
  },
  "lemnity-accordion": {
    blockId: "lemnity-accordion",
    flyoutTitle: "Аккордеон",
    variants: [...LEMNITY_ACCORDION_BLOCK_VARIANTS, ...LEMNITY_ACCORDION_LIBRARY_BASIC_WIDGET_VARIANTS],
  },
  "lemnity-basic-widgets": {
    blockId: "lemnity-basic-widgets",
    flyoutTitle: "Базовые виджеты",
    variants: [...LEMNITY_BASIC_WIDGET_BLOCK_VARIANTS],
  },
  "lemnity-more": {
    blockId: "lemnity-more",
    flyoutTitle: "Ещё",
    variants: [
      {
        id: "more-html-section",
        badge: "HTML",
        title: "HTML-секция",
        hint: "свой HTML/CSS/JS, см. «Настройка» у блока",
        content: `<section class="lemnity-section" data-gjs-name="HTML-секция"><div data-ln-editor-hint="1" role="note" style="display:flex;align-items:center;gap:12px;padding:12px 14px;margin:0 0 14px;border-radius:10px;background:#ecfdf5;border:1px solid #6ee7b7;color:#334155;font-size:13px;line-height:1.5;font-family:system-ui,sans-serif"><span aria-hidden="true" style="flex-shrink:0;width:42px;height:42px;border-radius:999px;background:#fff;border:1px solid #a7f3d0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:#0f172a">&lt;HTML&gt;</span><span>Код будет выполнен на опубликованной странице. Чтобы добавить свой код нажмите на Настройка</span></div><div data-ln-html-embed="1" class="lemnity-html-root"></div></section>`,
      },
      {
        id: "more-catalog-hint",
        badge: "Ещё",
        title: "Подсказка по каталогу",
        hint: "раздел для дополнительных макетов",
        content: `<section class="lemnity-section" style="margin:0;padding:48px 24px;text-align:center;background:#f8fafc;font-family:system-ui,sans-serif;color:#334155;">
  <p style="margin:0 auto;max-width:560px;font-size:15px;line-height:1.6;font-weight:400;">Здесь собираем редкие и экспериментальные секции. Основные паттерны — в категориях слева: для типового FAQ используйте блок <strong>«Аккордеон»</strong>; для первого экрана — <strong>«Главный экран»</strong>.</p>
</section>`,
      },
    ],
  },
};
