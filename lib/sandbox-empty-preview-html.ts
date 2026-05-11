/**
 * Документ для iframe `/api/sandbox/...`, пока в песочнице ещё нет `index.html`.
 * Короткий анимированный экран → затем постоянный лоадер до подмены ответа на реальный HTML.
 */
export const SANDBOX_EMPTY_PREVIEW_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>Превью</title>
<style>
  :root {
    --bg0: #0c0c0f;
    --bg1: #14141a;
    --fg: rgba(250,250,252,.88);
    --muted: rgba(250,250,252,.38);
    --accent: #a855f7;
    --accent2: #ec4899;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--bg0);
    color: var(--fg);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .wrap {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(ellipse 80% 58% at 50% -12%, rgba(168,85,247,.28), transparent 55%),
      radial-gradient(ellipse 70% 50% at 100% 100%, rgba(236,72,153,.14), transparent 50%),
      linear-gradient(180deg, var(--bg0), var(--bg1));
  }
  /* --- splash --- */
  .splash {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.25rem;
    animation: splashFade 2.4s cubic-bezier(.4,0,.2,1) forwards;
  }
  .orbits {
    position: relative;
    width: min(72vw, 200px);
    height: min(72vw, 200px);
  }
  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid rgba(168,85,247,.35);
    animation: spin 12s linear infinite;
  }
  .ring:nth-child(2) {
    inset: 14%;
    border-color: rgba(236,72,153,.28);
    animation-duration: 7s;
    animation-direction: reverse;
  }
  .ring:nth-child(3) {
    inset: 28%;
    border-color: rgba(250,250,252,.08);
    animation-duration: 18s;
  }
  .core {
    position: absolute;
    left: 50%; top: 50%;
    width: 12px; height: 12px;
    margin: -6px 0 0 -6px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    box-shadow: 0 0 24px rgba(168,85,247,.55);
    animation: pulse 1.6s ease-in-out infinite;
  }
  .grid {
    position: absolute;
    inset: 0;
    opacity: .16;
    background-image:
      linear-gradient(rgba(250,250,252,.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(250,250,252,.06) 1px, transparent 1px);
    background-size: 24px 24px;
    mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent);
    pointer-events: none;
  }
  .label {
    font-size: 13px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--muted);
    animation: labelShimmer 2s ease-in-out infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.15); opacity: .85; }
  }
  @keyframes labelShimmer {
    0%, 100% { opacity: .45; }
    50% { opacity: 1; }
  }
  @keyframes splashFade {
    0%, 72% { opacity: 1; visibility: visible; }
    100% { opacity: 0; visibility: hidden; }
  }
  /* --- persistent loader --- */
  .loader {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    opacity: 0;
    animation: loaderIn .55s ease-out 2.05s forwards;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid rgba(250,250,252,.12);
    border-top-color: var(--accent);
    animation: spin 0.95s linear infinite;
  }
  .hint {
    font-size: 13px;
    color: var(--muted);
    letter-spacing: .02em;
  }
  @keyframes loaderIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .splash, .loader { animation: none !important; }
    .splash { opacity: 0; visibility: hidden; }
    .loader { opacity: 1; transform: none; }
    .ring, .core, .spinner { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
    .label { animation: none; opacity: .7; }
  }
</style>
</head>
<body>
  <div class="wrap" role="status" aria-live="polite" aria-busy="true">
    <div class="grid" aria-hidden="true"></div>
    <div class="splash">
      <div class="orbits" aria-hidden="true">
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="core"></div>
      </div>
      <div class="label">Lemnity AI</div>
    </div>
    <div class="loader">
      <div class="spinner" aria-hidden="true"></div>
      <span class="hint">Готовим превью…</span>
    </div>
  </div>
</body>
</html>`;
