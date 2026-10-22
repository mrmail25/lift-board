// Ape-Chit storyboard. Mock data and throwaway glue only: no real training logic.
// One shared bottom sheet (sheet()), one keypad, hash routes for every screen (ROUTES near the bottom).
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const EX={};(window.EXL||[]).forEach(([id,name,type,eq,mus,rat])=>EX[id]={id,name,type,eq,mus,rat:rat||{}});
const ML={chest:'Chest',front_delts:'Front delts',side_delts:'Side delts',rear_delts:'Rear delts',lats:'Lats',upper_back:'Upper back',traps:'Traps',biceps:'Biceps',triceps:'Triceps',forearms:'Forearms',abs:'Abs',quads:'Quads',hamstrings:'Hamstrings',glutes:'Glutes',calves:'Calves',adductors:'Adductors',lower_back:'Lower back',obliques:'Obliques',abductors:'Abductors',brachialis:'Brachialis'};
const GLY={primary:'★',accessory:'✚',isolation:'●'};
const exNameP=id=>(EX[id]||{}).name||id;
const exName=id=>exNameP(id)+(typeof isFav==='function'&&isFav(id)?' <span class="fv" aria-label="Favorite">★</span>':'');
const exSub=id=>{const e=EX[id];return e?e.mus.map(m=>ML[m]||m).join(' · '):''};
const gl=id=>{const t=(EX[id]||{}).type||'isolation';return `<span class="gl ${t}" title="${t}">${GLY[t]}</span>`};

