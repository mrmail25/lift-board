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
 edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',trash:'<path d="M4 6.5h16M9 6.5V4.8c0-.7.5-1.3 1.2-1.3h3.6c.7 0 1.2.6 1.2 1.3v1.7M6 6.5l.9 12.6c.1 1 .9 1.9 2 1.9h6.2c1.1 0 1.9-.9 2-1.9L18 6.5M10 10.5v6M14 10.5v6"/>',
 chevD:'<path d="M6 9.5l6 6 6-6"/>',chevL:'<path d="M15 5l-7 7 7 7"/>',chevR:'<path d="M9 5l7 7-7 7"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 camera:'<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3a1 1 0 0 1 1 1V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9.5a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
 image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
 film:'<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
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
   {p:'135 × 8',warm:true,done:true,wv:'135',rv:'8'},{p:'225 × 8',done:true,wv:'230',rv:'8',rir:2},{p:'225 × 8',done:true,wv:'230',rv:'7',rir:1},{p:'225 × 7'}]},
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
const TODAY=24; // the storyboard's today: Sat Oct 24, 2026 (as_of of the shared sample log)
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
// volume status names = the Weekly sets row labels. Coach's colours (progcheck col): in range G; up to 2 sets under the minimum or
// up to 25% over the maximum A ("Close, under" / "Close, over"); beyond that R. Maps keep close-under grey (under is a range colour).
const VLAB={under:'Under',in:'In range',amber:'Close, over',red:'Over max','close-under':'Close, under','close-over':'Close, over',over:'Over max'};

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
// Visible / aria name of the Learn page is "Nerd Sh*t" (Mr Dude); routes (#learn…), ids, data-x=learn and storage keys keep 'learn'.
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
const bookBtn=`<button class="ibtn" data-go="#learn" aria-label="Nerd Sh*t">${I('book',1.7)}</button>`;
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
  `<div class="hello sub">Saturday, October 24</div>${trainDeloadHtml()}
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
// Effort (piece A): optional one-tap RIR per set, stored as set.rir (0-4, 4 = 4+, null when skipped); Settings can show RPE instead
// (display/input only, RPE = 10 - RIR, logic/effort.js). The picker opens under the set just ticked; ignoring it leaves rir null.
const EFF_K='apechit.sb.effortScale',effMode=()=>{try{return localStorage.getItem(EFF_K)==='rpe'?'rpe':'rir'}catch(e){return 'rir'}};
const EFF=()=>window.EFFORT||{clampRir:v=>v==null?null:Math.max(0,Math.min(4,Math.round(+v))),chips:()=>[0,1,2,3,4].map(r=>({rir:r,label:r===4?'4+':String(r)})),label:r=>r==null?'':`RIR ${r===4?'4+':r}`,short:r=>r==null?'':String(r)};
function rirPick(xi,si){const st=((WK.ex[xi]||{}).sets||[])[si]||{},m=effMode(),v=EFF().clampRir(st.rir);
  return `<div class="rirp" data-xi="${xi}" data-si="${si}" role="group" aria-label="${m==='rpe'?'RPE':'Reps in reserve'} (optional)"><span class="rirl">${m==='rpe'?'RPE':'RIR'}</span>${EFF().chips(m).map(c=>`<button type="button" class="rirc${v===c.rir?' on':''}" data-act="rir" data-v="${c.rir}" aria-pressed="${v===c.rir}">${c.label}</button>`).join('')}<span class="rirh">optional</span></div>`}
const rirMini=(s,xi,si)=>{const v=EFF().clampRir(s.rir);return s.done&&v!=null?`<button type="button" class="rirm" data-act="rirOpen" data-xi="${xi}" data-si="${si}">${EFF().label(v,effMode())}</button>`:''};
function rirClose(){$$('.rirp').forEach(x=>{const xi=+x.dataset.xi,si=+x.dataset.si,o=((WK.ex[xi]||{}).sets||[])[si],sw=x.previousElementSibling,pv=sw&&$('.srow',sw);x.remove();
  if(o&&pv&&!$('.rirm',pv))pv.insertAdjacentHTML('beforeend',rirMini(o,xi,si))});WK.rirAt=null}
function setRow(s,i,xi,si){const id=(WK.ex[xi]||{}).id,p=uP(s.p,id),wv=s.wv?cvt(s.wv,s.wu||'lb',S.unit,id):'';
  return `<div class="swipe sws" data-del="set" data-xi="${xi}" data-si="${si}"><button class="del">Delete</button><div class="in"><div class="srow sgrid ${s.done?'done':''}" data-xi="${xi}" data-si="${si}"><div class="sn ${s.warm?'w':''}">${s.warm?'W':i}</div><div class="prev">${p||'—'}</div>
    <input class="fld ${s.wauto?'auto':''}" data-kind="w" readonly inputmode="none" value="${wv}" placeholder="${(p||'').split(' × ')[0]}" aria-label="Weight (${S.unit})">
    <input class="fld" data-kind="r" readonly inputmode="none" value="${s.rv||''}" placeholder="${(p||'').split(' × ')[1]||''}" aria-label="Reps">
    <button class="ck" data-act="ck" aria-label="Done">${I('check',2.4)}</button>${WK.rirAt===`${xi}:${si}`?'':rirMini(s,xi,si)}</div></div></div>${s.done&&WK.rirAt===`${xi}:${si}`?rirPick(xi,si):''}`;
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
const FIN_DAY='2026-10-24'; // the storyboard's "today" (Sat, Oct 24; the shared sample log runs to Fri Oct 23)
let FIN=null;
const isoLocal=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return `${FIN_DAY}T${p(d.getHours())}:${p(d.getMinutes())}:00-07:00`};
function finDemoSets(){WK0.ex.forEach(x=>{const w=WK.ex.find(e=>e.id===x.id);if(!w)return;
  w.sets.forEach((s,i)=>{if(s.done)return;const m=/^(\d+(?:\.\d+)?)\s*×\s*(\d+)/.exec(s.p||'');if(!m)return;Object.assign(s,{done:true,wv:m[1],rv:m[2]})})})}
// base (demo only): a function of the saved log giving the history this session lands on (e.g. #finish-plates2: a log before the first 225 bench)
function finBuild(cold,tweak,base){if(cold){Object.assign(WK,JSON.parse(JSON.stringify(WK0)));delete WK.deload;finDemoSets();tweak&&tweak()}
  const u=S.unit,sid='fin',H=base?base(logLoad()):logLoad(),L=v=>v==null||v===''||isNaN(+v)?0:+v,num=(s,id)=>{const v=L(s.wv);return (s.wu||'lb')===u?v:(s.wu||'lb')==='lb'?v/KG_LB:v*KG_LB};
  const st=cold?`${FIN_DAY}T18:12:00-07:00`:isoLocal(CLK.start),min=cold?58:Math.max(1,Math.round(WK.elapsed/60)),en=cold?isoPlus(st,58):isoLocal(Date.now());
  const ses={id:sid,schema:2,status:'completed',date:st,startedAt:st,endedAt:en,unit:u,label:WK.title||'Workout',notes:'',...(WK.deload===true?{deload:true}:{}),snapshot:{exercises:WK.ex.map(x=>({exerciseId:x.id,sets:x.sets.length}))}},ents=[],sets=[];
  WK.ex.forEach((x,o)=>{const done=x.sets.filter(s=>s.done&&L(s.rv)>0);if(!done.length)return;const eid=`${sid}-e${o}`;ents.push({id:eid,sessionId:sid,order:o,exerciseId:x.id,skipped:false,notes:''});
    done.forEach((s,i)=>sets.push({id:`${eid}-t${i}`,entryId:eid,idx:i,kind:s.warm?'warmup':'working',load:+nfmt(num(s,x.id)),reps:L(s.rv),rir:EFF().clampRir(s.rir),done:true}))});
  const X={...H,sessions:[...H.sessions,ses],entries:[...H.entries,...ents],sets:[...H.sets,...sets]};
  return {ses,ents,sets,X,min,cold,H0:base?H:null}}
// run fn with LOGH = the log plus this session (sesMus / e1Chart / entsOf read the global)
function withFin(fn){const keep=LOGH;LOGH=FIN.X;try{return fn()}finally{LOGH=keep}}
const kgOf=(load,unit)=>unit==='kg'?+load:+load/KG_LB,inU=(v,unit)=>unit===S.unit?v:unit==='lb'?v/KG_LB:v*KG_LB;
function finStats(){const F=FIN,H=F.X,u=S.unit,W=F.sets.filter(x=>x.kind==='working'),vol=W.reduce((a,x)=>a+x.load*x.reps,0);
  const prev=H.sessions.filter(s=>s.status==='completed'&&s.id!==F.ses.id&&s.startedAt<F.ses.startedAt).sort((a,b)=>a.startedAt<b.startedAt?-1:1);
  const eS=entSid(H),work=sid=>H.sets.filter(x=>eS.get(x.entryId)===sid&&x.kind==='working'&&x.done&&x.reps>0);
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
     ${ladRankUpHtml()}<ul class="facts">${facts.map(f=>`<li>${f}</li>`).join('')}</ul></article>`,
   `<article class="fc" data-card="prs"><div class="eyebrow">Personal records</div><h2>${nPR?`${nPR} lift${nPR>1?'s':''} with a PR`:'No PRs today'}</h2>${prRows||`<p class="sub">No set beat your logged bests by more than Coach's tie margin (half a load step or 1%).</p>`}
     <p class="foot fpad">PRs use the same rules as the Log.</p></article>`,
   `<article class="fc" data-card="vs"><div class="eyebrow">vs last time</div><h2>${cmpN?`Up on ${up} of ${cmpN}`:'Nothing to compare yet'}</h2>
     ${T.cmp.map(c=>`<div class="cmp" data-ex="${c.id}"><div class="grow"><b>${exNameP(c.id)}</b><span class="num">${nfmt(c.now.l)} × ${c.now.reps}${c.first?' · first time logged':` · was ${nfmt(c.was.l)} × ${c.was.reps} on Oct ${c.when}`}</span></div><span class="dl ${c.first?'flat':c.c}">${c.first?'new':c.txt}</span></div>`).join('')}
     <p class="foot fpad">Best working set (heaviest, then most reps) against the last session that had the lift.${T.lastVol!=null?` Volume ${fmtVol(T.vol)} vs ${fmtVol(T.lastVol)} ${u}.`:''}</p></article>`,
   `<article class="fc" data-card="map"><div class="eyebrow">Muscles worked</div><h2>${T.sets} hard sets</h2><div class="mapcard finmap" data-role="${Object.entries(role).map(([m,k])=>m+':'+k).join(' ')}"><div class="maps">${map('front',rvm)}${map('back',rvm)}</div><div class="legend">${hlLegend()}</div></div>
     ${mw.slice(0,5).map(([m,n])=>`<div class="mw"><span>${ML[m]||m}</span><i style="--w:${Math.min(1,n/Math.max(1,mw[0][1]))*100}%"></i><b class="num">${+n.toFixed(1)}</b></div>`).join('')}
     <p class="foot fpad">Map: each muscle's biggest role in today's exercises. Bars: effective sets, the same model as Build's Day map (helper muscles count as partial sets).</p></article>`,
   `<article class="fc" data-card="e1"><div class="eyebrow">Strength trend</div><h2>Estimated 1RM vs your best</h2>${withFin(()=>e1Chart(F.ses.id))}</article>`,
   `<article class="fc ape" data-card="ape"><div class="ape-slot"><div class="logo-tile"></div></div><div class="eyebrow">Ape says</div><h2>Ape humor goes here</h2>
     <p class="sub">Placeholder card. The lines come later. Hidden when Settings › Ape humor is off.</p></article>`];
  return `<div class="fin" data-vs="${vsCls}">
  <div class="fin-top"><span class="eyebrow">${dayLong(F.ses.startedAt)}</span><button class="btn plain" data-go="#log">Done</button></div>
  <div class="fin-cards noswipe" id="fincards">${cards.join('')}</div><div class="pdots fin-dots">${cards.map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div>
  <div class="fin-act"><button class="btn ink block" data-go="#log">Save to Log</button></div></div>`};
