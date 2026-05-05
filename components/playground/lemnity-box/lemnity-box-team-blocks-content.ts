/**
 * Секции «Команда»: сетки портретов, сплиты, карточки. Обёртка: lemnity-team-s + lemnity-section.
 */
const TEAM_RESPONSIVE_CSS = `<style>
.lemnity-team-s,.lemnity-team-s *{box-sizing:border-box}
.lemnity-team-s{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a}
.lemnity-team-s img{max-width:100%;display:block}
/* полоса: текст | фото | текст | фото */
.lemnity-team-s .lt-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));min-height:min(72vw,420px)}
.lemnity-team-s .lt-strip-text{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:clamp(16px,3vw,28px);background:#fffbeb;border-right:1px solid rgba(15,23,42,.06)}
.lemnity-team-s .lt-strip-text:last-of-type{border-right:0}
.lemnity-team-s .lt-strip-photo{position:relative;overflow:hidden;min-height:220px;border-right:1px solid rgba(15,23,42,.06)}
.lemnity-team-s .lt-strip-photo:last-child{border-right:0}
.lemnity-team-s .lt-strip-photo img{width:100%;height:100%;object-fit:cover;min-height:220px}
.lemnity-team-s .lt-strip-name{margin:0 0 10px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(18px,2.4vw,22px);font-weight:700;color:#0f172a}
.lemnity-team-s .lt-strip-bio{margin:0 0 14px;font-size:13px;line-height:1.55;color:#475569;font-weight:400;max-width:28ch}
.lemnity-team-s .lt-strip-line{width:48px;height:1px;background:#0f172a;margin:0 auto 12px;opacity:.35}
.lemnity-team-s .lt-strip-soc{font-size:13px;opacity:.75}
@media (max-width:900px){
  .lemnity-team-s .lt-strip{grid-template-columns:repeat(2,minmax(0,1fr));min-height:0}
  .lemnity-team-s .lt-strip-text{border-right:1px solid rgba(15,23,42,.06)}
  .lemnity-team-s .lt-strip-photo:nth-child(2n){border-right:0}
}
@media (max-width:640px){
  .lemnity-team-s .lt-strip{grid-template-columns:1fr}
  .lemnity-team-s .lt-strip-photo{border-right:0;border-bottom:1px solid rgba(15,23,42,.06)}
  .lemnity-team-s .lt-strip-text{border-right:0;border-bottom:1px solid rgba(15,23,42,.06)}
  .lemnity-team-s .lt-strip .lt-o-m1{order:1}
  .lemnity-team-s .lt-strip .lt-o-t1{order:2}
  .lemnity-team-s .lt-strip .lt-o-m2{order:3}
  .lemnity-team-s .lt-strip .lt-o-t2{order:4}
}
/* лента фото — текст — три портрета */
.lemnity-team-s .lt-quad{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));min-height:min(70vw,400px)}
.lemnity-team-s .lt-quad-photo{overflow:hidden;min-height:200px;border-right:1px solid rgba(255,255,255,.5)}
.lemnity-team-s .lt-quad-photo img{width:100%;height:100%;object-fit:cover;min-height:200px}
.lemnity-team-s .lt-quad-mid{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:clamp(18px,3vw,32px);background:#e2e8f0;border-right:1px solid rgba(15,23,42,.08)}
.lemnity-team-s .lt-quad-mid h2{margin:0 0 12px;font-family:Georgia,serif;font-size:clamp(20px,3vw,26px);font-weight:700;letter-spacing:.04em;color:#1e3a5f}
.lemnity-team-s .lt-quad-mid p{margin:0;font-size:13px;line-height:1.6;color:#475569;font-weight:400;max-width:32ch}
.lemnity-team-s .lt-quad-line{width:40px;height:1px;background:#1e3a5f;margin:0 auto 14px;opacity:.4}
@media (max-width:900px){.lemnity-team-s .lt-quad{grid-template-columns:repeat(2,minmax(0,1fr));min-height:0}.lemnity-team-s .lt-quad-photo:nth-child(4){grid-column:span 2}}
@media (max-width:560px){.lemnity-team-s .lt-quad{grid-template-columns:1fr}.lemnity-team-s .lt-quad-photo:nth-child(4){grid-column:auto}}
/* три аватара — заголовок секции */
.lemnity-team-s .lt-head{text-align:center;margin-bottom:clamp(28px,5vw,44px)}
.lemnity-team-s .lt-head h2{margin:0 0 12px;font-size:clamp(24px,4vw,32px);font-weight:600;color:#0f172a}
.lemnity-team-s .lt-head-line{width:56px;height:4px;background:#4f46e5;margin:0 auto;border-radius:2px;opacity:.85}
.lemnity-team-s .lt-row3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(20px,4vw,36px);max-width:960px;margin:0 auto;padding:0 clamp(12px,3vw,24px)}
.lemnity-team-s .lt-card3{display:flex;flex-direction:column;align-items:center;text-align:center}
.lemnity-team-s .lt-card3 .lt-av{width:clamp(120px,28vw,160px);height:clamp(120px,28vw,160px);border-radius:50%;overflow:hidden;margin-bottom:16px;filter:grayscale(1)}
.lemnity-team-s .lt-card3 .lt-av img{width:100%;height:100%;object-fit:cover}
.lemnity-team-s .lt-card3 .lt-n{margin:0 0 6px;font-size:17px;font-weight:600;color:#0f172a}
.lemnity-team-s .lt-card3 .lt-soc{font-size:12px;color:#94a3b8;margin-bottom:10px}
.lemnity-team-s .lt-card3 .lt-bio{margin:0;font-size:13px;line-height:1.55;color:#64748b;font-weight:400;max-width:36ch}
@media (max-width:640px){.lemnity-team-s .lt-row3{grid-template-columns:1fr}}
/* сетка 4 карточки: квадрат + имя + роль */
.lemnity-team-s .lt-intro{margin:0 auto clamp(28px,5vw,48px);max-width:640px;text-align:center;padding:0 16px}
.lemnity-team-s .lt-intro h2{margin:0 0 12px;font-size:clamp(26px,4vw,34px);font-weight:600;color:#0f172a}
.lemnity-team-s .lt-intro p{margin:0;font-size:14px;line-height:1.6;color:#64748b;font-weight:400}
.lemnity-team-s .lt-grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(14px,3vw,24px)}
.lemnity-team-s .lt-g4-card{display:flex;flex-direction:column}
.lemnity-team-s .lt-g4-img{aspect-ratio:1;overflow:hidden;background:#e2e8f0;margin-bottom:12px}
.lemnity-team-s .lt-g4-img img{width:100%;height:100%;object-fit:cover;filter:grayscale(1)}
.lemnity-team-s .lt-g4-n{margin:0 0 4px;font-size:15px;font-weight:600;color:#0f172a}
.lemnity-team-s .lt-g4-r{margin:0;font-size:13px;color:#64748b;font-weight:400}
@media (max-width:900px){.lemnity-team-s .lt-grid4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:480px){.lemnity-team-s .lt-grid4{grid-template-columns:1fr}}
/* сплит: фото | текст */
.lemnity-team-s .lt-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:min(56vw,380px);border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 36px rgba(15,23,42,.06)}
.lemnity-team-s .lt-split-media{min-height:260px;background:#cbd5e1}
.lemnity-team-s .lt-split-media img{width:100%;height:100%;object-fit:cover;display:block;min-height:260px;filter:grayscale(.25)}
.lemnity-team-s .lt-split-body{display:flex;flex-direction:column;justify-content:center;padding:clamp(22px,4vw,40px);background:#f8fafc}
.lemnity-team-s .lt-split-body .lt-sn{margin:0 0 6px;font-size:clamp(20px,3vw,26px);font-weight:600;color:#0f172a}
.lemnity-team-s .lt-split-body .lt-sr{margin:0 0 16px;font-size:14px;color:#64748b;font-weight:400}
.lemnity-team-s .lt-split-body .lt-sl{width:40px;height:1px;background:#0f172a;margin:0 0 16px;opacity:.25}
.lemnity-team-s .lt-split-body .lt-sb{margin:0;font-family:Georgia,serif;font-size:14px;line-height:1.65;color:#334155;font-weight:400}
@media (max-width:720px){.lemnity-team-s .lt-split{grid-template-columns:1fr}}
/* карточки с подложкой и подписью снизу */
.lemnity-team-s .lt-glass-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,18px);flex:1;min-height:280px}
.lemnity-team-s .lt-glass-cell{position:relative;border-radius:20px;overflow:hidden;min-height:160px;background:#1e293b}
.lemnity-team-s .lt-glass-cell img{width:100%;height:100%;object-fit:cover;display:block;min-height:160px}
.lemnity-team-s .lt-glass-cap{position:absolute;left:0;right:0;bottom:0;padding:12px 14px;background:linear-gradient(to top,rgba(15,23,42,.82),transparent);backdrop-filter:blur(6px)}
.lemnity-team-s .lt-glass-cap .lt-gn{margin:0;font-size:14px;font-weight:600;color:#fff}
.lemnity-team-s .lt-glass-cap .lt-gr{margin:2px 0 0;font-size:12px;font-weight:400;color:rgba(255,255,255,.85)}
.lemnity-team-s .lt-dream{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(20px,4vw,36px);align-items:stretch}
.lemnity-team-s .lt-dream-feature{position:relative;border-radius:24px;overflow:hidden;min-height:min(52vw,440px);background:#0f172a}
.lemnity-team-s .lt-dream-feature img{width:100%;height:100%;object-fit:cover;display:block;min-height:320px}
.lemnity-team-s .lt-dream-feature .lt-glass-cap{padding:18px 20px;background:linear-gradient(to top,rgba(15,23,42,.9),transparent)}
.lemnity-team-s .lt-dream-feature .lt-gn{font-size:clamp(18px,2.5vw,22px)}
.lemnity-team-s .lt-dream-aside{display:flex;flex-direction:column;gap:clamp(16px,3vw,24px);justify-content:center}
.lemnity-team-s .lt-dream-aside h2{margin:0;font-size:clamp(22px,3.5vw,30px);font-weight:600;line-height:1.2;color:#0f172a}
.lemnity-team-s .lt-dream-aside p{margin:0;font-size:14px;line-height:1.6;color:#64748b;font-weight:400}
.lemnity-team-s .lt-dream-aside a{display:inline-block;margin-top:4px;padding:12px 22px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-size:14px;font-weight:500;width:fit-content}
.lemnity-team-s .lt-dream-aside a:hover{filter:brightness(1.08)}
@media (max-width:900px){.lemnity-team-s .lt-dream{grid-template-columns:1fr}}
@media (max-width:900px){.lemnity-team-s .lt-glass-grid{min-height:240px}}
@media (max-width:520px){.lemnity-team-s .lt-glass-grid{grid-template-columns:1fr}}
/* карточки с подвалом (Meet our team) */
.lemnity-team-s .lt-meet{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(14px,2.5vw,22px)}
.lemnity-team-s .lt-meet-card{border-radius:16px;overflow:hidden;background:#fff;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(15,23,42,.05)}
.lemnity-team-s .lt-meet-ph{background:#cbd5e1;aspect-ratio:4/3;display:flex;align-items:flex-end;justify-content:center;padding-bottom:0}
.lemnity-team-s .lt-meet-ph img{width:100%;height:100%;object-fit:cover;display:block}
.lemnity-team-s .lt-meet-ft{padding:14px 16px 16px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:flex-start}
.lemnity-team-s .lt-meet-ft .lt-mn{margin:0;font-size:15px;font-weight:600;color:#0f172a}
.lemnity-team-s .lt-meet-ft .lt-mr{margin:4px 0 0;flex:1 0 100%;font-size:13px;color:#64748b;font-weight:400}
@media (max-width:900px){.lemnity-team-s .lt-meet{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.lemnity-team-s .lt-meet{grid-template-columns:1fr}}
/* карточки в стиле расписания / спикеры */
.lemnity-team-s .lt-sched-head{margin:0 0 clamp(20px,4vw,32px);max-width:720px;padding:0 clamp(4px,2vw,8px)}
.lemnity-team-s .lt-sched-head h2{margin:0 0 10px;font-size:clamp(22px,3.5vw,28px);font-weight:600;color:#0f172a;line-height:1.25}
.lemnity-team-s .lt-sched-head p{margin:0;font-size:14px;line-height:1.55;color:#64748b;font-weight:400}
.lemnity-team-s .lt-sched-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(16px,3vw,24px)}
.lemnity-team-s .lt-sc-card{background:#e8edf4;border-radius:16px;padding:clamp(18px,3vw,24px);border:1px solid #dde4ee;display:flex;flex-direction:column;gap:14px;min-height:200px}
.lemnity-team-s .lt-sc-tags{display:flex;flex-wrap:wrap;gap:8px}
.lemnity-team-s .lt-sc-tag{display:inline-block;padding:5px 11px;border-radius:999px;background:#fde68a;font-size:11px;font-weight:500;color:#78350f}
.lemnity-team-s .lt-sc-tag--time{background:#fce7f3;color:#9d174d}
.lemnity-team-s .lt-sc-h{margin:0;font-size:clamp(17px,2.2vw,20px);font-weight:600;color:#0f172a;line-height:1.3}
.lemnity-team-s .lt-sc-row{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:auto;padding-top:12px;border-top:1px solid rgba(15,23,42,.08)}
.lemnity-team-s .lt-sc-meta .lt-sc-n{margin:0;font-size:14px;font-weight:600;color:#0f172a}
.lemnity-team-s .lt-sc-meta .lt-sc-r{margin:4px 0 0;font-size:12px;color:#64748b;font-weight:400}
.lemnity-team-s .lt-sc-ph{flex:0 0 56px;width:56px;height:56px;border-radius:10px;overflow:hidden;background:#cbd5e1}
.lemnity-team-s .lt-sc-ph img{width:100%;height:100%;object-fit:cover}
@media (max-width:720px){.lemnity-team-s .lt-sched-grid{grid-template-columns:1fr}}
/* три колонки: текст | фото | имя + био + метрика */
.lemnity-team-s .lt-founder{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);gap:clamp(18px,4vw,36px);align-items:center;max-width:1200px;margin:0 auto}
.lemnity-team-s .lt-f-col1 h2{margin:0 0 14px;font-size:clamp(22px,3vw,28px);font-weight:600;line-height:1.2;color:#0f172a}
.lemnity-team-s .lt-f-col1 p{margin:0 0 20px;font-size:14px;line-height:1.6;color:#64748b;font-weight:400}
.lemnity-team-s .lt-f-col1 a{display:inline-block;padding:12px 22px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500}
.lemnity-team-s .lt-f-col1 a:hover{filter:brightness(1.08)}
.lemnity-team-s .lt-f-photo{border-radius:14px;overflow:hidden;background:#e2e8f0;aspect-ratio:4/5;max-height:440px;width:100%}
.lemnity-team-s .lt-f-photo img{width:100%;height:100%;object-fit:cover;display:block;min-height:260px}
.lemnity-team-s .lt-f-profile .lt-f-name{margin:0 0 12px;font-size:clamp(20px,2.5vw,24px);font-weight:600;color:#0f172a}
.lemnity-team-s .lt-f-profile .lt-f-bio{margin:0 0 22px;font-size:13px;line-height:1.6;color:#64748b;font-weight:400}
.lemnity-team-s .lt-f-stat-num{margin:0;font-size:clamp(36px,6vw,52px);font-weight:700;line-height:1;color:#0f172a;letter-spacing:-0.02em}
.lemnity-team-s .lt-f-stat-cap{margin:8px 0 0;font-size:13px;line-height:1.45;color:#64748b;font-weight:400;max-width:30ch}
@media (max-width:960px){
  .lemnity-team-s .lt-founder{grid-template-columns:1fr}
  .lemnity-team-s .lt-f-col1{text-align:center}
  .lemnity-team-s .lt-f-col1 a{margin-left:auto;margin-right:auto}
  .lemnity-team-s .lt-f-photo{max-height:none;max-width:min(360px,100%);margin:0 auto}
}
/* текстовая карточка поверх широкого фото */
.lemnity-team-s .lt-over-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);min-height:min(52vw,420px);background:#e2e8f0;border-radius:18px;overflow:hidden;position:relative}
.lemnity-team-s .lt-over-media{grid-column:1/-1;grid-row:1;min-height:280px}
.lemnity-team-s .lt-over-media img{width:100%;height:100%;object-fit:cover;display:block;min-height:280px}
.lemnity-team-s .lt-over-card{grid-column:1;grid-row:1;align-self:center;justify-self:start;margin:clamp(20px,4vw,40px);z-index:2;background:#fff;padding:clamp(22px,3vw,32px);box-shadow:0 16px 40px rgba(15,23,42,.12);max-width:400px;border-radius:4px}
.lemnity-team-s .lt-over-card .lt-on{margin:0 0 6px;font-size:clamp(20px,2.5vw,24px);font-weight:600;color:#0f172a}
.lemnity-team-s .lt-over-card .lt-or{margin:0 0 14px;font-size:14px;color:#64748b;font-weight:400}
.lemnity-team-s .lt-over-card .lt-ob{margin:0;font-size:14px;line-height:1.65;color:#334155;font-weight:400}
@media (max-width:768px){
  .lemnity-team-s .lt-over-wrap{grid-template-columns:1fr;min-height:0}
  .lemnity-team-s .lt-over-media{grid-row:1;min-height:240px}
  .lemnity-team-s .lt-over-card{grid-column:1;grid-row:2;margin:0;max-width:none;border-radius:0;box-shadow:none}
}
</style>`;

