// Ape-Chit storyboard. Mock data and throwaway glue only: no real training logic.
// One shared bottom sheet (sheet()), one keypad, hash routes for every screen (ROUTES near the bottom).
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const EX={};(window.EXL||[]).forEach(([id,name,type,eq,mus,rat,ut])=>EX[id]={id,name,type,eq,mus,rat:rat||{},ut:ut||null});
// exercises v13: an all-zero muscle map (tibialis-raise) carries untracked_target {label, tag, filter_muscle}; its tag is shown where
// the muscle list would go, and it files under filter_muscle (tray muscle filter, learn link), like swap.py / whiteboard.py
const utOf=id=>{if(EX[id]&&EX[id].ut)return EX[id].ut;try{return ((RD&&RD.EX[id])||{}).untracked_target||null}catch(e){return null}};
const noCredit=e=>!!e&&!Object.values(e.muscles||e.rat||{}).some(v=>v>0);
const ML={chest:'Chest',front_delts:'Front delts',side_delts:'Side delts',rear_delts:'Rear delts',lats:'Lats',upper_back:'Upper back',traps:'Traps',biceps:'Biceps',triceps:'Triceps',forearms:'Forearms',abs:'Abs',quads:'Quads',hamstrings:'Hamstrings',glutes:'Glutes',calves:'Calves',adductors:'Adductors',lower_back:'Lower back',obliques:'Obliques',abductors:'Abductors',brachialis:'Brachialis'};
// Exercise type is SHAPE-coded (colour already means body region): star = primary, triangle = accessory, circle = isolation.
const GLY={primary:'★',accessory:'▲',isolation:'●'};
const exNameP=id=>(EX[id]||{}).name||id;
const exName=id=>exNameP(id)+(typeof isFav==='function'&&isFav(id)?' <span class="fv" aria-label="Favorite">★</span>':'');
const exSub=id=>{const e=EX[id];if(!e)return '';if(!e.mus.length&&utOf(id))return utOf(id).tag;return e.mus.slice(0,3).map(m=>ML[m]||m).join(' · ')}; // top 3 (v13 data rates more muscles >= 0.5; the row stays two lines)
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
 more:'<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
 note:'<path d="M5 4.5h10.5L19 8v11.5H5z"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
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
const WK={title:'Upper A',sub:'Upper / Lower · Day 1',ref:{rid:'ul',di:0},notes:{},rest:{left:108,total:180},ex:[
 {id:'barbell-bench-press',bar:true,cue:'Last time <b>225 × 8, 8, 7</b> · Try <b>230 × 6–8</b>',sets:[
   {p:'135 × 8',warm:true,done:true,wv:'135',rv:'8'},{p:'225 × 8',done:true,wv:'230',rv:'8'},{p:'225 × 8',done:true,wv:'230',rv:'7'},{p:'225 × 7'}]},
 {id:'barbell-row',bar:true,cue:'Last time <b>185 × 10, 10, 9</b>',sets:[{p:'185 × 10'},{p:'185 × 10'},{p:'185 × 9'}]},
 {id:'seated-dumbbell-shoulder-press',cue:'Last time <b>60 × 9, 8, 8</b>',sets:[{p:'60 × 9'},{p:'60 × 8'},{p:'60 × 8'}]},
 {id:'lat-pulldown',cue:'Last time <b>150 × 12, 11, 10</b>',sets:[{p:'150 × 12'},{p:'150 × 11'},{p:'150 × 10'}]},
 {id:'ez-bar-curl',bar:true,cue:'Last time <b>80 × 12, 10</b>',sets:[{p:'80 × 12'},{p:'80 × 10'}]},
 {id:'triceps-pushdown',cue:'Last time <b>70 × 12, 12</b>',sets:[{p:'70 × 12'},{p:'70 × 12'}]}]};
// SESSION CLOCK: elapsed is derived from the start time (not a counter), so it reads 0:00 the moment a workout starts and
// never carries a stale value from page load. The cold-loaded #workout routes show a mid-workout DEMO (32:14 in, 3 sets done).
const CLK={start:Date.now(),pausedAt:null,pausedMs:0};
Object.defineProperty(WK,'elapsed',{get(){const now=CLK.pausedAt??Date.now();return Math.max(0,Math.floor((now-CLK.start-CLK.pausedMs)/1000))},
  set(v){const now=CLK.pausedAt??Date.now();CLK.start=now-CLK.pausedMs-v*1000}});
Object.defineProperty(WK,'paused',{get(){return CLK.pausedAt!=null},set(p){if(p&&CLK.pausedAt==null)CLK.pausedAt=Date.now();else if(!p&&CLK.pausedAt!=null){CLK.pausedMs+=Date.now()-CLK.pausedAt;CLK.pausedAt=null}}});
const WK0=JSON.parse(JSON.stringify({title:WK.title,sub:WK.sub,ref:WK.ref,ex:WK.ex}));
function resetClock(sec){CLK.start=Date.now()-sec*1000;CLK.pausedAt=null;CLK.pausedMs=0}
function demoWorkout(){Object.assign(WK,JSON.parse(JSON.stringify(WK0)),{notes:{},empty:false,restLab:'Bench set 3'});applyOrder();WK.rest={left:108,total:180};resetClock(32*60+14);S.demo=true}
// start a real workout: clock at 0:00, no sets done, no rest running, session notes empty
function startWorkout(title,list,o={}){const prev={};WK0.ex.forEach(x=>prev[x.id]=x);
  WK.title=title;WK.sub=o.sub||'';WK.ref=o.ref||null;WK.empty=!!o.empty;WK.notes={};WK.rest={left:0,total:180};
  WK.ex=list.map(e=>{const p=prev[e.id],eq=((EX[e.id]||{}).eq)||'';const ps=p?p.sets.filter(s=>!s.warm).map(s=>s.p):[];
    return {id:e.id,bar:/barbell|trap bar|smith/.test(eq)||/ez-bar/.test(e.id),cue:p?p.cue:'',sets:Array.from({length:e.sets||e.s||3},(_,i)=>({p:ps[i]||ps[ps.length-1]||''}))}});
  applyOrder();resetClock(0);S.live=true;S.demo=false;S.session=true;startTick()} // restart the 1 s tick so the display lands on whole seconds from 0:00