// ---------------------------------------------------------------- icons (SF-Symbol-like strokes)
const P={
 train:'<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
 log:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 build:'<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><path d="M17 14v6M14 17h6"/>',
 progress:'<path d="M5 19.5V12M12 19.5V5M19 19.5v-9"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 book:'<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/>',
 trash:'<path d="M4 6.5h16M9 6.5V4.8c0-.7.5-1.3 1.2-1.3h3.6c.7 0 1.2.6 1.2 1.3v1.7M6 6.5l.9 12.6c.1 1 .9 1.9 2 1.9h6.2c1.1 0 1.9-.9 2-1.9L18 6.5M10 10.5v6M14 10.5v6"/>',
 chevD:'<path d="M6 9.5l6 6 6-6"/>',chevL:'<path d="M15 5l-7 7 7 7"/>',chevR:'<path d="M9 5l7 7-7 7"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 swap:'<path d="M7 4v16M7 4L3.5 7.5M7 4l3.5 3.5M17 20V4M17 20l-3.5-3.5M17 20l3.5-3.5"/>',
 back:'<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM17.5 9.5l-5 5M12.5 9.5l5 5"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 plate:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.2"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
 grip:'<path d="M9 7h.01M15 7h.01M9 12h.01M15 12h.01M9 17h.01M15 17h.01" stroke-width="3"/>',
 pause:'<path d="M9 6v12M15 6v12" stroke-width="2.6"/>',play:'<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
 info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.01" stroke-width="2.2"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',up:'<path d="M12 19V5M6 11l6-6 6 6"/>',down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
 tabs:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 15h18M7.5 17.5h.01M12 17.5h.01M16.5 17.5h.01"/>',
 flame:'<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.4 3.6-8.3.4 1.6 1.4 2.8 2.4 3.3.3-2.8 1.9-5.3 4.1-6.8-.3 2.8.6 4.6 1.9 6.5 1 1.5 1 3 1 5.3C18.5 18.4 15.9 21 12 21z"/>',
};
const I=(n,sw=1.8)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${P[n]}</svg>`;
const CHEV=`<svg class="chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l6 6-6 6"/></svg>`;

// ---------------------------------------------------------------- mock data
const R=(id,s,r)=>({id,s,r});
const ROUTINES=[
 {id:'ul',name:'Upper / Lower',meta:'4 days · Intermediate',week:'Week 3 of 6',active:true,next:2,days:[
  {n:'Upper A',d:'Mon',min:58,ex:[R('barbell-bench-press',4,'6–8'),R('barbell-row',3,'6–8'),R('seated-dumbbell-shoulder-press',3,'8–10'),R('lat-pulldown',3,'10–12'),R('ez-bar-curl',2,'10–12'),R('triceps-pushdown',2,'10–12')]},
  {n:'Lower A',d:'Tue',min:55,ex:[R('back-squat',4,'5–7'),R('romanian-deadlift',3,'8–10'),R('leg-press',3,'10–12'),R('lying-leg-curl',3,'10–12'),R('standing-calf-raise',4,'10–15')]},
  {n:'Upper B',d:'Thu',min:56,ex:[R('incline-dumbbell-press',3,'8–10'),R('chest-supported-row',3,'8–10'),R('pull-up',3,'6–10'),R('cable-lateral-raise',3,'12–15'),R('incline-dumbbell-curl',2,'10–12'),R('overhead-cable-triceps-extension',2,'10–12')]},
  {n:'Lower B',d:'Fri',min:52,ex:[R('deadlift',3,'4–6'),R('hack-squat',3,'8–10'),R('bulgarian-split-squat',3,'8–10'),R('seated-leg-curl',3,'10–12'),R('hanging-leg-raise',3,'10–15')]}]},
 {id:'ppl',name:'Push / Pull / Legs',meta:'6 days · Advanced',days:[
  {n:'Push',d:'Mon',min:62,ex:[R('barbell-bench-press',4,'6–8'),R('overhead-press',3,'6–8'),R('incline-dumbbell-press',3,'8–10'),R('cable-lateral-raise',4,'12–15'),R('skull-crusher',3,'10–12')]},
  {n:'Pull',d:'Tue',min:60,ex:[R('deadlift',3,'4–6'),R('pull-up',4,'6–10'),R('seated-cable-row',3,'10–12'),R('face-pull',3,'12–15'),R('hammer-curl',3,'10–12')]},
  {n:'Legs',d:'Wed',min:64,ex:[R('back-squat',4,'5–7'),R('romanian-deadlift',3,'8–10'),R('leg-extension',3,'12–15'),R('seated-leg-curl',3,'10–12'),R('seated-calf-raise',4,'12–15')]}]},
 {id:'fb',name:'Full Body',meta:'3 days · Beginner',days:[
  {n:'Day A',d:'Mon',min:50,ex:[R('back-squat',3,'6–8'),R('barbell-bench-press',3,'6–8'),R('barbell-row',3,'8–10'),R('dumbbell-lateral-raise',2,'12–15')]},
  {n:'Day B',d:'Wed',min:48,ex:[R('romanian-deadlift',3,'8–10'),R('overhead-press',3,'6–8'),R('lat-pulldown',3,'10–12'),R('ez-bar-curl',2,'10–12')]},
  {n:'Day C',d:'Fri',min:50,ex:[R('leg-press',3,'10–12'),R('incline-dumbbell-press',3,'8–10'),R('chest-supported-row',3,'8–10'),R('triceps-pushdown',2,'10–12')]}]},
 {id:'arn',name:'Arnold Split',meta:'6 days · Advanced',days:[
  {n:'Chest & Back',d:'Mon',min:66,ex:[R('incline-barbell-bench-press',4,'6–8'),R('pull-up',4,'6–10'),R('cable-fly',3,'12–15'),R('t-bar-row',3,'8–10')]},
  {n:'Shoulders & Arms',d:'Tue',min:60,ex:[R('overhead-press',4,'6–8'),R('dumbbell-lateral-raise',4,'12–15'),R('barbell-curl',3,'8–10'),R('skull-crusher',3,'10–12')]},
  {n:'Legs',d:'Wed',min:62,ex:[R('front-squat',4,'6–8'),R('romanian-deadlift',3,'8–10'),R('walking-lunge',3,'10–12'),R('standing-calf-raise',4,'10–15')]}]},
];
const setsOf=d=>d.ex.reduce((a,e)=>a+e.s,0);
const WK={title:'Upper A',elapsed:32*60+14,paused:false,rest:{left:108,total:180},ex:[
 {id:'barbell-bench-press',bar:true,cue:'Last time <b>225 × 8, 8, 7</b> · Try <b>230 × 6–8</b>',sets:[
   {p:'135 × 8',warm:true,done:true,wv:'135',rv:'8'},{p:'225 × 8',done:true,wv:'230',rv:'8'},{p:'225 × 8',done:true,wv:'230',rv:'7'},{p:'225 × 7'}]},
 {id:'barbell-row',bar:true,cue:'Last time <b>185 × 10, 10, 9</b>',sets:[{p:'185 × 10'},{p:'185 × 10'},{p:'185 × 9'}]},
 {id:'seated-dumbbell-shoulder-press',cue:'Last time <b>60 × 9, 8, 8</b>',sets:[{p:'60 × 9'},{p:'60 × 8'},{p:'60 × 8'}]},
 {id:'lat-pulldown',cue:'Last time <b>150 × 12, 11, 10</b>',sets:[{p:'150 × 12'},{p:'150 × 11'},{p:'150 × 10'}]},
 {id:'ez-bar-curl',bar:true,cue:'Last time <b>80 × 12, 10</b>',sets:[{p:'80 × 12'},{p:'80 × 10'}]},
 {id:'triceps-pushdown',cue:'Last time <b>70 × 12, 12</b>',sets:[{p:'70 × 12'},{p:'70 × 12'}]}]};
const LOGS={ // Oct 2026, day -> workout
 1:{n:'Upper A',min:57,sets:18,vol:'20,880',pr:0},2:{n:'Lower A',min:54,sets:16,vol:'27,340',pr:1},5:{n:'Upper B',min:55,sets:16,vol:'14,920',pr:0},
 6:{n:'Lower B',min:51,sets:15,vol:'25,610',pr:0},8:{n:'Upper A',min:59,sets:18,vol:'21,060',pr:1},9:{n:'Lower A',min:53,sets:16,vol:'27,900',pr:0},
 12:{n:'Upper B',min:56,sets:16,vol:'15,180',pr:0},13:{n:'Lower B',min:50,sets:15,vol:'26,050',pr:0},15:{n:'Upper A',min:58,sets:18,vol:'21,450',pr:2},
 16:{n:'Lower A',min:55,sets:16,vol:'28,120',pr:1},19:{n:'Upper B',min:57,sets:16,vol:'15,400',pr:0},20:{n:'Lower B',min:52,sets:15,vol:'26,300',pr:0}};
const TODAY=21;
// Coach's real swap-tag wording (data/rules.json swap_tags), hardcoded examples
const SWAPS={
 'barbell-bench-press':[{id:'dumbbell-bench-press',tags:['More stretch emphasis','Lower loading potential']},{id:'machine-chest-press',tags:['More stable','Less systemic fatigue','Lower loading potential']}],
 'ez-bar-curl':[{id:'incline-dumbbell-curl',tags:['More stretch emphasis','Biceps long-head stretch']},{id:'spider-curl',tags:['Less stretch emphasis','Peak-contraction focus','Better isolation']}]};
// priority 1-7 tags are muscle-specific: shown first, in the accent tint
const MUSCLE_TAGS=['More stretch emphasis','Less stretch emphasis','Triceps long-head bias','Less triceps long-head bias','Biceps long-head stretch','Less biceps long-head stretch','Lat width focus','Less lat-width focus','Upper-back thickness focus','Less upper-back focus','More upper-trap work','Less upper-trap work','Peak-contraction focus','Less peak-contraction focus'];
// mock weekly sets: [group, sets, min, max]. Colour comes from vStat(), which reads rules.json volume_bands.
const VOL=[['chest',16,10,20],['lats',14,10,18],['upper_back',12,10,18],['front_delts',11,4,8],['side_delts',8,10,18],['glutes',9,4,8],['biceps',10,8,14],['triceps',10,8,14],['rear_delts',6,6,12],['quads',14,10,18],['hamstrings',12,8,14],['calves',8,8,14],['abs',6,6,12]];
// OVER-VOLUME BANDS: one key for the volume panel AND the body map, rules.json volume_bands (Coach, CoS decision 2026-10-21).
// amber when sets > max, red when sets > max * red_factor. No factor is hardcoded here: until the key loads, nothing is red.
const VB={amber_above:'max',red_factor:null,src:null};
async function loadVB(){for(const u of ['data/rules.json','../data/rules.json']){try{const r=await fetch(u,{cache:'no-store'});if(!r.ok)continue;const j=await r.json(),b=j.volume_bands||(j.rules||{}).volume_bands;if(b&&typeof b.red_factor==='number'){Object.assign(VB,b,{src:u});return VB}}catch(e){}}console.warn('rules.json volume_bands missing: over-volume red disabled');return VB}
const vStat=(n,min,max)=>n<min?'under':VB.red_factor!=null&&n>max*VB.red_factor?'red':n>max?'amber':'in';
const VLAB={under:'Under',in:'In range',amber:'Over max',red:'Well over'};

const S={tab:'train',route:'train',session:false,pick:null,day:{},buildDay:0,unit:'lb',bar:'Olympic',plate:225,logSel:15,month:9,year:2026,split:1};
const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
let tick=null;
function startTick(){clearInterval(tick);tick=setInterval(()=>{if(!WK.paused)WK.elapsed++;if(WK.rest.left>0)WK.rest.left--;paintTime()},1000)}
function paintTime(){
  $$('[data-el]').forEach(e=>e.textContent=fmt(WK.elapsed));
  $$('[data-rest]').forEach(e=>e.textContent=fmt(WK.rest.left));
  $$('[data-line]').forEach(e=>e.style.transform=`scaleX(${WK.rest.left/WK.rest.total})`);
}

// ---------------------------------------------------------------- the ONE bottom sheet
// sheet({title,left,right,body,cls,modal=true,onOpen,onClose}) -> {el,close}
let SHEETS=[];
function sheet(o){
  const wrap=document.createElement('div');wrap.className='sh-wrap'+(o.modal===false?' nomodal':'');
  wrap.innerHTML=`<div class="sh-back"></div><div class="sheet ${o.cls||''}" role="dialog" aria-label="${o.title||'Sheet'}">
    <div class="grab" aria-hidden="true"></div>
    ${o.title||o.left||o.right?`<div class="sh-head"><div class="l">${o.left||''}</div><div class="t">${o.title||''}</div><div class="r">${o.right||''}</div></div>`:''}
    <div class="sh-body">${o.body||''}</div></div>`;
  $('#sheets').appendChild(wrap);
  const sh=$('.sheet',wrap),body=$('.sh-body',sh);
  const api={el:sh,wrap,body,close,closed:false};
  function close(){if(api.closed)return;api.closed=true;wrap.classList.remove('open');sh.style.transform='';
    setTimeout(()=>wrap.remove(),420);SHEETS=SHEETS.filter(x=>x!==api);o.onClose&&o.onClose()}
  $('.sh-back',wrap).addEventListener('click',close);
  // swipe down to close: from the handle/header, or from the body when it is scrolled to the top
  let y0=null,t0=0,dy=0;
  sh.addEventListener('pointerdown',e=>{
    const onChrome=e.target.closest('.grab,.sh-head')&&!e.target.closest('button');
    const onBody=e.target.closest('.sh-body')&&body.scrollTop<=0&&!e.target.closest('input,.wheel,.chips,.noswipe');
    if(!onChrome&&!onBody)return;y0=e.clientY;t0=performance.now();dy=0;
  });
  const mv=e=>{if(y0==null)return;dy=e.clientY-y0;if(dy>6){sh.classList.add('dragging');sh.style.transform=`translateY(${dy}px)`}};
  const up=()=>{if(y0==null)return;const v=dy/(performance.now()-t0);y0=null;sh.classList.remove('dragging');
    if(dy>110||(dy>30&&v>.5))close();else sh.style.transform=''};
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
  requestAnimationFrame(()=>requestAnimationFrame(()=>wrap.classList.add('open')));
  SHEETS.push(api);o.onOpen&&o.onOpen(api);return api;
}
const closeAll=()=>SHEETS.slice().forEach(s=>s.close());

// ---------------------------------------------------------------- keypad (inside the shared sheet, non-modal)
let KP=null,AF=null,fresh=true;
function focusField(f){
  if(AF)AF.classList.remove('active');AF=f;fresh=true;f.classList.add('active');
  if(!KP)openKeypad();else keepInView();
}
function openKeypad(){
  KP=sheet({cls:'kp',modal:false,body:`<div class="kpg">${[1,2,3,4,5,6,7,8,9].map(n=>`<button data-k="${n}">${n}</button>`).join('')}
    <button data-k="." aria-label="Decimal point">.</button><button data-k="0">0</button><button class="fn" data-k="del" aria-label="Backspace">${I('back',1.6)}</button></div>`,
    onClose(){KP=null;document.body.classList.remove('kp-open');if(AF)AF.classList.remove('active');AF=null},
    onOpen(api){document.body.classList.add('kp-open');
      api.el.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-k]');if(!b)return;e.preventDefault();press(b.dataset.k);b.classList.add('pressed');setTimeout(()=>b.classList.remove('pressed'),90)});
      requestAnimationFrame(()=>{document.documentElement.style.setProperty('--kp-h',api.el.offsetHeight+'px');setTimeout(keepInView,60)})}});
}
function keepInView(){ // scroll once, only if the active field would sit under the keypad. Typing never scrolls.
  if(!AF||!KP)return;const sc=$('#view'),r=AF.getBoundingClientRect(),kh=KP.el.offsetHeight||300,lim=innerHeight-kh-16;
  if(r.bottom>lim)sc.scrollBy({top:r.bottom-lim+8,behavior:'smooth'});else if(r.top<150)sc.scrollBy({top:r.top-170,behavior:'smooth'});
}
function press(k){
  if(!AF)return;let v=fresh?'':AF.value;fresh=false;AF.classList.remove('auto');
  if(k==='del')v=v.slice(0,-1);else if(k==='.'){if(!v.includes('.'))v=(v||'0')+'.'}else if(v.replace('.','').length<6)v=v==='0'?k:v+k;
  AF.value=v;
  if(AF.dataset.kind==='w')fillLater(AF); // weight fills the later empty sets, in place (no re-render)
}
function fillLater(f){
  const blk=f.closest('.exb');if(!blk)return;const rows=$$('.srow',blk),i=rows.indexOf(f.closest('.srow'));
  rows.slice(i+1).forEach(r=>{const w=$('[data-kind=w]',r);if(!r.classList.contains('done')&&(w.value===''||w.classList.contains('auto'))){w.value=f.value;w.classList.toggle('auto',!!f.value)}});
}

// ---------------------------------------------------------------- swipe-left-to-delete rows
function bindSwipes(root){
  $$('.swipe',root).forEach(row=>{
    if(row._sw)return;row._sw=1;const inner=$(':scope > .in',row);let x0=null,y0=0,dx=0,lock=null;
    row.addEventListener('pointerdown',e=>{if(e.target.closest('.del')||e.target.closest('.fld'))return;x0=e.clientX;y0=e.clientY;dx=0;lock=null});
    row.addEventListener('pointermove',e=>{if(x0==null)return;const mx=e.clientX-x0,my=e.clientY-y0;
      if(!lock&&(Math.abs(mx)>8||Math.abs(my)>8))lock=Math.abs(mx)>Math.abs(my)?'x':'y';
      if(lock!=='x')return;if(!row.classList.contains('drag')){try{row.setPointerCapture(e.pointerId)}catch(_){}}dx=mx+(row.classList.contains('open')?-88:0);row.classList.add('drag');
      inner.style.transform=`translateX(${Math.min(0,Math.max(-140,dx))}px)`});
    const end=()=>{if(x0==null)return;x0=null;row.classList.remove('drag');inner.style.transform='';
      if(lock==='x'){row.classList.toggle('open',dx<-44);if(dx<-44)$$('.swipe.open').forEach(o=>o!==row&&o.classList.remove('open'));row._justSwiped=Date.now()}};
    row.addEventListener('pointerup',end);row.addEventListener('pointercancel',end);
    row.addEventListener('click',e=>{if(row._justSwiped&&Date.now()-row._justSwiped<300){e.stopPropagation();e.preventDefault()}},true);
    $(':scope > .del',row).addEventListener('click',e=>{e.stopPropagation();row.style.transition='height .28s var(--ease),opacity .2s';row.style.height=row.offsetHeight+'px';
      requestAnimationFrame(()=>{row.style.height='0';row.style.opacity='0'});setTimeout(()=>row.remove(),300);toast('Deleted · Undo')});
  });
}
let tt;function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),1800)}

// ---------------------------------------------------------------- tab bar + floating workout bar
// Recommended 4 tabs: Train · Log · Build · Progress. Settings = gear on Build; Learn = book icon in headers.
const TABS=[['train','Train'],['log','Log'],['build','Build'],['progress','Progress']];
function renderTabs(){$('#tabs').innerHTML=TABS.map(([k,l])=>`<button data-go="#${k}" class="${S.tab===k?'on':''}" aria-label="${l}">${I(k,1.7)}<span>${l}</span></button>`).join('')}
function renderBar(){
  const show=S.session&&!document.body.classList.contains('full');document.body.classList.toggle('has-bar',show);
  $('#wbar-slot').innerHTML=show?`<div class="wbar" data-go="#workout" role="button" aria-label="Return to workout">
    <span class="live"></span><div class="main"><div class="n">${WK.title}</div><div class="s"><span data-el>${fmt(WK.elapsed)}</span> · 7 of 17 sets</div></div>
    <div class="rst"><div class="k">Rest</div><div class="v" data-rest>${fmt(WK.rest.left)}</div></div>
    <button class="tr" data-act="trash" aria-label="Discard or resume">${I('trash',1.7)}</button>
    <i class="line" data-line style="transform:scaleX(${WK.rest.left/WK.rest.total})"></i></div>`:'';
}
function trashSheet(){
  const s=sheet({body:`<div class="act-sheet"><div class="as-ico">${I('trash',1.7)}</div><h3>Discard this workout?</h3>
    <p>${WK.title} · ${Math.round(WK.elapsed/60)} min · 3 sets logged. Discarding deletes it; nothing is saved to your Log.</p>
    <button class="btn block danger-fill" data-x="discard">Discard workout</button><button class="btn block grey" data-x="resume">Resume workout</button></div>`});
  s.el.addEventListener('click',e=>{const a=e.target.closest('[data-x]');if(!a)return;s.close();
    if(a.dataset.x==='discard'){S.session=false;renderBar();toast('Workout discarded')}else go('#workout')});
  return s;
}
function confirmSheet(t,p,btn,fn){const c=sheet({body:`<div class="act-sheet"><h3>${t}</h3><p>${p}</p><button class="btn block danger-fill" data-x="1">${btn}</button><button class="btn block grey" data-x="0">Cancel</button></div>`});
  c.el.addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(!b)return;c.close();if(b.dataset.x==='1')fn()})}

// ---------------------------------------------------------------- screens
const V={};
const header=(t,acts='')=>`<div class="lt"><h1>${t}</h1><div class="acts">${acts}</div></div>`;
const bookBtn=`<button class="ibtn" data-go="#learn" aria-label="Learn">${I('book',1.7)}</button>`;
const gearBtn=`<button class="ibtn" data-go="#settings" aria-label="Settings">${I('gear',1.6)}</button>`;

// 1. TRAIN
function dayCard(r,d,i){
  const next=r.active&&i===r.next;
  return `<article class="day ${next?'next':''}"><div class="dh"><div><div class="eyebrow">${d.d} · Day ${i+1}${next?' · <span class="nx">Next up</span>':''}</div><h3>${d.n}</h3></div>
   <div class="dm num">${d.ex.length} exercises · ${setsOf(d)} sets<br>≈ ${d.min} min</div></div>
   <ul>${d.ex.slice(0,6).map(e=>`<li>${gl(e.id)}<span class="en">${exName(e.id)}</span><span class="sr num">${e.s} × ${e.r}</span></li>`).join('')}</ul></article>`;
}
function routineCard(r,mode){
  const di=S.day[r.id]??(r.active?r.next:0);
  return `<section class="rt ${mode} ${r.active?'act':''}" data-rt="${r.id}">
   <button class="rt-row" data-act="pick" data-id="${r.id}"><div class="grow"><div class="rt-n">${r.name}${r.active?' <span class="tag acc">Active</span>':''}</div>
     <div class="rt-m">${r.meta}${r.week?' · '+r.week:''}</div>${r.active?'':`<div class="why">${RWHY[r.id]||''}</div>`}</div><span class="rt-cv">${I('chevD',2)}</span></button>
   <div class="rt-body"><div class="rt-in">
     <div class="days noswipe" data-days="${r.id}">${r.days.map((d,i)=>dayCard(r,d,i)).join('')}</div>
     <div class="pdots">${r.days.map((d,i)=>`<i class="${i===di?'on':''}"></i>`).join('')}</div>
     <div class="rt-acts">${r.active?`<button class="btn accent block" data-act="start" data-id="${r.id}">${I('play')} Start ${r.days[di].n}</button>`:
       `<button class="btn grey" data-act="activate" data-id="${r.id}">Activate routine</button><button class="btn accent" data-act="start" data-id="${r.id}">Train this day</button>`}</div>
   </div></div></section>`;
}
V.train=()=>{
  const act=ROUTINES.find(r=>r.active),pick=S.pick&&S.pick!==act.id?S.pick:null;
  return header('Train',bookBtn)+
  `<div class="hello sub">Wednesday, October 21</div>
   <div class="rts">${routineCard(act,pick?'closed':'open')}</div>
   <div class="sec"><h2>Library</h2><span class="more">${ROUTINES.length-1} published</span></div>
   <div class="rts lib">${ROUTINES.filter(r=>!r.active).map(r=>routineCard(r,r.id===pick?'open':'closed')).join('')}</div>
   <div class="group links"><button class="row" data-go="#build"><span class="ico acc">${I('plus',2.2)}</span><div class="grow t1">Build new routine</div>${CHEV}</button>
   <button class="row" data-go="#empty"><span class="ico gr">${I('train',1.8)}</span><div class="grow t1">Start an empty workout</div>${CHEV}</button></div>`;
};
function afterTrain(){
  $$('.days').forEach(el=>{const r=ROUTINES.find(x=>x.id===el.dataset.days),di=S.day[r.id]??(r.active?r.next:0);
    requestAnimationFrame(()=>{el.style.scrollBehavior='auto';el.scrollLeft=el.children[di].offsetLeft-el.children[0].offsetLeft;el.style.scrollBehavior=''});
    el.addEventListener('scroll',()=>{const w=el.children[0].offsetWidth+10,i=Math.max(0,Math.min(r.days.length-1,Math.round(el.scrollLeft/w)));
      if(i!==S.day[r.id]){S.day[r.id]=i;$$('i',el.nextElementSibling).forEach((d,j)=>d.classList.toggle('on',j===i));
        const b=$('[data-act=start]',el.parentNode);if(r.active&&b)b.innerHTML=I('play')+' Start '+r.days[i].n}},{passive:true})});
}

// 2. WORKOUT
function setRow(s,i){
  return `<div class="srow sgrid ${s.done?'done':''}"><div class="sn ${s.warm?'w':''}">${s.warm?'W':i}</div><div class="prev">${s.p||'—'}</div>
    <input class="fld" data-kind="w" readonly inputmode="none" value="${s.wv||''}" placeholder="${(s.p||'').split(' × ')[0]}" aria-label="Weight">
    <input class="fld" data-kind="r" readonly inputmode="none" value="${s.rv||''}" placeholder="${(s.p||'').split(' × ')[1]||''}" aria-label="Reps">
    <button class="ck" data-act="ck" aria-label="Done">${I('check',2.4)}</button></div>`;
}
function exBlock(ex){
  let n=0;
  return `<section class="exb swipe" data-ex="${ex.id}"><button class="del">Delete</button><div class="in">
   <div class="exh">${gl(ex.id)}<div class="grow"><div class="nm">${exName(ex.id)}</div><div class="mu">${exSub(ex.id)}</div></div>
    <button class="mini" data-act="info" data-id="${ex.id}" aria-label="Learn">${I('info',1.7)}</button>
    ${ex.bar?`<button class="mini" data-act="plates" aria-label="Plate calculator">${I('plate',1.6)}</button>`:''}
    <button class="mini" data-act="swap" data-id="${ex.id}" aria-label="Swap">${I('swap',1.7)}</button></div>
   <div class="cue">${ex.cue}</div>
   <div class="sgrid shd"><div>Set</div><div>Previous</div><div>${S.unit}</div><div>Reps</div><div></div></div>
   ${ex.sets.map(s=>setRow(s,s.warm?0:++n)).join('')}
   <button class="addset" data-act="addset">${I('plus',2)} Add set</button></div></section>`;
}
const restBox=()=>`<div class="rest" data-act="restsheet"><div class="rl"><div class="rlb">Rest · Bench set 3</div><div class="tm" data-rest>${fmt(WK.rest.left)}</div></div>
  <button data-act="rest-">−15</button><button data-act="rest+">+15</button><button data-act="skip">Skip</button><i class="line" data-line style="transform:scaleX(${WK.rest.left/WK.rest.total})"></i></div>`;
V.workout=()=>`<div class="wk-nav"><div class="wk-top"><button class="ibtn flat" data-act="minimize" aria-label="Minimize">${I('chevD',2)}</button>
   <button class="clock ${WK.paused?'paused':''}" data-act="clock">${I(WK.paused?'pause':'clock',2)}<span data-el>${fmt(WK.elapsed)}</span></button>
   <button class="btn accent sm" data-go="#finish">Finish</button></div>${restBox()}</div>
  <div class="wk-title"><div class="eyebrow">Upper / Lower · Day 1</div><h1>${WK.title}</h1></div>
  ${WK.ex.map(exBlock).join('')}
  <button class="btn grey block addex" data-act="tray">${I('plus',2)} Add exercise</button>`;
function afterWorkout(){bindSwipes($('#view'))}

// 4. FINISH
V.finish=()=>`<div class="fin">
  <div class="fin-top"><span class="eyebrow">Wed, Oct 21</span><button class="btn plain" data-go="#log">Done</button></div>
  <div class="fin-cards noswipe" id="fincards">
   <article class="fc hero"><div class="fc-logo logo-tile"></div><div class="eyebrow">Workout complete</div><h2>Upper A</h2><p class="sub">6:12 – 7:10 PM</p>
     <div class="stats"><div><b class="num">58</b><span>minutes</span></div><div><b class="num">18</b><span>sets</span></div><div><b class="num">21,450</b><span>lb volume</span></div><div><b class="num acc">2</b><span>PRs</span></div></div>
     <div class="vs"><span class="up">${I('up',2.4)}</span>2.4% more volume than your last Upper A</div></article>
   <article class="fc"><div class="eyebrow">Personal records</div><h2>2 new PRs</h2>
     <div class="pr"><span class="badge">PR</span><div class="grow"><b>Barbell Bench Press</b><span>230 lb × 8 · heaviest for 8</span></div></div>
     <div class="pr"><span class="badge">PR</span><div class="grow"><b>Lat Pulldown</b><span>160 lb × 12 · best set volume</span></div></div>
     <div class="pr dim"><span class="tag">±0</span><div class="grow"><b>Seated DB Shoulder Press</b><span>60 lb × 9 · ties your best</span></div></div></article>
   <article class="fc"><div class="eyebrow">vs last time</div><h2>Up on 4 of 6</h2>
     ${[['Barbell Bench Press','230 × 8','+5 lb','up'],['Barbell Row','185 × 11','+1 rep','up'],['Seated DB Shoulder Press','60 × 9','±0','flat'],['Lat Pulldown','160 × 12','+10 lb','up'],['EZ-Bar Curl','80 × 12','±0','flat'],['Triceps Pushdown','75 × 11','+5 lb','up']]
       .map(([n,s,d,c])=>`<div class="cmp"><div class="grow"><b>${n}</b><span class="num">${s}</span></div><span class="dl ${c}">${d}</span></div>`).join('')}</article>
   <article class="fc"><div class="eyebrow">Muscles worked</div><h2>18 hard sets</h2>
     ${[['Chest',5],['Lats',4],['Front delts',4],['Triceps',4],['Upper back',3],['Biceps',3]].map(([m,n])=>`<div class="mw"><span>${m}</span><i style="--w:${n/5*100}%"></i><b class="num">${n}</b></div>`).join('')}
     <p class="foot" style="padding:12px 0 0">Helper muscles count as partial sets.</p></article>
   <article class="fc ape"><div class="ape-slot"><div class="logo-tile"></div></div><div class="eyebrow">Ape says</div><h2>Ape humor goes here</h2>
     <p class="sub">Placeholder card. The lines come later. Hidden when Settings › Ape humor is off.</p></article>
  </div><div class="pdots fin-dots">${[0,1,2,3,4].map(i=>`<i class="${i?'':'on'}"></i>`).join('')}</div>
  <div class="fin-act"><button class="btn ink block" data-go="#log">Save to Log</button></div></div>`;
function afterFinish(){const c=$('#fincards');c.addEventListener('scroll',()=>{const i=Math.round(c.scrollLeft/(c.children[0].offsetWidth+12));$$('.fin-dots i').forEach((d,j)=>d.classList.toggle('on',j===i))},{passive:true})}

// 5. EMPTY WORKOUT + exercise tray
const GAPS=[['side_delts',8,14,'cable-lateral-raise'],['lats',14,16,'lat-pulldown'],['calves',8,10,'seated-calf-raise'],['abs',6,8,'cable-crunch']];
const CROSS=[['Chest','cable-fly'],['Back','seated-cable-row'],['Shoulders','dumbbell-lateral-raise'],['Arms','hammer-curl'],['Legs','leg-extension'],['Core','hanging-leg-raise']];
V.empty=()=>`<div class="wk-nav"><div class="wk-top"><button class="ibtn flat" data-go="#train" aria-label="Close">${I('chevD',2)}</button>
   <button class="clock" data-act="clock">${I('clock',2)}<span>4:02</span></button><button class="btn accent sm" data-go="#finish">Finish</button></div></div>
  <div class="wk-title"><div class="eyebrow">Started 7:02 PM</div><h1>Empty workout</h1></div>
