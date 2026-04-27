/**
 * Правила футера сгенерированного макета (бренд Lemnity, дата сборки, политика).
 * Согласовано с пожеланием: нижняя полоса как у классического marketing footer.
 */

export const PROMPT_SITE_FOOTER_RULES_EN =
  "Footer (when the page includes a site footer / bottom bar): use `<footer>` with an inner wrapper (e.g. `max-w-6xl mx-auto px-4` or `container`) and a row `div.footer-bottom` with `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`. **Left:** `© {currentYear} {brand or product name}` and the rights line in the user’s language; add a «Политика конфиденциальности» (or English equivalent) link with `href=\"#\"` and an HTML comment `<!-- privacy policy URL TBD -->`. **Right:** a **build date** line, e.g. `Собрано:` + `new Date().toLocaleDateString(..., { dateStyle: 'short' })` in the React component; then **«Сделано на Lemnity»** linking to `https://lemnity.com` with `target=\"_blank\"` and `rel=\"noopener noreferrer\"`. You may add a brief additional legal line in the user’s language in the right cluster if it fits. If you include a full footer, do not skip the Lemnity credit and the privacy link placeholder.";