const setsDone=()=>WK.ex.reduce((a,x)=>a+x.sets.filter(s=>s.done).length,0),setsAll=()=>WK.ex.reduce((a,x)=>a+x.sets.length,0);
const clockTime=t=>{const d=new Date(t);let h=d.getHours(),m=d.getMinutes();const ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${String(m).padStart(2,'0')} ${ap}`};
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
// storyboard data loading: only the storyboard's own data/ folder; a fetch aborted by navigation (pagehide) is not an error
const DATA='data/';let UNLOADING=false,RDP=null;addEventListener('pagehide',()=>{UNLOADING=true});addEventListener('pageshow',()=>{UNLOADING=false});
const getJ=u=>fetch(u,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
async function loadVB(){const u=DATA+'rules.json',j=await getJ(u),b=j&&(j.volume_bands||(j.rules||{}).volume_bands);if(b&&typeof b.red_factor==='number'){Object.assign(VB,b,{src:u});return VB}if(!UNLOADING)console.warn('rules.json volume_bands missing: over-volume red disabled');return VB}
const vStat=(n,min,max)=>n<min?'under':VB.red_factor!=null&&n>max*VB.red_factor?'red':n>max?'amber':'in';
const VLAB={under:'Under',in:'In range',amber:'Over max',red:'Well over'};

// units setting (CoS): localStorage apechit.sb.unit, default lb. Progress converts Coach's kg sample log for display.
const UNIT_K='apechit.sb.unit',KG_LB=2.20462262;
// theme (round 2): Settings › Appearance = System (follow prefers-color-scheme) | Light | Dark. Stored in localStorage apechit.sb.theme;
// Light/Dark set html[data-theme], which tokens.css uses to override the system choice. index.html applies it before first paint.
const THEME_K='apechit.sb.theme',THEMES=['system','light','dark'];
const getTheme=()=>{try{const t=localStorage.getItem(THEME_K);return THEMES.includes(t)?t:'system'}catch(e){return 'system'}};
function setTheme(t){t=THEMES.includes(t)?t:'system';try{localStorage.setItem(THEME_K,t)}catch(e){}const h=document.documentElement;if(t==='system')h.removeAttribute('data-theme');else h.setAttribute('data-theme',t);return t}
// Units everywhere (round 2, CoS): fixture loads are lb. In kg they are converted and rounded to that equipment's kg step
// (rules.json logger.load_step.kg[equipment], e.g. barbell 2.5, dumbbell 2); kg typed by the user stays as typed (sets remember s.wu).
const eqOf=id=>((typeof RD!=='undefined'&&RD&&RD.EX[id])||{}).equipment||'default';
const stepOf=(u,id)=>{const t=(typeof RD!=='undefined'&&RD&&RD.rules.logger.load_step[u])||{default:u==='kg'?2.5:5};return t[eqOf(id)]??t.default};
const nfmt=v=>String(+(+v).toFixed(2));
function cvt(v,from,to,id,step){if(v===''||v==null||isNaN(+v)||from===to)return v;const x=from==='lb'?+v/KG_LB:+v*KG_LB,s=step||stepOf(to,id);return nfmt(Math.round(x/s)*s)}
const uw=(v,id,from='lb')=>cvt(v,from,S.unit,id);                       // one load, fixture lb -> current unit
const uP=(p,id)=>p?String(p).replace(/(\d+(?:\.\d+)?)(?= ×)/g,m=>uw(m,id)):p;   // "225 × 8" -> "102.5 × 8"
const uTxt=(t,id)=>S.unit==='lb'||!t?t:String(t).replace(/([+−-]?)(\d[\d,]*(?:\.\d+)?) lb\b/g,(m,sg,n)=>{const v=+n.replace(/,/g,'');return sg+(v>=1000?Math.round(v/KG_LB).toLocaleString('en-US'):uw(v,id))+' kg'}).replace(/(\d+(?:\.\d+)?)(?= ×)/g,m=>uw(m,id));
const isDark=()=>{const t=document.documentElement.getAttribute('data-theme');return t?t==='dark':!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)};
const S={tab:'train',route:'train',session:false,pick:null,day:{},buildDay:0,unit:(()=>{try{return localStorage.getItem('apechit.sb.unit')==='kg'?'kg':'lb'}catch(e){return 'lb'}})(),bar:'Olympic',plate:225,logSel:15,month:9,year:2026,split:1};
const fmt=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
let tick=null;
function startTick(){clearInterval(tick);tick=setInterval(()=>{if(WK.rest.left>0)WK.rest.left--;paintTime()},1000)}
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
    const onBody=e.target.closest('.sh-body')&&body.scrollTop<=0&&!e.target.closest('input,textarea,.wheel,.chips,.noswipe');
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
  AF.value=v;syncField(AF);
  if(AF.dataset.kind==='w')fillLater(AF); // weight fills the later empty sets, in place (no re-render)
}
function fillLater(f){
  const blk=f.closest('.exb');if(!blk)return;const rows=$$('.srow',blk),i=rows.indexOf(f.closest('.srow'));
  rows.slice(i+1).forEach(r=>{const w=$('[data-kind=w]',r);if(!r.classList.contains('done')&&(w.value===''||w.classList.contains('auto'))){w.value=f.value;w.classList.toggle('auto',!!f.value);syncField(w)}});
}

// ---------------------------------------------------------------- swipe-left-to-delete rows
function bindSwipes(root){
  $$('.swipe',root).forEach(row=>{
    if(row._sw)return;row._sw=1;const inner=$(':scope > .in',row);let x0=null,y0=0,dx=0,lock=null;
    row.addEventListener('pointerdown',e=>{if(e.target.closest('.del')||(e.target.closest('.fld')&&!row.dataset.del))return;if(e.target.closest('.swipe')!==row)return;x0=e.clientX;y0=e.clientY;dx=0;lock=null});
    row.addEventListener('pointermove',e=>{if(x0==null)return;const mx=e.clientX-x0,my=e.clientY-y0;
      if(!lock&&(Math.abs(mx)>8||Math.abs(my)>8))lock=Math.abs(mx)>Math.abs(my)?'x':'y';
      if(lock!=='x')return;if(!row.classList.contains('drag')){try{row.setPointerCapture(e.pointerId)}catch(_){}}dx=mx+(row.classList.contains('open')?-88:0);row.classList.add('drag');
      inner.style.transform=`translateX(${Math.min(0,Math.max(-140,dx))}px)`});
    const end=()=>{if(x0==null)return;x0=null;row.classList.remove('drag');inner.style.transform='';
      if(lock==='x'){row.classList.toggle('open',dx<-44);if(dx<-44)$$('.swipe.open').forEach(o=>o!==row&&o.classList.remove('open'));row._justSwiped=Date.now()}};
    row.addEventListener('pointerup',end);row.addEventListener('pointercancel',end);
    row.addEventListener('click',e=>{if(row._justSwiped&&Date.now()-row._justSwiped<300){e.stopPropagation();e.preventDefault()}},true);
    $(':scope > .del',row).addEventListener('click',e=>{e.stopPropagation();if(row.dataset.del&&DEL[row.dataset.del])return DEL[row.dataset.del](row);row.style.transition='height .28s var(--ease),opacity .2s';row.style.height=row.offsetHeight+'px';
      requestAnimationFrame(()=>{row.style.height='0';row.style.opacity='0'});setTimeout(()=>row.remove(),300);toast('Deleted · Undo')});
  });
}
// undo snackbar for the workout screen (Build has its own in board.js)
let SUT=null,SUF=null;function undoSnack(t,fn){let u=$('#sundo');if(!u){u=document.createElement('div');u.id='sundo';u.className='bundo';$('#app').appendChild(u)}
  SUF=fn;u.innerHTML=`<span>${t}</span><button data-act="sundo">Undo</button>`;u.classList.add('on');clearTimeout(SUT);SUT=setTimeout(hideSnack,6000)}
function hideSnack(){const u=$('#sundo');if(u)u.classList.remove('on');SUF=null}
let tt;function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),1800)}

// ---------------------------------------------------------------- tab bar + floating workout bar
// Recommended 4 tabs: Train · Log · Build · Progress. Settings = gear on Build; Learn = book icon in headers.
const TABS=[['build','Build'],['train','Train'],['log','Log'],['progress','Progress']]; // Build leftmost (markup round 1)
function renderTabs(){$('#tabs').innerHTML=TABS.map(([k,l])=>`<button data-go="#${k}" class="${S.tab===k?'on':''}" aria-label="${l}">${I(k,1.7)}<span>${l}</span></button>`).join('')}
function renderBar(){
  const show=S.session&&!document.body.classList.contains('full');document.body.classList.toggle('has-bar',show);
  $('#wbar-slot').innerHTML=show?`<div class="wbar" data-go="#workout" role="button" aria-label="Return to workout">
    <span class="live"></span><div class="main"><div class="n">${WK.title}</div><div class="s"><span data-el>${fmt(WK.elapsed)}</span> · ${setsDone()} of ${setsAll()} sets</div></div>
    <div class="rst"><div class="k">Rest</div><div class="v" data-rest>${fmt(WK.rest.left)}</div></div>
    <button class="tr" data-act="trash" aria-label="Discard or resume">${I('trash',1.7)}</button>
    <i class="line" data-line style="transform:scaleX(${WK.rest.left/WK.rest.total})"></i></div>`:'';
}
function trashSheet(){
  const s=sheet({body:`<div class="act-sheet"><div class="as-ico">${I('trash',1.7)}</div><h3>Discard this workout?</h3>
    <p>${WK.title} · ${Math.round(WK.elapsed/60)} min · ${setsDone()} set${setsDone()===1?'':'s'} logged. Discarding deletes it; nothing is saved to your Log.</p>
    <button class="btn block danger-fill" data-x="discard">Discard workout</button><button class="btn block grey" data-x="resume">Resume workout</button></div>`});
  s.el.addEventListener('click',e=>{const a=e.target.closest('[data-x]');if(!a)return;s.close();
    if(a.dataset.x==='discard'){S.session=false;S.live=false;S.demo=false;renderBar();toast('Workout discarded')}else go('#workout')});
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
// Set rows swipe left to delete ONLY that set (Undo). The exercise is deleted from its ⋯ menu or by swiping its header.
const esc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function setRow(s,i,xi,si){const id=(WK.ex[xi]||{}).id,p=uP(s.p,id),wv=s.wv?cvt(s.wv,s.wu||'lb',S.unit,id):'';
  return `<div class="swipe sws" data-del="set" data-xi="${xi}" data-si="${si}"><button class="del">Delete</button><div class="in"><div class="srow sgrid ${s.done?'done':''}" data-xi="${xi}" data-si="${si}"><div class="sn ${s.warm?'w':''}">${s.warm?'W':i}</div><div class="prev">${p||'—'}</div>
    <input class="fld ${s.wauto?'auto':''}" data-kind="w" readonly inputmode="none" value="${wv}" placeholder="${(p||'').split(' × ')[0]}" aria-label="Weight (${S.unit})">
    <input class="fld" data-kind="r" readonly inputmode="none" value="${s.rv||''}" placeholder="${(p||'').split(' × ')[1]||''}" aria-label="Reps">
    <button class="ck" data-act="ck" aria-label="Done">${I('check',2.4)}</button></div></div></div>`;
}
// per-exercise notes: "Always" (saved on this device, shown every time) and "This session" (this workout only)
const LSN='apechit.sb.exNotes';
const noteA=id=>(ld(LSN,{})[id]||''),noteS=id=>(WK.notes[id]||'');
function notesHtml(id,xi){const a=noteA(id),s=noteS(id);if(!a&&!s)return '';
  return `<button class="exnotes" data-act="notes" data-xi="${xi}" aria-label="Edit notes">${a?`<span class="exn al"><b>Always</b>${esc(a)}</span>`:''}${s?`<span class="exn ss"><b>This session</b>${esc(s)}</span>`:''}</button>`}
function exBlock(ex,xi){
  let n=0;
  return `<section class="exb" data-ex="${ex.id}" data-xi="${xi}">
   <div class="swipe swh" data-del="ex" data-xi="${xi}"><button class="del">Delete</button><div class="in"><div class="exh"><button class="exgrip" aria-label="Reorder ${esc(exNameP(ex.id))}: press and hold, then drag" title="Hold to reorder">${I('grip',2)}</button>${gl(ex.id)}<button class="grow exnm" data-act="info" data-id="${ex.id}" aria-label="Learn about ${exNameP(ex.id)}"><div class="nm">${exName(ex.id)}</div><div class="mu">${exSub(ex.id)}</div></button>
    <button class="mini" data-act="notes" data-xi="${xi}" aria-label="Notes">${I('note',1.7)}</button>
    ${ex.bar?`<button class="mini" data-act="plates" data-xi="${xi}" aria-label="Plate calculator">${I('plate',1.6)}</button>`:''}
    <button class="mini" data-act="wswap" data-xi="${xi}" data-id="${ex.id}" aria-label="Swap">${I('swap',1.7)}</button>
    <button class="mini" data-act="exmenu" data-xi="${xi}" aria-label="More">${I('more',1.7)}</button></div></div></div>
   ${notesHtml(ex.id,xi)}
   ${ex.cue?`<div class="cue">${uTxt(ex.cue,ex.id)}</div>`:''}
   <div class="sgrid shd"><div>Set</div><div>Previous</div><div>${S.unit}</div><div>Reps</div><div></div></div>
   <div class="sets">${ex.sets.map((s,si)=>setRow(s,s.warm?0:++n,xi,si)).join('')}</div>
   <button class="addset" data-act="addset" data-xi="${xi}">${I('plus',2)} Add set</button></section>`;
}
const restBox=()=>`<div class="rest" data-act="restsheet"><div class="rl"><div class="rlb">${WK.rest.left>0?'Rest · '+(WK.restLab||''):'Rest · starts when you tick a set'}</div><div class="tm" data-rest>${fmt(WK.rest.left)}</div></div>
  <button data-act="rest-">−15</button><button data-act="rest+">+15</button><button data-act="skip">Skip</button><i class="line" data-line style="transform:scaleX(${WK.rest.left/WK.rest.total})"></i></div>`;
V.workout=()=>`<div class="wk-nav"><div class="wk-top"><button class="ibtn flat" data-act="minimize" aria-label="Minimize">${I('chevD',2)}</button>
   <button class="clock ${WK.paused?'paused':''}" data-act="clock">${I(WK.paused?'pause':'clock',2)}<span data-el>${fmt(WK.elapsed)}</span></button>
   <button class="btn accent sm" data-go="#finish">Finish</button></div>${restBox()}</div>
  <div class="wk-title"><div class="eyebrow">${WK.sub||'Started '+clockTime(CLK.start)}</div><h1>${WK.title}</h1></div>
  <div id="wkx">${WK.ex.map(exBlock).join('')}</div>
  <button class="btn grey block addex" data-act="tray">${I('plus',2)} Add exercise</button>`;
function afterWorkout(){bindSwipes($('#view'))}
function renderWk(){const x=$('#wkx');if(!x)return;x.innerHTML=WK.ex.map(exBlock).join('');bindSwipes(x);renderBar()}
function renderEx(xi){const old=$(`.exb[data-xi="${xi}"]`);if(!old)return renderWk();const t=document.createElement('div');t.innerHTML=exBlock(WK.ex[xi],xi);old.replaceWith(t.firstElementChild);bindSwipes($(`.exb[data-xi="${xi}"]`));renderBar()}
// keep typed values in the workout model, so a re-render (delete, undo, swap) never loses them
function syncField(f){const r=f.closest('.srow');if(!r||r.dataset.xi==null)return;const s=((WK.ex[+r.dataset.xi]||{}).sets||[])[+r.dataset.si];if(!s)return;
  if(f.dataset.kind==='w'){s.wv=f.value;s.wu=S.unit;s.wauto=f.classList.contains('auto')}else s.rv=f.value}
const DEL={
 set(row){const xi=+row.dataset.xi,si=+row.dataset.si,ex=WK.ex[xi];if(!ex)return;const [s]=ex.sets.splice(si,1);
   const lab=s.warm?'Warm-up set':'Set '+(ex.sets.slice(0,si).filter(x=>!x.warm).length+1);
   row.style.transition='height .26s var(--ease),opacity .2s';row.style.height=row.offsetHeight+'px';requestAnimationFrame(()=>{row.style.height='0';row.style.opacity='0'});
   setTimeout(()=>renderEx(xi),270);undoSnack(`${lab} of ${exNameP(ex.id)} deleted`,()=>{ex.sets.splice(si,0,s);renderEx(xi)})},
 ex(row){delEx(+row.dataset.xi)}};
// 5. Reorder mid-workout (round 2): press and hold the grip (280 ms, works with touch: the grip has touch-action:none), the
// blocks collapse to their headers, drag to the new place, release. The order is saved for this workout (WK.ex) and in
// localStorage apechit.sb.wkOrder keyed by the routine day, so a reload or the next start of the same day keeps it.
const LSO='apechit.sb.wkOrder',HOLD_MS=280;
const orderKey=()=>WK.ref?`${WK.ref.rid}:${WK.ref.di}`:'empty';
function saveOrder(){const o=ld(LSO,{});o[orderKey()]=WK.ex.map(x=>x.id);sv(LSO,o)}
function applyOrder(){const ids=ld(LSO,{})[orderKey()];if(!Array.isArray(ids))return;const pos=id=>{const i=ids.indexOf(id);return i<0?1e3:i};
  WK.ex=WK.ex.map((x,k)=>[x,k]).sort((a,b)=>(pos(a[0].id)-pos(b[0].id))||(a[1]-b[1])).map(p=>p[0])}
function moveEx(from,to){to=Math.max(0,Math.min(WK.ex.length-1,to));if(from===to)return false;const [x]=WK.ex.splice(from,1);WK.ex.splice(to,0,x);saveOrder();renderWk();return true}
let REO=null;
document.addEventListener('pointerdown',e=>{const h=e.target.closest&&e.target.closest('.exgrip');if(!h)return;e.stopPropagation();e.preventDefault();
  const blk=h.closest('.exb'),x0=e.clientX,y0=e.clientY;let lifted=false,t=setTimeout(lift,HOLD_MS),st=null;
  try{h.setPointerCapture(e.pointerId)}catch(_){}
  function lift(){lifted=true;const v=$('#view'),before=blk.getBoundingClientRect().top;document.body.classList.add('wk-reorder');blk.classList.add('lifting');
    const r=blk.getBoundingClientRect();v.scrollTop+=r.top-before;  // keep the grabbed header under the finger after the collapse
    const bs=$$('#wkx .exb'),R=bs.map(b=>b.getBoundingClientRect()),i=bs.indexOf(blk),P=bs.length>1?(R[1].top-R[0].top):r.height;
    st={bs,i,P,y:e.clientY};if(navigator.vibrate)try{navigator.vibrate(10)}catch(_){}}
  const tgt=ev=>Math.max(-st.i,Math.min(st.bs.length-1-st.i,Math.round((ev.clientY-st.y)/st.P)));
  const mv=ev=>{if(!lifted){if(Math.hypot(ev.clientX-x0,ev.clientY-y0)>8){clearTimeout(t);end()}return}ev.preventDefault();
    const dy=ev.clientY-st.y,n=tgt(ev);blk.style.transform=`translateY(${dy}px) scale(1.02)`;
    st.bs.forEach((b,j)=>{if(b===blk)return;b.style.transform=(n>0&&j>st.i&&j<=st.i+n)?`translateY(${-st.P}px)`:(n<0&&j<st.i&&j>=st.i+n)?`translateY(${st.P}px)`:''})};
  const end=ev=>{clearTimeout(t);removeEventListener('pointermove',mv,true);removeEventListener('pointerup',up,true);removeEventListener('pointercancel',cancel,true);REO=null;
    if(!lifted)return;const n=ev?tgt(ev):0;document.body.classList.remove('wk-reorder');st.bs.forEach(b=>{b.style.transform='';b.classList.remove('lifting')});
    const name=exNameP(WK.ex[st.i].id);if(moveEx(st.i,st.i+n))toast(`${name} moved · order saved`);else renderWk()};
  const up=ev=>end(ev),cancel=()=>end(null);
  addEventListener('pointermove',mv,{capture:true,passive:false});addEventListener('pointerup',up,true);addEventListener('pointercancel',cancel,true);REO={end}},true);
// a plain tap on the grip explains the gesture; the ⋯ menu has Move up / Move down for one-handed and assistive use
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.exgrip')){e.stopPropagation();e.preventDefault();toast('Hold, then drag to reorder')}},true);
function delEx(xi){const ex=WK.ex[xi];if(!ex)return;WK.ex.splice(xi,1);renderWk();undoSnack(`${exNameP(ex.id)} removed`,()=>{WK.ex.splice(xi,0,ex);renderWk()})}
function exMenu(xi){const ex=WK.ex[xi];if(!ex)return;
  const s=sheet({title:exNameP(ex.id),cls:'grouped',body:`<div class="group"><button class="row" data-x="notes"><span class="ico gr">${I('note',1.7)}</span><div class="grow t1">Notes</div>${CHEV}</button>
    <button class="row" data-x="swap"><span class="ico gr">${I('swap',1.7)}</span><div class="grow t1">Swap exercise</div>${CHEV}</button>
    <button class="row" data-x="info"><span class="ico gr">${I('info',1.7)}</span><div class="grow t1">About this exercise</div>${CHEV}</button></div>
    <div class="group" style="margin-top:20px"><button class="row" data-x="up"${xi===0?' disabled':''}><span class="ico gr">${I('up',2)}</span><div class="grow t1">Move up</div></button>
    <button class="row" data-x="down"${xi===WK.ex.length-1?' disabled':''}><span class="ico gr mdown">${I('up',2)}</span><div class="grow t1">Move down</div></button></div>
    <div class="group" style="margin-top:20px"><button class="row dangerrow" data-x="del">Delete exercise</button></div>
    <p class="foot">Delete removes ${exNameP(ex.id)} and its ${ex.sets.length} sets from this workout. You can undo. To delete one set, swipe it left.</p>`});
  s.el.addEventListener('click',e=>{const a=e.target.closest('[data-x]');if(!a)return;s.close();const k=a.dataset.x;
    if(k==='del')delEx(xi);if(k==='notes')setTimeout(()=>notesSheet(xi),60);if(k==='swap')setTimeout(()=>wSwap(xi),60);if(k==='info')go('#learn-ex-'+ex.id);if(k==='up'||k==='down'){if(moveEx(xi,xi+(k==='up'?-1:1)))toast(`${exNameP(ex.id)} moved ${k} · order saved`)}});return s}
function notesSheet(xi){const ex=WK.ex[xi];if(!ex)return;const id=ex.id;
  const s=sheet({title:'Notes',cls:'grouped nsheet',right:`<button class="btn plain strong" data-x="close">Done</button>`,body:`<div class="nsh-h">${gl(id)}<b>${exNameP(id)}</b></div>
    <div class="ghead">Always <span class="gsub">shown every time you do this exercise</span></div>
    <div class="group"><textarea id="nta" class="nta" rows="2" maxlength="200" placeholder="e.g. Seat on notch 4 · pause 1 s at the chest">${esc(noteA(id))}</textarea></div>
    <div class="ghead">This session <span class="gsub">only for today's workout</span></div>
    <div class="group"><textarea id="nts" class="nta" rows="2" maxlength="200" placeholder="e.g. Left shoulder tight, kept it lighter">${esc(noteS(id))}</textarea></div>
    <p class="foot">Always notes are saved on this device and come back next time. Session notes stay with this workout.</p>`,
    onClose(){const a=$('#nta',s.el).value.trim(),t=$('#nts',s.el).value.trim(),all=ld(LSN,{});if(a)all[id]=a;else delete all[id];sv(LSN,all);if(t)WK.notes[id]=t;else delete WK.notes[id];if($(`.exb[data-xi="${xi}"]`))renderEx(xi)}});
  s.el.addEventListener('click',e=>{if(e.target.closest('[data-x=close]'))s.close()});return s}
// mid-workout swap: "This workout only" by default; "Also update routine" changes the routine day too
function wSwap(xi){const ex=WK.ex[xi];if(!ex)return;const old=ex.id;
  return swapSheet(old,{workout:true,onPick:(nid,also)=>{ex.id=nid;ex.cue='';ex.bar=/barbell|trap bar|smith/.test((EX[nid]||{}).eq||'')||/ez-bar/.test(nid);ex.sets.forEach(s=>{s.p='';delete s.wauto});
    let upd=false;if(also&&WK.ref){const r=ROUTINES.find(x=>x.id===WK.ref.rid),d=r&&r.days[WK.ref.di],e=d&&d.ex.find(x=>x.id===old);if(e){e.id=nid;upd=true}}
    renderEx(xi);toast(upd?`Swapped · ${(ROUTINES.find(x=>x.id===WK.ref.rid)||{}).name||'routine'} updated too`:'Swapped for this workout only')}})}

// 4. FINISH (round 2 batch B, item 7): everything on this screen is computed from the workout just done (WK's done sets) plus the
// log (LOGH): the session is appended to a copy of the log, then Coach's PR rules (PRS.detect), the e1RM overlay chart, the
// session body map (sesMus) and the comparisons run on that copy. No canned praise: every line is a number from the logs.
// A cold-loaded #finish shows the demo workout completed as last time's targets (the bench sets as already entered).
const FIN_DAY='2026-10-21'; // the storyboard's "today" (Wed, Oct 21; the synthetic log runs to Tue Oct 20)
let FIN=null;
const isoLocal=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return `${FIN_DAY}T${p(d.getHours())}:${p(d.getMinutes())}:00-07:00`};
function finDemoSets(){WK0.ex.forEach(x=>{const w=WK.ex.find(e=>e.id===x.id);if(!w)return;
  w.sets.forEach((s,i)=>{if(s.done)return;const m=/^(\d+(?:\.\d+)?)\s*×\s*(\d+)/.exec(s.p||'');if(!m)return;Object.assign(s,{done:true,wv:m[1],rv:m[2]})})})}
function finBuild(cold){if(cold){Object.assign(WK,JSON.parse(JSON.stringify(WK0)));finDemoSets()}
  const u=S.unit,sid='fin',H=logLoad(),L=v=>v==null||v===''||isNaN(+v)?0:+v,num=(s,id)=>{const v=L(s.wv);return (s.wu||'lb')===u?v:(s.wu||'lb')==='lb'?v/KG_LB:v*KG_LB};
  const st=cold?`${FIN_DAY}T18:12:00-07:00`:isoLocal(CLK.start),min=cold?58:Math.max(1,Math.round(WK.elapsed/60)),en=cold?isoPlus(st,58):isoLocal(Date.now());
  const ses={id:sid,schema:2,status:'completed',date:st,startedAt:st,endedAt:en,unit:u,label:WK.title||'Workout',notes:'',snapshot:{exercises:WK.ex.map(x=>({exerciseId:x.id,sets:x.sets.length}))}},ents=[],sets=[];
  WK.ex.forEach((x,o)=>{const done=x.sets.filter(s=>s.done&&L(s.rv)>0);if(!done.length)return;const eid=`${sid}-e${o}`;ents.push({id:eid,sessionId:sid,order:o,exerciseId:x.id,skipped:false,notes:''});
    done.forEach((s,i)=>sets.push({id:`${eid}-t${i}`,entryId:eid,sessionId:sid,idx:i,kind:s.warm?'warmup':'working',load:+nfmt(num(s,x.id)),reps:L(s.rv),rir:null,done:true}))});
  const X={...H,sessions:[...H.sessions,ses],entries:[...H.entries,...ents],sets:[...H.sets,...sets]};
  return {ses,ents,sets,X,min,cold}}
// run fn with LOGH = the log plus this session (sesMus / e1Chart / entsOf read the global)
function withFin(fn){const keep=LOGH;LOGH=FIN.X;try{return fn()}finally{LOGH=keep}}
const kgOf=(load,unit)=>unit==='kg'?+load:+load/KG_LB,inU=(v,unit)=>unit===S.unit?v:unit==='lb'?v/KG_LB:v*KG_LB;
function finStats(){const F=FIN,H=F.X,u=S.unit,W=F.sets.filter(x=>x.kind==='working'),vol=W.reduce((a,x)=>a+x.load*x.reps,0);
  const prev=H.sessions.filter(s=>s.status==='completed'&&s.id!==F.ses.id&&s.startedAt<F.ses.startedAt).sort((a,b)=>a.startedAt<b.startedAt?-1:1);
  const work=sid=>H.sets.filter(x=>x.sessionId===sid&&x.kind==='working'&&x.done&&x.reps>0);
  const same=prev.filter(s=>s.label===F.ses.label).pop(),volOf=s=>work(s.id).reduce((a,x)=>a+inU(x.load*x.reps,s.unit),0);
  const lastVol=same?volOf(same):null;
  // per exercise: best working set (heaviest load, then most reps) now vs the last logged session that had the exercise
  const best=xs=>xs.slice().sort((a,b)=>b.l-a.l||b.reps-a.reps)[0];
  const cmp=F.ents.map(e=>{const id=e.exerciseId,now=best(W.filter(x=>x.entryId===e.id).map(x=>({l:x.load,reps:x.reps})));if(!now)return null;
    let ps=null,pe=null;for(let i=prev.length-1;i>=0&&!pe;i--){pe=H.entries.find(z=>z.sessionId===prev[i].id&&z.exerciseId===id);if(pe)ps=prev[i]}
    if(!pe)return {id,now,first:true};const was=best(H.sets.filter(x=>x.entryId===pe.id&&x.kind==='working'&&x.done&&x.reps>0).map(x=>({l:+nfmt(inU(+x.load,ps.unit)),reps:x.reps})));
    if(!was)return {id,now,first:true};const step=stepOf(u,id),dl=now.l-was.l;
    const c=Math.abs(dl)>=step/2-1e-9?(dl>0?'up':'down'):now.reps>was.reps?'up':now.reps<was.reps?'down':'flat';
    const txt=Math.abs(dl)>=step/2-1e-9?`${dl>0?'+':'−'}${nfmt(Math.abs(dl))} ${u}`:now.reps!==was.reps?`${now.reps>was.reps?'+':'−'}${Math.abs(now.reps-was.reps)} rep${Math.abs(now.reps-was.reps)>1?'s':''}`:'±0';
    return {id,now,was,c,txt,when:+ps.startedAt.slice(8,10)}}).filter(Boolean);
  // PRs: Coach's rules (logger.prs) over the log with this session added; only records set today
  const P=(window.PRS&&RD)?(PRS.detect(RD,H,{aliases:{}})[F.ses.id]||{}):{};
  // streak: consecutive Monday-start weeks with at least one completed workout, ending with this week
  const wk=iso=>{const d=new Date(iso.slice(0,10)+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return d.toISOString().slice(0,10)};
  const weeks=new Set([...prev,F.ses].map(s=>wk(s.startedAt))),tw=wk(F.ses.startedAt);let streak=0;for(let d=new Date(tw+'T12:00:00');weeks.has(d.toISOString().slice(0,10));d.setDate(d.getDate()-7))streak++;
  const thisWeek=[...prev,F.ses].filter(s=>wk(s.startedAt)===tw).length,plan=(ROUTINES[0]||{days:[]}).days.length;
  return {vol,sets:W.length,lastVol,same,cmp,P,streak,thisWeek,plan,total:prev.length+1}}
const fmtVol=v=>Math.round(v).toLocaleString('en-US');
const dayLong=iso=>{const d=new Date(iso.slice(0,10)+'T12:00:00');return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})};
V.finish=()=>{if(!FIN)FIN=finBuild(true);const F=FIN,T=finStats(),u=S.unit,nPR=Object.keys(T.P).length,up=T.cmp.filter(c=>c.c==='up').length,dn=T.cmp.filter(c=>c.c==='down').length,cmpN=T.cmp.filter(c=>!c.first).length;
  const vp=T.lastVol?(T.vol-T.lastVol)/T.lastVol*100:null,vm=withFin(()=>sesMus(F.ses.id)),role=withFin(()=>sesRole(F.ses.id)),rvm=Object.fromEntries(Object.entries(role).map(([m,k])=>[m,HLV[k]])),mw=Object.entries(vm).sort((a,b)=>b[1]-a[1]);
  // facts only, in this order; each line is skipped when its number is not there
  const facts=[nPR?`${nPR} lift${nPR>1?'s':''} with a PR today.`:'',
    vp!=null?`${Math.abs(vp)<0.05?'Same volume as':`${Math.abs(vp).toFixed(1)}% ${vp>0?'more':'less'} volume than`} your last ${esc(F.ses.label)} (${dayLong(T.same.startedAt)}).`:`First ${esc(F.ses.label)} in your log, so there is nothing to compare the volume with yet.`,
    cmpN?`Matched or beat last time on ${cmpN-dn} of ${cmpN} lift${cmpN>1?'s':''}.`:'',
    T.streak>=2?`${T.streak} weeks in a row with at least one workout.`:'',
    `Workout ${T.thisWeek} this week${T.plan?` (your routine plans ${T.plan})`:''}.`].filter(Boolean);
  const vsCls=vp==null?'':vp>0.05?'up':vp<-0.05?'down':'flat';
  const prRows=Object.entries(T.P).map(([id,rec])=>`<div class="pr" data-ex="${id}"><span class="badge">PR</span><div class="grow"><b>${exNameP(id)}</b><span>${Object.keys(rec).map(k=>PRL[k]).join(' · ')}</span></div></div>`).join('');
  const cards=[`<article class="fc hero" data-card="hero"><div class="fc-logo logo-tile"></div><div class="eyebrow">Workout complete</div><h2>${esc(F.ses.label)}</h2><p class="sub">${hm(F.ses.startedAt)} – ${hm(F.ses.endedAt)}</p>
     <div class="stats"><div><b class="num">${F.min}</b><span>minutes</span></div><div><b class="num">${T.sets}</b><span>sets</span></div><div><b class="num">${fmtVol(T.vol)}</b><span>${u} volume</span></div><div><b class="num acc">${nPR}</b><span>PRs</span></div></div>
     <ul class="facts">${facts.map(f=>`<li>${f}</li>`).join('')}</ul></article>`,
   `<article class="fc" data-card="prs"><div class="eyebrow">Personal records</div><h2>${nPR?`${nPR} lift${nPR>1?'s':''} with a PR`:'No PRs today'}</h2>${prRows||`<p class="sub">No set beat your logged bests by more than Coach's tie margin (half a load step or 1%).</p>`}
     <p class="foot fpad">PR rules from rules.json logger.prs, the same as the Log.</p></article>`,
   `<article class="fc" data-card="vs"><div class="eyebrow">vs last time</div><h2>${cmpN?`Up on ${up} of ${cmpN}`:'Nothing to compare yet'}</h2>
     ${T.cmp.map(c=>`<div class="cmp" data-ex="${c.id}"><div class="grow"><b>${exNameP(c.id)}</b><span class="num">${nfmt(c.now.l)} × ${c.now.reps}${c.first?' · first time logged':` · was ${nfmt(c.was.l)} × ${c.was.reps} on Oct ${c.when}`}</span></div><span class="dl ${c.first?'flat':c.c}">${c.first?'new':c.txt}</span></div>`).join('')}
     <p class="foot fpad">Best working set (heaviest, then most reps) against the last session that had the lift.${T.lastVol!=null?` Volume ${fmtVol(T.vol)} vs ${fmtVol(T.lastVol)} ${u}.`:''}</p></article>`,
   `<article class="fc" data-card="map"><div class="eyebrow">Muscles worked</div><h2>${T.sets} hard sets</h2><div class="mapcard finmap" data-role="${Object.entries(role).map(([m,k])=>m+':'+k).join(' ')}"><div class="maps">${map('front',rvm)}${map('back',rvm)}</div><div class="legend">${hlLegend()}</div></div>
     ${mw.slice(0,5).map(([m,n])=>`<div class="mw"><span>${ML[m]||m}</span><i style="--w:${Math.min(1,n/Math.max(1,mw[0][1]))*100}%"></i><b class="num">${+n.toFixed(1)}</b></div>`).join('')}
     <p class="foot fpad">Map: each muscle's biggest role in today's exercises. Bars: effective sets, the same model as Build's Day map (helper muscles count as partial sets).</p></article>`,
   `<article class="fc" data-card="e1"><div class="eyebrow">Strength trend</div><h2>e1RM vs your best</h2>${withFin(()=>e1Chart(F.ses.id))}</article>`,
   `<article class="fc ape" data-card="ape"><div class="ape-slot"><div class="logo-tile"></div></div><div class="eyebrow">Ape says</div><h2>Ape humor goes here</h2>
     <p class="sub">Placeholder card. The lines come later. Hidden when Settings › Ape humor is off.</p></article>`];
  return `<div class="fin" data-vs="${vsCls}">
  <div class="fin-top"><span class="eyebrow">${dayLong(F.ses.startedAt)}</span><button class="btn plain" data-go="#log">Done</button></div>
  <div class="fin-cards noswipe" id="fincards">${cards.join('')}</div><div class="pdots fin-dots">${cards.map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div>
  <div class="fin-act"><button class="btn ink block" data-go="#log">Save to Log</button></div></div>`};