${emptyBody()}
  <button class="btn grey block addex" data-act="tray">${I('search',2)} Browse all exercises</button>`;

// Gym profile equipment map {token: bool} (rules.json equipment_items: tokens, labels, groups, implies; ranking-spec §5/§8b).
// One checkbox per token, grouped; the full map is saved on the first edit. Unticked = hard filter on equipment_needs.
// No map = ranking uses the loads fields only. Home/Commercial are STARTING TEMPLATES (example_profiles): they only pre-tick
// boxes; their example dumbbell sets etc. are never copied into the user's gym.
function equipSheet(){if(!RD)return;const EI=RD.rules.equipment_items,IT=EI.items,G=EI.groups,toks=Object.keys(IT);
  const set=()=>Object.keys(EQUIP).length>0;
  const impliedBy=t=>toks.filter(x=>EQUIP[x]===true&&(IT[x].implies||[]).includes(t)).map(x=>IT[x].label);
  const body=()=>`<div class="tmpl"><div class="t2">Start from a template, then tick what your gym actually has.</div>
     <div class="chips"><button class="chip" data-tpl="home">Home template</button><button class="chip" data-tpl="commercial">Commercial template</button>${set()?'<button class="chip" data-tpl="clear">Clear</button>':''}</div></div>
    ${set()?'':'<p class="foot" style="padding-top:0">Nothing ticked yet: suggestions use your plates, bars, dumbbells and stacks, and anything else shows "Check your gym has this".</p>'}
    ${Object.entries(G).map(([g,gl])=>`<div class="ghead">${gl}</div><div class="group eql">${toks.filter(t=>IT[t].group===g).map(t=>{const on=EQUIP[t]===true,imp=!on&&impliedBy(t);
      return `<button class="row eqr" data-eq="${t}"><span class="cbx ${on?'on':''}">${on?I('check',3):''}</span><div class="grow"><div class="t1">${IT[t].label}</div>${imp&&imp.length?`<div class="t2">Covered by ${imp.join(', ')}</div>`:(IT[t].implies||[]).length?`<div class="t2">Also counts as ${IT[t].implies.map(x=>IT[x].label.toLowerCase()).join(', ')}</div>`:''}</div></button>`}).join('')}</div>`).join('')}
    <p class="foot">Unticked equipment is removed from swaps, the tray, empty-workout and preset suggestions. An exercise needing "a or b" stays if you have either.</p>`;
  const s=sheet({title:'Home gym · Equipment',cls:'tall grouped',right:`<button class="btn plain" data-x="close">Done</button>`,body:`<div id="eqb">${body()}</div>`});
  const save=()=>{sv(LSK2.equip,EQUIP);const sc=$('.sh-body',s.el)||s.el;const y=sc.scrollTop;$('#eqb',s.el).innerHTML=body();sc.scrollTop=y};
  s.el.addEventListener('click',e=>{const tp=e.target.closest('[data-tpl]');
    if(tp){const k=tp.dataset.tpl;EQUIP=k==='clear'?{}:Object.assign({},EI.example_profiles[k].equipment);save();toast(k==='clear'?'Equipment cleared':`${k==='home'?'Home':'Commercial'} template applied: untick what you don't have`);return}
    const r=e.target.closest('.eqr');if(r){const t=r.dataset.eq;if(!set())toks.forEach(x=>EQUIP[x]=false);EQUIP[t]=!EQUIP[t];save();return}
    if(e.target.closest('[data-x=close]'))s.close()});return s}

// Empty workout: rank('empty_workout') on the mock week; gap bars from RANK.meta targets (same min'/max' the gap term uses)
function emptyBody(){if(!RD)return '';const sc=SC;
  const T=RANK.meta(RD,prefs()).targets,wk={};sc.board.filter(d=>d.day!==sc.day).forEach(d=>d.tiles.forEach(t=>{const e=RD.EX[t.id];for(const [m,r] of Object.entries(e.muscles))if(r>=.25)wk[m]=(wk[m]||0)+t.sets*r}));
  const gaps=Object.keys(T).filter(m=>m[0]!=='_'&&T[m].min>(wk[m]||0)).map(m=>[m,wk[m]||0,T[m].min]).sort((a,b)=>(b[2]-b[1])-(a[2]-a[1])).slice(0,4);
  const top=rk('empty_workout',null,{},8);const f1=n=>+(+n).toFixed(1);
  return `<div class="sec"><h2>Suggested for today</h2><span class="more">fills the week</span></div>
  <div class="group">${top.map(r=>`<div class="row sugr" data-id="${r.id}">${gl(r.id)}<div class="grow"><div class="t1">${exName(r.id)}</div><div class="t2">${exSub(r.id)}</div>${whyR(r)}</div><button class="addc" data-act="add" aria-label="Add">${I('plus',2.2)}</button></div>`).join('')}</div>
  ${gaps.length?`<div class="sec"><h2>This week's gaps</h2><span class="more">vs your targets</span></div>
  <div class="group">${gaps.map(([m,d,t])=>`<div class="row gap"><div class="grow"><div class="t1">${ML[m]||m} <span class="sub num">· ${f1(d)} of ${f1(t)} sets</span></div><div class="gbar"><i style="--w:${Math.min(1,d/t)*100}%"></i></div></div></div>`).join('')}</div>`:''}`}
