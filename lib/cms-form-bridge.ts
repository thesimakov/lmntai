import type { PageDocument } from "@/lib/lemnity-box-editor-schema";

/** Не дублировать скрипт при повторной инъекции. */
export const CMS_FORM_BRIDGE_MARKER = "<!--lemnity-cms-form-bridge-->";

export type CmsFormBridgeContext = {
  siteId: string;
  pageId: string;
  pagePath: string;
};

function escapeClosingScript(html: string): string {
  return html.replaceAll("</script>", "<\\/script>");
}

/** Inline-скрипт: перехватывает submit форм и шлёт JSON на публичный API (как формы Tilda). */
export function buildCmsFormBridgeScript(ctx: CmsFormBridgeContext): string {
  const payload = JSON.stringify(ctx);
  const inner = `
(function(){
  var ctx=${payload};
  var endpoint='/api/public/cms/sites/'+encodeURIComponent(ctx.siteId)+'/form-submissions';
  document.addEventListener('submit',function(ev){
    var form=ev.target;
    if(!(form instanceof HTMLFormElement))return;
    if(form.getAttribute('data-cms-form-off')==='true')return;
    ev.preventDefault();
    ev.stopPropagation();
    var fd=new FormData(form);
    var fields={};
    fd.forEach(function(v,k){
      if(typeof v!=='string')return;
      fields[k]=v;
    });
    fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        pageId:ctx.pageId||null,
        pagePath:ctx.pagePath||null,
        formName:form.getAttribute('name')||form.id||null,
        fields:fields
      })
    }).then(function(res){
      if(!res.ok)throw new Error('HTTP_'+res.status);
      return res.json().catch(function(){return {};});
    }).then(function(){
      var thanks=document.createElement('div');
      thanks.setAttribute('role','status');
      thanks.style.cssText='padding:14px;border-radius:10px;background:#ecfdf5;color:#065f46;margin-top:10px;font-size:14px;line-height:1.4;font-family:system-ui,sans-serif;';
      thanks.textContent='Спасибо! Заявка отправлена.';
      form.replaceWith(thanks);
    }).catch(function(){
      alert('Не удалось отправить форму. Попробуйте позже.');
    });
  },true);
})();
`.trim();
  return `<script>${escapeClosingScript(inner)}\n</script>${CMS_FORM_BRIDGE_MARKER}`;
}

/** Для фрагмента body (GrapesJS): дописать скрипт в конец HTML. */
export function appendCmsFormBridgeToCanvasHtml(html: string, ctx: CmsFormBridgeContext): string {
  if (!html || html.includes(CMS_FORM_BRIDGE_MARKER)) return html;
  return `${html}${buildCmsFormBridgeScript(ctx)}`;
}

/** Встроить мост в черновик/опубликованный JSON страницы (headless). */
export function injectCmsFormBridgeIntoPageDocument(doc: PageDocument, ctx: CmsFormBridgeContext): PageDocument {
  const g = doc.grapesjs;
  if (!g || typeof g.html !== "string") return doc;
  return {
    ...doc,
    grapesjs: {
      ...g,
      html: appendCmsFormBridgeToCanvasHtml(g.html, ctx),
    },
  };
}

/** Полный index.html: перед закрывающим </body>. */
export function injectCmsFormBridgeIntoFullHtml(fullHtml: string, ctx: CmsFormBridgeContext): string {
  if (!fullHtml || fullHtml.includes(CMS_FORM_BRIDGE_MARKER)) return fullHtml;
  const bridge = buildCmsFormBridgeScript(ctx);
  const lower = fullHtml.toLowerCase();
  const idx = lower.lastIndexOf("</body>");
  if (idx === -1) return `${fullHtml}${bridge}`;
  return `${fullHtml.slice(0, idx)}${bridge}${fullHtml.slice(idx)}`;
}