function afterFinish(){const c=$('#fincards');c.addEventListener('scroll',()=>{const i=Math.round(c.scrollLeft/(c.children[0].offsetWidth+12));$$('.fin-dots i').forEach((d,j)=>d.classList.toggle('on',j===i))},{passive:true});}

// 5. EMPTY WORKOUT + exercise tray
const GAPS=[['side_delts',8,14,'cable-lateral-raise'],['lats',14,16,'lat-pulldown'],['calves',8,10,'seated-calf-raise'],['abs',6,8,'cable-crunch']];
const CROSS=[['Chest','cable-fly'],['Back','seated-cable-row'],['Shoulders','dumbbell-lateral-raise'],['Arms','hammer-curl'],['Legs','leg-extension'],['Core','hanging-leg-raise']];
V.empty=()=>`<div class="wk-nav"><div class="wk-top"><button class="ibtn flat" data-go="#train" aria-label="Close">${I('chevD',2)}</button>
   <button class="clock" data-act="clock">${I('clock',2)}<span data-el>${fmt(WK.elapsed)}</span></button><button class="btn accent sm" data-go="#finish">Finish</button></div></div>
  <div class="wk-title"><div class="eyebrow">Started ${clockTime(CLK.start)}</div><h1>Empty workout</h1></div>
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
let TF={q:'',mus:null,pat:null,eq:null,fav:false,mode:'sug'};   // mode: 'sug' (Suggested, default) | 'lib' (Library order)
// ---- tray filters: three compact wrapping rows (Muscle, Movement pattern, Equipment) + Reset; no horizontal scrolling.
// MOVEMENT PATTERN: Coach's field exercises[].movement_pattern; labels and order from rules.json movement_patterns.
// The row renders whatever values the data contains (new ones such as core / carry appear with no code change).
// Every exercise carries movement_pattern (exercises.json v12); a custom exercise without one counts as 'other' (tools/movement.py rule 5).
const movePat=id=>{const e=RD&&RD.EX[id];if(!e)return null;return e.movement_pattern||'other'};
const mpLabelFb=k=>k.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
function mpDefs(){const R=RD&&RD.rules.movement_patterns,pair=x=>typeof x==='string'?[x,null]:[x.id||x.key,x.label||x.name];let L=[];
  if(Array.isArray(R))L=R.map(pair);
  else if(R&&typeof R==='object'){const src=R.patterns||R.items||R.labels||R.values||R,skip=['order','note','notes','description','version'];
    L=Array.isArray(src)?src.map(pair):(Array.isArray(R.order)?R.order:Object.keys(src).filter(k=>!skip.includes(k))).map(k=>{const v=src[k];return [k,typeof v==='string'?v:v&&(v.label||v.name)]})}
  L=L.filter(x=>x[0]).map(([k,l])=>[k,l||mpLabelFb(k)]);
  const present=new Set(Object.keys(RD?RD.EX:{}).map(movePat).filter(Boolean)),out=L.filter(([k])=>present.has(k));
  [...present].filter(k=>!L.some(x=>x[0]===k)).sort().forEach(k=>out.push([k,mpLabelFb(k)]));return out}
const MUS_F=[['chest','Chest'],['lats','Lats'],['upper_back','Upper back'],['traps','Traps'],['front_delts','Front delts'],['side_delts','Side delts'],['rear_delts','Rear delts'],['biceps','Biceps'],['triceps','Triceps'],['quads','Quads'],['hamstrings','Hams'],['glutes','Glutes'],['calves','Calves'],['abs','Abs']];
const EQ_LAB={'smith machine':'Smith','plate-loaded machine':'Plate-loaded'};
// equipment chips: every equipment value with 12+ exercises in the library (most common first), the rest under "Other"
function eqDefs(){const c={};Object.values(RD?RD.EX:{}).forEach(e=>c[e.equipment]=(c[e.equipment]||0)+1);const top=Object.keys(c).filter(k=>c[k]>=12).sort((a,b)=>c[b]-c[a]);
  return [...top.map(k=>[k,EQ_LAB[k]||k[0].toUpperCase()+k.slice(1)]),...(Object.keys(c).length>top.length?[['other','Other']]:[])]}
function passF(F,id){const e=RD&&RD.EX[id];if(!e)return false;
  if(F.mus&&!((e.muscles[F.mus]||0)>=0.5)&&!(noCredit(e)&&e.untracked_target&&e.untracked_target.filter_muscle===F.mus))return false;if(F.pat&&movePat(id)!==F.pat)return false;
  if(F.eq){const top=eqDefs().map(x=>x[0]).filter(x=>x!=='other');if(F.eq==='other'?top.includes(e.equipment):e.equipment!==F.eq)return false}return true}
function filterHtml(F,at){const c=(k,v,l)=>`<button class="chip xs ${F[k]===v?'on':''}" data-${at}="${k}" data-v="${v}">${l}</button>`;
  return `<div class="tfilt noswipe"><div class="tfr" data-row="mus"><span class="tfl">Muscle</span>${MUS_F.map(([m,l])=>c('mus',m,l)).join('')}</div>
   <div class="tfr" data-row="pat"><span class="tfl">Pattern</span>${mpDefs().map(([k,l])=>c('pat',k,l)).join('')}</div>
   <div class="tfr" data-row="eq"><span class="tfl">Equipment</span>${eqDefs().map(([k,l])=>c('eq',k,l)).join('')}</div></div>`}
const anyF=F=>!!(F.mus||F.pat||F.eq||F.fav||F.q);
function trayList(){
  // search + filters are hard filters in both modes; what passes them goes to rank('tray', candidates)
  const ids=EXL.map(x=>x[0]).filter(id=>{const e=EX[id];return e&&(!TF.fav||isFav(id))&&passF(TF,id)&&(!TF.q||e.name.toLowerCase().includes(TF.q.toLowerCase()))});
  const md=sortMode(TF.mode,TF.mus),sug=md==='sug'&&RD,cands=SC.cands?SC.cands.filter(i=>ids.includes(i)):ids;
  const rows=sug?rk('tray',cands,{},null):(RD?sortIds(ids,md,TF.mus):ids).map(id=>({id}));
  const row=r=>{const id=r.id,e=EX[id];return `<div class="row trow" data-id="${id}">${gl(id)}<div class="grow"><div class="t1">${exNameP(id)}${isFav(id)?' <span class="fv">★</span>':''}</div><div class="t2">${exSub(id)} · ${e.eq}</div>${r.reasons?whyR(r):''}</div>${starBtn(id)}<button class="ib-i" data-act="exinfo" data-id="${id}" aria-label="Info">${I('info',1.7)}</button><button class="addc" data-act="add" aria-label="Add">${I('plus',2.2)}</button></div>`};
  const hid=sug?cands.length-rows.length:0;
  return `<div class="tcount">${rows.length} exercises${sug?` · ranked for ${({mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'})[SC.day]||'today'}${hid?` · ${hid} hidden (on this day or not in your gym)`:''}`:` · ${sortNote(md,TF.mus)}`}</div>${SC.note?`<div class="scnote">${SC.note}</div>`:''}<div class="group">`+rows.slice(0,80).map(row).join('')+'</div>';
}
function traySheet(){
  const s=sheet({title:'Add exercise',cls:'tall grouped',right:`<button class="btn plain" data-x="close">Done</button>`,
    body:`<div class="srch"><span>${I('search',2)}</span><input id="tq" type="search" placeholder="Search 239 exercises" autocomplete="off"></div>
    <div id="tmode">${sortHtml(TF.mode,TF.mus,'m')}</div>
    <div class="tftop"><button class="chip xs ${TF.fav?'on':''}" data-f="fav" data-v="true"><span class="fv">★</span> Favorites</button><button class="btn plain sm treset" data-x="reset" ${anyF(TF)?'':'disabled'}>Reset</button></div>
    <div id="tfb">${filterHtml(TF,'f')}</div>
    <div class="tlist">${trayList()}</div>`});
  const upd=()=>{$('.tlist',s.el).innerHTML=trayList();$('[data-x=reset]',s.el).disabled=!anyF(TF);$('#tmode',s.el).innerHTML=sortHtml(TF.mode,TF.mus,'m')};
  s.el.addEventListener('click',e=>{const md=e.target.closest('#tmode [data-m]');if(md){if(md.disabled)return;TF.mode=md.dataset.m;upd();return}
    const inf=e.target.closest('[data-act=exinfo]');if(inf){e.preventDefault();e.stopPropagation();return exDetail(inf.dataset.id,{onAdd:()=>toast('Added to workout')})}
    const tr=e.target.closest('.trow[data-id]');if(tr&&!e.target.closest('button')){return exDetail(tr.dataset.id,{onAdd:()=>toast('Added to workout')})}
    const f=e.target.closest('[data-f]');if(f){if(f.dataset.f==='fav'){TF.fav=!TF.fav;f.classList.toggle('on',TF.fav);upd();return}TF[f.dataset.f]=TF[f.dataset.f]===f.dataset.v?null:f.dataset.v;
      $$(`[data-f=${f.dataset.f}]`,s.el).forEach(c=>c.classList.toggle('on',TF[c.dataset.f]===c.dataset.v));upd();return}
    if(e.target.closest('[data-x=reset]')){Object.assign(TF,{q:'',mus:null,pat:null,eq:null,fav:false});$('#tq',s.el).value='';$('#tfb',s.el).innerHTML=filterHtml(TF,'f');$('[data-f=fav]',s.el).classList.remove('on');upd();return}
    if(e.target.closest('[data-x=close]'))s.close()});
  $('#tq',s.el).addEventListener('input',e=>{TF.q=e.target.value;upd()});
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
// ---- 6b. Log data (round 2): ONE history in Coach's logger shape (sessions / entries / sets, loads in each session's unit).
// Generated from the Oct fixture (LOGS0 + routine days) the first time, then saved to localStorage apechit.sb.log.v1 on any edit.
// PRs = logic/prs.js (port of Coach's prs.py detect_prs, diffed in test/prs.diff.js) over the whole history, recomputed after every edit.
const LOG_K='apechit.sb.log.v1',LOGS0=JSON.parse(JSON.stringify(LOGS));
const LOGFIX={'barbell-bench-press':[225,[8,8,7,7]],'barbell-row':[185,[10,10,9]],'seated-dumbbell-shoulder-press':[60,[9,8,8]],'lat-pulldown':[150,[12,11,10]],'ez-bar-curl':[80,[12,10]],'triceps-pushdown':[70,[12,12]],
 'back-squat':[265,[6,6,5,5]],'romanian-deadlift':[215,[9,9,8]],'leg-press':[380,[12,11,10]],'lying-leg-curl':[95,[12,11,10]],'standing-calf-raise':[190,[14,13,12,12]],
 'incline-dumbbell-press':[70,[10,9,8]],'chest-supported-row':[130,[10,9,9]],'pull-up':[0,[9,8,7]],'cable-lateral-raise':[20,[15,13,12]],'incline-dumbbell-curl':[30,[11,10]],'overhead-cable-triceps-extension':[55,[12,11]],
 'deadlift':[335,[5,5,4]],'hack-squat':[250,[10,9,8]],'bulgarian-split-squat':[45,[10,9,8]],'seated-leg-curl':[105,[12,11,10]],'hanging-leg-raise':[0,[14,12,11]]};
const LOGNOTE={8:'Short on sleep, kept every set at RIR 2.',12:'Gym busy, did the rows before the presses.',15:'Bench felt strong. Left shoulder fine after the warm-up.',16:'Squat depth looked good on video.',20:'Calves cramped on the last set.'};
const LOGSTART={1:'18:05',2:'18:20',5:'07:10',6:'18:12',8:'18:12',9:'18:30',12:'07:05',13:'18:15',15:'18:12',16:'18:25',19:'07:00',20:'18:10'};
const isoPlus=(st,min)=>new Date(Date.parse(st)+min*6e4-7*36e5).toISOString().slice(0,16)+':00-07:00'; // Oct 2026 is PDT (UTC-7)
function genLog(){const H={schema:2,sessions:[],entries:[],sets:[],bodyweights:[{date:'2026-10-01',value:182.4,unit:'lb'}]},occ={};
  for(const d of Object.keys(LOGS0).map(Number).sort((a,b)=>a-b)){const w=LOGS0[d],rd=ROUTINES[0].days.find(x=>x.n===w.n);if(!rd)continue;const k=occ[w.n]=(occ[w.n]??-1)+1,sid='s'+d;
    const st=`2026-10-${String(d).padStart(2,'0')}T${LOGSTART[d]||'18:12'}:00-07:00`;
    H.sessions.push({id:sid,schema:2,status:'completed',date:st,startedAt:st,endedAt:isoPlus(st,w.min),unit:'lb',label:w.n,notes:LOGNOTE[d]||'',snapshot:{exercises:rd.ex.map(e=>({exerciseId:e.id,sets:e.s}))}});
    rd.ex.forEach((e,o)=>{const eid=`${sid}-e${o}`,[L,rr]=LOGFIX[e.id]||[50,[10,10,10]],stp=stepOf('lb',e.id),hi=+(String(e.r||'').split('–')[1])||rr[0]+2;
      H.entries.push({id:eid,sessionId:sid,order:o,exerciseId:e.id,skipped:false,notes:''});let idx=0;
      if(o===0&&L>0)H.sets.push({id:`${eid}-t${idx}`,entryId:eid,sessionId:sid,idx:idx++,kind:'warmup',load:Math.round(L*.6/5)*5,reps:8,rir:null,done:true});
      for(let j=0;j<e.s;j++){const r0=rr[Math.min(j,rr.length-1)];H.sets.push({id:`${eid}-t${idx}`,entryId:eid,sessionId:sid,idx:idx++,kind:'working',load:k>=2||L===0?L:L-stp,reps:k===1?Math.min(hi,r0+1):r0,rir:null,done:true})}})}
  return H}
let LOGH=null,LPR={};
function logLoad(){if(!LOGH){const s=ld(LOG_K,null);LOGH=s&&Array.isArray(s.sessions)&&Array.isArray(s.sets)?s:genLog()}logDerive();return LOGH}
const sesDay=s=>+s.startedAt.slice(8,10),sesOf=sid=>LOGH.sessions.find(s=>s.id===sid),entsOf=sid=>LOGH.entries.filter(e=>e.sessionId===sid).sort((a,b)=>a.order-b.order);
const setsOfE=eid=>LOGH.sets.filter(x=>x.entryId===eid).sort((a,b)=>a.idx-b.idx),exOfE=eid=>(LOGH.entries.find(e=>e.id===eid)||{}).exerciseId;
function logDerive(){LPR=(RD&&window.PRS)?PRS.detect(RD,LOGH,{aliases:{}}):{};for(const k of Object.keys(LOGS))delete LOGS[k];
  for(const s of LOGH.sessions){if(s.status!=='completed'||!String(s.startedAt).startsWith('2026-10'))continue;const xs=LOGH.sets.filter(x=>x.sessionId===s.id&&x.kind==='working'&&x.done);
    LOGS[sesDay(s)]={sid:s.id,n:s.label,min:Math.round((Date.parse(s.endedAt)-Date.parse(s.startedAt))/6e4),sets:xs.length,volU:s.unit,vol:xs.reduce((a,x)=>a+(+x.load||0)*x.reps,0),pr:Object.keys(LPR[s.id]||{}).length}}}
const volTxt=w=>{const v=w.volU===S.unit?w.vol:w.volU==='lb'?w.vol/KG_LB:w.vol*KG_LB;return `${Math.round(v).toLocaleString('en-US')} ${S.unit}`};
// sets per muscle in one session: the same effective-set model as Build's Day map (progcheck analytics), shaded with the same ramp
function sesMus(sid){if(!RD||!window.PCHECK)return {};const tiles=entsOf(sid).map(e=>({id:e.exerciseId,sets:setsOfE(e.id).filter(x=>x.kind==='working'&&x.done&&x.reps>0).length})).filter(t=>t.sets&&RD.EX[t.id]);
  if(!tiles.length)return {};const A=PCHECK.analytics(RD,[{day:'mon',tiles}],'intermediate'),o={};for(const [m,v] of Object.entries(A.muscles))if(v.raw>0)o[m]=v.raw;return o}
// each muscle's role in one session: its best level over the exercises done (RD.EX ratings, Coach's buckets), for the Finish map
function sesRole(sid){if(!RD)return {};const o={},rk={main:3,helper:2,minor:1};for(const e of entsOf(sid)){const x=RD.EX[e.exerciseId];if(!x||!setsOfE(e.id).some(s=>s.kind==='working'&&s.done&&s.reps>0))continue;
  for(const [m,r] of Object.entries(x.muscles||{})){const k=hlLevel(r);if(k&&(!o[m]||rk[k]>rk[o[m]]))o[m]=k}}return o}
const RAMPL=r=>!(r>0)?0:r>=5?4:r>=3?3:r>=1.5?2:1,rampFill=r=>{const l=RAMPL(r);return l?`var(--ramp-${l})`:null};
const rampVol=m=>{const o={};for(const [k,v] of Object.entries(m)){const f=rampFill(v);if(f)o[k]=f}return o};
const rampLegend=(t='sets')=>`<span class="mleg mlday"><i style="background:var(--ramp-1)"></i>&lt;1.5<i style="background:var(--ramp-2)"></i>1.5<i style="background:var(--ramp-3)"></i>3<i style="background:var(--ramp-4)"></i>5+ ${t}</span>`;
// mini body map for Log rows: two shared <symbol>s (front/back); each row only sets CSS variables --mm-<muscle>, so 12 rows stay light
function mmSyms(){if($('#mmsyms')||!window.MM)return;const d=document.createElement('div');
  d.innerHTML=`<svg id="mmsyms" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${['front','back'].map(s=>{const m=MM[s],[,,w,h]=m.vb.split(' ');
    return `<symbol id="mm-${s}" viewBox="0 0 ${w} ${h}"><path d="${m.outline.join(' ')}" fill="var(--map-base)"/>${m.m.map(([,reg,dd])=>{const mu=REG2M(reg);return `<path d="${dd}" fill="${mu?`var(--mm-${mu},var(--map-empty))`:'var(--map-base)'}" stroke="var(--paper)" stroke-width="8"/>`}).join('')}</symbol>`}).join('')}</defs></svg>`;
  document.body.appendChild(d.firstChild)}
function miniMap(vol){mmSyms();const st=Object.entries(vol).map(([m,v])=>`--mm-${m}:${v}`).join(';');
  return `<span class="lmini" style="${st}" data-mus="${Object.keys(vol).join(' ')}" aria-hidden="true">${['front','back'].map(s=>`<svg viewBox="${(window.MM&&MM[s].vb)||'0 0 1024 1536'}"><use href="#mm-${s}"/></svg>`).join('')}</span>`}
const logRow=d=>{const w=LOGS[d],dt=new Date(2026,9,d),s=sesOf(w.sid),nt=(s&&s.notes)||'';return `<div class="swipe" data-d="${d}"><button class="del">Delete</button><div class="in">
  <button class="row lrow" data-go="#log-d${d}" data-d="${d}"><div class="ld"><span>${WD[(dt.getDay()+6)%7]}</span><b>${d}</b></div>
   <div class="grow"><div class="t1">${esc(w.n)}${w.pr?` <span class="badge">${w.pr} PR</span>`:''}</div><div class="t2 num">${w.min} min · ${w.sets} sets · ${volTxt(w)}</div>${nt?`<div class="t3 lnote">${esc(nt)}</div>`:''}</div>${miniMap(rampVol(sesMus(w.sid)))}${CHEV}</button></div></div>`};
// ---- Log detail (#log-d<day>): PR badges, body map, e1RM overlay chart, Edit
const PRL={weight:'Weight PR',set_volume:'Volume PR',e1rm:'e1RM PR',reps_at_load:'Rep PR'};
const hm=iso=>{let h=+iso.slice(11,13);const m=iso.slice(14,16),ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${m} ${ap}`};
const showLoad=(v,from,id)=>v===''||v==null?'—':cvt(+v,from,S.unit,id);
const kgShow=kg=>S.unit==='kg'?kg:kg*KG_LB;
// e1RM per session per exercise: best working set with reps <= logger.e1rm_max_reps (10), effective load as prs.py flatten (bodyweight share included)
function e1Table(){const fl=PROGRESS.flatten(Object.assign({},RD,{_lr:undefined,aliases:{}}),LOGH),out=[];
  for(const q of fl){const b={};for(const x of q.sets){const v=PRS.e1rmSet(RD,x.load_kg,x.reps,x.kind);if(v!=null)b[x.ex]=Math.max(b[x.ex]||0,v)}out.push({sid:q.s.id,day:sesDay(q.s),best:b})}return out}