let TF={q:'',type:null,mus:null,eq:null,fav:false,mode:'sug'};   // mode: 'sug' (Suggested, default) | 'lib' (Library order)
function trayList(){
  // search + filters are hard filters in both modes; what passes them goes to rank('tray', candidates)
  const ids=EXL.map(x=>x[0]).filter(id=>{const e=EX[id];return e&&(!TF.fav||isFav(id))&&(!TF.type||e.type===TF.type)&&(!TF.mus||e.mus.includes(TF.mus))&&(!TF.eq||e.eq===TF.eq)&&(!TF.q||e.name.toLowerCase().includes(TF.q.toLowerCase()))});
  const sug=TF.mode==='sug'&&RD,cands=SC.cands?SC.cands.filter(i=>ids.includes(i)):ids;
  const rows=sug?rk('tray',cands,{},null):ids.map(id=>({id}));
  const row=r=>{const id=r.id,e=EX[id];return `<div class="row trow" data-id="${id}">${gl(id)}<div class="grow"><div class="t1">${exNameP(id)}${isFav(id)?' <span class="fv">★</span>':''}</div><div class="t2">${exSub(id)} · ${e.eq}</div>${r.reasons?whyR(r):''}</div>${starBtn(id)}<button class="ib-i" data-act="exinfo" data-id="${id}" aria-label="Info">${I('info',1.7)}</button><button class="addc" data-act="add" aria-label="Add">${I('plus',2.2)}</button></div>`};
  const hid=sug?cands.length-rows.length:0;
  return `<div class="tcount">${rows.length} exercises${sug?` · ranked for ${({mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'})[SC.day]||'today'}${hid?` · ${hid} hidden (on this day or not in your gym)`:''}`:' · library order'}</div>${SC.note?`<div class="scnote">${SC.note}</div>`:''}<div class="group">`+rows.slice(0,80).map(row).join('')+'</div>';
}
function traySheet(){
  const ch=(k,v,l)=>`<button class="chip ${TF[k]===v?'on':''}" data-f="${k}" data-v="${v}">${l}</button>`;
  const s=sheet({title:'Add exercise',cls:'tall grouped',right:`<button class="btn plain" data-x="close">Done</button>`,
    body:`<div class="srch"><span>${I('search',2)}</span><input id="tq" type="search" placeholder="Search 239 exercises" autocomplete="off"></div>
    <div class="pad0"><div class="seg sm" id="tmode"><button class="${TF.mode==='sug'?'on':''}" data-m="sug">Suggested</button><button class="${TF.mode==='lib'?'on':''}" data-m="lib">Library</button></div></div>
    <div class="chips fl"><button class="chip ${TF.fav?'on':''}" data-f="fav" data-v="true"><span class="fv">★</span> Favorites</button>${['primary','accessory','isolation'].map(t=>ch('type',t,GLY[t]+' '+t[0].toUpperCase()+t.slice(1))).join('')}</div>
    <div class="chips fl">${['chest','lats','upper_back','side_delts','biceps','triceps','quads','hamstrings','glutes','calves','abs'].map(m=>ch('mus',m,ML[m])).join('')}</div>
    <div class="chips fl">${['barbell','dumbbell','cable','machine','bodyweight','smith machine'].map(m=>ch('eq',m,m[0].toUpperCase()+m.slice(1))).join('')}</div>
    <div class="tlist">${trayList()}</div>`});
  s.el.addEventListener('click',e=>{const md=e.target.closest('#tmode [data-m]');if(md){TF.mode=md.dataset.m;$$('#tmode button',s.el).forEach(b=>b.classList.toggle('on',b===md));$('.tlist',s.el).innerHTML=trayList();return}
    const f=e.target.closest('[data-f]');if(f){if(f.dataset.f==='fav'){TF.fav=!TF.fav;f.classList.toggle('on',TF.fav);$('.tlist',s.el).innerHTML=trayList();return}TF[f.dataset.f]=TF[f.dataset.f]===f.dataset.v?null:f.dataset.v;
      $$(`[data-f=${f.dataset.f}]`,s.el).forEach(c=>c.classList.toggle('on',TF[c.dataset.f]===c.dataset.v));$('.tlist',s.el).innerHTML=trayList()}
    if(e.target.closest('[data-x=close]'))s.close()});
  $('#tq',s.el).addEventListener('input',e=>{TF.q=e.target.value;$('.tlist',s.el).innerHTML=trayList()});
  return s;
}

// 6. LOG
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WD=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function cal(){
  const first=(new Date(S.year,S.month,1).getDay()+6)%7,n=new Date(S.year,S.month+1,0).getDate(),oct=S.month===9&&S.year===2026;
  let c='';for(let i=0;i<first;i++)c+='<span></span>';
  for(let d=1;d<=n;d++){const w=oct&&LOGS[d];c+=`<button class="cd ${w?'has':''} ${oct&&d===TODAY?'today':''} ${oct&&d===S.logSel?'sel':''}" data-act="day" data-d="${d}"><span>${d}</span><i></i></button>`}
  return `<div class="cal card"><div class="cal-h"><button class="my" data-act="month">${MONTHS[S.month]} ${S.year}${I('chevR',2.4)}</button>
    <div class="cal-nav"><button class="ibtn flat" data-act="mprev" aria-label="Previous month">${I('chevL',2.2)}</button><button class="ibtn flat" data-act="mnext" aria-label="Next month">${I('chevR',2.2)}</button></div></div>
    <div class="cal-w">${'MTWTFSS'.split('').map(x=>`<span>${x}</span>`).join('')}</div><div class="cal-g">${c}</div>
    <div class="cal-f"><span><i class="k1"></i>Workout</span><span><i class="k2"></i>Today</span><span class="num">12 workouts · 10 h 47 m</span></div></div>`;
}
const logRow=d=>{const w=LOGS[d],dt=new Date(2026,9,d);return `<div class="swipe"><button class="del">Delete</button><div class="in">
  <button class="row lrow" data-act="edit" data-d="${d}"><div class="ld"><span>${WD[(dt.getDay()+6)%7]}</span><b>${d}</b></div>
   <div class="grow"><div class="t1">${w.n}${w.pr?` <span class="badge">${w.pr} PR</span>`:''}</div><div class="t2 num">${w.min} min · ${w.sets} sets · ${w.vol} lb</div></div>${CHEV}</button></div></div>`};
V.log=()=>header('Log',`<button class="ibtn" data-act="day" data-d="${TODAY}" aria-label="Add workout">${I('plus',2)}</button>`)+cal()+
  `<div class="sec"><h2>${MONTHS[S.month]}</h2><span class="more num">${S.month===9&&S.year===2026?Object.keys(LOGS).length:0} workouts</span></div>
   ${S.month===9&&S.year===2026?`<div class="group">${Object.keys(LOGS).map(Number).sort((a,b)=>b-a).map(logRow).join('')}</div>`:'<div class="card emptyc sub">No workouts this month.</div>'}
   <p class="foot">Swipe left on a workout to delete it. Tap any day to add one after the fact.</p>`;
function afterLog(){bindSwipes($('#view'))}
function monthSheet(){
  const s=sheet({title:'Go to month',right:`<button class="btn plain" data-x="close">Done</button>`,body:`
    <div class="pad"><div class="seg yrs">${[2024,2025,2026].map(y=>`<button class="${y===S.year?'on':''}" data-y="${y}">${y}</button>`).join('')}</div></div>
    <div class="mgrid">${MONTHS.map((m,i)=>`<button class="mm ${i===S.month?'on':''} ${S.year===2026&&i>9?'fut':''}" data-m="${i}">${m.slice(0,3)}${S.year===2026&&i<=9&&i>=7?'<i></i>':''}</button>`).join('')}</div>
    <div class="pad"><button class="btn grey block" data-m="9" data-today="1">Jump to today</button></div>`});
  s.el.addEventListener('click',e=>{const y=e.target.closest('[data-y]'),m=e.target.closest('[data-m]');
    if(y){S.year=+y.dataset.y;$$('[data-y]',s.el).forEach(c=>c.classList.toggle('on',c===y))}
    if(m){S.month=+m.dataset.m;if(m.dataset.today)S.year=2026;s.close();render()}if(e.target.closest('[data-x=close]')){s.close();render()}});
  return s;
}
function editSheet(d){
  const w=LOGS[d],dt=new Date(2026,9,d),lbl=`${WD[(dt.getDay()+6)%7]}, Oct ${d}`;
  if(!w){const a=sheet({title:lbl,body:`<div class="nolog"><div class="nl-ico">${I('log',1.6)}</div><h3>No workout logged</h3><p class="sub">Forgot to log it? Add it now and it counts toward that week.</p>
    <div class="pad"><button class="btn accent block" data-x="add">${I('plus',2)} Add workout for ${lbl}</button></div>
    <div class="ghead">Or copy a routine day</div><div class="group">${ROUTINES[0].days.map(x=>`<button class="row" data-x="add"><div class="grow"><div class="t1">${x.n}</div><div class="t2">${x.ex.length} exercises · ${setsOf(x)} sets</div></div>${CHEV}</button>`).join('')}</div></div>`});
    a.el.addEventListener('click',e=>{if(e.target.closest('[data-x=add]')){a.close();setTimeout(()=>editSheet(15),380)}});return a}
  const exs=[['barbell-bench-press',[['230','8'],['230','8'],['225','7']]],['barbell-row',[['185','11'],['185','10'],['185','9']]],['lat-pulldown',[['160','12'],['150','11']]]];
  const srow=(i,x)=>`<div class="swipe"><button class="del">Delete</button><div class="in"><div class="row er"><span class="sn">${i}</span>
        <input class="fld" data-kind="w" readonly inputmode="none" value="${x[0]}" placeholder="—"><span class="x">lb</span><span class="x">×</span><input class="fld" data-kind="r" readonly inputmode="none" value="${x[1]}" placeholder="—"><span class="x">reps</span></div></div></div>`;
  const s=sheet({title:'Edit workout',cls:'tall grouped',left:`<button class="btn plain" data-x="close">Cancel</button>`,right:`<button class="btn plain strong" data-x="close">Save</button>`,
    body:`<div class="group">
      <div class="row"><div class="grow t1">Name</div><span class="val">${w.n}</span></div>
      <div class="row"><div class="grow t1">Date</div><span class="pill">${lbl}, 2026</span></div>
      <div class="row"><div class="grow t1">Started</div><span class="pill">6:12 PM</span></div>
      <div class="row"><div class="grow t1">Duration</div><span class="pill num">${w.min} min</span></div></div>
      ${exs.map(([id,ss])=>`<div class="ghead gx">${gl(id)}${exName(id)}</div><div class="group eset">${ss.map((x,i)=>srow(i+1,x)).join('')}
        <button class="row addrow" data-x="addrow">${I('plus',2)} Add set</button></div>`).join('')}
      <div class="group" style="margin-top:20px"><button class="row addrow" data-x="tray">${I('plus',2)} Add exercise</button></div>
      <div class="group" style="margin-top:20px"><button class="row dangerrow" data-x="delw">Delete workout</button></div>`});
  bindSwipes(s.el);
  s.el.addEventListener('click',e=>{const a=e.target.closest('[data-x]');if(!a)return;const k=a.dataset.x;
    if(k==='close')s.close();if(k==='tray')traySheet();
    if(k==='addrow'){const g=a.parentNode,n=$$('.swipe',g).length+1;a.insertAdjacentHTML('beforebegin',srow(n,['','']));bindSwipes(g)}
    if(k==='delw')confirmSheet('Delete this workout?',`${w.n} on ${lbl} is removed from your Log and PRs are recalculated.`,'Delete workout',()=>{s.close();toast('Workout deleted · Undo')})});
  return s;
}

// 7. BUILD
const SPLITS=['Full Body','Upper/Lower','PPL','Custom'];
let WEEK=['Upper A','Lower A',null,'Upper B','Lower B',null,null];
// Legacy list Build (kept at #build-list for reference; the whiteboard Build lives in board.js)
V.buildList=()=>{const r=ROUTINES[0],d=r.days[S.buildDay];
 return header('Build',bookBtn+gearBtn)+
 `<div class="pad"><div class="seg" id="splitseg">${SPLITS.map((s,i)=>`<button class="${i===S.split?'on':''}" data-split="${i}">${s}</button>`).join('')}</div></div>
  <div class="bhead"><div class="grow"><div class="eyebrow">Draft · edited 2 min ago</div><div class="bn">Upper / Lower</div><div class="sub num">4 days · 64 sets · ≈ 3 h 41 m a week</div></div></div>
  <div class="bact"><button class="btn ink" data-act="push">${I('up',2.2)} Push to Library</button><button class="btn accent" data-act="start" data-id="ul">${I('play')} Start training</button></div>
  <div class="week card" id="week">${WD.map((w,i)=>`<div class="wd ${i===[0,1,3,4][S.buildDay]?'sel':''}" data-wd="${i}"><span class="wn">${w}</span>
     ${WEEK[i]?`<button class="lbl" data-lbl="${i}" aria-label="Drag ${WEEK[i]}">${WEEK[i].split(' ').join('<br>')}</button>`:'<span class="rest-d">Rest</span>'}</div>`).join('')}</div>
  <p class="foot">Drag a day label to move it. Tap a day to edit it.</p>
  <div class="sec"><h2>${d.n}</h2><span class="more num">${setsOf(d)} sets · ≈ ${d.min} min</span></div>
  <div class="group">${d.ex.map(e=>`<div class="swipe"><button class="del">Delete</button><div class="in"><div class="row brow"><span class="drag">${I('grip',2)}</span>${gl(e.id)}
    <div class="grow"><div class="t1">${exName(e.id)}</div><div class="t2 num">${e.s} × ${e.r} · ${exSub(e.id)}</div></div>
    <button class="ib-i" data-act="info" data-id="${e.id}" aria-label="Learn">${I('info',1.7)}</button><button class="ib-i" data-act="swap" data-id="${e.id}" aria-label="Swap">${I('swap',1.7)}</button></div></div></div>`).join('')}
    <button class="row addrow" data-act="tray">${I('plus',2)} Add exercise</button></div>
  ${RD?(()=>{const sl='side_delts',rs=rk('preset',null,{slot:sl,day:'mon'},3);return `<div class="sec"><h2>Fill a slot</h2><span class="more">${RD.patterns.slots[sl].name}</span></div>
  <div class="group">${rs.map(r=>`<div class="row sugr" data-id="${r.id}">${gl(r.id)}<div class="grow"><div class="t1">${exName(r.id)}</div>${whyR(r)}</div><button class="addc" data-act="add" aria-label="Add">${I('plus',2.2)}</button></div>`).join('')}</div>`})():''}
  <div class="sec"><h2>Weekly sets</h2><span class="more">vs target</span></div>
  <div class="group vol">${VOL.slice(0,8).map(([m,n,lo,hi])=>{const st=vStat(n,lo,hi);return `<button class="row vrow" data-go="#learn-${m}" data-vs="${st}"><span class="vm">${ML[m]}</span><span class="vb"><i style="--w:${Math.min(1,n/(hi*(VB.red_factor||1)))*100}%" class="vs-${st}"></i><b style="--x:${hi/(hi*(VB.red_factor||1))*100}%"></b></span><span class="vn num">${n}<small>/${lo}–${hi}</small></span></button>`}).join('')}</div>
  ${volLegend()}
  <p class="foot">Tap a muscle to learn about it.</p>`};
function afterBuildList(){bindSwipes($('#view'));
  $$('#week .lbl').forEach(l=>l.addEventListener('pointerdown',e=>{e.preventDefault();const from=+l.dataset.lbl,ghost=l.cloneNode(true);ghost.classList.add('ghost');
    $('#app').appendChild(ghost);const ar=$('#app').getBoundingClientRect();
    const mv=ev=>{ghost.style.left=ev.clientX-ar.left-26+'px';ghost.style.top=ev.clientY-ar.top-30+'px';
      $$('#week .wd').forEach(w=>{const r=w.getBoundingClientRect();w.classList.toggle('over',ev.clientX>r.left&&ev.clientX<r.right)})};mv(e);l.classList.add('lift');
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);ghost.remove();const t=$('#week .wd.over');
      if(t&&+t.dataset.wd!==from){const to=+t.dataset.wd;[WEEK[from],WEEK[to]]=[WEEK[to],WEEK[from]];render();toast(`Moved to ${WD[to]}`)}else render()};
    addEventListener('pointermove',mv);addEventListener('pointerup',up)}));
}
function swapSheet(id,opt={}){
  // rank('swap'): hard filters (swap eligibility, same day, equipment) then the shared score; tag lines = swaptags diff_tags
  const pos=(SC.board.find(d=>d.day===SC.day)||{tiles:[]}).tiles.findIndex(t=>t.id===id);
  const alts=RD?rk('swap',null,{current:id,position:pos<0?null:pos},opt.n||6):(SWAPS[id]||[]).map(a=>({id:a.id,reasons:[],notes:[],tags:a.tags}));
  // difference chips (swaptags diff_tags); when none differ, rules.json compare.empty_line once (SWAPDIFF.display = display_lines)
  const lines=a=>a.tags?{tags:a.tags,empty:a.tags.length?null:SWAPDIFF.emptyLine(RD&&RD.rules)}:RD&&RD.EX[id]&&RD.EX[a.id]?SWAPDIFF.display(RD.EX[id],RD.EX[a.id],RD.rules):{tags:[],empty:SWAPDIFF.emptyLine(RD&&RD.rules)};
  const diffRow=a=>{const d=lines(a);if(!d.tags.length&&!d.empty)return '';return d.tags.length?`<div class="tags">${d.tags.slice(0,3).map(x=>`<span class="tag">${x}</span>`).join('')}</div>`:`<div class="tags none"><span class="nodiff">${d.empty}</span></div>`};
  const s=sheet({title:'Swap exercise',cls:'grouped',right:`<button class="btn plain" data-x="close">Cancel</button>`,body:`
    <div class="cur card">${gl(id)}<div class="grow"><div class="eyebrow">Replacing</div><b>${exName(id)}</b><div class="t2">${exSub(id)}</div></div></div>
    ${SC.note?`<div class="scnote">${SC.note}</div>`:''}
    <div class="pad"><div class="seg"><button class="on">Similar</button><button>Browse all</button><button>Create new</button></div></div>
    <div class="group">${alts.map(a=>`<div class="row alt" data-x="pick" data-id="${a.id}" data-score="${a.score!=null?a.score:''}" role="button" tabindex="0">${gl(a.id)}<div class="grow"><div class="t1">${exName(a.id)}</div>${exSub(a.id)?`<div class="t2">${exSub(a.id)}</div>`:''}</div><span class="altb">${starBtn(a.id)}<button class="ib-i" data-act="exinfo" data-id="${a.id}" aria-label="Learn">${I('info',1.7)}</button></span>
      <div class="altx">${diffRow(a)}${a.reasons&&a.reasons.length?whyR(a):''}${opt.debug&&a.score!=null?`<div class="dbg num">score ${a.score} · fit ${a.fit}</div>`:''}</div></div>`).join('')}</div>
    <p class="foot">Typical differences, not guarantees.</p>
    <div class="group" style="margin-top:16px"><div class="row"><div class="grow"><div class="t1">Only this workout</div><div class="t2">Keep the routine unchanged</div></div><span class="tg" data-act="tg"></span></div></div>`});
  s.el.addEventListener('click',e=>{if(e.target.closest('[data-act]'))return;const x=e.target.closest('[data-x]');if(!x)return;s.close();if(x.dataset.x==='pick'){if(opt.onPick)opt.onPick(x.dataset.id);else toast('Swapped')}});return s;
}

// 8. PLATES
const BARS=[['Olympic',45],['SSB',70],['Smith',15],['EZ',35],['Trap',75]];
const PL=[[45,'#0b0b0c',100,15],[35,'#2a2a2d',90,13],[25,'#47474b',78,11],[10,'#6e6e73',58,9],[5,'#97979c',46,7],[2.5,'#E8430C',38,6]];
function plateCalc(total,bar){let side=(total-bar)/2;const out=[];if(side<0)return out;for(const [w] of PL){while(side>=w-1e-9){out.push(w);side-=w}}return out}
function plateBody(){
  const bar=(BARS.find(b=>b[0]===S.bar)||['Custom',20])[1],ps=plateCalc(S.plate,bar);
  let off=0;const side=ps.map(w=>{const p=PL.find(x=>x[0]===w),r=`<rect x="${off}" y="${-p[2]*.55}" width="${p[3]}" height="${p[2]*1.1}" rx="3" fill="${p[1]}"/>`;off+=p[3]+1.5;return r}).join('');
  const sv=`<svg viewBox="-175 -64 350 128" class="barsvg"><rect x="-172" y="-5" width="344" height="10" rx="4" fill="#cfcfd4"/><rect x="-58" y="-3.5" width="116" height="7" fill="#b4b4b9"/>
    <rect x="58" y="-13" width="6" height="26" rx="2" fill="#8e8e93"/><rect x="-64" y="-13" width="6" height="26" rx="2" fill="#8e8e93"/>
    <g transform="translate(66,0)">${side}</g><g transform="translate(-66,0) scale(-1,1)">${side}</g></svg>`;
  const per={};ps.forEach(w=>per[w]=(per[w]||0)+1);
  return `<div class="pw"><button class="rnd" data-pl="-5" aria-label="Minus 5">−</button><div class="pv"><b class="num">${S.plate}</b><span>${S.unit}</span></div><button class="rnd" data-pl="5" aria-label="Plus 5">+</button></div>
   ${sv}<div class="pside">${ps.length?Object.entries(per).sort((a,b)=>b[0]-a[0]).map(([w,n])=>`<span class="pc"><b class="num">${n} ×</b> ${w}</span>`).join(''):'<span class="sub">Bar only</span>'}<span class="sub">per side · bar ${bar}</span></div>
   <div class="ghead" style="padding-left:20px">Bar</div>
   <div class="chips barpick noswipe">${BARS.map(([n,w])=>`<button class="chip ${S.bar===n?'on':''}" data-bar="${n}">${n} <span class="num op">${w}</span></button>`).join('')}<button class="chip" data-bar="Custom">${I('plus',2.2)} Custom</button></div>
   <p class="foot" style="padding:14px 20px 4px">Plates from <b>Home gym</b> · edit in Settings › Gyms</p>`;
}
function plateSheet(){const s=sheet({title:'Plate calculator',right:`<button class="btn plain" data-x="close">Done</button>`,body:`<div id="plb">${plateBody()}</div>`});
  s.el.addEventListener('click',e=>{const a=e.target.closest('[data-pl],[data-bar],[data-x]');if(!a)return;if(a.dataset.x)return s.close();
    if(a.dataset.pl)S.plate=Math.max(15,S.plate+ +a.dataset.pl);if(a.dataset.bar)S.bar=a.dataset.bar;$('#plb',s.el).innerHTML=plateBody()});return s}

// clock sheet: Pause + fast minute wheel to roll the time back
function clockSheet(){
  const s=sheet({title:'Workout clock',right:`<button class="btn plain" data-x="close">Done</button>`,body:`
    <div class="ck-big num" data-el>${fmt(WK.elapsed)}</div><div class="ck-sub sub">Started 6:12 PM · ${WK.title}</div>
    <div class="pad"><button class="btn block ${WK.paused?'accent':'ink'}" data-x="pause">${I(WK.paused?'play':'pause')} ${WK.paused?'Resume':'Pause'}</button></div>
    <div class="ghead" style="padding-left:20px">Roll back time</div>
    <div class="wheelbox"><div class="wband"></div><div class="wheel noswipe" id="wheel">${Array.from({length:181},(_,i)=>`<div class="wi" data-m="${i}">${i}</div>`).join('')}</div><span class="wunit">min</span></div>
    <p class="foot center" id="wres">Elapsed stays ${fmt(WK.elapsed)}</p>
    <div class="pad"><button class="btn grey block" data-x="apply">Subtract</button></div>`});
  const w=$('#wheel',s.el),H=40;let m=0;
  const upd=()=>{m=Math.round(w.scrollTop/H);$$('.wi',w).forEach((x,i)=>x.classList.toggle('on',i===m));
    $('#wres',s.el).textContent=m?`Elapsed becomes ${fmt(WK.elapsed-m*60)} (−${m} min)`:`Elapsed stays ${fmt(WK.elapsed)}`};
  w.addEventListener('scroll',upd,{passive:true});setTimeout(()=>{w.scrollTop=(S.wheel||0)*H;upd()},30);
  s.el.addEventListener('click',e=>{const a=e.target.closest('[data-x]');if(!a)return;const k=a.dataset.x;if(k==='close')s.close();
    if(k==='pause'){WK.paused=!WK.paused;a.className='btn block '+(WK.paused?'accent':'ink');a.innerHTML=I(WK.paused?'play':'pause')+(WK.paused?' Resume':' Pause');$$('.clock').forEach(c=>c.classList.toggle('paused',WK.paused))}
    if(k==='apply'&&m){WK.elapsed=Math.max(0,WK.elapsed-m*60);paintTime();w.scrollTop=0;toast(`Rolled back ${m} min`)}});
  return s;
}
function restSheet(){const s=sheet({title:'Rest timer',body:`<div class="ck-big num" data-rest>${fmt(WK.rest.left)}</div><div class="ck-sub sub">Primary lift · default 3:00</div>
  <div class="chips center">${['1:00','1:30','2:00','2:30','3:00','4:00'].map(t=>`<button class="chip ${t==='3:00'?'on':''}">${t}</button>`).join('')}</div>
  <div class="pad two"><button class="btn grey" data-x="close">−15 s</button><button class="btn grey" data-x="close">+15 s</button></div><div class="pad"><button class="btn ink block" data-x="close">Skip rest</button></div>`});
  s.el.addEventListener('click',e=>{if(e.target.closest('[data-x]'))s.close()});return s}

// 9. SETTINGS
const tg=(on,id)=>`<span class="tg ${on?'on':''}" data-act="tg" ${id?`id="${id}"`:''} role="switch" aria-checked="${!!on}"></span>`;
const LV={beginner:'About 10 hard sets per muscle a week, simple full-body or upper/lower weeks. For your first year of lifting, or coming back after a long break.',
  intermediate:'About 12–16 hard sets per muscle a week with more exercise variety. For steady lifters who still add weight most months.',
  advanced:'16 or more hard sets per muscle a week and specialised splits. For experienced lifters whose progress has slowed.'};
V.settings=()=>`<div class="nav"><div class="l"><button class="back" data-go="#build">${I('chevL',2.4)}Build</button></div><div class="t">Settings</div><div class="r"></div></div>
  ${header('Settings')}
  <div class="group"><button class="row"><span class="ico acc">${I('flame',1.8)}</span><div class="grow"><div class="t1">Body weight</div><div class="t2">Updated from Pull-Up · Oct 19</div></div><span class="val num">182.4 lb</span>${CHEV}</button></div>
  <div id="profile">${profileHtml()}</div>
  <div class="ghead">Training level</div>
  <div class="group lvl"><div class="pad"><div class="seg">${['Beginner','Intermediate','Advanced'].map(l=>`<button class="${l==='Intermediate'?'on':''}" data-lv="${l.toLowerCase()}">${l}</button>`).join('')}</div></div>
   <p class="lvtx" id="lvtx">${LV.intermediate}</p></div>
  <p class="foot">Sets your weekly volume targets and which routines Build suggests.</p>
  ${favsHtml()}
  <div class="ghead">Gyms</div>
  <div class="group"><button class="row" data-act="equip"><span class="ico">${I('build',1.8)}</span><div class="grow"><div class="t1">Home gym</div><div class="t2">${Object.keys(EQUIP).length?`${Object.values(EQUIP).filter(Boolean).length} items ticked`:'Equipment not set · tap to tick what you have'}</div></div><span class="chk">${I('check',2.6)}</span></button>
   <button class="row"><span class="ico gr">${I('build',1.8)}</span><div class="grow"><div class="t1">Gold's Gym</div><div class="t2">Commercial · full equipment</div></div>${CHEV}</button>
   <button class="row addrow">${I('plus',2)} Add gym</button></div>
  <div class="ghead">Units & bars</div>
  <div class="group"><div class="row"><div class="grow t1">Units</div><div class="seg sm2"><button class="on">lb</button><button>kg</button></div></div>
   <button class="row"><div class="grow t1">Bars</div><span class="val">5 bars</span>${CHEV}</button>
   <button class="row"><div class="grow t1">Week starts on</div><span class="val">Monday</span>${CHEV}</button></div>
  <div class="ghead">Rest timer</div>
  <div class="group"><div class="row"><span class="gl primary">★</span><div class="grow t1">Primary lifts</div><span class="pill num">3:00</span></div>
   <div class="row"><span class="gl">✚</span><div class="grow t1">Accessories</div><span class="pill num">2:00</span></div>
   <div class="row"><span class="gl">●</span><div class="grow t1">Isolation</div><span class="pill num">1:30</span></div>
   <div class="row"><div class="grow"><div class="t1">Chime when rest ends</div><div class="t2">Soft</div></div>${tg(1)}</div>
   <div class="row"><div class="grow t1">Vibrate</div>${tg(1)}</div></div>
  <div class="ghead">Workout</div>
  <div class="group"><div class="row"><div class="grow"><div class="t1">Warm-up sets</div><div class="t2">One-tap ramp before primary lifts</div></div>${tg(1)}</div>
   <div class="row"><div class="grow"><div class="t1">Ape humor</div><div class="t2">Jokes on the finish screen</div></div>${tg(1,'humor')}</div></div>
  <div class="ghead">Data</div>
  <div class="group"><button class="row"><div class="grow t1 acc">Back up to file</div></button><button class="row"><div class="grow t1 acc">Restore from file</div></button></div>
  <p class="foot">Backups include routines, logs, gyms and settings. Your data stays on this device until you back it up.</p>
  <div class="group" style="margin-top:22px"><button class="row" data-go="#style"><span class="ico logo-tile"></span><div class="grow"><div class="t1">Ape-Chit style guide</div><div class="t2">Storyboard · logo v3, pending approval</div></div>${CHEV}</button></div>`;

// PROGRESS + muscle map (10. ape-head placeholder slot)
const REG2M=r=>!r?null:r.startsWith('g:')?r.slice(2):((window.REGION_GROUP||{})[r]||r); // map region -> muscle group (exercises.json regionGroup)
const VFILL={under:'var(--vol-under)',in:'var(--ink)',amber:'var(--vol-amber)',red:'var(--vol-red)'};
const volLegend=()=>`<div class="legend vleg">${['under','in','amber','red'].map(k=>`<span><i style="background:${VFILL[k]}"></i>${VLAB[k]}</span>`).join('')}</div><p class="foot vfoot">Amber above max, red above ${VB.red_factor!=null?VB.red_factor+'×':'(factor pending)'} max · rules.json volume_bands</p>`;
const FILL=v=>typeof v==='string'?VFILL[v]:v==null?'#dcdce0':v>=.95?'#0b0b0c':v>=.75?'#5a5a5f':v>=.45?'#a8a8ad':'#c4c4c9';
function map(side,vol,opt={}){const m=MM[side],[,,w,h]=m.vb.split(' ').map(Number);
  return `<svg viewBox="0 0 ${w} ${h}" class="mmap" aria-label="${side} muscle map"><path d="${m.outline.join(' ')}" fill="#ececef" stroke="#d6d6da" stroke-width="3"/>
   ${m.m.map(([id,reg,d])=>{const mu=REG2M(reg),v=vol[mu];if(!mu)return `<path d="${d}" class="nr" fill="#ececef" pointer-events="none"/>`; /* the two back ABDUCTOR paths have no region in the live map either */return `<path d="${d}" data-mu="${mu}" data-reg="${reg}" class="mp" fill="${opt.sel?(opt.sel.includes(mu)?'var(--accent)':'#d9d9dd'):opt.hl&&mu===opt.hl?'var(--accent)':FILL(v)}"/>`}).join('')}
   ${side==='front'&&opt.ape?`<g class="ape-head"><circle cx="512" cy="148" r="92" fill="#fff" stroke="var(--accent)" stroke-width="7" stroke-dasharray="18 13"/><text x="512" y="138" text-anchor="middle" font-size="46" font-weight="800" fill="var(--accent-press)" font-family="-apple-system,sans-serif">APE</text><text x="512" y="186" text-anchor="middle" font-size="32" fill="#6b6b70" font-family="-apple-system,sans-serif">head slot</text></g>`:''}</svg>`}
const VOL_X=[['traps',8,6,12],['forearms',6,4,12],['obliques',4,4,10],['lower_back',6,4,10],['adductors',4,4,10],['abductors',3,4,10]];
const volMap=()=>{const o={};[...VOL,...VOL_X].forEach(([m,n,lo,hi])=>o[m]=vStat(n,lo,hi));return o}; // same vStat as the panel
V.progress=()=>header('Progress',bookBtn)+
  `<div class="pad"><div class="seg"><button class="on">This week</button><button>4 weeks</button><button>Block</button></div></div>
   <div class="card mapcard"><div class="maps">${map('front',volMap(),{ape:true})}${map('back',volMap())}</div>
    ${volLegend()}
    <p class="maptip">Tap a muscle to learn about it</p></div>
   <div class="sec"><h2>4 wk vs previous</h2><span class="more">Deload excluded</span></div>
   <div class="group">${VOL.slice(0,6).map(([m,n])=>`<button class="row" data-go="#learn-${m}"><div class="grow t1">${ML[m]}</div><span class="val num">${n*4} vs ${n*4}</span><span class="flat">—</span>${CHEV}</button>`).join('')}</div>`;
function afterMap(){$$('.mmap .mp').forEach(p=>p.addEventListener('click',()=>{if(p.dataset.mu)go('#learn-'+p.dataset.mu)}))}

// STYLE GUIDE
const SW=[['--ink','#000000','Ink'],['--paper','#FFFFFF','Paper'],['--accent','#E8430C','Ember (accent)'],['--accent-press','#C2380A','Ember pressed / small text'],['--accent-tint','#FDECE6','Ember tint'],['--bg','#F2F2F4','Background'],['--fill','#E9E9EC','Fill'],['--text-2','#6B6B70','Secondary text'],['--danger','#E5242B','Delete only (functional)']];
V.style=()=>`<div class="nav"><div class="l"><button class="back" data-go="#settings">${I('chevL',2.4)}Settings</button></div><div class="t">Style guide</div><div class="r"></div></div>
  ${header('Ape-Chit')}
  <div class="card brand"><div class="lockup" role="img" aria-label="Ape-Chit lockup"></div><div class="icons"><div class="logo-tile big"></div><div class="logo-tile mid"></div><div class="logo-tile sm"></div>
   <p class="sub">Logo v3, pending approval. Referenced once, in tokens.css.</p></div></div>
  <div class="ghead">Palette · black, white, one accent</div>
  <div class="group">${SW.map(([t,h,n])=>`<div class="row"><span class="sw" style="background:var(${t})"></span><div class="grow"><div class="t1">${n}</div><div class="t2"><code>${t}</code></div></div><span class="val num">${h}</span></div>`).join('')}</div>
  <p class="foot"><b>Ember</b> is the only accent: primary actions, PRs, the active field and the rest line. Ember on white is 4.0:1 (fills, large text); pressed Ember is 5.4:1 for small text. Red appears only on delete.</p>
  <div class="ghead">Type · system font (SF Pro)</div>
  <div class="card tyset"><div style="font-size:34px;font-weight:700;letter-spacing:-.02em">Large Title 34</div><div style="font-size:22px;font-weight:700">Title 22</div>
   <div style="font-size:17px;font-weight:600">Headline 17</div><div style="font-size:17px">Body 17 · inputs ≥ 16</div><div style="font-size:15px;color:var(--text-2)">Subhead 15</div>
   <div style="font-size:13px;color:var(--text-2)">Footnote 13</div><div class="eyebrow">Eyebrow 13 caps</div><div class="num" style="font-size:28px;font-weight:600">225 × 8 · 1:48</div></div>
  <div class="ghead">Controls</div>
  <div class="card ctl"><div class="two"><button class="btn accent">Primary</button><button class="btn ink">Secondary</button></div><div class="two"><button class="btn grey">Tertiary</button><button class="btn danger">Delete</button></div>
   <div class="seg"><button>Beginner</button><button class="on">Intermediate</button><button>Advanced</button></div>
   <div class="chips" style="padding:0"><button class="chip on">★ Primary</button><button class="chip">✚ Accessory</button><button class="chip">● Isolation</button></div>
   <div class="tags"><span class="tag acc">More stretch emphasis</span><span class="tag">More stable</span><span class="badge">PR</span><span class="evb ink">Studies</span><span class="evb">Mechanics</span><span class="evb line">Coach model</span></div>
   <div class="fields"><input class="fld demo" readonly value="" placeholder="225"><input class="fld demo active" readonly value="230"><input class="fld demo auto" readonly value="230">${tg(1)}${tg(0)}</div>
   <p class="sub">Field: empty · active · auto-filled from the set above</p></div>
  <div class="ghead">Space · radius · motion</div>
  <div class="card ctl"><div class="spc">${[4,8,12,16,20,24,32].map(s=>`<span style="width:${s}px;height:${s}px"></span>`).join('')}</div>
   <div class="rads">${[8,12,16,22].map(r=>`<span style="border-radius:${r}px">${r}</span>`).join('')}</div>
   <p class="sub">4-pt grid. Sheets slide on the iOS curve (--ease) in 380 ms; taps dim or scale in 120 ms.</p>
   <div class="two"><button class="btn grey" data-act="demo-sheet">Open a sheet</button><button class="btn grey" data-go="#keypad">Keypad</button></div></div>`;

// LEARN: rendered only from Coach's data/education (education-spec.md, education v1). index.json drives everything:
// a page whose status turns "final" appears automatically, no code change. References resolve from references.json.
const EDU={base:null,idx:null,refs:{},cache:{}};
const EVL={supported:['Supported','ink'],biomechanics:['Mechanics',''],modeled:['Model','line']};
const BAND=r=>r>=.75?'main':r>=.4?'helper':r>=.25?'minor':null;           // Coach's display bands; < 0.25 not shown
const BANDL={main:'Main',helper:'Helper',minor:'Minor'};
const XBANDL={main:'Main mover',helper:'Helper',minor:'Minor',nc:'Not counted'}; // exercise-page labels (exercise-pages-spec §7)
async function eduLoad(){
  if(EDU.idx)return EDU.idx;
  for(const b of ['../data/education/','data/education/']){ // next to the live app's data first, then the storyboard's synced copy
    try{const r=await fetch(b+'index.json',{cache:'no-store'});if(r.ok){EDU.idx=await r.json();EDU.base=b;break}}catch(e){}}
  if(!EDU.idx)EDU.idx={pages:[]};
  try{const r=await fetch(EDU.base+(EDU.idx.references||'references.json'),{cache:'no-store'});if(r.ok)EDU.refs=(await r.json()).references||{}}catch(e){}
  // exercise pages cite from a second file; merge so every [n] resolves the same way
  for(const f of ['references-exercises.json'])try{const r=await fetch(EDU.base+f,{cache:'no-store'});if(r.ok)Object.assign(EDU.refs,(await r.json()).references||{})}catch(e){}
  return EDU.idx;
}
async function eduPage(id){const idx=await eduLoad(),p=idx.pages.find(x=>x.id===id);if(!p)return {entry:null,page:null};
  if(p.status!=='final')return {entry:p,page:null};
  if(!(p.path in EDU.cache)){try{const r=await fetch(EDU.base+p.path,{cache:'no-store'});EDU.cache[p.path]=r.ok?await r.json():null}catch(e){EDU.cache[p.path]=null}}
  return {entry:p,page:EDU.cache[p.path]};
}
const evb=e=>e&&EVL[e]?`<span class="evb ${EVL[e][1]}" title="Evidence: ${e}">${EVL[e][0]}</span>`:'';
let CITES=[];const cite=keys=>(keys||[]).filter(k=>EDU.refs[k]).map(k=>{let n=CITES.indexOf(k)+1;if(!n){CITES.push(k);n=CITES.length}return `<button class="cite" data-ref="${k}" aria-label="Reference ${n}">${n}</button>`}).join('');
const ev=(o)=>`<span class="evw">${evb(o.evidence)}${cite(o.citations)}</span>`;
const tagL=ids=>(ids||[]).map(t=>`<span class="tag acc">${(window.SWAPTAG||{})[t]||t}</span>`).join('');
const exLink=id=>`<button class="exl" data-act="exinfo" data-id="${id}">${gl(id)}<span class="grow">${exName(id)}</span>${CHEV}</button>`;
const sect=(title,html,open=false,count='')=>`<details class="ls" ${open?'open':''}><summary><span>${title}</span>${count?`<em>${count}</em>`:''}${I('chevD',2.2)}</summary><div class="lsb">${html}</div></details>`;
const backBtn=(t='Back')=>`<button class="back" data-act="back">${I('chevL',2.4)}${t}</button>`;
function refList(){if(!CITES.length)return '';return sect('References',`<ol class="refs">${CITES.map(k=>{const r=EDU.refs[k];return `<li id="ref-${k}"><b>${r.authors} (${r.year}).</b> ${r.title}. <i>${r.journal}</i> ${r.volume||''}${r.pages?': '+r.pages:''}. <a href="${r.url}" target="_blank" rel="noopener">doi:${r.doi}</a></li>`}).join('')}</ol>`,false,CITES.length)}
function refSheet(k){const r=EDU.refs[k];if(!r)return;sheet({title:'Reference',body:`<div class="refsh"><div class="eyebrow">${(r.study_type||'').replace(/_/g,' ')}</div><h3>${r.title}</h3>
  <p class="sub">${r.authors} · ${r.journal} ${r.year}${r.volume?' · '+r.volume:''}${r.pages?': '+r.pages:''}</p>${r.finding?`<p class="fd">${r.finding}</p>`:''}
  <a class="btn grey block" href="${r.url}" target="_blank" rel="noopener">Open DOI ${r.doi}</a>${r.verified?`<p class="foot" style="padding:10px 0 0">Verified: ${r.verified}</p>`:''}</div>`})}
// live: every exercise that credits this muscle, from exercises.json ratings, in Coach's bands
function creditList(mu){const L=Object.values(EX).map(e=>[e,e.rat[mu]||0]).filter(([,r])=>BAND(r)).sort((a,b)=>b[1]-a[1]||a[0].name.localeCompare(b[0].name));
  const g={main:[],helper:[],minor:[]};L.forEach(([e,r])=>g[BAND(r)].push([e,r]));return g}
const rate=r=>`<span class="rate ${BAND(r)}"><b class="num">${+r.toFixed(2)}</b>${BANDL[BAND(r)]||''}</span>`;

V.learn=()=>`<div class="nav"><div class="l">${backBtn()}</div><div class="t">Learn</div><div class="r"></div></div>${header('Learn')}<div id="learnbody"><p class="foot">Loading…</p></div>`;
async function afterLearn(){
  const idx=await eduLoad(),mus=idx.pages.filter(p=>p.kind==='muscle'),fun=idx.pages.filter(p=>p.kind==='fundamental');
  const vm={};mus.forEach(p=>vm[p.id]=p.status==='final'?1:.3);const nf=mus.filter(p=>p.status==='final').length;
  const fpages=await Promise.all(fun.map(p=>p.status==='final'?eduPage(p.id):Promise.resolve({entry:p})));
  const xi=await exIndex(),xp=(xi.pages||[]).slice().sort((x,y)=>x.rank-y.rank),xf=xp.filter(p=>p.status==='final'),xtop=[...xf,...xp.filter(p=>p.status!=='final')].slice(0,8);
  $('#learnbody').innerHTML=`<div class="card mapcard"><div class="maps">${map('front',vm)}${map('back',vm)}</div>
    <div class="legend"><span><i style="background:#0b0b0c"></i>Guide ready</span>${nf<mus.length?'<span><i style="background:#c4c4c9"></i>Coming soon</span>':''}</div><p class="maptip">Tap any muscle</p></div>
   <div class="sec"><h2>Muscles</h2><span class="more num">${nf} of ${mus.length} ready</span></div>
   <div class="group">${mus.map(p=>`<button class="row ${p.status==='final'?'':'planned'}" data-go="#learn-${p.id}"><div class="grow t1">${p.title}</div>${p.status==='final'?'':'<span class="soon">Coming soon</span>'}${CHEV}</button>`).join('')}</div>
   <div class="sec"><h2>Fundamentals</h2></div>
   <div class="group">${fun.map((p,i)=>{const pg=fpages[i].page;return p.status==='final'?`<button class="row" data-go="#learn-f-${p.id}"><span class="ico acc">${I('book',1.7)}</span><div class="grow"><div class="t1">${p.title}</div><div class="t2 clamp">${pg?pg.summary:''}</div></div>${CHEV}</button>`
     :`<div class="row planned"><span class="ico gr">${I('book',1.7)}</span><div class="grow"><div class="t1">${p.title}</div></div><span class="soon">Coming soon</span></div>`}).join('')}</div>
   ${xp.length?`<div class="sec"><h2>Exercises</h2><span class="more num">${xf.length} of ${xp.length} written</span></div>
   <div class="group">${xtop.map(p=>`<button class="row" data-go="#learn-ex-${p.id}">${gl(p.id)}<div class="grow"><div class="t1">${exName(p.id)}</div><div class="t2">${p.status==='final'?'Coach guide':'Auto page from the library · guide coming'}</div></div>${CHEV}</button>`).join('')}</div>
   <p class="foot">Every exercise has a page: Coach's guide when written, otherwise one generated from the library.</p>`:''}
   <p class="foot">${idx.disclaimer||''}</p>`;
  afterMap();
}
V.learnMuscle=()=>`<div class="nav"><div class="l">${backBtn()}</div><div class="t" id="lmt"></div><div class="r"></div></div><div id="lm"><p class="foot">Loading…</p></div>`;
async function afterLearnMuscle(id){
  CITES=[];const {entry,page:j}=await eduPage(id),nm=(j||entry||{}).title||ML[id]||id;$('#lmt').textContent=nm;
  const vm={},cr=creditList(id);const mapc=`<div class="card mapcard small"><div class="maps">${map('front',vm,{hl:id})}${map('back',vm,{hl:id})}</div>
    ${entry&&entry.region_names?`<div class="chiprow center">${Object.values(entry.region_names).map(n=>`<span class="tag">${n}</span>`).join('')}</div>`:''}</div>`;
  const credits=(note,evd)=>sect('Exercises that train it',`${['main','helper','minor'].map(b=>cr[b].length?`<div class="band"><div class="eyebrow">${BANDL[b]} · ${b==='main'?'0.75 and up':b==='helper'?'0.4 to under 0.75':'0.25 to under 0.4'}</div>
      ${cr[b].slice(0,b==='main'?8:6).map(([e,r])=>`<button class="exl" data-act="exinfo" data-id="${e.id}">${gl(e.id)}<span class="grow">${e.name}</span>${rate(r)}</button>`).join('')}${cr[b].length>(b==='main'?8:6)?`<p class="more2">+ ${cr[b].length-(b==='main'?8:6)} more</p>`:''}</div>`:'').join('')}
      ${note?`<p class="note">${note} ${evb(evd)}</p>`:''}<p class="foot" style="padding:6px 0 0">Live from exercises.json. Ratings under 0.25 are not shown and add no sets.</p>`,false,cr.main.length+cr.helper.length+cr.minor.length);
  if(!j){$('#lm').innerHTML=`${header(nm)}<div class="soonbox"><span class="soon">Coming soon</span><p class="sub">Coach is writing this guide. It appears here as soon as index.json marks it final.</p></div>${mapc}<div class="lsx">${credits()}</div>`;return}
  const W=j.what_it_is||{},heads=W.heads||[],hn=h=>h==='all'?'All heads':((heads.find(x=>x.id===h)||{}).name||h),R=j.relationships||{};
  const rel=(arr)=>(arr||[]).map(s=>`<div class="relr">${s.muscle_id&&s.muscle_id!==id?`<button class="chip" data-go="#learn-${s.muscle_id}">${s.name} ${I('chevR',2.4)}</button>`:`<span class="chip static">${s.name}</span>`}<p>${s.role} ${ev(s)}</p></div>`).join('');
  $('#lm').innerHTML=`${header(nm)}<p class="lsum">${j.summary||''}</p>${mapc}<div class="lsx">
   ${sect('Anatomy & heads',`${W.overview?`<p>${W.overview}</p>`:''}${heads.map(h=>`<div class="head"><div class="bh"><b>${h.name}</b>${ev(h)}</div>
      <dl><dt>Starts</dt><dd>${h.origin}</dd><dt>Attaches</dt><dd>${h.insertion}</dd><dt>Fibres</dt><dd>${h.fiber_direction}</dd><dt>Crosses</dt><dd>${(h.crosses_joints||[]).map(x=>`<span class="tag">${x}</span>`).join(' ')}</dd></dl></div>`).join('')}`,true,heads.length+' parts')}
   ${sect('What it does',(j.what_it_does||[]).map(a=>`<div class="act2"><div class="bh"><b>${a.action}</b>${ev(a)}</div><p>${a.detail||''}</p><div class="hchips">${(a.head_ids||[]).map(h=>`<span class="tag">${hn(h)}</span>`).join('')}</div></div>`).join(''),false,(j.what_it_does||[]).length)}
   ${sect('Works with & against',`<div class="eyebrow">Synergists</div>${rel(R.synergists)}<div class="eyebrow" style="margin-top:12px">Antagonists</div>${rel(R.antagonists)}
      ${(R.stabilizer_roles||[]).length?`<div class="eyebrow" style="margin-top:12px">Stabilizer roles</div>${R.stabilizer_roles.map(s=>`<p>${s.text} ${ev(s)}</p>`).join('')}`:''}`)}
   ${sect('How to bias each head',(j.bias||[]).map(b=>`<div class="bias"><div class="bh"><b>${b.goal}</b>${ev(b)}</div><div class="eyebrow">${hn(b.target)}</div>
      <dl>${[['joint_angle','Arm / joint'],['stretch_position','Stretch'],['grip','Grip'],['stance','Set-up']].filter(([k])=>b.how&&b.how[k]).map(([k,l])=>`<dt>${l}</dt><dd>${b.how[k]}</dd>`).join('')}</dl>
      ${(b.swap_tags||[]).length?`<div class="tags">${tagL(b.swap_tags)}</div>`:''}${(b.example_exercise_ids||[]).map(exLink).join('')}${b.caveat?`<p class="cav">${b.caveat}</p>`:''}</div>`).join(''),true,(j.bias||[]).length)}
   ${sect('Best exercises',(j.best_exercises||[]).map(b=>{const r=(EX[b.exercise_id]||{rat:{}}).rat[id]||0;return `<div class="best"><button class="exl" data-act="exinfo" data-id="${b.exercise_id}">${gl(b.exercise_id)}<span class="grow">${exName(b.exercise_id)}</span>${rate(r)}</button><p>${b.why} ${ev(b)}</p></div>`}).join(''),true,(j.best_exercises||[]).length)}
   ${credits(R.indirect_note,R.indirect_evidence)}
   ${sect('Common mistakes',`<ul class="bul">${(j.mistakes||[]).map(m=>`<li>${m.text} ${ev(m)}</li>`).join('')}</ul>`,false,(j.mistakes||[]).length)}
   ${sect('Coaching cues',(j.coach_cues||[]).map(c=>`<div class="cue2"><b>“${c.cue}”</b><p>${c.why} ${ev(c)}</p></div>`).join(''),false,(j.coach_cues||[]).length)}
   ${sect('Honest limits',`<ul class="bul">${(j.notes||[]).map(n=>`<li>${n}</li>`).join('')}</ul>`)}
   ${refList()}</div>
   <p class="evkey">${Object.entries(EVL).map(([k,v])=>`<span class="evb ${v[1]}">${v[0]}</span> ${k==='supported'?'a training study measured it':k==='biomechanics'?'follows from anatomy and mechanics':'coach consensus or app model'}`).join('<br>')}</p>
   <p class="foot">${(EDU.idx||{}).disclaimer||''} Updated ${j.updated||''}.</p>`;
  afterMap();
}
V.learnFund=()=>`<div class="nav"><div class="l">${backBtn('Learn')}</div><div class="t"></div><div class="r"></div></div><div id="lf"><p class="foot">Loading…</p></div>`;
async function afterLearnFund(id){
  CITES=[];const idx=await eduLoad();if(!id){const f=idx.pages.find(p=>p.kind==='fundamental'&&p.status==='final');id=f&&f.id}
  const {entry,page:j}=await eduPage(id);
  if(!j){$('#lf').innerHTML=`${header((entry||{}).title||'Fundamentals')}<div class="soonbox"><span class="soon">Coming soon</span></div>`;return}
  const al=j.app_link||{};
  $('#lf').innerHTML=`<div class="fund-hero"><div class="eyebrow">Fundamentals</div><h1>${j.title}</h1><p>${j.summary||''}</p></div>
   ${al.explains?`<div class="card inapp"><div class="eyebrow">In Ape-Chit</div><p>${al.explains}</p><ul>${(al.features||[]).map(f=>`<li>${f.replace(/\s*\(([^)]*)\)/,' <code>$1</code>')}</li>`).join('')}</ul></div>`:''}
   <div class="lsx">${(j.sections||[]).map((s,i)=>sect(s.heading,`${(s.body||[]).map(p=>`<p>${p}</p>`).join('')}
      ${(s.points||[]).length?`<div class="pts">${s.points.map(p=>`<div class="pt"><p>${p.text}</p><div class="ptm">${ev(p)}${tagL(p.swap_tags)}${p.app_key?`<code>${p.app_key}</code>`:''}</div></div>`).join('')}</div>`:''}`,i===0,(s.points||[]).length?s.points.length+' points':'')).join('')}
   ${(j.notes||[]).length?sect('Honest limits',`<ul class="bul">${j.notes.map(n=>`<li>${n}</li>`).join('')}</ul>`):''}
   ${refList()}</div><p class="foot">${(EDU.idx||{}).disclaimer||''}</p>`;
}
function exInfoSheet(id){const e=EX[id]||{rat:{}},rs=Object.entries(e.rat).filter(([,r])=>BAND(r)).sort((a,b)=>b[1]-a[1]),vm={};rs.forEach(([m,r])=>vm[m]=r>=.75?1:r>=.4?.75:.5);
  const s=sheet({body:`<div class="exi"><div class="exi-h">${gl(id)}<div><h3>${exName(id)}</h3><p class="sub">${(e.type||' ')[0].toUpperCase()+(e.type||'').slice(1)} · ${e.eq||''}</p></div></div>
    <div class="mapcard small flat"><div class="maps">${map('front',vm)}${map('back',vm)}</div></div>
    <div class="group inset0">${rs.map(([m,r])=>`<button class="row" data-go="#learn-${m}"><div class="grow t1">${ML[m]||m}</div>${rate(r)}${CHEV}</button>`).join('')}</div>
    <p class="foot" style="padding:8px 4px 0">Muscle ratings from exercises.json · tap a muscle to learn about it.</p>
    <div class="pad two"><button class="btn grey" data-x="sw">${I('swap',1.8)} Swap</button><button class="btn accent" data-x="add">${I('plus',2)} Add</button></div></div>`});
  s.el.addEventListener('click',ev=>{if(ev.target.closest('[data-go]'))return s.close();const x=ev.target.closest('[data-x]');if(!x)return;s.close();if(x.dataset.x==='sw')swapSheet(id);else toast('Added to workout')});return s}
const infoFor=id=>{const e=EX[id];if(!e)return '#learn';const top=Object.entries(e.rat).sort((a,b)=>b[1]-a[1])[0];return top?'#learn-'+top[0]:'#learn'}; // (i) opens the page of the exercise's main muscle

// ---------------------------------------------------------------- favorites, profile (goals + bias), mock ranking "why" lines
// Mock state in localStorage. In the rebuild, ranking + reasons come from ONE logic/rank.js (port of Coach's tools/rank.py).
const LSK={fav:'apechit.sb.favs',goals:'apechit.sb.goals',bias:'apechit.sb.bias'};
const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let FAV=ld(LSK.fav,['cable-lateral-raise','incline-dumbbell-curl','pull-up','romanian-deadlift','seated-cable-row']);
let GOALS=ld(LSK.goals,['muscle_size','joint_friendly']),BIAS=ld(LSK.bias,['side_delts','lats']);
const isFav=id=>FAV.includes(id);
function toggleFav(id){FAV=isFav(id)?FAV.filter(x=>x!==id):[...FAV,id];sv(LSK.fav,FAV);$$(`[data-act=fav][data-id="${id}"]`).forEach(b=>{b.classList.toggle('on',isFav(id));b.innerHTML=starSvg(isFav(id))});toast(isFav(id)?'Added to Favorites':'Removed from Favorites')}
const starSvg=on=>`<svg viewBox="0 0 24 24" fill="${on?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>`;
const starBtn=id=>`<button class="star ${isFav(id)?'on':''}" data-act="fav" data-id="${id}" aria-label="Favorite">${starSvg(isFav(id))}</button>`;
// mock of rank.js reasons: Favorite · fills <muscle> gap · Bias: <muscle> · Goal: <goal> · Same movement · Not done lately
function why(id,ctx){const e=EX[id];if(!e)return '';const r=[];
  if(isFav(id))r.push('Favorite');
  const gap=GAPS.find(([m])=>(e.rat[m]||0)>=.5);if(gap)r.push(`fills ${ML[gap[0]].toLowerCase()} gap`);
  const bi=BIAS.find(m=>(e.rat[m]||0)>=.75);if(bi&&r.length<2)r.push(`Bias: ${ML[bi].toLowerCase()}`);
  if(ctx==='swap'&&r.length<2)r.push('Same movement');
  if(r.length<2&&GOALS.includes('strength')&&e.type==='primary')r.push('Goal: strength');
  if(r.length<2&&GOALS.includes('size')&&e.type!=='primary')r.push('Goal: size');
  if(!r.length)r.push('Not done lately');
  return r.slice(0,2).join(' · ').replace(/^./,c=>c.toUpperCase());
}
const whyL=(id,ctx)=>`<div class="why">${why(id,ctx)}</div>`;
// ---------------------------------------------------------------- RANKING (logic/rank.js = port of Coach's tools/rank.py)
// One scorer for swap, tray, empty workout and preset. Weights, labels, reason strings, favorite margin and volume_bands all
// come from rules.json; nothing ranking-related is hardcoded here. Mock week = window.BOARDS (same boards as Coach's cases).
let RD=null;
async function loadRank(){if(RD)return RD;
  for(const b of ['data/','../data/']){try{const f=n=>fetch(b+n,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(n);return r.json()});
    const [exercises,rules,targets,patterns,splits]=await Promise.all(['exercises.json','rules.json','targets.json','patterns.json','splits.json'].map(f));
    RD=RANK.makeData({exercises,rules,targets,patterns,splits});RD.splits=splits;RD.base=b;return RD}catch(e){}}
  console.warn('ranking data missing: suggestions fall back to library order');return null}
