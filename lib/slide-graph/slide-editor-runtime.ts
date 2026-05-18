/** Injected into the slide preview iframe for select + free drag (960×540 logical canvas). */
export const SLIDE_EDITOR_INTERACTION_SCRIPT = `<script>(function(){
var SLIDE_W=960,SLIDE_H=540;
var sel=null,drag=null;

function slideRoot(){return document.querySelector('[data-lmnt-slide-id]');}

function desel(){
  if(sel){sel.style.outline='';sel.style.boxShadow='';sel=null;}
}

function post(type,payload){
  window.parent.postMessage(Object.assign({type:type},payload||{}),'*');
}

function scaleFromSlide(slide,clientX,clientY){
  var r=slide.getBoundingClientRect();
  if(r.width<1||r.height<1)return{x:0,y:0};
  return{
    x:Math.round((clientX-r.left)/r.width*SLIDE_W),
    y:Math.round((clientY-r.top)/r.height*SLIDE_H)
  };
}

function findElemTarget(t){
  var el=t;
  while(el&&el!==document.body){
    if(el.dataset&&el.dataset.lmntElemId)return el;
    el=el.parentElement;
  }
  return null;
}

function captureFrames(){
  var slide=slideRoot();
  if(!slide)return;
  var sr=slide.getBoundingClientRect();
  if(sr.width<1)return;
  var frames=[];
  slide.querySelectorAll('[data-lmnt-elem-id]').forEach(function(el,i){
    var r=el.getBoundingClientRect();
    frames.push({
      elemId:el.dataset.lmntElemId,
      frame:{
        x:Math.round((r.left-sr.left)/sr.width*SLIDE_W),
        y:Math.round((r.top-sr.top)/sr.height*SLIDE_H),
        w:Math.max(24,Math.round(r.width/sr.width*SLIDE_W)),
        h:Math.max(24,Math.round(r.height/sr.height*SLIDE_H)),
        zIndex:i+1
      }
    });
  });
  post('lmnt-frames-init',{slideId:slide.dataset.lmntSlideId,frames:frames});
}

document.addEventListener('pointerdown',function(e){
  var target=findElemTarget(e.target);
  var slide=slideRoot();
  if(!slide)return;
  if(target){
    e.preventDefault();
    desel();
    sel=target;
    sel.style.outline='2px solid #4F8EF7';
    sel.style.boxShadow='0 0 0 1px rgba(79,142,247,0.35)';
    var slideId=slide.dataset.lmntSlideId;
    var elemId=target.dataset.lmntElemId;
    post('lmnt-elem-selected',{slideId:slideId,elemId:elemId});
    if(slide.dataset.lmntFreeform==='1'){
      var p=scaleFromSlide(slide,e.clientX,e.clientY);
      var left=parseFloat(target.style.left)||0;
      var top=parseFloat(target.style.top)||0;
      drag={
        elem:target,slideId:slideId,elemId:elemId,
        offX:p.x-left,offY:p.y-top,
        moved:false,startX:e.clientX,startY:e.clientY
      };
      try{target.setPointerCapture(e.pointerId);}catch(err){}
    }
    return;
  }
  desel();
  post('lmnt-elem-deselected',{});
},{passive:false});

document.addEventListener('pointermove',function(e){
  if(!drag)return;
  if(Math.abs(e.clientX-drag.startX)+Math.abs(e.clientY-drag.startY)>3)drag.moved=true;
  if(!drag.moved)return;
  var slide=slideRoot();
  if(!slide)return;
  var p=scaleFromSlide(slide,e.clientX,e.clientY);
  var w=parseFloat(drag.elem.style.width)||120;
  var h=parseFloat(drag.elem.style.height)||40;
  var nx=Math.max(0,Math.min(SLIDE_W-w,p.x-drag.offX));
  var ny=Math.max(0,Math.min(SLIDE_H-h,p.y-drag.offY));
  drag.elem.style.left=nx+'px';
  drag.elem.style.top=ny+'px';
},{passive:true});

function endDrag(e){
  if(!drag)return;
  var d=drag;
  drag=null;
  try{if(d.elem.releasePointerCapture)e.pointerId;}catch(err){}
  if(!d.moved)return;
  var slide=slideRoot();
  if(!slide)return;
  post('lmnt-elem-frame',{
    slideId:d.slideId,
    elemId:d.elemId,
    frame:{
      x:Math.round(parseFloat(d.elem.style.left)||0),
      y:Math.round(parseFloat(d.elem.style.top)||0),
      w:Math.round(parseFloat(d.elem.style.width)||120),
      h:Math.round(parseFloat(d.elem.style.height)||40)
    }
  });
}

document.addEventListener('pointerup',endDrag);
document.addEventListener('pointercancel',endDrag);

function boot(){
  var slide=slideRoot();
  if(slide&&slide.dataset.lmntCaptureFrames==='1'){
    requestAnimationFrame(function(){requestAnimationFrame(captureFrames);});
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();<\/script>`;