function e1Chart(sid){if(!RD||!window.PRS||!window.PROGRESS)return '<p class="foot">Chart needs the logger rules.</p>';
  const T=e1Table(),vi=T.findIndex(t=>t.sid===sid);if(vi<0)return '';const exs=Object.keys(T[vi].best);if(!exs.length)return '<p class="foot">No sets of 10 reps or fewer with load in this workout.</p>';
  const W=340,H=176,pl=34,pr=10,pt=10,pb=22,days=T.map(t=>t.day),x0=Math.min(...days),x1=Math.max(...days),X=d=>pl+(x1>x0?(d-x0)/(x1-x0):.5)*(W-pl-pr);
  const ser=exs.map((ex,i)=>{const prev=T.slice(0,vi).map(t=>t.best[ex]).filter(v=>v!=null),base=prev.length?Math.max(...prev):T[vi].best[ex];
    return {ex,i,base,pts:T.map(t=>t.best[ex]!=null?{day:t.day,sid:t.sid,v:t.best[ex],p:t.best[ex]/base*100}:null).filter(Boolean)}});
  const all=ser.flatMap(s=>s.pts.map(p=>p.p)),lo=Math.floor(Math.min(90,...all)/5)*5,hi=Math.ceil(Math.max(110,...all)/5)*5,Y=p=>pt+(hi-p)/(hi-lo)*(H-pt-pb);
  const grid=[lo,100,hi].map(p=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(p)}" y2="${Y(p)}" class="${p===100?'g100':'gl'}"/><text x="${pl-4}" y="${Y(p)+3.5}" text-anchor="end">${p}%</text>`).join('');
  const vx=X(T[vi].day),u=S.unit;
  const lines=ser.map(s=>`<g class="ser" style="--c:var(--series-${s.i%6+1})"><polyline points="${s.pts.map(p=>`${X(p.day)},${Y(p.p)}`).join(' ')}"/>${s.pts.map(p=>`<circle class="ept${p.sid===sid?' cur':''}" cx="${X(p.day)}" cy="${Y(p.p)}" r="${p.sid===sid?4.5:3.2}"/><circle class="ehit" cx="${X(p.day)}" cy="${Y(p.p)}" r="12" data-e1="${esc(`${exNameP(s.ex)} · Oct ${p.day}: ${nfmt(kgShow(p.v).toFixed(1))} ${u} e1RM · ${Math.round(p.p)}% of the previous best (${nfmt(kgShow(s.base).toFixed(1))} ${u})`)}" data-ex="${s.ex}" data-day="${p.day}" data-abs="${nfmt(kgShow(p.v).toFixed(1))}" data-unit="${u}"/>`).join('')}</g>`).join('');
  return `<div class="e1c"><svg viewBox="0 0 ${W} ${H}" class="e1svg" role="img" aria-label="Estimated 1RM over time, percent of each exercise's previous best">${grid}
     <line x1="${vx}" x2="${vx}" y1="${pt}" y2="${H-pb}" class="gnow"/>${[...new Set(days)].map(d=>`<text x="${X(d)}" y="${H-6}" text-anchor="middle" class="dx">${d}</text>`).join('')}${lines}</svg>
   <div class="ctip" id="ctip" hidden></div>
   <div class="eleg">${ser.map(s=>`<span><i style="background:var(--series-${s.i%6+1})"></i>${exNameP(s.ex)}</span>`).join('')}</div>
   <p class="foot">Estimated 1RM (load × (1 + reps/30), sets of ${RD.rules.logger.e1rm_max_reps} reps or fewer) as % of that exercise's best before this workout. Tap a point for the value. A model, not a tested max.</p></div>`}
V.logDay=()=>{logLoad();const d=S.logDay,w=LOGS[d],nav=t=>`<div class="nav"><div class="l"><button class="back" data-go="#log">${I('chevL',2.4)}Log</button></div><div class="t">${t}</div><div class="r">${w?`<button class="btn plain strong" data-act="ledit" data-d="${d}">Edit</button>`:''}</div></div>`;
  if(!w)return nav('')+'<p class="foot">No workout on this day.</p>';
  const s=sesOf(w.sid),dt=new Date(2026,9,d),P=LPR[s.id]||{},vm=rampVol(sesMus(s.id)),npr=Object.values(P).reduce((a,t)=>a+Object.keys(t).length,0);
  const exHtml=e=>{const id=e.exerciseId,rec=P[id]||{},badgeSet={};for(const [k,r] of Object.entries(rec))(badgeSet[r.set_id]=badgeSet[r.set_id]||[]).push(k);let n=0;
    return `<div class="ghead gx ldx" data-ex="${id}">${gl(id)}<span class="grow">${exName(id)}</span>${Object.keys(rec).map(k=>`<span class="badge prb" data-pr="${k}">${PRL[k]}</span>`).join('')}</div>
     <div class="group lsets">${setsOfE(e.id).map(x=>`<div class="row lset${badgeSet[x.id]?' haspr':''}"><span class="sn ${x.kind==='warmup'?'w':''}">${x.kind==='warmup'?'W':++n}</span><span class="grow num">${showLoad(x.load,s.unit,id)} ${S.unit} × ${x.reps}</span>${badgeSet[x.id]?`<span class="badge">PR</span>`:''}</div>`).join('')}</div>`};
  return nav(`${WD[(dt.getDay()+6)%7]}, Oct ${d}`)+`<div class="ldh"><h1>${esc(s.label)}</h1><p class="sub">${hm(s.startedAt)} – ${hm(s.endedAt)} · ${w.min} min</p>
    <div class="ldstats"><div><b class="num">${w.sets}</b><span>sets</span></div><div><b class="num">${volTxt(w).split(' ')[0]}</b><span>${S.unit} volume</span></div><div><b class="num acc" title="${npr} PR badges">${w.pr}</b><span>lifts with a PR</span></div></div></div>
   <div class="ghead">Session notes</div><div class="card lnotes">${s.notes?esc(s.notes):`<span class="sub">No notes.</span> <button class="btn plain" data-act="ledit" data-d="${d}">Add</button>`}</div>
   <div class="ghead">Muscles trained</div><div class="card mapcard ldmap"><div class="maps">${map('front',vm)}${map('back',vm)}</div><div class="legend">${rampLegend('sets this workout')}</div></div>
   <div class="ghead">Strength trend</div><div class="card" id="e1card">${e1Chart(s.id)}</div>
   ${entsOf(s.id).map(exHtml).join('')}<p class="foot">PRs follow Coach's rules (logger.prs): the first logged session of an exercise is the baseline, ties within half a load step or 1% are not PRs. Editing a workout recalculates them.</p>`};
function afterLogDay(){}
document.addEventListener('click',e=>{const h=e.target.closest&&e.target.closest('[data-e1]');if(!h)return;const t=$('#ctip');if(!t)return;
  $$('.ept.sel').forEach(c=>c.classList.remove('sel'));const dot=h.previousElementSibling;dot&&dot.classList.add('sel');t.textContent=h.dataset.e1;t.hidden=false;t.dataset.ex=h.dataset.ex;t.dataset.day=h.dataset.day});