const LSK2={equip:'apechit.sb.equip'};
let EQUIP=ld(LSK2.equip,{});                                  // gym profile `equipment` {name: bool} (ranking-spec §5, Builder items)
const gymProfile=()=>Object.assign({},RD.rules.logger.gym_profile_default.lb,Object.keys(EQUIP).length?{equipment:EQUIP}:{});
const PREFS_OVR={};                                            // per-route overrides (worked examples)
const prefs=()=>Object.assign({goals:GOALS,bias_muscles:BIAS,favorites:FAV,gym_profile:RD?gymProfile():null,level:'intermediate',unit:'lb'},PREFS_OVR.p||{});
let SC={board:BOARDS.ppl,day:'fri',cands:null,note:''};       // ranking scenario for the current route
const scen=(o)=>()=>{SC=Object.assign({board:BOARDS.ppl,day:'fri',cands:null,note:''},o.sc||{});PREFS_OVR.p=o.p||null};
const rk=(ctx,cands,state,n)=>RD?RANK.rank(RD,ctx,cands,Object.assign({board:SC.board,day:SC.day},state||{}),prefs(),n):[];
const whyR=r=>`<div class="why">${r.reasons.join(' · ')}${r.notes.includes('equipment_unknown')?' · <span class="unk">Check your gym has this</span>':''}</div>`;
const goalLabel=g=>((RD&&RD.rules.ranking.goals[g])||{}).label||g;
const GOAL_MIG={size:'muscle_size',longevity:'joint_friendly',fatloss:'conditioning',masc:'aesthetic_v_taper',fem:'aesthetic_lower_emphasis'};
GOALS=uniqA(GOALS.map(g=>GOAL_MIG[g]||g));function uniqA(a){return [...new Set(a)]}

