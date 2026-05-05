/**
 * Секция «Контакты»: карты, формы, колонки, плитки. Обёртка: lemnity-contact-s + lemnity-section.
 */

const IU = "https://images.unsplash.com";
const MAP_NYC = `${IU}/photo-1480714378408-67cf0d13bc1b?w=1600&q=85`;
const MAP_NY2 = `${IU}/photo-1514565131-fce0801e5785?w=1600&q=85`;
const ROOM = `${IU}/photo-1586023492125-27b2c045efd7?w=1200&q=80`;
const ROSES = `${IU}/photo-1518628116511-0a977bdf42d1?w=1200&q=85`;
const FOOD = `${IU}/photo-1473093295043-cdd812d7547e?w=1200&q=85`;

const CONTACT_CSS = `<style>
.lemnity-contact-s,.lemnity-contact-s *{box-sizing:border-box}
.lemnity-contact-s img{max-width:100%;display:block}
.ct2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:min(520px,85vh)}
@media (max-width:900px){.ct2{grid-template-columns:1fr}}
.ct3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));min-height:280px}
@media (max-width:900px){.ct3{grid-template-columns:1fr}}
.ct4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(20px,3vw,32px);max-width:1120px;margin:0 auto}
@media (max-width:960px){.ct4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.ct4{grid-template-columns:1fr}}
.ct-inp{display:block;width:100%;padding:12px 14px;border:1px solid #d1d5db;border-radius:4px;font-size:14px;font-family:inherit;background:#fff}
.ct-inp--inv{border-color:rgba(255,255,255,.45);background:transparent;color:#fff}
.ct-inp--inv::placeholder{color:rgba(255,255,255,.55)}
textarea.ct-inp{min-height:120px;resize:vertical}
</style>`;

const I_FB = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9.101 23.691v-9.294H6.877v-3.622h2.224v-2.71c0-2.073 1.327-3.769 3.599-3.769h2.775v3.486H12.82c-.314 0-.692.162-.692.82v1.647h3.148l-.367 3.624h-2.781V23.691H9.101z"/></svg>`;
const I_TW = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
const I_IG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg>`;

function socRow(blackCircles: boolean): string {
  const s = blackCircles
    ? `width:40px;height:40px;border-radius:50%;background:#111;color:#fff;display:inline-flex;align-items:center;justify-content:center`
    : `width:40px;height:40px;border-radius:50%;border:1px solid #e5e7eb;background:#fff;color:#111;display:inline-flex;align-items:center;justify-content:center`;
  return `<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
<a href="#" style="${s}" aria-label="Facebook">${I_FB}</a>
<a href="#" style="${s}" aria-label="X">${I_TW}</a>
<a href="#" style="${s}" aria-label="Instagram">${I_IG}</a>
</div>`;
}

const PIN = `<div style="position:absolute;left:56%;top:52%;transform:translate(-50%,-100%);width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:22px solid #e53935;filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))" aria-hidden="true"></div>`;