function editSheet(d){logLoad();
  const w=LOGS[d],dt=new Date(2026,9,d),lbl=`${WD[(dt.getDay()+6)%7]}, Oct ${d}`;
  if(!w){const a=sheet({title:lbl,body:`<div class="nolog"><div class="nl-ico">${I('log',1.6)}</div><h3>No workout logged</h3><p class="sub">Forgot to log it? Add it now and it counts toward that week.</p>
    <div class="pad"><button class="btn accent block" data-x="add">${I('plus',2)} Add workout for ${lbl}</button></div>
    <div class="ghead">Or copy a routine day</div><div class="group">${ROUTINES[0].days.map(x=>`<button class="row" data-x="add"><div class="grow"><div class="t1">${x.n}</div><div class="t2">${x.ex.length} exercises · ${setsOf(x)} sets</div></div>${CHEV}</button>`).join('')}</div></div>`});
    a.el.addEventListener('click',e=>{if(e.target.closest('[data-x=add]')){a.close();setTimeout(()=>editSheet(15),380)}});return a}
  const s=sesOf(w.sid);
  const srow=(i,x,id)=>`<div class="swipe"><button class="del">Delete</button><div class="in"><div class="row er" data-kind="${x.kind}"><span class="sn">${x.kind==='warmup'?'W':i}</span>
        <input class="fld" data-kind="w" readonly inputmode="none" value="${x.load===''?'':showLoad(x.load,s.unit,id)}" placeholder="—" aria-label="Weight (${S.unit})"><span class="x">${S.unit}</span><span class="x">×</span><input class="fld" data-kind="r" readonly inputmode="none" value="${x.reps===''?'':x.reps}" placeholder="—" aria-label="Reps"><span class="x">reps</span></div></div></div>`;
  const rows=e=>{let n=0;return setsOfE(e.id).map(x=>srow(x.kind==='warmup'?0:++n,x,e.exerciseId)).join('')};
  const sh=sheet({title:'Edit workout',cls:'tall grouped',left:`<button class="btn plain" data-x="close">Cancel</button>`,right:`<button class="btn plain strong" data-x="save">Save</button>`,
    body:`<div class="group">
      <div class="row"><div class="grow t1">Name</div><span class="val">${esc(s.label)}</span></div>
      <label class="row"><div class="grow t1">Date</div><input class="pill ein" type="date" id="ed-date" value="${s.startedAt.slice(0,10)}" min="2026-10-01" max="2026-10-${String(TODAY).padStart(2,'0')}"></label>
      <label class="row"><div class="grow t1">Started</div><input class="pill ein" type="time" id="ed-time" value="${s.startedAt.slice(11,16)}"></label>
      <label class="row"><div class="grow t1">Duration</div><span class="pill num"><input class="ein emin" id="ed-min" type="number" inputmode="numeric" min="1" max="300" value="${w.min}"> min</span></label></div>
      <div class="ghead">Session notes</div><div class="group"><textarea class="ednotes" id="ed-notes" rows="3" placeholder="How did it go?">${esc(s.notes||'')}</textarea></div>
      ${entsOf(s.id).map(e=>`<div class="ghead gx">${gl(e.exerciseId)}${exName(e.exerciseId)}</div><div class="group eset" data-eid="${e.id}">${rows(e)}
        <button class="row addrow" data-x="addrow">${I('plus',2)} Add set</button></div>`).join('')}
      <div class="group" style="margin-top:20px"><button class="row addrow" data-x="tray">${I('plus',2)} Add exercise</button></div>
      <div class="group" style="margin-top:20px"><button class="row dangerrow" data-x="delw">Delete workout</button></div>
      <p class="foot">Weights in ${S.unit} (Settings › Units). Save recalculates PRs for every workout.</p>`});
  bindSwipes(sh.el);
  sh.el.addEventListener('click',e=>{const a=e.target.closest('[data-x]');if(!a)return;const k=a.dataset.x;
    if(k==='close')sh.close();if(k==='tray')traySheet();if(k==='save'){const nd=saveEdit(s,sh.el);if(nd){sh.close();if(S.scr==='logDay'){if(nd!==S.logDay)go('#log-d'+nd);else render()}else if(S.scr==='log')render()}}
    if(k==='addrow'){const g=a.parentNode,n=$$('.swipe',g).filter(r=>$('.er',r).dataset.kind!=='warmup').length+1;a.insertAdjacentHTML('beforebegin',srow(n,{kind:'working',load:'',reps:''}));bindSwipes(g)}
    if(k==='delw')confirmSheet('Delete this workout?',`${s.label} on ${lbl} is removed from your Log and PRs are recalculated.`,'Delete workout',()=>{sh.close();
      LOGH.sessions=LOGH.sessions.filter(x=>x.id!==s.id);LOGH.entries=LOGH.entries.filter(x=>x.sessionId!==s.id);LOGH.sets=LOGH.sets.filter(x=>x.sessionId!==s.id);sv(LOG_K,LOGH);logDerive();toast('Workout deleted · PRs recalculated');go('#log')})});
  return sh;
}
// Save: date (Oct 1 – today, one workout per day), start time, duration, notes, every set's weight and reps. Weights are typed in
// the display unit, so the session is stored in that unit from now on. Then PRs are recomputed over the whole history.
function saveEdit(s,el){const date=$('#ed-date',el).value,tm=$('#ed-time',el).value,min=Math.round(+$('#ed-min',el).value||0),notes=$('#ed-notes',el).value.trim();
  if(!/^2026-10-\d\d$/.test(date)||+date.slice(8)<1||+date.slice(8)>TODAY){toast(`Pick a day from Oct 1 to Oct ${TODAY}`);return 0}
  const nd=+date.slice(8);if(nd!==sesDay(s)&&LOGS[nd]){toast(`Oct ${nd} already has a workout`);return 0}
  if(!/^\d\d:\d\d$/.test(tm)){toast('Pick a start time');return 0}if(!(min>=1&&min<=300)){toast('Duration: 1 to 300 min');return 0}
  const st=`${date}T${tm}:00-07:00`;s.date=s.startedAt=st;s.endedAt=isoPlus(st,min);s.notes=notes;s.unit=S.unit;
  for(const g of $$('.eset',el)){const eid=g.dataset.eid;LOGH.sets=LOGH.sets.filter(x=>x.entryId!==eid);let idx=0;
    for(const r of $$('.row.er',g)){const sw=r.closest('.swipe');if(!sw||!sw.isConnected||sw.style.height==='0px')continue;const wv=$('[data-kind=w]',r).value,rv=$('[data-kind=r]',r).value;if(wv===''&&rv==='')continue;
      LOGH.sets.push({id:`${eid}-x${idx}`,entryId:eid,sessionId:s.id,idx:idx++,kind:r.dataset.kind||'working',load:wv===''?0:+wv,reps:Math.trunc(+rv||0),rir:null,done:true})}}
  sv(LOG_K,LOGH);logDerive();const n=Object.values(LPR[s.id]||{}).reduce((a,t)=>a+Object.keys(t).length,0);toast(`Saved · PRs recalculated (${n} in this workout)`);return nd}
V.log=()=>(logLoad(),'')+header('Log',`<button class="ibtn" data-act="day" data-d="${TODAY}" aria-label="Add workout">${I('plus',2)}</button>`)+cal()+
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
    ${opt.workout?`<div class="ghead">Apply to</div><div class="group scope noswipe"><div class="row"><div class="grow"><div class="t1" id="scl">This workout only</div><div class="t2" id="sct">${WK.ref?`${(ROUTINES.find(x=>x.id===WK.ref.rid)||{}).name} stays as it is`:'Your routine stays as it is'}</div></div><span class="scok">${I('check',2.6)}</span></div>
      <div class="row"><div class="grow"><div class="t1">Also update routine</div><div class="t2">Use the new exercise in this routine day from now on</div></div><span class="tg" data-sw="routine" role="switch" aria-checked="false"></span></div></div>`:''}
    <div class="pad"><div class="seg"><button class="on">Similar</button><button>Browse all</button><button>Create new</button></div></div>
    <div class="group">${alts.map(a=>`<div class="row alt" data-x="pick" data-id="${a.id}" data-score="${a.score!=null?a.score:''}" role="button" tabindex="0">${gl(a.id)}<div class="grow"><div class="t1">${exName(a.id)}</div>${exSub(a.id)?`<div class="t2">${exSub(a.id)}</div>`:''}</div><span class="altb">${starBtn(a.id)}<button class="ib-i" data-act="exinfo" data-id="${a.id}" aria-label="Learn">${I('info',1.7)}</button></span>
      <div class="altx">${diffRow(a)}${a.reasons&&a.reasons.length?whyR(a):''}${opt.debug&&a.score!=null?`<div class="dbg num">score ${a.score} · fit ${a.fit}</div>`:''}</div></div>`).join('')}</div>
    <p class="foot">Typical differences, not guarantees.</p>`});
  let also=false;
  s.el.addEventListener('click',e=>{const sw=e.target.closest('[data-sw]');if(sw){also=!also;sw.classList.toggle('on',also);sw.setAttribute('aria-checked',also);
      $('#scl',s.el).textContent=also?'This workout and the routine':'This workout only';$('#sct',s.el).textContent=also?'The routine day changes too':`${WK.ref?(ROUTINES.find(x=>x.id===WK.ref.rid)||{}).name:'Your routine'} stays as it is`;return}
    if(e.target.closest('[data-act]'))return;const x=e.target.closest('[data-x]');if(!x)return;s.close();if(x.dataset.x==='pick'){if(opt.onPick)opt.onPick(x.dataset.id,also);else toast('Swapped')}});s.also=()=>also;return s;
}

// 8. PLATES
// Units (round 2): bars, plate sizes and the plate list follow Settings › Units. kg plates = rules.json gym_profile_default.kg.
const BARS_U={lb:[['Olympic',45],['SSB',70],['Smith',15],['EZ',35],['Trap',75]],kg:[['Olympic',20],['SSB',30],['Smith',7],['EZ',10],['Trap',25]]};
const PL_U={lb:[[45,'#0b0b0c',100,15],[35,'#2a2a2d',90,13],[25,'#47474b',78,11],[10,'#6e6e73',58,9],[5,'#97979c',46,7],[2.5,'#E8430C',38,6]],
  kg:null}; // kg sizes come from the data (gym_profile_default.kg.plates + a 25 kg plate), largest first, styled by rank
const PL_STYLE=[['#0b0b0c',100,16],['#1e1e21',100,15],['#2a2a2d',90,13],['#47474b',78,11],['#6e6e73',58,9],['#97979c',46,7],['#E8430C',38,6]];
const plKg=()=>{const ws=[...new Set([25,...(RD?RD.rules.logger.gym_profile_default.kg.plates.map(p=>+p.weight):[20,15,10,5,2.5])])].sort((a,b)=>b-a);return ws.map((w,i)=>[w,...PL_STYLE[Math.min(i,PL_STYLE.length-1)]])};
let BARS=BARS_U.lb,PL=PL_U.lb;const unitPlates=()=>{BARS=BARS_U[S.unit];PL=S.unit==='kg'?plKg():PL_U.lb};
// Plate sizes live in the gym profile (rules.json logger.gym_profile_default.lb.plates [{weight,pairs}]); toggling a size
// off/on saves the gym's plate list to localStorage (apechit.sb.gym) and ranking sees the same list (gymProfile()).
const LSG='apechit.sb.gym';let GYM=(()=>{try{return JSON.parse(localStorage.getItem(LSG))}catch(e){return null}})();
const defPlates=()=>RD?RD.rules.logger.gym_profile_default[S.unit].plates:PL.map(([w])=>({weight:w,pairs:2}));
const GKEY=()=>S.unit==='kg'?'plates_kg':'plates'; // lb list stays under GYM.plates (ranking reads it); kg list under GYM.plates_kg
const gymPlates=()=>(GYM&&Array.isArray(GYM[GKEY()]))?GYM[GKEY()]:defPlates();
function togglePlate(w){const all=defPlates(),cur=gymPlates(),on=cur.some(p=>p.weight===w);
  const next=on?cur.filter(p=>p.weight!==w):[...cur,all.find(p=>p.weight===w)||{weight:w,pairs:2}].sort((a,b)=>b.weight-a.weight);GYM=Object.assign({},GYM||{},{[GKEY()]:next});sv(LSG,GYM)}
function plateCalc(total,bar,plates){let side=(total-bar)/2;const out=[];if(side<0)return {out,left:0};for(const p of (plates||gymPlates()).slice().sort((a,b)=>b.weight-a.weight)){let n=0;while(side>=p.weight-1e-9&&n<(p.pairs||99)){out.push(p.weight);side-=p.weight;n++}}return {out,left:Math.round(side*2*100)/100}}
// target weight: the exercise's lb field (first set not ticked: typed value, else the value shown in the field)
function plateTarget(xi){const blk=$(`.exb[data-xi="${xi}"]`)||$$('.exb').find(b=>$('.plate,[data-act=plates]',b));if(!blk)return null;
  const rows=$$('.srow',blk),r=rows.find(x=>!x.classList.contains('done'))||rows[rows.length-1];if(!r)return null;const f=$('[data-kind=w]',r),v=parseFloat(f.value||f.placeholder);
  const sn=$('.sn',r).textContent;return isFinite(v)&&v>0?{w:v,set:sn==='W'?'warm-up':'set '+sn,id:blk.dataset.ex,typed:!!f.value}:null}
function plateBody(){unitPlates();if(S.plateU!==S.unit){S.plate=+cvt(S.plate,S.plateU||'lb',S.unit,'barbell-bench-press');S.plateU=S.unit}
  const bar=(BARS.find(b=>b[0]===S.bar)||['Custom',20])[1],pc=plateCalc(S.plate,bar),ps=pc.out,on=new Set(gymPlates().map(p=>p.weight)),sizes=[...new Set([...defPlates().map(p=>p.weight),...PL.map(p=>p[0])])].sort((a,b)=>b-a);
  let off=0;const side=ps.map(w=>{const p=PL.find(x=>x[0]===w),r=`<rect x="${off}" y="${-p[2]*.55}" width="${p[3]}" height="${p[2]*1.1}" rx="3" fill="${p[1]}"/>`;off+=p[3]+1.5;return r}).join('');
  const sv=`<svg viewBox="-175 -64 350 128" class="barsvg"><rect x="-172" y="-5" width="344" height="10" rx="4" fill="#cfcfd4"/><rect x="-58" y="-3.5" width="116" height="7" fill="#b4b4b9"/>
    <rect x="58" y="-13" width="6" height="26" rx="2" fill="#8e8e93"/><rect x="-64" y="-13" width="6" height="26" rx="2" fill="#8e8e93"/>
    <g transform="translate(66,0)">${side}</g><g transform="translate(-66,0) scale(-1,1)">${side}</g></svg>`;
  const per={};ps.forEach(w=>per[w]=(per[w]||0)+1);
  return `<div class="pw"><button class="rnd" data-pl="-${PSTEP()}" aria-label="Minus ${PSTEP()}">−</button><div class="pv"><b class="num">${S.plate}</b><span>${S.unit}</span></div><button class="rnd" data-pl="${PSTEP()}" aria-label="Plus ${PSTEP()}">+</button></div>
   ${S.plateFrom?`<p class="pfrom sub">From the ${S.unit} field · ${exNameP(S.plateFrom.id)}, ${S.plateFrom.set}${S.plateFrom.typed?'':' (last time)'}</p>`:''}
   ${sv}<div class="pside">${ps.length?Object.entries(per).sort((a,b)=>b[0]-a[0]).map(([w,n])=>`<span class="pc"><b class="num">${n} ×</b> ${w}</span>`).join(''):'<span class="sub">Bar only</span>'}<span class="sub">per side · bar ${bar}</span></div>
   ${pc.left>0?`<p class="pleft">${pc.left} ${S.unit} can't be loaded with the plates turned on · nearest ${S.plate-pc.left} ${S.unit}</p>`:''}
   <div class="ghead" style="padding-left:20px">Plates at Home gym <span class="gsub">tap a size to turn it off</span></div>
   <div class="chips wrap pltg noswipe">${sizes.map(w=>`<button class="chip ${on.has(w)?'on':'off'}" data-pt="${w}" aria-pressed="${on.has(w)}">${w}</button>`).join('')}</div>
   <div class="ghead" style="padding-left:20px">Bar</div>
   <div class="chips barpick noswipe">${BARS.map(([n,w])=>`<button class="chip ${S.bar===n?'on':''}" data-bar="${n}">${n} <span class="num op">${w}</span></button>`).join('')}<button class="chip" data-bar="Custom">${I('plus',2.2)} Custom</button></div>
   <p class="foot" style="padding:14px 20px 4px">Plate sizes are saved to your <b>Home gym</b> profile.</p>`;
}
const PSTEP=()=>S.unit==='kg'?2.5:5;
function plateSheet(xi){const t=plateTarget(xi==null?0:xi);S.plateFrom=t;if(t){S.plate=t.w;S.plateU=S.unit}
  const s=sheet({title:'Plate calculator',right:`<button class="btn plain" data-x="close">Done</button>`,body:`<div id="plb">${plateBody()}</div>`});
  s.el.addEventListener('click',e=>{const a=e.target.closest('[data-pl],[data-bar],[data-x],[data-pt]');if(!a)return;if(a.dataset.x)return s.close();
    if(a.dataset.pt){togglePlate(+a.dataset.pt);const w=+a.dataset.pt;toast(gymPlates().some(p=>p.weight===w)?`${w} ${S.unit} plates on`:`${w} ${S.unit} plates off · saved to Home gym`)}
    if(a.dataset.pl){S.plate=Math.max(S.unit==='kg'?7:15,+(S.plate+ +a.dataset.pl).toFixed(2));S.plateFrom=null}if(a.dataset.bar)S.bar=a.dataset.bar;$('#plb',s.el).innerHTML=plateBody()});return s}

// clock sheet: Pause + fast minute wheel to roll the time back
function clockSheet(){
  const s=sheet({title:'Workout clock',right:`<button class="btn plain" data-x="close">Done</button>`,body:`
    <div class="ck-big num" data-el>${fmt(WK.elapsed)}</div><div class="ck-sub sub">Started ${clockTime(CLK.start)} · ${WK.title}</div>
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
  <div class="group"><div class="row"><div class="grow t1">Appearance</div><div class="seg sm3" id="themeseg">${[['system','System'],['light','Light'],['dark','Dark']].map(([v,l])=>`<button class="${getTheme()===v?'on':''}" data-act="theme" data-v="${v}">${l}</button>`).join('')}</div></div></div>
  <div class="group" style="margin-top:20px"><div class="row"><div class="grow t1">Units</div><div class="seg sm2" id="unitseg">${['lb','kg'].map(u=>`<button class="${S.unit===u?'on':''}" data-act="unit" data-v="${u}">${u}</button>`).join('')}</div></div>
   <button class="row"><div class="grow t1">Bars</div><span class="val">5 bars</span>${CHEV}</button>
   <button class="row"><div class="grow t1">Week starts on</div><span class="val">Monday</span>${CHEV}</button></div>
  <div class="ghead">Rest timer</div>
  <div class="group"><div class="row"><span class="gl primary">★</span><div class="grow t1">Primary lifts</div><span class="pill num">3:00</span></div>
   <div class="row"><span class="gl accessory">${GLY.accessory}</span><div class="grow t1">Accessories</div><span class="pill num">2:00</span></div>
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
const VFILL={under:'var(--vol-under)',in:'var(--vol-in-range)',amber:'var(--vol-amber)',red:'var(--vol-red)'};
// In range shades like the live app's week map (targets.json gradient.week: light at min, darker toward max), driven by the ONE token:
// at min the fill is exactly var(--vol-in-range); toward max it is mixed with ink, up to IN_DARK %. Other bands are flat (VFILL).
const IN_DARK=40;
const volFill=(n,min,max)=>{const st=vStat(n,min,max);if(st!=='in')return VFILL[st];const p=max>min?Math.min(1,Math.max(0,(n-min)/(max-min))):0,k=Math.round(p*IN_DARK);
  return k?`color-mix(in oklch, var(--vol-in-range), var(--vol-mix) ${k}%)`:VFILL.in};