const RWHY={ul:'Goal: size · fits 4 days',ppl:'Bias: side delts · 6 days',fb:'Goal: longevity · 3 days',arn:'Goal: size · advanced volume'};

// EXERCISE PAGE (Learn): data/education/exercises/<id>.json; placeholders until Coach's files land
// Exercise pages (Coach's exercise-pages-spec.md): exercises/index.json plans the authored pages; a final entry -> exercises/<path>,
// anything else -> exercises/auto/<id>.json (generated for every exercise, labelled source:"auto"). No per-exercise code.
async function exIndex(){await eduLoad();if(EDU.xidx)return EDU.xidx;try{const r=await fetch(EDU.base+'exercises/index.json',{cache:'no-store'});EDU.xidx=r.ok?await r.json():{pages:[]}}catch(e){EDU.xidx={pages:[]}}return EDU.xidx}
async function exPage(id){
  const xi=await exIndex(),p=(xi.pages||[]).find(x=>x.id===id),tries=[];
  if(p&&p.status==='final')tries.push(EDU.base+'exercises/'+p.path);
  tries.push(EDU.base+'exercises/'+((xi.auto||{}).dir||'auto/')+id+'.json');
  for(const u of tries){if(!(u in EDU.cache)){try{const r=await fetch(u,{cache:'no-store'});EDU.cache[u]=r.ok?await r.json():null}catch(e){EDU.cache[u]=null}}if(EDU.cache[u])return {entry:p,page:EDU.cache[u]}}
  return {entry:p,page:null};
}
V.learnEx=()=>`<div class="nav"><div class="l">${backBtn()}</div><div class="t" id="lxt"></div><div class="r" id="lxr"></div></div><div id="lx"><p class="foot">Loading…</p></div>`;
async function afterLearnEx(id){
  CITES=[];const e=EX[id]||{rat:{},mus:[]},{page:j}=await exPage(id),nm=(j&&j.title)||e.name||id;$('#lxr').innerHTML=starBtn(id);
  // live ratings come from exercises.json (EX.rat); Coach's page only adds the explanation per muscle
  const pm={};((j&&j.muscles)||[]).forEach(m=>pm[m.muscle_id]=m);
  const live=m=>e.rat[m]!=null?e.rat[m]:(pm[m]||{}).rating||0;
  const ids=j&&j.muscles?j.muscles.map(m=>m.muscle_id):Object.keys(e.rat).filter(m=>e.rat[m]>0);
  const shown=ids.map(m=>[m,live(m)]).sort((a,b)=>b[1]-a[1]),hidden=0;
  const hit=sect('Muscles hit',`<div class="mhit">${shown.map(([m,r])=>{const x=pm[m]||{};return `<button class="mh" data-r="${r}" data-go="#learn-${m}"><span class="mn">${ML[m]||m}</span><span class="mb ${BAND(r)||'nc'}"><i style="--w:${r*100}%"></i></span><span class="rate ${BAND(r)||'nc'}"><b class="num">${+(+r).toFixed(2)}</b>${XBANDL[BAND(r)||'nc']}</span></button>${x.why?`<p class="mwhy">${x.why} ${x.evidence?ev(x):''}</p>`:''}${(x.region_notes||[]).map(n=>`<p class="mwhy rn"><b>${(window.RNAME||{})[n.region_id]||n.region_id.replace(/_/g,' ')}</b> ${n.text} ${ev(n)}</p>`).join('')}`}).join('')}</div>
    <p class="foot" style="padding:6px 0 0">Live ratings from exercises.json. Bands are a model: main mover 0.75+, helper 0.4–0.75, minor 0.25–0.4, not counted under 0.25.</p>`,true,shown.length);
  const has=a=>a&&a.length,ph=j&&(j.placeholder||/PLACEHOLDER/.test(j.notice||''));
  const tw=t=>t.change?{h:t.change,tg:(t.target_muscle_ids||[]).map(m=>ML[m]||m).join(', '),k:t.kind}:{h:t.tweak,tg:ML[t.target]||t.target,k:''};
  const body=!j?`<div class="soonbox"><span class="soon">Coming soon</span><p class="sub">Coach is writing this page.</p></div><div class="lsx">${hit}</div>`:`
   ${ph?`<div class="ph">${j.notice||'PLACEHOLDER — Coach content pending'}</div>`:''}${j.source==='auto'?`<div class="autob">${I('info',1.8)}<span>${j.source_label||'Auto-generated from the exercise library'}</span></div>`:''}<div class="lsx">${hit}
   ${has(j.setup)?sect('Setup',`<ul class="bul">${j.setup.map(m=>`<li>${m.text} ${ev(m)}</li>`).join('')}</ul>`,false,j.setup.length):''}
   ${has(j.form_cues)?sect('Form cues',j.form_cues.map(c=>`<div class="cue2"><b>“${c.cue}”</b><p>${c.why||''} ${ev(c)}</p></div>`).join(''),true,j.form_cues.length):''}
   ${has(j.bias_tweaks)?sect('Tweaks to bias muscles',j.bias_tweaks.map(t=>{const w=tw(t);return `<div class="bias"><div class="bh"><b>${w.tg}</b>${w.k?`<span class="kind">${w.k}</span>`:''}${ev(t)}</div><p>${w.h}</p><p class="sub">${t.effect||''}</p>${has(t.swap_tags)?`<div class="tags">${tagL(t.swap_tags)}</div>`:''}${has(t.example_exercise_ids)?t.example_exercise_ids.map(exLink).join(''):''}${t.caveat?`<p class="cav">${t.caveat}</p>`:''}</div>`}).join(''),false,j.bias_tweaks.length):''}
   ${has(j.mistakes)?sect('Common mistakes',j.mistakes.map(m=>`<div class="myth"><p class="m1x">${m.text} ${ev(m)}</p>${m.fix?`<p class="m2"><span>Fix</span>${m.fix}</p>`:''}</div>`).join(''),false,j.mistakes.length):''}
   ${has(j.misconceptions)?sect('Misconceptions',j.misconceptions.map(m=>`<div class="myth"><p class="m1"><span>Myth</span>${m.myth}</p><p class="m2"><span>Reality</span>${m.reality} ${ev(m)}</p></div>`).join(''),false,j.misconceptions.length):''}
   ${has(j.lower_risk||j.safer_technique)?sect('Lower-injury-risk technique',(j.lower_risk||j.safer_technique).map(m=>`<div class="alt2">${m.topic?`<div class="eyebrow">${m.topic.replace(/_/g,' ')}</div>`:''}<p>${m.text} ${ev(m)}</p>${m.note?`<p class="cav">${m.note}</p>`:''}</div>`).join(''),false,(j.lower_risk||j.safer_technique).length):''}
   ${has(j.alternatives)?sect('Alternatives for other goals',j.alternatives.map(a=>`<div class="alt2"><div class="eyebrow">${a.goal_label||a.goal}</div>${exLink(a.exercise_id)}<p class="sub">${a.why||''} ${ev(a)}</p>${has(a.differences)?`<div class="tags">${a.differences.map(d=>`<span class="tag">${d}</span>`).join('')}</div>`:has(a.swap_tags)?`<div class="tags">${tagL(a.swap_tags)}</div>`:''}</div>`).join('')+'<p class="foot" style="padding:8px 0 0">Typical differences, not guarantees.</p>',false,j.alternatives.length):''}
   ${has(j.notes)?sect('Honest limits',`<ul class="bul">${j.notes.map(n=>`<li>${n}</li>`).join('')}</ul>`):''}${refList()}</div>
   <p class="foot">${((EDU.xidx||{}).disclaimer||(EDU.idx||{}).disclaimer||'')}</p>`;
  $('#lx').innerHTML=`<div class="exhero">${gl(id)}<div><h1>${nm}</h1><p class="sub">${(e.type||' ')[0].toUpperCase()+(e.type||'').slice(1)} · ${e.eq||''}${isFav(id)?' · ★ Favorite':''}</p></div></div>
   ${j&&j.summary?`<p class="lsum">${j.summary}</p>`:''}
   ${j&&j.equipment_needs&&j.equipment_needs.text?`<p class="needs">${I('build',1.8)}<span>${j.equipment_needs.text}</span></p>`:''}
   <div class="pad two"><button class="btn grey" data-act="swap" data-id="${id}">${I('swap',1.8)} Swap</button><button class="btn accent" data-act="add">${I('plus',2)} Add to workout</button></div>${body}`;
}

