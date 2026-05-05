/**
 * Секции «Шапка и меню»: адаптивные навбары с анимацией появления и hover по ссылкам.
 * Логотип по умолчанию — `/logo-w.svg` (белый); на светлом фоне секция с классом
 * `lemnity-hdr-s--logo-dark` даёт чёрный силуэт через filter (удобно заменить src в GJS).
 * На узких экранах — бургер и раскрывающееся меню (checkbox + label).
 */

/** Публичный SVG Lemnity; в GrapesJS можно заменить через двойной клик или медиатеку. */
export const LEMNITY_HEADER_LOGO_DEFAULT_SRC = "/logo-w.svg";

function hdrLogoImg(): string {
  return `<img class="lemnity-hdr-logo" src="${LEMNITY_HEADER_LOGO_DEFAULT_SRC}" alt="Lemnity" data-gjs-name="Логотип"/>`;
}

const HDR_CORE = `
.lemnity-hdr-s,.lemnity-hdr-s *{box-sizing:border-box}
.lemnity-hdr-s .lemnity-hdr-logo{display:block;height:clamp(24px,3.8vw,32px);width:auto;max-width:min(220px,52vw);object-fit:contain;transition:opacity .2s ease,transform .2s ease}
.lemnity-hdr-s a.hdr-brand--logo{display:inline-flex;align-items:center;line-height:0}
.lemnity-hdr-s a.hdr-brand--logo:hover .lemnity-hdr-logo{opacity:.9;transform:scale(1.02)}
.lemnity-hdr-s--logo-dark .lemnity-hdr-logo{filter:brightness(0)}
@keyframes lemnity-hdr-in{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes lemnity-hdr-link{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.lemnity-hdr-s .hdr-anim{animation:lemnity-hdr-in .55s cubic-bezier(0.22,1,0.36,1) both}
.lemnity-hdr-s .hdr-nav a,.lemnity-hdr-s .hdr-nav button{animation:lemnity-hdr-link .45s cubic-bezier(0.22,1,0.36,1) both}
.lemnity-hdr-s .hdr-nav a:nth-child(1){animation-delay:35ms}
.lemnity-hdr-s .hdr-nav a:nth-child(2){animation-delay:80ms}
.lemnity-hdr-s .hdr-nav a:nth-child(3){animation-delay:125ms}
.lemnity-hdr-s .hdr-nav a:nth-child(4){animation-delay:170ms}
.lemnity-hdr-s .hdr-nav a:nth-child(5){animation-delay:215ms}
.lemnity-hdr-s .hdr-nav a:nth-child(6){animation-delay:260ms}
@media (prefers-reduced-motion:reduce){
  .lemnity-hdr-s .hdr-anim,.lemnity-hdr-s .hdr-nav a{animation:none!important;opacity:1!important;transform:none!important}
}
.lemnity-hdr-s .hdr-skip{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;

function styleV1(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-a{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a}
.lemnity-hdr-s.hdr-a .hdr-shell{background:#fff;border-bottom:1px solid #e2e8f0}
.lemnity-hdr-s.hdr-a .hdr-row{max-width:1120px;margin:0 auto;padding:14px clamp(16px,4vw,24px);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-a .hdr-cb{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.lemnity-hdr-s.hdr-a .hdr-burger{display:none;flex-direction:column;justify-content:center;gap:5px;cursor:pointer;padding:10px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;transition:background .2s ease,box-shadow .2s ease}
.lemnity-hdr-s.hdr-a .hdr-burger:hover{background:#f8fafc;box-shadow:0 2px 8px rgba(15,23,42,.08)}
.lemnity-hdr-s.hdr-a .hdr-burger span{display:block;width:22px;height:2px;background:#0f172a;border-radius:1px;transition:transform .28s ease,opacity .2s ease}
.lemnity-hdr-s.hdr-a .hdr-nav{display:flex;align-items:center;gap:8px 26px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-a .hdr-nav a{color:#475569;text-decoration:none;font-weight:600;font-size:.9375rem;position:relative;transition:color .2s ease}
.lemnity-hdr-s.hdr-a .hdr-nav a::after{content:"";position:absolute;left:0;bottom:-5px;width:100%;height:2px;background:linear-gradient(90deg,#6366f1,#8b5cf6);transform:scaleX(0);transform-origin:left;transition:transform .28s ease}
.lemnity-hdr-s.hdr-a .hdr-nav a:hover{color:#0f172a}
.lemnity-hdr-s.hdr-a .hdr-nav a:hover::after{transform:scaleX(1)}
@media (max-width:767px){
  .lemnity-hdr-s.hdr-a .hdr-burger{display:flex;margin-left:auto}
  .lemnity-hdr-s.hdr-a .hdr-nav{display:none;width:100%;flex-direction:column;align-items:stretch;gap:0;padding:8px 0 4px;border-top:1px solid #f1f5f9;margin-top:4px}
  .lemnity-hdr-s.hdr-a .hdr-nav a{padding:14px 4px;border-bottom:1px solid #f1f5f9;font-size:1rem}
  .lemnity-hdr-s.hdr-a .hdr-nav a::after{display:none}
  .lemnity-hdr-s.hdr-a .hdr-cb:checked~.hdr-nav{display:flex}
  .lemnity-hdr-s.hdr-a .hdr-cb:checked+.hdr-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lemnity-hdr-s.hdr-a .hdr-cb:checked+.hdr-burger span:nth-child(2){opacity:0}
  .lemnity-hdr-s.hdr-a .hdr-cb:checked+.hdr-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
</style>`;
}