const volLegend=()=>`<div class="legend vleg">${['under','in','amber','red'].map(k=>`<span><i style="background:${VFILL[k]}"></i>${VLAB[k]}</span>`).join('')}</div><p class="foot vfoot">Amber above max, red above ${VB.red_factor!=null?VB.red_factor+'×':'(factor pending)'} max · rules.json volume_bands</p>`;
// numeric map values = a credit rating / intensity, shaded by role with the --hl-* colour tokens (never greyscale; grey = unworked)
const FILL=v=>typeof v==='string'?(VFILL[v]||v):v==null||!(v>0)?'var(--map-empty)':v>=.75?'var(--hl-main)':v>=.4?'var(--hl-helper)':'var(--hl-minor)';
// role of a muscle from its credit rating = the same display bands as the rating labels next to the map (BAND: main >= 0.75,
// helper >= 0.4, minor >= 0.25; under 0.25 adds no sets and is not shaded). exercise-details body_map.levels puts secondary
// at >= 0.5, which would contradict the "0.4 Helper" labels in the same popup, so the map follows the labels.
const HLV={main:'var(--hl-main)',helper:'var(--hl-helper)',minor:'var(--hl-minor)'};
const hlLevel=r=>r>=.75?'main':r>=.4?'helper':r>=.25?'minor':null;
const hlLegend=(cls='')=>`<span class="mleg hleg ${cls}"><i style="background:var(--hl-main)"></i>main<i style="background:var(--hl-helper)"></i>helper<i style="background:var(--hl-minor)"></i>minor</span>`;
function map(side,vol,opt={}){const m=MM[side],[,,w,h]=m.vb.split(' ').map(Number);
  return `<svg viewBox="0 0 ${w} ${h}" class="mmap" aria-label="${side} muscle map"><path d="${m.outline.join(' ')}" fill="var(--map-base)" stroke="var(--map-line)" stroke-width="3"/>
   ${m.m.map(([id,reg,d])=>{const mu=REG2M(reg),v=vol[mu];if(!mu)return `<path d="${d}" class="nr" fill="var(--map-base)" pointer-events="none"/>`; /* the two back ABDUCTOR paths have no region in the live map either */return `<path d="${d}" data-mu="${mu}" data-reg="${reg}" class="mp" fill="${opt.sel?(opt.sel.includes(mu)?'var(--accent)':'var(--map-off)'):opt.hl&&mu===opt.hl?'var(--accent)':FILL(v)}"/>`}).join('')}
   ${side==='front'&&opt.ape?`<g class="ape-head"><circle cx="512" cy="148" r="92" fill="var(--paper)" stroke="var(--accent)" stroke-width="7" stroke-dasharray="18 13"/><text x="512" y="138" text-anchor="middle" font-size="46" font-weight="800" fill="var(--accent-press)" font-family="-apple-system,sans-serif">APE</text><text x="512" y="186" text-anchor="middle" font-size="32" fill="var(--text-2)" font-family="-apple-system,sans-serif">head slot</text></g>`:''}</svg>`}
const VOL_X=[['traps',8,6,12],['forearms',6,4,12],['obliques',4,4,10],['lower_back',6,4,10],['adductors',4,4,10],['abductors',3,4,10]];
const volMap=()=>{const o={};[...VOL,...VOL_X].forEach(([m,n,lo,hi])=>o[m]=volFill(n,lo,hi));return o}; // same vStat bands as the panel, in-range shaded from --vol-in-range
// PROGRESS (round 1, Coach's rules.json progress + data/progress-spec.md): logged workouts only, through logic/progress.js
// (port of tools/progress.py). The log is Coach's synthetic fixture (data/progress-reference.json, six weeks to Thu Oct 22),
// plus your Always notes from Train (apechit.sb.exNotes) so they show first. Refinement cards that edit the routine use the
// analysis-sheet ops (logic/analysis.js applyOps); Apply keeps the routine as it was for Undo.
const PROG={routine:null,applied:[],sig:null,res:null,base:null};
function progRoutine(){const P=RD&&RD.PREF;if(!P)return null;if(!PROG.routine){PROG.routine=JSON.parse(JSON.stringify(P.routine));PROG.base=JSON.stringify(P.routine)}return PROG.routine}
function progressData(){const P=RD&&RD.PREF;if(!P||!window.PROGRESS)return null;const rt=progRoutine(),notes=Object.assign({},P.history.exNotes||{},ld(LSN,{}));
  const sig=JSON.stringify([rt,notes]);if(PROG.sig===sig&&PROG.res)return PROG.res;
  const h=Object.assign({},P.history,{exNotes:notes});PROG.res=PROGRESS.progress(RD,h,rt.filter(d=>d.tiles.length),P.as_of,P.level,P.goal||null);PROG.sig=sig;return PROG.res}
const wt=v=>v==null?'–':S.unit==='kg'?`${(+v).toFixed(1)} kg`:`${(v*KG_LB).toFixed(1)} lb`,fx1=v=>v==null?'–':(+v).toFixed(1).replace(/\.0$/,'');
const TRL={up:'Up',down:'Down',flat:'Flat',insufficient:'Not enough weeks'},LFT={up:'Up',stalled:'Stalled',dropping:'Dropping',insufficient:'Too few sessions'};
const DNL=d=>RD.rules.day_names[d]||d,DSH=d=>DNL(d).slice(0,3);
function bandOf(m){const T=RD.targets.targets[m],lv=(RD.PREF||{}).level||'intermediate';if(!T)return null;return [RANK.pyRound(T.min*RD.targets.levelMinFactor[lv]*2)/2,T.max]}
const progMap=pr=>{const o={};for(const [m,v] of Object.entries(pr.muscles)){const b=bandOf(m);o[m]=b&&v.last_week_sets>0?volFill(v.last_week_sets,b[0],b[1]):null}return o};
V.progress=()=>{const pr=RD&&progressData();if(!pr)return header('Progress',bookBtn)+`<p class="foot">No logged workouts yet.</p>`;const A=pr.adherence,W=(Object.values(pr.muscles)[0]||{}).weeks||[];
  return header('Progress',bookBtn)+
  `<p class="foot plog">${pr.label} Synthetic log: ${pr.guards.completed_sessions} completed sessions over ${pr.guards.logged_weeks} weeks, as of ${pr.as_of}. <span class="smp">sample</span></p>
   <div class="card mapcard"><div class="maps">${map('front',progMap(pr),{ape:true})}${map('back',progMap(pr))}</div>${volLegend()}
    <p class="maptip">Last completed week, credited sets vs target · tap a muscle</p></div>
   <div id="pmus">${pmusHtml(S.pmus)}</div>
   <div class="sec"><h2>Adherence</h2><span class="more">last ${A.weeks} weeks</span></div>
   <div class="group padh"><div class="row"><div class="grow t1">Planned sets done</div><span class="val num" id="padh-s">${A.completed_planned_sets} of ${A.planned_sets} · ${A.sets_ratio!=null?Math.round(A.sets_ratio*100)+'%':'–'}</span></div>
    <div class="row"><div class="grow t1">Sessions</div><span class="val num" id="padh-n">${A.sessions_completed} done · ${A.sessions_skipped} skipped</span></div></div>
   <div class="sec"><h2>Per muscle</h2><span class="more">credited vs planned · ${W.length} wk trend</span></div>
   <div class="group pml">${Object.entries(pr.muscles).map(([m,v])=>`<button class="row" data-pm="${m}"><div class="grow"><div class="t1">${ML[m]||m}</div><div class="t2 num">${fx1(v.last_week_sets)} of ${fx1(v.plan_sets)} planned last week${v.adherence!=null?` · ${Math.round(v.adherence*100)}% over ${W.length} wk`:''}</div></div><span class="ptr ${v.trend.status}">${TRL[v.trend.status]}</span></button>`).join('')}</div>
   ${progItemsHtml(pr)}
   ${refHtml(pr)}
   ${routineHtml()}
   <p class="foot">Hard sets are credited per Coach's set tags (drop sets, myo-reps, partials). e1RM uses Epley on working sets of ${RD.rules.logger.e1rm_max_reps} reps or fewer, deload weeks left out. Every threshold is modeled.</p>`};
// round 2 batch B (item 3): the analysis_metrics items with tab = progress live here, not in Build's Analysis. Values come from
// logic/progress.js where it computes them; the rest say where they show or that they are not computed yet.
function progItemsHtml(pr){const am=(RD.rules.analysis_metrics||{}),its=(am.items||[]).filter(i=>i.tab==='progress');if(!its.length)return '';const A=pr.adherence,M=Object.values(pr.muscles);
  const ml=M.map(v=>v.main_lift).filter(Boolean),cnt=k=>ml.filter(x=>x.status===k).length;
  const VAL={logged_hard_sets:`${fx1(M.reduce((a,v)=>a+(v.last_week_sets||0),0))} credited sets last week`,adherence:A.sessions_ratio!=null?`${Math.round(A.sessions_ratio*100)}% of sessions`:'',
    planned_vs_done:`${A.completed_planned_sets} of ${A.planned_sets} sets`,load_trend:ml.length?`${cnt('up')} up · ${cnt('stalled')} stalled · ${cnt('dropping')} dropping`:'',
    progress_signal:`${pr.refinements.length} card${pr.refinements.length===1?'':'s'} below`,prs:'Log + Finish badges',finish_vs_last:'On the Finish screen'};
  const sec=(am.sections||[]).find(s=>s.id==='progress')||{label:'Logged progress'};
  return `<div class="sec"><h2>${sec.label}</h2><span class="more">${its.length} items</span></div>
   <div class="group pitems">${its.map(it=>`<div class="row pitem" data-metric="${it.id}" data-kind="${it.kind}"><div class="grow"><div class="t1">${kchip(it.kind)} ${it.label}</div><div class="t2 num">${VAL[it.id]||'<span class="nc">Not computed in the storyboard yet</span>'}</div></div>${ibtn(it.id)}</div>`).join('')}</div>`}
function spark(v){const s=v.weekly_sets,mx=Math.max(1,v.plan_sets,...s),W=v.weeks||[];
  return `<div class="spark" aria-label="Weekly credited sets">${s.map((x,i)=>`<div class="sp"><i style="--h:${x/mx*100}%" class="${x<v.plan_sets*0.75?'lo':''}"></i><small>${(W[i]||'').slice(5).replace('-','/')}</small></div>`).join('')}<b style="--y:${v.plan_sets/mx*100}%" title="Plan"></b></div>`}
function pmusHtml(m){if(!m)return '';const pr=progressData(),v=pr&&pr.muscles[m];if(!v)return `<div class="card pmus" data-mu="${m}"><b>${ML[m]||m}</b><p class="sub">Nothing logged for this muscle in the last ${RD.rules.progress.trend.weeks} weeks.</p></div>`;
  const ml=v.main_lift,top=Math.max(v.plan_sets,v.last_week_sets||0,1),b=bandOf(m);
  return `<div class="card pmus" data-mu="${m}"><div class="pmh"><b>${ML[m]||m}</b><span class="ptr ${v.trend.status}">${TRL[v.trend.status]}${v.trend.pct_per_week!=null?` ${v.trend.pct_per_week>0?'+':''}${Math.round(v.trend.pct_per_week)}%/wk`:''}</span></div>
   <div class="pav"><div class="pvl"><span>Credited last week</span><b class="num">${fx1(v.last_week_sets)}</b></div><div class="pvl"><span>Planned</span><b class="num">${fx1(v.plan_sets)}</b></div><div class="pvl"><span>This week so far</span><b class="num">${fx1(v.this_week_sets)}</b></div><div class="pvl"><span>Adherence</span><b class="num" data-k="adh">${v.adherence!=null?Math.round(v.adherence*100)+'%':'–'}</b></div></div>
   ${spark(v)}<p class="sub sparkc">Weekly credited sets, last ${v.weeks.length} completed weeks · line = plan${b?` · target ${b[0]}–${b[1]}`:''}</p>
   <div class="ghead sub2">Main lift</div>${ml?`<div class="pml1" data-ex="${ml.id}"><div class="t1">${exNameP(ml.id)}</div><div class="t2 num">e1RM ${wt(ml.first_e1rm_kg)} → ${wt(ml.last_e1rm_kg)} · ${ml.sessions} sessions · <span class="ptr ${ml.status==='stalled'?'flat':ml.status==='dropping'?'down':ml.status}">${LFT[ml.status]}${ml.pct_per_week!=null?` ${ml.pct_per_week>0?'+':''}${ml.pct_per_week.toFixed(1)}%/wk`:''}</span></div><div class="t2">From sets of ${RD.rules.logger.e1rm_max_reps} reps or fewer</div></div>`:'<p class="sub">No lift with enough sessions for a trend yet.</p>'}
   <div class="ghead sub2">Notes</div>${v.notes.length?`<div class="pnotes">${v.notes.map(n=>`<div class="pn ${n.kind}"><span class="tag ${n.kind==='always'?'al':'ss'}">${n.kind==='always'?'Always':'This session'}</span><div class="grow"><div class="t2">${exNameP(n.exercise)}${n.date?` · ${n.date.slice(5).replace('-','/')}`:''}</div><div class="t1">${esc(n.text)}</div></div></div>`).join('')}</div>`:'<p class="sub">No notes on exercises for this muscle.</p>'}</div>`}
// refinement cards
const opsLine=ops=>{const rm=ops.filter(o=>o.op==='remove'),ad=ops.filter(o=>o.op==='add');
  if(rm.length>2&&ad.length>=rm.length&&rm.every(r=>ad.some(a=>a.id===r.id))){const f=rm[0].day,t=ad[0].day,ex=ad.filter(a=>!rm.some(r=>r.id===a.id));return `the whole ${DSH(f)} session (${rm.length} exercises) moves to ${DSH(t)}`+(ex.length?' · '+ex.map(o=>`add ${exNameP(o.id)} ×${o.sets} on ${DSH(o.day)}`).join(' · '):'')}
  return opsLine0(ops)};
const opsLine0=ops=>ops.map(o=>o.op==='swap'?`${exNameP(o.from_id)} → ${exNameP(o.to_id)} on ${DSH(o.day)}`:o.op==='sets'?`${exNameP(o.id)} ${o.from}→${o.to} sets on ${DSH(o.day)}`:o.op==='add'?`add ${exNameP(o.id)} ×${o.sets} on ${DSH(o.day)}`:`remove ${exNameP(o.id)} from ${DSH(o.day)}`).join(' · ');
let PEDIT=[];
function refHtml(pr){PEDIT=[];const G=pr.guards,R=pr.refinements;
  const ed=(label,ops)=>{PEDIT.push({label,ops});return `<div class="fxr"><span>${label}<small class="sub opl">${opsLine(ops)}</small></span><button class="btn sm accent" data-act="papply" data-k="${PEDIT.length-1}">Apply</button></div>`};
  const idx={};R.forEach((r,i)=>idx[r.type+':'+(r.exercise||r.day||r.muscle)]=i);
  const card=(r,i)=>{if(r.type==='stall'){const a=r.actions,rr=a.rep_range_change,sw=a.swap_variation;
      return `<div class="flag pref" data-rt="stall" id="pref-${i}"><div class="ftl">Stalled lift <span class="tag sev info">${exNameP(r.exercise)}</span></div><p>Best e1RM of the last 3 sessions is ${wt(r.best_recent_kg)}, not above the ${wt(r.best_before_kg)} before them (${r.exposures} sessions).</p>
       ${rr?`<div class="fxr disp"><span>Try ${rr.suggest_range[0]}–${rr.suggest_range[1]} reps for a while (your top sets were ${rr.from_reps_median}; range ${rr.rep_range[0]}–${rr.rep_range[1]})</span><span class="tag">Display only</span></div>`:''}
       ${sw?ed(`Swap for ${exNameP(sw.to_id)}, a variation for the same slot`,sw.diff):''}</div>`}
    if(r.type==='missed_sets'){const a=r.actions;return `<div class="flag pref" data-rt="missed_sets" id="pref-${i}"><div class="ftl">Missed sets <span class="tag sev info">${exNameP(r.exercise)}</span></div><p>${r.missed} of the last ${r.sessions.length} sessions had fewer sets than planned (${r.sessions.map(s=>`${s.done}/${s.planned}`).join(', ')}).</p>
       ${a.trim_sets?ed(`Plan ${a.trim_sets[0].to} sets instead of ${a.trim_sets[0].from}`,a.trim_sets):''}${a.move_sets?ed(`Plan fewer sets here and move ${a.move_sets[1].sets} to ${DNL(a.move_sets[1].day)}`,a.move_sets):''}</div>`}
    if(r.type==='under_delivered'){const see=(r.action||{}).see||[];return `<div class="flag pref info" data-rt="under_delivered" data-mu="${r.muscle}" id="pref-${i}"><div class="ftl">Under-delivered <span class="tag sev info">${ML[r.muscle]||r.muscle}</span></div><p>${r.actual.map(fx1).join(' and ')} credited sets in the last ${r.weeks.length} weeks vs ${fx1(r.plan)} planned.</p>
       ${see.length?see.map(s=>{const j=idx[s.type+':'+(s.exercise||s.day)];return `<button class="btn plain sm psee" data-act="psee" data-k="${j}">${s.type==='skipped_day'?`See: skipped ${DNL(s.day)}`:`See: missed sets on ${exNameP(s.exercise)}`} ›</button>`}).join(''):'<p class="sub">Probably swaps or logging. Nothing to change in the routine.</p>'}</div>`}
    if(r.type==='skipped_day'){const a=r.action;return `<div class="flag pref" data-rt="skipped_day" id="pref-${i}"><div class="ftl">Skipped day <span class="tag sev info">${DNL(r.day)}</span></div><p>Skipped ${r.skipped_sessions.length} times in the last weeks. That left ${r.muscles.map(m=>(ML[m]||m).toLowerCase()).join(', ')} short.</p>
       ${a?ed(`Move ${a.label||DNL(r.day)} to ${DNL(a.to_day)}`,a.diff):'<p class="sub">No empty day takes it without a new warning.</p>'}</div>`}
    return ''};
  const ap=PROG.applied.map((a,i)=>`<div class="aplc" data-k="${i}"><div class="grow"><div class="ftl">Applied</div><p>${a.label}</p><p class="sub opl">${opsLine(a.ops)}</p></div><button class="btn sm ink" data-act="pundo" data-k="${i}">Undo</button></div>`).join('');
  return `<div class="sec" id="prefs"><h2>Refinements</h2><span class="more">from your log</span></div>
   ${ap?`<div class="flags">${ap}</div>`:''}
   ${G.refinements_enabled?`<p class="foot pguard" data-on="1">Refinements are on: ${G.completed_sessions} completed sessions over ${G.logged_weeks} weeks (needs ${RD.rules.progress.guards.min_completed_sessions} over ${RD.rules.progress.guards.min_logged_weeks}+).</p>`+(R.length?`<div class="flags">${R.map(card).join('')}</div>`:'<p class="foot">Nothing to refine: the log matches the plan.</p>'):`<p class="foot pguard" data-on="0">Refinements start after ${RD.rules.progress.guards.min_completed_sessions} completed sessions over ${RD.rules.progress.guards.min_logged_weeks}+ weeks. You have ${G.completed_sessions} over ${G.logged_weeks}.</p>`}`}
