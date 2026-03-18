(function() {
// ── helpers ──────────────────────────────────────────────
function $(id){ return document.getElementById(id); }
function qa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
function qac(el,s){ return Array.prototype.slice.call(el.querySelectorAll(s)); }
function lerp(a,b,t){ return a+(b-a)*t; }
function cl(el,sel){
  while(el&&el!==document){
    try{ if(el.matches&&el.matches(sel))return el; }catch(e){}
    el=el.parentNode;
  }
  return null;
}

// ── DOM ──────────────────────────────────────────────────
var curEl    = $('cur'),  ringEl  = $('ring'), curLbl = $('cur-label');
var track    = $('track'), veil   = $('veil');
var navEl    = $('nav'),  backBtn = $('backBtn');
var dotsEl   = $('dots'), pbEl    = $('pb');
var navInd   = $('nav-ind'), nlCont = $('nlinks');

var viewIds  = ['home','3d','poster','brand','packaging','photography'];
var views    = {};
for(var i=0;i<viewIds.length;i++) views[viewIds[i]] = $('v-'+viewIds[i]);

var panels   = Array.prototype.slice.call(track.querySelectorAll('.panel'));
var N        = panels.length;

// ── state ────────────────────────────────────────────────
var mx=0,my=0, cx=0,cy=0, rx=0,ry=0;
var curX=0, tarX=0, tick=0;
var curView='home', curPanel=0;
var transitioning=false;
var lastWhl=0, whlAcc=0, whlDir=0, whlLock=false;
var touchX=0;

// ── RAF loop ─────────────────────────────────────────────
document.addEventListener('mousemove',function(e){ mx=e.clientX; my=e.clientY; });

function raf(){
  tick++;
  cx=lerp(cx,mx,.18); cy=lerp(cy,my,.18);
  rx=lerp(rx,mx,.07); ry=lerp(ry,my,.07);
  if(curEl)  curEl.style.transform ='translate('+(cx-4)+'px,'+(cy-4)+'px)';
  if(ringEl) ringEl.style.transform='translate('+(rx-18)+'px,'+(ry-18)+'px)';
  if(curLbl) curLbl.style.transform='translate('+cx+'px,'+cy+'px) translate(-50%,-50%)';
  if(curView==='home'){
    curX=lerp(curX,tarX,.044);
    if(Math.abs(curX-tarX)<.25) curX=tarX;
    track.style.transform='translate3d('+(-curX)+'px,0,0)';
    if(tick%2===0) doParallax();
  }
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// ── parallax ─────────────────────────────────────────────
function doParallax(){
  var W=window.innerWidth, prog=curX/W, pi=Math.round(prog);
  for(var o=-1;o<=1;o++){
    var idx=pi+o; if(idx<0||idx>=panels.length) continue;
    var px=(idx-prog)*W;
    var els=qac(panels[idx],'.plx');
    for(var j=0;j<els.length;j++){
      var spd=parseFloat(els[j].getAttribute('data-plx'))||0;
      els[j].style.transform='translate3d('+(px*spd*.1)+'px,0,0)';
    }
  }
}

// ── split text ───────────────────────────────────────────
function splitText(el){
  if(el.getAttribute('data-split')) return;
  el.setAttribute('data-split','1');
  var base=parseFloat(el.getAttribute('data-delay-base')||0);
  var tmp=document.createElement('div'); tmp.innerHTML=el.innerHTML;
  el.innerHTML=''; var ci=0;
  var nodes=Array.prototype.slice.call(tmp.childNodes);
  for(var n=0;n<nodes.length;n++){
    var nd=nodes[n];
    if(nd.nodeType===3){
      var chs=nd.textContent.split('');
      for(var c=0;c<chs.length;c++){
        if(chs[c]===' '){ el.appendChild(document.createTextNode('\u00a0')); continue; }
        var w=document.createElement('span'); w.className='split-word';
        var s=document.createElement('span'); s.className='split-char';
        s.textContent=chs[c]; s.style.transitionDelay=(base+ci*38)+'ms';
        w.appendChild(s); el.appendChild(w); ci++;
      }
    } else if(nd.nodeType===1){
      var wr=nd.cloneNode(false); wr.innerHTML='';
      var ic=nd.textContent.split('');
      for(var k=0;k<ic.length;k++){
        if(ic[k]===' '){ wr.appendChild(document.createTextNode('\u00a0')); continue; }
        var iw=document.createElement('span'); iw.className='split-word';
        var iv=document.createElement('span'); iv.className='split-char';
        iv.textContent=ic[k]; iv.style.transitionDelay=(base+ci*38)+'ms';
        iw.appendChild(iv); wr.appendChild(iw); ci++;
      }
      el.appendChild(wr);
    }
  }
}
function triggerSplit(cont){
  var tgts=qac(cont,'.split-target');
  for(var i=0;i<tgts.length;i++){
    (function(el){ splitText(el); requestAnimationFrame(function(){ var sc=qac(el,'.split-char'); for(var j=0;j<sc.length;j++) sc[j].classList.add('in'); }); })(tgts[i]);
  }
}

// ── image wipe ───────────────────────────────────────────
function revealImgs(cont){
  var cells=qac(cont,'.img-cell');
  for(var i=0;i<cells.length;i++){
    (function(cell,idx){ setTimeout(function(){ cell.classList.add('revealed'); },200+idx*80); })(cells[i],i);
  }
}

// ── view router ──────────────────────────────────────────
function showView(id,instant){
  if(transitioning||id===curView) return;
  transitioning=true;
  if(instant){ _sw(id); transitioning=false; return; }
  if(veil){
    veil.style.transition='transform .55s cubic-bezier(0.83,0,0.17,1)';
    veil.style.transformOrigin='bottom'; veil.style.transform='scaleY(1)';
  }
  setTimeout(function(){
    _sw(id);
    if(veil){ veil.style.transformOrigin='top'; veil.style.transition='transform .55s cubic-bezier(0.16,1,0.3,1)'; veil.style.transform='scaleY(0)'; }
    setTimeout(function(){ transitioning=false; },580);
  },veil?500:10);
}
function _sw(id){
  for(var k=0;k<viewIds.length;k++) if(views[viewIds[k]]) views[viewIds[k]].classList.remove('active');
  if(views[id]) views[id].classList.add('active');
  curView=id;
  var home=(id==='home');
  if(backBtn) backBtn.style.display=home?'none':'block';
  if(dotsEl)  dotsEl.style.display =home?'flex':'none';
  if(pbEl)    pbEl.style.display   =home?'block':'none';
  if(navEl)   navEl.classList.toggle('dark',home&&curPanel===9);
  if(!home&&views[id]){
    views[id].scrollTop=0;
    (function(vid){ setTimeout(function(){
      var els=qac(views[vid],'.rv,.pr,.blur-in');
      for(var i=0;i<els.length;i++) els[i].classList.add('in');
      triggerSplit(views[vid]); revealImgs(views[vid]);
    },120); })(id);
  } else { updateHome(); }
  moveInd();
}

// ── home scroll ──────────────────────────────────────────
for(var di=0;di<panels.length;di++){
  (function(i){ var d=document.createElement('div'); d.className='dot';
    d.addEventListener('click',function(){ goTo(i); });
    if(dotsEl) dotsEl.appendChild(d);
  })(di);
}
function goTo(i){
  if(i<0||i>=N) return;
  curPanel=i; tarX=i*window.innerWidth; updateHome();
}
function updateHome(){
  var dots=qa('.dot');
  for(var i=0;i<dots.length;i++){ dots[i].classList.toggle('on',i===curPanel); dots[i].classList.toggle('dk',curPanel===9); }
  var as=qa('.n-links a[data-nav]');
  for(var j=0;j<as.length;j++) as[j].classList.toggle('on',parseInt(as[j].getAttribute('data-nav'))===curPanel);
  if(pbEl) pbEl.style.width=((curPanel/(N-1))*100)+'%';
  if(navEl) navEl.classList.toggle('dark',curPanel===9);
  (function(p){ setTimeout(function(){
    var els=qac(p,'.rv,.blur-in,.pr');
    for(var i=0;i<els.length;i++) els[i].classList.add('in');
    triggerSplit(p);
  },80); })(panels[curPanel]);
  moveInd();
}

// ── nav indicator ────────────────────────────────────────
function moveInd(){
  if(!navInd||!nlCont) return;
  var a=document.querySelector('.n-links a.on');
  if(!a){ navInd.style.opacity='0'; return; }
  var lr=a.getBoundingClientRect(), nr=nlCont.getBoundingClientRect();
  navInd.style.opacity='1';
  navInd.style.left=(lr.left-nr.left)+'px';
  navInd.style.width=lr.width+'px';
}

// ── cursor ───────────────────────────────────────────────
document.addEventListener('mouseover',function(e){
  document.body.classList.remove('ch','ct','cv','cd');
  if(cl(e.target,'[data-open],[data-go]')||cl(e.target,'.wc')||cl(e.target,'.pc')||cl(e.target,'.pe-cell'))
    document.body.classList.add('cv');
  else if(cl(e.target,'a')||cl(e.target,'button')||cl(e.target,'.tag')||cl(e.target,'.dot'))
    document.body.classList.add('ch');
});
document.addEventListener('mouseout',function(e){
  if(!e.relatedTarget) document.body.classList.remove('ch','ct','cv','cd');
});

// ── wheel ────────────────────────────────────────────────
window.addEventListener('wheel',function(e){
  if(curView!=='home') return;
  e.preventDefault();
  if(whlLock) return;
  var now=Date.now(), d=e.deltaY||e.deltaX;
  if(now-lastWhl>700) whlAcc=0;
  lastWhl=now; whlAcc+=Math.abs(d);
  var dir=d>0?1:-1;
  if(dir!==whlDir){ whlAcc=Math.abs(d); whlDir=dir; }
  if(whlAcc>90){ whlLock=true; whlAcc=0; goTo(curPanel+dir); setTimeout(function(){ whlLock=false; },900); }
},{passive:false});

window.addEventListener('keydown',function(e){
  if(curView!=='home') return;
  if(e.key==='ArrowRight'||e.key==='ArrowDown') goTo(curPanel+1);
  if(e.key==='ArrowLeft'||e.key==='ArrowUp')    goTo(curPanel-1);
  if(e.key==='Escape') showView('home',true);
});
window.addEventListener('touchstart',function(e){ touchX=e.touches[0].clientX; },{passive:true});
window.addEventListener('touchend',function(e){
  if(curView!=='home') return;
  var dx=e.changedTouches[0].clientX-touchX;
  if(Math.abs(dx)>50) goTo(curPanel+(dx<0?1:-1));
},{passive:true});

// ── clicks ───────────────────────────────────────────────
document.addEventListener('click',function(e){
  var go=cl(e.target,'[data-go]'), open=cl(e.target,'[data-open]');
  var nav=cl(e.target,'[data-nav]'), logo=cl(e.target,'.n-logo');
  if(go)  { e.preventDefault(); showView('home',false); return; }
  if(open){ e.preventDefault(); showView(open.getAttribute('data-open'),false); return; }
  if(logo){ e.preventDefault(); showView('home',false); return; }
  if(nav) { e.preventDefault(); var idx=parseInt(nav.getAttribute('data-nav')); var was=(curView==='home'); if(!was) showView('home',true); setTimeout(function(){ goTo(idx); },was?0:50); }
});
if(backBtn) backBtn.addEventListener('click',function(){ showView('home',false); });
window.addEventListener('resize',function(){ tarX=curPanel*window.innerWidth; curX=tarX; moveInd(); });

// ── init ─────────────────────────────────────────────────
_sw('home'); goTo(0);
setTimeout(function(){
  var h=panels[0]; if(!h) return;
  var st=qac(h,'.split-target'); for(var i=0;i<st.length;i++) splitText(st[i]);
  var bi=qac(h,'.blur-in');     for(var j=0;j<bi.length;j++) bi[j].classList.add('in');
  setTimeout(function(){ var sc=qac(h,'.split-char'); for(var k=0;k<sc.length;k++) sc[k].classList.add('in'); },60);
},60);

// ── LOADER ───────────────────────────────────────────────
(function(){
  var loader=$('loader'), bar=$('ld-fill');
  function dismiss(){
    if(!loader) return;
    loader.style.transition='opacity .75s cubic-bezier(0.16,1,0.3,1),transform .75s cubic-bezier(0.16,1,0.3,1)';
    loader.style.opacity='0'; loader.style.transform='translateY(-18px)';
    setTimeout(function(){ if(loader&&loader.parentNode) loader.parentNode.removeChild(loader); },820);
  }
  // hard fallback — always clears after 3.5s no matter what
  var hard=setTimeout(dismiss,3500);
  if(!loader){ clearTimeout(hard); return; }
  var p=0,t=0,done=false;
  var steps=[[30,260],[62,440],[85,360],[100,300]], si=0;
  function next(){ if(si>=steps.length) return; t=steps[si][0]; setTimeout(next,steps[si][1]); si++; }
  function tick(){
    if(done) return;
    p+=(t-p)*.065;
    if(bar) bar.style.width=Math.min(p,100)+'%';
    if(p>=99.4){ done=true; if(bar) bar.style.width='100%'; clearTimeout(hard); setTimeout(dismiss,200); }
    else requestAnimationFrame(tick);
  }
  setTimeout(function(){ next(); tick(); },80);
}());

// ── DARK MODE ────────────────────────────────────────────
(function(){
  var btn=$('dm-btn'), html=document.documentElement, on=false;
  function set(v){ on=v; html.classList.toggle('dm',v); }
  // restore — silently ignore if localStorage blocked
  try{ 
    if(localStorage.getItem('sb_dm')==='1') set(true);
  }catch(e){}
  if(btn) btn.addEventListener('click',function(){
    set(!on);
    try{ localStorage.setItem('sb_dm',on?'1':''); }catch(e){}
  });
}());

}()); // end IIFE