function afterFinish(){showPlateMoment();const c=$('#fincards');c.addEventListener('scroll',()=>{const i=Math.round(c.scrollLeft/(c.children[0].offsetWidth+12));$$('.fin-dots i').forEach((d,j)=>d.classList.toggle('on',j===i))},{passive:true});}

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
// tray search: live, case- and accent-insensitive; every typed word must appear in the name, short name or aliases
// (exercises.json has no alias field yet; short_name is the alias today, and aliases/alias arrays are picked up if Coach adds them)
const fold=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const HAY={};const hayOf=id=>HAY[id]||(HAY[id]=(()=>{const r=(RD&&RD.EX[id])||{},e=EX[id]||{};return ' '+fold([e.name,r.name,r.short_name,...[].concat(r.aliases||[],r.alias||[])].filter(Boolean).join(' | '))+' '})());
const qMatch=(id,q)=>{const w=fold(q).split(' ').filter(Boolean);if(!w.length)return true;const h=hayOf(id);return w.every(x=>h.includes(x))};
function trayList(){
  // search + filters are hard filters in both modes; what passes them goes to rank('tray', candidates)
  const ids=EXL.map(x=>x[0]).filter(id=>{const e=EX[id];return e&&(!TF.fav||isFav(id))&&passF(TF,id)&&qMatch(id,TF.q)});
  const md=sortMode(TF.mode,TF.mus),sug=md==='sug'&&RD,cands=SC.cands?SC.cands.filter(i=>ids.includes(i)):ids;
  const rows=sug?rk('tray',cands,{},null):(RD?sortIds(ids,md,TF.mus):ids).map(id=>({id}));
  const row=r=>{const id=r.id,e=EX[id];return `<div class="row trow" data-id="${id}">${gl(id)}<div class="grow"><div class="t1">${exNameP(id)}${isFav(id)?' <span class="fv">★</span>':''}</div><div class="t2">${exSub(id)} · ${e.eq}</div>${r.reasons?whyR(r):''}</div>${starBtn(id)}<button class="ib-i" data-act="exinfo" data-id="${id}" aria-label="Info">${I('info',1.7)}</button><button class="addc" data-act="add" aria-label="Add">${I('plus',2.2)}</button></div>`};
  const hid=sug?cands.length-rows.length:0;
  if(!rows.length)return `<div class="tcount">0 exercises</div><div class="tnone">${TF.q?`No exercises match “${esc(TF.q.trim())}”`:'No exercises match these filters'}${anyF(TF)?'<br><button class="btn plain sm" data-x="reset">Clear search and filters</button>':''}</div>`;
  return `<div class="tcount">${rows.length} exercise${rows.length===1?'':'s'}${sug?` · ranked for ${({mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'})[SC.day]||'today'}${hid?` · ${hid} hidden (on this day or not in your gym)`:''}`:` · ${sortNote(md,TF.mus)}`}</div>${SC.note?`<div class="scnote">${SC.note}</div>`:''}<div class="group">`+rows.slice(0,80).map(row).join('')+'</div>';
}
function traySheet(){
  const s=sheet({title:'Add exercise',cls:'tall grouped',right:`<button class="btn plain" data-x="close">Done</button>`,
    body:`<div class="srch"><span>${I('search',2)}</span><input id="tq" type="search" placeholder="Search ${EXL.length} exercises" value="${esc(TF.q)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search exercises"><button class="srx" data-x="clr" aria-label="Clear search" ${TF.q?'':'hidden'}>${I('x',2.4)}</button></div>
    <div id="tmode">${sortHtml(TF.mode,TF.mus,'m')}</div>
    <div class="tftop"><button class="chip xs ${TF.fav?'on':''}" data-f="fav" data-v="true"><span class="fv">★</span> Favorites</button><button class="btn plain sm treset" data-x="reset" ${anyF(TF)?'':'disabled'}>Reset</button></div>
    <div id="tfb">${filterHtml(TF,'f')}</div>
    <div class="tlist">${trayList()}</div>`});
  const upd=()=>{$('.tlist',s.el).innerHTML=trayList();$('.srx',s.el).hidden=!TF.q;$('[data-x=reset]',s.el).disabled=!anyF(TF);$('#tmode',s.el).innerHTML=sortHtml(TF.mode,TF.mus,'m')};
  s.el.addEventListener('click',e=>{const md=e.target.closest('#tmode [data-m]');if(md){if(md.disabled)return;TF.mode=md.dataset.m;upd();return}
    const inf=e.target.closest('[data-act=exinfo]');if(inf){e.preventDefault();e.stopPropagation();return exDetail(inf.dataset.id,{onAdd:()=>toast('Added to workout')})}
    const tr=e.target.closest('.trow[data-id]');if(tr&&!e.target.closest('button')){return exDetail(tr.dataset.id,{onAdd:()=>toast('Added to workout')})}
    const f=e.target.closest('[data-f]');if(f){if(f.dataset.f==='fav'){TF.fav=!TF.fav;f.classList.toggle('on',TF.fav);upd();return}TF[f.dataset.f]=TF[f.dataset.f]===f.dataset.v?null:f.dataset.v;
      $$(`[data-f=${f.dataset.f}]`,s.el).forEach(c=>c.classList.toggle('on',TF[c.dataset.f]===c.dataset.v));upd();return}
    if(e.target.closest('[data-x=clr]')){TF.q='';const q=$('#tq',s.el);q.value='';q.focus();upd();return}
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
    <div class="cal-f"><span><i class="k1"></i>Workout</span><span><i class="k2"></i>Today</span><span class="num">${calFoot(oct)}</span></div></div>`;
}
// ---- 6b. Log data (piece B): ONE shared sample history, Coach's data/sample-log.json (PHUL intermediate 4-day, Aug 3 to Oct 24, lb,
// sessions / entries / sets in the logger shape). Log (October view), Finish and Progress all read it. Sets carry no sessionId:
// a set joins its session through entryId -> entries[].sessionId (entSid). Edits are saved to localStorage apechit.sb.log.v2;
// the v1 key (the old generated October fixture) is dropped on first load (reset, its shape is not the shared log's).
// PRs = logic/prs.js (port of Coach's prs.py detect_prs, diffed in test/prs.diff.js) over the whole history, recomputed after every edit.
const LOG_K='apechit.sb.log.v2',LOG_K1='apechit.sb.log.v1';
const isoPlus=(st,min)=>new Date(Date.parse(st)+min*6e4-7*36e5).toISOString().slice(0,16)+':00-07:00'; // Oct 2026 is PDT (UTC-7)
const entSid=H=>new Map((H.entries||[]).map(e=>[e.id,e.sessionId])),setSid=(H,x)=>(H.entries.find(e=>e.id===x.entryId)||{}).sessionId;
let LOGH=null,LPR={},LOGV=0;   // LOGV: bumped on every saved edit (Progress cache key)
function sampleLog(){const H=RD&&RD.SLOG;return H?JSON.parse(JSON.stringify(H)):{schema:2,settings:{unit:'lb'},sessions:[],entries:[],sets:[],bodyweights:[]}}
function logLoad(){if(!LOGH){try{localStorage.removeItem(LOG_K1)}catch(e){}const s=ld(LOG_K,null);LOGH=s&&s.schema===2&&Array.isArray(s.sessions)&&Array.isArray(s.sets)&&Array.isArray(s.entries)?s:sampleLog()}
  if(!LOGH.sessions.length&&RD&&RD.SLOG&&!ld(LOG_K,null))LOGH=sampleLog();logDerive();return LOGH}
const logSave=()=>{sv(LOG_K,LOGH);LOGV++;logDerive()};
const sesDay=s=>+s.startedAt.slice(8,10),sesOf=sid=>LOGH.sessions.find(s=>s.id===sid),entsOf=sid=>LOGH.entries.filter(e=>e.sessionId===sid).sort((a,b)=>a.order-b.order);
const setsOfE=eid=>LOGH.sets.filter(x=>x.entryId===eid).sort((a,b)=>a.idx-b.idx),exOfE=eid=>(LOGH.entries.find(e=>e.id===eid)||{}).exerciseId;
function logDerive(){LPR=(RD&&window.PRS)?PRS.detect(RD,LOGH,{aliases:{}}):{};for(const k of Object.keys(LOGS))delete LOGS[k];const eS=entSid(LOGH);
  for(const s of LOGH.sessions){if(s.status!=='completed'||!String(s.startedAt).startsWith('2026-10'))continue;const xs=LOGH.sets.filter(x=>eS.get(x.entryId)===s.id&&x.kind==='working'&&x.done);
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
const calFoot=oct=>{if(!oct)return '0 workouts';const W=Object.values(LOGS),m=W.reduce((a,w)=>a+w.min,0);return `${W.length} workout${W.length===1?'':'s'} · ${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} m`};
const logRow=d=>{const w=LOGS[d],dt=new Date(2026,9,d),s=sesOf(w.sid),nt=(s&&s.notes)||'';return `<div class="swipe" data-d="${d}"><button class="del">Delete</button><div class="in">
  <button class="row lrow" data-go="#log-d${d}" data-d="${d}"><div class="ld"><span>${WD[(dt.getDay()+6)%7]}</span><b>${d}</b></div>
   <div class="grow"><div class="t1">${esc(w.n)}${w.pr?` <span class="badge">${w.pr} PR</span>`:''}</div><div class="t2 num">${w.min} min · ${w.sets} sets · ${volTxt(w)}</div>${nt?`<div class="t3 lnote">${esc(nt)}</div>`:''}</div>${miniMap(rampVol(sesMus(w.sid)))}${CHEV}</button></div></div>`};
// ---- Log detail (#log-d<day>): PR badges, body map, e1RM overlay chart, Edit
const PRL={weight:'Weight PR',set_volume:'Volume PR',e1rm:'Estimated 1RM PR',reps_at_load:'Rep PR'};
const hm=iso=>{let h=+iso.slice(11,13);const m=iso.slice(14,16),ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${m} ${ap}`};
const showLoad=(v,from,id)=>v===''||v==null?'—':cvt(+v,from,S.unit,id);
const kgShow=kg=>S.unit==='kg'?kg:kg*KG_LB;
// estimated 1RM per session per exercise: best working set with reps <= progress-rules e1rm.max_reps (12; supersedes logger.e1rm_max_reps 10 for
// Progress and Log charts), effective load as prs.py flatten (bodyweight share included)
const E1MAX=()=>(RD&&RD.PR2&&RD.PR2.e1rm.max_reps)||12;
function e1Table(){const fl=PROGRESS.flatten(Object.assign({},RD,{_lr:undefined,aliases:{}}),LOGH),out=[];
  for(const q of fl){const b={};for(const x of q.sets){const v=PRS.e1rmSet(RD,x.load_kg,x.reps,x.kind,E1MAX());if(v!=null)b[x.ex]=Math.max(b[x.ex]||0,v)}out.push({sid:q.s.id,day:sesDay(q.s),oct:String(q.s.startedAt).startsWith('2026-10'),best:b})}return out}
function e1Chart(sid){if(!RD||!window.PRS||!window.PROGRESS)return '<p class="foot">Chart needs the logger rules.</p>';
  const TA=e1Table(),T=TA.filter(t=>t.oct),vi=T.findIndex(t=>t.sid===sid),ai=TA.findIndex(t=>t.sid===sid);if(vi<0)return '';/* October view (the Log's month); previous best from the whole log */const exs=Object.keys(T[vi].best);if(!exs.length)return '<p class="foot">No sets of ${E1MAX()} reps or fewer with load in this workout.</p>';
  const W=340,H=176,pl=34,pr=10,pt=10,pb=22,days=T.map(t=>t.day),x0=Math.min(...days),x1=Math.max(...days),X=d=>pl+(x1>x0?(d-x0)/(x1-x0):.5)*(W-pl-pr);
  const ser=exs.map((ex,i)=>{const prev=TA.slice(0,ai).map(t=>t.best[ex]).filter(v=>v!=null),base=prev.length?Math.max(...prev):T[vi].best[ex];
    return {ex,i,base,pts:T.map(t=>t.best[ex]!=null?{day:t.day,sid:t.sid,v:t.best[ex],p:t.best[ex]/base*100}:null).filter(Boolean)}});
  const all=ser.flatMap(s=>s.pts.map(p=>p.p)),lo=Math.floor(Math.min(90,...all)/5)*5,hi=Math.ceil(Math.max(110,...all)/5)*5,Y=p=>pt+(hi-p)/(hi-lo)*(H-pt-pb);
  const grid=[lo,100,hi].map(p=>`<line x1="${pl}" x2="${W-pr}" y1="${Y(p)}" y2="${Y(p)}" class="${p===100?'g100':'gl'}"/><text x="${pl-4}" y="${Y(p)+3.5}" text-anchor="end">${p}%</text>`).join('');
  const vx=X(T[vi].day),u=S.unit;
  const lines=ser.map(s=>`<g class="ser" style="--c:var(--series-${s.i%6+1})"><polyline points="${s.pts.map(p=>`${X(p.day)},${Y(p.p)}`).join(' ')}"/>${s.pts.map(p=>`<circle class="ept${p.sid===sid?' cur':''}" cx="${X(p.day)}" cy="${Y(p.p)}" r="${p.sid===sid?4.5:3.2}"/><circle class="ehit" cx="${X(p.day)}" cy="${Y(p.p)}" r="12" data-e1="${esc(`${exNameP(s.ex)} · Oct ${p.day}: ${nfmt(kgShow(p.v).toFixed(1))} ${u} estimated 1RM · ${Math.round(p.p)}% of the previous best (${nfmt(kgShow(s.base).toFixed(1))} ${u})`)}" data-ex="${s.ex}" data-day="${p.day}" data-abs="${nfmt(kgShow(p.v).toFixed(1))}" data-unit="${u}"/>`).join('')}</g>`).join('');
  return `<div class="e1c"><svg viewBox="0 0 ${W} ${H}" class="e1svg" role="img" aria-label="Estimated 1RM over time, percent of each exercise's previous best">${grid}
     <line x1="${vx}" x2="${vx}" y1="${pt}" y2="${H-pb}" class="gnow"/>${[...new Set(days)].map(d=>`<text x="${X(d)}" y="${H-6}" text-anchor="middle" class="dx">${d}</text>`).join('')}${lines}</svg>
   <div class="ctip" id="ctip" hidden></div>
   <div class="eleg">${ser.map(s=>`<span><i style="background:var(--series-${s.i%6+1})"></i>${exNameP(s.ex)}</span>`).join('')}</div>
   <p class="foot">Estimated 1RM as % of that exercise's best before this workout. Tap a point for the value. An estimate, not a tested max.</p></div>`}
V.logDay=()=>{logLoad();const d=S.logDay,w=LOGS[d],nav=t=>`<div class="nav"><div class="l"><button class="back" data-go="#log">${I('chevL',2.4)}Log</button></div><div class="t">${t}</div><div class="r">${w?`<button class="btn plain strong" data-act="ledit" data-d="${d}">Edit</button>`:''}</div></div>`;
  if(!w)return nav('')+'<p class="foot">No workout on this day.</p>';
  const s=sesOf(w.sid),dt=new Date(2026,9,d),P=LPR[s.id]||{},vm=rampVol(sesMus(s.id)),npr=Object.values(P).reduce((a,t)=>a+Object.keys(t).length,0);
  const exHtml=e=>{const id=e.exerciseId,rec=P[id]||{},badgeSet={};for(const [k,r] of Object.entries(rec))(badgeSet[r.set_id]=badgeSet[r.set_id]||[]).push(k);let n=0;
    return `<div class="ghead gx ldx" data-ex="${id}">${gl(id)}<span class="grow">${exName(id)}</span>${Object.keys(rec).map(k=>`<span class="badge prb" data-pr="${k}">${PRL[k]}</span>`).join('')}</div>
     <div class="group lsets">${setsOfE(e.id).map(x=>`<div class="row lset${badgeSet[x.id]?' haspr':''}"><span class="sn ${x.kind==='warmup'?'w':''}">${x.kind==='warmup'?'W':++n}</span><span class="grow num">${showLoad(x.load,s.unit,id)} ${S.unit} × ${x.reps}</span>${EFF().clampRir(x.rir)!=null?`<span class="lrir num">${EFF().label(EFF().clampRir(x.rir),effMode())}</span>`:''}${badgeSet[x.id]?`<span class="badge">PR</span>`:''}</div>`).join('')}</div>`};
  return nav(`${WD[(dt.getDay()+6)%7]}, Oct ${d}`)+`<div class="ldh"><h1>${esc(s.label)}</h1><p class="sub">${hm(s.startedAt)} – ${hm(s.endedAt)} · ${w.min} min</p>
    <div class="ldstats"><div><b class="num">${w.sets}</b><span>sets</span></div><div><b class="num">${volTxt(w).split(' ')[0]}</b><span>${S.unit} volume</span></div><div><b class="num acc" title="${npr} PR badges">${w.pr}</b><span>lifts with a PR</span></div></div></div>
   <div class="ghead">Session notes</div><div class="card lnotes" data-raw>${s.notes?esc(s.notes):`<span class="sub">No notes.</span> <button class="btn plain" data-act="ledit" data-d="${d}">Add</button>`}</div>
   <div class="ghead">Muscles trained</div><div class="card mapcard ldmap"><div class="maps">${map('front',vm)}${map('back',vm)}</div><div class="legend">${rampLegend('sets this workout')}</div></div>
   <div class="ghead">Strength trend</div><div class="card" id="e1card">${e1Chart(s.id)}</div>
   ${entsOf(s.id).map(exHtml).join('')}<p class="foot">Your first workout with a lift sets its baseline. Editing a workout recalculates PRs.</p>`};
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
  const srow=(i,x,id)=>`<div class="swipe"><button class="del">Delete</button><div class="in"><div class="row er" data-kind="${x.kind}" data-rir="${EFF().clampRir(x.rir)??''}"><span class="sn">${x.kind==='warmup'?'W':i}</span>
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
      const gone=new Set(LOGH.entries.filter(x=>x.sessionId===s.id).map(x=>x.id));LOGH.sessions=LOGH.sessions.filter(x=>x.id!==s.id);LOGH.entries=LOGH.entries.filter(x=>x.sessionId!==s.id);LOGH.sets=LOGH.sets.filter(x=>!gone.has(x.entryId));logSave();toast('Workout deleted · PRs recalculated');go('#log')})});
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
      LOGH.sets.push({id:`${eid}-x${idx}`,entryId:eid,idx:idx++,kind:r.dataset.kind||'working',load:wv===''?0:+wv,reps:Math.trunc(+rv||0),rir:EFF().clampRir(r.dataset.rir),done:true})}}
  logSave();const n=Object.values(LPR[s.id]||{}).reduce((a,t)=>a+Object.keys(t).length,0);toast(`Saved · PRs recalculated (${n} in this workout)`);return nd}
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
    <button class="ib-i" data-act="info" data-id="${e.id}" aria-label="Nerd Sh*t">${I('info',1.7)}</button><button class="ib-i" data-act="swap" data-id="${e.id}" aria-label="Swap">${I('swap',1.7)}</button></div></div></div>`).join('')}
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
    <div class="group">${alts.map(a=>`<div class="row alt" data-x="pick" data-id="${a.id}" data-score="${a.score!=null?a.score:''}" role="button" tabindex="0">${gl(a.id)}<div class="grow"><div class="t1">${exName(a.id)}</div>${exSub(a.id)?`<div class="t2">${exSub(a.id)}</div>`:''}</div><span class="altb">${starBtn(a.id)}<button class="ib-i" data-act="exinfo" data-id="${a.id}" aria-label="Nerd Sh*t">${I('info',1.7)}</button></span>
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
// a real <button>: iOS WebKit sends no click for a tap on a plain span, so the old span switches never toggled on touch
const tg=(on,id)=>`<button type="button" class="tg ${on?'on':''}" data-act="tg" ${id?`id="${id}"`:''} role="switch" aria-checked="${!!on}"></button>`;
const LV={beginner:'About 10 hard sets per muscle a week, simple full-body or upper/lower weeks. For your first year of lifting, or coming back after a long break.',
  intermediate:'About 12–16 hard sets per muscle a week with more exercise variety. For steady lifters who still add weight most months.',
  advanced:'16 or more hard sets per muscle a week and specialised splits. For experienced lifters whose progress has slowed.'};
// ---------------- Evolution ladder (logic/ladder.js = Coach's tools/evolution.py report(); data/evolution-rules.json = RD.EVO) ----------------
// Coach's optional fields: settings.profile {sex, birthDate, height{value,unit}, bodyweight{value,unit}}, settings.bodyComp {optIn, hidden},
// history.bodyComp [{date, waist{value,unit}, bfPct, bfMethod}], history.evolution.awarded {stage, tier} (never lowered; saved after a rank is shown).
// settings.ladder.hidden = the hide-all switch, display only (evolution-rules display.ladder_hidden); Settings shows labels.ladder_hidden_note while it is on.
const LADS={sig:null,res:null};
function ladSettings(){const H=logLoad(),s=H.settings||{};return {hidden:!!((s.ladder||{}).hidden),profile:Object.assign({},s.profile||{}),bodyComp:Object.assign({},s.bodyComp||{}),readings:(H.bodyComp||[]).slice()}}
function ladSet(p){const H=logLoad();H.settings=Object.assign({},H.settings||{});
  if(p.profile){const o=Object.assign({},H.settings.profile||{});for(const [k,v] of Object.entries(p.profile)){if(v==null||v==='')delete o[k];else o[k]=v}H.settings.profile=o}
  if(p.bodyComp)H.settings.bodyComp=Object.assign({},H.settings.bodyComp||{},p.bodyComp);
  if('hidden' in p)H.settings.ladder=Object.assign({},H.settings.ladder||{},{hidden:!!p.hidden});
  if(p.reading)H.bodyComp=[...(H.bodyComp||[]),p.reading];if(p.dropReading!=null)H.bodyComp=(H.bodyComp||[]).filter((_,i)=>i!==p.dropReading);logSave()}
function ladderFor(H){if(!window.LADDER||!RD||!RD.EVO)return null;const h=Object.assign({},H,{settings:Object.assign({},H.settings||{},{unit:S.unit})}),r=LADDER.report(RD,h,AS_OF);
  r.hidden_all=!!(((H.settings||{}).ladder)||{}).hidden;r.hint=LADDER.nextHint(r,RD,h);return r}
function ladderData(){const sig=JSON.stringify([LOGV,S.unit]);if(LADS.sig===sig&&LADS.res)return LADS.res;LADS.res=ladderFor(logLoad());LADS.sig=sig;return LADS.res}
// never demote: after a rank has been shown, store it (only ever raises history.evolution.awarded)
function ladPersist(){const L=ladderData();if(!L||L.hidden_all)return;const H=logLoad(),a=LADDER.rankIndex(RD.EVO,(H.evolution||{}).awarded);
  if(a==null||L.rank.index>a){H.evolution=Object.assign({},H.evolution||{},{awarded:L.awarded_out});logSave()}}
// ladder art: assets/ladder/stage-1..5.svg (CC0, Openclipart #348815 by j4p4n, see assets/ladder/LICENSES.md), drawn as a CSS mask over currentColor so
// Ember/slate/tease colours and dark mode come from the existing .lfig/.lean/.lrup rules. k 0..4 = the five stages; 5/6 (Kong/Apex) reuse Prime with a glow;
// art2: stage-1 knuckle-dragger, 2 primate (was set figure 3), 3 neanderthal (was set figure 4), 4 silverback (traced from ref/silverback-ref.jpg, sbref),
// 5 prime (bodybuilder, front double biceps, gorilla head). The hidden tier is never drawn as a figure or a lock in the strip; only the
// teaser card's lockFig() (a grey lock cut in half by the screen's right edge, see .llock) hints at it, no '???' text.
// Silverback redo: figures are keyed by STAGE ID (evolution-rules stages[].id), not by position, so reordering the ladder (e.g. Prime <-> Silverback)
// moves each figure with its stage and needs no art change. The file name is just the art's slot (stage-4.svg = the massive side-profile
// Silverback); x = drawn with the hidden-tier glow (Kong / Apex reuse the Prime art). A number is still accepted (legacy: position in the
// stock order below) for callers / tests that pass an index.
const APE_FIG={knuckle_dragger:{src:'stage-1'},primate:{src:'stage-2'},neanderthal:{src:'stage-3'},silverback:{src:'stage-4'},prime:{src:'stage-5'},kong:{src:'stage-5',x:1},apex:{src:'stage-5',x:1}};
// swap2 (ladder v2): the stock march is Knuckle-Dragger, Primate, Neanderthal, Prime, Silverback (then Kong / Apex, hidden). The strip itself
// follows evolution-rules stages[] order; this list only serves legacy numeric callers. stage-4.svg (Silverback) is drawn 414 tall, the tallest.
const APE_ORDER=['knuckle_dragger','primate','neanderthal','prime','silverback','kong','apex'];
// preload every stage-art file once at start: the figures are CSS masks, and WebKit can leave a mask unpainted when its first use is on a
// screen that never showed the strip (the finish screen's rank-up tile came out empty); a warm cache paints it on first render
const APE_SRCS=[...new Set(Object.values(APE_FIG).map(f=>f.src))];
// WebKit can leave a .afm unpainted when its CSS mask art arrives after first paint, and a plain repaint does not help (seen intermittently
// on the finish screen's rank-up tile, 58e/f). Re-spelling the same URL (assets/... <-> ./assets/...) makes WebKit resolve the mask again
// from its cache and paint it, with no flash. Run when each art file loads and shortly after every render.
const afmKick=()=>$$('.afm').forEach(m=>{const v=m.style.getPropertyValue('--afsrc');if(v)m.style.setProperty('--afsrc',v.includes('url(./')?v.replace('url(./','url('):v.replace('url(','url(./'))});
if(typeof Image!=='undefined')APE_SRCS.forEach(s=>{const im=new Image();im.decoding='async';im.onload=()=>requestAnimationFrame(afmKick);im.src=`assets/ladder/${s}.svg`});
function apeFig(k,cls=''){const id=typeof k==='string'?k:APE_ORDER[Math.max(0,Math.min(6,k|0))],f=APE_FIG[id]||APE_FIG.prime,x=!!f.x;
  return `<i class="afig${x?' afx':''} ${cls}" data-afig="${id}" data-afsrc="${f.src}" aria-hidden="true"><i class="afm" style="--afsrc:url(assets/ladder/${f.src}.svg)"></i></i>`}
// inline SVG (same path as assets/ladder/lock.svg) so it never waits on a mask load; the box is the lock's left half, the gradient runs
// lighter -> darker across that half (x2=.5), i.e. darkest at the screen edge
const LOCK_D='M8 23V15.5a12 12 0 0 1 24 0V23h-5.5v-7.5a6.5 6.5 0 0 0-13 0V23z M7 23h26a5 5 0 0 1 5 5v19a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V28a5 5 0 0 1 5-5z M20 31.5a4 4 0 0 0-2 7.46V44h4v-5.04a4 4 0 0 0-2-7.46z';let lockN=0;
const lockFig=(cls='')=>{const id='lkg'+(++lockN);return `<i class="llock ${cls}" data-llock="1" role="img" aria-label="More stages hidden"><svg viewBox="0 0 40 52" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2=".5" y1="0" y2="0"><stop offset="0" class="lk-a"/><stop offset="1" class="lk-b"/></linearGradient></defs><path fill="url(#${id})" fill-rule="evenodd" d="${LOCK_D}"/></svg></i>`};
// march strip: every revealed stage only (strip round, Mr Dude: no lock in the strip; hidden stages are simply not drawn, and the
// 'There is more past ...' teaser card below keeps its own lock)
function ladStrip(L){const cur=Math.floor(L.rank.index/3),vis=L.ladder.filter(s=>!s.hidden);
  return `<div class="lstripbox"><div class="lstrip">${vis.map((s,k)=>`<div class="lfig ${k<cur?'lf-done':k===cur?'lf-cur':'lf-next'}${k>4?' lf-hid':''}" data-lstage="${s.stage}"${k===cur?' aria-current="step"':''}>${apeFig(s.stage)}<span>${esc(s.label).replace('-','-<wbr>')}</span></div>`).join('')}</div></div>`}
const ladBar=L=>L.progress.pct==null?'':`<div class="lbar" role="progressbar" aria-label="Progress ${esc(L.labels.progress)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${L.progress.pct}"><i style="width:${L.progress.pct}%"></i></div>`;
const ladProg=L=>L.progress.pct==null?esc(L.labels.progress):`${L.progress.pct}% ${esc(L.labels.progress)}`;
// swap3: Coach's percentile line under the rank ('Stronger than about 50% of lifters your size'; 'Top 3% …' at Apex); none when report gives none
const ladPct=L=>L.labels.percentile?`<p class="lpct" data-lpct="${L.percentile&&L.percentile.overall?L.percentile.overall.band:''}">${esc(L.labels.percentile)}</p>`:'';
const ladRev=L=>L.labels.revealed.map(t=>`<div class="lrev" data-lrev="1">${esc(t)}</div>`).join('');
function ladCard(){const L=ladderData();if(!L||L.hidden_all)return '';setTimeout(ladPersist,0);
  return `<button type="button" class="card lcard" data-go="#ladder" data-ladcard="1" aria-label="Evolution ladder: ${esc(L.rank.label)}">${ladStrip(L)}
   <div class="ladrow"><div class="grow"><div class="eyebrow">Evolution ladder</div><b class="lrank" data-lrank="${L.rank.id}">${esc(L.rank.label)}</b></div>${CHEV}</div>${ladRev(L)}
   ${ladPct(L)}${ladBar(L)}<div class="lsub"><span class="num">${ladProg(L)}</span></div>${L.hint?`<div class="lnext">Next: ${esc(L.hint.text)}</div>`:''}${L.labels.table?`<p class="lnote">${esc(L.labels.table)}</p>`:''}</button>`}
const PLN=n=>`${n} plate${n>1?'s':''}`;
// metric1: rep lifts show Coach's bodyweight-scaled value (4 dp in the rules) to 1 decimal on screen; whole numbers stay whole
function ladLiftRow(L,l,o,slot){const R=RD.EVO,bw=L.bodyweight_current.kg,u=L.unit,t=slot&&slot.target;
  const val=o.value==null?esc(o.label||''):o.kind==='load'?`est. 1RM ${Math.round(o.value)} ${u}${o.multiple!=null?` · ${o.multiple.toFixed(2)}× bodyweight`:''}`:o.kind==='multiple'?`${o.value.toFixed(2)}× bodyweight${o.bodyweight_kg?` · est. 1RM ${Math.round(inU(o.value*o.bodyweight_kg,'kg'))} ${u}`:''}`:`${Number.isInteger(o.value)?o.value:o.value.toFixed(1)} strict rep${o.value===1?'':'s'}${o.converted?' (incl. weighted, estimated)':''}`;
  const tg=t&&!t.met?(t.kind==='load'?(t.estimated_1rm!=null?`Next rank: est. 1RM ${t.estimated_1rm} ${t.unit}`:''):t.kind==='multiple'?(t.estimated_1rm!=null?`Next rank: est. 1RM ${t.estimated_1rm} ${t.unit}`:`Next rank: ${t.threshold}× bodyweight`):`Next rank: ${t.reps} strict reps`):t&&t.met?'Meets the next rank':'';
  return `<div class="row ladlift" data-llift="${l}"><div class="grow"><div class="t1">${esc(R.lifts[l].label)}${slot&&slot.substituted?` <span class="lsubst">stand-in</span>`:''}</div><div class="t2">${val}</div>${tg?`<div class="t2 ltg">${esc(tg)}</div>`:''}
</div>
    ${o.rank_label?`<span class="lchip st${Math.floor(o.rank_index/3)}${o.rank_hidden?' hid':''}">${esc(o.rank_label)}</span>`:'<span class="lchip none">—</span>'}</div>`}
function ladLeanRow(L){const ln=L.lean,b=L.badges.lean_prime;if(ln.status==='hidden'||ln.status==='unavailable')return '';
  if(ln.status==='not_tracked')return `<div class="row lean off" data-lean="not_tracked"><div class="grow"><div class="t1">Lean Prime</div><div class="t2">${esc(ln.label)}</div></div><button class="lk" data-go="#settings-ladder">Set up</button></div>`;
  return `<div class="row lean ${b&&b.unlocked?'on':''}${b&&b.greyed?' grey':''}" data-lean="${ln.status}"><span class="lbadge ${b&&b.unlocked?'on':''}">${apeFig('prime')}</span><div class="grow"><div class="t1">Lean Prime${b&&b.unlocked?'':b&&b.greyed?' (greyed)':''}</div><div class="t2">${esc(ln.label||'')}</div></div></div>`}
V.ladder=()=>{const L=ladderData(),nav=`<div class="nav lnavs"><div class="l"><button class="back" data-go="#progress">${I('chevL',2.4)}Progress</button></div><div class="t">Evolution ladder</div><div class="r"></div></div>`;
  if(!L)return nav+header('Evolution ladder')+`<p class="foot">The ladder needs Coach's evolution rules.</p>`;
  if(L.hidden_all)return nav+header('Evolution ladder')+`<div class="card lhidden"><b>The ladder is hidden</b><p class="sub">Turn it back on in Settings to see your rank.</p><button class="btn" data-go="#settings-ladder">Open Settings</button></div>`;
  setTimeout(ladPersist,0);const R=RD.EVO,slots=Object.fromEntries(L.progress.slots.map(s=>[s.lift,s])),core=L.progress.slots.map(s=>s.lift),extra=Object.keys(L.lifts).filter(l=>!core.includes(l)&&L.lifts[l].value!=null);
  const notes=[L.labels.substitution,L.labels.weighted,L.labels.bodyweight,L.labels.table].filter(Boolean);
  return nav+header('Evolution ladder')+`<div class="lscr"><div class="lstripw">${ladStrip(L)}</div>
   <div class="card lhero"><div class="eyebrow">Your rank</div><h2 class="lrank" data-lrank="${L.rank.id}">${esc(L.rank.label)}</h2>${ladRev(L)}${L.labels.held?`<p class="lnote" data-lheld="1">${esc(L.labels.held)}</p>`:''}
   ${ladPct(L)}${ladBar(L)}<div class="lsub"><span class="num">${ladProg(L)}</span></div>${L.hint?`<p class="lnext big" data-lnext="${L.hint.lift}">Next: <b>${esc(L.hint.text)}</b></p>`:''}</div>
   ${notes.length?`<div class="lnotes">${notes.map(n=>`<p class="lnote">${esc(n)}</p>`).join('')}</div>`:''}
   <div class="ghead">Core lifts</div><div class="group llifts">${core.map(l=>ladLiftRow(L,l,L.lifts[l],slots[l])).join('')}</div>
   ${extra.length?`<div class="ghead">Other lifts</div><div class="group llifts">${extra.map(l=>ladLiftRow(L,l,L.lifts[l],null)).join('')}</div>`:''}
   <p class="foot">${esc(R.labels.promotion_note)} Progress follows your 3rd-best lift.</p>
   ${ladLeanRow(L)?`<div class="ghead">Badges</div><div class="group">${ladLeanRow(L)}</div>`:''}
   ${L.ladder.some(s=>s.hidden)?`<div class="card ltease" data-lteaser="1"><div><b>There is more past ${esc(L.ladder.filter(s=>!s.hidden).pop().label)}</b><p class="sub">Keep climbing to find out what.</p></div>${lockFig()}</div>`:''}
   <p class="foot lsrc">${L.labels.bars?`<span data-lbars="1">${esc(L.labels.bars)}</span> `:''}${L.labels.scaled?`<span data-lscaled="1">${esc(L.labels.scaled)}</span> `:''}${esc(R.labels.model_note)} ${esc(R.labels.source_note)}</p>
   <div class="group" style="margin-top:12px"><button class="row" data-go="#settings-ladder"><div class="grow t1">Ladder settings</div>${CHEV}</button></div></div>`};
// settings: hide-all, sex, birth date, height, profile bodyweight; physique (opt-in, hide switch, readings) only when not hidden and 18+ (or age unknown)
function ladSetHtml(){const C=ladSettings(),P=C.profile,B=C.bodyComp,hu=S.unit==='kg'?'cm':'in',age=window.LADDER?LADDER.ageOf({settings:{profile:P}},AS_OF):null;
  const seg=(id,attr,opts,cur)=>`<div class="seg sm3" id="${id}">${opts.map(([v,l])=>`<button type="button" class="${(cur||'')===v?'on':''}" ${attr}="${v}">${l}</button>`).join('')}</div>`;
  const sw=(k,on,l)=>`<button type="button" class="tg ${on?'on':''}" data-lad="${k}" role="switch" aria-checked="${!!on}" aria-label="${l}"></button>`;
  const inp=(k,l,v,sfx,type='text')=>`<label class="row lin"><div class="grow t1">${l}</div><input type="${type}" ${type==='text'?'inputmode="decimal"':''} class="linp num${type==='date'?' ldate':''}" data-lpf="${k}" value="${esc(String(v??''))}" aria-label="${l}">${sfx?`<span class="val">${sfx}</span>`:''}</label>`;
  if(C.hidden)return `<div class="ghead">Evolution ladder</div><div class="group ladset"><div class="row"><div class="grow"><div class="t1">Show the ladder</div><div class="t2">Off hides it on Progress and after workouts</div></div>${sw('show',false,'Show the ladder')}</div></div><p class="foot" data-ladhidnote="1">${esc(((RD.EVO||{}).labels||{}).ladder_hidden_note||'Ladder hidden. Your rank is still tracked and is never lowered.')}</p>`;
  const L=ladderData(),ln=L&&L.lean,minor=age!=null&&age<18,bcHidden=B.hidden===true;
  const rd=C.readings.map((e,i)=>[e,i]).sort((a,b)=>a[0].date<b[0].date?1:-1).slice(0,3).map(([e,i])=>`<div class="row lrd" data-lrd="${i}"><div class="grow t1">${esc(e.date)}</div><span class="val">${[e.waist?`waist ${e.waist.value} ${e.waist.unit}`:'',e.bfPct!=null?`${e.bfPct}% (${e.bfMethod||'?'})`:''].filter(Boolean).join(' · ')}</span><button type="button" class="lk" data-lrdel="${i}" aria-label="Delete reading">Delete</button></div>`).join('');
  const phys=minor?'':`<div class="ghead">Physique (optional)</div><div class="group ladset ladphys">
     <div class="row"><div class="grow"><div class="t1">Hide physique</div><div class="t2">Hides every physique field and badge</div></div>${sw('bchide',bcHidden,'Hide physique')}</div>
     ${bcHidden?'':`<div class="row"><div class="grow"><div class="t1">Track physique</div><div class="t2">Only unlocks the Lean Prime badge. Never changes your rank.</div></div>${sw('optin',B.optIn===true,'Track physique')}</div>
     ${B.optIn===true?`${ln&&ln.label?`<div class="row"><div class="grow t2" data-llean="${ln.status}">${esc(ln.label)}</div></div>`:''}
      <div class="row lnew"><input type="date" class="linp ldate" id="lrdate" value="${AS_OF}" aria-label="Reading date"><input type="text" inputmode="decimal" class="linp num" id="lrwaist" placeholder="Waist ${hu}" aria-label="Waist ${hu}"><input type="text" inputmode="decimal" class="linp num" id="lrbf" placeholder="BF %" aria-label="Body fat %">
       <select class="linp" id="lrmeth" aria-label="Body-fat method"><option value="dexa">DEXA</option><option value="calipers">Calipers</option><option value="bia">BIA</option></select><button type="button" class="lk" data-lradd="1">Add</button></div>${rd}`:''}`}</div>
     ${bcHidden?'':`<p class="foot">Waist at the navel, standing relaxed, after a normal breath out. ${esc(RD&&RD.EVO?RD.EVO.lean.fallback.note:'')}</p>`}`;
  return `<div class="ghead">Evolution ladder</div><div class="group ladset">
   <div class="row"><div class="grow"><div class="t1">Show the ladder</div><div class="t2">Off hides it on Progress and after workouts</div></div>${sw('show',true,'Show the ladder')}</div>
   <div class="row"><div class="grow t1">Sex</div>${seg('lsexseg','data-lsex',[['','Not set'],['female','Female'],['male','Male']],P.sex||'')}</div>
   ${inp('birthDate','Birth date',P.birthDate||'','','date')}
   ${inp('height','Height',P.height&&P.height.value,(P.height&&P.height.unit)||hu)}
   ${inp('bodyweight','Bodyweight',P.bodyweight&&P.bodyweight.value,(P.bodyweight&&P.bodyweight.unit)||S.unit)}</div>
   <p class="foot">All optional, stored on this device. ${L&&L.labels.table?esc(L.labels.table)+' ':''}Bodyweight here is used only when no weigh-in is logged.</p>${phys}`}
function ladRefreshSettings(){const e=$('#ladset');if(e)e.innerHTML=ladSetHtml()}
// finish screen: a small moment only when this workout raised the shown rank
// the ladder before this session: the saved log, or a demo route's base history
const ladBefore=()=>FIN&&FIN.H0?ladderFor(FIN.H0):ladderData();
function ladRankUpHtml(){if(!FIN||!RD||!RD.EVO||!window.LADDER)return '';const b=ladBefore(),a=ladderFor(FIN.X);if(!a||a.hidden_all||!LADDER.rankUp(b,a))return '';
  return `<div class="lrup" data-rankup="${a.rank.id}">${apeFig(a.rank.stage||Math.min(6,a.rank.index/3|0))}<div class="grow"><div class="eyebrow">Rank up</div><b>${esc(a.rank.label)}</b><span>Up from ${esc(b.rank.label)}</span>${a.labels.revealed.map(t=>`<span class="lrev">${esc(t)}</span>`).join('')}</div></div>`}
// PLATE MILESTONES (Mr Dude via CoS): plate badges are the rites of passage, independent of rank. Loads and which lifts have which plates
// come from Coach's evolution-rules plate_badges (read per lift by LADDER.plateEntries). The 5-plate badges (hidden_from_plates) carry a hidden
// key: hidden:true until earned (never drawn, never hinted), then hidden:false and revealed like the others ('hidden' in b marks them).
// medals (Mr Dude, plates redo): awards appear only once earned. No unearned plate is drawn anywhere (the ladder's Plates section is gone).
// One medal per plate_badges lift (<= 4), upgraded as plates are earned: 1-4 stars on the ribbon, a gold medal once the hidden fifth is earned.
// Shown in the medal rack at the top of Progress (hidden until the first award) and in the full-screen earn moment on the finish screen.
const plateLabel=b=>{const PB=RD.EVO.plate_badges;return `${(PB.labels||{})[String(b.plates)]||PLN(b.plates)}`};
const MEDAL_RIB={bench:'#E8430C',squat:'#2F6FDB',deadlift:'#1E8E5A',ohp:'#7A4BD0'},MEDAL_SHORT={bench:'Bench',squat:'Squat',deadlift:'Deadlift',ohp:'OHP'};let medN=0;
const starD=(cx,cy,r)=>{let d='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.45:r;d+=(i?'L':'M')+(cx+q*Math.cos(a)).toFixed(2)+' '+(cy+q*Math.sin(a)).toFixed(2)}return d+'Z'};
// medalSvg(lift, stars 0-4, gold): ribbon (lift colour, stars = plates earned), ring, and a plate-shaped disc (steel, or gold for the fifth)
function medalSvg(lift,n,gold,cls=''){const id='md'+(++medN),c=MEDAL_RIB[lift]||'#8a8a8e',k=Math.max(0,Math.min(4,n|0)),sx=k?22-(k-1)*3.6:22;
  const stars=Array.from({length:k},(_,i)=>`<path class="mstar" d="${starD(sx+i*7.2,9.5,3.4)}"/>`).join('');
  return `<svg class="msvg ${cls}" viewBox="0 0 44 66" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${gold?'<stop offset="0" stop-color="#FFE49A"/><stop offset=".5" stop-color="#F4B73E"/><stop offset="1" stop-color="#B9791B"/>':'<stop offset="0" stop-color="#F4F5F7"/><stop offset=".55" stop-color="#C3C7CE"/><stop offset="1" stop-color="#8E949D"/>'}</linearGradient></defs>
    <path class="mrib" d="M6 0H38V19L22 27L6 19Z" fill="${c}"/><path d="M6 0H10V21L6 19ZM34 0H38V19L34 21Z" fill="rgba(0,0,0,.22)"/><path d="M20 0H24V26L22 27L20 26Z" fill="rgba(255,255,255,.28)"/>
    <g class="mstars${gold?' gold':''}">${stars}</g><rect x="19" y="25" width="6" height="6" rx="2" class="mring"/>
    <circle cx="22" cy="47" r="16" fill="url(#${id})" class="mdisc"/><circle cx="22" cy="47" r="11.5" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.4"/><circle cx="22" cy="47" r="7" fill="none" stroke="rgba(0,0,0,.14)" stroke-width="1"/><circle cx="22" cy="47" r="2.6" fill="rgba(0,0,0,.28)"/></svg>`}
// per lift: the earned plates (lowest first), stars = earned plates 1-4, gold = the hidden fifth earned
function medalsOf(L){if(!L||L.hidden_all||!RD.EVO.plate_badges)return [];const PB=RD.EVO.plate_badges;
  return Object.keys(PB.lifts).map(l=>{const got=L.badges.plates.filter(b=>b.lift===l&&b.earned).sort((a,b)=>a.plates-b.plates);if(!got.length)return null;
    const gold=got.some(b=>'hidden' in b),top=got[got.length-1];return {lift:l,label:RD.EVO.lifts[l].label,got,stars:got.filter(b=>!('hidden' in b)).length,gold,top}}).filter(Boolean)}
function medalRack(){const ms=medalsOf(ladderData());if(!ms.length)return '';
  return `<div class="mrack" data-mrack="${ms.length}" role="list" aria-label="Plate medals">${ms.map(m=>`<button type="button" class="medal${m.gold?' gold':''}" role="listitem" data-medal="${m.lift}" data-stars="${m.stars}" data-gold="${m.gold?1:0}" aria-label="${esc(m.label)} medal: ${esc(plateLabel(m.top).toLowerCase())}, ${m.top.load} ${m.top.unit}">${medalSvg(m.lift,m.stars,m.gold)}<span>${MEDAL_SHORT[m.lift]||esc(m.label)}</span></button>`).join('')}</div>`}
const medDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
function medalSheet(lift){const m=medalsOf(ladderData()).find(x=>x.lift===lift);if(!m)return;
  const rows=m.got.map(b=>`<div class="row mrow${'hidden' in b?' gold':''}" data-mplate="${b.plates}"><span class="mpip" aria-hidden="true">${'hidden' in b?'★':b.plates}</span><div class="grow"><div class="t1">${esc(plateLabel(b))}</div><div class="t2">${'hidden' in b?'The hidden plate':esc(m.label)}</div></div><div class="mval"><b class="num">${b.load} ${b.unit}</b><span>${medDate(b.date)}</span></div></div>`).join('');
  const sh=sheet({title:esc(m.label),right:`<button class="btn plain" data-x="close">Done</button>`,cls:'msheet',body:`<div class="mshero${m.gold?' gold':''}">${medalSvg(m.lift,m.stars,m.gold,'lg')}<b>${esc(plateLabel(m.top))} · ${m.top.load} ${m.top.unit}</b><span>${m.got.length} plate${m.got.length>1?'s':''} earned</span></div>
    <div class="group mlist" data-mlist="${lift}">${rows}</div><p class="foot fpad">Earned by a real logged set, not an estimate. Deload sessions don't count.</p>`});
  sh.el.addEventListener('click',e=>{if(e.target.closest('[data-x=close]'))sh.close()});return sh}
// newly earned plates in this workout: the saved log vs the log plus this session (deload sessions never count, as with PRs). Once the
// workout is saved, the plates are in the log, so the moment never repeats. Hidden by the ladder hide-all switch like every ladder UI.
function ladPlateUps(){if(!FIN||!RD||!RD.EVO||!window.LADDER)return [];const b=ladBefore(),a=ladderFor(FIN.X);if(!a||!b||a.hidden_all)return [];return LADDER.newPlates(b,a)}
// the earn moment: full screen over the finish screen, one per lift with a new plate (its highest new plate is the hero, lower new ones are
// 'Also' lines). The medal drops in with a short burst; Continue goes to the next lift's moment, then to the normal finish card.
// prefers-reduced-motion: a plain fade (sb.css). Shown once per finish build (FIN.momDone).
function plateMoments(){const ups=ladPlateUps(),a=ups.length?ladderFor(FIN.X):null,by={};ups.forEach(u=>(by[u.lift]=by[u.lift]||[]).push(u));
  return Object.keys(by).map(l=>{const us=by[l],u=us[0],m=medalsOf(a).find(x=>x.lift===l)||{stars:Math.min(4,u.plates),gold:false};return {lift:l,u,also:us.slice(1),stars:m.stars,gold:'hidden' in u}})}
function plateMomentHtml(M,i,n){const u=M.u,rev=M.gold,lab=esc(RD.EVO.lifts[M.lift].label);
  return `<div class="pmom${rev?' gold':''}" role="dialog" aria-modal="true" aria-label="${rev?'Hidden plate unlocked':'Plate milestone'}" data-pmom="${u.id}" data-plates="${u.plates}">
   <div class="pm-in"><div class="pm-stage"><div class="pm-halo"></div><div class="pm-burst">${Array.from({length:12},(_,k)=>`<i style="--a:${k*30}deg"></i>`).join('')}</div><div class="pm-medal">${medalSvg(M.lift,M.stars,M.gold,'xl')}</div></div>
   <div class="pm-txt"><div class="eyebrow">${rev?'Hidden plate unlocked':'Plate milestone'}</div><h2 class="pm-h"><span>${esc(plateLabel(u))} ·</span> <span>${lab} · ${u.load} ${u.unit}</span></h2>
   <p class="pm-x">${rev?'There was one more plate. Now you know.':'A real logged set, not an estimate.'}</p>${M.also.map(x=>`<p class="pm-also" data-plateup="${x.id}">Also ${esc(plateLabel(x).toLowerCase())} · ${x.load} ${x.unit}</p>`).join('')}</div>
   <div class="pm-act">${n>1?`<span class="pm-n">${i+1} of ${n}</span>`:''}<button type="button" class="btn ${rev?'gold':'accent'} block" data-pmcont="1">Continue</button></div></div></div>`}
function showPlateMoment(){$$('.pmom').forEach(e=>e.remove());if(!FIN||FIN.momDone)return;const Ms=plateMoments();if(!Ms.length){FIN.momDone=true;return}
  const i=FIN.momI||0;if(i>=Ms.length){FIN.momDone=true;return}const w=document.createElement('div');w.innerHTML=plateMomentHtml(Ms[i],i,Ms.length);const el=w.firstElementChild;$('#app').appendChild(el);
  $('[data-pmcont]',el).addEventListener('click',e=>{e.preventDefault();e.stopPropagation();FIN.momI=i+1;if(FIN.momI>=Ms.length){FIN.momDone=true;el.classList.add('out');setTimeout(()=>el.remove(),220)}else showPlateMoment()})}
document.addEventListener('click',e=>{const m=e.target.closest('[data-medal]');if(!m||!m.closest('.mrack'))return;e.preventDefault();medalSheet(m.dataset.medal)});
// demos for the plate moment (#finish-plates2 / 3 / 4 / 5, #finish-plates-deload): one heavy working set on the lift that earns the plate
// The demo runs on the Upper / Lower day that programs the lift (bench: Upper A as WK0; squat: Lower A; deadlift: Lower B), so the finish title
// matches the lift; that day's other exercises repeat their last logged sets.
function lastSetsOf(id,n){const H=logLoad(),es=H.entries.filter(e=>e.exerciseId===id&&!e.skipped);if(!es.length)return [];
  const sd=Object.fromEntries(H.sessions.map(x=>[x.id,x])),e=es.reduce((m,x)=>!m||String((sd[x.sessionId]||{}).date)>String((sd[m.sessionId]||{}).date)?x:m,null),su=(sd[e.sessionId]||{}).unit||'lb';
  return H.sets.filter(t=>t.entryId===e.id&&t.kind==='working'&&t.reps>0).slice(0,n).map(t=>({p:'',done:true,wv:String(t.load),rv:String(t.reps),wu:su}))}
function ladDemoDay(id){const r=ROUTINES.find(x=>x.id==='ul'),di=r.days.findIndex(d=>d.ex.some(e=>e.id===id));if(di<=0)return;const d=r.days[di];
  Object.assign(WK,{title:d.n,sub:`${r.name} · Day ${di+1}`,ref:{rid:r.id,di}});
  WK.ex=d.ex.map(e=>({id:e.id,bar:/barbell|trap bar|smith/.test(((EX[e.id]||{}).eq)||'')||/ez-bar/.test(e.id),cue:'',sets:lastSetsOf(e.id,e.s)}))}
// a copy of the log without the lift's working sets at or above lb (the demo's "before": the lifter had not reached that plate yet)
function logBelow(H,lift,lb){const ids=RD.EVO.lifts[lift].exercise_ids,ent=new Set(H.entries.filter(e=>ids.includes(e.exerciseId)).map(e=>e.id)),es=Object.fromEntries(H.entries.map(e=>[e.id,e.sessionId])),
  su=Object.fromEntries(H.sessions.map(x=>[x.id,x.unit||'lb']));return Object.assign({},H,{sets:H.sets.filter(t=>!(ent.has(t.entryId)&&t.kind==='working'&&(su[es[t.entryId]]==='kg'?t.load*KG_LB:t.load)>=lb-0.01))})}
function ladPlateDemo(lift,lb,reps,deload){const L=ladderData();if(!L)return;const PB=RD.EVO.plate_badges,id=RD.EVO.lifts[lift].exercise_ids[0],kg=S.unit==='kg';ladDemoDay(id);
  const ent=LADDER.plateEntries(PB,S.unit,lift),k=ent.findIndex(e=>Math.abs(e.load-(kg?{135:60,225:100,315:140,405:180,495:220}[lb]:lb))<0.01),ld=k>=0?ent[k].load:lb;
  let x=WK.ex.find(e=>e.id===id);if(!x){x={id,bar:true,cue:'',sets:[]};WK.ex.unshift(x)}x.sets=[{p:'',warm:true,done:true,wv:String(Math.round(ld*0.6)),rv:'5'},{p:'',done:true,wv:String(ld),rv:String(reps),wu:S.unit}];
  if(deload)WK.deload=true}
// demo for #finish-rankup: enough of the unmet slots reach the next rank's target (Coach's) for 3 of 5: the shoulder-press slot becomes
// overhead press with a top set at the target (5 reps); if one more is needed (swap3: the sample is 2 short), the lat-pulldown slot becomes
// bodyweight pull-ups at the target reps
function ladRankupDemo(){const L=ladderData();if(!L||!L.next)return;const sl=l=>L.progress.slots.find(x=>x.lift===l),need=()=>RD.EVO.promotion.min_lifts-L.progress.slots.filter(x=>x.target&&x.target.met).length;let n=need();
  const top=x=>x&&x.sets.filter(q=>q.done&&!q.warm).pop();
  {const s=sl('ohp'),x=WK.ex.find(e=>e.id==='seated-dumbbell-shoulder-press');if(n>0&&s&&s.target&&!s.target.met&&x&&s.target.estimated_1rm!=null){
    const st=RD.EVO.targets.step[S.unit],ld2=Math.ceil(s.target.estimated_1rm/(1+5/30)/st-1e-9)*st;x.id='overhead-press';const w=top(x);if(w){Object.assign(w,{wv:String(ld2),rv:'5',wu:S.unit});n--}}}
  {const s=sl('pullups'),x=WK.ex.find(e=>e.id==='lat-pulldown');if(n>0&&s&&s.target&&!s.target.met&&x&&s.target.reps!=null){x.id=RD.EVO.lifts.pullups.exercise_ids[0];x.bar=false;const w=top(x);if(w){Object.assign(w,{wv:'0',rv:String(s.target.reps),wu:S.unit});n--}}}}
document.addEventListener('click',e=>{const t=e.target.closest('[data-lad],[data-lsex],[data-lradd],[data-lrdel]');if(!t||!t.closest('#ladset'))return;e.preventDefault();const C=ladSettings();
  if(t.dataset.lad==='show')ladSet({hidden:!C.hidden});else if(t.dataset.lad==='optin')ladSet({bodyComp:{optIn:C.bodyComp.optIn!==true}});else if(t.dataset.lad==='bchide')ladSet({bodyComp:{hidden:C.bodyComp.hidden!==true}});
  else if(t.hasAttribute('data-lsex'))ladSet({profile:{sex:t.dataset.lsex||null}});else if(t.hasAttribute('data-lrdel'))ladSet({dropReading:+t.dataset.lrdel});
  else if(t.hasAttribute('data-lradd')){const d=$('#lrdate').value,w=+String($('#lrwaist').value).replace(',','.'),bf=+String($('#lrbf').value).replace(',','.'),m=$('#lrmeth').value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!(w>0||bf>0)){toast('Add a date and a waist or body-fat value');return}const r={date:d};if(w>0)r.waist={value:w,unit:S.unit==='kg'?'cm':'in'};if(bf>0&&bf<100){r.bfPct=bf;r.bfMethod=m}ladSet({reading:r})}
  ladRefreshSettings()});
// profile fields save on each valid keystroke (iOS may not blur on an outside tap); junk clears on change
const ladPfVal=(k,t)=>{const v=t.value.trim();if(k==='birthDate')return v===''?'':(/^\d{4}-\d{2}-\d{2}$/.test(v)?v:null);const n=+v.replace(',','.');return v===''?'':(n>0?n:null)};
const ladPfSave=(k,v)=>ladSet({profile:{[k]:v===''?null:k==='birthDate'?v:{value:v,unit:k==='height'?(S.unit==='kg'?'cm':'in'):S.unit}}});
document.addEventListener('input',e=>{const t=e.target.closest('[data-lpf]');if(!t)return;const k=t.dataset.lpf,v=ladPfVal(k,t);if(v===null)return;ladPfSave(k,v)});
document.addEventListener('change',e=>{const t=e.target.closest('[data-lpf]');if(!t)return;const k=t.dataset.lpf,v=ladPfVal(k,t);if(v===null){t.value='';ladPfSave(k,'')}else ladPfSave(k,v);if(k==='birthDate')ladRefreshSettings()});
// log backup / restore (the Back up / Restore rows wait for the native app; this is the API they will call). Carries the whole log,
// including settings.profile, settings.bodyComp, settings.ladder, history.bodyComp and history.evolution.
function logExport(){return {kind:'apechit.log',version:1,log:JSON.parse(JSON.stringify(logLoad()))}}
function logImport(o){const h=o&&o.kind==='apechit.log'&&o.log;if(!h||h.schema!==2||!Array.isArray(h.sessions)||!Array.isArray(h.entries)||!Array.isArray(h.sets))return false;
  const out=JSON.parse(JSON.stringify(h));if(out.bodyComp!=null&&!Array.isArray(out.bodyComp))delete out.bodyComp;if(out.evolution!=null&&typeof out.evolution!=='object')delete out.evolution;LOGH=out;logSave();return true}
V.settings=()=>`<div class="nav"><div class="l"><button class="back" data-go="#build">${I('chevL',2.4)}Build</button></div><div class="t">Settings</div><div class="r"></div></div>
  ${header('Settings')}
  <div class="group"><button class="row"><span class="ico acc">${I('flame',1.8)}</span><div class="grow"><div class="t1">Body weight</div><div class="t2">Updated from Pull-Up · Oct 19</div></div><span class="val num">182.4 lb</span>${CHEV}</button></div>
  <div id="profile">${profileHtml()}</div>
  <div id="ladset">${ladSetHtml()}</div>
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
   <div class="row" id="effrow"><div class="grow"><div class="t1">Show effort as RPE</div><div class="t2">${effMode()==='rpe'?'RPE 10 to ≤6 on each set':'Reps in reserve (RIR) 0 to 4+ on each set'}. Saved the same way either way.</div></div>${tg(effMode()==='rpe','rpe')}</div>
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
// key: one entry per status. rows=true (Analysis Weekly sets) adds "Close, under" (the maps shade it grey, as Under)
const volLegend=(rows=false)=>{const rf=VB.red_factor,pc=rf!=null?`${Math.round((rf-1)*100)}%`:'the set margin',ST=[['under','under'],['in','in'],...(rows?[['close-under','amber']]:[]),['close-over','amber'],['over','red']];
  return `<div class="legend vleg">${ST.map(([k,f])=>`${k==='close-under'||(!rows&&k==='close-over')?'<span class="vcap">Close to target:</span>':''}<span data-st="${k}"><i style="background:${VFILL[f]}"></i>${VLAB[k]}</span>`).join('')}</div><p class="foot vfoot">${rows?`Close to target (amber): up to 2 sets under the minimum, or up to ${pc} over the maximum.`:`Close, over: up to ${pc} over the maximum. Muscles just under the minimum show as Under.`} Over max: more than ${pc} over.</p>`};
// numeric map values = a credit rating / intensity, shaded by role with the --hl-* colour tokens (never greyscale; grey = unworked)
const FILL=v=>typeof v==='string'?(VFILL[v]||v):v==null||!(v>0)?'var(--map-empty)':v>=.75?'var(--hl-main)':v>=.4?'var(--hl-helper)':'var(--hl-minor)';
// map role colours. The exercise popup reads Coach's exercise-details body_map.levels (primary / secondary / minor / trace) and
// body_map.level_labels; trace is not counted and not shaded. Finish (no popup payload loaded) buckets RD.EX ratings with
// hlLevel, the same bands (main >= 0.75, helper 0.4 to < 0.75, minor 0.25 to < 0.4).
const HLV={main:'var(--hl-main)',helper:'var(--hl-helper)',minor:'var(--hl-minor)'},LV2HL={primary:'main',secondary:'helper',minor:'minor'};
const hlLevel=r=>r>=.75?'main':r>=.4?'helper':r>=.25?'minor':null;
const hlLegend=(L={main:'main',helper:'helper',minor:'minor'})=>`<span class="mleg hleg">${['main','helper','minor'].map(k=>`<i style="background:var(--hl-${k})"></i>${L[k]}`).join('')}</span>`;
// Round 3: crop = the figures' own extent (both sides' outlines sit inside x 200-820, y 64-1444 of the 1024x1536 art), so
// the same box height draws the body about 30% larger: the Build card and the Analysis sheet use it
const MAPCROP='190 50 644 1410';
function map(side,vol,opt={}){const m=MM[side],[,,w,h]=m.vb.split(' ').map(Number);
  return `<svg viewBox="${opt.crop?MAPCROP:`0 0 ${w} ${h}`}" class="mmap${opt.crop?' crop':''}" aria-label="${side} muscle map"><path d="${m.outline.join(' ')}" fill="var(--map-base)" stroke="var(--map-line)" stroke-width="3"/>
   ${m.m.map(([id,reg,d])=>{const mu=REG2M(reg),v=vol[mu];if(!mu)return `<path d="${d}" class="nr" fill="var(--map-base)" pointer-events="none"/>`; /* the two back ABDUCTOR paths have no region in the live map either */return `<path d="${d}" data-mu="${mu}" data-reg="${reg}" class="mp" fill="${opt.sel?(opt.sel.includes(mu)?'var(--accent)':'var(--map-off)'):opt.hl&&mu===opt.hl?'var(--accent)':FILL(v)}"/>`}).join('')}
   ${side==='front'&&opt.ape?`<g class="ape-head"><circle cx="512" cy="148" r="92" fill="var(--paper)" stroke="var(--accent)" stroke-width="7" stroke-dasharray="18 13"/><text x="512" y="138" text-anchor="middle" font-size="46" font-weight="800" fill="var(--accent-press)" font-family="-apple-system,sans-serif">APE</text><text x="512" y="186" text-anchor="middle" font-size="32" fill="var(--text-2)" font-family="-apple-system,sans-serif">head slot</text></g>`:''}</svg>`}
const VOL_X=[['traps',8,6,12],['forearms',6,4,12],['obliques',4,4,10],['lower_back',6,4,10],['adductors',4,4,10],['abductors',3,4,10]];
const volMap=()=>{const o={};[...VOL,...VOL_X].forEach(([m,n,lo,hi])=>o[m]=volFill(n,lo,hi));return o}; // same vStat bands as the panel, in-range shaded from --vol-in-range
// PROGRESS (piece B, 2026-10-24): logic/progress.js report() = Coach's tools/progress.py report() (data/progress-rules.json,
// data/progress-spec.md, parity in test/progress2.diff.js) over the ONE shared sample log (data/sample-log.json, also Log and Finish)
// with his live Build board (window.BOARD) as the routine. A cold-loaded Progress gives an empty board the plan the sample log
// follows (PHUL intermediate 4-day); a board he already has stays as it is. Apply (only where fix.apply_edits_board) edits that
// board, with Undo; rep-range and deload fixes are text only. Screens: #progress, #progress-m-<muscle>, #progress-l-<lift>.
const shortEx=id=>(EX[id]&&EX[id].short_name)||(RD&&RD.EX[id]&&(RD.EX[id].short_name||RD.EX[id].name))||exNameP(id);
const AS_OF='2026-10-24',PROG={sort:'default',view:null,vsig:null,sig:null,res:null,tsig:null,tres:null,applied:null,all:false,empty:false};
const MON3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],fmtD=d=>`${MON3[+d.slice(5,7)-1]} ${+d.slice(8,10)}`;
const DSH3={mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'};
// Main lift picker (prog2 / progress5): your pick per muscle is saved in the log itself, history.settings.mainLiftPins (stored in
// localStorage apechit.sb.log.v2), the pins path Coach's report() reads (resolve_overrides: stored pins, then main_lift_overrides on top).
// It drives the main lift, change %, sparkline, band, stall check and KPI median. The picker offers only lifts that credit the muscle
// >= 0.25; an invalid pin is listed in report.overrides_ignored; a pick with no session in 91 days shows 'Main lift not trained recently'
// (no silent fallback). Reset = remove that muscle's pin.
const mlGet=()=>Object.assign({},((logLoad().settings||{}).mainLiftPins)||{});
const mlSet=(m,id)=>{const H=logLoad();H.settings=H.settings||{};const o=Object.assign({},H.settings.mainLiftPins||{});if(id)o[m]=id;else delete o[m];H.settings.mainLiftPins=o;logSave();PROG.sig=null;PROG.res=null;PROG.view=null};
// Chart metric toggle (metric1, Coach progress-spec §17): ONE global choice in the log, history.settings.progress.chartMetric (Coach's
// chart_metrics.persist.key); unknown / missing -> the default (est_1rm). Display only: change %, bands, KPIs and headline stay est_1rm.
const CM_OPTS=()=>((RD&&RD.PR2&&RD.PR2.chart_metrics)||{options:['est_1rm'],default:'est_1rm'});
const cmGet=()=>{const v=(((logLoad().settings||{}).progress)||{}).chartMetric,C=CM_OPTS();return C.options.includes(v)?v:C.default};
const cmSet=o=>{const H=logLoad();H.settings=H.settings||{};H.settings.progress=Object.assign({},H.settings.progress||{},{chartMetric:o});sv(LOG_K,LOGH)};   // display only: no report rebuild
// the option a lift's chart shows: the saved one when available, else metric_series[lift].fallback (the saved value is kept)
function cmShown(pr,id){const MS=pr.metric_series&&pr.metric_series[id],o=cmGet();if(!MS)return 'est_1rm';return MS.options[o]&&MS.options[o].available?o:(MS.fallback||null)}
function progHist(empty=PROG.empty){const H=empty?{schema:2,settings:{},sessions:[],entries:[],sets:[]}:logLoad();return Object.assign({},H,{settings:Object.assign({},H.settings||{},{unit:S.unit,effort:effMode()})})}
function progBoard(){const B=window.BOARD;if(!B||!RD)return [];const sl=RD.SLOG&&RD.SLOG.routine;
  if(B.ensurePlan&&sl&&sl.days){const sp=((RD.splits||{}).splits||[]).find(x=>x.id===sl.split);B.ensurePlan(sl.days,sp?`${sp.name} · ${sl.days.length} days`:'Sample plan',sl.level||'intermediate')}
  return B.rankBoard()}
function progressData(){if(!RD||!RD.PR2||!window.PROGRESS)return null;const rt=progBoard(),lv=(window.BOARD&&BOARD.state&&BOARD.state.level)||'intermediate',h=progHist();
  const pf=prefs(),sig=JSON.stringify([LOGV,PROG.empty,rt,lv,S.unit,effMode(),pf.bias_muscles]);if(PROG.sig===sig&&PROG.res)return PROG.res;
  // order1: the same prefs() object the Build ranking uses; report() reads prefs.bias_muscles for the table order and chart default
  PROG.res=PROGRESS.report(RD,h,AS_OF,rt,lv,null,null,pf);PROG.sig=sig;return PROG.res}
// Train reads the same one deload rule (progress-rules deload.one_rule: deload_check points + Progress lift statuses); it never touches the board
function trainDeload(){if(!RD||!RD.PR2||!window.PROGRESS)return null;const sig=JSON.stringify([LOGV,S.unit]);if(PROG.tsig===sig&&PROG.tres)return PROG.tres.deload;
  PROG.tres=PROGRESS.report(RD,progHist(false),AS_OF,[],'intermediate',null);PROG.tsig=sig;return PROG.tres.deload}
function trainDeloadHtml(){const d=trainDeload();if(!d)return '';
  return `<div id="tdeload" data-suggest="${d.suggest}" data-score="${d.score}" data-of="${d.suggest_score}" hidden></div>`+(d.suggest?`<div class="card tdl" data-deload="1"><b>A lighter week may help</b><p class="sub">Signs point to a deload: about half the sets at RIR 3 to 4, then build back up. Your board stays the same.</p></div>`:'')}
const TRA={up:'↗',down:'↘',flat:'→',insufficient:'·'},TRW={up:'Up',down:'Down',flat:'Steady',insufficient:'Too early'};
const LST={up:'up',flat:'flat',down:'down',stalled:'flat',dropping:'down',insufficient:'insufficient'};
const arrow=st=>`<span class="ptr ${st}" data-tr="${st}" role="img" aria-label="${TRW[st]||st}"><i aria-hidden="true">${TRA[st]||''}</i></span>`;
const capF=t=>t?t[0].toUpperCase()+t.slice(1):t;
function gainLine(id,g){const nm=shortEx(id);if(!g)return esc(nm);if(g.status==='first')return `${esc(nm)}: first time logged`;if(g.status==='none')return `${esc(nm)}: nothing to compare in the last 8 weeks`;
  if(g.status==='same')return `${esc(nm)}: same as last time`;return `${esc(nm)} ${esc(g.text)} since last time`}
const winIcon=k=>k==='milestone'?'★':k==='vs_3_months'?'↗':'▲';
function winRow(w){const t=txtS(w.text),k=t.indexOf(': '),nm=k>0?t.slice(0,k):shortEx(w.exercise),rest=k>0?t.slice(k+2):t;
  return `<button class="row pwin" data-plift="${w.exercise}" data-kind="${w.kind}"><span class="pwi" aria-hidden="true">${winIcon(w.kind)}</span><div class="grow"><div class="t1">${esc(nm)}</div><div class="t2">${esc(capF(rest))}</div></div><span class="pwd num">${w.kind==='vs_3_months'?'':fmtD(w.date)}</span>${CHEV}</button>`}
const sec=(id,t,more,body)=>`<section class="psec" data-psec="${id}"><div class="sec"><h2>${t}</h2>${more?`<span class="more">${more}</span>`:''}</div>${body}</section>`;
const akey=x=>x.kind+':'+(x.lifts||[]).join(',')+':'+(x.muscles||[]).join(',');
const opsWhere=ops=>{const d=[...new Set(ops.map(o=>DSH3[o.day]||o.day))];return d.length>1?d.slice(0,-1).join(', ')+' and '+d[d.length-1]:d[0]};
function attnCard(x,k){const A=PROG.applied,ap=A&&A.key===akey(x);if(ap)x=A.item; // keep showing the fix that was applied, not the next one the edited board yields
  const f=x.fix||{},can=f.apply_edits_board&&f.ops&&f.ops.length;
  const act=ap?`<div class="papl on"><span>Applied to your board</span><button class="btn xs ink" data-pundo="1">Undo</button></div>`
    :can?`<div class="papl"><span class="sub">Changes ${opsWhere(f.ops)} on your board</span><button class="btn xs accent" data-pfix="${k}">Apply</button></div>`
    :f.kind==='deload'?`<p class="sub ptxt">A lighter week sits on top of your plan. Your board stays the same.</p>`:'';
  return `<div class="flag pna" data-na="${x.kind}" data-fix="${f.kind||''}" data-k="${k}"><div class="ftl">${esc(txtS(x.text))}</div>${(x.notes||[]).map(n=>`<p class="sub pnote">${esc(n)}</p>`).join('')}
    <p class="psug"><span class="pfx">Try</span> ${esc(txtS(f.text))}</p>${act}</div>`}
function progEmpty(){return header('Progress',bookBtn)+`<div class="card pempty" data-empty="1"><div class="pe-ico" aria-hidden="true">${I('log',1.6)}</div><h3>No workouts logged yet</h3>
  <p class="sub">Finish a workout in Train and your wins, strength trends and stalls show up here.</p><div class="pad"><button class="btn accent block" data-go="#train">Go to Train</button></div></div>`}
const txtS=t=>String(t==null?'':t);
const progHead=()=>`<div class="plabel" data-sample="1"><span>Sample data · estimates</span><span class="phon">Strength and performance, not measured muscle growth</span></div>`;
// ---- Progress dashboard (piece C): KPI strip → body map by 3-month trend → muscle table → wins chips → needs attention → footnote.
// Values come from Coach's report().dashboard through ONE adapter, logic/progress-view.js (PVIEW.build); the only storyboard-derived
// values (avg RIR tile, the set behind a dot) are listed there. Muscle and lift detail open in one bottom sheet (muscle → lifts → chart).
const pview=pr=>{if(!pr)return null;if(PROG.vsig===PROG.sig&&PROG.view)return PROG.view;
  const H=progHist();PROG.view=PVIEW.build(pr,PROGRESS.flatten(Object.assign({},RD,{aliases:{}}),H),AS_OF,H);PROG.vsig=PROG.sig;return PROG.view};
// dashboard bands → Coach's colour roles (progress-rules.json dashboard.band.colour_roles): progress-strong, progress, neutral, attention, muted
const TRC={up_strong:'var(--tr-up2)',up:'var(--tr-up)',flat:'var(--tr-flat)',down:'var(--tr-down)',insufficient:'var(--tr-muted)'},TRL={up_strong:'Up strongly',up:'Up',flat:'Flat',down:'Down',insufficient:'Too early'};
const TRI={up_strong:'up',up:'up',flat:'flat',down:'down',insufficient:''};
const effV=r=>r==null?null:effMode()==='rpe'?10-r:r,effT=()=>effMode()==='rpe'?'RPE':'RIR';
const sgn=p=>p==null?'–':`${p>0?'+':p<0?'−':''}${fmtPct(p)}%`;
const BKT={stalled_or_dropping:0,flat:1,null:2,progressing:3};
function sortedMuscles(pr,vw){const a=Object.keys(vw.muscles),s=PROG.sort||'problems',ch=m=>vw.muscles[m].change;
  return a.sort(s==='az'?((x,y)=>(ML[x]||x)<(ML[y]||y)?-1:1):s==='change'?((x,y)=>(ch(y)??-1e9)-(ch(x)??-1e9)):((x,y)=>BKT[vw.muscles[x].bucket]-BKT[vw.muscles[y].bucket]||(ch(x)??1e9)-(ch(y)??1e9)||((ML[x]||x)<(ML[y]||y)?-1:1)))}
// 12-week sparkline: weekly best, gaps for weeks with no data, the last point in its 3-month trend colour
function spark(vals,tr,dlw){const W=58,H=20,v=vals.filter(x=>x!=null);if(v.length<2)return `<svg class="psp" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>`;
  const lo=Math.min(...v),hi=Math.max(...v),n=vals.length,X=k=>2+k/(n-1)*(W-4),Y=x=>hi>lo?2+(hi-x)/(hi-lo)*(H-4):H/2;
  const segs=[];let c=[];vals.forEach((x,k)=>{if(x==null){if(dlw&&dlw[k])return;if(c.length)segs.push(c);c=[]}else c.push([X(k),Y(x)])});if(c.length)segs.push(c);   /* deload weeks (isDeloadWeek) are skipped: the line joins across */
  let lk=n-1;while(vals[lk]==null)lk--;
  return `<svg class="psp" viewBox="0 0 ${W} ${H}" aria-hidden="true">${segs.map(sg=>sg.length>1?`<polyline points="${sg.map(p=>p.join(',')).join(' ')}"/>`:`<circle cx="${sg[0][0]}" cy="${sg[0][1]}" r="1.2" class="ps1"/>`).join('')}<circle cx="${X(lk)}" cy="${Y(vals[lk])}" r="2.4" style="fill:${TRC[tr]||'var(--text-2)'}"/></svg>`}
// ---- KPI strip (prog3, Coach's dashboard.headline, spec §15): Strength Index + trend arrow + model label · PRs this month (main lifts) ·
// weekly streak (current, best) · up / holding / down mix (stalled marker). Avg RIR moved to the muscle table (column + foot).
function kpiStrip(vw){const H=vw.headline;if(!H)return '';const S=H.score,P=H.prs,T=H.streak,X=H.mix;
  const tile=(go,big,lab,cls='',tag='button')=>`<${tag} class="pk ${cls}"${go?` data-kgo="${go}"`:''}><b class="num">${big}</b><span>${lab}</span></${tag}>`;
  const arr=S.arrow?`<i class="pkar" data-tr="${S.arrow}" role="img" aria-label="${TRW[S.arrow]||S.arrow}">${TRA[S.arrow]}</i>`:'';
  return `<div class="pkpi" data-src="${vw.source}">${tile('ovl',S.value==null?'–':`${S.display}${arr}`,'Strength<br>Index','pkss'+(S.value==null?' pkna':''))}
   ${tile('wins',P.count,'PRs this month<br>main lifts','pkpr')}
   ${tile('',`${T.current}<small>wk</small>`,`Streak<br>best ${T.best}`,'pkstk','div')}
   ${tile('map',`<i class="d up"></i>${X.up}<i class="d flat"></i>${X.holding}<i class="d down"></i>${X.down}`,`Up · holding · down${X.stalled.length?`<br><i class="stk"></i>${X.stalled.length} stalled`:''}${X.insufficient?`<br>${X.insufficient} too early`:''}`,'pkmu')}</div>
   <p class="pknote pssub">${esc(S.status==='ok'?S.sub:S.display)}</p>`}
// fb1 (Mr Dude) + order1 (Coach, progress-spec §16): the default lines are dashboard.chart_default.lifts (priority muscles' main lifts,
// then the ladder core lifts or their stand-ins, eligible only, cap 6); '+ more' = chart_default.more, off. Lines = overlay.lifts +
// chart_default.extra_series. Every plotted line has its own colour (--ov1..6, Okabe-Ito based, light / dark) AND its own end-marker
// shape, so lines stay apart in grayscale; past 6 the colours repeat dashed. A line switched on from '+ more' gets the next colour.
// Reps / seconds lines (pull-ups) draw dashed. Deload sessions have no point, so a line joins across them. Tap a line for its chart.
const OVPAL=6,OVC=k=>`var(--ov${k%OVPAL+1})`;
const ovDays=d=>Math.round((Date.parse(AS_OF+'T12:00:00Z')-Date.parse(d+'T12:00:00Z'))/864e5);
function ovMark(k,x,y,c,cls=''){const f=v=>v.toFixed(1),s=3.6;return ovMark0(k,x,y,c,cls).replace(/^<(\w+) /,`<$1 data-mk="${k%6}" `)}
function ovMark0(k,x,y,c,cls=''){const f=v=>v.toFixed(1),s=3.6;switch(k%6){
  case 0:return `<circle class="ovend ${cls}" cx="${f(x)}" cy="${f(y)}" r="${s}" style="fill:${c}"/>`;
  case 1:return `<rect class="ovend ${cls}" x="${f(x-s+0.4)}" y="${f(y-s+0.4)}" width="${f(2*s-0.8)}" height="${f(2*s-0.8)}" style="fill:${c}"/>`;
  case 2:return `<path class="ovend ${cls}" d="M${f(x)} ${f(y-s-0.6)}L${f(x+s+0.4)} ${f(y+s-0.4)}L${f(x-s-0.4)} ${f(y+s-0.4)}Z" style="fill:${c}"/>`;
  case 3:return `<path class="ovend ${cls}" d="M${f(x)} ${f(y-s-0.8)}L${f(x+s+0.8)} ${f(y)}L${f(x)} ${f(y+s+0.8)}L${f(x-s-0.8)} ${f(y)}Z" style="fill:${c}"/>`;
  case 4:return `<path class="ovend ${cls}" d="M${f(x)} ${f(y+s+0.6)}L${f(x+s+0.4)} ${f(y-s+0.4)}L${f(x-s-0.4)} ${f(y-s+0.4)}Z" style="fill:${c}"/>`;
  default:return `<path class="ovend ovx2 ${cls}" d="M${f(x-s)} ${f(y-s)}L${f(x+s)} ${f(y+s)}M${f(x+s)} ${f(y-s)}L${f(x-s)} ${f(y+s)}" style="stroke:${c}"/>`}}
function ovState(pr,vw){const O=vw.overlay,sig=JSON.stringify([PROG.sig,O.chart.lines,O.chart.more]);
  if(PROG.ovSig!==sig){PROG.ovPick=O.chart;PROG.ovSig=sig;PROG.ovOff=new Set();PROG.ovExtra=[]}
  const P=PROG.ovPick,col={};P.lines.forEach((id,k)=>col[id]=k);PROG.ovExtra.forEach((id,k)=>col[id]=P.lines.length+k);
  const on=new Set([...P.lines.filter(id=>!PROG.ovOff.has(id)),...PROG.ovExtra]);return {P,col,on}}
function ovlChart(pr,vw){const O=vw.overlay;if(!O||!O.lines.length)return '';const rng=PROG.ovr||'all',nd=PVIEW.D.RANGE_DAYS[rng],{P,col,on}=ovState(pr,vw);
  const from=nd==null?O.window.from:new Date(Date.parse(AS_OF+'T12:00:00Z')-(nd-1)*864e5).toISOString().slice(0,10);
  const ok=O.lines.filter(l=>l.status==='ok'&&l.points.length),byId=Object.fromEntries(ok.map(l=>[l.lift,l]));
  const vis=[...on].filter(id=>byId[id]).map(id=>({...byId[id],k:col[id],pts:byId[id].points.filter(q=>nd==null||ovDays(q.date)<nd)})).filter(l=>l.pts.length);
  const W=340,Hh=196,L=40,R=10,T=10,B=24,pw=W-L-R,ph=Hh-T-B,all=vis.flatMap(l=>l.pts.map(q=>q.pct)).concat([0]);
  let lo=Math.min(...all),hi=Math.max(...all);const st=[2,5,10,20,25,50,100].find(x=>(Math.ceil(hi/x)-Math.floor(lo/x))<=5)||100;lo=Math.floor(lo/st)*st;hi=Math.ceil(hi/st)*st;if(hi===lo)hi=lo+st;
  const t0=Date.parse(from+'T12:00:00Z'),t1=Date.parse(AS_OF+'T12:00:00Z'),X=d=>L+(Date.parse(d+'T12:00:00Z')-t0)/Math.max(1,t1-t0)*pw,Y=v=>T+(hi-v)/(hi-lo)*ph,f1=v=>v.toFixed(1);
  const ticks=[];for(let v=lo;v<=hi+1e-9;v+=st)ticks.push(v);
  const xt=[];for(let k=0;k<=3;k++){const t=new Date(t0+(t1-t0)*k/3).toISOString().slice(0,10);xt.push(t)}
  const rep=l=>l.unit_flag==='reps'||l.unit_flag==='seconds',dashA=l=>rep(l)?'5 3':l.k>=OVPAL?'7 3':'',dash=l=>dashA(l)?` stroke-dasharray="${dashA(l)}"`:'';
  const ord=vis.slice().sort((a,b)=>b.k-a.k);   // first pick drawn last (on top)
  const line=l=>l.pts.length>1?`<polyline class="ovln" data-ovline="${l.lift}" data-k="${l.k}" points="${l.pts.map(q=>f1(X(q.date))+','+f1(Y(q.pct))).join(' ')}" style="stroke:${OVC(l.k)}"${dash(l)}/>`:'';
  const end=l=>{const q=l.pts[l.pts.length-1];return ovMark(l.k,X(q.date),Y(q.pct),OVC(l.k))};
  const hit=l=>`<g class="ovhit" data-ovl="${l.lift}"${l.m?` data-ovm="${l.m}"`:''} role="button" aria-label="${esc(shortEx(l.lift))}: ${esc(l.last_pct==null?'':sgn(l.last_pct))} — open chart">${l.pts.length>1?`<polyline points="${l.pts.map(q=>f1(X(q.date))+','+f1(Y(q.pct))).join(' ')}"/>`:''}<circle cx="${f1(X(l.pts[l.pts.length-1].date))}" cy="${f1(Y(l.pts[l.pts.length-1].pct))}" r="9"/></g>`;
  const svg=`<svg class="povc" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Percent change from each lift's start, ${vis.length} lines">
    ${ticks.map(v=>`<line class="ovg${v===0?' z':''}" x1="${L}" x2="${W-R}" y1="${f1(Y(v))}" y2="${f1(Y(v))}"/><text class="ovy" x="${L-5}" y="${f1(Y(v)+3.5)}" text-anchor="end">${v>0?'+':v<0?'−':''}${Math.abs(v)}%</text>`).join('')}
    ${xt.map((d,k)=>`<text class="ovx" x="${f1(X(d))}" y="${Hh-6}" text-anchor="${k===0?'start':k===3?'end':'middle'}">${fmtD(d)}</text>`).join('')}
    ${ord.map(line).join('')}${ord.map(end).join('')}${ord.slice().reverse().map(hit).join('')}</svg>`;
  const unit=l=>l.unit_flag==='reps'?' <small>reps</small>':l.unit_flag==='seconds'?' <small>sec</small>':'';
  const sw=(l,k)=>`<svg class="ovsw" viewBox="0 0 22 10" aria-hidden="true">${k==null?'<line x1="1" y1="5" x2="21" y2="5" class="ovsw0"/>':`<line x1="1" y1="5" x2="21" y2="5" style="stroke:${OVC(k)}"${dashA({...l,k})?` stroke-dasharray="${rep(l)?'3 2':'4 2'}"`:''}/>${ovMark(k,11,5,OVC(k),'sm')}`}</svg>`;
  const chip=l=>{const o=on.has(l.lift),k=o?col[l.lift]:null;return `<button class="povk${o?' on':''}" data-ovk="${l.lift}" aria-pressed="${o}" aria-label="${esc(shortEx(l.lift))} ${o?'shown':'hidden'}">${sw(l,k)}<span class="ovn">${esc(shortEx(l.lift))}${unit(l)}</span><b class="num" data-tr="${l.last_pct>0?'up':l.last_pct<0?'down':'flat'}">${sgn(l.last_pct)}</b></button>`};
  const more=P.more.filter(id=>byId[id]),mOpen=!!PROG.ovMore,mOn=more.filter(id=>on.has(id)).length;
  const prioM=(P.prio_muscles||[]).map(m=>(ML[m]||m).toLowerCase());
  const cap=P.caption?`${P.caption}${prioM.length?` (${prioM.join(', ')})`:''}`:'';
  const none=O.lines.filter(l=>!(l.status==='ok'&&l.points.length));
  const K=pr.dashboard.kpis.strength_change,anyU=vis.some(rep);
  return `<div class="card povl" data-rng="${rng}"><div class="povh"><span class="povmed" data-ovmed="1">Median <b class="num">${esc(K.display||'–')}</b> · ${K.n_lifts} lifts</span>
    <div class="pseg sm povr" role="tablist">${[['4w','4w'],['12w','12w'],['all','All']].map(([k,t])=>`<button data-ovr="${k}" class="${rng===k?'on':''}" aria-selected="${rng===k}">${t}</button>`).join('')}</div></div>
    ${cap?`<p class="povcap" data-ovcap="1">${esc(cap)}</p>`:''}
    ${vis.length?svg:`<p class="foot povnone">All lines are off. Tap a lift below to show it.</p>`}
    <div class="povleg">${P.lines.filter(id=>byId[id]).map(id=>chip(byId[id])).join('')}${more.length?`<button class="povk povmore${mOpen?' open':''}" data-ovmore="1" aria-expanded="${mOpen}">${mOpen?'− fewer':`+ ${more.length} more`}${!mOpen&&mOn?` <small>(${mOn} on)</small>`:''}</button>`:''}</div>
    ${more.length&&mOpen?`<div class="povleg povmorel" data-ovmorel="1">${more.map(id=>chip(byId[id])).join('')}</div>`:''}
    ${none.length?`<p class="foot povno">No line yet: ${none.map(l=>`${esc(shortEx(l.lift))} (${esc(l.reason||'not enough data')})`).join(', ')}.</p>`:''}</div>
   <p class="foot">% from each lift's own start (its best in the first 2 weeks of the last 3 months), so lifts in lb, kg, reps and seconds share one axis. Lighter (deload) sessions are left out and the line joins across.${anyU?' Dashed: reps or seconds, which move faster in %.':''} Tap a line for its chart, a name to show or hide it.</p>`}
function trendMap(pr,vw){const vol={},stk=new Set();for(const [m,x] of Object.entries(vw.muscles)){vol[m]=TRC[x.band];if(x.stalled)stk.add(m)}
  const mk=h=>h.replace(/data-mu="(\w+)"([^>]*?)class="mp"/g,(a,mu,mid)=>stk.has(mu)?`data-mu="${mu}"${mid}class="mp pstk"`:a);   // stall marker: an outline on top of the band colour
  const has=b=>Object.values(vw.muscles).some(x=>x.band===b);
  return `<div class="card pmapc"><div class="maps">${mk(map('front',vol))}${mk(map('back',vol))}</div>
   <div class="legend ptleg"><span><i style="background:var(--tr-up2)"></i>Up strongly</span><span><i style="background:var(--tr-up)"></i>Up</span><span><i style="background:var(--tr-flat)"></i>Flat</span><span><i style="background:var(--tr-down)"></i>Down</span>${has('insufficient')?'<span><i style="background:var(--tr-muted)"></i>Too early</span>':''}${stk.size?'<span><i class="stk"></i>Stalled</span>':''}<span><i class="ne"></i>Not trained</span></div></div>
   <p class="foot">Each muscle's main lift over the last 3 months. Tap a muscle for its lifts.</p>`}
// ---- muscle table (prog3): one row per Coach's dashboard.table_rows entry (one per unique main lift; a shared lift lists its muscles, e.g.
// "Deadlift — traps, forearms, lower back"), so a lift never repeats. RIR column = the row's avg_rir (shared: mean of its muscles, each
// muscle's own value listed under the row). dashboard.muscles still drives the body map.
const MLs=ms=>ms.map((m,k)=>k?(ML[m]||m).toLowerCase():(ML[m]||m)).join(', ');
// order1 (Coach, progress-spec §16): the default order is Coach's table_rows order (priority muscles from prefs.bias_muscles in the
// user's order, then the trained muscles, then the rest, in the fixed exercises.json order); row.priority marks a priority row.
// Problems / A–Z / Change re-sort the same rows on the phone.
function sortedRows(vw){const a=vw.rows.slice(),s=PROG.sort||'default',nm=r=>MLs(r.muscles);
  if(s==='default')return a;
  return a.sort(s==='az'?((x,y)=>nm(x).localeCompare(nm(y))):s==='change'?((x,y)=>(y.change??-1e9)-(x.change??-1e9)):((x,y)=>BKT[x.bucket]-BKT[y.bucket]||(x.change??1e9)-(y.change??1e9)||nm(x).localeCompare(nm(y))))}
function muscleTable(pr,vw){const OVR=mlGet(),S0=PROG.sort||'default',PO=vw.priority.muscles,seg=[['default','Default'],['problems','Problems'],['az','A–Z'],['change','Change']],k=vw.kpi,ek=effV(k.avg_rir),f1=v=>effV(v)==null?'–':fmtPct(effV(v));
  return `<div class="pseg" role="tablist">${seg.map(([k,t])=>`<button data-psort="${k}" class="${S0===k?'on':''}" aria-selected="${S0===k}">${t}</button>`).join('')}</div>
   <div class="group ptab"><div class="pth" aria-hidden="true"><span>Muscle</span><span>12 wk</span><span>Main lift</span><span>Change</span><span>${effT()}</span></div>
   ${sortedRows(vw).map(r=>{const m=r.m,v=pr.muscles[m]||{main_lift:{}},e=effV(r.avg_rir),pin=r.muscles.some(x=>OVR[x]&&OVR[x]===r.lift),fl=r.bucket==='stalled_or_dropping'?(v.main_lift.status==='dropping'?'Dropping':r.stalled?'Stalled':'Down'):'';
     return `<button class="pmr${r.shared?' pshr':''}" data-pm="${m}" data-pms="${r.muscles.join(' ')}" data-lift="${r.lift}" data-bucket="${r.bucket||'insufficient'}" data-band="${r.band}"${r.priority?' data-prio="1"':''} aria-label="${esc(r.label)}"><span class="pmn">${r.priority?'<i class="pprio" title="Priority muscle" aria-label="Priority muscle"></i>':''}${esc(MLs(r.muscles))}${fl?`<em class="pstall">${fl}</em>`:''}${r.shared?`<small class="prir" title="${esc(r.muscles.map(x=>`${ML[x]||x} ${f1(r.avg_rir_by_muscle[x])}`).join(', '))}">${effT()} each: ${r.muscles.map(x=>f1(r.avg_rir_by_muscle[x])).join(' · ')}</small>`:''}</span><span class="pspk" data-pspk="${m}" data-pspl="${r.lift}" role="button" aria-label="${esc(shortEx(r.lift)+' chart')}">${spark(r.spark,r.band,r.spark_deload)}</span>
      <span class="pmlf">${pin?'<i class="ppin" title="Your pick" aria-label="Your pick"></i>':''}${esc(shortEx(r.lift))}${r.reason?`<small class="prsn">${esc(capF(r.reason))}</small>`:''}</span><span class="pchg num" data-tr="${TRI[r.band]||''}">${r.change_display||'–'}</span><span class="pef num">${e==null?'–':fmtPct(e)}</span></button>`}).join('')}</div>
   <p class="foot">${Object.keys(OVR).length?'<i class="ppin"></i> Your main lift pick. ':''}${PO.length?'<i class="pprio"></i> Your priority muscles (the focus muscles you picked in Build) come first. ':''}One row per main lift; a lift that is the main lift of several muscles lists them together. Tap a row for its main lift's chart. Change: the main lift's best in its first 2 weeks vs the last 2 weeks, over 3 months. ${effT()}: ${effMode()==='rpe'?'RPE = 10 − reps in reserve':'reps in reserve'}, last 4 weeks; all sets: <b class="num pkrir">${ek==null?'not enough logged':ek.toFixed(1)}</b>.${k.avg_rir_note?' '+esc(k.avg_rir_note)+'.':''}</p>`}
function winChip(w){const t=txtS(w.text),k=t.indexOf(': '),nm=k>0?t.slice(0,k):shortEx(w.exercise),rest=k>0?t.slice(k+2):t;
  return `<button class="pchip" data-plift="${w.exercise}" data-kind="${w.kind}"><span class="pci ${w.kind==='milestone'?'ms':''}" aria-hidden="true">${winIcon(w.kind)}</span><span class="pct"><b>${esc(shortEx(w.exercise)||nm)}</b><span>${esc(capF(rest))}</span></span></button>`}
V.progress=()=>{const pr=RD&&progressData();if(!pr)return header('Progress',bookBtn)+`<p class="foot">Progress needs the logger rules.</p>`;if(!pr.data.completed_sessions)return progEmpty();
  const vw=pview(pr),W=pr.wins,wl=PROG.all?W.list:W.shown,NA=pr.needs_attention.slice();
  if(PROG.applied&&!NA.some(x=>akey(x)===PROG.applied.key))NA.unshift(PROG.applied.item);
  return header('Progress',bookBtn)+medalRack()+progHead()+kpiStrip(vw)+ladCard()+
   sec('ovl','Strength change','% from start',ovlChart(pr,vw))+
   sec('map','By muscle','3 months',trendMap(pr,vw))+
   sec('muscles','Muscles','',muscleTable(pr,vw))+
   (wl.length?sec('wins','Wins','last 2 weeks',`<div class="pchips">${wl.map(winChip).join('')}${W.more?`<button class="pchip pmore" data-pmore="1">${PROG.all?'Show fewer':`+${W.more} more`}</button>`:''}</div>`):'')+
   (NA.length?sec('attention','Needs attention','',`<div class="flags">${NA.map((x,k)=>attnCard(x,pr.needs_attention.indexOf(x)>=0?pr.needs_attention.indexOf(x):'a')).join('')}</div>`):'')+
   (pr.footnote.planned_vs_done.text?`<p class="foot pvd" data-psec="planned">${esc(pr.footnote.planned_vs_done.text)}</p>`:'')};
const fmtPct=p=>{const a=Math.abs(p);return a>=10?String(Math.round(a)):String(Math.round(a*2)/2)};
// a muscle: every lift that works it (rated >= targets counting min), its main lift first
function liftsOf(pr,m){const mr=RD.targets.counting.min_rating_to_count,v=pr.muscles[m]||{},main=(v.main_lift||{}).id,w=v.weight_by_lift||{};
  return Object.keys(pr.lifts).filter(i=>((RD.EX[i]||{}).muscles||{})[m]>=mr).sort((a,b)=>(b===main)-(a===main)||(w[b]||0)-(w[a]||0)||(pr.lifts[a].name<pr.lifts[b].name?-1:1))}
const muscleOfLift=(pr,id)=>{const ms=Object.keys(pr.muscles);return ms.find(m=>pr.muscles[m].main_lift.id===id)||ms.sort((a,b)=>(((RD.EX[id]||{}).muscles||{})[b]||0)-(((RD.EX[id]||{}).muscles||{})[a]||0))[0]};
function liftLine(L){if(L.status==='stalled')return `No rep or load gain in the last ${L.stall.trailing_no_gain} sessions`;if(L.status==='dropping')return 'Down 2 sessions in a row';
  return L.trend.status==='insufficient'?(L.insufficient_label||L.trend.words):txtS(L.trend.words)}
// chart titles: estimated 1-rep max for loaded lifts; bodyweight and timed lifts are tracked by reps or seconds, never an estimated 1RM
const CTITLE={e1rm:u=>`Estimated 1-rep max (${u})`,best_reps:()=>'Best reps',hold_s:()=>'Best hold (s)',load_index:()=>'Load-reps index'};
const CNOTE={e1rm:'Estimated from your best set each session.',best_reps:'Most reps in one set at bodyweight each session.',hold_s:'Longest hold each session.',load_index:'A trend index from the load and reps of your best set each session, not a 1-rep max.'};
const CAX={e1rm:u=>u,best_reps:()=>'reps',hold_s:()=>'sec',load_index:()=>'index'};
const dashLift=(pr,id)=>((pr.dashboard||{}).lifts||{})[id];
const RNG={'4w':28,'12w':84,all:null};
// the detail sheet
const PSH={api:null,m:null,lift:null,rng:'12w'};
function openPSheet(m,lift){const pr=progressData();if(!pr)return;if(m&&!lift){const x=pview(pr).muscles[m];if(x&&x.main)lift=x.main}   // fb1: a muscle tap goes straight to its main lift's chart
  if(PSH.api&&!PSH.api.closed)PSH.api.close();Object.assign(PSH,{m,lift:lift||null,rng:PSH.rng||'12w'});
  PSH.api=sheet({cls:'psheet',title:'',body:pshBody(),onClose:()=>{PSH.api=null}});tapable(PSH.api.el);requestAnimationFrame(()=>PSH.api&&PSH.api.wrap.classList.add('open'))}
function pshRender(){if(PSH.api&&!PSH.api.closed){PSH.api.body.innerHTML=pshBody();PSH.api.body.scrollTop=0;tapable(PSH.api.el)}}
function pshBody(){const pr=progressData(),vw=pview(pr);return PSH.lift?liftPane(pr,vw,PSH.lift):musclePane(pr,vw,PSH.m)}
// fb1: the muscle's progress header (status, change %, trend, avg effort), shown on top of its chart screen
function muscleHead(pr,vw,m){const v=pr.muscles[m],x=vw.muscles[m];if(!v||!x)return '';const e=effV(x.avg_rir),ink=TRI[x.band]?`var(--tr-${TRI[x.band]}-ink)`:'inherit';
  return `<div class="pshmh" data-pshmh="${m}"><h2>${ML[m]||m}${x.bucket==='stalled_or_dropping'?` <span class="pstall">${v.main_lift.status==='dropping'?'Dropping':x.stalled?'Stalled':'Down'}</span>`:''}</h2>
   <div class="pshk"><div><b class="num" style="color:${ink}">${x.change_display||'–'}</b><span>Main lift, 3 mo</span></div><div><b class="num">${TRL[x.band]||'–'}</b><span>3-month trend</span></div><div><b class="num">${e==null?'–':fmtPct(e)}</b><span>Avg ${effT()}</span></div></div>${x.reason?`<p class="foot prsn1">${esc(capF(x.reason))}</p>`:''}</div>`}
function musclePane(pr,vw,m){const v=pr.muscles[m],x=vw.muscles[m];
  if(!v)return `<div class="psh" data-pshm="${m}"><h2>${ML[m]||m}</h2><p class="sub">Nothing logged for ${(ML[m]||m).toLowerCase()} in the last 6 weeks.</p></div>`;
  if(!x)return `<div class="psh" data-pshm="${m}"><h2>${ML[m]||m}</h2><p class="sub">Not enough logged for a 3-month trend yet.</p></div>`;
  const ids=liftsOf(pr,m),ml=v.main_lift.id,e=effV(x.avg_rir),ink=TRI[x.band]?`var(--tr-${TRI[x.band]}-ink)`:'inherit';
  return `<div class="psh" data-pshm="${m}"><h2>${ML[m]||m}${x.bucket==='stalled_or_dropping'?` <span class="pstall">${v.main_lift.status==='dropping'?'Dropping':x.stalled?'Stalled':'Down'}</span>`:''}</h2>
   <div class="pshk"><div><b class="num" style="color:${ink}">${x.change_display||'–'}</b><span>Main lift, 3 mo</span></div><div><b class="num">${TRL[x.band]||'–'}</b><span>3-month trend</span></div><div><b class="num">${e==null?'–':fmtPct(e)}</b><span>Avg ${effT()}</span></div></div>${x.reason?`<p class="foot prsn1">${esc(capF(x.reason))}</p>`:''}
   <div class="ghead">Lifts</div><div class="group pmlifts">${ids.map(i=>{const L=pr.lifts[i];return `<button class="row" data-sl="${i}"><div class="grow"><div class="t1">${esc(L.name)}${i===ml?' <span class="tag pmain">Main lift</span>':''}</div><div class="t2">${esc(liftLine(L))}</div></div>${arrow(LST[L.status]||'insufficient')}${CHEV}</button>`}).join('')}</div>
   ${mainPicker(pr,m,ids,ml)}</div>`}
// Main lift picker: Automatic + every logged lift that trains the muscle at >= 0.25 (liftsOf); your pick is saved per muscle
function mainPicker(pr,m,ids,ml){const ov=mlGet()[m]||null,ign=(pr.overrides_ignored||[]).find(o=>o.muscle===m),nm=i=>(pr.lifts[i]||{}).name||exNameP(i);
  const row=(id,t1,t2,on)=>`<button class="row pmlp${on?' on':''}" data-pml="${id}" role="radio" aria-checked="${on}"><div class="grow"><div class="t1">${t1}</div>${t2?`<div class="t2">${t2}</div>`:''}</div><span class="pck" aria-hidden="true">${on?I('check',2.6):''}</span></button>`;
  const stale=ov&&!ids.includes(ov)&&!ign;
  return `<div class="ghead" data-pmlh="1">Main lift</div><div class="group pmlpick" role="radiogroup" aria-label="Main lift for ${esc(ML[m]||m)}">
    ${row('','Automatic','The lift you did most in the last 6 weeks',!ov||!!ign)}
    ${ids.map(i=>row(i,esc(nm(i)),i===ml&&!ov?'Current main lift':'',ov===i)).join('')}${stale?row(ov,esc(nm(ov)),'No sessions in the last 3 months',true):''}</div>
    ${ign?`<p class="foot pmlnote">Your pick, ${esc(nm(ign.exercise))}, trains ${esc((ML[m]||m).toLowerCase())} too little to count, so the automatic main lift is used.</p>`:''}
    ${ov?`<button class="btn grey block pmlreset" data-pml="" data-reset="1">Reset to automatic</button>`:''}
    <p class="foot">It sets the table's change %, sparkline, chart and the strength median for ${esc((ML[m]||m).toLowerCase())}.</p>`}
// the muscle's other lifts stay one tap away on the chart view
function liftSwitch(pr,id){const m=PSH.m;if(!m||!pr.muscles[m])return '';const ids=liftsOf(pr,m),ml=((pr.dashboard||{}).muscles||{})[m],mid=ml&&ml.main_lift?ml.main_lift.id:null;if(mid&&!ids.includes(mid))ids.unshift(mid);if(ids.length<2&&ids[0]===id)return '';
  return `<div class="plsw" role="tablist" aria-label="${esc(ML[m]||m)} lifts">${ids.map(i=>`<button class="pchip plsc${i===id?' on':''}" data-sl="${i}" role="tab" aria-selected="${i===id}">${esc(shortEx(i))}${i===mid?'<span class="plmain">Main</span>':''}${pr.lifts[i]?arrow(LST[pr.lifts[i].status]||'insufficient'):''}</button>`).join('')}</div>`}
function dotSet(id,met,sid){const fl=PROGRESS.flatten(Object.assign({},RD,{aliases:{}}),progHist());return PVIEW.dotSet(fl,id,met,sid,(kg,r)=>PRS.e1rmSet(RD,kg,r,'working',E1MAX()))}
function liftPane(pr,vw,id){const L=pr.lifts[id],u=pr.unit,M=PSH.m&&pr.muscles[PSH.m]&&vw.muscles[PSH.m]?PSH.m:null,mh=M?muscleHead(pr,vw,M):'',back='',mp=M?mainPicker(pr,M,liftsOf(pr,M),pr.muscles[M].main_lift.id):'',mattr=M?` data-pshm="${M}"`:'';
  const sw=liftSwitch(pr,id);
  if(!L)return `<div class="psh" data-pshl="${id}"${mattr}>${mh}${M?`<h3 class="plname">${esc(exNameP(id))}</h3>`:`<h2>${esc(exNameP(id))}</h2>`}${sw}<p class="sub">No sessions logged for this lift yet.</p>${mp}</div>`;
  const g=L.gain_vs_last,DL=dashLift(pr,id),met=DL?DL.metric:L.metric,nprs=DL?DL.dots.filter(d=>d.pr).length:0,c=DL&&DL.change;
  return `<div class="psh plh" data-pshl="${id}"${mattr} data-metric="${met}" data-kind="${L.kind}">${mh}${M?`<h3 class="plname">${esc(L.name)}</h3>`:`<h2>${esc(L.name)}</h2>`}${sw}
   <div class="pseg prng">${[['4w','4w'],['12w','12w'],['all','All']].map(([k,t])=>`<button data-prng="${k}" class="${PSH.rng===k?'on':''}">${t}</button>`).join('')}</div>
   ${cmRow(pr,id)}
   ${(()=>{const sh=cmShown(pr,id);if(sh&&sh!=='est_1rm'){const O=pr.metric_series[id].options[sh];return `<div class="card plcard" data-cmchart="${sh}"><div class="plt">${esc(O.axis.replace(/ x /g,' × '))}</div>${metricChart(pr,id,sh)}<div class="ptip" id="ptip" hidden></div></div>
   <p class="foot pnote1">${CMNOTE[sh]}${pr.metric_series[id].bodyweight_lift?' Includes your bodyweight.':''} Trend and 3-month change use ${esc(pr.metric_series[id].options.est_1rm.label)}.</p>`}
     if(!sh)return `<div class="card plcard" data-cmchart="none"><p class="foot">${esc(((RD.PR2.chart_metrics||{}).empty||{}).no_points||'No sessions with this measure yet')}</p></div>`;
     return `<div class="card plcard" data-cmchart="est_1rm"><div class="plt">${CTITLE[met](u)}</div>${liftChart(pr,id)}<div class="ptip" id="ptip" hidden></div></div>
   <p class="foot pnote1">${CNOTE[met]}</p>`})()}
   <div class="group plinfo"><div class="row"><div class="grow t1">Last time</div><span class="val">${g?esc(g.text):'–'}</span></div>${g&&g.detail?`<div class="row"><div class="grow t2">${esc(g.detail)}</div></div>`:''}
    ${cmShown(pr,id)&&cmShown(pr,id)!=='est_1rm'?'':`<div class="row"><div class="grow t1">Trend, last 6 weeks</div><span class="val">${arrow(LST[L.trend.status]||'insufficient')}</span></div><div class="row"><div class="grow t2">${esc(liftLine(L))}</div></div>
    <div class="row"><div class="grow t1">vs 3 months ago</div><span class="val num">${c&&c.status==='ok'?`${c.pct_display} <span class="t2">(${esc(c.early.display)} → ${esc(c.late.display)})</span>`:esc(capF((c&&c.reason)||'–'))}</span></div>`}
    <div class="row"><div class="grow t1">${cmShown(pr,id)&&cmShown(pr,id)!=='est_1rm'?'Sessions with a new best':'Sessions with a PR'}</div><span class="val num">${cmShown(pr,id)&&cmShown(pr,id)!=='est_1rm'?pr.metric_series[id].options[cmShown(pr,id)].points.filter(q=>q.pr).length:nprs}</span></div></div>${mp}</div>`}
const CMNOTE={heaviest:'Your heaviest working set each session. A real logged load, not an estimate.',best_set_volume:'Your best single set each session: load × reps.',
  session_tonnage:'Every working set of this lift each session, load × reps added up. It grows with the number of sets, so it reads as work done, not strength.'};
// the toggle: Coach's options in order (est_1rm takes the lift's own label: Best reps / Best hold (s) / Load-reps index); unavailable ones are
// disabled and say why (tap: the reason as a toast; the reasons also sit under the row)
function cmRow(pr,id){const MS=pr.metric_series&&pr.metric_series[id];if(!MS)return '';const C=CM_OPTS(),sh=cmShown(pr,id),saved=cmGet(),why=[];
  const b=C.options.map(o=>{const O=MS.options[o],on=o===sh,dis=!O.available;if(dis&&O.reason_text&&!why.includes(O.reason_text))why.push(O.reason_text);
    return `<button type="button" class="pchip pmc${on?' on':''}${dis?' off':''}" data-pmet="${o}" role="radio" aria-checked="${on}"${dis?` aria-disabled="true" data-why="${esc(O.reason_text||'')}"`:''}>${esc(O.label)}</button>`}).join('');
  const fb=sh&&saved!==sh&&MS.options[saved]&&!MS.options[saved].available?`<p class="foot pmetfb" data-pmetfb="1">${esc(MS.options[saved].label)} isn't available for this lift, so it shows ${esc(MS.options[sh].label)}.</p>`:'';
  return `<div class="pmet" role="radiogroup" aria-label="Chart measure" data-pmetsaved="${saved}">${b}</div>${why.length?`<p class="foot pmetwhy">${why.map(esc).join(' ')}</p>`:''}${fb}`}
// chart for heaviest / best_set_volume / session_tonnage from report().metric_series (values in kg -> the display unit); new-best dots in accent;
// 1 point = a single dot, no line (Coach's empty strings); no trend line, no %
function metricChart(pr,id,o){const u=pr.unit,O=pr.metric_series[id].options[o],toU=kg=>u==='kg'?kg:kg*KG_LB;
  const P=PVIEW.inRange(O.points.map(q=>({...q,days_ago:Math.round((Date.parse(AS_OF)-Date.parse(q.date))/864e5)})),PSH.rng).map(q=>({...q,y:toU(q.value)}));
  if(!P.length)return `<p class="foot">No sessions in this range.</p>`;
  const W=340,H=196,ys=P.map(p=>p.y),lo0=Math.min(...ys),hi0=Math.max(...ys),span=Math.max(hi0-lo0,Math.max(10,hi0*0.05));
  const stp=[1,2,2.5,5,10,20,25,50,100,200,250,500,1000,2000,2500,5000,10000,20000].find(s=>span/s<=4)||50000,lo=Math.max(0,Math.floor((lo0-span*.08)/stp)*stp),hi=Math.ceil((hi0+span*.08)/stp)*stp;
  const nf=v=>Math.round(v).toLocaleString('en-US'),pl=hi>=10000?52:hi>=1000?48:42,pr2=12,pt=12,pb=28;
  const t0=Date.parse(P[0].date),t1=Date.parse(P[P.length-1].date),X=d=>pl+(t1>t0?(Date.parse(d)-t0)/(t1-t0):.5)*(W-pl-pr2),Y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb);
  const yt=[];for(let v=lo;v<=hi+1e-9;v+=stp)yt.push(v);
  const grid=yt.map(v=>`<line x1="${pl}" x2="${W-pr2}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${pl-6}" y="${Y(v)+3.5}" text-anchor="end" class="ya">${nf(v)}</text>`).join('');
  const nx=Math.min(4,P.length),xi=[...new Set(Array.from({length:nx},(_,k)=>Math.round(k*(P.length-1)/Math.max(1,nx-1))))];
  const xt=xi.map(k=>`<text x="${X(P[k].date)}" y="${H-8}" text-anchor="${P.length===1?'middle':k===0?'start':k===P.length-1?'end':'middle'}" class="dx">${fmtD(P[k].date)}</text>`).join('');
  const sfx=(RD.PR2.chart_metrics.tooltip||{}).pr_suffix||'',tip=q=>q.tooltip.replace(/^\d{4}-\d{2}-\d{2}: /,'').replace(sfx,'').replace(/ x /g,' × ');
  const dots=P.map((p,k)=>`<g class="pp${p.pr?' pr':''}" data-k="${k}" data-sid="${p.session_id}" data-tip="${esc(tip(p))}" data-date="${fmtD(p.date)}"${p.pr?' data-pr="1" data-best="1"':''}><circle cx="${X(p.date)}" cy="${Y(p.y)}" r="${p.pr?4.6:3.4}"/><circle class="phit" cx="${X(p.date)}" cy="${Y(p.y)}" r="13"/></g>`).join('');
  const ax={heaviest:u,best_set_volume:`${u} × reps`,session_tonnage:u}[o],one=O.points.length===1?`<p class="foot pmetone">${esc(O.empty||'')}</p>`:'';
  return `<svg viewBox="0 0 ${W} ${H}" class="plc" data-cmpts="${P.length}" role="img" aria-label="${esc(O.axis)}, ${P.length} sessions"><text class="yat" transform="translate(11 ${(pt+H-pb)/2}) rotate(-90)" text-anchor="middle">${esc(ax)}</text>${grid}
   ${P.length>1?`<polyline class="pln" points="${P.map(p=>`${X(p.date)},${Y(p.y)}`).join(' ')}"/>`:''}${dots}${xt}</svg>${one}
   <div class="plleg"><span><i class="lpt"></i>Each session</span>${P.some(p=>p.pr)?'<span><i class="lpr"></i>New best</span>':''}</div>`}
// lift chart: one dot per session (its best set), PR sessions in accent, a labelled y-axis, date ticks; tap a dot for the set
function liftChart(pr,id){const u=pr.unit,DL=dashLift(pr,id);if(!DL)return `<p class="foot">No sessions in this range.</p>`;const met=DL.metric,kgM=met==='e1rm'||met==='load_index';
  const toU=kg=>u==='kg'?kg:kg*KG_LB,P=PVIEW.inRange(DL.dots,PSH.rng).map(d=>({...d,sid:d.session_id,y:kgM?toU(d.value):d.value}));
  if(!P.length)return `<p class="foot">No sessions in this range.</p>`;
  const W=340,H=196,pl=42,pr2=12,pt=12,pb=28,ys=P.map(p=>p.y),lo0=Math.min(...ys),hi0=Math.max(...ys),span=Math.max(hi0-lo0,met==='e1rm'||met==='load_index'?10:4);
  const stp=[1,2,2.5,5,10,20,25,50,100].find(s=>span/s<=4)||200,lo=Math.floor((lo0-span*.08)/stp)*stp,hi=Math.ceil((hi0+span*.08)/stp)*stp;
  const t0=Date.parse(P[0].date),t1=Date.parse(P[P.length-1].date),X=d=>pl+(t1>t0?(Date.parse(d)-t0)/(t1-t0):.5)*(W-pl-pr2),Y=v=>pt+(hi-v)/(hi-lo)*(H-pt-pb);
  const yt=[];for(let v=lo;v<=hi+1e-9;v+=stp)yt.push(v);
  const grid=yt.map(v=>`<line x1="${pl}" x2="${W-pr2}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${pl-6}" y="${Y(v)+3.5}" text-anchor="end" class="ya">${+v.toFixed(1)}</text>`).join('');
  const nx=Math.min(4,P.length),xi=[...new Set(Array.from({length:nx},(_,k)=>Math.round(k*(P.length-1)/Math.max(1,nx-1))))];
  const xt=xi.map(k=>`<text x="${X(P[k].date)}" y="${H-8}" text-anchor="${k===0?'start':k===P.length-1?'end':'middle'}" class="dx">${fmtD(P[k].date)}</text>`).join('');
  const tip=p=>{if(met==='best_reps')return p.display;if(met==='hold_s')return `${p.value} s hold`;const x=dotSet(id,met,p.sid);if(!x)return p.display;
    const ld=nfmt(+(u==='kg'?x.added_kg:x.added_kg*KG_LB).toFixed(1));return met==='e1rm'?`${ld} × ${x.reps} → est. ${Math.round(p.y)}`:`${ld} × ${x.reps} → index ${Math.round(p.y)}`};
  const dots=P.map((p,k)=>{const isPr=p.pr,isB=p.best,isDl=p.deload;/* chart marker = dot.best (new all-time best); dot.pr stays for the tooltip */return `<g class="pp${isB?' pr':''}${isDl?' dl':''}" data-k="${k}" data-sid="${p.sid}" data-tip="${esc(tip(p))}" data-date="${fmtD(p.date)}${isDl?' · deload':''}"${isPr?' data-pr="1"':''}${isB?' data-best="1"':''}><circle cx="${X(p.date)}" cy="${Y(p.y)}" r="${isB?4.6:3.4}"/><circle class="phit" cx="${X(p.date)}" cy="${Y(p.y)}" r="13"/></g>`}).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="plc" role="img" aria-label="${esc(CTITLE[met](u))}, ${P.length} sessions"><text class="yat" transform="translate(11 ${(pt+H-pb)/2}) rotate(-90)" text-anchor="middle">${CAX[met](u)}</text>${grid}
   <polyline class="pln" points="${P.map(p=>`${X(p.date)},${Y(p.y)}`).join(' ')}"/>${dots}${xt}</svg>
   <div class="plleg"><span><i class="lpt"></i>Best set, each session</span>${P.some(p=>p.best)?'<span><i class="lpr"></i>New best</span>':''}${P.some(p=>p.deload)?'<span><i class="ldw"></i>Deload</span>':''}</div>`}
function showTip(g){const t=$('#ptip'),card=g.closest('.plcard');if(!t||!card)return;$$('.plc .pp.sel').forEach(x=>x.classList.remove('sel'));g.classList.add('sel');
  t.innerHTML=`<span>${esc(g.dataset.date)}${g.dataset.pr?' · PR':''}</span><b>${esc(g.dataset.tip)}</b>`;t.hidden=false;
  const c=g.querySelector('circle').getBoundingClientRect(),cb=card.getBoundingClientRect(),tw=t.offsetWidth;
  t.style.left=Math.max(6,Math.min(cb.width-tw-6,c.left-cb.left+c.width/2-tw/2))+'px';t.style.top=Math.max(4,c.top-cb.top-t.offsetHeight-8)+'px'}
function rerenderProgress(){const v=$('#view'),sc=v.scrollTop;v.innerHTML=V[S.scr]();v.scrollTop=sc;tapable(v)}
// iOS WebKit only sends a tap's click to SVG shapes that have a handler of their own: give dots and map muscles a no-op one (the delegate does the work)
const tapable=root=>{(root||document).querySelectorAll('.pmapc .mp,.plc .pp circle,.povc .ovhit,.povc .ovhit *').forEach(e=>{if(!e.onclick)e.onclick=()=>{}})};
function afterProgress(){tapable($('#view'))}
function progApply(k){const pr=progressData(),x=pr&&pr.needs_attention[+k];if(!x||!x.fix||!x.fix.apply_edits_board||!x.fix.ops||!window.BOARD)return;
  const before=BOARD.progApply(x.fix.ops);PROG.applied={key:akey(x),item:JSON.parse(JSON.stringify(x)),before,asig:BOARD.sig()};toast('Applied to your board');rerenderProgress()}
function progUndo(){const a=PROG.applied;if(!a)return;PROG.applied=null;if(BOARD.sig()===a.asig){BOARD.progUndo(a.before);toast('Undone · your board is back')}else toast('Your board changed after this. Undo it in Build.');rerenderProgress()}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-pmet],[data-mlx],[data-pspk],[data-pml],[data-pm],[data-plift],[data-pfix],[data-pundo],[data-pmore],[data-kgo],[data-psort],[data-sl],[data-psback],[data-prng],[data-ovk],[data-ovmore],[data-ovl],[data-ovr],.plc .pp,.pmapc .mp[data-mu]');
  if(!t||!($('#view').contains(t)||t.closest('.psheet')))return;e.preventDefault();
  if(t.matches('.pmapc .mp'))return openPSheet(t.dataset.mu);if(t.matches('.plc .pp'))return showTip(t);
  if(t.dataset.pspk){const vw=pview(progressData()),x=vw&&vw.muscles[t.dataset.pspk];return openPSheet(t.dataset.pspk,t.dataset.pspl||(x&&x.main)||null)}
  if(t.dataset.ovk){const k=t.dataset.ovk,P=PROG.ovPick;if(P&&P.lines.includes(k)){if(PROG.ovOff.has(k))PROG.ovOff.delete(k);else PROG.ovOff.add(k)}else{const i=PROG.ovExtra.indexOf(k);if(i>=0)PROG.ovExtra.splice(i,1);else PROG.ovExtra.push(k)}return rerenderProgress()}
  if(t.dataset.ovmore){PROG.ovMore=!PROG.ovMore;return rerenderProgress()}
  if(t.dataset.ovl)return openPSheet(t.dataset.ovm||null,t.dataset.ovl);
  if(t.dataset.ovr){PROG.ovr=t.dataset.ovr;return rerenderProgress()}
  if(t.dataset.pml!=null&&PSH.m){mlSet(PSH.m,t.dataset.pml||null);rerenderProgress();{const x=pview(progressData()).muscles[PSH.m];PSH.lift=(x&&x.main)||null}pshRender();toast(t.dataset.pml?'Main lift set':'Main lift back to automatic');return}
  if(t.dataset.mlx)return exDetail(t.dataset.mlx);if(t.dataset.pm)return openPSheet(t.dataset.pm);
  if(t.dataset.plift){const pr=progressData();return openPSheet(pr?muscleOfLift(pr,t.dataset.plift):null,t.dataset.plift)}
  if(t.dataset.pmet){if(t.getAttribute('aria-disabled')==='true'){toast(t.dataset.why||'Not available for this lift');return}cmSet(t.dataset.pmet);return pshRender()}
  if(t.dataset.sl){PSH.lift=t.dataset.sl;return pshRender()}if(t.dataset.psback){PSH.lift=null;return pshRender()}if(t.dataset.prng){PSH.rng=t.dataset.prng;return pshRender()}
  if(t.dataset.kgo){const el=$(`[data-psec=${t.dataset.kgo}]`);if(el)el.scrollIntoView({block:'start',behavior:'smooth'});return}
  if(t.dataset.psort){PROG.sort=t.dataset.psort;return rerenderProgress()}
  if(t.dataset.pfix!=null)return progApply(t.dataset.pfix);if(t.dataset.pundo)return progUndo();if(t.dataset.pmore){PROG.all=!PROG.all;return rerenderProgress()}});
function afterMap(){$$('.mmap .mp').forEach(p=>p.addEventListener('click',()=>{if(p.dataset.mu)go('#learn-'+p.dataset.mu)}))}

// STYLE GUIDE
const SW=[['--ink','#000000','Ink'],['--paper','#FFFFFF','Paper'],['--accent','#E8430C','Ember (accent)'],['--accent-press','#C2380A','Ember pressed / small text'],['--accent-tint','#FDECE6','Ember tint'],['--bg','#F2F2F4','Background'],['--fill','#E9E9EC','Fill'],['--text-2','#6B6B70','Secondary text'],['--danger','#E5242B','Delete only (functional)']];
V.style=()=>`<div class="nav"><div class="l"><button class="back" data-go="#settings">${I('chevL',2.4)}Settings</button></div><div class="t">Style guide</div><div class="r"></div></div>
  ${header('Ape-Chit')}
  <div class="card brand"><div class="lockup" role="img" aria-label="Ape-Chit lockup"></div><div class="icons"><div class="logo-tile big"></div><div class="logo-tile mid"></div><div class="logo-tile sm"></div>
   <p class="sub">Logo v3, pending approval. Defined once, as a design token.</p></div></div>
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
   <div class="tags"><span class="tag acc">More stretch emphasis</span><span class="tag">More stable</span><span class="badge">PR</span><span class="evb ink">Studies</span><span class="evb">Mechanics</span><span class="evb outl">Coach model</span></div>
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
const EVL={supported:['Supported','ink'],biomechanics:['Mechanics',''],modeled:['Model','outl']}; // not 'line': that class is the rest bar's absolutely positioned progress line (sb.css .line)
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
// Learn evidence labels: quiet inline text (same .evl rule as Analysis' Modeled / Thin evidence); tapping one opens the Evidence sheet
const EVXT={supported:'a training study measured it',biomechanics:'follows from anatomy and mechanics',modeled:'coach consensus or app model'};
const evb=e=>e&&EVL[e]?`<button class="evb ${EVL[e][1]}" data-ev="${e}" data-evx="${e}" aria-label="Evidence: ${EVL[e][0]}. What this means">${EVL[e][0]}</button>`:'';
function evSheet(k){sheet({title:'Evidence',body:`<div class="evsh">${Object.entries(EVL).map(([e,v])=>`<p data-ev="${e}"${e===k?' class="on"':''}><b>${v[0]}</b>: ${EVXT[e]||''}</p>`).join('')}<p>Numbers next to a label open the study behind it.</p></div>`})}
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

V.learn=()=>`<div class="nav"><div class="l">${backBtn()}</div><div class="t">Nerd Sh*t</div><div class="r"></div></div>${header('Nerd Sh*t')}<div id="learnbody"><p class="foot">Loading…</p></div>`;
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
   <p class="evkey">${Object.entries(EVL).map(([k,v])=>`<span class="evb ${v[1]}">${v[0]}</span> ${EVXT[k]||''}`).join('<br>')}</p>
   <p class="foot">${(EDU.idx||{}).disclaimer||''} Updated ${j.updated||''}.</p>`;
  afterMap();
}
V.learnFund=()=>`<div class="nav"><div class="l">${backBtn('Nerd Sh*t')}</div><div class="t"></div><div class="r"></div></div><div id="lf"><p class="foot">Loading…</p></div>`;
async function afterLearnFund(id){
  const sx=String(id||'').split('~')[1]||null;id=id&&String(id).split('~')[0];
  CITES=[];const idx=await eduLoad();if(!id){const f=idx.pages.find(p=>p.kind==='fundamental'&&p.status==='final');id=f&&f.id}
  const {entry,page:j}=await eduPage(id);
  if(!j){$('#lf').innerHTML=`${header((entry||{}).title||'Fundamentals')}<div class="soonbox"><span class="soon">Coming soon</span></div>`;return}
  const al=j.app_link||{};
  $('#lf').innerHTML=`<div class="fund-hero"><div class="eyebrow">Fundamentals</div><h1>${j.title}</h1><p>${j.summary||''}</p></div>
   ${al.explains?`<div class="card inapp"><div class="eyebrow">In Ape-Chit</div><p>${al.explains}</p><ul>${(al.features||[]).map(f=>`<li>${f.replace(/\s*\([^)]*\)/,'')}</li>`).join('')}</ul></div>`:''}
   <div class="lsx">${(j.sections||[]).map((s,i)=>sect(s.heading,`${(s.body||[]).map(p=>`<p>${p}</p>`).join('')}
      ${(s.points||[]).length?`<div class="pts">${s.points.map(p=>`<div class="pt"><p>${p.text}</p><div class="ptm">${ev(p)}${tagL(p.swap_tags)}</div></div>`).join('')}</div>`:''}`,i===0,(s.points||[]).length?s.points.length+' points':'')).join('')}
   ${(j.notes||[]).length?sect('Honest limits',`<ul class="bul">${j.notes.map(n=>`<li>${n}</li>`).join('')}</ul>`):''}
   ${refList()}</div><p class="foot">${(EDU.idx||{}).disclaimer||''}</p>`;
  // page#section from an analysis item's Learn link: open that section and scroll to it
  const ds=$$('#lf .lsx > details.ls');(j.sections||[]).forEach((x,i)=>{if(ds[i])ds[i].dataset.sec=x.id});
  if(sx){const k=(j.sections||[]).findIndex(x=>x.id===sx),el=ds[k];if(el){ds.forEach(d=>d.open=false);el.open=true;el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1400);el.scrollIntoView({block:'start'})}}
}
// ---- round 2 batch B: analysis item chips + explain sheets (item 3), exercise detail popup + tray sort (item 4)
// analysis_metrics v2 items: kind chip (Check / Measure / Info) and an (i) that opens what / how / why + the Learn page#section
const KINDL={check:'Check',measure:'Measure',info:'Info'};
// Round 3: data/analysis-display.json render_kind false: the kind words (check / measure / info) never render; labels = display_label
const kchip=k=>((RD&&RD.DISP)||{}).render_kind===false?'':`<span class="kchip k-${k}" data-kind="${k}">${KINDL[k]||k}</span>`;
const dispL=(id,fb)=>((((RD&&RD.DISP)||{}).items||{})[id]||{}).display_label||fb;
const itemDef=id=>(((RD&&RD.rules.analysis_metrics)||{}).items||[]).find(i=>i.id===id);
const EVT={supported:'Supported',thin:'Thin evidence',modeled:'Modeled'};
const learnGo=lp=>{const [p,sx]=String(lp).split('#');return `#learn-f-${p}${sx?'~'+sx:''}`};
const ibtn=(id,attr='data-xpl')=>`<button class="ixb" ${attr}="${id}" aria-label="What is this?">${I('info',1.8)}</button>`;
function explainSheet(id,extra=''){const it=itemDef(id);if(!it)return null;const x=it.explain||{},lp=x.learn_page;
  const s=sheet({title:'',cls:'grouped xsheet',right:'<button class="btn plain" data-x="close">Done</button>',
    body:`<div class="xpl" data-item="${id}">${kchip(it.kind)?`<div class="xh">${kchip(it.kind)}</div>`:''}<div class="xpsh"><h3>${dispL(id,it.label)}</h3><span class="evl" data-ev="${it.evidence||'modeled'}">${EVT[it.evidence]||'Modeled'}</span></div>${it.status==='proposed'?'<p class="xprop">This measure is still proposed in the analysis spec, not yet a settled check.</p>':''}
     <div class="group xq"><div class="row"><div class="grow"><div class="xk">What it measures</div><p>${x.what||it.description||''}</p></div></div>
      <div class="row"><div class="grow"><div class="xk">How it's calculated</div><p>${x.how||it.formula||''}</p></div></div>
      <div class="row"><div class="grow"><div class="xk">Why it matters</div><p>${x.why||''}</p></div></div></div>
     ${extra}
     ${lp?`<div class="pad"><button class="btn grey block xlearn" data-x="learn" data-go="${learnGo(lp)}">${I('book',1.8)} <span>Nerd Sh*t: ${lp.split('#')[0].replace(/-/g,' ')}</span></button></div>`:'<p class="foot">No Nerd Sh*t page for this one yet.</p>'}</div>`});
  if(lp)eduLoad().then(idx=>{const p=(idx.pages||[]).find(q=>q.id===lp.split('#')[0]),b=$('.xlearn span',s.el);if(p&&b)b.textContent='Nerd Sh*t: '+p.title}).catch(()=>{});
  s.el.addEventListener('click',e=>{if(e.target.closest('[data-x=close]'))return s.close();const g=e.target.closest('[data-go]');if(g){e.preventDefault();e.stopPropagation();const h=g.dataset.go;closeAll();go(h)}});return s}
// exercise detail popup: data/exercise-details.json (loaded on first open, 590 KB). Photos only when show_photo (exact match);
// approximate photos are never shown. The files are copied into assets/ex-photos by build-photos.py (free-exercise-db, The Unlicense).
let EXD=null;
async function exdLoad(){if(!EXD){try{const j=await fetch(DATA+'exercise-details.json').then(r=>r.json());EXD={};const L=j.exercises||[];(Array.isArray(L)?L:Object.values(L)).forEach(e=>EXD[e.id]=e)}catch(e){EXD={}}}return EXD}
const yn=b=>b?'Yes':'No',pctS=v=>`${Math.round(v*100)}%`;
function exDetailBody(id,d){const e=EX[id]||{},f=d.fatigue||{},st=d.stretch||{},sp=d.stimulus_per_fatigue||{},rr=d.rep_range||{},bm=(d.body_map||{}).muscles||{};
  const LV=(d.body_map||{}).levels||{},LL=(d.body_map||{}).level_labels||{},vm={};for(const [m,v] of Object.entries(bm)){const k=LV2HL[LV[m]];if(v>0&&k)vm[m]=HLV[k]}
  const rateL=(t)=>{const k=LV2HL[LV[t.muscle]];return `<span class="rate ${k||'nc'}" data-level="${LV[t.muscle]||''}"><b class="num">${+t.rating.toFixed(2)}</b>${LL[LV[t.muscle]]||''}</span>`};const sfor=(st.stretch_biased_for||[]).map(m=>ML[m]||m);
  const row=(k,v,sub='')=>`<div class="row xm"><div class="grow"><div class="t1">${k}</div>${sub?`<div class="t2">${sub}</div>`:''}</div><span class="val num">${v}</span></div>`;
  return `${d.show_photo&&d.photos?`<div class="xphotos" data-photo="exact">${['start','end'].map((k,i)=>`<figure><img src="assets/ex-photos/${id}-${i}.jpg" alt="${esc(d.name)} ${k} position" loading="lazy"><figcaption>${k==='start'?'Start':'End'}</figcaption></figure>`).join('')}</div>
     <p class="foot xcred">Photos: free-exercise-db (“${esc(d.photos.source_name)}”), public domain (The Unlicense).</p>`:''}
   <div class="mapcard small xmap" data-mus="${Object.keys(vm).join(' ')}"><div class="maps">${map('front',vm)}${map('back',vm)}</div><div class="legend">${hlLegend({main:LL.primary||'main',helper:LL.secondary||'helper',minor:LL.minor||'minor'})}</div></div>
   <div class="ghead">Muscles worked · share of each set's credit</div>
   <div class="group inset0 xtg">${(d.targets||[]).map(t=>`<button class="row" data-go="#learn-${t.muscle}"><div class="grow t1">${ML[t.muscle]||t.muscle}</div>${rateL(t)}<span class="val num xsh">${t.counts?pctS(t.share):'map only'}</span>${CHEV}</button>`).join('')}${!(d.targets||[]).length&&d.untracked_target?`<div class="row utn"><div class="grow"><div class="t1">${d.untracked_target.label||'Not tracked'}</div><div class="t2">${d.untracked_target.tag||''}</div></div></div>`:''}</div>
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
function exDetail(id,o={}){if(isCx(id))return cxDetail(id,o);const e=EX[id];if(!e)return null;
  const s=sheet({title:'',cls:'grouped tall xdet',right:'<button class="btn plain" data-x="close">Done</button>',
    body:`<div class="xd" data-id="${id}"><div class="exi-h">${gl(id)}<div><h3>${exName(id)}</h3><p class="sub">${(e.type||' ')[0].toUpperCase()+(e.type||'').slice(1)} · ${e.eq||''}</p></div></div><div id="xdb"><p class="foot">Loading…</p></div>
     <div class="pad two">${e.learn!==false?`<button class="btn grey" data-x="learn" data-go="#learn-ex-${id}">${I('book',1.8)} Nerd Sh*t</button>`:''}${o.onAdd?`<button class="btn accent" data-x="add">${I('plus',2)} ${o.addLabel||'Add'}</button>`:''}</div></div>`});
  exdLoad().then(D=>{const d=D[id],b=$('#xdb',s.el);if(!b)return;b.innerHTML=d?exDetailBody(id,d):'<p class="foot">No detail data for this exercise.</p>';
    const lb=$('[data-x=learn]',s.el);if(lb&&d&&!(d.learn||{}).authored)lb.innerHTML=`${I('book',1.8)} Nerd Sh*t (draft)`});
  xvLoad().then(()=>{const h=$('.exi-h',s.el);if(h&&xvOf(id)&&e.learn!==false&&!$('.xwatch',s.el))h.insertAdjacentHTML('beforeend',`<button class="xwatch" data-go="#learn-ex-${id}~video" aria-label="Watch the technique video">${I('play')}Watch</button>`)});
  s.el.addEventListener('click',ev=>{if(ev.target.closest('[data-x=close]'))return s.close();if(ev.target.closest('[data-x=add]')){s.close();return o.onAdd&&o.onAdd(id)}
    const g=ev.target.closest('[data-go]');if(g){ev.preventDefault();ev.stopPropagation();const h=g.dataset.go;closeAll();go(h)}});return s}
// tray sort (both trays): Best match = the shared ranker (default); A–Z; Most stimulus for the filtered muscle; Lowest fatigue
const SORTS=[['sug','Best match'],['az','A–Z'],['stim','Most stimulus'],['fat','Lowest fatigue']];
// 'Most stimulus' used to be disabled (and coerced back to Best match) until a muscle filter was picked; the tray opens with
// no muscle filter, so it was always greyed out. With no muscle filter it now sorts by total stimulus per set: the sum of the
// exercise's muscle ratios (the set credit Analysis gives across all muscles), then stimulus per fatigue, then name.
const sortMode=(m,mus)=>m==='lib'?'az':(SORTS.some(x=>x[0]===m)?m:'sug');
const totRat=e=>Object.values(e.muscles||{}).reduce((a,v)=>a+(+v||0),0);
const sortHtml=(mode,mus,at)=>{const m=sortMode(mode,mus);return `<div class="tfr tsort noswipe" data-row="sort"><span class="tfl">Sort</span>${SORTS.map(([k,l])=>`<button class="chip xs ${k===m?'on':''}" data-${at}="${k}" aria-pressed="${k===m}">${k==='stim'&&mus?`Most ${(ML[mus]||mus).toLowerCase()} stimulus`:l}</button>`).join('')}</div>`};
function sortIds(ids,mode,mus){const E=RD.EX,nm=i=>(E[i]||{}).name||i,byN=(a,b)=>nm(a).localeCompare(nm(b));const L=ids.slice();
  if(mode==='az')return L.sort(byN);
  if(mode==='stim'){const v=i=>mus?(E[i].muscles[mus]||0):totRat(E[i]);return L.sort((a,b)=>(v(b)-v(a))||((v(b)/E[b].fatigue)-(v(a)/E[a].fatigue))||byN(a,b))}
  if(mode==='fat')return L.sort((a,b)=>(E[a].fatigue-E[b].fatigue)||byN(a,b));return L}
const sortNote=(mode,mus)=>({az:'A–Z',stim:mus?`most ${(ML[mus]||mus).toLowerCase()} stimulus per set first`:'most total stimulus per set first',fat:'lowest fatigue rating first'})[mode]||'';
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
  RDP=(async()=>{const opt=['templates.json','templates-reference.json','progress-rules.json','analysis-display.json','frequency-notes.json','custom-exercise-defaults.json','sample-log.json','evolution-rules.json'].map(n=>getJ(DATA+n));
    const [exercises,rules,targets,patterns,splits]=await Promise.all(['exercises.json','rules.json','targets.json','patterns.json','splits.json'].map(n=>getJ(DATA+n)));
    const [tj,tref,pr2,disp,fnotes,cxd,slog,evo]=await Promise.all(opt);   // custom-exercise defaults fetched with the rest, so a reload never aborts it mid-chain
    if(!(exercises&&rules&&targets&&patterns&&splits)){if(!UNLOADING)console.warn('ranking data missing: suggestions fall back to library order');return null}
    const tf=(((rules.templates||{}).file)||'templates.json').replace(/^data\//,'');
    const R=RANK.makeData({exercises,rules,targets,patterns,splits});R.splits=splits;R.base=DATA;
    R.TJ=tf==='templates.json'?tj:await getJ(DATA+tf);R.TREF=tref;R.PR2=pr2;R.SLOG=slog;R.EVO=evo;R.DISP=disp;R.FN=fnotes;
    try{await cxLoad(R,exercises,rules,cxd)}catch(x){console.warn('custom exercises not loaded',x)}   // custom exercises: defaults loader + registration (before anything reads RD)
    RD=R;return RD})();
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
// EXERCISE VIDEOS (Coach's data/exercise-videos.json, display notes in exercise-videos.md). Read at runtime, never hardcoded: one entry per
// exercise with confidence exact | close_variant | none. none (or no entry / no video_id) = no block at all. Lazy: a thumbnail
// (i.ytimg.com) with a play button; the youtube-nocookie iframe is only inserted on tap. Close variants get a muted inline label
// (.evl, same as Modeled / Thin evidence) and a "Similar movement: …" line from `note`. Third-party demos: no endorsement wording.
let XV=null,XVP=null;
function xvLoad(){if(XV)return Promise.resolve(XV);if(XVP)return XVP;
  XVP=getJ(DATA+'exercise-videos.json').then(j=>{const m={};((j&&j.videos)||[]).forEach(v=>{if(v&&v.exercise_id)m[v.exercise_id]=v});XV=m;XVP=null;return XV});return XVP}
const xvOf=id=>{const v=XV&&XV[id];return v&&v.confidence!=='none'&&/^[\w-]{6,20}$/.test(v.video_id||'')?v:null};
// channel display names (data keeps the oEmbed author_name; '[P]rehab' is The Prehab Guys' YouTube name)
const XV_CH={'[P]rehab':'The Prehab Guys'},xvCh=c=>XV_CH[c]||c||'';
const xvDur=s=>s==null?'':s<60?`${s} s`:`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const xvSimilar=n=>{const t=String(n||'').split('; ').pop().trim();return t?t[0].toUpperCase()+t.slice(1):''};
// The video's own title is never shown or used in attributes: the label is always our exercise name (no third-party health claims).
function xvBlock(id){const v=xvOf(id);if(!v)return '';return xvBlockV(v,esc(exNameP(id)),{})}
// shared renderer (library videos + a custom exercise's demo link): thumbnail, tap to play youtube-nocookie, our exercise name as the label
function xvBlockV(v,nm,o){const cv=v.confidence==='close_variant';
  return `<section class="xvid"${o.custom?' data-custom="1"':' id="xvid"'} data-video="${v.video_id}" data-conf="${v.confidence}"><div class="xvh"><span>Technique video</span>${cv?'<span class="evl" data-ev="close_variant">Close variant</span>':''}</div>
   <button class="xvth" data-act="xvplay" data-v="${v.video_id}" data-name="${nm}"${v.start_s?` data-start="${v.start_s}"`:''} aria-label="Play technique video: ${nm}"><img data-src="https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg" alt="${nm} technique video" loading="lazy" referrerpolicy="no-referrer"><span class="xvpl">${I('play')}</span>${v.duration_s!=null?`<span class="xvd num">${xvDur(v.duration_s)}</span>`:''}</button>
   <div class="xvm"><div class="t1">${nm}</div><div class="t2 xvc">${esc(xvCh(v.channel))}${v.duration_s!=null?` · ${xvDur(v.duration_s)}`:''}</div>${cv&&xvSimilar(v.note)?`<div class="t2 xvs">Similar movement: ${esc(xvSimilar(v.note))}</div>`:''}</div>
   <p class="foot xvf">${o.custom?`Your demo link${o.checked?'':' (not yet checked with YouTube)'}. `:''}Third-party technique demo on YouTube. Not an endorsement or medical advice.</p></section>`}
function xvPlay(b){const v=b.dataset.v,st=b.dataset.start;const f=document.createElement('iframe');
  f.src=`https://www.youtube-nocookie.com/embed/${v}?autoplay=1&playsinline=1&rel=0${st?'&start='+st:''}`;f.title=`${b.dataset.name||'Exercise'} technique video`;f.className='xvif';
  f.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');f.setAttribute('allowfullscreen','');f.setAttribute('loading','lazy');b.replaceWith(f)}
V.learnEx=()=>`<div class="nav"><div class="l">${backBtn()}</div><div class="t" id="lxt"></div><div class="r" id="lxr"></div></div><div id="lx"><p class="foot">Loading…</p></div>`;
async function afterLearnEx(id){
  const sx=String(id||'').split('~')[1]||null;id=String(id||'').split('~')[0];await xvLoad();
  const e=EX[id]||{rat:{},mus:[]},{page:j}=await exPage(id),nm=(j&&j.title)||e.name||id;
  if(S.scr!=='learnEx'||String(S.arg||'').split('~')[0]!==id)return; // a newer Learn page was opened while this one loaded: don't paint stale content
  CITES=[];$('#lxr').innerHTML=starBtn(id);
  // live ratings come from exercises.json (EX.rat); Coach's page only adds the explanation per muscle
  const pm={};((j&&j.muscles)||[]).forEach(m=>pm[m.muscle_id]=m);
  const live=m=>e.rat[m]!=null?e.rat[m]:(pm[m]||{}).rating||0;
  const ids=j&&j.muscles?j.muscles.map(m=>m.muscle_id):Object.keys(e.rat).filter(m=>e.rat[m]>0);
  const shown=ids.map(m=>[m,live(m)]).sort((a,b)=>b[1]-a[1]),hidden=0;
  const hit=sect('Muscles hit',`<div class="mhit">${!shown.length&&utOf(id)?`<div class="utn" data-ut="${utOf(id).id}"><b>${utOf(id).label}</b><p class="sub">${utOf(id).tag}</p></div>`:''}${shown.map(([m,r])=>{const x=pm[m]||{};return `<button class="mh" data-r="${r}" data-go="#learn-${m}"><span class="mn">${ML[m]||m}</span><span class="mb ${BAND(r)||'nc'}"><i style="--w:${r*100}%"></i></span><span class="rate ${BAND(r)||'nc'}"><b class="num">${+(+r).toFixed(2)}</b>${XBANDL[BAND(r)||'nc']}</span></button>${x.why?`<p class="mwhy">${x.why} ${x.evidence?ev(x):''}</p>`:''}${(x.region_notes||[]).map(n=>`<p class="mwhy rn"><b>${(window.RNAME||{})[n.region_id]||n.region_id.replace(/_/g,' ')}</b> ${n.text} ${ev(n)}</p>`).join('')}`}).join('')}</div>
    <p class="foot" style="padding:6px 0 0">Live ratings from exercises.json. Bands are a model: main mover 0.75+, helper 0.4–0.75, minor 0.25–0.4, not counted under 0.25.</p>`,true,shown.length);
  const has=a=>a&&a.length,ph=j&&(j.placeholder||/PLACEHOLDER/.test(j.notice||''));
  const tw=t=>t.change?{h:t.change,tg:(t.target_muscle_ids||[]).map(m=>ML[m]||m).join(', '),k:t.kind}:{h:t.tweak,tg:ML[t.target]||t.target,k:''};
  const cx=isCx(id);
  const body=cx?`<div class="lsx">${hit}</div><p class="foot cxsrc">Your exercise: there is no Coach page for it. Muscle credit comes from the bands you picked; the other numbers are modeled from similar library exercises.</p>`:!j?`<div class="soonbox"><span class="soon">Coming soon</span><p class="sub">Coach is writing this page.</p></div><div class="lsx">${hit}</div>`:`
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
  $('#lx').innerHTML=`<div class="exhero">${gl(id)}<div><h1>${nm}</h1><p class="sub">${(e.type||' ')[0].toUpperCase()+(e.type||'').slice(1)} · ${e.eq||''}${isFav(id)?' · ★ Favorite':''}${cx?cxL(id):''}</p></div></div>
   ${j&&j.summary?`<p class="lsum">${j.summary}</p>`:''}
   ${j&&j.equipment_needs&&j.equipment_needs.text?`<p class="needs">${I('build',1.8)}<span>${j.equipment_needs.text}</span></p>`:''}
   <div class="pad two"><button class="btn grey" data-act="swap" data-id="${id}">${I('swap',1.8)} Swap</button><button class="btn accent" data-act="add">${I('plus',2)} Add to workout</button></div>${cx?cxMediaBlock(id):xvBlock(id)}${body}`;
  if(cx)cxWireLoops($('#lx'));
  // the thumbnail is requested only after the page has painted, and only if this page is still the one on screen
  setTimeout(()=>{const im=$('#xvid .xvth img[data-src]');if(im&&S.scr==='learnEx'&&String(S.arg||'').split('~')[0]===id){im.src=im.dataset.src;im.removeAttribute('data-src')}},250);
  if(sx==='video'){const vb=$('#xvid');if(vb){const V0=$('#view');V0.scrollTop+=vb.getBoundingClientRect().top-V0.getBoundingClientRect().top-60;vb.classList.add('flash')}}
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
  <p class="foot">Star exercises on their Nerd Sh*t page, in the tray or in swaps. Swipe to remove, drag to reorder; order breaks ties in suggestions.</p>`}
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
 'progress-effort':['progress','progress',0,0,()=>{PROG.empty=false},()=>{const e=$('[data-psec=muscles]');if(e)e.scrollIntoView({block:'start'})}],
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
 settings:['settings','build'],'settings-equip':['settings','build',0,0,null,equipSheet],progress:['progress','progress',0,0,()=>{PROG.empty=false}],'progress-empty':['progress','progress',0,0,()=>{PROG.empty=true}],'progress-muscle':['progress','progress',0,0,()=>{PROG.empty=false},()=>openPSheet('side_delts')],'progress-refine':['progress','progress',0,0,()=>{PROG.empty=false},()=>{const e=$('[data-psec=attention]');if(e)e.scrollIntoView({block:'start'})}],style:['style','build'],
 ladder:['ladder','progress'],'ladder-teaser':['ladder','progress',0,0,null,()=>{const t=$('[data-llock]');t&&t.scrollIntoView({block:'center',inline:'center'})}],
 'settings-ladder':['settings','build',0,0,null,()=>{const e=$('#ladset');e&&($('#view').scrollTop=e.offsetTop-60)}],
 'finish-rankup':['finish','',1,0,()=>{FIN=finBuild(true,ladRankupDemo)}],
 'finish-plates2':['finish','',1,0,()=>{FIN=finBuild(true,()=>ladPlateDemo('bench',225,5),H=>logBelow(H,'bench',S.unit==='kg'?100*KG_LB:225))}],'finish-plates3':['finish','',1,0,()=>{FIN=finBuild(true,()=>ladPlateDemo('bench',315,1))}],
 'finish-plates4':['finish','',1,0,()=>{FIN=finBuild(true,()=>ladPlateDemo('deadlift',405,2))}],'finish-plates5':['finish','',1,0,()=>{FIN=finBuild(true,()=>ladPlateDemo('deadlift',495,1))}],
 'finish-plates-deload':['finish','',1,0,()=>{FIN=finBuild(true,()=>ladPlateDemo('deadlift',405,2,true))}],'finish-plates-again':['finish','',1,0,()=>{FIN=finBuild(true,()=>ladPlateDemo('bench',225,5))}],
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
  else if(!def&&/^progress-m-/.test(r)){const m=r.slice(11);def=['progress','progress',0,0,()=>{PROG.empty=false},()=>openPSheet(m)]}
  else if(!def&&/^progress-l-/.test(r)){const id=r.slice(11);def=['progress','progress',0,0,()=>{PROG.empty=false},()=>{const pr=progressData();openPSheet(pr?muscleOfLift(pr,id):null,id)}]}
  else if(!def&&/^log-d\d+$/.test(r)){const n=+r.slice(5);def=['logDay','log',0,0,()=>{S.logDay=n}]}
  if(!def){r='train';def=ROUTES.train}
  const [scr,tab,full,sess,pre,post]=def;
  closeAll();$$('.pmom').forEach(e=>e.remove());if(AF){AF.classList.remove('active');AF=null}
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
  AFTER[S.scr]&&AFTER[S.scr]();setTimeout(afmKick,300);setTimeout(afmKick,900);
  if(S.scr==='learnEx')afterLearnEx(S.arg);if(S.scr==='settings')afterSettings();if(S.scr==='learnMuscle')afterLearnMuscle(S.arg);if(S.scr==='learnFund')afterLearnFund(S.arg);
}
// one delegated click handler for the whole app
document.addEventListener('click',e=>{
  const xp=e.target.closest('[data-xpl]');if(xp){e.preventDefault();return explainSheet(xp.dataset.xpl)}
  const ref=e.target.closest('[data-ref]');if(ref){e.preventDefault();return refSheet(ref.dataset.ref)}
  const evx=e.target.closest('[data-evx]');if(evx){e.preventDefault();e.stopPropagation();return evSheet(evx.dataset.evx)}
  const fld=e.target.closest('.fld');if(fld&&!fld.classList.contains('demo')){focusField(fld);return}
  const g=e.target.closest('[data-go]'),a=e.target.closest('[data-act]');
  if(a&&(!g||g.contains(a))){const k=a.dataset.act,id=a.dataset.id;
    if(k==='xvplay'){e.preventDefault();return xvPlay(a)}
    if(k==='trash'){e.stopPropagation();return trashSheet()}
    if(k==='pick'){const r=ROUTINES.find(x=>x.id===id);if(r.active&&!S.pick)return;S.pick=(S.pick===id||r.active)?null:id;
      $$('.rt').forEach(el=>{const on=S.pick?el.dataset.rt===S.pick:el.classList.contains('act');el.classList.toggle('open',on);el.classList.toggle('closed',!on)});
      if(S.pick)setTimeout(()=>{const el=$(`.rt[data-rt=${S.pick}]`);$('#view').scrollTo({top:el.offsetTop-70,behavior:'smooth'})},280);return}
    if(k==='start'){const r=ROUTINES.find(x=>x.id===id)||ROUTINES[0],di=S.day[r.id]??(r.active?r.next:0),d=r.days[di];
      startWorkout(d.n,d.ex,{sub:`${r.name} · Day ${di+1}`,ref:{rid:r.id,di}});return go('#workout')}
    if(k==='sundo'){const f=SUF;hideSnack();if(f)f();return}
    if(k==='theme'){const t=setTheme(a.dataset.v);$$('#themeseg button').forEach(b=>b.classList.toggle('on',b.dataset.v===t));return}
    if(k==='unit'){S.unit=a.dataset.v==='kg'?'kg':'lb';try{localStorage.setItem(UNIT_K,S.unit)}catch(x){}$$('#unitseg button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.unit));return toast(`Units: ${S.unit}`)}
    if(k==='notes')return notesSheet(+a.dataset.xi);if(k==='exmenu')return exMenu(+a.dataset.xi);if(k==='wswap')return wSwap(+a.dataset.xi);
    if(k==='activate'){const r=ROUTINES.find(x=>x.id===id);ROUTINES.forEach(x=>x.active=false);r.active=true;r.next=0;S.pick=null;ROUTINES.sort((x,y)=>y.active-x.active);render();return toast(`${r.name} is now active`)}
    if(k==='minimize'){S.session=true;return go('#train')}
    if(k==='clock')return clockSheet();if(k==='plates')return plateSheet(a.dataset.xi!=null?+a.dataset.xi:0);if(k==='swap')return swapSheet(id);if(k==='tray')return traySheet();if(k==='equip')return equipSheet();
    if(k==='info'||k==='exinfo')return go('#learn-ex-'+id);if(k==='fav'){e.stopPropagation();return toggleFav(id)}if(k==='back')return NAV>1?history.back():go('#train');
    if(k==='restsheet'){if(!e.target.closest('button'))restSheet();return}
    if(k==='rest-'){WK.rest.left=Math.max(0,WK.rest.left-15);return paintTime()}if(k==='rest+'){WK.rest.left+=15;WK.rest.total=Math.max(WK.rest.total,WK.rest.left);return paintTime()}
    if(k==='skip'){WK.rest.left=0;return paintTime()}
    if(k==='rir'){const p=a.closest('.rirp'),xi=+p.dataset.xi,si=+p.dataset.si,st=((WK.ex[xi]||{}).sets||[])[si];if(!st)return;const v=+a.dataset.v;st.rir=EFF().clampRir(st.rir)===v?null:v;
      $$('.rirc',p).forEach(c=>{const on=+c.dataset.v===st.rir;c.classList.toggle('on',on);c.setAttribute('aria-pressed',on)});return}
    if(k==='rirOpen'){const xi=+a.dataset.xi,si=+a.dataset.si,sw=a.closest('.swipe');rirClose();a.remove();WK.rirAt=`${xi}:${si}`;sw&&sw.insertAdjacentHTML('afterend',rirPick(xi,si));return}
    if(k==='ck'){const r=a.closest('.srow');r.classList.toggle('done');const st=((WK.ex[+r.dataset.xi]||{}).sets||[])[+r.dataset.si];if(st)st.done=r.classList.contains('done');
      {const sw=r.closest('.swipe');rirClose();const om=$('.rirm',r);if(om)om.remove();
       if(st&&st.done){WK.rirAt=`${r.dataset.xi}:${r.dataset.si}`;sw&&sw.insertAdjacentHTML('afterend',rirPick(+r.dataset.xi,+r.dataset.si))}else WK.rirAt=null}
      if(r.classList.contains('done')){$$('.fld',r).forEach(f=>{if(!f.value)f.value=f.placeholder;f.classList.remove('auto');syncField(f)});const ex=WK.ex[+r.dataset.xi];
        WK.restLab=ex?`${(RD&&RD.EX[ex.id]&&RD.EX[ex.id].short_name)||exNameP(ex.id)} set ${ex.sets.slice(0,+r.dataset.si+1).filter(x=>!x.warm).length}`:'';WK.rest.left=WK.rest.total=180;const l=$('.rlb');if(l)l.textContent='Rest · '+WK.restLab;paintTime()}renderBar();return}
    if(k==='addset'){const xi=+a.dataset.xi,ex=WK.ex[xi];if(!ex)return;const last=ex.sets[ex.sets.length-1]||{};ex.sets.push({p:'',wv:last.wv||'',wu:last.wu,wauto:!!last.wv});renderEx(xi);return}
    if(k==='day'){const d=+a.dataset.d;S.logSel=d;$$('.cd').forEach(c=>c.classList.toggle('sel',+c.dataset.d===d));return LOGS[d]?go('#log-d'+d):editSheet(d)}
    if(k==='edit'||k==='ledit')return editSheet(+a.dataset.d);if(k==='month')return monthSheet();
    if(k==='mprev'||k==='mnext'){S.month+=k==='mnext'?1:-1;if(S.month<0){S.month=11;S.year--}if(S.month>11){S.month=0;S.year++}return render()}
    if(k==='add')return toast('Added to workout');if(k==='push')return toast('Pushed to Library · v4');
    if(k==='tg'){a.classList.toggle('on');a.setAttribute('aria-checked',a.classList.contains('on'));
      if(a.id==='rpe'){const on=a.classList.contains('on');try{localStorage.setItem(EFF_K,on?'rpe':'rir')}catch(e){}const t=$('#effrow .t2');if(t)t.textContent=`${on?'RPE 10 to ≤6 on each set':'Reps in reserve (RIR) 0 to 4+ on each set'}. Saved the same way either way.`}return}
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
// ------------------------------------------------------------- no developer text in the UI (batch C)
// Coach's data carries file / key references meant for developers ("(rules.json frequency_muscles)", "Spec: data/x.md",
// "targets.json:curve.k"). Visible text never shows them: a parenthetical holding one is dropped, a sentence naming a file or
// key path is dropped (or, if that would empty the text, the reference becomes plain words), and snake_case keys become words.
// Runs on every text node the app renders (attributes untouched); user-typed text ([data-raw], inputs) is left alone.
const DEVF=/\b[\w\/-]+(?:\.[\w-]+)*\.(?:json|js|py|md|csv|css|html)\b(?::[\w.#\[\]-]+)?|\b(?:tools|data|logic|test)\/[\w.\/-]+|\b(?:rules|targets|logger|analytics|ranking|exercises|templates|patterns|splits)(?:\.[a-z_#\[\]]+)+/i;
const DEVG=new RegExp('(?:'+DEVF.source+')(?:\\s+[a-z][a-z0-9]*(?:[._][a-z0-9#]+)+)?','gi'),SNAKE=/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g,hasSnake=s=>/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/.test(s);
const devWords=ref=>{const k=ref.replace(/^[^:\s]*\.(?:json|js|py|md|csv|css|html)[:\s]*/i,'').replace(/^(?:rules|targets|logger|analytics|ranking)\./i,'').split(/[.#\[\]]+/).filter(x=>x&&!/^(rules|logger|analytics|ranking|targets)$/.test(x));
  const w=x=>x.replace(/_/g,' ');if(!k.length)return "Coach's data";const last=k[k.length-1];
  return ML[last]&&k.length>1?`Coach's ${w(k[k.length-2])} list for ${(ML[last]||last).toLowerCase()}`:`Coach's ${w(k.slice(-2).join(' '))} setting`};
const DEVNOTE=/^(?:spec|source|fixture|render|see)\b|not from this text|check_education|enforces that|regenerate|generated by/i;
function devClean(s){if(!s||(!DEVF.test(s)&&!hasSnake(s)))return s;const lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0];let t=s.trim();
  t=t.replace(/\s*[({]([^(){}]*)[)}]/g,(m,inner)=>DEVF.test(inner)||hasSnake(inner)?'':m);
  // a sentence that is a note to developers, or nothing but a reference, goes; otherwise the reference becomes words
  if(DEVF.test(t)){const out=t.split(/(?<=[.;!?])\s+/).map(x=>{if(!DEVF.test(x))return x;const bare=x.replace(DEVG,'').replace(/[^A-Za-z ]/g,' ').trim().split(/\s+/).filter(Boolean);
      return DEVNOTE.test(x)||bare.length<4?'':x.replace(DEVG,devWords)}).filter(Boolean).join(' ').replace(/;\s*$/,'.');t=out.trim()?out:t.replace(DEVG,devWords)}
  t=t.replace(SNAKE,w=>w.replace(/_/g,' ')).replace(/\s+([,.;:])/g,'$1').replace(/\s{2,}/g,' ');return lead+t+trail}
const devSkip=n=>{const p=n.parentElement;return !p||!!p.closest('script,style,textarea,input,[data-raw],[contenteditable]')};
function devScrub(root){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(devSkip(n))continue;const v=n.nodeValue,c=devClean(v);if(c!==v)n.nodeValue=c}}
new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData'){if(!devSkip(m.target)){const c=devClean(m.target.nodeValue);if(c!==m.target.nodeValue)m.target.nodeValue=c}}else m.addedNodes.forEach(x=>x.nodeType===3?(devSkip(x)||(x.nodeValue=devClean(x.nodeValue))):x.nodeType===1&&devScrub(x))}})
  .observe(document.documentElement,{childList:true,subtree:true,characterData:true});
// ---------------------------------------------------------------- CUSTOM EXERCISES (piece C, 2026-10-24)
// New exercise from the Build tray. Logic = logic/customex.js (port of Coach's tools/custom_exercise.py); defaults = ONE loader:
// data/custom-exercise-defaults.json (Coach's modelled pattern x equipment defaults, not evidence). Records are full exercises.json-shaped
// records + custom/estimated/pattern/stretch_biased_for/rep_range/defaults_source, stored in localStorage and registered into RD at load
// (exercise table, legacy pattern map, stretch lists, rep-range override with an id; never heavy lists or staples).
// Photo: the v29 app's machine-photo code (lift-board-site a35ee0b v14.js resizeImg: FileReader -> canvas, longest side 800, white
// background, JPEG 0.82, stored as a data URL; 'Not enough browser storage' fallback), kept per id under its own key.
const CXK='apechit.sb.customEx',CXP='apechit.sb.customExPhoto.',CXGONE='apechit.sb.customExGone',CXPL='apechit.sb.customExPlaced';
let CX=null;
const cxList=()=>{const L=ld(CXK,[]);return Array.isArray(L)?L.filter(e=>e&&typeof e.id==='string'&&window.CUSTOMEX&&CUSTOMEX.ID_RE.test(e.id)):[]};
const isCx=id=>!!(RD&&RD.EX[id]&&RD.EX[id].custom);
const cxL=id=>isCx(id)?' <span class="evl cxl" data-ev="custom">Custom</span>':'';
// ---- media: IndexedDB rows {id, photo, video Blob, vtype, vsize, vdur, trim} (logic/cxmedia.js), mirrored in CXM so rendering stays sync.
// If IndexedDB is unavailable (private mode in some browsers), photos fall back to the old localStorage key and video is not offered.
const CXM={},CXU={};let CXM_OK=false;
const MX=()=>window.CXMEDIA;
const cxMedia=id=>CXM[id]||null;
const cxPhoto=id=>(CXM[id]&&CXM[id].photo)||(()=>{try{return localStorage.getItem(CXP+id)||null}catch(e){return null}})();
const cxHasVid=id=>!!(CXM[id]&&CXM[id].video&&CXM[id].trim);
const cxYT=id=>{const e=RD&&RD.EX[id],m=e&&e.youtube_meta;return m&&/^[\w-]{11}$/.test(m.video_id||'')?m:null};
function cxVidURL(id){if(CXU[id])return CXU[id];const m=CXM[id];if(!m||!m.video)return null;return CXU[id]=URL.createObjectURL(m.video)}
function cxDropURL(id){if(CXU[id]){try{URL.revokeObjectURL(CXU[id])}catch(e){}delete CXU[id]}}
async function cxMediaLoad(L){try{const rows=await MX().idbAll();rows.forEach(r=>{if(r&&r.id)CXM[r.id]=r});CXM_OK=true}catch(e){CXM_OK=false;return}
  // one-time migration: photos stored in localStorage (piece C) move to IndexedDB; the key is removed only after the write succeeds
  for(const e of L){let lp=null;try{lp=localStorage.getItem(CXP+e.id)}catch(x){}if(!lp)continue;
    const row=Object.assign({id:e.id},CXM[e.id]);if(!row.photo)row.photo=lp;try{await MX().idbPut(row);CXM[e.id]=row;localStorage.removeItem(CXP+e.id)}catch(x){}}}
// loop only the trim window: muted + playsinline + autoplay (the iOS rules for inline autoplay); currentTime is pulled back to start at the end
function cxLoop(v,getTrim){const T=()=>getTrim()||{start:0,end:v.duration||0};let raf=0;
  const tick=()=>{if(!v.isConnected){cancelAnimationFrame(raf);return}const t=T();if(v.readyState>=1){if(v.currentTime>=t.end-0.04||v.currentTime<t.start-0.3||v.ended){v.currentTime=t.start;if(v.paused&&!v.dataset.hold)v.play().catch(()=>{})}}raf=requestAnimationFrame(tick)};
  v.muted=true;v.defaultMuted=true;v.setAttribute('muted','');v.playsInline=true;
  v.addEventListener('loadedmetadata',()=>{v.currentTime=T().start;if(!v.dataset.hold)v.play().catch(()=>{})},{once:true});raf=requestAnimationFrame(tick);return v}
function cxWireLoops(root){$$('video[data-cxv]',root).forEach(v=>{if(v.dataset.wired)return;v.dataset.wired='1';const id=v.dataset.cxv,u=cxVidURL(id);if(!u)return;
  cxLoop(v,()=>(CXM[id]||{}).trim);v.src=u})}
const cxClipHtml=(id,nm)=>{const t=(CXM[id]||{}).trim;return `<section class="xvid cxclip" data-clip="${id}"><div class="xvh"><span>Your clip</span>${t?`<span class="evl num" data-ev="loop">${(t.end-t.start).toFixed(1)} s loop</span>`:''}</div>
  <video class="cxloop" data-cxv="${id}" muted autoplay playsinline loop preload="auto" aria-label="${nm} clip, looping"></video></section>`};
// clip first, then the YouTube demo (both shown when both exist); wrapped in #xvid so the Watch link lands on it
function cxMediaBlock(id){const nm=esc((RD.EX[id]||{}).name||'Exercise'),y=cxYT(id),c=cxHasVid(id);if(!c&&!y)return '';
  return `<div id="xvid" class="cxmedia">${c?cxClipHtml(id,nm):''}${y?xvBlockV({video_id:y.video_id,start_s:y.start_s,channel:y.author,confidence:'exact',duration_s:null},nm,{custom:true,checked:y.checked!==false}):''}</div>`}
function cxMock(e){const rat={};for(const [m,r] of Object.entries(e.muscles))if(r>0)rat[m]=r;const mus=Object.keys(rat).filter(m=>rat[m]>=0.5).sort((a,b)=>rat[b]-rat[a]);
  EX[e.id]={id:e.id,name:e.name,type:e.type,eq:e.equipment,mus,rat,ut:null,custom:true,learn:false};delete HAY[e.id];
  const row=[e.id,e.name,e.type,e.equipment,mus,rat,null],k=EXL.findIndex(x=>x[0]===e.id);if(k>=0)EXL[k]=row;else EXL.push(row)}
function cxUnmock(id){delete EX[id];delete HAY[id];const k=EXL.findIndex(x=>x[0]===id);if(k>=0)EXL.splice(k,1)}
// load step (called from loadRank once RD exists): the single defaults loader + registration of every stored record + media cache/migration
async function cxLoad(R,exercises,rules,d0){const d=d0!==undefined?d0:await getJ(DATA+'custom-exercise-defaults.json');if(!d||!window.CUSTOMEX)return;
  R.CXD=d;CX=CUSTOMEX.make(d,exercises,rules);const L=cxList();CUSTOMEX.register(R,L);L.forEach(cxMock);if(MX())await cxMediaLoad(L)}
// media: undefined = leave as is; photo null = delete; video null = delete; video {blob,type,size,dur} = replace; trim {start,end} = set
async function cxStore(rec,media={}){const L=cxList(),k=L.findIndex(x=>x.id===rec.id);if(k>=0)L[k]=rec;else L.push(rec);localStorage.setItem(CXK,JSON.stringify(L));
  CUSTOMEX.register(RD,[rec]);cxMock(rec);const res={photoOk:true,videoOk:true};
  const touched=media.photo!==undefined||media.video!==undefined||media.trim!==undefined;if(!touched)return res;
  if(!CXM_OK){ // no IndexedDB: photo in localStorage as before, no video
    if(media.photo===null){try{localStorage.removeItem(CXP+rec.id)}catch(e){}}else if(media.photo){try{localStorage.setItem(CXP+rec.id,media.photo)}catch(e){res.photoOk=false}}
    if(media.video)res.videoOk=false;return res}
  const row=Object.assign({id:rec.id},CXM[rec.id]);
  if(media.photo!==undefined)row.photo=media.photo||null;
  if(media.video===null){row.video=null;row.vtype=row.vsize=row.vdur=null;row.trim=null;cxDropURL(rec.id)}
  else if(media.video){row.video=media.video.blob;row.vtype=media.video.type||media.video.blob.type||'';row.vsize=media.video.blob.size;row.vdur=media.video.dur;cxDropURL(rec.id)}
  if(media.trim!==undefined&&row.video)row.trim=media.trim;
  const put=async r=>{if(!r.photo&&!r.video){await MX().idbDel(r.id);delete CXM[r.id];return}await MX().idbPut(r);CXM[r.id]=r};
  try{await put(row)}catch(e){ // usually QuotaExceededError: keep the old video, save the photo alone
    res.videoOk=!media.video;const r2=Object.assign({},CXM[rec.id]||{id:rec.id});if(media.photo!==undefined)r2.photo=media.photo||null;
    try{await put(r2)}catch(x){res.photoOk=media.photo===undefined}}
  return res}
function cxDelete(id){const L=cxList().filter(x=>x.id!==id);sv(CXK,L);try{localStorage.removeItem(CXP+id)}catch(e){}
  cxDropURL(id);delete CXM[id];if(MX()&&CXM_OK)MX().idbDel(id).catch(()=>{});
  sv(CXGONE,[...new Set([...ld(CXGONE,[]),id])]);  // never reuse an id after delete (history keys on it)
  CUSTOMEX.unregister(RD,id);cxUnmock(id);if(window.BOARD&&BOARD.removeExercise)BOARD.removeExercise(id)}
// export / import (the storyboard's Back up / Restore rows wait for the native app; this is the API they will call).
// version 2: records (incl. youtube + youtube_meta) + photo (JPEG data URL) + video_trim + video as a data URL when <= 8 MB;
// a bigger video is left out with video_omitted {bytes} and a line in notes (its trim and the link are still exported).
async function cxExport(){const M=MX(),notes=[],exercises=[];
  for(const e of cxList()){const m=CXM[e.id]||{},o=Object.assign({},e),ph=cxPhoto(e.id);if(ph)o.photo=ph;
    if(m.video&&m.trim){o.video_trim=m.trim;o.video_type=m.vtype||'';o.video_duration=m.vdur||null;
      if(m.video.size<=M.EXPORT_VIDEO_MAX){try{o.video=await M.blobToDataURL(m.video)}catch(x){o.video_omitted={bytes:m.video.size,reason:'read_failed'}}}
      else{o.video_omitted={bytes:m.video.size,reason:'too_big'};notes.push(`${e.name}: video (${M.mb(m.video.size)} MB) not included; exports keep videos up to ${M.EXPORT_VIDEO_MAX/1048576} MB. The trim and demo link are included.`)}}
    exercises.push(o)}
  return {kind:'apechit.customExercises',version:2,exercises,notes}}
async function cxImport(o){const L=(o&&o.exercises)||[];let n=0;const M=MX();
  for(const x of L){if(!x||!CUSTOMEX.ID_RE.test(x.id||'')||!x.muscles)continue;const {photo,video,video_trim,video_type,video_duration,video_omitted,...rec}=x;
    const media={};if(photo)media.photo=photo;
    if(video&&video_trim){try{const b=await M.dataURLToBlob(video);media.video={blob:b,type:video_type||b.type,dur:video_duration||null};media.trim=video_trim}catch(e){}}
    await cxStore(Object.assign(rec,{custom:true,estimated:true}),media);n++}return n}
// band labels come from exercise-details.json body_map.level_labels (Main mover / Helper / Minor), never raw ratios
let CXLL=null;
async function cxBandLabels(){if(CXLL)return CXLL;const D=await exdLoad(),any=Object.values(D).find(d=>d.body_map&&d.body_map.level_labels),L=(any&&any.body_map.level_labels)||{};
  const B=(CX&&CX.BANDS)||{};CXLL={main:L.primary||(B.main||{}).label||'Main mover',helper:L.secondary||(B.helper||{}).label||'Helper',minor:L.minor||(B.minor||{}).label||'Minor'};return CXLL}
// v29 resizeImg (a35ee0b v14.js): 800 px long edge, white fill, JPEG 0.82
function resizeImg(file,max){return new Promise((res,rej)=>{const r=new FileReader();r.onerror=rej;r.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.82))};im.src=r.result};r.readAsDataURL(file)})}
// a picked video's duration (WebM from some recorders reports Infinity until a far seek)
function videoDuration(url){return new Promise((res,rej)=>{const v=document.createElement('video');v.muted=true;v.preload='metadata';let done=false;
  const fin=d=>{if(done)return;done=true;clearTimeout(to);v.removeAttribute('src');v.load();d>0&&isFinite(d)?res(d):rej(new Error('no duration'))};
  const to=setTimeout(()=>fin(NaN),10000);v.onerror=()=>fin(NaN);
  v.onloadedmetadata=()=>{if(isFinite(v.duration))return fin(v.duration);v.ontimeupdate=()=>{if(isFinite(v.duration))fin(v.duration)};v.currentTime=1e7};v.src=url})}
// ---- the one-screen form (new + edit): name (+ short name), equipment, pattern, one Main mover, helpers, two toggles, photo, video + trim, demo link.
// A reserved, empty slot at the top (#nxbase) is where "Start from a similar exercise" goes once Coach's rules land; nothing renders there yet.
async function newExSheet(o={}){if(!CX){toast('Custom exercises need the defaults file');return null}const LL=await cxBandLabels();const M=MX();
  const ed=o.editId&&RD.EX[o.editId]&&RD.EX[o.editId].custom?RD.EX[o.editId]:null,f0=ed?CX.formFromRecord(ed):null,m0=ed?(CXM[ed.id]||{}):{};
  const y0=ed&&ed.youtube_meta&&ed.youtube_meta.video_id?ed.youtube_meta:null;
  const F={name:f0?f0.name:String(o.q||'').trim().slice(0,60),short:ed&&ed.short_name_edited?ed.short_name:'',shortEdited:!!(ed&&ed.short_name_edited),equipment:f0?f0.equipment:null,pattern:f0?f0.movement_pattern:null,
    main:f0?Object.keys(f0.muscles).find(m=>f0.muscles[m]==='main'):null,extra:{},uni:f0?f0.unilateral:null,st:f0?f0.stretch_focused:null,photo:ed?cxPhoto(ed.id):null,photoTouched:false,tried:false,
    video:ed&&m0.video&&m0.trim?{blob:m0.video,type:m0.vtype,dur:m0.vdur,url:cxVidURL(ed.id),name:'Saved clip',stored:true}:null,trim:ed&&m0.trim?Object.assign({},m0.trim):null,videoTouched:false,trimTouched:false,vErr:'',
    yt:y0?`https://youtu.be/${y0.video_id}`:'',ytStart:y0&&y0.start_s?M.fmtTime(y0.start_s):'',ytP:null,ytC:y0?{state:y0.checked===false?'unchecked':'ok',author:y0.author||''}:null,ytBusy:null,
    base:ed&&ed.base_id&&CX.libOf(ed.base_id)?ed.base_id:null,picking:false,declined:!!ed,touched:!!ed,bq:'',more:false,auto:false};
  if(f0){const b0=F.base&&CX.libOf(F.base),mains=Object.keys(f0.muscles).filter(m=>f0.muscles[m]==='main');
    F.main=b0&&mains.includes(CX.pm(b0))?CX.pm(b0):(mains[0]||null);for(const [m,b] of Object.entries(f0.muscles))if(m!==F.main)F.extra[m]=b}
  const others=cxList().filter(x=>!ed||x.id!==ed.id);
  const form=()=>({name:F.name,equipment:F.equipment,movement_pattern:F.pattern,muscles:Object.assign(F.main?{[F.main]:'main'}:{},...Object.entries(F.extra).filter(([m])=>m!==F.main).map(([m,b])=>({[m]:b}))),
    unilateral:F.uni==null?undefined:F.uni,stretch_focused:F.st==null?undefined:F.st});
  const autoShort=()=>F.name.trim()?CX.shortName(F.name,others.map(x=>x.short_name)):'';
  const tdef=()=>{if(F.base){const b=CX.libOf(F.base),bf=CX.baseForm(F.base),mains=[F.main,...Object.keys(F.extra).filter(m=>F.extra[m]==='main')],main=mains.includes(CX.pm(b))?CX.pm(b):F.main;
      const sl=F.pattern&&main?CX.slotsFor(F.pattern,main):null;return {unilateral:bf.unilateral,stretch_focused:main===CX.pm(b)?bf.stretch_focused:!!(sl&&sl.stretch_default&&sl.stretch_default.default_on)}}
    return F.pattern&&F.equipment?CX.toggleDefaults(F.pattern,F.equipment,F.main):{unilateral:false,stretch_focused:false}};
  const chip=(k,v,l,on,extra='')=>`<button type="button" class="chip xs ${on?'on':''}" data-nx="${k}" data-v="${esc(v)}"${extra}>${l}</button>`;
  const ML2=CX.labels.muscle,PL=CX.labels.pattern,QL=CX.labels.equipment;
  const tg=(k,l,on)=>`<label class="row nxt"><div class="grow t1">${l}</div><input type="checkbox" class="nxsw" data-tg="${k}" role="switch" ${on?'checked':''} aria-label="${l}"></label>`;
  const pick=(id,icon,label,sub,accept,cap)=>`<label class="row nxph nxadd" data-pick="${id}"><span class="acc">${I(icon,1.8)} ${label}</span><span class="t2">${sub}</span><input type="file" id="${id}" accept="${accept}"${cap?' capture="environment"':''} hidden></label>`;
  const photoRow=()=>F.photo?`<div class="row nxph"><img src="${F.photo}" alt="${esc(F.name||'Exercise')} photo"><div class="grow t2">Stored on this device only</div><button type="button" class="btn plain sm dl" data-nx="rmphoto">Delete photo</button></div>`
    :pick('nxcam','camera','Take photo','e.g. the machine','image/*',true)+pick('nxfile','image','Choose from library','','image/*',false);
  // trim UI: preview + a track with start / end handles (drag, or arrow keys: 0.1 s, Shift 1 s); max 10 s; the band between can be dragged too
  const trimHtml=()=>{const v=F.video,t=F.trim,d=v.dur||0,pct=x=>(d?x/d*100:0).toFixed(3)+'%',w=M.sizeWarn(v.blob.size);
    return `<div class="nxtrim" id="nxtrim"><div class="nxpv"><video id="nxprev" muted playsinline autoplay loop preload="auto" aria-label="Clip preview"></video></div>
     <div class="nxtrk" id="nxtrk" style="--s:${pct(t.start)};--e:${pct(t.end)}"><div class="nxtb"></div><div class="nxsel" data-h="move"></div><i class="nxph2" id="nxph"></i>
      <button type="button" class="nxhd" data-h="start" role="slider" aria-label="Clip start" aria-valuemin="0" aria-valuemax="${d.toFixed(1)}" aria-valuenow="${t.start.toFixed(1)}"></button>
      <button type="button" class="nxhd" data-h="end" role="slider" aria-label="Clip end" aria-valuemin="0" aria-valuemax="${d.toFixed(1)}" aria-valuenow="${t.end.toFixed(1)}"></button></div>
     <div class="row nxtl"><span class="t1 num" id="nxtlen">${(t.end-t.start).toFixed(1)} s selected</span><span class="t2 num" id="nxtrng">${M.fmtTime(t.start)}${(t.start%1).toFixed(1).slice(1)}–${M.fmtTime(t.end)}${(t.end%1).toFixed(1).slice(1)} of ${M.fmtTime(d)} · max ${M.MAX_TRIM} s</span></div>
     ${w?`<p class="nxwarn" data-vwarn>${w}</p>`:''}
     <div class="row nxph"><div class="grow t2">${esc(v.name||'Video')} · ${M.mb(v.blob.size)} MB · plays muted, loops the selection</div><button type="button" class="btn plain sm dl" data-nx="rmvideo">Delete video</button></div></div>`};
  const videoRow=()=>F.video?trimHtml():(CXM_OK?pick('nxrec','film','Record video','up to 10 s is kept','video/*',true)+pick('nxvid','image','Choose video','','video/*',false)
    :`<div class="row"><span class="t2">Video needs browser storage (IndexedDB), which this browser has turned off.</span></div>`)+(F.vErr?`<p class="nxerr" data-verr>${F.vErr}</p>`:'');
  const ytStatus=()=>{const raw=F.yt.trim();if(!raw)return '';const p=F.ytP||M.parseYouTube(raw,F.ytStart);
    if(p.error)return `<p class="nxerr" data-yterr="${p.error}">${M.YT_MSG[p.error]}</p>`;
    if(F.ytBusy)return `<p class="t2 nxyst" data-yt="checking">${M.YT_MSG.checking}</p>`;const c=F.ytC;if(!c)return '';
    if(c.state==='ok')return `<div class="row nxytok" data-yt="ok"><img src="https://i.ytimg.com/vi/${p.video_id}/mqdefault.jpg" alt="" referrerpolicy="no-referrer" loading="lazy"><div class="grow"><div class="t1">${I('check',2.2)} Found on YouTube</div><div class="t2">${esc(c.author||'')}${p.start_s?` · starts at ${M.fmtTime(p.start_s)}`:''}</div></div></div>`;
    if(c.state==='unchecked')return `<p class="nxwarn" data-yt="unchecked">${M.YT_MSG.unchecked}</p>`;
    return `<p class="nxerr" data-yterr="${c.state}">${M.YT_MSG[c.state]}</p>`};
  const ytRow=()=>`<div class="row nxyt"><input id="nxyt" class="dsin" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="youtube.com/watch, youtu.be or Shorts link" value="${esc(F.yt)}" aria-label="Demo video link"></div>
     <div class="row nxsr"><span class="t2">Start at</span><input id="nxyts" class="dsin" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done" placeholder="0:00, or t= in the link" value="${esc(F.ytStart)}" aria-label="Start time"></div>`;
  const vfy=()=>F.base?CX.validateBase(F.base,form(),others.map(x=>x.name)):CX.validate(form(),others.map(x=>x.name));
  const msg=()=>{const v=vfy(),E=F.tried?v.errors:[],nice=t=>t.replace(/^muscles: only one Main mover can be added.*$/,`Only one ${LL.main.toLowerCase()} can be added; a second one can only come from the base exercise`).replace(/^name: required$/,'Add a name').replace(/^name: at most 60 characters$/,'Keep the name to 60 characters').replace(/^name: already used.*$/,'You already have a custom exercise with this name')
      .replace(/^equipment: .*/,'Pick the equipment').replace(/^movement_pattern: .*/,'Pick a movement pattern').replace(/^muscles: exactly one Main mover$/,`Pick one ${LL.main.toLowerCase()}`).replace(/^name: same as a library exercise.*$/,'A library exercise already has this name; you can use that one instead')
      .replace(/^muscles: more than 6 muscles.*$/,'More than 6 muscles is unusual; credit may be overestimated');
    const ye=F.tried?ytBlock():'';
    return [...E.map(t=>`<p class="nxerr" data-err>${nice(t)}</p>`),...(ye?[`<p class="nxerr" data-err="yt">${ye}</p>`]:[]),...v.warnings.map(t=>`<p class="nxwarn" data-warn>${nice(t)}</p>`)].join('')};
  // a link that is malformed, not found or not embeddable blocks Save; "couldn't check" (offline) does not
  const ytBlock=()=>{const raw=F.yt.trim();if(!raw)return '';const p=M.parseYouTube(raw,F.ytStart);if(p.error)return 'Fix the demo video link or clear it';
    if(F.ytC&&(F.ytC.state==='not_found'||F.ytC.state==='not_embeddable'))return 'The demo video link can’t be used; pick another video or clear it';return ''};
  // ---- "Start from a similar exercise" (piece 1). Suggestions follow Coach's rank_bases (name + pattern + equipment + hints, muscles small);
  // an exact name match is preselected while the form is untouched; "None of these" keeps the manual path (pattern x equipment defaults).
  let bT=0;
  const lib=id=>CX.libOf(id),bsub=id=>{const b=lib(id);return b?`${QL[b.equipment]||b.equipment} · ${PL[b.movement_pattern]||b.movement_pattern}`:''};
  const draft=()=>{const d={name:F.name};if(F.pattern)d.movement_pattern=F.pattern;if(F.equipment)d.equipment=F.equipment;if(!F.base&&F.main)d.muscles=form().muscles;return d};
  const sugg=()=>F.name.trim()?CX.suggestBases(draft(),CX.BASE.max_count):[];
  const search=q=>{const R0=CX.rankBases({name:q,movement_pattern:F.pattern||undefined,equipment:F.equipment||undefined}),pos={};R0.forEach((x,k)=>pos[x.id]=k);
    return R0.map(x=>x.id).filter(id=>EX[id]&&qMatch(id,q)).sort((a,b)=>pos[a]-pos[b]).slice(0,8)};
  // preview record -> derived + explainer variant (Coach's explainer_for); null while the chips are not valid yet
  const preview=()=>{if(!F.pattern||!F.equipment||!F.main)return null;const fm=form();fm.name=F.name.trim()||'Preview';
    try{return F.base?CX.fromBase(F.base,fm,{dt:RD,id:'custom-preview-000000',short_name:'Preview'}):{movement_pattern:F.pattern,equipment:F.equipment}}catch(x){return null}};
  const edited=()=>{if(!F.base)return false;const pv=preview();if(pv&&pv.derived)return CX.explainerFor(pv)[0]==='based_on_base_edited';
    const bf=CX.baseForm(F.base),mf=form();return F.pattern!==bf.movement_pattern||F.equipment!==bf.equipment||JSON.stringify(Object.entries(mf.muscles).sort())!==JSON.stringify(Object.entries(bf.muscles).sort())};
  const estNote=()=>{if(F.base){const b=lib(F.base);return `<p class="nxest" data-est="${edited()?'based_on_base_edited':'based_on_base'}">Estimated from ${esc(b.name)}${edited()?' · with your edits':''}<button type="button" class="nxinfo" data-nb="why" aria-label="About this estimate">ⓘ</button></p>`}
    if(F.pattern&&F.equipment)return `<p class="nxest" data-est="pattern_defaults">Estimated from typical ${esc((PL[F.pattern]||F.pattern).toLowerCase())} · ${esc((QL[F.equipment]||F.equipment).toLowerCase())} exercises<button type="button" class="nxinfo" data-nb="why" aria-label="About this estimate">ⓘ</button></p>`;return ''};
  const brow=(id,lab)=>`<button type="button" class="row nxbrow" data-nb="pick" data-v="${id}">${gl(id)}<div class="grow"><div class="t1">${esc(lib(id).name)}</div><div class="t2">${bsub(id)}</div></div>${lab?`<span class="evl" data-ev="exact">${lab}</span>`:''}${CHEV||''}</button>`;
  // the base's muscles as Main mover / Helper / Minor chips (tap cycles Helper > Minor > off; a removed base muscle stays, dimmed, to add back)
  const bChips=()=>{const bf=CX.baseForm(F.base),fm=form().muscles,ms=[...new Set([...Object.keys(bf.muscles),...Object.keys(fm)])].sort((a,b)=>({main:0,helper:1,minor:2}[fm[a]||'z']??3)-({main:0,helper:1,minor:2}[fm[b]||'z']??3));
    return `<div class="nxbchips">${ms.map(m=>{const x=fm[m],lab=x?LL[x]:'off',mv=m===F.main;
      return mv?`<span class="chip xs on nxbc" data-m="${m}" data-band="main">${esc(ML2[m]||m)}<span class="nxb">${LL.main}</span></span>`
        :`<button type="button" class="chip xs ${x?'on':'off'} nxbc" data-nx="extra" data-v="${m}" data-m="${m}" data-band="${x||'off'}">${esc(ML2[m]||m)}<span class="nxb">${lab}</span></button>`}).join('')}</div>`};
  function baseHtml(){
    if(F.base&&!F.picking){return `<div class="group"><div class="row nxbsel" data-base="${F.base}">${gl(F.base)}<div class="grow"><div class="t1">${esc(lib(F.base).name)}</div><div class="t2">${bsub(F.base)}</div></div>
      <button type="button" class="btn plain sm" data-nb="change">Change</button><button type="button" class="btn plain sm nxbclr" data-nb="clear">Clear</button></div>${bChips()}</div>${estNote()}`}
    if(!F.picking&&F.declined){return `<div class="group"><button type="button" class="row nxbopen" data-nb="open"><div class="grow"><div class="t1 acc">Pick a similar exercise</div><div class="t2">${F.pattern&&F.equipment?'Now using typical values for the pattern and equipment':'Or set the equipment, pattern and muscles yourself'}</div></div>${CHEV||''}</button></div>${estNote()}`}
    const q=F.bq.trim(),list=q?search(q).map(id=>({id})):sugg(),shown=q?list:list.slice(0,F.more?CX.BASE.max_count:CX.BASE.default_count);
    const empty=q?`<div class="row"><span class="t2">No library exercise matches “${esc(q)}”.</span></div>`
      :!F.name.trim()?`<div class="row"><span class="t2">Type a name above to see similar library exercises, or search.</span></div>`
      :!(F.pattern&&F.equipment)?`<div class="row nxbnone" data-fallback="ask"><span class="t2">No close match. Pick the equipment and movement pattern below, and typical values for them are used.</span></div>`
      :`<div class="row nxbnone" data-fallback="cell"><span class="t2">No close match. Typical values for ${esc((PL[F.pattern]||F.pattern).toLowerCase())} exercises using ${esc((QL[F.equipment]||F.equipment).toLowerCase())} are used.</span></div>`;
    return `<div class="group nxbpick"><div class="row nxbs">${I('search',1.8)}<input id="nxbq" class="dsin" type="search" autocomplete="off" enterkeyhint="search" placeholder="Search the library" value="${esc(F.bq)}" aria-label="Search library exercises"></div>
      <div id="nxblist">${shown.length?shown.map(x=>brow(x.id,x.exact_name?'Same name':'')).join(''):empty}
      ${!q&&!F.more&&list.length>CX.BASE.default_count?`<button type="button" class="row nxbmore" data-nb="more"><span class="t2 acc">More suggestions</span></button>`:''}
      ${shown.length||F.base?`<button type="button" class="row nxbno" data-nb="none"><span class="t1">None of these</span></button>`:''}</div>
      ${F.picking?`<button type="button" class="row nxbno" data-nb="cancelpick"><span class="t2">Keep ${F.base?esc(lib(F.base).name):'my own values'}</span></button>`:''}</div>${F.base?'':estNote()}`}
  const paintBase=(keepFocus)=>{const w=$('#nxbase',s.el);if(!w)return;const a=document.activeElement,foc=keepFocus&&a&&a.id==='nxbq',pos=foc?a.selectionStart:0;w.innerHTML=baseHtml();
    const bq=$('#nxbq',s.el);if(bq){bq.addEventListener('input',()=>{F.bq=bq.value;clearTimeout(bT);bT=setTimeout(()=>paintBase(true),200)});bq.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();bq.blur()}});if(foc){bq.focus();try{bq.setSelectionRange(pos,pos)}catch(x){}}}};
  function applyBase(id,auto){const b=lib(id),bf=CX.baseForm(id);F.base=id;F.picking=false;F.declined=false;F.bq='';F.more=false;F.auto=!!auto;
    F.equipment=bf.equipment;F.pattern=bf.movement_pattern;F.main=CX.pm(b);F.extra={};for(const [m,x] of Object.entries(bf.muscles))if(m!==F.main)F.extra[m]=x;F.uni=null;F.st=null;re()}
  function preselect(){if(ed||F.base||F.declined||F.touched||F.picking)return;const t=sugg()[0];if(t&&t.exact_name)applyBase(t.id,true)}
  function baseAct(k,v){
    if(k==='pick')return applyBase(v,false);
    if(k==='none'){F.base=null;F.picking=false;F.declined=true;F.bq='';return re()}
    if(k==='clear'){F.base=null;F.declined=true;F.picking=false;for(const m in F.extra)if(F.extra[m]==='main')F.extra[m]='helper';return re()}   // keep the chips; Save now uses the pattern x equipment defaults
    if(k==='change'||k==='open'){F.picking=true;F.bq='';return paintBase()}
    if(k==='cancelpick'){F.picking=false;F.bq='';return paintBase()}
    if(k==='more'){F.more=true;return paintBase()}
    if(k==='why'){const pv=F.base?preview():{movement_pattern:F.pattern,equipment:F.equipment};let t;
      if(pv&&(pv.base_id||!F.base))t=CX.explainerFor(pv)[1];else t=CX.EXPL.variants[edited()?'based_on_base_edited':'based_on_base'].replace('{base}',lib(F.base).name);
      const w=sheet({title:(CX.EXPL.label||'ⓘ Estimated').replace(/^ⓘ\s*/,''),cls:'grouped nxwhy',right:'<button class="btn plain" data-x="close">Done</button>',body:`<p class="lsum nxwhyt">${esc(t)}</p>`});
      w.el.addEventListener('click',e=>{if(e.target.closest('[data-x=close]'))w.close()});return w}}
  const body=()=>{const td=tdef(),uni=F.uni==null?td.unilateral:F.uni,st=F.st==null?td.stretch_focused:F.st;
    return `<div class="nx">
    <div class="group"><div class="row"><input id="nxname" class="dsin" type="text" maxlength="60" autocomplete="off" enterkeyhint="done" placeholder="Name, e.g. Hammer Strength Row" value="${esc(F.name)}" aria-label="Name"></div>
     <div class="row nxsr"><span class="t2">Short name</span><input id="nxshort" class="dsin" type="text" maxlength="16" autocomplete="off" enterkeyhint="done" placeholder="${esc(autoShort()||'shown on the board')}" value="${F.shortEdited?esc(F.short):''}" aria-label="Short name on the board"></div></div>
    <div class="ghead">Start from a similar exercise <span class="nxh">optional · copies its muscle ratings</span></div><div id="nxbase" class="nxbase" data-slot="similar-base">${baseHtml()}</div>
    <div class="ghead">Equipment</div><div class="tfr nxc noswipe" data-row="equipment">${CX.EQUIPMENT.map(q=>chip('equipment',q,QL[q],F.equipment===q)).join('')}</div>
    <div class="ghead">Movement pattern</div><div class="tfr nxc noswipe" data-row="pattern">${CX.PATTERNS.map(p=>chip('pattern',p,PL[p],F.pattern===p)).join('')}</div>
    <div class="ghead">${LL.main} <span class="nxh">one muscle</span></div><div class="tfr nxc noswipe" data-row="main">${CX.MUSCLES.map(m=>chip('main',m,ML2[m],F.main===m)).join('')}</div>
    <div class="ghead">${LL.helper} muscles <span class="nxh">optional · tap again for ${LL.minor}</span></div><div class="tfr nxc noswipe" data-row="extra">${CX.MUSCLES.filter(m=>m!==F.main).map(m=>{const b=F.extra[m];
      return chip('extra',m,`${ML2[m]}${b?` <span class="nxb" data-band="${b}">${LL[b]}</span>`:''}`,!!b,` data-band="${b||''}"`)}).join('')}</div>
    <div class="group nxtg">${tg('st','Hardest when stretched',st)}${tg('uni','One side at a time',uni)}</div>
    <div class="ghead">Photo <span class="nxh">optional</span></div><div class="group" id="nxphoto">${photoRow()}</div>
    <div class="ghead">Video <span class="nxh">optional · loops up to ${M.MAX_TRIM} s</span></div><div class="group" id="nxvideo">${videoRow()}</div>
    <div class="ghead">Demo video link <span class="nxh">optional · YouTube</span></div><div class="group" id="nxytg">${ytRow()}</div><div id="nxyst">${ytStatus()}</div>
    <div id="nxmsg" class="nxmsg">${msg()}</div>
    <p class="foot">${LL.main}, ${LL.helper} and ${LL.minor} set how much of each set counts for that muscle. Fatigue, rep range and the other numbers are modeled from library exercises with the same pattern and equipment, not measured. Shown as <span class="evl">Custom</span> and <span class="evl">Estimated</span>. Photos and videos stay on this device.</p></div>`};
  const s=sheet({title:ed?'Edit exercise':'New exercise',cls:'grouped tall nxsheet',left:'<button class="btn plain" data-x="nxcancel">Cancel</button>',right:`<button class="btn plain nxsave" data-x="nxsave">${ed?'Save':'Add'}</button>`,body:body()});
  const re=()=>{const sc=s.body.scrollTop;s.body.innerHTML=body();s.body.scrollTop=sc;wire()};
  const upd=()=>{$('#nxmsg',s.el).innerHTML=msg();const sh=$('#nxshort',s.el);if(sh)sh.placeholder=autoShort()||'shown on the board'};
  const ytPaint=()=>{$('#nxyst',s.el).innerHTML=ytStatus();upd()};
  let ytT=0,ytSeq=0;
  const ytCheck=()=>{clearTimeout(ytT);const raw=F.yt.trim();F.ytC=null;F.ytBusy=null;if(!raw){F.ytP=null;return ytPaint()}const p=M.parseYouTube(raw,F.ytStart);F.ytP=p;
    if(p.error)return ytPaint();const q=++ytSeq;F.ytBusy=M.checkYouTube(p).then(c=>{if(q!==ytSeq)return;F.ytC=c;F.ytBusy=null;ytPaint()});ytPaint();return F.ytBusy};
  const vidPaint=()=>{$('#nxvideo',s.el).innerHTML=videoRow();wireVideo()};
  function wireVideo(){const pv=$('#nxprev',s.el);if(pv&&F.video){cxLoop(pv,()=>F.trim);pv.src=F.video.url}
    const trk=$('#nxtrk',s.el);if(!trk)return;const d=F.video.dur;
    const paintT=()=>{const t=F.trim,pct=x=>(x/d*100).toFixed(3)+'%';trk.style.setProperty('--s',pct(t.start));trk.style.setProperty('--e',pct(t.end));
      $$('.nxhd',trk).forEach(h=>h.setAttribute('aria-valuenow',(h.dataset.h==='start'?t.start:t.end).toFixed(1)));
      $('#nxtlen',s.el).textContent=`${(t.end-t.start).toFixed(1)} s selected`;$('#nxtrng',s.el).textContent=`${M.fmtTime(t.start)}${(t.start%1).toFixed(1).slice(1)}–${M.fmtTime(t.end)}${(t.end%1).toFixed(1).slice(1)} of ${M.fmtTime(d)} · max ${M.MAX_TRIM} s`};
    const set=(which,s0,e0)=>{F.trim=M.clampTrim(d,s0,e0,which);F.trimTouched=true;paintT()};
    let drag=null;
    trk.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-h]');if(!h)return;e.preventDefault();e.stopPropagation();const r=trk.getBoundingClientRect();
      drag={which:h.dataset.h,x0:e.clientX,t0:Object.assign({},F.trim),r};try{trk.setPointerCapture(e.pointerId)}catch(x){}if(pv){pv.dataset.hold='1';pv.pause()}});
    trk.addEventListener('pointermove',e=>{if(!drag)return;e.preventDefault();const dt=(e.clientX-drag.x0)/drag.r.width*d,t=drag.t0;
      if(drag.which==='start')set('start',t.start+dt,t.end);else if(drag.which==='end')set('end',t.start,t.end+dt);else set('move',t.start+dt,t.end+dt);
      if(pv)pv.currentTime=drag.which==='end'?F.trim.end:F.trim.start});
    const up=()=>{if(!drag)return;drag=null;if(pv){delete pv.dataset.hold;pv.currentTime=F.trim.start;pv.play().catch(()=>{})}};
    trk.addEventListener('pointerup',up);trk.addEventListener('pointercancel',up);
    $$('.nxhd',trk).forEach(h=>h.addEventListener('keydown',e=>{const k={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];if(!k)return;e.preventDefault();const st=(e.shiftKey?1:0.1)*k,t=F.trim;
      if(h.dataset.h==='start')set('start',t.start+st,t.end);else set('end',t.start,t.end+st);if(pv)pv.currentTime=F.trim.start}))}
  async function takeVideo(f){if(!f)return;F.vErr='';const url=URL.createObjectURL(f);let dur;
    try{dur=await videoDuration(url)}catch(e){URL.revokeObjectURL(url);F.vErr='This browser can’t play that video. Try another file, or record in your camera’s most compatible format.';return vidPaint()}
    if(F.video&&!F.video.stored&&F.video.url)URL.revokeObjectURL(F.video.url);
    F.video={blob:f,type:f.type,dur,url,name:f.name||'Video'};F.trim=M.defaultTrim(dur);F.videoTouched=true;F.trimTouched=true;vidPaint();
    const tr=$('#nxtrim',s.el);if(tr)tr.scrollIntoView({block:'nearest'})}
  function wire(){const n=$('#nxname',s.el),sh=$('#nxshort',s.el),yt=$('#nxyt',s.el),yts=$('#nxyts',s.el);
    n.addEventListener('input',()=>{F.name=n.value;upd();clearTimeout(bT);bT=setTimeout(()=>{paintBase();preselect()},450)});sh.addEventListener('input',()=>{F.short=sh.value;F.shortEdited=!!sh.value.trim();upd()});
    [n,sh,yt,yts].forEach(x=>x.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();x.blur()}}));
    yt.addEventListener('input',()=>{F.yt=yt.value;F.ytC=null;F.ytP=null;clearTimeout(ytT);ytT=setTimeout(ytCheck,700)});yt.addEventListener('change',()=>{F.yt=yt.value;ytCheck()});
    yts.addEventListener('input',()=>{F.ytStart=yts.value;clearTimeout(ytT);ytT=setTimeout(ytCheck,700)});yts.addEventListener('change',()=>{F.ytStart=yts.value;ytCheck()});
    $$('[data-tg]',s.el).forEach(c=>c.addEventListener('change',()=>{F.touched=true;F[c.dataset.tg]=c.checked;paintBase()}));
    const bq=$('#nxbq',s.el);if(bq){bq.addEventListener('input',()=>{F.bq=bq.value;clearTimeout(bT);bT=setTimeout(()=>paintBase(true),200)});bq.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();bq.blur()}})}
    ['nxcam','nxfile'].forEach(i=>{const fi=$('#'+i,s.el);if(fi)fi.addEventListener('change',()=>{const f=fi.files&&fi.files[0];if(!f)return;resizeImg(f,800).then(u=>{F.photo=u;F.photoTouched=true;$('#nxphoto',s.el).innerHTML=photoRow();wire()}).catch(()=>toast('Could not read that image'))})});
    ['nxrec','nxvid'].forEach(i=>{const fi=$('#'+i,s.el);if(fi)fi.addEventListener('change',()=>takeVideo(fi.files&&fi.files[0]))});wireVideo()}
  wire();if(F.name.trim()&&!ed)setTimeout(preselect,0);if(F.yt&&(!F.ytC||F.ytC.state==='unchecked'))ytCheck();else if(F.yt)F.ytP=M.parseYouTube(F.yt,F.ytStart);
  s.el.addEventListener('click',async e=>{const c=e.target.closest('[data-nx]');
    if(c){const k=c.dataset.nx,v=c.dataset.v;
      if(k==='rmphoto'){F.photo=null;F.photoTouched=true;$('#nxphoto',s.el).innerHTML=photoRow();wire();return}
      if(k==='rmvideo'){if(F.video&&!F.video.stored&&F.video.url)URL.revokeObjectURL(F.video.url);F.video=null;F.trim=null;F.videoTouched=true;F.vErr='';vidPaint();return}
      if(k==='equipment'||k==='pattern'){F.touched=true;F[k]=F[k]===v?null:v;return re()}
      if(k==='main'){F.touched=true;const old=F.main;F.main=old===v?null:v;delete F.extra[v];if(old&&old!==v)F.extra[old]='helper';return re()}   // Coach call 2: the old Main mover moves down to Helper (0.5)
      if(k==='extra'){F.touched=true;const b=F.extra[v];if(!b)F.extra[v]='helper';else if(b==='main')F.extra[v]='helper';else if(b==='helper')F.extra[v]='minor';else delete F.extra[v];return re()}}
    const nb=e.target.closest('[data-nb]');if(nb)return baseAct(nb.dataset.nb,nb.dataset.v);
    if(e.target.closest('[data-x=nxcancel]'))return s.close();
    if(e.target.closest('[data-x=nxsave]')){F.tried=true;const fm=form(),v=CX.validate(fm,others.map(x=>x.name));
      if(F.yt.trim()&&!F.ytC&&!F.ytBusy){const pp=M.parseYouTube(F.yt,F.ytStart);if(!pp.error)ytCheck()}
      if(F.ytBusy){upd();await F.ytBusy}
      if(vfy().errors.length||ytBlock()){ytPaint();const m=$('#nxmsg',s.el);m.scrollIntoView({block:'center'});return}
      // short name: a hand-edited one is kept; otherwise Coach's rule re-runs only when the name changed
      const nameSame=ed&&spaces2(F.name)===ed.name,hand=F.shortEdited&&F.short.trim();
      const keepShort=hand?F.short:(nameSame&&!ed.short_name_edited?ed.short_name:undefined);
      const bo={id:ed?ed.id:undefined,short_name:keepShort,takenIds:[...cxList().map(x=>x.id),...ld(CXGONE,[])],takenShort:others.map(x=>x.short_name),dt:RD};
      let rec;try{rec=F.base?CX.fromBase(F.base,fm,bo):CX.build(fm,bo)}catch(x){toast('Could not save: '+x.message);return}
      rec.short_name_edited=!!hand;rec.based_on=F.base||null;   // the library base (same as base_id); null = pattern x equipment defaults
      const p=F.yt.trim()?M.parseYouTube(F.yt,F.ytStart):null;
      if(p&&!p.error){rec.youtube=p.url;rec.youtube_meta={video_id:p.video_id,start_s:p.start_s,author:(F.ytC&&F.ytC.author)||'',checked:!!(F.ytC&&F.ytC.state==='ok')}}else{rec.youtube='';delete rec.youtube_meta}
      const media={};if(F.photoTouched)media.photo=F.photo||null;
      if(F.videoTouched)media.video=F.video?{blob:F.video.blob,type:F.video.type,dur:F.video.dur}:null;
      if(F.video&&(F.trimTouched||F.videoTouched))media.trim=M.clampTrim(F.video.dur,F.trim.start,F.trim.end,'end');
      const sv0=$('[data-x=nxsave]',s.el);if(sv0)sv0.disabled=true;
      let r;try{r=await cxStore(rec,media)}catch(x){if(sv0)sv0.disabled=false;toast('Not enough browser storage to save this exercise');return}
      if(!r.videoOk)toast('Saved without the video: not enough browser storage');else if(!r.photoOk)toast('Saved without the photo: not enough browser storage');
      if(F.video&&!F.video.stored&&F.video.url&&F.videoTouched)URL.revokeObjectURL(F.video.url);
      s.close();if(o.onSave)o.onSave(rec.id,!!ed)}});
  return s}
