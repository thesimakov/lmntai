/**
 * Аккордеон для холста Lemnity Box: нативные <details>/<summary> — раскрытие без jQuery/Bootstrap в iframe редактора.
 * В зеркале wpriver FAQ использует Bootstrap .collapse (см. index.html); здесь — автономный шаблон под те же вопросы.
 */

export const LEMNITY_ACCORDION_PREVIEW_CSS = `
.lemnity-acc-wrap{max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
.lemnity-acc__item{border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,0.04);}
.lemnity-acc__item summary{list-style:none;cursor:pointer;padding:16px 44px 16px 18px;font-weight:700;color:#0f172a;font-size:16px;line-height:1.35;position:relative;}
.lemnity-acc__item summary::-webkit-details-marker{display:none;}
.lemnity-acc__item summary::after{content:"";position:absolute;right:18px;top:50%;width:8px;height:8px;border-right:2px solid #1e3a5f;border-bottom:2px solid #1e3a5f;transform:translateY(-65%) rotate(45deg);transition:transform 0.22s ease;}
.lemnity-acc__item[open] summary::after{transform:translateY(-35%) rotate(-135deg);}
.lemnity-acc__panel{padding:0 18px 18px;color:#475569;font-size:15px;line-height:1.65;border-top:1px solid #f1f5f9;}
.lemnity-acc__panel p{margin:14px 0 0;}
`;

export const LEMNITY_ACCORDION_BLOCK_VARIANTS = [
  {
    id: "acc-faq-analytics-ru",
    badge: "AC01",
    title: "Аккордеон FAQ",
    hint: "Три вопроса, раскрытие по клику",
    previewCss: LEMNITY_ACCORDION_PREVIEW_CSS,
    content: `<section class="lemnity-section lemnity-accordion-bundle" style="margin:0;padding:56px 24px;background:#fafafa;">
<style>
.lemnity-acc-wrap{max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
.lemnity-acc__item{border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,0.04);}
.lemnity-acc__item summary{list-style:none;cursor:pointer;padding:16px 44px 16px 18px;font-weight:700;color:#0f172a;font-size:16px;line-height:1.35;position:relative;}
.lemnity-acc__item summary::-webkit-details-marker{display:none;}
.lemnity-acc__item summary::after{content:"";position:absolute;right:18px;top:50%;width:8px;height:8px;border-right:2px solid #1e3a5f;border-bottom:2px solid #1e3a5f;transform:translateY(-65%) rotate(45deg);transition:transform 0.22s ease;}
.lemnity-acc__item[open] summary::after{transform:translateY(-35%) rotate(-135deg);}
.lemnity-acc__panel{padding:0 18px 18px;color:#475569;font-size:15px;line-height:1.65;border-top:1px solid #f1f5f9;}
.lemnity-acc__panel p{margin:14px 0 0;}
@media (prefers-reduced-motion: reduce){.lemnity-acc__item summary::after{transition:none;}}
</style>
<div class="lemnity-acc-wrap">
  <details class="lemnity-acc__item lemnity-details-widget" open>
    <summary>Где я могу получить помощь по аналитике?</summary>
    <div class="lemnity-acc__panel"><p>Напишите через форму на сайте или в чат поддержки: поможем подключить счётчик, настроить цели и события, проверить качество данных и разобрать отчёты. При необходимости проведём короткую сессию с вашим маркетологом или разработчиком.</p></div>
  </details>
  <details class="lemnity-acc__item lemnity-details-widget">
    <summary>Сколько стоит аналитика данных?</summary>
    <div class="lemnity-acc__panel"><p>Стоимость зависит от числа источников, глубины отчётности и формата сопровождения. После брифа фиксируем объём работ и условия — без скрытых платежей за базовые отчёты.</p></div>
  </details>
  <details class="lemnity-acc__item lemnity-details-widget">
    <summary>Какие данные необходимы для анализа?</summary>
    <div class="lemnity-acc__panel"><p>Чаще всего — события с сайта или приложения, данные рекламных кабинетов и при необходимости выгрузки из CRM. Персональные данные собираем только при наличии правового основания. Перечень согласуем до старта под ваши KPI.</p></div>
  </details>
</div>
</section>`,
  },
];