function routineHtml(){const rt=progRoutine(),base=JSON.parse(PROG.base||'[]'),bs=d=>JSON.stringify((base.find(x=>x.day===d.day)||{tiles:[]}).tiles);
  return `<div class="sec"><h2>Routine</h2><span class="smp">sample</span></div><p class="foot" style="padding-top:0">The log's ${(RD.PREF||{}).level||''} upper / lower routine; refinements edit this, not your board.</p><div class="group prt">${rt.filter(d=>d.tiles.length||base.some(x=>x.day===d.day)).sort((a,b)=>PCHECK.ORDER.indexOf(a.day)-PCHECK.ORDER.indexOf(b.day)).map(d=>`<div class="row${JSON.stringify(d.tiles)!==bs(d)?' chg':''}" data-day="${d.day}"><div class="grow"><div class="t1">${DSH(d.day)} · ${d.label||(d.tiles.length?'Training':'Rest')}</div><div class="t2">${d.tiles.length?d.tiles.map(t=>`${shortEx(t.id)} ×${t.sets}`).join(', '):'Rest'}</div></div></div>`).join('')}</div>`}
const shortEx=id=>(EX[id]&&EX[id].short_name)||(RD&&RD.EX[id]&&(RD.EX[id].short_name||RD.EX[id].name))||exNameP(id);
function progApply(k){const e=PEDIT[+k];if(!e)return;const rt=progRoutine(),before=JSON.parse(JSON.stringify(rt));
  for(const o of e.ops)if(!rt.some(d=>d.day===o.day))rt.push({day:o.day,label:'',tiles:[]});
  let nw=ANALYSIS.applyOps(rt,e.ops);const mv=e.ops.find(o=>o.op==='add'),rm=e.ops.filter(o=>o.op==='remove');
  if(rm.length&&mv){const src=nw.find(d=>d.day===rm[0].day),dst=nw.find(d=>d.day===mv.day);if(src&&dst&&!src.tiles.length){dst.label=src.label;src.label=''}} // a moved day keeps its name
  PROG.routine=nw;PROG.applied.unshift({label:e.label,ops:e.ops,before});rerenderProgress();toast('Routine updated · Undo is on the card')}
function progUndo(k){const a=PROG.applied[+k];if(!a)return;PROG.routine=a.before;PROG.applied.splice(+k,1);rerenderProgress();toast('Refinement undone')}
function rerenderProgress(){const v=$('#view'),sc=v.scrollTop;v.innerHTML=V.progress();afterProgress();v.scrollTop=sc}
function afterProgress(){$$('.mapcard .mmap .mp').forEach(p=>p.addEventListener('click',()=>{if(p.dataset.mu)selPM(p.dataset.mu)}));$$('[data-pm]').forEach(b=>b.addEventListener('click',()=>selPM(b.dataset.pm)));if(S.pmus)selPM(S.pmus,true)}
function selPM(m,quiet){S.pmus=m;$('#pmus').innerHTML=pmusHtml(m);$$('.mapcard .mmap .mp').forEach(p=>p.classList.toggle('psel',p.dataset.mu===m));if(!quiet)$('#pmus').scrollIntoView({block:'nearest',behavior:'smooth'})}
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
   <div class="chips" style="padding:0"><button class="chip on">★ Primary</button><button class="chip">${GLY.accessory} Accessory</button><button class="chip">● Isolation</button></div>
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
  {const b=DATA+'education/',j=await getJ(b+'index.json');if(j){EDU.idx=j;EDU.base=b}} // the storyboard's synced copy (sync-education.sh) only
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
    <div class="legend"><span><i style="background:var(--hl-main)"></i>Guide ready</span>${nf<mus.length?'<span><i style="background:var(--hl-minor)"></i>Coming soon</span>':''}</div><p class="maptip">Tap any muscle</p></div>
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
  const sx=String(id||'').split('~')[1]||null;id=id&&String(id).split('~')[0];
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
  // page#section from an analysis item's Learn link: open that section and scroll to it
  const ds=$$('#lf .lsx > details.ls');(j.sections||[]).forEach((x,i)=>{if(ds[i])ds[i].dataset.sec=x.id});
  if(sx){const k=(j.sections||[]).findIndex(x=>x.id===sx),el=ds[k];if(el){ds.forEach(d=>d.open=false);el.open=true;el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1400);el.scrollIntoView({block:'start'})}}
}
// ---- round 2 batch B: analysis item chips + explain sheets (item 3), exercise detail popup + tray sort (item 4)
// analysis_metrics v2 items: kind chip (Check / Measure / Info) and an (i) that opens what / how / why + the Learn page#section
const KINDL={check:'Check',measure:'Measure',info:'Info'};
const kchip=k=>`<span class="kchip k-${k}" data-kind="${k}">${KINDL[k]||k}</span>`;
const itemDef=id=>(((RD&&RD.rules.analysis_metrics)||{}).items||[]).find(i=>i.id===id);
const EVT={supported:'Supported',thin:'Thin evidence',modeled:'Modeled'};
const learnGo=lp=>{const [p,sx]=String(lp).split('#');return `#learn-f-${p}${sx?'~'+sx:''}`};
const ibtn=(id,attr='data-xpl')=>`<button class="ixb" ${attr}="${id}" aria-label="What is this?">${I('info',1.8)}</button>`;
function explainSheet(id,extra=''){const it=itemDef(id);if(!it)return null;const x=it.explain||{},lp=x.learn_page;
  const s=sheet({title:'',cls:'grouped xsheet',right:'<button class="btn plain" data-x="close">Done</button>',
    body:`<div class="xpl" data-item="${id}"><div class="xh">${kchip(it.kind)}<span class="tag ev ${it.evidence}">${EVT[it.evidence]||'Modeled'}</span>${it.status==='proposed'?'<span class="tag prop">Proposed</span>':''}</div><h3>${it.label}</h3>
     <div class="group xq"><div class="row"><div class="grow"><div class="xk">What it measures</div><p>${x.what||it.description||''}</p></div></div>
      <div class="row"><div class="grow"><div class="xk">How it's calculated</div><p>${x.how||it.formula||''}</p></div></div>
      <div class="row"><div class="grow"><div class="xk">Why it matters</div><p>${x.why||''}</p></div></div></div>
     ${extra}
     ${lp?`<div class="pad"><button class="btn grey block xlearn" data-x="learn" data-go="${learnGo(lp)}">${I('book',1.8)} <span>Learn: ${lp.split('#')[0].replace(/-/g,' ')}</span></button></div>`:'<p class="foot">No Learn page for this one yet.</p>'}</div>`});
  if(lp)eduLoad().then(idx=>{const p=(idx.pages||[]).find(q=>q.id===lp.split('#')[0]),b=$('.xlearn span',s.el);if(p&&b)b.textContent='Learn: '+p.title}).catch(()=>{});
  s.el.addEventListener('click',e=>{if(e.target.closest('[data-x=close]'))return s.close();const g=e.target.closest('[data-go]');if(g){e.preventDefault();e.stopPropagation();const h=g.dataset.go;closeAll();go(h)}});return s}
// exercise detail popup: data/exercise-details.json (loaded on first open, 590 KB). Photos only when show_photo (exact match);
// approximate photos are never shown. The files are copied into assets/ex-photos by build-photos.py (free-exercise-db, The Unlicense).
let EXD=null;
async function exdLoad(){if(!EXD){try{const j=await fetch(DATA+'exercise-details.json').then(r=>r.json());EXD={};const L=j.exercises||[];(Array.isArray(L)?L:Object.values(L)).forEach(e=>EXD[e.id]=e)}catch(e){EXD={}}}return EXD}
const yn=b=>b?'Yes':'No',pctS=v=>`${Math.round(v*100)}%`;
function exDetailBody(id,d){const e=EX[id]||{},f=d.fatigue||{},st=d.stretch||{},sp=d.stimulus_per_fatigue||{},rr=d.rep_range||{},bm=(d.body_map||{}).muscles||{};
  const rat=(EX[id]||{}).rat||{},vm={};for(const [m,v] of Object.entries(bm)){const k=hlLevel(rat[m]||0);if(v>0&&k)vm[m]=HLV[k]}const sfor=(st.stretch_biased_for||[]).map(m=>ML[m]||m);
  const row=(k,v,sub='')=>`<div class="row xm"><div class="grow"><div class="t1">${k}</div>${sub?`<div class="t2">${sub}</div>`:''}</div><span class="val num">${v}</span></div>`;
  return `${d.show_photo&&d.photos?`<div class="xphotos" data-photo="exact">${['start','end'].map((k,i)=>`<figure><img src="assets/ex-photos/${id}-${i}.jpg" alt="${esc(d.name)} ${k} position" loading="lazy"><figcaption>${k==='start'?'Start':'End'}</figcaption></figure>`).join('')}</div>
     <p class="foot xcred">Photos: free-exercise-db (“${esc(d.photos.source_name)}”), public domain (The Unlicense).</p>`:''}
   <div class="mapcard small xmap" data-mus="${Object.keys(vm).join(' ')}"><div class="maps">${map('front',vm)}${map('back',vm)}</div><div class="legend">${hlLegend()}</div></div>
   <div class="ghead">Muscles worked · share of each set's credit</div>
   <div class="group inset0 xtg">${(d.targets||[]).map(t=>`<button class="row" data-go="#learn-${t.muscle}"><div class="grow t1">${ML[t.muscle]||t.muscle}</div>${rate(t.rating)}<span class="val num xsh">${t.counts?pctS(t.share):'map only'}</span>${CHEV}</button>`).join('')}${!(d.targets||[]).length&&d.untracked_target?`<div class="row utn"><div class="grow"><div class="t1">${d.untracked_target.label||'Not tracked'}</div><div class="t2">${d.untracked_target.tag||''}</div></div></div>`:''}</div>
   <div class="ghead">How Analysis counts it</div>
   <div class="group inset0 xmet">${row('Stretch',st.stretch_focused?'Stretch-focused':`Emphasis ${st.stretch_emphasis??'–'} of 3`,sfor.length?`Counts as stretch work for ${sfor.join(', ')}`:'Not on a stretch-check list')}
    ${row('Fatigue rating',`${f.rating??'–'}`,f.tier?f.tier[0].toUpperCase()+f.tier.slice(1):'')}
    ${row('Recovery cost per set',`${f.recovery_cost_per_set??'–'}`,'Modeled points; adds up to the week’s recovery cost')}
    ${row('Stimulus per fatigue',`${sp.main??'–'}`,'Top rating ÷ fatigue')}
    ${row('Systemic fatigue',`${f.systemic_fatigue_tag??'–'} of 3`)}
    ${row('Heavy spine load',yn(f.heavy_spine),f.heavy_spine?'Counts toward the spinal-load check':'')}
    ${row('One side at a time',yn(d.one_side))}
    ${row('Time per set',`${f.minutes_per_set??'–'} min`,`incl. ${f.rest_min??'–'} min rest (session-length model)`)}
    ${row('Rep range',rr.display?`${rr.display}${rr.unit&&rr.unit!=='reps'?' '+rr.unit:''}`:'–',rr.per_side?'per side':'')}
    ${row('Movement pattern',d.movement_pattern_label||'–',d.push_pull_side&&d.push_pull_side!=='none'?`${d.push_pull_side[0].toUpperCase()+d.push_pull_side.slice(1)} side of push : pull`:'')}
    ${row('Equipment',(d.equipment||e.eq||'–'),(d.equipment_needs||[]).map(x=>x.replace(/_/g,' ')).join(', '))}</div>
   ${!d.show_photo?`<p class="foot xnop">${d.photos?'Only exact photo matches are shown; this exercise’s photo is an approximate match, so the map stands in.':'No photo for this exercise; the map shows what it trains.'}</p>`:''}`}
function exDetail(id,o={}){const e=EX[id];if(!e)return null;
  const s=sheet({title:'',cls:'grouped tall xdet',right:'<button class="btn plain" data-x="close">Done</button>',
    body:`<div class="xd" data-id="${id}"><div class="exi-h">${gl(id)}<div><h3>${exName(id)}</h3><p class="sub">${(e.type||' ')[0].toUpperCase()+(e.type||'').slice(1)} · ${e.eq||''}</p></div></div><div id="xdb"><p class="foot">Loading…</p></div>
     <div class="pad two">${e.learn!==false?`<button class="btn grey" data-x="learn" data-go="#learn-ex-${id}">${I('book',1.8)} Learn</button>`:''}${o.onAdd?`<button class="btn accent" data-x="add">${I('plus',2)} ${o.addLabel||'Add'}</button>`:''}</div></div>`});
  exdLoad().then(D=>{const d=D[id],b=$('#xdb',s.el);if(!b)return;b.innerHTML=d?exDetailBody(id,d):'<p class="foot">No detail data for this exercise.</p>';
    const lb=$('[data-x=learn]',s.el);if(lb&&d&&!(d.learn||{}).authored)lb.innerHTML=`${I('book',1.8)} Learn (draft)`});
  s.el.addEventListener('click',ev=>{if(ev.target.closest('[data-x=close]'))return s.close();if(ev.target.closest('[data-x=add]')){s.close();return o.onAdd&&o.onAdd(id)}
    const g=ev.target.closest('[data-go]');if(g){ev.preventDefault();ev.stopPropagation();const h=g.dataset.go;closeAll();go(h)}});return s}
// tray sort (both trays): Best match = the shared ranker (default); A–Z; Most stimulus for the filtered muscle; Lowest fatigue
const SORTS=[['sug','Best match'],['az','A–Z'],['stim','Most stimulus'],['fat','Lowest fatigue']];
const sortMode=(m,mus)=>m==='lib'?'az':m==='stim'&&!mus?'sug':(SORTS.some(x=>x[0]===m)?m:'sug');
const sortHtml=(mode,mus,at)=>{const m=sortMode(mode,mus);return `<div class="tfr tsort noswipe" data-row="sort"><span class="tfl">Sort</span>${SORTS.map(([k,l])=>`<button class="chip xs ${k===m?'on':''}" data-${at}="${k}" ${k==='stim'&&!mus?'disabled title="Pick a muscle filter first"':''} aria-pressed="${k===m}">${k==='stim'&&mus?`Most ${(ML[mus]||mus).toLowerCase()} stimulus`:l}</button>`).join('')}</div>`};
function sortIds(ids,mode,mus){const E=RD.EX,nm=i=>(E[i]||{}).name||i,byN=(a,b)=>nm(a).localeCompare(nm(b));const L=ids.slice();
  if(mode==='az')return L.sort(byN);
  if(mode==='stim')return L.sort((a,b)=>((E[b].muscles[mus]||0)-(E[a].muscles[mus]||0))||(((E[b].muscles[mus]||0)/E[b].fatigue)-((E[a].muscles[mus]||0)/E[a].fatigue))||byN(a,b));
  if(mode==='fat')return L.sort((a,b)=>(E[a].fatigue-E[b].fatigue)||byN(a,b));return L}
