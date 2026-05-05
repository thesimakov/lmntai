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
  function clearFormFeedback(form){
    var n=form.nextSibling;
    while(n&&n.nodeType===1&&n.classList&&n.classList.contains('lemnity-cms-form-feedback')){
      var nx=n.nextSibling;
      n.remove();
      n=nx;
    }
  }
  function showFormFeedback(form, ok, text){
    clearFormFeedback(form);
    var el=document.createElement('div');
    el.className='lemnity-cms-form-feedback';
    el.setAttribute('role','status');
    el.style.cssText=ok
      ?'padding:14px;border-radius:10px;background:#ecfdf5;color:#065f46;margin-top:10px;font-size:14px;line-height:1.4;font-family:system-ui,sans-serif;'
      :'padding:14px;border-radius:10px;background:#fef2f2;color:#991b1b;margin-top:10px;font-size:14px;line-height:1.4;font-family:system-ui,sans-serif;';
    el.textContent=text;
    form.insertAdjacentElement('afterend', el);
  }
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
    var pid=(typeof ctx.pageId==='string'&&ctx.pageId.trim())?ctx.pageId:null;
    var ppath=(typeof ctx.pagePath==='string'&&ctx.pagePath.trim())?ctx.pagePath:null;
    fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        pageId:pid,
        pagePath:ppath,
        formName:form.getAttribute('name')||form.id||null,
        fields:fields
      })
    }).then(function(res){
      if(!res.ok)throw new Error('HTTP_'+res.status);
      return res.json().catch(function(){return {};});
    }).then(function(){
      showFormFeedback(form,true,'Спасибо! Ваша заявка отправлена!');
    }).catch(function(){
      showFormFeedback(form,false,'Увы, произошла ошибка. Перезагрузите страницу и попробуйте еще раз!');
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

/** Любой HTML документа или фрагмента canvas: без дублирования маркера моста. */
export function injectCmsFormBridgeIntoHtmlDocument(html: string, ctx: CmsFormBridgeContext): string {
  if (!html || html.includes(CMS_FORM_BRIDGE_MARKER)) return html;
  const lower = html.toLowerCase();
  if (lower.includes("</body>")) return injectCmsFormBridgeIntoFullHtml(html, ctx);
  return appendCmsFormBridgeToCanvasHtml(html, ctx);
}