const spaces2=t=>String(t||'').split(/\s+/).filter(Boolean).join(' ');
// ---- detail card built from the record (the library popup is library-only): body map, set credit, Analysis numbers, honesty labels, Edit / Delete
function cxDetailData(e){const LL=CXLL||{main:'Main mover',helper:'Helper',minor:'Minor'},mus={},lv={};
  for(const [m,r] of Object.entries(e.muscles))if(r>0){mus[m]=r;lv[m]=r>=0.75?'primary':r>=0.4?'secondary':r>=0.25?'minor':'trace'}
  const cnt=Object.values(mus).filter(r=>r>=0.25).reduce((a,r)=>a+r,0),ord=(RD.exl.muscles||[]);
  const targets=Object.entries(mus).sort((a,b)=>b[1]-a[1]||ord.indexOf(a[0])-ord.indexOf(b[0])).map(([m,r])=>({muscle:m,rating:r,counts:r>=0.25,share:r>=0.25&&cnt?r/cnt:0}));
  const SL=(RD.rules.rules||[]).find(r=>r.id==='session_length')||{},rest=((SL.rest_min_by_type||{})[e.type]),work=SL.work_min_per_set;
  const rr=WHITEBOARD.repRange(RD,e.id,null),T=(window.MUSCLEDIVE&&MUSCLEDIVE.RECOVERY_TIERS)||[],tier=(T.find(t=>e.fatigue>=t[2]-1e-9)||[])[1]||'';
  const side=RD.PAT[e.id],pps=(RD.rules.push_patterns||[]).includes(side)?'push':(RD.rules.pull_patterns||[]).includes(side)?'pull':null;
  return {name:e.name,body_map:{muscles:mus,levels:lv,level_labels:{primary:LL.main,secondary:LL.helper,minor:LL.minor,trace:'Not counted'}},targets,
    stretch:{stretch_emphasis:e.swap.stretch_emphasis,stretch_biased_for:e.stretch_biased_for||[],stretch_focused:(e.stretch_biased_for||[]).length>0},
    fatigue:{rating:e.fatigue,tier,recovery_cost_per_set:e.fatigue,systemic_fatigue_tag:e.swap.systemic_fatigue,heavy_spine:false,rest_min:rest,minutes_per_set:rest!=null&&work!=null?+(rest+work).toFixed(2):null},
    stimulus_per_fatigue:{main:+(Math.max(...Object.values(mus),0)/e.fatigue).toFixed(2)},one_side:(e.swap.flags||[]).includes('unilateral'),
    rep_range:{display:rr.display,unit:rr.unit,per_side:rr.per_side},movement_pattern_label:CX?CX.labels.pattern[e.movement_pattern]:e.movement_pattern,push_pull_side:pps,
    equipment:CX?CX.labels.equipment[e.equipment]:e.equipment,equipment_needs:e.equipment_needs,show_photo:false,photos:null}}