const sortNote=(mode,mus)=>({az:'A–Z',stim:`most ${(ML[mus]||mus||'').toLowerCase()} stimulus per set first`,fat:'lowest fatigue rating first'})[mode]||'';
const infoFor=id=>{const e=EX[id];if(!e)return '#learn';const top=Object.entries(e.rat).sort((a,b)=>b[1]-a[1])[0];return top?'#learn-'+top[0]:utOf(id)?'#learn-'+utOf(id).filter_muscle:'#learn'};
// untracked_target row (all-zero muscle map): label + tag in place of the muscle ratings
const utRow=u=>`<div class="row utn" data-ut="${u.id}"><div class="grow"><div class="t1">${u.label}</div><div class="t2">${u.tag}</div></div></div>`; // (i) opens the page of the exercise's main muscle

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
async function loadRank(){if(RD)return RD;if(RDP)return RDP;
  // Every file comes from the storyboard's own synced data/ (sync-ranking-data.sh); the live app's ../data is never needed.
  // getJ never throws: a 404, a parse error or a fetch aborted by navigation all give null, and nothing falls through to another folder.
  RDP=(async()=>{const opt=['templates.json','templates-reference.json','progress-reference.json'].map(n=>getJ(DATA+n));
    const [exercises,rules,targets,patterns,splits]=await Promise.all(['exercises.json','rules.json','targets.json','patterns.json','splits.json'].map(n=>getJ(DATA+n)));
    const [tj,tref,pref]=await Promise.all(opt);
    if(!(exercises&&rules&&targets&&patterns&&splits)){if(!UNLOADING)console.warn('ranking data missing: suggestions fall back to library order');return null}
    const tf=(((rules.templates||{}).file)||'templates.json').replace(/^data\//,'');
    const R=RANK.makeData({exercises,rules,targets,patterns,splits});R.splits=splits;R.base=DATA;
    R.TJ=tf==='templates.json'?tj:await getJ(DATA+tf);R.TREF=tref;R.PREF=pref;RD=R;return RD})();
  const r=await RDP;RDP=null;return r}
const LSK2={equip:'apechit.sb.equip'};
let EQUIP=ld(LSK2.equip,{});                                  // gym profile `equipment` {name: bool} (ranking-spec §5, Builder items)
const gymProfile=()=>Object.assign({},RD.rules.logger.gym_profile_default.lb,Object.keys(EQUIP).length?{equipment:EQUIP}:{},GYM&&Array.isArray(GYM.plates)?{plates:GYM.plates}:{});
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
  const hit=sect('Muscles hit',`<div class="mhit">${!shown.length&&utOf(id)?`<div class="utn" data-ut="${utOf(id).id}"><b>${utOf(id).label}</b><p class="sub">${utOf(id).tag}</p></div>`:''}${shown.map(([m,r])=>{const x=pm[m]||{};return `<button class="mh" data-r="${r}" data-go="#learn-${m}"><span class="mn">${ML[m]||m}</span><span class="mb ${BAND(r)||'nc'}"><i style="--w:${r*100}%"></i></span><span class="rate ${BAND(r)||'nc'}"><b class="num">${+(+r).toFixed(2)}</b>${XBANDL[BAND(r)||'nc']}</span></button>${x.why?`<p class="mwhy">${x.why} ${x.evidence?ev(x):''}</p>`:''}${(x.region_notes||[]).map(n=>`<p class="mwhy rn"><b>${(window.RNAME||{})[n.region_id]||n.region_id.replace(/_/g,' ')}</b> ${n.text} ${ev(n)}</p>`).join('')}`}).join('')}</div>
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
 clock:['workout','',1,1,null,()=>{S.wheel=12;clockSheet()}],plates:['workout','',1,1,null,()=>plateSheet(0)],rest:['workout','',1,1,null,restSheet],
 'workout-swipe':['workout','',1,1,null,()=>{const r=$$('.exb[data-ex="barbell-row"] .sws')[1];r.scrollIntoView({block:'center'});r.classList.add('open')}],
 'workout-set-undo':['workout','',1,1,null,()=>{const r=$$('.exb[data-ex="barbell-row"] .sws')[1];r.scrollIntoView({block:'center'});DEL.set(r)}],
 'workout-ex-swipe':['workout','',1,1,null,()=>{const r=$('.exb[data-ex="barbell-row"] .swh');r.scrollIntoView({block:'center'});r.classList.add('open')}],
 'workout-menu':['workout','',1,1,null,()=>exMenu(1)],
 'workout-notes':['workout','',1,1,()=>{const a=ld(LSN,{});a['barbell-bench-press']=a['barbell-bench-press']||'Pause 1 s on the chest · feet flat, butt down';sv(LSN,a);WK.notes['barbell-row']='Lower back a bit tight today, strict reps'}],
 'workout-note-sheet':['workout','',1,1,()=>{WK.notes['barbell-row']='Lower back a bit tight today, strict reps'},()=>notesSheet(1)],
 'workout-swap':['workout','',1,1,null,()=>wSwap(0)],
 'train-start':['train','train',0,0,null,()=>{const b=$('.rt.act [data-act=start]');b&&b.click()}],
 bar:['log','log',0,1],'bar-trash':['log','log',0,1,null,trashSheet],
 finish:['finish','',1,0],'finish-ape':['finish','',1,0,null,()=>{const c=$('#fincards');c.style.scrollBehavior='auto';c.scrollLeft=c.scrollWidth}],
 empty:['empty','',1,1,()=>{SC.day='sat';startWorkout('Empty workout',[],{empty:true})}],tray:['empty','',1,1,null,traySheet],'tray-legs':['empty','',1,1,()=>{SC.note="Coach's case: PPL intermediate legs day (Fri), no goals, bias or favorites";PREFS_OVR.p={goals:[],bias_muscles:[],favorites:[]}},traySheet],'tray-lib':['empty','',1,1,()=>{TF.mode='lib'},traySheet],'tray-sort-fat':['empty','',1,1,()=>{TF.mode='fat'},traySheet],'tray-sort-stim':['empty','',1,1,()=>{TF.mode='stim';TF.mus='hamstrings'},traySheet],
 'tray-detail':['empty','',1,1,null,()=>{traySheet();setTimeout(()=>exDetail('barbell-bench-press',{onAdd:()=>toast('Added to workout')}),60)}],
 'progress-items':['progress','progress',0,0,null,()=>{const e=$('.pitems');if(e)e.scrollIntoView({block:'start'})}],
 'progress-explain':['progress','progress',0,0,null,()=>explainSheet('load_trend')],
 'tray-calf':['empty','',1,1,()=>{Object.assign(SC,{board:BOARDS.legsGap,day:'mon',cands:BOARDS.legsGapCands,note:"Coach's calf-gap case: legs-only week, calves at 3 of 5 sets"});PREFS_OVR.p={goals:[],bias_muscles:[],favorites:[]}},traySheet],
 'swap-lat-home':['build','build',0,0,()=>{SC.board=[];SC.note='Lat pulldown swap with the Home template ticked (adjustable dumbbells, bench, pull-up bar, bands).';PREFS_OVR.p={goals:[],bias_muscles:[],favorites:[],gym_profile:RD.rules.equipment_items.example_profiles.home}},()=>swapSheet('lat-pulldown',{n:6,debug:1})],
 'swap-lat-com':['build','build',0,0,()=>{SC.board=[];SC.note='Lat pulldown swap with the Commercial template ticked.';PREFS_OVR.p={goals:[],bias_muscles:[],favorites:[],gym_profile:RD.rules.equipment_items.example_profiles.commercial}},()=>swapSheet('lat-pulldown',{n:6,debug:1})],
 'swap-a':['build','build',0,0,()=>{SC.day='mon';SC.note='Worked example (a): no goals, bias or favorites. PPL intermediate push day.';PREFS_OVR.p={goals:[],bias_muscles:[],favorites:[]}},()=>swapSheet('barbell-bench-press',{n:8,debug:1})],
 'swap-b':['build','build',0,0,()=>{SC.day='mon';SC.note='Worked example (b): Machine Chest Press is a favorite (+0.10, margin 0.10).';PREFS_OVR.p={goals:[],bias_muscles:[],favorites:['machine-chest-press']}},()=>swapSheet('barbell-bench-press',{n:8,debug:1})],
 'swap-c':['build','build',0,0,()=>{SC.day='mon';SC.note='Worked example (c): goal Longevity & joint-friendly.';PREFS_OVR.p={goals:['joint_friendly'],bias_muscles:[],favorites:[]}},()=>swapSheet('barbell-bench-press',{n:8,debug:1})],
 'swap-d':['build','build',0,0,()=>{SC.day='mon';SC.note='Worked example (d): bias upper chest; incline presses count as related pattern.';PREFS_OVR.p={goals:[],bias_muscles:['chest_upper'],favorites:[]}},()=>swapSheet('barbell-bench-press',{n:8,debug:1})],
 log:['log','log'],'log-month':['log','log',0,0,null,monthSheet],'log-edit':['log','log',0,0,null,()=>editSheet(15)],'log-add':['log','log',0,0,()=>{S.logSel=14},()=>editSheet(14)],
 'log-detail':['logDay','log',0,0,()=>{S.logDay=15}],'log-detail-edit':['logDay','log',0,0,()=>{S.logDay=15},()=>editSheet(15)],
 'log-detail-tip':['logDay','log',0,0,()=>{S.logDay=15},()=>{const h=$$('#e1card .ehit').find(c=>c.dataset.day==='15');h&&h.dispatchEvent(new MouseEvent('click',{bubbles:true}))}],
 'log-swipe':['log','log',0,0,null,()=>{const r=$$('#view .swipe')[0];r&&r.classList.add('open')}],
 build:['build','build',0,0,()=>{SC.day='mon'}],'build-list':['buildList','build',0,0,()=>{SC.day='mon'}],swap:['build','build',0,0,()=>{SC.day='mon'},()=>swapSheet('barbell-bench-press')],'swap-curl':['build','build',0,0,()=>{SC.day='mon'},()=>swapSheet('ez-bar-curl')],
 settings:['settings','build'],'settings-equip':['settings','build',0,0,null,equipSheet],progress:['progress','progress',0,0,()=>{S.pmus=null}],'progress-muscle':['progress','progress',0,0,()=>{S.pmus='chest'}],'progress-refine':['progress','progress',0,0,()=>{S.pmus=null},()=>{const e=$('#prefs');if(e)$('#view').scrollTop=e.offsetTop-60}],style:['style','build'],
 learn:['learn',''],'tray-fav':['empty','',1,1,()=>{TF.fav=true},traySheet],'settings-favs':['settings','build',0,0,null,()=>{$('#view').scrollTop=$('#favs').offsetTop-60}],'settings-goals':['settings','build',0,0,null,()=>{$('#view').scrollTop=$('#profile').offsetTop-40}],'learn-fundamental':['learnFund',''],
};
const AFTER={logDay:afterLogDay,train:afterTrain,workout:afterWorkout,finish:afterFinish,log:afterLog,buildList:afterBuildList,progress:afterProgress,learn:afterLearn};
let NAV=0;
function go(h){if(location.hash===h)route();else location.hash=h}
function route(){
  let r=(location.hash||'#train').slice(1),def=ROUTES[r],arg=null;
  if(!def&&/^learn-ex-/.test(r)){def=['learnEx',''];arg=r.slice(9)}
  else if(!def&&/^learn-f-/.test(r)){def=['learnFund',''];arg=r.slice(8)}
  else if(!def&&/^learn-/.test(r)){def=['learnMuscle',''];arg=r.slice(6)}
  else if(!def&&/^log-d\d+$/.test(r)){const n=+r.slice(5);def=['logDay','log',0,0,()=>{S.logDay=n}]}
  if(!def){r='train';def=ROUTES.train}
  const [scr,tab,full,sess,pre,post]=def;
  closeAll();if(AF){AF.classList.remove('active');AF=null}
  S.pick=null;S.wheel=0;if(tab)S.tab=tab;
  if(sess)S.session=true;else if(NAV===0)S.session=false;  // a cold-loaded route shows the state it names
  if(sess&&!S.live&&!S.demo&&scr!=='empty')demoWorkout();   // cold-loaded mid-workout routes = the demo; a real Start resets to 0:00
  SC={board:BOARDS.ppl,day:'fri',cands:null,note:''};PREFS_OVR.p=null;TF={q:'',mus:null,pat:null,eq:null,fav:false,mode:'sug'}; // per-route ranking scenario
  if(scr==='finish'){FIN=finBuild(NAV===0);S.live=false;S.demo=false}
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
  const xp=e.target.closest('[data-xpl]');if(xp){e.preventDefault();return explainSheet(xp.dataset.xpl)}
  const ref=e.target.closest('[data-ref]');if(ref){e.preventDefault();return refSheet(ref.dataset.ref)}
  const fld=e.target.closest('.fld');if(fld&&!fld.classList.contains('demo')){focusField(fld);return}
  const g=e.target.closest('[data-go]'),a=e.target.closest('[data-act]');
  if(a&&(!g||g.contains(a))){const k=a.dataset.act,id=a.dataset.id;
    if(k==='trash'){e.stopPropagation();return trashSheet()}
    if(k==='pick'){const r=ROUTINES.find(x=>x.id===id);if(r.active&&!S.pick)return;S.pick=(S.pick===id||r.active)?null:id;
      $$('.rt').forEach(el=>{const on=S.pick?el.dataset.rt===S.pick:el.classList.contains('act');el.classList.toggle('open',on);el.classList.toggle('closed',!on)});
      if(S.pick)setTimeout(()=>{const el=$(`.rt[data-rt=${S.pick}]`);$('#view').scrollTo({top:el.offsetTop-70,behavior:'smooth'})},280);return}
    if(k==='start'){const r=ROUTINES.find(x=>x.id===id)||ROUTINES[0],di=S.day[r.id]??(r.active?r.next:0),d=r.days[di];
      startWorkout(d.n,d.ex,{sub:`${r.name} · Day ${di+1}`,ref:{rid:r.id,di}});return go('#workout')}
    if(k==='sundo'){const f=SUF;hideSnack();if(f)f();return}
    if(k==='theme'){const t=setTheme(a.dataset.v);$$('#themeseg button').forEach(b=>b.classList.toggle('on',b.dataset.v===t));return}
    if(k==='unit'){S.unit=a.dataset.v==='kg'?'kg':'lb';try{localStorage.setItem(UNIT_K,S.unit)}catch(x){}$$('#unitseg button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.unit));return toast(`Units: ${S.unit}`)}
    if(k==='papply')return progApply(a.dataset.k);if(k==='pundo')return progUndo(a.dataset.k);
    if(k==='psee'){const el=$('#pref-'+a.dataset.k);if(el){el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1200)}return}
    if(k==='notes')return notesSheet(+a.dataset.xi);if(k==='exmenu')return exMenu(+a.dataset.xi);if(k==='wswap')return wSwap(+a.dataset.xi);
    if(k==='activate'){const r=ROUTINES.find(x=>x.id===id);ROUTINES.forEach(x=>x.active=false);r.active=true;r.next=0;S.pick=null;ROUTINES.sort((x,y)=>y.active-x.active);render();return toast(`${r.name} is now active`)}
    if(k==='minimize'){S.session=true;return go('#train')}
    if(k==='clock')return clockSheet();if(k==='plates')return plateSheet(a.dataset.xi!=null?+a.dataset.xi:0);if(k==='swap')return swapSheet(id);if(k==='tray')return traySheet();if(k==='equip')return equipSheet();
    if(k==='info'||k==='exinfo')return go('#learn-ex-'+id);if(k==='fav'){e.stopPropagation();return toggleFav(id)}if(k==='back')return NAV>1?history.back():go('#train');
    if(k==='restsheet'){if(!e.target.closest('button'))restSheet();return}
    if(k==='rest-'){WK.rest.left=Math.max(0,WK.rest.left-15);return paintTime()}if(k==='rest+'){WK.rest.left+=15;WK.rest.total=Math.max(WK.rest.total,WK.rest.left);return paintTime()}
    if(k==='skip'){WK.rest.left=0;return paintTime()}
    if(k==='ck'){const r=a.closest('.srow');r.classList.toggle('done');const st=((WK.ex[+r.dataset.xi]||{}).sets||[])[+r.dataset.si];if(st)st.done=r.classList.contains('done');
      if(r.classList.contains('done')){$$('.fld',r).forEach(f=>{if(!f.value)f.value=f.placeholder;f.classList.remove('auto');syncField(f)});const ex=WK.ex[+r.dataset.xi];
        WK.restLab=ex?`${(RD&&RD.EX[ex.id]&&RD.EX[ex.id].short_name)||exNameP(ex.id)} set ${ex.sets.slice(0,+r.dataset.si+1).filter(x=>!x.warm).length}`:'';WK.rest.left=WK.rest.total=180;const l=$('.rlb');if(l)l.textContent='Rest · '+WK.restLab;paintTime()}renderBar();return}
    if(k==='addset'){const xi=+a.dataset.xi,ex=WK.ex[xi];if(!ex)return;const last=ex.sets[ex.sets.length-1]||{};ex.sets.push({p:'',wv:last.wv||'',wu:last.wu,wauto:!!last.wv});renderEx(xi);return}
    if(k==='day'){const d=+a.dataset.d;S.logSel=d;$$('.cd').forEach(c=>c.classList.toggle('sel',+c.dataset.d===d));return LOGS[d]?go('#log-d'+d):editSheet(d)}
    if(k==='edit'||k==='ledit')return editSheet(+a.dataset.d);if(k==='month')return monthSheet();
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
window.SB={sheet,S,WK,CLK,ROUTINES,closeAll,startWorkout,gymPlates,plateCalc,movePat,mpDefs,eqDefs,passF,get sheets(){return SHEETS},get keypad(){return KP}};
// internals for board.js (the Build whiteboard): same sheet, swap sheet, ranking scenario, muscle map, volume_bands
window.SBX={BAND,hlLevel,logApi:{load:()=>logLoad(),get h(){return LOGH},get pr(){return LPR},LOGS,LOG_K,LSO:'apechit.sb.wkOrder'},cvt,uTxt,setTheme,getTheme,isDark,progressData,V,AFTER,ROUTES,ROUTINES,S,sheet,closeAll,toast,go,render,swapSheet,bindSwipes,I,header,bookBtn,gearBtn,CHEV,gl,GLY,EX,ML,exNameP,exSub,whyR,starBtn,isFav,map,vStat,volFill,IN_DARK,kchip,itemDef,explainSheet,ibtn,learnGo,exDetail,exdLoad,sortHtml,sortIds,sortMode,sortNote,SORTS,VB,VFILL,VLAB,volLegend,filterHtml,passF,movePat,mpDefs,startWorkout,
  get RD(){return RD},get WK(){return WK},get FIN(){return FIN},prefs:()=>prefs(),setSC:o=>{SC=Object.assign({board:BOARDS.ppl,day:'fri',cands:null,note:''},o)},get SC(){return SC},get NAV(){return NAV}};
window.addEventListener('hashchange',route);
Promise.all([loadVB(),loadRank()]).finally(()=>{startTick();route()}); // first paint after rules.json (volume_bands, ranking) is in
})();