const P = {
  w1: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=640&q=80",
  m1: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=640&q=80",
  w2: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=640&q=80",
  m2: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=640&q=80",
  w3: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=640&q=80",
  m3: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=640&q=80",
};

/** Варианты библиотеки «Команда» */
export const LEMNITY_TEAM_BLOCK_VARIANTS = [
  {
    id: "team-strip-4",
    badge: "TM01",
    title: "Полоса: текст и фото",
    hint: "четыре колонки, на узком экране — колонка",
    content: `${TEAM_RESPONSIVE_CSS}<section data-gjs-name="Команда: полоса 4" class="lemnity-team-s lemnity-section" style="margin:0;padding:0;background:#fff;">
  <div class="lt-strip">
    <div class="lt-strip-text lt-o-t1">
      <p class="lt-strip-name">Анна Титова</p>
      <p class="lt-strip-bio">Короткий текст о специалисте и опыте. Замените на свой.</p>
      <div class="lt-strip-line"></div>
      <span class="lt-strip-soc" aria-hidden="true">𝕏</span>
    </div>
    <div class="lt-strip-photo lt-o-m1"><img src="${P.w1}" alt="" width="400" height="520"/></div>
    <div class="lt-strip-text lt-o-t2">
      <p class="lt-strip-name">Егор Влади</p>
      <p class="lt-strip-bio">Ещё один абзац про участника команды — редактируйте под себя.</p>
      <div class="lt-strip-line"></div>
      <span class="lt-strip-soc" aria-hidden="true">𝕏</span>
    </div>
    <div class="lt-strip-photo lt-o-m2"><img src="${P.m1}" alt="" width="400" height="520"/></div>
  </div>
</section>`,
  },
  {
    id: "team-quad-manifesto",
    badge: "TM02",
    title: "Это мы + портреты",
    hint: "центральный текст и три фото",
    content: `${TEAM_RESPONSIVE_CSS}<section data-gjs-name="Команда: это мы" class="lemnity-team-s lemnity-section" style="margin:0;padding:0;background:#fff;">
  <div class="lt-quad">
    <div class="lt-quad-photo"><img src="${P.w2}" alt="" width="360" height="480"/></div>
    <div class="lt-quad-mid">
      <h2>ЭТО МЫ</h2>
      <div class="lt-quad-line"></div>
      <p>Мы объединяем экспертизу и внимание к деталям. Расскажите здесь, чем живёт команда.</p>
    </div>
    <div class="lt-quad-photo"><img src="${P.m2}" alt="" width="360" height="480"/></div>
    <div class="lt-quad-photo"><img src="${P.w3}" alt="" width="360" height="480"/></div>
  </div>
</section>`,
  },
  {
    id: "team-three-circles",
    badge: "TM03",
    title: "Наша команда — три аватара",
    hint: "заголовок и круглые фото",
    content: `${TEAM_RESPONSIVE_CSS}<section data-gjs-name="Команда: три человека" class="lemnity-team-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,80px) 0;background:#f1f5f9;">
  <div class="lt-head">
    <h2>Наша команда</h2>
    <div class="lt-head-line"></div>
  </div>
  <div class="lt-row3">
    <div class="lt-card3">
      <div class="lt-av"><img src="${P.m3}" alt="" width="200" height="200"/></div>
      <p class="lt-n">Иван Петров</p>
      <span class="lt-soc">in</span>
      <p class="lt-bio">Краткое описание роли и фокуса работы в команде.</p>
    </div>
    <div class="lt-card3">
      <div class="lt-av"><img src="${P.w1}" alt="" width="200" height="200"/></div>
      <p class="lt-n">Мария Сидорова</p>
      <span class="lt-soc">in</span>
      <p class="lt-bio">Текст о вкладе специалиста — замените при необходимости.</p>
    </div>
    <div class="lt-card3">
      <div class="lt-av"><img src="${P.w2}" alt="" width="200" height="200"/></div>
      <p class="lt-n">Алексей Козлов</p>
      <span class="lt-soc">in</span>
      <p class="lt-bio">Ещё один абзац для третьего участника команды.</p>
    </div>
  </div>
</section>`,
  },
  {
    id: "team-grid-four-bw",
    badge: "TM04",
    title: "Сетка из четырёх",
    hint: "заголовок и карточки имя + роль",
    content: `${TEAM_RESPONSIVE_CSS}<section data-gjs-name="Команда: сетка 4" class="lemnity-team-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,88px) clamp(16px,4vw,32px);background:#fff;">
  <div class="lt-intro">
    <h2>Кто мы</h2>
    <p>Лучшие люди работают каждый день над сервисом и комфортом клиентов.</p>
  </div>
  <div class="lt-grid4">
    <div class="lt-g4-card">
      <div class="lt-g4-img"><img src="${P.m2}" alt="" width="320" height="320"/></div>
      <p class="lt-g4-n">Максим Голден</p>
      <p class="lt-g4-r">Основатель и арт-директор</p>
    </div>
    <div class="lt-g4-card">
      <div class="lt-g4-img"><img src="${P.w3}" alt="" width="320" height="320"/></div>
      <p class="lt-g4-n">Ева Старк</p>
      <p class="lt-g4-r">Клиентская поддержка</p>
    </div>
    <div class="lt-g4-card">
      <div class="lt-g4-img"><img src="${P.w2}" alt="" width="320" height="320"/></div>
      <p class="lt-g4-n">Юлия Буш</p>
      <p class="lt-g4-r">Дизайн-директор</p>
    </div>
    <div class="lt-g4-card">
      <div class="lt-g4-img"><img src="${P.m1}" alt="" width="320" height="320"/></div>
      <p class="lt-g4-n">Карлос Лотт</p>
      <p class="lt-g4-r">Маркетинг</p>
    </div>
  </div>
</section>`,
  },
  {
    id: "team-split-bio",
    badge: "TM05",
    title: "Портрет и текст",
    hint: "две колонки, на телефоне — столбик",
    content: `${TEAM_RESPONSIVE_CSS}<section data-gjs-name="Команда: сплит" class="lemnity-team-s lemnity-section" style="margin:0;padding:clamp(28px,5vw,56px) clamp(16px,4vw,32px);background:#fff;">
  <div class="lt-split">
    <div class="lt-split-media"><img src="${P.m2}" alt="" width="560" height="560"/></div>
    <div class="lt-split-body">
      <p class="lt-sn">Максим Голден</p>
      <p class="lt-sr">Основатель и арт-директор</p>
      <div class="lt-sl"></div>
      <p class="lt-sb">Максим заложил основы компании и ценности команды. Помогает раскрывать сильные стороны каждого и выстраивать понятный рабочий процесс.</p>
    </div>
  </div>
</section>`,
  },
  {
    id: "team-dream-asymmetric",
    badge: "TM06",
    title: "Крупная карточка + сетка",
    hint: "акцент на одном лице и блок из двух",
    content: `${TEAM_RESPONSIVE_CSS}<section data-gjs-name="Команда: акцент и сетка" class="lemnity-team-s lemnity-section" style="margin:0;padding:clamp(36px,6vw,72px) clamp(16px,4vw,28px);background:#f8fafc;">
  <div class="lt-dream">
    <div class="lt-dream-feature">
      <img src="${P.w1}" alt="" width="720" height="900"/>
      <div class="lt-glass-cap">
        <p class="lt-gn">Эмили Картер</p>
        <p class="lt-gr">Архитектор, основатель</p>
      </div>
    </div>
    <div class="lt-dream-aside">
      <div>
        <h2>Собираем сильную команду</h2>
        <p>Люди за каждым проектом: идеи превращаются в результат, когда работают профессионалы рядом.</p>
        <a href="#">Подробнее о команде</a>
      </div>
      <div class="lt-glass-grid">
        <div class="lt-glass-cell">
          <img src="${P.m3}" alt="" width="400" height="400"/>
          <div class="lt-glass-cap">
            <p class="lt-gn">Джеймс Уитман</p>
            <p class="lt-gr">Проектный архитектор</p>
          </div>
        </div>
        <div class="lt-glass-cell">
          <img src="${P.m2}" alt="" width="400" height="400"/>
          <div class="lt-glass-cap">
            <p class="lt-gn">Лиам Донован</p>
            <p class="lt-gr">Дизайн-архитектор</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "team-meet-cards",
    badge: "TM07",
    title: "Карточки Meet our team",
    hint: "скругления и подпись под фото",
    content: `${TEAM_RESPONSIVE_CSS}<section data-gjs-name="Команда: карточки meet" class="lemnity-team-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,80px) clamp(16px,4vw,28px);background:#f1f5f9;">
  <div class="lt-intro">
    <h2>Познакомьтесь с командой</h2>
    <p>Люди, которые превращают задачи в понятные шаги и результат.</p>
  </div>
  <div class="lt-meet">
    <article class="lt-meet-card">
      <div class="lt-meet-ph"><img src="${P.m3}" alt="" width="400" height="300"/></div>
      <div class="lt-meet-ft">
        <p class="lt-mn">Марк Обей</p>
        <p class="lt-mr">CEO / управляющий директор</p>
      </div>
    </article>
    <article class="lt-meet-card">
      <div class="lt-meet-ph"><img src="${P.w2}" alt="" width="400" height="300"/></div>
      <div class="lt-meet-ft">
        <p class="lt-mn">Эмили Картер</p>
        <p class="lt-mr">Руководитель маркетинга</p>
      </div>
    </article>
    <article class="lt-meet-card">
      <div class="lt-meet-ph"><img src="${P.m1}" alt="" width="400" height="300"/></div>
      <div class="lt-meet-ft">
        <p class="lt-mn">Джеймс Миллер</p>
        <p class="lt-mr">QA engineer</p>
      </div>
    </article>
    <article class="lt-meet-card">
      <div class="lt-meet-ph"><img src="${P.w3}" alt="" width="400" height="300"/></div>
      <div class="lt-meet-ft">
        <p class="lt-mn">София Тан</p>
        <p class="lt-mr">Клиентский сервис</p>
      </div>
    </article>
  </div>
</section>`,
  },
  {
    id: "team-speaker-cards",
    badge: "TM08",
    title: "Карточки спикеров",
    hint: "темы, время, имя и фото — в ряд на десктопе",
    content: `${TEAM_RESPONSIVE_CSS}<section data-gjs-name="Команда: карточки спикеров" class="lemnity-team-s lemnity-section" style="margin:0;padding:clamp(36px,6vw,72px) clamp(16px,4vw,28px);background:#f1f5f9;">
  <div class="lt-sched-head">
    <h2>Команда и выступления</h2>
    <p>Выберите формат: короткие тезисы о людях или расписание секций — подставьте свои темы и время.</p>
  </div>
  <div class="lt-sched-grid">
    <article class="lt-sc-card">
      <div class="lt-sc-tags">
        <span class="lt-sc-tag">Направление</span>
        <span class="lt-sc-tag lt-sc-tag--time">15:00</span>
      </div>
      <h3 class="lt-sc-h">Роль дизайнера в продуктовой команде</h3>
      <div class="lt-sc-row">
        <div class="lt-sc-meta">
          <p class="lt-sc-n">Михаил Я.</p>
          <p class="lt-sc-r">CEO · название компании</p>
        </div>
        <div class="lt-sc-ph"><img src="${P.m2}" alt="" width="112" height="112"/></div>
      </div>
    </article>
    <article class="lt-sc-card">
      <div class="lt-sc-tags">
        <span class="lt-sc-tag">Воркшоп</span>
        <span class="lt-sc-tag lt-sc-tag--time">19:00</span>
      </div>
      <h3 class="lt-sc-h">Как согласовывать дизайн и разработку</h3>
      <div class="lt-sc-row">
        <div class="lt-sc-meta">
          <p class="lt-sc-n">Анна К.</p>
          <p class="lt-sc-r">Lead-дизайнер</p>
        </div>
        <div class="lt-sc-ph"><img src="${P.w2}" alt="" width="112" height="112"/></div>
      </div>
    </article>
  </div>
</section>`,
  },
  {
    id: "team-founder-triple",
    badge: "TM09",
    title: "Текст, портрет, метрика",
    hint: "три колонки, на планшете — столбик",
    content: `${TEAM_RESPONSIVE_CSS}<section data-gjs-name="Команда: лидер и цифра" class="lemnity-team-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,80px) clamp(16px,4vw,28px);background:#f8fafc;">
  <div class="lt-founder">
    <div class="lt-f-col1">
      <h2>Человек за ростом и инновациями</h2>
      <p>Основатель со стратегическим видением и практическим опытом в продукте, командах и устойчивом развитии.</p>
      <a href="#">Подробнее об Эмили</a>
    </div>
    <div class="lt-f-photo"><img src="${P.w1}" alt="" width="480" height="600"/></div>
    <div class="lt-f-profile">
      <p class="lt-f-name">Эмили Картер</p>
      <p class="lt-f-bio">Курирует направление, помогает клиентам и команде находить общий язык и измеримый результат в каждом проекте.</p>
      <p class="lt-f-stat-num">500+</p>
      <p class="lt-f-stat-cap">участников прошли программы и курсы под руководством команды</p>
    </div>
  </div>
</section>`,
  },
  {
    id: "team-overlap-card",
    badge: "TM10",
    title: "Карточка на фото",
    hint: "белый блок поверх портрета, на мобильном — под изображением",
    content: `${TEAM_RESPONSIVE_CSS}<section data-gjs-name="Команда: карточка на фото" class="lemnity-team-s lemnity-section" style="margin:0;padding:clamp(28px,5vw,56px) clamp(14px,3vw,24px);background:#fff;">
  <div class="lt-over-wrap">
    <div class="lt-over-media"><img src="${P.m2}" alt="" width="960" height="600"/></div>
    <div class="lt-over-card">
      <p class="lt-on">Максим Голден</p>
      <p class="lt-or">Основатель и арт-директор</p>
      <p class="lt-ob">Максим заложил цели и ценности компании, собрал ядро команды и помогает раскрывать сильные стороны каждого в работе над продуктом.</p>
    </div>
  </div>
</section>`,
  },
];