function styleV2(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-b{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff}
.lemnity-hdr-s.hdr-b .hdr-shell{background:#dc2626;box-shadow:0 4px 20px rgba(220,38,38,.35)}
.lemnity-hdr-s.hdr-b .hdr-row{max-width:1120px;margin:0 auto;padding:12px clamp(16px,4vw,22px);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-b .hdr-cb{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.lemnity-hdr-s.hdr-b .hdr-burger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12)}
.lemnity-hdr-s.hdr-b .hdr-burger span{display:block;width:22px;height:2px;background:#fff;border-radius:1px;transition:transform .28s ease,opacity .2s ease}
.lemnity-hdr-s.hdr-b .hdr-nav{display:flex;align-items:center;gap:10px 22px;flex-wrap:wrap;justify-content:flex-end;flex:1}
.lemnity-hdr-s.hdr-b .hdr-nav a{color:#fff;text-decoration:none;font-weight:600;font-size:.9rem;opacity:.95;transition:opacity .2s ease,transform .2s ease,text-shadow .2s ease}
.lemnity-hdr-s.hdr-b .hdr-nav a:hover{opacity:1;transform:translateY(-2px);text-shadow:0 2px 12px rgba(0,0,0,.2)}
@media (max-width:767px){
  .lemnity-hdr-s.hdr-b .hdr-burger{display:flex;margin-left:auto}
  .lemnity-hdr-s.hdr-b .hdr-nav{display:none;width:100%;flex-direction:column;align-items:stretch;padding:10px 0 4px;border-top:1px solid rgba(255,255,255,.25)}
  .lemnity-hdr-s.hdr-b .hdr-nav a{padding:12px 2px;font-size:1rem;border-bottom:1px solid rgba(255,255,255,.15)}
  .lemnity-hdr-s.hdr-b .hdr-cb:checked~.hdr-nav{display:flex}
  .lemnity-hdr-s.hdr-b .hdr-cb:checked+.hdr-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lemnity-hdr-s.hdr-b .hdr-cb:checked+.hdr-burger span:nth-child(2){opacity:0}
  .lemnity-hdr-s.hdr-b .hdr-cb:checked+.hdr-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
</style>`;
}

function styleV3(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-c{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#fff}
.lemnity-hdr-s.hdr-c .hdr-shell{border-bottom:1px solid #e2e8f0}
.lemnity-hdr-s.hdr-c .hdr-cb{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.lemnity-hdr-s.hdr-c .hdr-burger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:10px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;align-self:center}
.lemnity-hdr-s.hdr-c .hdr-burger span{display:block;width:22px;height:2px;background:#0f172a;border-radius:1px;transition:transform .28s ease,opacity .2s ease}
.lemnity-hdr-s.hdr-c .hdr-grid{max-width:1100px;margin:0 auto;padding:16px clamp(16px,4vw,24px);display:grid;grid-template-columns:1fr auto 1fr;grid-template-areas:"left brand right";align-items:center;column-gap:20px;row-gap:12px}
.lemnity-hdr-s.hdr-c .hdr-desk-left{grid-area:left;justify-self:start;display:flex;flex-wrap:wrap;gap:18px}
.lemnity-hdr-s.hdr-c .hdr-desk-right{grid-area:right;justify-self:end;display:flex;flex-wrap:wrap;gap:18px;justify-content:flex-end}
.lemnity-hdr-s.hdr-c .hdr-brand{grid-area:brand;justify-self:center;line-height:0}
.lemnity-hdr-s.hdr-c .hdr-nav a{color:#334155;text-decoration:none;font-weight:600;font-size:.9rem;transition:color .2s ease}
.lemnity-hdr-s.hdr-c .hdr-nav a:hover{color:#0f172a}
.lemnity-hdr-s.hdr-c .hdr-mobile-nav{grid-area:menu;display:none;flex-direction:column;width:100%;overflow:hidden;max-height:0;opacity:0;padding-top:0;border-top:0;margin:0;transition:max-height .42s ease,opacity .3s ease,padding-top .3s ease,border-width .3s ease}
@media (max-width:840px){
  .lemnity-hdr-s.hdr-c .hdr-grid{grid-template-columns:1fr auto;grid-template-areas:"brand burger" "menu menu"}
  .lemnity-hdr-s.hdr-c .hdr-desk-left,.lemnity-hdr-s.hdr-c .hdr-desk-right{display:none!important}
  .lemnity-hdr-s.hdr-c .hdr-brand{grid-area:brand;justify-self:start}
  .lemnity-hdr-s.hdr-c .hdr-burger{display:flex;grid-area:burger;justify-self:end}
  .lemnity-hdr-s.hdr-c .hdr-mobile-nav{display:flex;grid-area:menu}
  .lemnity-hdr-s.hdr-c .hdr-cb:checked~.hdr-mobile-nav{max-height:360px;opacity:1;padding-top:12px;margin-top:8px;border-top:1px solid #f1f5f9}
  .lemnity-hdr-s.hdr-c .hdr-mobile-nav a{padding:12px 4px;border-bottom:1px solid #f8fafc;text-align:center}
  .lemnity-hdr-s.hdr-c .hdr-cb:checked+.hdr-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lemnity-hdr-s.hdr-c .hdr-cb:checked+.hdr-burger span:nth-child(2){opacity:0}
  .lemnity-hdr-s.hdr-c .hdr-cb:checked+.hdr-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
</style>`;
}

function styleV4(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-d{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff}
.lemnity-hdr-s.hdr-d .hdr-shell{background:linear-gradient(180deg,#2563eb 0%,#1d4ed8 100%);border-radius:0 0 20px 20px;box-shadow:0 12px 40px rgba(37,99,235,.35)}
.lemnity-hdr-s.hdr-d .hdr-row{max-width:1120px;margin:0 auto;padding:16px clamp(16px,4vw,28px) 18px;display:flex;align-items:center;justify-content:flex-start;gap:16px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-d .hdr-brand-wrap{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;transition:opacity .2s ease;line-height:0}
.lemnity-hdr-s.hdr-d .hdr-brand-wrap:hover{opacity:.92}
.lemnity-hdr-s.hdr-d .hdr-cb{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.lemnity-hdr-s.hdr-d .hdr-burger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12)}
.lemnity-hdr-s.hdr-d .hdr-burger span{display:block;width:22px;height:2px;background:#fff;border-radius:1px;transition:transform .28s ease,opacity .2s ease}
.lemnity-hdr-s.hdr-d .hdr-nav{display:flex;align-items:center;gap:10px 24px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-d .hdr-nav a{color:rgba(255,255,255,.95);text-decoration:none;font-weight:600;font-size:.9rem;transition:color .2s ease,transform .2s ease}
.lemnity-hdr-s.hdr-d .hdr-nav a:hover{color:#fff;transform:translateY(-2px)}
.lemnity-hdr-s.hdr-d .hdr-cta{margin-left:8px;padding:10px 22px;border-radius:999px;background:#fff;color:#1d4ed8;font-weight:700;font-size:.875rem;text-decoration:none;transition:transform .22s ease,box-shadow .22s ease,background .2s ease}
.lemnity-hdr-s.hdr-d .hdr-cta:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 8px 24px rgba(0,0,0,.12);background:#f8fafc}
.lemnity-hdr-s.hdr-d .hdr-nav-wrap{display:flex;flex:1;align-items:center;justify-content:flex-end;gap:16px;flex-wrap:wrap}
@media (max-width:767px){
  .lemnity-hdr-s.hdr-d .hdr-burger{display:flex;margin-left:auto}
  .lemnity-hdr-s.hdr-d .hdr-nav-wrap{display:none;width:100%;flex-direction:column;align-items:stretch;gap:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.25)}
  .lemnity-hdr-s.hdr-d .hdr-nav{flex-direction:column;align-items:stretch}
  .lemnity-hdr-s.hdr-d .hdr-cta{text-align:center;margin-left:0}
  .lemnity-hdr-s.hdr-d .hdr-cb:checked~.hdr-nav-wrap{display:flex}
  .lemnity-hdr-s.hdr-d .hdr-cb:checked+.hdr-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lemnity-hdr-s.hdr-d .hdr-cb:checked+.hdr-burger span:nth-child(2){opacity:0}
  .lemnity-hdr-s.hdr-d .hdr-cb:checked+.hdr-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
</style>`;
}

const ICON_SOCIAL = {
  fb: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.8 21v-8.2H7V9.3h2.8V7.2C9.8 4.1 11.6 2.6 14.4 2.6c1.3 0 2.5.1 2.8.2v3h1.9c-1.5 0-1.8.9-1.8 2.1V9.3H19l-.4 3.5h-2.9V21"/></svg>',
  tw: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 3H21l-7.6 8.7L22 21h-6.4l-5-6.5L5.4 21H3l8.2-9.4L2 3h6.5l4.5 5.9L18.9 3z"/></svg>',
  ig: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H7zm5 3.5A3.5 3.5 0 1015.5 12 3.5 3.5 0 0012 7.5zM17.5 6a1.5 1.5 0 11-1.5 1.5 1.5 1.5 0 011.5-1.5z"/></svg>',
};

function styleV5(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-e{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a}
.lemnity-hdr-s.hdr-e .hdr-shell{background:#fff;border-bottom:1px solid #e5e7eb}
.lemnity-hdr-s.hdr-e .hdr-row{max-width:1140px;margin:0 auto;padding:14px clamp(16px,4vw,26px);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-e .hdr-cb{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.lemnity-hdr-s.hdr-e .hdr-burger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
.lemnity-hdr-s.hdr-e .hdr-burger span{display:block;width:22px;height:2px;background:#0f172a;border-radius:1px;transition:transform .28s ease,opacity .2s ease}
.lemnity-hdr-s.hdr-e .hdr-mid{display:flex;align-items:center;gap:clamp(12px,3vw,28px);flex-wrap:wrap;flex:1;justify-content:center}
.lemnity-hdr-s.hdr-e .hdr-nav{display:flex;gap:18px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-e .hdr-nav a{color:#374151;text-decoration:none;font-weight:600;font-size:.9rem;transition:color .2s ease}
.lemnity-hdr-s.hdr-e .hdr-nav a:hover{color:#0f172a}
.lemnity-hdr-s.hdr-e .hdr-phone{font-weight:700;font-size:.9rem;color:#0f172a;white-space:nowrap}
.lemnity-hdr-s.hdr-e .hdr-soc{display:flex;gap:8px;align-items:center}
.lemnity-hdr-s.hdr-e .hdr-soc a{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#0f172a;color:#fff;text-decoration:none;transition:transform .22s ease,box-shadow .22s ease}
.lemnity-hdr-s.hdr-e .hdr-soc a:hover{transform:translateY(-3px);box-shadow:0 6px 16px rgba(15,23,42,.25)}
@media (max-width:767px){
  .lemnity-hdr-s.hdr-e .hdr-burger{display:flex}
  .lemnity-hdr-s.hdr-e .hdr-mid{display:none;width:100%;flex-direction:column;align-items:stretch;padding-top:12px;border-top:1px solid #f1f5f9}
  .lemnity-hdr-s.hdr-e .hdr-nav{flex-direction:column;gap:0}
  .lemnity-hdr-s.hdr-e .hdr-nav a{padding:12px 4px;border-bottom:1px solid #f8fafc}
  .lemnity-hdr-s.hdr-e .hdr-soc{justify-content:center;padding:8px 0}
  .lemnity-hdr-s.hdr-e .hdr-cb:checked~.hdr-mid{display:flex}
  .lemnity-hdr-s.hdr-e .hdr-cb:checked+.hdr-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lemnity-hdr-s.hdr-e .hdr-cb:checked+.hdr-burger span:nth-child(2){opacity:0}
  .lemnity-hdr-s.hdr-e .hdr-cb:checked+.hdr-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
</style>`;
}

function styleV6(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-f{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#fff}
.lemnity-hdr-s.hdr-f .hdr-shell{border-bottom:1px solid #e5e7eb}
.lemnity-hdr-s.hdr-f .hdr-row{max-width:1120px;margin:0 auto;padding:12px clamp(16px,4vw,24px);display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-f .hdr-logo{display:flex;align-items:center;line-height:0;text-decoration:none;color:inherit}
.lemnity-hdr-s.hdr-f .hdr-cb{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.lemnity-hdr-s.hdr-f .hdr-burger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;margin-left:auto}
.lemnity-hdr-s.hdr-f .hdr-burger span{display:block;width:22px;height:2px;background:#0f172a;border-radius:1px;transition:transform .28s ease,opacity .2s ease}
.lemnity-hdr-s.hdr-f .hdr-nav{display:flex;align-items:center;gap:8px 20px;flex-wrap:wrap;justify-content:center;flex:1}
.lemnity-hdr-s.hdr-f .hdr-nav a{color:#475569;text-decoration:none;font-weight:600;font-size:.92rem;transition:color .2s ease}
.lemnity-hdr-s.hdr-f .hdr-nav a:hover{color:#2563eb}
.lemnity-hdr-s.hdr-f .hdr-tools{display:flex;align-items:center;gap:6px}
.lemnity-hdr-s.hdr-f .hdr-tools a{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;color:#0f172a;text-decoration:none;border:1px solid transparent;transition:background .2s ease,border-color .2s ease,transform .2s ease}
.lemnity-hdr-s.hdr-f .hdr-tools a:hover{background:#f1f5f9;border-color:#e2e8f0;transform:translateY(-2px)}
@media (max-width:767px){
  .lemnity-hdr-s.hdr-f .hdr-burger{display:flex}
  .lemnity-hdr-s.hdr-f .hdr-nav{display:none;width:100%;flex-direction:column;align-items:stretch;border-top:1px solid #f1f5f9;padding-top:8px}
  .lemnity-hdr-s.hdr-f .hdr-nav a{padding:12px 4px;border-bottom:1px solid #f8fafc}
  .lemnity-hdr-s.hdr-f .hdr-tools{width:100%;justify-content:center;padding:8px 0}
  .lemnity-hdr-s.hdr-f .hdr-cb:checked~.hdr-nav{display:flex}
  .lemnity-hdr-s.hdr-f .hdr-cb:checked+.hdr-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lemnity-hdr-s.hdr-f .hdr-cb:checked+.hdr-burger span:nth-child(2){opacity:0}
  .lemnity-hdr-s.hdr-f .hdr-cb:checked+.hdr-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
</style>`;
}

function styleV7(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-g{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a}
.lemnity-hdr-s.hdr-g .hdr-shell{background:#fff;border-bottom:1px solid #e5e7eb}
.lemnity-hdr-s.hdr-g .hdr-row{max-width:1120px;margin:0 auto;padding:14px clamp(16px,4vw,24px);display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-g .hdr-cb{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.lemnity-hdr-s.hdr-g .hdr-burger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
.lemnity-hdr-s.hdr-g .hdr-burger span{display:block;width:22px;height:2px;background:#0f172a;border-radius:1px;transition:transform .28s ease,opacity .2s ease}
.lemnity-hdr-s.hdr-g .hdr-right{display:flex;align-items:center;gap:clamp(14px,3vw,28px);flex-wrap:wrap}
.lemnity-hdr-s.hdr-g .hdr-nav{display:flex;gap:18px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-g .hdr-nav a{color:#111827;text-decoration:none;font-weight:700;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;transition:color .2s ease}
.lemnity-hdr-s.hdr-g .hdr-nav a:hover{color:#4f46e5}
.lemnity-hdr-s.hdr-g .hdr-lang{display:flex;align-items:center;gap:10px;font-size:.8rem;font-weight:700}
.lemnity-hdr-s.hdr-g .hdr-lang span{opacity:.38}
.lemnity-hdr-s.hdr-g .hdr-lang strong{opacity:1}
@media (max-width:767px){
  .lemnity-hdr-s.hdr-g .hdr-burger{display:flex;margin-left:auto}
  .lemnity-hdr-s.hdr-g .hdr-right{display:none;width:100%;flex-direction:column;align-items:stretch;border-top:1px solid #f1f5f9;padding-top:10px}
  .lemnity-hdr-s.hdr-g .hdr-nav{flex-direction:column}
  .lemnity-hdr-s.hdr-g .hdr-lang{justify-content:center}
  .lemnity-hdr-s.hdr-g .hdr-cb:checked~.hdr-right{display:flex}
  .lemnity-hdr-s.hdr-g .hdr-cb:checked+.hdr-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lemnity-hdr-s.hdr-g .hdr-cb:checked+.hdr-burger span:nth-child(2){opacity:0}
  .lemnity-hdr-s.hdr-g .hdr-cb:checked+.hdr-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
</style>`;
}

function styleV8(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-h{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a}
.lemnity-hdr-s.hdr-h .hdr-shell{background:#fff;border-bottom:1px solid #e2e8f0}
.lemnity-hdr-s.hdr-h .hdr-row{max-width:1180px;margin:0 auto;padding:12px clamp(14px,4vw,22px);display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:space-between}
.lemnity-hdr-s.hdr-h .hdr-cb{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.lemnity-hdr-s.hdr-h .hdr-burger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;margin-left:auto}
.lemnity-hdr-s.hdr-h .hdr-burger span{display:block;width:22px;height:2px;background:#0f172a;border-radius:1px;transition:transform .28s ease,opacity .2s ease}
.lemnity-hdr-s.hdr-h .hdr-mid{display:flex;flex:1;align-items:center;justify-content:center;gap:clamp(12px,2.5vw,22px);flex-wrap:wrap;min-width:min(100%,200px)}
.lemnity-hdr-s.hdr-h .hdr-nav{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.lemnity-hdr-s.hdr-h .hdr-nav a{color:#334155;text-decoration:none;font-weight:600;font-size:.9rem;transition:color .2s ease}
.lemnity-hdr-s.hdr-h .hdr-nav a:hover{color:#0f172a}
.lemnity-hdr-s.hdr-h .hdr-dd::after{content:" ▾";font-size:.7em;opacity:.6}
.lemnity-hdr-s.hdr-h .hdr-contact{display:flex;flex-direction:column;gap:2px;text-align:right;font-size:.75rem;color:#64748b;line-height:1.3}
.lemnity-hdr-s.hdr-h .hdr-contact strong{color:#0f172a;font-size:.8rem;font-weight:700}
.lemnity-hdr-s.hdr-h .hdr-cta{padding:10px 20px;border-radius:999px;background:#0f172a;color:#fff;font-weight:700;font-size:.8rem;text-decoration:none;transition:transform .2s ease,box-shadow .2s ease;white-space:nowrap}
.lemnity-hdr-s.hdr-h .hdr-cta:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(15,23,42,.2)}
.lemnity-hdr-s.hdr-h .hdr-lang{display:flex;align-items:center;gap:6px;font-size:.78rem;font-weight:700;color:#64748b}
@media (max-width:900px){
  .lemnity-hdr-s.hdr-h .hdr-burger{display:flex}
  .lemnity-hdr-s.hdr-h .hdr-mid,.lemnity-hdr-s.hdr-h .hdr-contact,.lemnity-hdr-s.hdr-h .hdr-cta,.lemnity-hdr-s.hdr-h .hdr-lang{display:none;width:100%}
  .lemnity-hdr-s.hdr-h .hdr-drawer{display:none;width:100%;flex-direction:column;gap:14px;padding-top:12px;border-top:1px solid #f1f5f9}
  .lemnity-hdr-s.hdr-h .hdr-cb:checked~.hdr-drawer{display:flex}
  .lemnity-hdr-s.hdr-h .hdr-drawer .hdr-mid{flex-direction:column;display:flex}
  .lemnity-hdr-s.hdr-h .hdr-drawer .hdr-contact{text-align:left}
  .lemnity-hdr-s.hdr-h .hdr-cb:checked+.hdr-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lemnity-hdr-s.hdr-h .hdr-cb:checked+.hdr-burger span:nth-child(2){opacity:0}
  .lemnity-hdr-s.hdr-h .hdr-cb:checked+.hdr-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
</style>`;
}

function styleV9(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-i{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#0f172a}
.lemnity-hdr-s.hdr-i .hdr-shell{padding:10px clamp(16px,4vw,24px) 0}
.lemnity-hdr-s.hdr-i .hdr-brand-line{max-width:900px;margin:0 auto;padding:4px 0 10px;display:flex;align-items:center;justify-content:flex-start}
.lemnity-hdr-s.hdr-i .hdr-bar{max-width:900px;margin:0 auto;border:2px solid #0f172a;border-radius:2px;overflow:hidden}
.lemnity-hdr-s.hdr-i .hdr-nav{display:flex;flex-wrap:wrap}
.lemnity-hdr-s.hdr-i .hdr-nav a{flex:1 1 auto;text-align:center;padding:14px 16px;font-weight:600;font-size:.9rem;color:#0f172a;text-decoration:none;border-right:2px solid #0f172a;transition:background .2s ease,color .2s ease}
.lemnity-hdr-s.hdr-i .hdr-nav a:last-child{border-right:0}
.lemnity-hdr-s.hdr-i .hdr-nav a:hover{background:#f8fafc}
.lemnity-hdr-s.hdr-i .hdr-nav a.hdr-tab-active{background:#0f172a;color:#fff}
@media (max-width:520px){.lemnity-hdr-s.hdr-i .hdr-nav a{flex:1 1 50%;border-bottom:2px solid #0f172a}.lemnity-hdr-s.hdr-i .hdr-nav a:nth-child(2n){border-right:0}}
</style>`;
}

function styleV10(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-j{font-family:Georgia,Times,serif;background:#fff;color:#064e3b}
.lemnity-hdr-s.hdr-j .hdr-shell{padding:16px clamp(16px,4vw,28px)}
.lemnity-hdr-s.hdr-j .hdr-brand-line{display:flex;justify-content:flex-start;max-width:720px;margin:0 auto 12px;padding:0 4px}
.lemnity-hdr-s.hdr-j .hdr-pill{background:#d1fae5;border-radius:999px;padding:6px 8px 6px 12px;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;max-width:720px;margin:0 auto;border:1px solid rgba(6,95,59,.15)}
.lemnity-hdr-s.hdr-j .hdr-nav{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
.lemnity-hdr-s.hdr-j .hdr-nav a{padding:8px 16px;border-radius:12px;text-decoration:none;font-weight:600;font-size:.92rem;color:#064e3b;transition:background .25s ease,box-shadow .25s ease,border-color .25s ease;border:2px solid transparent}
.lemnity-hdr-s.hdr-j .hdr-nav a:hover{background:rgba(255,255,255,.75)}
.lemnity-hdr-s.hdr-j .hdr-nav a.hdr-tab-active{background:#fff;border-color:#047857;box-shadow:0 2px 8px rgba(6,78,59,.12)}
</style>`;
}

function styleV11(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-k{font-family:system-ui,sans-serif;background:linear-gradient(180deg,#faf5ff,#fff);padding:12px 0}
.lemnity-hdr-s.hdr-k .hdr-row-k{max-width:920px;margin:0 auto;padding:0 clamp(14px,4vw,22px);display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center}
.lemnity-hdr-s.hdr-k .hdr-inner{flex:1;min-width:min(100%,260px);max-width:900px;margin:0 auto;padding:10px 18px;background:#7c3aed;border-radius:999px;box-shadow:0 10px 30px rgba(124,58,237,.35)}
.lemnity-hdr-s.hdr-k .hdr-nav{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 20px;align-items:center}
.lemnity-hdr-s.hdr-k .hdr-nav a{color:rgba(255,255,255,.92);text-decoration:none;font-weight:600;font-size:.88rem;padding:6px 4px;transition:opacity .2s ease,box-shadow .2s ease;border-bottom:2px solid transparent}
.lemnity-hdr-s.hdr-k .hdr-nav a:hover{opacity:1}
.lemnity-hdr-s.hdr-k .hdr-nav a.hdr-tab-active{border-bottom-color:#fff;opacity:1}
</style>`;
}

function styleV12(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-l{font-family:Georgia,"Times New Roman",serif;background:#fff;color:#111;padding:18px clamp(16px,4vw,28px)}
.lemnity-hdr-s.hdr-l .hdr-row{max-width:880px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-l .hdr-nav{display:flex;gap:28px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-l .hdr-nav a{text-decoration:none;color:#111;font-size:1rem;position:relative;padding:10px 4px;transition:color .2s ease}
.lemnity-hdr-s.hdr-l .hdr-nav a.hdr-active-lines::before,.lemnity-hdr-s.hdr-l .hdr-nav a.hdr-active-lines::after{content:"";position:absolute;left:0;right:0;height:2px;background:#111;transition:transform .25s ease}
.lemnity-hdr-s.hdr-l .hdr-nav a.hdr-active-lines::before{top:0}
.lemnity-hdr-s.hdr-l .hdr-nav a.hdr-active-lines::after{bottom:0}
.lemnity-hdr-s.hdr-l .hdr-nav a:hover{color:#4338ca}
</style>`;
}

function styleV13(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-m{font-family:system-ui,sans-serif;background:#fff;color:#111;padding:14px clamp(16px,4vw,24px);border-bottom:1px solid #eee}
.lemnity-hdr-s.hdr-m .hdr-row{max-width:960px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-m .hdr-cb{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.lemnity-hdr-s.hdr-m .hdr-burger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:10px;border:1px solid #ddd;border-radius:8px}
.lemnity-hdr-s.hdr-m .hdr-burger span{display:block;width:22px;height:2px;background:#111;border-radius:1px}
.lemnity-hdr-s.hdr-m .hdr-nav{display:flex;gap:22px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-m .hdr-nav a{text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px;color:#111;font-weight:500;transition:color .2s ease}
.lemnity-hdr-s.hdr-m .hdr-nav a:hover{color:#4f46e5}
@media (max-width:640px){
  .lemnity-hdr-s.hdr-m .hdr-burger{display:flex;margin-left:auto}
  .lemnity-hdr-s.hdr-m .hdr-nav{display:none;width:100%;flex-direction:column}
  .lemnity-hdr-s.hdr-m .hdr-cb:checked~.hdr-nav{display:flex}
  .lemnity-hdr-s.hdr-m .hdr-cb:checked+.hdr-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lemnity-hdr-s.hdr-m .hdr-cb:checked+.hdr-burger span:nth-child(2){opacity:0}
  .lemnity-hdr-s.hdr-m .hdr-cb:checked+.hdr-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
</style>`;
}

function styleV14(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-n{font-family:system-ui,sans-serif;background:#fff;padding:16px}
.lemnity-hdr-s.hdr-n .hdr-row{max-width:900px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-n .hdr-nav{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;flex:1}
.lemnity-hdr-s.hdr-n .hdr-nav a{display:inline-flex;align-items:center;justify-content:center;padding:8px 16px;border:2px solid #111;text-decoration:none;color:#111;font-weight:600;font-size:.85rem;transition:background .2s ease,color .2s ease}
.lemnity-hdr-s.hdr-n .hdr-nav a:hover{background:#111;color:#fff}
@media (max-width:600px){.lemnity-hdr-s.hdr-n .hdr-nav{justify-content:center}}
</style>`;
}

function styleV15(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-o{font-family:system-ui,sans-serif;background:#fff;padding:12px clamp(14px,3vw,22px);color:#1e293b}
.lemnity-hdr-s.hdr-o .hdr-row{max-width:920px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-o .hdr-nav{display:flex;gap:clamp(14px,4vw,32px);flex-wrap:wrap}
.lemnity-hdr-s.hdr-o .hdr-nav a{text-decoration:none;color:#1e293b;font-weight:500;font-size:.93rem;transition:color .2s ease}
.lemnity-hdr-s.hdr-o .hdr-nav a:hover{color:#6366f1}
</style>`;
}

function styleV16(): string {
  return `<style>${HDR_CORE}
.lemnity-hdr-s.hdr-p{font-family:system-ui,sans-serif;color:#f8fafc}
.lemnity-hdr-s.hdr-p .hdr-shell{background:rgba(15,23,42,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.08);box-shadow:0 8px 32px rgba(0,0,0,.12)}
.lemnity-hdr-s.hdr-p .hdr-row{max-width:1120px;margin:0 auto;padding:12px clamp(16px,4vw,22px);display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-p .hdr-cb{position:absolute;opacity:0;width:0;height:0;pointer-events:none}
.lemnity-hdr-s.hdr-p .hdr-burger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:10px;border:1px solid rgba(255,255,255,.25);border-radius:10px;background:rgba(255,255,255,.08)}
.lemnity-hdr-s.hdr-p .hdr-burger span{display:block;width:22px;height:2px;background:#fff;border-radius:1px}
.lemnity-hdr-s.hdr-p .hdr-nav{display:flex;align-items:center;gap:8px 20px;flex-wrap:wrap}
.lemnity-hdr-s.hdr-p .hdr-nav a{color:rgba(248,250,252,.9);text-decoration:none;font-weight:600;font-size:.9rem;transition:color .2s ease}
.lemnity-hdr-s.hdr-p .hdr-nav a:hover{color:#fff}
@media (max-width:767px){
  .lemnity-hdr-s.hdr-p .hdr-burger{display:flex;margin-left:auto}
  .lemnity-hdr-s.hdr-p .hdr-nav{display:none;width:100%;flex-direction:column;border-top:1px solid rgba(255,255,255,.12);padding-top:10px}
  .lemnity-hdr-s.hdr-p .hdr-nav a{padding:12px 4px}
  .lemnity-hdr-s.hdr-p .hdr-cb:checked~.hdr-nav{display:flex}
  .lemnity-hdr-s.hdr-p .hdr-cb:checked+.hdr-burger span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lemnity-hdr-s.hdr-p .hdr-cb:checked+.hdr-burger span:nth-child(2){opacity:0}
  .lemnity-hdr-s.hdr-p .hdr-cb:checked+.hdr-burger span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
</style>`;
}

export const LEMNITY_HEADER_BLOCK_VARIANTS = [
  {
    id: "hdr-classic-light",
    badge: "HD01",
    title: "Светлая: логотип и меню",
    hint: "белый фон, подчёркивание при наведении",
    content: `<section data-gjs-name="Шапка: классика" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-a" style="margin:0;padding:0">
${styleV1()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<input type="checkbox" id="lemnity-hnav-a" class="hdr-cb" aria-hidden="true" tabindex="-1"/>
<label for="lemnity-hnav-a" class="hdr-burger" aria-label="Открыть меню"><span></span><span></span><span></span></label>
<nav class="hdr-nav" aria-label="Меню">
<a href="#">О проекте</a><a href="#">Работы</a><a href="#">Контакты</a>
</nav>
</div></header>
</section>`,
  },
  {
    id: "hdr-red-bar",
    badge: "HD02",
    title: "Красная полоса",
    hint: "яркий бар, белый текст",
    content: `<section data-gjs-name="Шапка: красная" class="lemnity-hdr-s lemnity-section hdr-b" style="margin:0;padding:0">
${styleV2()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<input type="checkbox" id="lemnity-hnav-b" class="hdr-cb" aria-hidden="true" tabindex="-1"/>
<label for="lemnity-hnav-b" class="hdr-burger" aria-label="Открыть меню"><span></span><span></span><span></span></label>
<nav class="hdr-nav" aria-label="Меню">
<a href="#">О нас</a><a href="#">Работы</a><a href="#">Цены</a><a href="#">Команда</a><a href="#">Вакансии</a>
</nav>
</div></header>
</section>`,
  },
  {
    id: "hdr-centered-split",
    badge: "HD03",
    title: "Логотип по центру",
    hint: "ссылки слева и справа",
    content: `<section data-gjs-name="Шапка: центр" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-c" style="margin:0;padding:0">
${styleV3()}
<header class="hdr-shell hdr-anim">
<div class="hdr-grid">
<nav class="hdr-desk-left hdr-nav" aria-label="Раздел слева"><a href="#">О проекте</a><a href="#">Тарифы</a><a href="#">Возможности</a></nav>
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<nav class="hdr-desk-right hdr-nav" aria-label="Раздел справа"><a href="#">Клиенты</a><a href="#">Блог</a><a href="#">Контакты</a></nav>
<input type="checkbox" id="lemnity-hnav-c" class="hdr-cb" aria-hidden="true" tabindex="-1"/>
<label for="lemnity-hnav-c" class="hdr-burger" aria-label="Открыть меню"><span></span><span></span><span></span></label>
<nav class="hdr-mobile-nav hdr-nav" aria-label="Меню"><a href="#">О проекте</a><a href="#">Тарифы</a><a href="#">Возможности</a><a href="#">Клиенты</a><a href="#">Блог</a><a href="#">Контакты</a></nav>
</div>
</header>
</section>`,
  },
  {
    id: "hdr-blue-cta",
    badge: "HD04",
    title: "Синяя с кнопкой",
    hint: "скругление снизу, CTA",
    content: `<section data-gjs-name="Шапка: синяя" class="lemnity-hdr-s lemnity-section hdr-d" style="margin:0;padding:0">
${styleV4()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand-wrap hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<input type="checkbox" id="lemnity-hnav-d" class="hdr-cb" aria-hidden="true" tabindex="-1"/>
<label for="lemnity-hnav-d" class="hdr-burger" aria-label="Открыть меню"><span></span><span></span><span></span></label>
<div class="hdr-nav-wrap">
<nav class="hdr-nav" aria-label="Меню"><a href="#">О нас</a><a href="#">Услуги</a><a href="#">Контакты</a></nav>
<a class="hdr-cta" href="#">Записаться на звонок</a>
</div>
</div></header>
</section>`,
  },
  {
    id: "hdr-contacts-social",
    badge: "HD05",
    title: "Телефон и соцсети",
    hint: "иконки + номер",
    content: `<section data-gjs-name="Шапка: контакты" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-e" style="margin:0;padding:0">
${styleV5()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<input type="checkbox" id="lemnity-hnav-e" class="hdr-cb" aria-hidden="true" tabindex="-1"/>
<label for="lemnity-hnav-e" class="hdr-burger" aria-label="Открыть меню"><span></span><span></span><span></span></label>
<div class="hdr-mid">
<nav class="hdr-nav" aria-label="Меню"><a href="#">О нас</a><a href="#">Работы</a><a href="#">Услуги</a></nav>
<span class="hdr-phone">+7 123 456-78-90</span>
<div class="hdr-soc" aria-label="Соцсети">
<a href="#" aria-label="Facebook">${ICON_SOCIAL.fb}</a>
<a href="#" aria-label="X">${ICON_SOCIAL.tw}</a>
<a href="#" aria-label="Instagram">${ICON_SOCIAL.ig}</a>
</div>
</div>
</div></header>
</section>`,
  },
  {
    id: "hdr-shop-icons",
    badge: "HD06",
    title: "Интернет-магазин",
    hint: "меню + иконки профиля и корзины",
    content: `<section data-gjs-name="Шапка: магазин" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-f" style="margin:0;padding:0">
${styleV6()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-logo hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<input type="checkbox" id="lemnity-hnav-f" class="hdr-cb" aria-hidden="true" tabindex="-1"/>
<label for="lemnity-hnav-f" class="hdr-burger" aria-label="Открыть меню"><span></span><span></span><span></span></label>
<nav class="hdr-nav" aria-label="Меню"><a href="#">Каталог</a><a href="#">О магазине</a><a href="#">Доставка</a><a href="#">Контакты</a></nav>
<div class="hdr-tools">
<a href="#" aria-label="Профиль"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21a8 8 0 10-16 0"/><circle cx="12" cy="7" r="4"/></svg></a>
<a href="#" aria-label="Избранное"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 000-7.8z"/></svg></a>
<a href="#" aria-label="Корзина"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M6 6L5 3H2"/></svg></a>
</div>
</div></header>
</section>`,
  },
  {
    id: "hdr-upper-lang",
    badge: "HD07",
    title: "Верхний регистр и языки",
    hint: "EN / RU переключатель",
    content: `<section data-gjs-name="Шапка: языки" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-g" style="margin:0;padding:0">
${styleV7()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<input type="checkbox" id="lemnity-hnav-g" class="hdr-cb" aria-hidden="true" tabindex="-1"/>
<label for="lemnity-hnav-g" class="hdr-burger" aria-label="Открыть меню"><span></span><span></span><span></span></label>
<div class="hdr-right">
<nav class="hdr-nav" aria-label="Меню"><a href="#">О нас</a><a href="#">Работы</a><a href="#">Контакты</a></nav>
<div class="hdr-lang"><span>EN</span> <strong>RU</strong></div>
</div>
</div></header>
</section>`,
  },
  {
    id: "hdr-rich-contact-cta",
    badge: "HD08",
    title: "Контакты и CTA",
    hint: "телефон, адрес, кнопка, язык",
    content: `<section data-gjs-name="Шапка: контакты CTA" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-h" style="margin:0;padding:0">
${styleV8()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<input type="checkbox" id="lemnity-hnav-h" class="hdr-cb" aria-hidden="true" tabindex="-1"/>
<label for="lemnity-hnav-h" class="hdr-burger" aria-label="Открыть меню"><span></span><span></span><span></span></label>
<div class="hdr-mid">
<nav class="hdr-nav" aria-label="Меню">
<a href="#" class="hdr-dd">О нас</a><a href="#">Услуги</a><a href="#">Контакты</a>
</nav>
</div>
<div class="hdr-contact"><strong>+7 123 456-78-90</strong><span>ул. Примерная, Москва</span></div>
<a class="hdr-cta" href="#">Записаться на звонок</a>
<div class="hdr-lang" aria-label="Язык">EN</div>
<div class="hdr-drawer">
<div class="hdr-mid">
<nav class="hdr-nav" aria-label="Меню (моб.)">
<a href="#" class="hdr-dd">О нас</a><a href="#">Услуги</a><a href="#">Контакты</a>
</nav>
</div>
<div class="hdr-contact"><strong>+7 123 456-78-90</strong><span>ул. Примерная, Москва</span></div>
<a class="hdr-cta" href="#">Записаться на звонок</a>
<div class="hdr-lang">EN</div>
</div>
</div></header>
</section>`,
  },
  {
    id: "hdr-tabs-solid-active",
    badge: "HD09",
    title: "Табы: заливка активного",
    hint: "сетка ссылок в рамке",
    content: `<section data-gjs-name="Шапка: табы тёмные" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-i" style="margin:0;padding:0">
${styleV9()}
<header class="hdr-shell hdr-anim">
<div class="hdr-brand-line"><a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a></div>
<div class="hdr-bar">
<nav class="hdr-nav" aria-label="Меню"><a href="#">Главная</a><a href="#" class="hdr-tab-active">О нас</a><a href="#">Галерея</a><a href="#">Контакты</a></nav>
</div>
</header>
</section>`,
  },
  {
    id: "hdr-mint-pill-tabs",
    badge: "HD10",
    title: "Mint: таб в рамке",
    hint: "serif, мятный фон",
    content: `<section data-gjs-name="Шапка: mint табы" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-j" style="margin:0;padding:0">
${styleV10()}
<header class="hdr-shell hdr-anim">
<div class="hdr-brand-line"><a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a></div>
<div class="hdr-pill">
<nav class="hdr-nav" aria-label="Меню"><a href="#">Home</a><a href="#" class="hdr-tab-active">About</a><a href="#">Gallery</a><a href="#">Contact</a></nav>
</div>
</header>
</section>`,
  },
  {
    id: "hdr-purple-underline",
    badge: "HD11",
    title: "Фиолетовая «пилюля»",
    hint: "подчёркивание активного",
    content: `<section data-gjs-name="Шапка: фиолетовая" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-k" style="margin:0;padding:0">
${styleV11()}
<header class="hdr-shell hdr-anim">
<div class="hdr-row-k">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<div class="hdr-inner">
<nav class="hdr-nav" aria-label="Меню"><a href="#">Home</a><a href="#" class="hdr-tab-active">About</a><a href="#">Gallery</a><a href="#">Contact</a></nav>
</div>
</div>
</header>
</section>`,
  },
  {
    id: "hdr-serif-double-rule",
    badge: "HD12",
    title: "Serif: линии сверху и снизу",
    hint: "классическое выделение",
    content: `<section data-gjs-name="Шапка: serif линии" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-l" style="margin:0;padding:0">
${styleV12()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<nav class="hdr-nav" aria-label="Меню"><a href="#">Home</a><a href="#" class="hdr-active-lines">About</a><a href="#">Gallery</a><a href="#">Contact</a></nav>
</div></header>
</section>`,
  },
  {
    id: "hdr-underline-ru",
    badge: "HD13",
    title: "Подчёркнутое меню",
    hint: "RU ссылки",
    content: `<section data-gjs-name="Шапка: подчёркивание" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-m" style="margin:0;padding:0">
${styleV13()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<input type="checkbox" id="lemnity-hnav-m" class="hdr-cb" aria-hidden="true" tabindex="-1"/>
<label for="lemnity-hnav-m" class="hdr-burger" aria-label="Открыть меню"><span></span><span></span><span></span></label>
<nav class="hdr-nav" aria-label="Меню"><a href="#">Главная</a><a href="#">О нас</a><a href="#">Галерея</a><a href="#">Контакты</a></nav>
</div></header>
</section>`,
  },
  {
    id: "hdr-boxed-links",
    badge: "HD14",
    title: "Ссылки в рамках",
    hint: "инверсия при наведении",
    content: `<section data-gjs-name="Шапка: рамки" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-n" style="margin:0;padding:0">
${styleV14()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<nav class="hdr-nav" aria-label="Меню"><a href="#">Главная</a><a href="#">О нас</a><a href="#">Галерея</a><a href="#">Контакты</a></nav>
</div></header>
</section>`,
  },
  {
    id: "hdr-minimal-ru",
    badge: "HD15",
    title: "Минимализм RU",
    hint: "простой ряд ссылок",
    content: `<section data-gjs-name="Шапка: минимализм" class="lemnity-hdr-s lemnity-hdr-s--logo-dark lemnity-section hdr-o" style="margin:0;padding:0">
${styleV15()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<nav class="hdr-nav" aria-label="Меню"><a href="#">Главная</a><a href="#">О нас</a><a href="#">Галерея</a><a href="#">Контакты</a></nav>
</div></header>
</section>`,
  },
  {
    id: "hdr-glass-dark",
    badge: "HD16",
    title: "Стекло на тёмном",
    hint: "blur, светлый текст",
    content: `<section data-gjs-name="Шапка: стекло" class="lemnity-hdr-s lemnity-section hdr-p" style="margin:0;padding:0">
${styleV16()}
<header class="hdr-shell hdr-anim"><div class="hdr-row">
<a class="hdr-brand hdr-brand--logo" href="#">${hdrLogoImg()}</a>
<input type="checkbox" id="lemnity-hnav-p" class="hdr-cb" aria-hidden="true" tabindex="-1"/>
<label for="lemnity-hnav-p" class="hdr-burger" aria-label="Открыть меню"><span></span><span></span><span></span></label>
<nav class="hdr-nav" aria-label="Меню"><a href="#">О проекте</a><a href="#">Работы</a><a href="#">Тарифы</a><a href="#">Контакты</a></nav>
</div></header>
</section>`,
  },
];