// "Estimated from <base>" (Coach's explainer_for variants); the info button opens the full sentence
function cxEst(e){if(!CX||!CX.EXPL)return '';const [v,t]=CX.explainerFor(e),b=e.base_id&&CX.libOf(e.base_id);
  const short=b?`Estimated from ${esc(b.name)}${v==='based_on_base_edited'?' · with your edits':''}`:`Estimated from typical ${esc(e.movement_pattern)} · ${esc(e.equipment)} exercises`;
  return `<p class="cxest" data-est="${v}">${short}<button type="button" class="nxinfo" data-cxwhy="1" aria-label="About this estimate" data-t="${esc(t)}">ⓘ</button></p>`}
async function cxDetail(id,o={}){const e=RD.EX[id];if(!e)return null;await cxBandLabels();const bse=e.base_id&&CX&&CX.libOf(e.base_id);const ph=cxPhoto(id),src=e.defaults_source||{},cell=(RD.CXD&&RD.CXD.cells[src.cell])||{};
  const media=cxMediaBlock(id),watch=media?`<button class="xwatch" data-go="#learn-ex-${id}~video" aria-label="Watch the clip or demo video">${I('play')}Watch</button>`:'';
  const s=sheet({title:'',cls:'grouped tall xdet',right:'<button class="btn plain" data-x="close">Done</button>',
    body:`<div class="xd cxd" data-id="${id}" data-custom="1"><div class="exi-h">${gl(id)}<div><h3>${esc(e.name)}</h3><p class="sub">${(e.type||' ')[0].toUpperCase()+(e.type||'').slice(1)} · ${esc(e.equipment)}<span class="evl cxl" data-ev="custom">Custom</span><span class="evl" data-ev="modeled">Estimated</span></p><p class="sub nxsn">On the board: ${esc(e.short_name)}</p></div>${watch}</div>
     ${cxEst(e)}${media}
     ${ph?`<div class="xphotos cxph" data-photo="custom"><figure><img src="${ph}" alt="${esc(e.name)} photo"><figcaption>Your photo</figcaption></figure></div>`:''}
     <div id="xdb">${exDetailBody(id,cxDetailData(e))}</div>
     <p class="foot cxsrc">${bse?`Your exercise, started from ${esc(bse.name)}. Muscle credit keeps its ratings where you kept its bands; fatigue, rep range and the rest come from it${(e.derived&&e.derived.changed&&(e.derived.changed.movement_pattern||e.derived.changed.equipment))?`, adjusted to typical ${esc(e.movement_pattern)} · ${esc(e.equipment)} values`:''}. Estimated, not measured.`:`Your exercise. Muscle credit comes from the bands you picked; fatigue, rep range and the rest are modeled from ${cell.n_library?`${cell.n_library} library exercise${cell.n_library===1?'':'s'} with the same pattern and equipment`:'library exercises with the same pattern'}, not measured.`}</p>
     <div class="pad two"><button class="btn grey" data-x="cxedit">${I('edit',1.8)} Edit</button>${o.onAdd?`<button class="btn accent" data-x="add">${I('plus',2)} ${o.addLabel||'Add'}</button>`:`<button class="btn grey dl" data-x="cxdel">${I('trash',1.8)} Delete</button>`}</div>
     ${o.onAdd?`<div class="pad"><button class="btn plain block dl" data-x="cxdel">Delete exercise</button></div>`:''}</div>`});
  if(ph){const x=$('.xnop',s.el);if(x)x.remove()}
  cxWireLoops(s.el);const im=$('.xvth img[data-src]',s.el);if(im){im.src=im.dataset.src;im.removeAttribute('data-src')}
  s.el.addEventListener('click',ev=>{if(ev.target.closest('[data-x=close]'))return s.close();
    const wy=ev.target.closest('[data-cxwhy]');if(wy){const w=sheet({title:(CX.EXPL.label||'Estimated').replace(/^ⓘ\s*/,''),cls:'grouped nxwhy',right:'<button class="btn plain" data-x="close">Done</button>',body:`<p class="lsum nxwhyt">${esc(wy.dataset.t)}</p>`});
      w.el.addEventListener('click',x=>{if(x.target.closest('[data-x=close]'))w.close()});return}if(ev.target.closest('[data-x=add]')){s.close();return o.onAdd&&o.onAdd(id)}
    const pl=ev.target.closest('[data-act=xvplay]');if(pl){ev.preventDefault();return xvPlay(pl)}
    if(ev.target.closest('[data-x=cxedit]')){s.close();return newExSheet({editId:id,onSave:nid=>{if(window.BOARD&&BOARD.repaint)BOARD.repaint();toast('Saved');setTimeout(()=>cxDetail(nid,o),80)}})}
    if(ev.target.closest('[data-x=cxdel]')){const n=(window.BOARD&&BOARD.countExercise)?BOARD.countExercise(id):0;
      return confirmSheet(`Delete “${esc(e.name)}”?`,`It is removed from your exercises${n?` and from ${n} place${n>1?'s':''} on the board`:''}, with its photo and video. This can’t be undone.`,'Delete exercise',()=>{s.close();cxDelete(id);toast('Exercise deleted')})}
    const g=ev.target.closest('[data-go]');if(g){ev.preventDefault();ev.stopPropagation();const h=g.dataset.go;closeAll();go(h)}});return s}