// SETTINGS additions: goals, bias muscles (from the map), favorites (swipe remove, drag reorder)
function profileHtml(){const bm={};BIAS.forEach(m=>bm[m]=1);
  // goals, labels and notes from rules.json ranking.goals (Coach); max from ranking.goal_combine.max_goals; conflicts from ranking.goal_conflicts
  const G=RD?RD.rules.ranking.goals:{},mx=RD?RD.rules.ranking.goal_combine.max_goals:3,cf=RD?RANK.goalConflicts(GOALS.filter(g=>g in G),RD):[];
  const notes=Object.keys(G).filter(g=>G[g].label_note);
  return `<div class="ghead">Goals <span class="gmax num">${GOALS.length} of ${mx}</span></div><div class="group"><div class="goals">${Object.keys(G).map(k=>`<button class="chip ${GOALS.includes(k)?'on':''}" data-goal="${k}">${GOALS.includes(k)?I('check',2.6):''}${G[k].label}${G[k].label_note?'<sup>*</sup>':''}</button>`).join('')}</div>
   ${cf.map(c=>`<div class="conflict" data-conflict="${c.goals.join('+')}">${I('info',1.8)}<div><b>${c.goals.map(goalLabel).join(' + ')} pull in different directions.</b><p>${c.message}</p>${c.evidence?`<span class="badge ${c.evidence}">${({supported:'Supported',biomechanics:'Mechanics',modeled:'Model'})[c.evidence]||c.evidence}</span>`:''}</div></div>`).join('')}</div>
  <p class="foot">Pick up to ${mx}. Swaps, the exercise tray, empty-workout suggestions and preset slots are ranked with these.${notes.map(g=>`<br><sup>*</sup> ${G[g].label}: ${G[g].label_note}`).join('')}</p>
  <div class="ghead">Bias muscles</div><div class="group biasg"><div class="maps bmap">${map('front',{},{sel:BIAS})}${map('back',{},{sel:BIAS})}</div>
   <div class="chiprow center" id="biaschips">${BIAS.map(m=>`<button class="chip on" data-bias="${m}">${ML[m]} ${I('x',2.4)}</button>`).join('')||'<span class="sub">Tap muscles on the map</span>'}</div></div>
  <p class="foot">Tap muscles to bring up. Ranking favours exercises that train them hard.</p>`}