export const LEMNITY_CONTACT_BLOCK_VARIANTS = [
  {
    id: "contact-ct01-map-card",
    badge: "CT01",
    title: "Карта и карточка",
    hint: "фон-карта, белая панель слева",
    content: `<section data-gjs-name="Контакты: карта+карточка" class="lemnity-contact-s lemnity-section" style="margin:0;position:relative;min-height:min(520px,72vh);font-family:system-ui,sans-serif;color:#111;">
${CONTACT_CSS}
<div style="position:absolute;inset:0;background:url(${MAP_NYC}) center/cover no-repeat;filter:grayscale(1) contrast(1.05) brightness(1.05)">${PIN}</div>
<div style="position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:clamp(36px,6vw,72px) clamp(20px,4vw,40px);min-height:inherit;display:flex;align-items:center">
<div style="background:#fff;max-width:400px;padding:clamp(28px,4vw,40px) clamp(24px,3vw,36px);box-shadow:0 16px 48px rgba(0,0,0,.12)">
<h2 style="margin:0 0 18px;font-size:clamp(22px,2.4vw,28px);font-weight:800">Contact us</h2>
<div style="font-family:Georgia,serif;font-size:15px;line-height:1.75;color:#111">
<p style="margin:0 0 6px">+1 123 456 78 90</p>
<p style="margin:0 0 6px">hello@madeontilda.com</p>
<p style="margin:0">Loft Pineapple, 22 Pink Street, New York</p>
</div>
${socRow(false)}
</div>
</div>
</section>`,
  },
  {
    id: "contact-ct02-form-navy",
    badge: "CT02",
    title: "Инфо и тёмная форма",
    hint: "иконки слева, синяя карточка формы",
    content: `<section data-gjs-name="Контакты: форма синяя" class="lemnity-contact-s lemnity-section" style="margin:0;font-family:system-ui,sans-serif;">
${CONTACT_CSS}
<div class="ct2" style="background:#e8eaed">
<div style="padding:clamp(32px,5vw,56px) clamp(22px,4vw,40px);display:flex;flex-direction:column;justify-content:center">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">Contact info</p>
<div style="display:flex;flex-direction:column;gap:16px;margin-bottom:28px">
<div style="display:flex;gap:14px;align-items:flex-start"><span style="flex-shrink:0;width:44px;height:44px;background:#f3f4f6;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#111">📞</span><div><p style="margin:0;font-size:15px;font-weight:600;color:#111">+1 (415) 392-8476</p><p style="margin:4px 0 0;font-size:14px;color:#4b5563">+1 (415) 394-5691</p></div></div>
<div style="display:flex;gap:14px;align-items:flex-start"><span style="flex-shrink:0;width:44px;height:44px;background:#f3f4f6;border-radius:6px;display:flex;align-items:center;justify-content:center">✉</span><p style="margin:0;font-size:15px;color:#111">hello.obtix@gmail.com</p></div>
<div style="display:flex;gap:14px;align-items:flex-start"><span style="flex-shrink:0;width:44px;height:44px;background:#f3f4f6;border-radius:6px;display:flex;align-items:center;justify-content:center">📍</span><p style="margin:0;font-size:14px;line-height:1.55;color:#374151">1842 Westbridge Ave, Suite 204<br/>Seattle, WA 98121, USA</p></div>
</div>
<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">Social media</p>
<div style="display:flex;gap:10px"><a href="#" style="width:44px;height:44px;border-radius:50%;background:#2563eb;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">Tg</a><a href="#" style="width:44px;height:44px;border-radius:50%;background:#2563eb;color:#fff;display:inline-flex;align-items:center;justify-content:center">▶</a><a href="#" style="width:44px;height:44px;border-radius:50%;background:#2563eb;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800">♪</a></div>
</div>
<div style="background:#1e3a5f;color:#fff;padding:clamp(32px,5vw,52px) clamp(24px,4vw,40px);display:flex;flex-direction:column;justify-content:center">
<h2 style="margin:0 0 24px;font-size:clamp(24px,2.8vw,32px);font-weight:800;line-height:1.15">Get in Touch With Us</h2>
<form method="post" action="#" style="display:flex;flex-direction:column;gap:14px">
<input class="ct-inp ct-inp--inv" type="text" placeholder="Name" name="name"/>
<input class="ct-inp ct-inp--inv" type="email" placeholder="Email" name="email"/>
<textarea class="ct-inp ct-inp--inv" placeholder="Your Message" name="message"></textarea>
<button type="submit" style="margin-top:8px;padding:14px 24px;background:#fff;color:#1e3a5f;border:0;border-radius:8px;font-weight:800;font-size:15px;cursor:pointer;width:100%">Send Request</button>
</form>
<p style="margin:16px 0 0;font-size:11px;color:rgba(255,255,255,.55);text-align:center">By clicking the button, you agree to our privacy policy</p>
</div>
</div>
</section>`,
  },
  {
    id: "contact-ct03-text-map",
    badge: "CT03",
    title: "Текст и карта",
    hint: "две колонки на белом",
    content: `<section data-gjs-name="Контакты: текст+карта" class="lemnity-contact-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,80px) clamp(18px,4vw,36px);background:#fff;font-family:system-ui,sans-serif;color:#111">
${CONTACT_CSS}
<div class="ct2" style="max-width:1140px;margin:0 auto;align-items:center;gap:clamp(28px,5vw,48px);min-height:0">
<div>
<h2 style="margin:0 0 18px;font-size:clamp(22px,2.6vw,30px);font-weight:800">Contact us</h2>
<p style="margin:0 0 8px;font-size:15px">+1 123 456 78 90</p>
<p style="margin:0 0 8px;font-size:15px">hello@madeontilda.com</p>
<p style="margin:0 0 20px;font-size:15px">Loft Pineapple, 22 Pink Street, New York</p>
${socRow(true)}
</div>
<div style="position:relative;border-radius:14px;overflow:hidden;min-height:320px;background:#e5e7eb">
<img src="${MAP_NY2}" alt="" style="width:100%;height:100%;min-height:320px;object-fit:cover;filter:grayscale(1) saturate(.9)"/>
${PIN}
</div>
</div>
</section>`,
  },
  {
    id: "contact-ct04-map-dark",
    badge: "CT04",
    title: "Карта и тёмная колонка",
    hint: "50/50, соцсети кружками",
    content: `<section data-gjs-name="Контакты: карта+тёмный" class="lemnity-contact-s lemnity-section" style="margin:0;font-family:system-ui,sans-serif;">
${CONTACT_CSS}
<div class="ct2" style="min-height:min(480px,80vh)">
<div style="position:relative;min-height:280px;background:#dfe3e8">
<img src="${MAP_NYC}" alt="" style="width:100%;height:100%;min-height:320px;object-fit:cover;filter:grayscale(.2)"/>
${PIN}
</div>
<div style="background:#1a1a1a;color:#fff;padding:clamp(32px,5vw,56px) clamp(24px,4vw,48px);display:flex;flex-direction:column;justify-content:center">
<h2 style="margin:0 0 18px;font-size:clamp(20px,2.2vw,26px);font-weight:800">Contact us:</h2>
<p style="margin:0 0 6px;font-size:15px">+1 123 456 78 90</p>
<p style="margin:0 0 6px;font-size:15px">hello@madeontilda.com</p>
<p style="margin:0 0 18px;font-size:15px">Loft Pineapple, 22 Pink Street, New York</p>
<p style="margin:0 0 22px;font-size:13px;line-height:1.65;opacity:.85">We are located in the northern part of the city. The nearest subway is the North Road.</p>
<div style="display:flex;gap:12px">
<a href="#" style="width:44px;height:44px;border-radius:50%;background:#fff;color:#1a1a1a;display:inline-flex;align-items:center;justify-content:center">${I_FB}</a>
<a href="#" style="width:44px;height:44px;border-radius:50%;background:#fff;color:#1a1a1a;display:inline-flex;align-items:center;justify-content:center">${I_TW}</a>
<a href="#" style="width:44px;height:44px;border-radius:50%;background:#fff;color:#1a1a1a;display:inline-flex;align-items:center;justify-content:center">${I_IG}</a>
</div>
</div>
</div>
</section>`,
  },
  {
    id: "contact-ct05-four-cols",
    badge: "CT05",
    title: "Четыре колонки",
    hint: "Our Contacts — сетка",
    content: `<section data-gjs-name="Контакты: 4 колонки" class="lemnity-contact-s lemnity-section" style="margin:0;padding:clamp(48px,8vw,96px) clamp(18px,4vw,32px);background:#fff;font-family:system-ui,sans-serif;color:#111">
${CONTACT_CSS}
<div style="text-align:center;max-width:720px;margin:0 auto 48px">
<h2 style="margin:0 0 14px;font-size:clamp(26px,3.2vw,36px);font-weight:800">Our Contacts</h2>
<p style="margin:0;font-size:15px;line-height:1.65;color:#6b7280">Feel free to write, call, and visit us. We really love to communicate with our clients.</p>
</div>
<div class="ct4" style="text-align:left">
<div><p style="margin:0 0 10px;font-size:15px;font-weight:800">Say Hello</p><p style="margin:0 0 4px;font-size:14px;color:#6b7280">+1 312 645 9870</p><p style="margin:0;font-size:14px;color:#6b7280">hello@madeontilda.com</p></div>
<div><p style="margin:0 0 10px;font-size:15px;font-weight:800">New Business</p><p style="margin:0 0 4px;font-size:14px;color:#6b7280">+1 132 465 7910</p><p style="margin:0;font-size:14px;color:#6b7280">ceo@madeontilda.com</p></div>
<div><p style="margin:0 0 10px;font-size:15px;font-weight:800">Work With Us</p><p style="margin:0 0 4px;font-size:14px;color:#6b7280">+1 123 456 7890</p><p style="margin:0;font-size:14px;color:#6b7280">hr@madeontilda.com</p></div>
<div><p style="margin:0 0 10px;font-size:15px;font-weight:800">Our Location</p><p style="margin:0;font-size:14px;line-height:1.55;color:#6b7280">Loft Pineapple, 22 Green Street, New York</p></div>
</div>
</section>`,
  },
  {
    id: "contact-ct06-centered-serif",
    badge: "CT06",
    title: "По центру с соцсетями",
    hint: "sans заголовок, serif контакты",
    content: `<section data-gjs-name="Контакты: центр" class="lemnity-contact-s lemnity-section" style="margin:0;padding:clamp(56px,10vw,120px) 24px;background:#fff;font-family:system-ui,sans-serif;text-align:center;color:#111">
${CONTACT_CSS}
<h2 style="margin:0 0 22px;font-size:clamp(20px,2.2vw,26px);font-weight:700">Contact us:</h2>
<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6">
<p style="margin:0 0 4px">+1 123 456 7890</p>
<p style="margin:0 0 14px">hello@madeontilda.com</p>
<p style="margin:0;font-size:14px;color:#888">Pineapple Loft, 22 Pink Street, New York</p>
</div>
<div style="display:flex;gap:12px;justify-content:center;margin-top:28px">
<a href="#" style="width:44px;height:44px;border-radius:50%;background:#111;color:#fff;display:inline-flex;align-items:center;justify-content:center">${I_FB}</a>
<a href="#" style="width:44px;height:44px;border-radius:50%;background:#111;color:#fff;display:inline-flex;align-items:center;justify-content:center">${I_TW}</a>
<a href="#" style="width:44px;height:44px;border-radius:50%;background:#111;color:#fff;display:inline-flex;align-items:center;justify-content:center">${I_IG}</a>
</div>
</section>`,
  },
  {
    id: "contact-ct07-salon-split",
    badge: "CT07",
    title: "Салон: карта и синий блок",
    hint: "режим работы и реквизиты",
    content: `<section data-gjs-name="Контакты: салон" class="lemnity-contact-s lemnity-section" style="margin:0;font-family:system-ui,sans-serif;">
${CONTACT_CSS}
<div class="ct2" style="min-height:440px">
<div style="position:relative;min-height:280px;background:#e5e7eb"><img src="${MAP_NYC}" alt="" style="width:100%;height:100%;object-fit:cover;min-height:320px;filter:grayscale(.25)"/>${PIN}</div>
<div style="background:#1a2744;color:#fff;padding:clamp(32px,5vw,56px);display:flex;flex-direction:column;justify-content:center;text-align:left">
<p style="margin:0 0 16px;font-size:15px;font-weight:700;line-height:1.5">The salon is open daily, 11 AM till 10 PM.</p>
<p style="margin:0 0 28px;font-size:14px;line-height:1.65;opacity:.9">Feel free to drop by — we'd be happy to advise you on cosmetology and beauty.</p>
<p style="margin:0 0 8px;font-size:16px;font-weight:800">Marrakech Mixture Salon Ltd</p>
<p style="margin:0 0 6px;font-size:14px;opacity:.9">56 Chambers St, New York, NY 10007, USA</p>
<p style="margin:0 0 4px;font-size:14px;opacity:.9">Phone: +12126789012</p>
<p style="margin:0;font-size:14px;opacity:.9">Email: enquiry@lessalon.com</p>
</div>
</div>
</section>`,
  },
  {
    id: "contact-ct08-big-type-gray",
    badge: "CT08",
    title: "Крупный тип на сером",
    hint: "телефон и email акцентом",
    content: `<section data-gjs-name="Контакты: крупный тип" class="lemnity-contact-s lemnity-section" style="margin:0;padding:clamp(56px,9vw,100px) 24px;background:#e8eaed;font-family:system-ui,sans-serif;text-align:center;color:#111">
${CONTACT_CSS}
<p style="margin:0 0 8px;font-size:clamp(26px,3.5vw,38px);font-weight:800">+1 123 456 7890</p>
<p style="margin:0 0 24px;font-size:clamp(20px,2.6vw,28px);font-weight:800">hello@madeontilda.com</p>
<div style="font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#374151">
<p style="margin:0">Pineapple Loft, 22 Pink Street,</p>
<p style="margin:0">New York</p>
</div>
<div style="display:flex;gap:10px;justify-content:center;margin-top:28px">
<a href="#" style="width:40px;height:40px;border-radius:50%;background:#111;color:#fff;display:inline-flex;align-items:center;justify-content:center">${I_FB}</a>
<a href="#" style="width:40px;height:40px;border-radius:50%;background:#111;color:#fff;display:inline-flex;align-items:center;justify-content:center">${I_TW}</a>
<a href="#" style="width:40px;height:40px;border-radius:50%;background:#111;color:#fff;display:inline-flex;align-items:center;justify-content:center">${I_IG}</a>
</div>
</section>`,
  },
  {
    id: "contact-ct09-dark-centered",
    badge: "CT09",
    title: "Тёмный фон по центру",
    hint: "белые круги и serif",
    content: `<section data-gjs-name="Контакты: тёмный" class="lemnity-contact-s lemnity-section" style="margin:0;padding:clamp(64px,11vw,120px) 24px;background:#111;font-family:system-ui,sans-serif;text-align:center;color:#fff;position:relative">
${CONTACT_CSS}
<div style="display:flex;gap:10px;justify-content:center;margin-bottom:28px">
<a href="#" style="width:46px;height:46px;border-radius:50%;background:#fff;color:#111;display:inline-flex;align-items:center;justify-content:center">${I_FB}</a>
<a href="#" style="width:46px;height:46px;border-radius:50%;background:#fff;color:#111;display:inline-flex;align-items:center;justify-content:center">${I_TW}</a>
<a href="#" style="width:46px;height:46px;border-radius:50%;background:#fff;color:#111;display:inline-flex;align-items:center;justify-content:center">${I_IG}</a>
</div>
<p style="margin:0 auto 28px;max-width:520px;font-size:16px;line-height:1.6;font-weight:500">Feel free to write, call and visit us. We really love to<br/>communicate with our clients.</p>
<div style="font-family:Georgia,serif;font-size:15px;line-height:1.75;opacity:.95">
<p style="margin:0 0 6px">New York, Loft Pie, 22 Pink Street</p>
<p style="margin:0 0 6px">Phone: +1 123 456 78 90</p>
<p style="margin:0">E-mail: hello@madeontilda.com</p>
</div>
</section>`,
  },
  {
    id: "contact-ct10-triptych-form",
    badge: "CT10",
    title: "Три колонки + форма",
    hint: "серый / чёрный / мята",
    content: `<section data-gjs-name="Контакты: триптих" class="lemnity-contact-s lemnity-section" style="margin:0;font-family:system-ui,sans-serif;color:#fff">
${CONTACT_CSS}
<div class="ct3" style="min-height:380px">
<div style="background:#555;padding:32px 20px;text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center">
<h3 style="margin:0 0 8px;font-size:22px;font-weight:800;line-height:1.1"><span style="color:#7ee0b0">CONTACT</span><br/><span>US</span></h3>
<div style="width:36px;height:2px;background:#fff;margin:14px 0"></div>
<p style="margin:0;font-size:12px;line-height:1.7;opacity:.95">Tel: 123-456-7890<br/>Fax: 123-456-7890<br/>500 Terry Francois Street,<br/>San Francisco, CA 94158</p>
</div>
<div style="background:#000;padding:32px 20px;text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center">
<h3 style="margin:0 0 8px;font-size:22px;font-weight:800;line-height:1.1"><span style="color:#7ee0b0">VISIT</span><br/><span>US</span></h3>
<div style="width:36px;height:2px;background:#fff;margin:14px 0"></div>
<p style="margin:0;font-size:12px;line-height:1.7;opacity:.95">Monday - Friday: 11:00 - 18:30<br/>Saturday: 11:00 - 17:30<br/>Sunday: 12:30 - 16:30</p>
</div>
<div style="background:#7dd3c0;color:#111;padding:24px 16px;display:flex;flex-direction:column;justify-content:center">
<h3 style="margin:0 0 8px;font-size:22px;font-weight:800;text-align:center;line-height:1.1"><span>TELL</span><br/><span style="color:#fff">US</span></h3>
<div style="width:36px;height:2px;background:#fff;margin:12px auto 16px"></div>
<div style="display:grid;grid-template-columns:1fr 1.1fr;gap:8px;align-items:stretch">
<div style="display:flex;flex-direction:column;gap:8px"><input class="ct-inp" placeholder=" "/><input class="ct-inp" placeholder=" "/><input class="ct-inp" placeholder=" "/></div>
<div style="display:flex;flex-direction:column"><textarea class="ct-inp" style="flex:1;min-height:120px"></textarea></div>
</div>
<button type="button" style="margin-top:12px;margin-left:auto;padding:8px 20px;background:#111;color:#fff;border:0;font-weight:700;cursor:pointer;font-size:12px">OK</button>
</div>
</div>
</section>`,
  },
  {
    id: "contact-ct11-coral-split",
    badge: "CT11",
    title: "Коралл и интерьер",
    hint: "форма и фото 50/50",
    content: `<section data-gjs-name="Контакты: коралл" class="lemnity-contact-s lemnity-section" style="margin:0;font-family:system-ui,sans-serif;">
${CONTACT_CSS}
<div class="ct2" style="min-height:480px">
<div style="background:url(${ROOM}) center/cover no-repeat;padding:clamp(32px,6vw,56px) clamp(22px,4vw,36px);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;position:relative">
<div style="background:rgba(255,255,255,.88);padding:8px 16px;border-radius:8px;margin-bottom:18px"><h2 style="margin:0;font-family:Georgia,serif;font-size:clamp(22px,2.8vw,30px);font-weight:700;color:#f27166">КОНТАКТЫ</h2></div>
<p style="margin:0 0 12px;font-size:14px;color:#374151;max-width:340px">200 Terry Francois Street, San Francisco, CA 94158</p>
<div style="width:48px;height:3px;background:#f27166;border-radius:2px"></div>
</div>
<div style="background:#f27166;color:#fff;padding:clamp(28px,5vw,44px) clamp(20px,4vw,32px);display:flex;flex-direction:column;justify-content:center">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px"><input class="ct-inp" placeholder="Имя"/><input class="ct-inp" placeholder="Email"/></div>
<input class="ct-inp" style="margin-bottom:10px" placeholder="Тема"/>
<textarea class="ct-inp" placeholder="Сообщение" style="margin-bottom:14px"></textarea>
<button type="button" style="width:100%;padding:14px;background:#111;color:#fff;border:0;font-weight:700;cursor:pointer">Отправить</button>
<div style="display:flex;gap:12px;justify-content:center;margin-top:20px;opacity:.9;font-size:11px;font-weight:700">in · f · 𝕏 · G · ◎</div>
</div>
</div>
</section>`,
  },
  {
    id: "contact-ct12-minimal-text",
    badge: "CT12",
    title: "Минимал: заголовок",
    hint: "центр, serif детали",
    content: `<section data-gjs-name="Контакты: минимал" class="lemnity-contact-s lemnity-section" style="margin:0;padding:clamp(56px,9vw,100px) 24px;background:#fff;font-family:system-ui,sans-serif;text-align:center;color:#111">
${CONTACT_CSS}
<h2 style="margin:0 0 16px;font-size:clamp(28px,3.2vw,38px);font-weight:800">Contacts</h2>
<p style="margin:0 auto 36px;max-width:520px;font-size:15px;line-height:1.65;color:#6b7280">If you have any questions, connect us by phone or e-mail. Also we have a special address where you can get your order.</p>
<div style="font-family:Georgia,serif;font-size:16px;line-height:1.7">
<p style="margin:0 0 6px">New York, Loft Pie, 22 Pink Street</p>
<p style="margin:0 0 6px">Phone: +1 123 456 7890</p>
<p style="margin:0">Email: hello@madeontilda.com</p>
</div>
</section>`,
  },
  {
    id: "contact-ct13-cream-form",
    badge: "CT13",
    title: "Кремовый фон и форма",
    hint: "заголовок serif",
    content: `<section data-gjs-name="Контакты: крем" class="lemnity-contact-s lemnity-section" style="margin:0;padding:clamp(48px,7vw,88px) clamp(18px,4vw,32px);background:#fef9c3;font-family:system-ui,sans-serif;text-align:center;color:#1e293b">
${CONTACT_CSS}
<h2 style="margin:0 0 20px;font-family:Georgia,serif;font-size:clamp(28px,3.2vw,40px);font-weight:700">Контакты</h2>
<p style="margin:0 auto 12px;max-width:480px;font-size:15px">800 Terry Francois Street, San Francisco, CA 94158</p>
<p style="margin:0 auto 24px;font-size:14px;color:#475569">info@mysite.com | Tel: 123-456-7890</p>
<div style="display:flex;gap:10px;justify-content:center;margin-bottom:28px">
<a href="#" style="color:#111">${I_FB}</a>
<a href="#" style="color:#111">${I_TW}</a>
<a href="#" style="color:#111">${I_IG}</a>
</div>
<form method="post" action="#" style="max-width:420px;margin:0 auto;text-align:left;display:flex;flex-direction:column;gap:12px">
<input class="ct-inp" name="name" placeholder="Имя"/>
<input class="ct-inp" name="email" type="email" placeholder="Email"/>
<input class="ct-inp" name="subject" placeholder="Тема"/>
<textarea class="ct-inp" name="message" placeholder="Сообщение"></textarea>
<button type="submit" style="padding:14px;background:#111;color:#fff;border:0;font-weight:700;cursor:pointer;margin-top:4px">Отправить</button>
</form>
</section>`,
  },
  {
    id: "contact-ct14-hours-strip",
    badge: "CT14",
    title: "Часы · адрес · фото",
    hint: "три колонки",
    content: `<section data-gjs-name="Контакты: полоса" class="lemnity-contact-s lemnity-section" style="margin:0;font-family:system-ui,sans-serif;">
${CONTACT_CSS}
<div class="ct3" style="min-height:300px">
<div style="background:#000;color:#fff;padding:32px 16px;text-align:center;display:flex;flex-direction:column;justify-content:center">
<p style="margin:0 0 14px;font-size:12px;font-weight:800;letter-spacing:.12em">OPENING HOURS</p>
<p style="margin:0;font-size:11px;line-height:1.8;opacity:.95">MONDAY - FRIDAY: 11.00 - 19.30<br/>SATURDAY: 11.00 - 17.00<br/>SUNDAY: 12.30 - 16.30</p>
</div>
<div style="background:#fff;color:#111;padding:32px 16px;text-align:center;display:flex;flex-direction:column;justify-content:center">
<p style="margin:0 0 14px;font-size:12px;font-weight:800;letter-spacing:.12em">ADDRESS</p>
<p style="margin:0;font-size:11px;line-height:1.8;font-weight:600">500 TERRY FRANCOIS STREET<br/>SAN FRANCISCO, CA 94158<br/>INFO@MYSITE.COM | TEL: 123-456-7890</p>
</div>
<div style="background:url(${ROSES}) center/cover no-repeat;min-height:200px"></div>
</div>
</section>`,
  },
  {
    id: "contact-ct15-three-cards",
    badge: "CT15",
    title: "Три квадратных карточки",
    hint: "МЫ НА СВЯЗИ",
    content: `<section data-gjs-name="Контакты: карточки" class="lemnity-contact-s lemnity-section" style="margin:0;padding:clamp(40px,6vw,72px) 0;background:#e5e7eb;font-family:system-ui,sans-serif;">
${CONTACT_CSS}
<div style="text-align:center;padding:0 16px 32px">
<h2 style="margin:0 0 8px;font-size:clamp(22px,2.6vw,30px);font-weight:800;color:#9ca3af;letter-spacing:.02em;text-transform:uppercase">МЫ НА СВЯЗИ</h2>
<p style="margin:0;font-size:15px;font-style:italic;color:#9ca3af">We'd love to hear from you</p>
</div>
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));max-width:900px;margin:0 auto">
<div style="background:#f3f4f6;padding:40px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;justify-content:center;min-height:220px">
<span style="font-size:28px" aria-hidden="true">✈</span>
<p style="margin:0;font-size:13px;font-weight:600;color:#111">info@mysite.com</p>
</div>
<div style="background:#dc2626;color:#fff;padding:40px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;justify-content:center;min-height:220px">
<span style="font-size:28px" aria-hidden="true">📱</span>
<p style="margin:0;font-size:13px;font-weight:600">123-456-7890</p>
</div>
<div style="background:#1877f2;color:#fff;padding:40px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;justify-content:center;min-height:220px">
<span style="font-size:24px;font-weight:900">f</span>
<p style="margin:0;font-size:13px;font-weight:600">Find us on Facebook</p>
</div>
</div>
</section>`,
  },
  {
    id: "contact-ct16-script-food",
    badge: "CT16",
    title: "Скрипт и фото блюда",
    hint: "сплит 50/50",
    content: `<section data-gjs-name="Контакты: скрипт" class="lemnity-contact-s lemnity-section" style="margin:0;font-family:system-ui,sans-serif;">
${CONTACT_CSS}
<div class="ct2" style="min-height:440px">
<div style="background:#faf8f0;padding:clamp(28px,5vw,48px) clamp(20px,4vw,36px);display:flex;flex-direction:column;align-items:center;text-align:center">
<h2 style="margin:0 0 20px;font-family:'Brush Script MT','Segoe Script',cursive;font-size:clamp(32px,4vw,44px);font-weight:400;color:#b8860b">Ты на связи</h2>
<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#4b5563;max-width:320px">2030 Terry Francois Street, San Francisco, CA 94158<br/>info@mysite.com / Tel: 123-456-7890</p>
<form method="post" action="#" style="width:100%;max-width:340px">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;border-bottom:1px solid #d4c4a8;padding-bottom:8px"><input type="text" name="first_name" style="border:0;background:transparent;font-size:13px;width:100%" placeholder=""/><input type="text" name="last_name" style="border:0;background:transparent;font-size:13px;width:100%" placeholder=""/></div>
<div style="border-bottom:1px solid #d4c4a8;padding-bottom:8px;margin-bottom:16px"><input type="text" name="line2" style="border:0;background:transparent;width:100%;font-size:13px" placeholder=""/></div>
<div style="border-bottom:1px solid #d4c4a8;padding-bottom:8px;margin-bottom:16px"><input type="email" name="email" style="border:0;background:transparent;width:100%;font-size:13px" placeholder=""/></div>
<div style="border-bottom:1px solid #d4c4a8;padding-bottom:8px;margin-bottom:20px"><textarea name="message" style="border:0;background:transparent;width:100%;min-height:72px;font-size:13px;resize:none;font-family:inherit"></textarea></div>
<button type="submit" style="border:0;background:transparent;color:#b8860b;font-weight:600;font-size:14px;cursor:pointer;text-decoration:underline">Отправить</button>
</form>
</div>
<div style="min-height:280px;background:url(${FOOD}) center/cover no-repeat"></div>
</div>
</section>`,
  },
  {
    id: "contact-ct17-strip-map",
    badge: "CT17",
    title: "Иконки и карта",
    hint: "полоса контактов + карта",
    content: `<section data-gjs-name="Контакты: полоса+карта" class="lemnity-contact-s lemnity-section" style="margin:0;background:#fff;font-family:system-ui,sans-serif;color:#111">
${CONTACT_CSS}
<div style="max-width:1100px;margin:0 auto;padding:clamp(36px,6vw,56px) clamp(18px,4vw,28px)">
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(20px,4vw,40px);text-align:center;margin-bottom:clamp(28px,4vw,40px)">
<div><div style="width:52px;height:52px;margin:0 auto 12px;border-radius:12px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:20px">📞</div><p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.06em;color:#64748b">ТЕЛЕФОН</p><p style="margin:0;font-size:15px;font-weight:700">+1 123 456 7890</p></div>
<div><div style="width:52px;height:52px;margin:0 auto 12px;border-radius:12px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:20px">✉</div><p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.06em;color:#64748b">EMAIL</p><p style="margin:0;font-size:15px;font-weight:700">hello@madeontilda.com</p></div>
<div><div style="width:52px;height:52px;margin:0 auto 12px;border-radius:12px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:20px">📍</div><p style="margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.06em;color:#64748b">ОФИС</p><p style="margin:0;font-size:14px;line-height:1.5;color:#334155">Loft Pineapple, 22 Pink St, New York</p></div>
</div>
</div>
<div style="position:relative;height:min(360px,45vh);min-height:240px;background:#e2e8f0">
<img src="${MAP_NY2}" alt="" style="width:100%;height:100%;object-fit:cover;filter:grayscale(1) brightness(1.05)"/>${PIN}
</div>
</section>`,
  },
];