window.SBX={openPSheet,cmGet,cmSet,cmShown,progressData,apeFig,APE_FIG,ladderData,ladderFor,ladSettings,ladSet,ladPersist,logExport,logImport,mlGet,mlSet,newExSheet,cxDetail,cxL,isCx,cxList,cxDelete,cxExport,cxImport,cxMedia,cxPhoto,cxStore,get CXM_OK(){return CXM_OK},get CX(){return CX},cxPlacedKey:CXPL,devClean,qMatch,fold,esc,BAND,hlLevel,exDetailBody,logApi:{load:()=>logLoad(),get h(){return LOGH},get pr(){return LPR},LOGS,LOG_K,LSO:'apechit.sb.wkOrder'},cvt,uTxt,setTheme,getTheme,isDark,progressData,trainDeload,progApply,progUndo,pview:()=>pview(progressData()),openPSheet,get PSH(){return PSH},get PROG(){return PROG},get LOGV(){return LOGV},V,AFTER,ROUTES,ROUTINES,S,sheet,closeAll,toast,go,render,swapSheet,bindSwipes,I,header,bookBtn,gearBtn,CHEV,gl,GLY,EX,ML,exNameP,exSub,whyR,starBtn,isFav,map,vStat,volFill,IN_DARK,kchip,itemDef,explainSheet,ibtn,learnGo,exDetail,exdLoad,sortHtml,sortIds,sortMode,sortNote,SORTS,VB,VFILL,VLAB,volLegend,filterHtml,passF,movePat,mpDefs,startWorkout,
  get RD(){return RD},get WK(){return WK},get FIN(){return FIN},prefs:()=>prefs(),setSC:o=>{SC=Object.assign({board:BOARDS.ppl,day:'fri',cands:null,note:''},o)},get SC(){return SC},get NAV(){return NAV}};
window.addEventListener('hashchange',route);
Promise.all([loadVB(),loadRank()]).finally(()=>{startTick();route()}); // first paint after rules.json (volume_bands, ranking) is in
})();