function favsHtml(){return `<div class="ghead" id="favs">Favorites</div><div class="group favl">${FAV.map(id=>`<div class="swipe" data-fav="${id}"><button class="del">Remove</button><div class="in"><div class="row frow"><span class="drag fdrag">${I('grip',2)}</span>${gl(id)}<div class="grow"><div class="t1">${exNameP(id)}</div><div class="t2">${exSub(id)}</div></div><span class="fstar">${starSvg(1)}</span></div></div></div>`).join('')||'<div class="row sub">No favorites yet</div>'}</div>
  <p class="foot">Star exercises on their Learn page, in the tray or in swaps. Swipe to remove, drag to reorder; order breaks ties in suggestions.</p>`}
function afterSettings(){bindSwipes($('#view'));
  $$('.favl .swipe').forEach(r=>{$(':scope > .del',r).addEventListener('click',()=>{FAV=FAV.filter(x=>x!==r.dataset.fav);sv(LSK.fav,FAV)})});
  $$('.bmap .mp').forEach(p=>p.addEventListener('click',()=>{const m=p.dataset.mu;if(!m)return;BIAS=BIAS.includes(m)?BIAS.filter(x=>x!==m):[...BIAS,m];sv(LSK.bias,BIAS);refreshProfile()}));
  $$('.fdrag').forEach(h=>h.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const row=h.closest('.swipe'),list=row.parentNode,y0=e.clientY,H=row.offsetHeight;row.classList.add('lifting');
    const mv=ev=>{const dy=ev.clientY-y0;row.style.transform=`translateY(${dy}px)`;const rows=$$('.swipe',list),i=rows.indexOf(row),n=Math.round(dy/H);
      rows.forEach((r,j)=>{if(r===row)return;r.style.transform=(n>0&&j>i&&j<=i+n)?`translateY(${-H}px)`:(n<0&&j<i&&j>=i+n)?`translateY(${H}px)`:''})};
    const up=ev=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);const rows=$$('.swipe',list),i=rows.indexOf(row),n=Math.max(-i,Math.min(rows.length-1-i,Math.round((ev.clientY-y0)/H)));
      const id=FAV.splice(i,1)[0];FAV.splice(i+n,0,id);sv(LSK.fav,FAV);render();setTimeout(()=>$('#favs').scrollIntoView({block:'start'}),0);if(n)toast('Favorites reordered')};
    addEventListener('pointermove',mv);addEventListener('pointerup',up)}));
}
function refreshProfile(){const sc=$('#view').scrollTop;$('#profile').innerHTML=profileHtml();afterSettingsProfile();$('#view').scrollTop=sc}
function afterSettingsProfile(){$$('.bmap .mp').forEach(p=>p.addEventListener('click',()=>{const m=p.dataset.mu;if(!m)return;BIAS=BIAS.includes(m)?BIAS.filter(x=>x!==m):[...BIAS,m];sv(LSK.bias,BIAS);refreshProfile()}))}

// ---------------------------------------------------------------- router: every screen and sheet has a hash
const ROUTES={ // route: [screen, tab, fullScreen, sessionActive, before, after]
 train:['train','train'],'train-pick':['train','train',0,0,()=>{S.pick='ppl'}],
 workout:['workout','',1,1],keypad:['workout','',1,1,null,()=>{focusField($('[data-kind=w]',$$('.exb')[1]))}],
 clock:['workout','',1,1,null,()=>{S.wheel=12;clockSheet()}],plates:['workout','',1,1,null,plateSheet],rest:['workout','',1,1,null,restSheet],
 'workout-swipe':['workout','',1,1,null,()=>{const r=$$('.exb')[5];r.scrollIntoView({block:'center'});r.classList.add('open')}],
 bar:['log','log',0,1],'bar-trash':['log','log',0,1,null,trashSheet],
 finish:['finish','',1,0],'finish-ape':['finish','',1,0,null,()=>{const c=$('#fincards');c.style.scrollBehavior='auto';c.scrollLeft=c.scrollWidth}],
 empty:['empty','',1,1,()=>{SC.day='sat'}],tray:['empty','',1,1,null,traySheet],'tray-legs':['empty','',1,1,()=>{SC.note="Coach's case: PPL intermediate legs day (Fri), no goals, bias or favorites";PREFS_OVR.p={goals:[],bias_muscles:[],favorites:[]}},traySheet],'tray-lib':['empty','',1,1,()=>{TF.mode='lib'},traySheet],
 'tray-calf':['empty','',1,1,()=>{Object.assign(SC,{board:BOARDS.legsGap,day:'mon',cands:BOARDS.legsGapCands,note:"Coach's calf-gap case: legs-only week, calves at 3 of 5 sets"});PREFS_OVR.p={goals:[],bias_muscles:[],favorites:[]}},traySheet],
 'swap-lat-home':['build','build',0,0,()=>{SC.board=[];SC.note='Lat pulldown swap with the Home template ticked (adjustable dumbbells, bench, pull-up bar, bands).';PREFS_OVR.p={goals:[],bias_muscles:[],favorites:[],gym_profile:RD.rules.equipment_items.example_profiles.home}},()=>swapSheet('lat-pulldown',{n:6,debug:1})],
 'swap-lat-com':['build','build',0,0,()=>{SC.board=[];SC.note='Lat pulldown swap with the Commercial template ticked.';PREFS_OVR.p={goals:[],bias_muscles:[],favorites:[],gym_profile:RD.rules.equipment_items.example_profiles.commercial}},()=>swapSheet('lat-pulldown',{n:6,debug:1})],
 'swap-a':['build','build',0,0,()=>{SC.day='mon';SC.note='Worked example (a): no goals, bias or favorites. PPL intermediate push day.';PREFS_OVR.p={goals:[],bias_muscles:[],favorites:[]}},()=>swapSheet('barbell-bench-press',{n:8,debug:1})],
 'swap-b':['build','build',0,0,()=>{SC.day='mon';SC.note='Worked example (b): Machine Chest Press is a favorite (+0.10, margin 0.10).';PREFS_OVR.p={goals:[],bias_muscles:[],favorites:['machine-chest-press']}},()=>swapSheet('barbell-bench-press',{n:8,debug:1})],
 'swap-c':['build','build',0,0,()=>{SC.day='mon';SC.note='Worked example (c): goal Longevity & joint-friendly.';PREFS_OVR.p={goals:['joint_friendly'],bias_muscles:[],favorites:[]}},()=>swapSheet('barbell-bench-press',{n:8,debug:1})],
 'swap-d':['build','build',0,0,()=>{SC.day='mon';SC.note='Worked example (d): bias upper chest; incline presses count as related pattern.';PREFS_OVR.p={goals:[],bias_muscles:['chest_upper'],favorites:[]}},()=>swapSheet('barbell-bench-press',{n:8,debug:1})],
 log:['log','log'],'log-month':['log','log',0,0,null,monthSheet],'log-edit':['log','log',0,0,null,()=>editSheet(15)],'log-add':['log','log',0,0,()=>{S.logSel=14},()=>editSheet(14)],
 'log-swipe':['log','log',0,0,null,()=>{const r=$$('#view .swipe')[0];r&&r.classList.add('open')}],
 build:['build','build',0,0,()=>{SC.day='mon'}],'build-list':['buildList','build',0,0,()=>{SC.day='mon'}],swap:['build','build',0,0,()=>{SC.day='mon'},()=>swapSheet('barbell-bench-press')],'swap-curl':['build','build',0,0,()=>{SC.day='mon'},()=>swapSheet('ez-bar-curl')],
 settings:['settings','build'],'settings-equip':['settings','build',0,0,null,equipSheet],progress:['progress','progress'],style:['style','build'],
 learn:['learn',''],'tray-fav':['empty','',1,1,()=>{TF.fav=true},traySheet],'settings-favs':['settings','build',0,0,null,()=>{$('#view').scrollTop=$('#favs').offsetTop-60}],'settings-goals':['settings','build',0,0,null,()=>{$('#view').scrollTop=$('#profile').offsetTop-40}],'learn-fundamental':['learnFund',''],
};
const AFTER={train:afterTrain,workout:afterWorkout,finish:afterFinish,log:afterLog,buildList:afterBuildList,progress:afterMap,learn:afterLearn};
let NAV=0;
function go(h){if(location.hash===h)route();else location.hash=h}
function route(){
  let r=(location.hash||'#train').slice(1),def=ROUTES[r],arg=null;
  if(!def&&/^learn-ex-/.test(r)){def=['learnEx',''];arg=r.slice(9)}
  else if(!def&&/^learn-f-/.test(r)){def=['learnFund',''];arg=r.slice(8)}
  else if(!def&&/^learn-/.test(r)){def=['learnMuscle',''];arg=r.slice(6)}
  if(!def){r='train';def=ROUTES.train}
  const [scr,tab,full,sess,pre,post]=def;
  closeAll();if(AF){AF.classList.remove('active');AF=null}
  S.pick=null;S.wheel=0;if(tab)S.tab=tab;
  if(sess)S.session=true;else if(NAV===0)S.session=false;  // a cold-loaded route shows the state it names
  SC={board:BOARDS.ppl,day:'fri',cands:null,note:''};PREFS_OVR.p=null;TF={q:'',type:null,mus:null,eq:null,fav:false,mode:'sug'}; // per-route ranking scenario
  pre&&pre();S.route=r;S.scr=scr;S.arg=arg;NAV++;
  document.body.classList.toggle('full',!!full);document.body.dataset.route=r;
  render();if(post)setTimeout(post,80);
}
function render(){
  const v=$('#view');v.innerHTML=V[S.scr]();v.scrollTop=0;renderTabs();renderBar();
  AFTER[S.scr]&&AFTER[S.scr]();
  if(S.scr==='learnEx')afterLearnEx(S.arg);if(S.scr==='settings')afterSettings();if(S.scr==='learnMuscle')afterLearnMuscle(S.arg);if(S.scr==='learnFund')afterLearnFund(S.arg);
}
// one delegated click handler for the whole app
document.addEventListener('click',e=>{
  const ref=e.target.closest('[data-ref]');if(ref){e.preventDefault();return refSheet(ref.dataset.ref)}
  const fld=e.target.closest('.fld');if(fld&&!fld.classList.contains('demo')){focusField(fld);return}
  const g=e.target.closest('[data-go]'),a=e.target.closest('[data-act]');
  if(a&&(!g||g.contains(a))){const k=a.dataset.act,id=a.dataset.id;
    if(k==='trash'){e.stopPropagation();return trashSheet()}
    if(k==='pick'){const r=ROUTINES.find(x=>x.id===id);if(r.active&&!S.pick)return;S.pick=(S.pick===id||r.active)?null:id;
      $$('.rt').forEach(el=>{const on=S.pick?el.dataset.rt===S.pick:el.classList.contains('act');el.classList.toggle('open',on);el.classList.toggle('closed',!on)});
      if(S.pick)setTimeout(()=>{const el=$(`.rt[data-rt=${S.pick}]`);$('#view').scrollTo({top:el.offsetTop-70,behavior:'smooth'})},280);return}
    if(k==='start'){S.session=true;return go('#workout')}
    if(k==='activate'){const r=ROUTINES.find(x=>x.id===id);ROUTINES.forEach(x=>x.active=false);r.active=true;r.next=0;S.pick=null;ROUTINES.sort((x,y)=>y.active-x.active);render();return toast(`${r.name} is now active`)}
    if(k==='minimize'){S.session=true;return go('#train')}
    if(k==='clock')return clockSheet();if(k==='plates')return plateSheet();if(k==='swap')return swapSheet(id);if(k==='tray')return traySheet();if(k==='equip')return equipSheet();
    if(k==='info'||k==='exinfo')return go('#learn-ex-'+id);if(k==='fav'){e.stopPropagation();return toggleFav(id)}if(k==='back')return NAV>1?history.back():go('#train');
    if(k==='restsheet'){if(!e.target.closest('button'))restSheet();return}
    if(k==='rest-'){WK.rest.left=Math.max(0,WK.rest.left-15);return paintTime()}if(k==='rest+'){WK.rest.left+=15;WK.rest.total=Math.max(WK.rest.total,WK.rest.left);return paintTime()}
    if(k==='skip'){WK.rest.left=0;return paintTime()}
    if(k==='ck'){const r=a.closest('.srow');r.classList.toggle('done');if(r.classList.contains('done')){$$('.fld',r).forEach(f=>{if(!f.value)f.value=f.placeholder;f.classList.remove('auto')});WK.rest.left=WK.rest.total=180;paintTime()}return}
    if(k==='addset'){const blk=a.closest('.exb'),rows=$$('.srow',blk),last=rows[rows.length-1],n=rows.filter(x=>!$('.sn.w',x)).length+1,w=$('[data-kind=w]',last);
      last.insertAdjacentHTML('afterend',setRow({p:''},n));if(w.value){const nw=$('[data-kind=w]',$$('.srow',blk).pop());nw.value=w.value;nw.classList.add('auto')}return}
    if(k==='day'){const d=+a.dataset.d;S.logSel=d;$$('.cd').forEach(c=>c.classList.toggle('sel',+c.dataset.d===d));return editSheet(d)}
    if(k==='edit')return editSheet(+a.dataset.d);if(k==='month')return monthSheet();
    if(k==='mprev'||k==='mnext'){S.month+=k==='mnext'?1:-1;if(S.month<0){S.month=11;S.year--}if(S.month>11){S.month=0;S.year++}return render()}
    if(k==='add')return toast('Added to workout');if(k==='push')return toast('Pushed to Library · v4');
    if(k==='tg'){a.classList.toggle('on');a.setAttribute('aria-checked',a.classList.contains('on'));return}
    if(k==='demo-sheet')return sheet({title:'Shared sheet',body:'<p class="foot" style="padding:4px 20px 30px">Every popup is this one component: grab handle, swipe down or tap outside to close.</p>'});
  }
  if(g){e.preventDefault();return go(g.dataset.go)}
  const sp=e.target.closest('[data-split]');if(sp){S.split=+sp.dataset.split;$$('[data-split]').forEach(b=>b.classList.toggle('on',b===sp));return}
  const gb=e.target.closest('[data-goal]');if(gb){const k=gb.dataset.goal,mx=RD?RD.rules.ranking.goal_combine.max_goals:3;if(!GOALS.includes(k)&&GOALS.length>=mx){toast(`Up to ${mx} goals`);return}GOALS=GOALS.includes(k)?GOALS.filter(x=>x!==k):[...GOALS,k];sv(LSK.goals,GOALS);refreshProfile();return}
  const bb=e.target.closest('[data-bias]');if(bb){BIAS=BIAS.filter(x=>x!==bb.dataset.bias);sv(LSK.bias,BIAS);refreshProfile();return}
  const lv=e.target.closest('[data-lv]');if(lv){$$('[data-lv]').forEach(b=>b.classList.toggle('on',b===lv));$('#lvtx').textContent=LV[lv.dataset.lv];return}
  const wd=e.target.closest('.wd');if(wd&&!e.target.closest('.lbl')){const i=[0,1,3,4].indexOf(+wd.dataset.wd);if(i>=0){S.buildDay=i;render()}return}
  if(KP&&!e.target.closest('.sheet'))KP.close(); // tapping away from fields closes the keypad
});
window.SB={sheet,S,WK,closeAll,get sheets(){return SHEETS},get keypad(){return KP}};
// internals for board.js (the Build whiteboard): same sheet, swap sheet, ranking scenario, muscle map, volume_bands
window.SBX={V,AFTER,ROUTES,ROUTINES,S,sheet,closeAll,toast,go,render,swapSheet,bindSwipes,I,header,bookBtn,gearBtn,CHEV,gl,GLY,EX,ML,exNameP,exSub,whyR,starBtn,isFav,map,vStat,VB,VFILL,VLAB,volLegend,
  get RD(){return RD},prefs:()=>prefs(),setSC:o=>{SC=Object.assign({board:BOARDS.ppl,day:'fri',cands:null,note:''},o)},get SC(){return SC},get NAV(){return NAV}};
window.addEventListener('hashchange',route);
Promise.all([loadVB(),loadRank()]).finally(()=>{startTick();route()}); // first paint after rules.json (volume_bands, ranking) is in
})();
