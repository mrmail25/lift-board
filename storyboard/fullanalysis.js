/* vol16: Full analysis page, muscle deep dive and tap panels (storyboard glue; every number comes from the engine:
   logic/progcheck.js, analysis.js (applyOps / invertOps / sheet), muscledive.js, mapramp.js, wfatigue.js, rank.js, and Coach's data).
   Full analysis = the wireframe /workspace/vol16-layout/full-analysis.html with live values. Deep dive = the approved mocks
   deepdive-recommended(-chest).html, computed live. Tap panels: insight + at most 2 fixes, Apply / Undo on the board
   (BOARD.progApply / progUndo, undo = the exact pre-apply board), a fix is shown only if it adds no new flag (engine valid()). */
(function(){'use strict';
const X=window.SBX,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const PC=()=>window.PCHECK,AN=()=>window.ANALYSIS,MD=()=>window.MUSCLEDIVE,MR=()=>window.MAPRAMP,WF=()=>window.WFATIGUE,RK=()=>window.RANK;
const RD=()=>{if(window.GOALS)GOALS.sync();return X.RD};
const DAYS=()=>window.BOARD.days(),LV=()=>window.BOARD.state.level;
const ORD=['mon','tue','wed','thu','fri','sat','sun'],WD={mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat',sun:'Sun'},WDL={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const f1=x=>{x=+x;const r=Math.sign(x)*Math.round(Math.abs(x)*10+1e-9)/10;return String(r===0?0:r)};   // board.js nfmt: half-up, 1 decimal
const pc=x=>Math.round(x*100)+'%';
const r2=x=>Math.floor(x*100+0.5+1e-9)/100;
const ML=m=>(X.ML&&X.ML[m])||m.replace(/_/g,' ');
const mlow=m=>ML(m).toLowerCase();
const EXN=id=>X.exNameP?X.exNameP(id):((RD().EX[id]||{}).name||id);
const clone=o=>JSON.parse(JSON.stringify(o));
// ---------- wording constants (Coach's strings; drop new wording in here) ----------
const ZL={grey:'Under',light_green:'Building',dark_green:'Best',yellow:'Diminishing returns',red:'No payoff'};   // colour-bar labels (vol16)
const ZFG={grey:'#1b1b1b',light_green:'#1b1b1b',dark_green:'#fff',yellow:'#1b1b1b',red:'#fff'};
const SWAP_REASONS={stretch:'Trains {muscle} in the stretched position.',lower_fatigue:'Same {muscle} work, less fatigue ({from} → {to}).',direct:'Works {muscle} more directly.'};
const SWAP_RESULT='→ {sets} sets, {zone} · {day} fatigue {level}';
const FATIGUE_TAG_LABEL='fatigue per set, Modeled';   // per-set class from fatigue.json: Low 0.72 / Normal 1.0–1.2 / High 1.32–1.56
const FTAG={Low:['#C7E9B4','#1b1b1b'],Normal:['#1E7B3A','#fff'],High:['#F2C230','#1b1b1b']};   // never red
const FDAY={Low:['#C7E9B4','#1b1b1b'],Normal:['#1E7B3A','#fff'],Extra:['#F2C230','#1b1b1b'],High:['#F2C230','#1b1b1b'],Extreme:['#D7263D','#fff']};   // day fatigue colours (vol16)
const CARRIED_NOTE='The {sets}-set {day} warning stays.';
// readable label on any swatch: whichever of near-black / white has the higher contrast (both themes, >= 4.5:1 on the ramp)
const fgOn=hex=>{const h=String(hex).replace('#','');if(h.length<6)return '#1b1b1b';const L=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)},l=.2126*L(parseInt(h.slice(0,2),16))+.7152*L(parseInt(h.slice(2,4),16))+.0722*L(parseInt(h.slice(4,6),16));return 1.05/(l+.05)>=(l+.05)/.05?'#fff':'#000'};
const fill=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>o[k]!=null?o[k]:m);
const GLY={primary:'★',accessory:'▲',isolation:'●'};
const FLV=['Low','Normal','Extra','High','Extreme'];
// Nurd Sh!t map (Coach, 2026-11-02): own muscle article, exercise-selection where it applies, then the 4 fundamentals
const NURD={"abductors":{"links":[{"kind":"muscle","id":"abductors","path":"education/muscles/abductors.json","title":"Abductors"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}],"note":"Optional muscle: no weekly target needed."},"abs":{"links":[{"kind":"muscle","id":"abs","path":"education/muscles/abs.json","title":"Abs"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"adductors":{"links":[{"kind":"muscle","id":"adductors","path":"education/muscles/adductors.json","title":"Adductors"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"biceps":{"links":[{"kind":"muscle","id":"biceps","path":"education/muscles/biceps.json","title":"Biceps"},{"kind":"fundamental","id":"exercise-selection","path":"education/fundamentals/exercise-selection.json","title":"Choosing exercises: stretch, stability, fatigue, loading and skill","sublabel":"stretch-biased lifts"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"calves":{"links":[{"kind":"muscle","id":"calves","path":"education/muscles/calves.json","title":"Calves"},{"kind":"fundamental","id":"exercise-selection","path":"education/fundamentals/exercise-selection.json","title":"Choosing exercises: stretch, stability, fatigue, loading and skill","sublabel":"stretch-biased lifts"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"chest":{"links":[{"kind":"muscle","id":"chest","path":"education/muscles/chest.json","title":"Chest"},{"kind":"fundamental","id":"exercise-selection","path":"education/fundamentals/exercise-selection.json","title":"Choosing exercises: stretch, stability, fatigue, loading and skill","sublabel":"stretch-biased lifts"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"forearms":{"links":[{"kind":"muscle","id":"forearms","path":"education/muscles/forearms.json","title":"Forearms"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"front_delts":{"links":[{"kind":"muscle","id":"front_delts","path":"education/muscles/front_delts.json","title":"Front delts"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"glutes":{"links":[{"kind":"muscle","id":"glutes","path":"education/muscles/glutes.json","title":"Glutes"},{"kind":"fundamental","id":"exercise-selection","path":"education/fundamentals/exercise-selection.json","title":"Choosing exercises: stretch, stability, fatigue, loading and skill","sublabel":"stretch-biased lifts · spinal loading and fatigue"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"hamstrings":{"links":[{"kind":"muscle","id":"hamstrings","path":"education/muscles/hamstrings.json","title":"Hamstrings"},{"kind":"fundamental","id":"exercise-selection","path":"education/fundamentals/exercise-selection.json","title":"Choosing exercises: stretch, stability, fatigue, loading and skill","sublabel":"stretch-biased lifts · spinal loading and fatigue"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"lats":{"links":[{"kind":"muscle","id":"lats","path":"education/muscles/lats.json","title":"Lats"},{"kind":"fundamental","id":"exercise-selection","path":"education/fundamentals/exercise-selection.json","title":"Choosing exercises: stretch, stability, fatigue, loading and skill","sublabel":"stretch-biased lifts"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"lower_back":{"links":[{"kind":"muscle","id":"lower_back","path":"education/muscles/lower_back.json","title":"Lower back"},{"kind":"fundamental","id":"exercise-selection","path":"education/fundamentals/exercise-selection.json","title":"Choosing exercises: stretch, stability, fatigue, loading and skill","sublabel":"spinal loading and fatigue"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"obliques":{"links":[{"kind":"muscle","id":"obliques","path":"education/muscles/obliques.json","title":"Obliques"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"quads":{"links":[{"kind":"muscle","id":"quads","path":"education/muscles/quads.json","title":"Quads"},{"kind":"fundamental","id":"exercise-selection","path":"education/fundamentals/exercise-selection.json","title":"Choosing exercises: stretch, stability, fatigue, loading and skill","sublabel":"stretch-biased lifts · spinal loading and fatigue"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"rear_delts":{"links":[{"kind":"muscle","id":"rear_delts","path":"education/muscles/rear_delts.json","title":"Rear delts"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"side_delts":{"links":[{"kind":"muscle","id":"side_delts","path":"education/muscles/side_delts.json","title":"Side delts"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"traps":{"links":[{"kind":"muscle","id":"traps","path":"education/muscles/traps.json","title":"Traps"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"triceps":{"links":[{"kind":"muscle","id":"triceps","path":"education/muscles/triceps.json","title":"Triceps"},{"kind":"fundamental","id":"exercise-selection","path":"education/fundamentals/exercise-selection.json","title":"Choosing exercises: stretch, stability, fatigue, loading and skill","sublabel":"stretch-biased lifts"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]},"upper_back":{"links":[{"kind":"muscle","id":"upper_back","path":"education/muscles/upper_back.json","title":"Upper back"},{"kind":"fundamental","id":"set-crediting-targets","path":"education/fundamentals/set-crediting-targets.json","title":"Set crediting and weekly targets"},{"kind":"fundamental","id":"volume-frequency","path":"education/fundamentals/volume-frequency.json","title":"Volume and frequency"},{"kind":"fundamental","id":"high-volume-vs-high-intensity","path":"education/fundamentals/high-volume-vs-high-intensity.json","title":"High volume vs high intensity"},{"kind":"fundamental","id":"hypertrophy-stimulus","path":"education/fundamentals/hypertrophy-stimulus.json","title":"What makes a muscle grow"}]}};
// ---------- engine helpers ----------
const tiles0=D=>D.tiles.map(t=>({id:t.id,sets:t.sets}));
const sheetOf=(dt,d,lv)=>AN().sheet(dt,d,lv,null);
function diveOf(dt,d,lv,m,SH){return MD().muscle(dt,d,lv,m,{sheet:SH||sheetOf(dt,d,lv)})}
const weekX=(A,m)=>{const v=A.muscles[m];return v?r2(v.x!=null?v.x:v.raw):0};
const zoneW=(dt,lv,m,x)=>MR().weekly(dt,lv,m,x);
const dayLevel=(dt,D,lv)=>{if(!D||!D.tiles.length)return null;const L=WF().level(dt,tiles0(D),lv);return L&&L.label};
const dayVal=(dt,D,lv)=>D&&D.tiles.length?WF().value(dt,tiles0(D),lv):0;
const mins=(dt,D,lv)=>D&&D.tiles.length?Math.round(PC().sessionMinutes(dt,tiles0(D),lv)):0;
const fcls=(dt,id)=>{const F=((dt.FAT||{}).exercises||{})[id];if(!F)return null;const v=F.fatigue_per_set;return {per_set:v,cls:v<0.9?'Low':v<1.3?'Normal':'High'}};
const NI=fl=>PC()._x.nonin(fl);
// engine valid(): no new non-info flag. carryFrom/To: a flag that only moves from one exercise to its swap counts as carried, not new
function newFlags(dt,d0,d1,lv,carryFrom,carryTo){const A0=NI(PC().check(dt,d0,lv)[0]),B1=[...NI(PC().check(dt,d1,lv)[0])];const raw=B1.filter(k=>!A0.has(k));
  if(!carryFrom)return {raw,carried:[],add:raw};const q=s=>JSON.stringify(s).slice(1,-1);const carried=raw.filter(k=>A0.has(k.split(q(carryTo)).join(q(carryFrom))));return {raw,carried,add:raw.filter(k=>!carried.includes(k))}}
const apply=(d,ops)=>AN().applyOps(d,ops);
const res=(dt,d,lv,m)=>{const Q=diveOf(dt,d,lv,m);const x=Q.sets.effective;return {eff:x,status:Q.sets.status,zone:zoneW(dt,lv,m,x).zone,days_hit:Q.frequency.days_hit,days:Q.frequency.days,stretch:Q.stretch.share,min:Q.sets.level_min}};
const pill=(zone,txt)=>`<span class="fa-pill" style="background:${MR().STOPS(null)[zone]||'#C8CDD2'};color:${ZFG[zone]||'#1b1b1b'}">${esc(txt||ZL[zone])}</span>`;
const ftag=c=>c?`<span class="fa-ftag" style="background:${FTAG[c][0]};color:${FTAG[c][1]}">${c}</span>`:'';
const dtag=L=>L?`<span class="fa-ftag" style="background:${FDAY[L][0]};color:${FDAY[L][1]}">${L}</span>`:'';
const isBodyweightish=e=>['bodyweight','rings','suspension','band','bands'].includes(e.equipment);
const LOADTOK=['plates','dumbbell','kettlebell','barbell','gym_machine','cable','smith','weight'];
const loaded=e=>!isBodyweightish(e)||(e.equipment_needs||[]).some(tok=>LOADTOK.some(t=>tok.includes(t)));

// ---------- fixes ----------
const full7=d=>ORD.map(k=>d.find(x=>x.day===k)||{day:k,tiles:[]});
const live=d=>d.filter(x=>x.tiles.length).map(x=>({day:x.day,tiles:x.tiles.map(t=>({id:t.id,sets:t.sets}))}));
const applyL=(d,ops)=>live(apply(full7(d),ops));
const effByDay=(dt,d,m)=>{const o={};for(const D of d){const e=PC().eff(dt,tiles0(D))[m]||0;if(e>0)o[D.day]=e}return o};
const FMIN=dt=>dt.targets.analytics.frequency_min_effective;
const hitDays=(dt,d,m)=>{const E=effByDay(dt,d,m),k=FMIN(dt);return ORD.filter(x=>(E[x]||0)>=k)};
const gaps=days=>{const i=days.map(d=>ORD.indexOf(d));return i.map((v,j)=>j<i.length-1?i[j+1]-v:7-v+i[0])};
const btb=days=>{const s=new Set(),i=days.map(d=>ORD.indexOf(d));for(const a of i)for(const b of i)if((a+1)%7===b)s.add(a+'-'+b);return s};
// spacing line (days only): 'Mon and Thu, 3 days apart' / 'Thursday only, so 7 days between sessions'
function spacingLine(days){const fd=ORD.filter(d=>days.includes(d));if(!fd.length)return 'No day with enough sets';if(fd.length===1)return `${WDL[fd[0]]} only, so 7 days between sessions`;
  const g=gaps(fd);if(fd.length===2)return `${WD[fd[0]]} and ${WD[fd[1]]}, ${g[0]} day${g[0]===1?'':'s'} apart`;const lo=Math.min(...g),hi=Math.max(...g);
  return `${fd.slice(0,-1).map(d=>WD[d]).join(', ')} and ${WD[fd[fd.length-1]]}, ${lo===hi?lo:`${lo}–${hi}`} day${hi===1?'':'s'} apart`}
// the muscle's own fixes (deep-dive suggestions): combined fix first when no single fix reaches the minimum, then the singles.
// A swap-type suggestion goes to Swap ideas (as its exercise's row), not here. Every fix passes the no-new-flag check.
function muscleFixes(dt,d,lv,m,P){P=P||diveOf(dt,d,lv,m);const seen=new Set();
  const all=P.suggestions.apply.filter(a=>a.fix&&a.fix.ops&&a.fix.ops.length&&!seen.has(a.fix.preview)&&seen.add(a.fix.preview));
  const isSwap=a=>a.fix.ops.some(o=>o.op==='swap');
  const mk=(ops,preview)=>{let nw;try{nw=applyL(d,ops)}catch(e){return null}const nf=newFlags(dt,d,nw,lv);if(nf.add.length)return null;return {ops,preview,r:res(dt,nw,lv,m),undo:AN().invertOps(ops)}};
  const singles=all.filter(a=>!isSwap(a)).map(a=>mk(a.fix.ops,a.fix.preview)).filter(Boolean).slice(0,2);
  let combo=null;const min=P.sets.level_min;
  if(singles.length===2&&!singles.some(s=>s.r.eff>=min-1e-9)){const c=mk(singles[0].ops.concat(singles[1].ops),singles.map(s=>s.preview.replace(/\s*\(\d+→\d+\)$/,'')).join(' · '));if(c&&c.r.eff>Math.max(...singles.map(s=>s.r.eff))+1e-9)combo=c}
  const swaps=all.filter(isSwap).map(a=>Object.assign(mk(a.fix.ops,a.fix.preview)||{},{src:a})).filter(x=>x.ops);
  return {combo,singles,swaps}}
const opShort=o=>o.op==='sets'?`${WD[o.day]} +${o.to-o.from}`:o.op==='add'?`${WD[o.day]} +${o.sets}`:o.op==='remove'?`${WD[o.day]} −${o.id}`:`${WD[o.day]} swap`;
// swap ideas for the main lift (Coach vol16): loaded compounds for a primary main lift (primary/accessory, never isolation),
// bodyweight only if this muscle's own lifts use it, staples first ranked by engine score, one slot per reason then next best,
// near-duplicate skip (same equipment + movement pattern), max 2 reason lines (stretch first, then lower fatigue), max 3.
function swapIdeas(dt,d,lv,m,contrib){if(!contrib.length)return null;const main=contrib.slice().sort((a,b)=>b.effective_sets-a.effective_sets)[0],cur=main.id,curE=dt.EX[cur],curR=curE.muscles[m]||0;
  const STRB=(dt.rules.stretch_biased||{})[m]||null,lfc=new Set(AN().lowerFatigueCandidates(dt,cur)[0]),curF=fcls(dt,cur),N=Object.keys(dt.EX).length;
  const on=new Set(d.flatMap(D=>D.tiles.map(t=>t.id))),musEq=new Set(contrib.map(c=>dt.EX[c.id].equipment)),prof=X.gymProfile?X.gymProfile():{};
  const daysWith=d.filter(D=>D.tiles.some(t=>t.id===cur)).map(D=>D.day),LVI=['Low','Normal','High'];
  const passing=[];
  for(const c of RK().swaps(dt,cur,N)){const ci=c.id,e=dt.EX[ci];if(!e||e.custom||on.has(ci))continue;const [,sp,cs]=RK().swapScore(dt,cur,ci);if(!(sp||cs>=0.6))continue;
    const cf=fcls(dt,ci),reasons=[];
    if(STRB&&STRB.includes(ci)&&!STRB.includes(cur))reasons.push('stretch');
    if(lfc.has(ci)&&cf&&curF&&LVI.indexOf(cf.cls)<LVI.indexOf(curF.cls))reasons.push('lower_fatigue');
    if((e.muscles[m]||0)>=curR+0.25-1e-9)reasons.push('direct');
    if(!reasons.length)continue;
    try{if(RK().needsStatus(dt,prof,e)==='unavailable')continue}catch(x){}
    if(curE.type==='primary'){if(e.type==='isolation')continue;if(!loaded(e)&&!musEq.has(e.equipment))continue;if(/plyo/.test((e.movement_pattern||'')+(e.equipment||'')))continue}
    const ops=daysWith.map(dn=>{const t=d.find(D=>D.day===dn).tiles.find(t=>t.id===cur);return {op:'swap',day:dn,from_id:cur,to_id:ci,sets:t.sets}});
    let nw;try{nw=applyL(d,ops)}catch(x){continue}const nf=newFlags(dt,d,nw,lv,cur,ci);if(nf.add.length)continue;
    passing.push({id:ci,e,cf,reasons,ops,undo:AN().invertOps(ops),r:res(dt,nw,lv,m),dayF:dayLevel(dt,nw.find(D=>D.day===daysWith[0]),lv),carried:nf.carried})}
  const stp=(dt.rules.staples||{})[m]||[];let pool=passing.filter(s=>stp.includes(s.id)),src='staples';if(!pool.length){pool=passing;src='library'}
  const shown=[],sig=s=>s.e.equipment+'|'+s.e.movement_pattern,dup=s=>shown.some(x=>sig(x)===sig(s));
  for(const r of ['lower_fatigue','stretch','direct']){const s=pool.find(s=>s.reasons.includes(r)&&!shown.includes(s)&&!dup(s));if(s)shown.push(s)}
  for(const s of pool){if(shown.length>=3)break;if(!shown.includes(s)&&!dup(s))shown.push(s)}
  const ORDR=['stretch','lower_fatigue','direct'];shown.forEach(s=>{s.lines=ORDR.filter(k=>s.reasons.includes(k)).slice(0,2);s.src=src});
  const sets=(d.find(D=>D.day===daysWith[0])||{tiles:[]}).tiles.find(t=>t.id===cur);
  const carried=shown.some(s=>s.carried.length)?fill(CARRIED_NOTE,{sets:sets?sets.sets:'',day:WDL[daysWith[0]]}):'';
  return {main:{id:cur,name:EXN(cur),fatigue:curF,days:daysWith},shown,carried,src}}
// move fixes for one muscle off one day (Coach/CoS vol16 stricter rule): target day ends below High, no new back-to-back for
// that muscle, no muscle drops below its minimum, no new flag. Rank: evenest spacing, then lowest peak day level. Failing moves hidden.
function moveFixes(dt,d,lv,m,day,max,onlyId,needNewDay){max=max||2;const D=d.find(x=>x.day===day);if(!D)return [];
  const A0=PC().analytics(dt,d,lv).muscles,hd0=hitDays(dt,d,m),b0=btb(hd0),out=[];
  const tl=D.tiles.filter(t=>((dt.EX[t.id]||{}).muscles||{})[m]>=0.25).sort((a,b)=>b.sets*(dt.EX[b.id].muscles[m])-a.sets*(dt.EX[a.id].muscles[m]));
  for(const t of (onlyId?tl.filter(t=>t.id===onlyId):tl.slice(0,2)))for(const T of ORD){if(T===day)continue;const TD=d.find(x=>x.day===T);if(TD&&TD.tiles.some(x=>x.id===t.id))continue;
    const ops=[{op:'remove',day,id:t.id},{op:'add',day:T,id:t.id,sets:t.sets}];let nw;try{nw=applyL(d,ops)}catch(x){continue}
    const lvT=dayLevel(dt,nw.find(x=>x.day===T),lv);if(!lvT||FLV.indexOf(lvT)>=FLV.indexOf('High'))continue;
    const hd1=hitDays(dt,nw,m),b1=btb(hd1);if([...b1].some(k=>!b0.has(k)))continue;if(needNewDay&&hd1.length<=hd0.length)continue;
    const A1=PC().analytics(dt,nw,lv).muscles;if(Object.keys(A0).some(k=>A0[k].min>0&&weekX({muscles:A0},k)>=A0[k].min-1e-9&&weekX({muscles:A1},k)<A1[k].min-1e-9))continue;
    if(newFlags(dt,d,nw,lv).add.length)continue;
    const g=hd1.length>1?gaps(hd1):[7],even=Math.max(...g)-Math.min(...g),peak=Math.max(...nw.map(x=>dayVal(dt,x,lv)));
    out.push({ops,undo:AN().invertOps(ops),t,from:day,to:T,lvFrom0:dayLevel(dt,D,lv),lvFrom1:dayLevel(dt,nw.find(x=>x.day===day),lv),lvTo0:dayLevel(dt,d.find(x=>x.day===T),lv)||'Rest',lvTo1:lvT,hd1,even,peak,E1:effByDay(dt,nw,m)})}
  out.sort((a,b)=>a.even-b.even||a.peak-b.peak||ORD.indexOf(a.to)-ORD.indexOf(b.to));
  const seen=new Set();return out.filter(o=>{const k=o.t.id;if(seen.has(k+o.to))return false;seen.add(k+o.to);return true}).slice(0,max)}

// ---------- Apply / Undo (a stack; Undo restores the exact board from before that apply and drops later applies) ----------
const FX=new Map(),APPL=[];let FXN=0;
const fxBtn=(f,cls)=>{const i=++FXN;FX.set(i,f);return `<button class="btn ${cls||'grey'} fa-apply" data-fa="apply" data-i="${i}">Apply</button>`};
const appliedBar=()=>{const t=APPL[APPL.length-1];return t?`<div class="fa-done" role="status"><span>✓ Applied: ${esc(t.label)}</span><button class="btn grey" data-fa="undo" data-i="${APPL.length-1}">Undo</button></div>`:''};
function doApply(i){const f=FX.get(+i);if(!f)return;const before=window.BOARD.progApply(clone(f.ops));APPL.push({before,label:f.label||'change'});rerender()}
function doUndo(i){const t=APPL[i];if(!t)return;APPL.length=i;window.BOARD.progUndo(t.before);rerender()}
// checked swap reasons (Coach vol16): stretch = candidate on this muscle's stretch list and the current lift is not; lower fatigue =
// engine lower-fatigue candidate AND the per-set class actually drops; more direct = rating >= current + 0.25. Max 2 lines, stretch first.
function swapReasons(dt,m,cur,ci){const STRB=(dt.rules.stretch_biased||{})[m]||null,a=fcls(dt,cur),b=fcls(dt,ci),LVI=['Low','Normal','High'],r=[];
  if(STRB&&STRB.includes(ci)&&!STRB.includes(cur))r.push('stretch');
  if(new Set(AN().lowerFatigueCandidates(dt,cur)[0]).has(ci)&&a&&b&&LVI.indexOf(b.cls)<LVI.indexOf(a.cls))r.push('lower_fatigue');
  if(((dt.EX[ci]||{}).muscles||{})[m]>=(((dt.EX[cur]||{}).muscles||{})[m]||0)+0.25-1e-9)r.push('direct');
  return {reasons:r,lines:r.slice(0,2),from:a,to:b}}
// ---------- deep dive ----------
const curveSvg=(dt,lv,m,C,S,XMAX)=>{const W=326,H=178,pl=30,pr=6,pt=10,pb=24,cx=v=>pl+v/XMAX*(W-pl-pr),cy=s=>pt+(1-s)*(H-pt-pb);
  const samp=[];for(let v=0;v<=XMAX+1e-9;v+=0.25)samp.push([+v.toFixed(2),PC().stim(dt,m,lv,v)]);
  const line=samp.map(([x,s],i)=>`${i?'L':'M'}${cx(x).toFixed(1)},${cy(s).toFixed(1)}`).join(''),area=line+`L${cx(XMAX)},${cy(0)}L${cx(0)},${cy(0)}Z`;
  const stops=samp.map(([x])=>`<stop offset="${(x/XMAX).toFixed(4)}" stop-color="${zoneW(dt,lv,m,x).hex}"/>`).join('');const Z=C.zones,an=(n,x,dy)=>{const s=PC().stim(dt,m,lv,x);return `<circle cx="${cx(x)}" cy="${cy(s)}" r="4" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.6"/><text x="${cx(x)}" y="${cy(s)+dy}" font-size="13" text-anchor="middle" fill="var(--ink)">${n}</text>`};
  let g=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="fa-curve" role="img" aria-label="Growth curve"><defs><linearGradient id="fa-rg-${m}" x1="${cx(0)}" x2="${cx(XMAX)}" gradientUnits="userSpaceOnUse">${stops}</linearGradient></defs>`;
  [0,.5,1].forEach(s=>g+=`<line x1="${pl}" x2="${W-pr}" y1="${cy(s)}" y2="${cy(s)}" stroke="var(--line)"/><text x="${pl-5}" y="${cy(s)+4}" font-size="10.5" text-anchor="end" fill="var(--text-2)">${s*100}%</text>`);
  g+=`<path d="${area}" fill="url(#fa-rg-${m})" opacity=".45"/><path d="${line}" fill="none" stroke="var(--ink)" stroke-width="2"/>`;
  if(Z.sweet){const sv=samp.filter(([x])=>x>=Z.sweet[0]-1e-9&&x<=Z.sweet[1]+1e-9);g+=`<path d="${sv.map(([x,s],i)=>`${i?'L':'M'}${cx(x)},${cy(s)}`).join('')}" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>`;g+=`<text x="${(cx(Z.sweet[0])+cx(Z.sweet[1]))/2}" y="${cy(0)-6}" font-size="10.5" text-anchor="middle" fill="var(--text-2)">Sweet spot ${Z.sweet[0]}–${Z.sweet[1]}</text>`;g+=an('①',Z.min,-9)+an('②',(Z.sweet[0]+Z.sweet[1])/2,-11)+an('③',Z.diminishing,-9)}
  g+=`<circle cx="${cx(C.x_after_session_discount)}" cy="${cy(C.stimulus)}" r="6" fill="var(--accent)" stroke="var(--paper)" stroke-width="2"/>`;
  [0,10,20,30].filter(v=>v<XMAX-2).forEach(v=>g+=`<text x="${cx(v)}" y="${H-8}" font-size="10.5" text-anchor="middle" fill="var(--text-2)">${v}</text>`);
  return g+`<text x="${W-pr}" y="${H-8}" font-size="10.5" text-anchor="end" fill="var(--text-2)">sets/wk</text></svg>`};
function realLogs(){try{const L=X.logApi.load();if(!L||(L.meta||{}).kind==='sample'||!(L.sessions||[]).length)return null;return L}catch(e){return null}}
// logged credited sets per week (Mon-start) per muscle: done working sets x rating (ratings under the counting minimum count 0). Real logs only.
function loggedByWeek(dt){const L=realLogs();if(!L)return {};const minR=dt.targets.counting.min_rating_to_count||0.25,S={},E={},W={};
  for(const s of L.sessions)if(s.date)S[s.id]=s.date.slice(0,10);for(const e of L.entries)if(!e.skipped)E[e.id]=e;
  for(const t of L.sets){if(t.kind==='warmup'||t.done===false)continue;const e=E[t.entryId];if(!e)continue;const ex=dt.EX[e.exerciseId],d=S[e.sessionId];if(!ex||!d)continue;
    const dd=new Date(d+'T12:00:00');dd.setDate(dd.getDate()-((dd.getDay()+6)%7));const wk=dd.toISOString().slice(0,10);const w=W[wk]=W[wk]||{};
    for(const [m,r] of Object.entries(ex.muscles))if(r>=minR)w[m]=(w[m]||0)+r}
  return W}
function loggedProgress(dt,m){const W=loggedByWeek(dt),k=Object.keys(W).sort().slice(-4);if(!k.length)return '';   // hidden until logs exist
  return `<div class="card fa-c" id="fa-logs"><div class="ch"><h2>Logged progress</h2></div><div class="lg"><span>Credited ${mlow(m)} sets, last ${k.length} week${k.length===1?'':'s'}</span><b>${k.map(x=>f1((W[x]||{})[m]||0)).join(' → ')}</b></div></div>`}
function deepHtml(m){const dt=RD(),d=DAYS(),lv=LV(),SH=sheetOf(dt,d,lv),P=diveOf(dt,d,lv,m,SH),S=P.sets,C=P.curve,F=P.frequency,A=PC().analytics(dt,d,lv);
  const x=S.effective,wk=zoneW(dt,lv,m,x),bp=MR().weeklyBp(dt,lv,m)||{grey_below:1,light_green:1,min:S.level_min,dark_green:[S.level_min,S.max],yellow:S.max,red:S.red_over_above};
  const XMAX=Math.max(30,Math.ceil((bp.red||S.max*1.25)*1.12));const ev=dt.targets.targets[m].evidence||{},evT=(dt.targets.curve.evidence_tags||{})[S.evidence_tag]||{label:'Evidence',description:''};
  const roleOf=e=>{const r=e.muscles[m]||0,mx=Math.max(...Object.values(e.muscles));return r>=0.75||r===mx?'prime':r>=0.5?'secondary':r>=0.25?'minor':null};
  const contrib=P.contributors.map(c=>({...c,type:dt.EX[c.id].type,disp:EXN(c.id),role:roleOf(dt.EX[c.id]),fatigue:fcls(dt,c.id)}));
  const direct=contrib.filter(c=>c.role==='prime').reduce((a,c)=>a+c.sets,0);
  let h=`${appliedBar()}<div class="fa-dd" data-m="${m}"><p class="fa-scope">This week · ${esc(window.BOARD.state.name||'your plan')} · ${esc(lv)}</p><div class="card fa-c fa-hero"><div class="hero"><div><div class="n num">${f1(x)}</div><div class="l">effective sets</div></div><div class="dv"><div class="n num">${direct}</div><div class="l">direct sets</div></div></div>
   <div class="hrow"><span>Target <b>${S.level_min}–${S.max}</b></span>${pill(wk.zone)}<button class="evb" data-fa="evb" aria-expanded="false">${esc(evT.label)} evidence ⓘ</button></div><div class="evn" id="fa-evn">${esc(ev.note||'')} ${esc(evT.description||'')}</div>
   ${S.red_under_below>0?`<div class="kv"><span>Far under / No payoff</span><b>below ${S.red_under_below} · above ${S.red_over_above}</b></div>`:`<div class="kv"><span>No payoff</span><b>above ${S.red_over_above}</b></div>`}`;
  const XP=v=>Math.min(100,v/XMAX*100),grad='linear-gradient(90deg,'+(()=>{const o=[];for(let v=0;v<=XMAX+1e-9;v+=0.25)o.push(`${zoneW(dt,lv,m,v).hex} ${XP(v).toFixed(2)}%`);return o.join(',')})()+')';
  const mid=(a,b)=>XP((a+b)/2);
  h+=`<div class="barw"><span class="mt" style="left:${Math.max(14,Math.min(86,XP(x)))}%">This week ${f1(x)}</span><div class="bar" style="background:${grad}" role="img" aria-label="This week ${f1(x)} sets on the colour bar"><span class="mk" style="left:${XP(x)}%"></span></div></div>
   <div class="bl"><span style="left:0;top:0">Under</span><span style="left:${mid(bp.light_green,bp.min||S.level_min)}%;top:14px;transform:translateX(-50%)">Building</span><span style="left:${mid(bp.min||S.level_min,bp.yellow)}%;top:0;transform:translateX(-50%)">Best</span><span style="right:${100-XP(bp.red)}%;top:14px">Diminishing returns</span><span style="right:0;top:0">No payoff</span></div></div>`;
  const Z=C.zones||{};const rd=C.zone==='below_min'?`under the ${S.level_min}-set minimum`:C.zone==='sweet_spot'?`in the sweet spot (${Z.sweet[0]}–${Z.sweet[1]})`:C.zone==='growth'?`between the ${S.level_min}-set minimum and the sweet spot`:C.zone==='upper'?`above the sweet spot`:C.zone==='none'?'not trained':`past the diminishing point (${Z.diminishing})`;
  h+=`<div class="card fa-c"><div class="ch"><h2>Growth curve<span class="mod">Modeled</span></h2><small>% of plateau</small></div>${curveSvg(dt,lv,m,C,S,XMAX)}
   <p class="read">${f1(x)} sets, ${rd}. The next set adds about <b>${pc(C.next_set)}</b> (Modeled).</p>
   <p class="src">Modeled from research averages; it is not a measurement of your growth.</p>
   ${Z.sweet?`<p class="src">① minimum ${Z.min} · ② sweet spot ${Z.sweet[0]}–${Z.sweet[1]} · ③ diminishing ${Z.diminishing}. Schoenfeld 2017; Pelland 2026</p>`:''}</div>`;
  // per workout + spacing (days only)
  const by=F.effective_by_day,mx=Math.max(...Object.values(by),F.min_effective_per_day),FN=(window.FREQNOTES&&dt.FN?FREQNOTES.notes(dt,d,lv,dt.FN.templates):[]).filter(n=>(n.muscles||[]).includes(m)&&n.polarity==='negative');
  h+=`<div class="card fa-c" id="deepdive-${m}-frequency"><div class="ch"><h2>Per workout</h2></div><p class="fl"><b>${F.days_hit} day${F.days_hit===1?'':'s'} with ${F.min_effective_per_day}+ sets</b> · ${spacingLine(F.days)}</p><div class="pw">`+ORD.map(dd=>{const v=by[dd];const hi=v!=null&&v>=F.min_effective_per_day;
    return `<div>${v>0?`<b class="${hi?'hi':'lo'} num">${f1(v)}</b><i class="${hi?'hi':''}" style="height:${Math.max(4,v/mx*70)}px"></i>`:`<i style="height:3px"></i>`}<s>${WD[dd]}</s></div>`}).join('')+`</div>`+(FN.length?`<div class="warn"><span aria-hidden="true">⚠︎</span><span>${esc(FN[0].text)}</span></div>`:'')+`</div>`;
  // where the sets come from
  h+=`<div class="card fa-c" id="deepdive-${m}-sets"><div class="ch"><h2>Where the sets come from</h2><small>${f1(x)} effective</small></div><p class="sub">${contrib.length} exercise${contrib.length===1?'':'s'} · tag: ${FATIGUE_TAG_LABEL}</p>`+(contrib.length?contrib.flatMap(c=>c.days.map(y=>`<div class="row"><span class="gl ${c.type}" title="${c.type}" aria-hidden="true">${GLY[c.type]}</span><div class="grow"><div class="t1">${esc(c.disp)} ${c.fatigue?ftag(c.fatigue.cls):''}${dt.EX[c.id].custom?' <span class="fa-est">est.</span>':''}</div><div class="t2">${WD[y.day]} · ${y.sets} sets → ${f1(y.effective_sets)} effective</div></div><span class="sh num">${pc(c.share)}</span><button class="btn grey" data-fa="remove" data-day="${y.day}" data-id="${c.id}">Remove</button></div>`)).join(''):`<p class="sub">No exercise on the board trains ${mlow(m)} yet.</p>`)+`</div>`;
  h+=loggedProgress(dt,m);
  // suggestions
  const MF=muscleFixes(dt,d,lv,m,P),SW={in_range:'in range',under:'close, under',far_under:'under',over:'close, over',far_over:'well over'};
  const staple=(()=>{const on=new Set(d.flatMap(D=>D.tiles.map(t=>t.id))),prof=X.gymProfile?X.gymProfile():{};return ((dt.rules.staples||{})[m]||[]).find(i=>!on.has(i)&&dt.EX[i]&&(()=>{try{return RK().needsStatus(dt,prof,dt.EX[i])!=='unavailable'}catch(e){return true}})())})();
  const sk=(dt.rules.pattern_gap_fix||{}).sets_by_kind||{},addDay=(P.suggestions.ranked_adds||{}).day,showAdd=staple&&addDay&&S.status!=='in_range'&&S.status!=='over'&&S.status!=='far_over';
  const resT=(o,r)=>o.op==='sets'?`${WD[o.day]} ${o.from}→${o.to} → ${f1(r.eff)} sets`:o.op==='add'?`${WD[o.day]} +${o.sets} → ${f1(r.eff)} sets over ${r.days_hit} day${r.days_hit===1?'':'s'}`:`→ ${f1(r.eff)} sets, ${ZL[r.zone]}`;
  if(MF.combo||MF.singles.length||showAdd){h+=`<div class="card fa-c" id="deepdive-${m}-fixes"><div class="ch"><h2>Suggestions</h2></div>`+
    (MF.combo?(MF.combo.label=MF.combo.preview,`<div class="row"><div class="grow"><div class="t1">${MF.combo.ops.map(opShort).join(' and ')} → ${f1(MF.combo.r.eff)} sets, ${SW[MF.combo.r.status]||ZL[MF.combo.r.zone]}</div><div class="t2">${esc(MF.combo.preview)}</div></div>${fxBtn(MF.combo,'acc')}</div>`):'')+
    MF.singles.map(f=>(f.label=f.preview,`<div class="row"><div class="grow"><div class="t1">${esc(f.preview)}</div><div class="t2">${resT(f.ops[0],f.r)}</div></div>${fxBtn(f,MF.combo||MF.singles.length>1?'grey':'acc')}</div>`)).join('')+
    (showAdd?(()=>{const n=dt.EX[staple].type==='isolation'?sk.isolation:sk.compound,f={ops:[{op:'add',day:addDay,id:staple,sets:n||2}],label:`Add ${EXN(staple)}, ${WD[addDay]} ${n||2} sets`};const nw=(()=>{try{return applyL(d,f.ops)}catch(e){return null}})();if(!nw||newFlags(dt,d,nw,lv).add.length)return '';
      return `<button class="add" data-fa="apply" data-i="${(FX.set(++FXN,f),FXN)}"><span class="pl" aria-hidden="true">+</span><span><b>Add suggested</b><small>${esc(EXN(staple))} · ${WD[addDay]} · ${n||2} sets</small></span></button>`})():'')+`</div>`}
  else h+=`<div class="card fa-c" id="deepdive-${m}-fixes"><div class="ch"><h2>Suggestions</h2></div><p class="sub">${S.status==='in_range'?`Nothing to fix: ${mlow(m)} is in range.`:`No change passes every check right now.`}</p></div>`;
  // swap ideas (hidden entirely when none pass); a swap-type suggestion becomes its exercise's row here
  const SI=swapIdeas(dt,d,lv,m,contrib);const mu=mlow(m);
  const swRow=s=>{s.label=`Swap ${EXN(SI.main.id)} → ${EXN(s.id)}`;const rs=s.lines.map(k=>fill(SWAP_REASONS[k],{muscle:mu,from:SI.main.fatigue?SI.main.fatigue.cls:'',to:s.cf?s.cf.cls:''})).join(' ');
    return `<div class="row"><span class="gl ${s.e.type}" aria-hidden="true">${GLY[s.e.type]}</span><div class="grow"><div class="t1">${esc(EXN(s.id))} ${s.cf?ftag(s.cf.cls):''}</div><div class="rs">${rs}</div><div class="rr">${fill(SWAP_RESULT,{sets:f1(s.r.eff),zone:ZL[s.r.zone],day:WD[SI.main.days[0]],level:s.dayF||'–'})}</div></div>${fxBtn(s)}</div>`};
  // vol16a: the engine's own swap suggestions get the SAME checked reasons as the main-lift ideas; a row with no passing reason is dropped
  const sugSw=MF.swaps.map(f=>{const o=f.ops.find(q=>q.op==='swap');const R=swapReasons(dt,m,o.from_id,o.to_id);if(!R.lines.length)return '';f.label=`Swap ${EXN(o.from_id)} → ${EXN(o.to_id)}`;const b=fcls(dt,o.to_id);
    const stp=P.stretch.share!=null&&f.r.stretch!=null&&Math.abs(f.r.stretch-P.stretch.share)>1e-9?` · stretch share ${pc(P.stretch.share)} → ${pc(f.r.stretch)}`:'';
    const rs=R.lines.map(k=>fill(SWAP_REASONS[k],{muscle:mu,from:R.from?R.from.cls:'',to:R.to?R.to.cls:''})).join(' ');
    return `<p class="sub fa-swfor">For ${esc(EXN(o.from_id))}</p><div class="row"><span class="gl ${dt.EX[o.to_id].type}" aria-hidden="true">${GLY[dt.EX[o.to_id].type]}</span><div class="grow"><div class="t1">${esc(EXN(o.to_id))} ${b?ftag(b.cls):''}</div><div class="rs">${rs}</div><div class="rr">→ ${f1(f.r.eff)} sets, ${ZL[f.r.zone]} · ${WD[o.day]} fatigue ${dayLevel(dt,applyL(d,f.ops).find(D=>D.day===o.day),lv)||'–'}${stp}</div></div>${fxBtn(f)}</div>`}).join('');
  if((SI&&SI.shown.length)||sugSw){h+=`<div class="card fa-c" id="deepdive-${m}-swaps"><div class="ch"><h2>Swap ideas</h2></div>`+(SI&&SI.shown.length?`<p class="sub">For ${esc(SI.main.name)}, your main ${mu} lift</p>`+SI.shown.map(swRow).join('')+(SI.carried?`<p class="note">${esc(SI.carried)}</p>`:''):'')+sugSw+`</div>`}
  // stretch share (only the 8 stretch-list muscles)
  const STRB=(dt.rules.stretch_biased||{})[m];
  if(STRB&&P.stretch.share!=null){const thr=dt.targets.analytics.stretch_share_flag_below,sh=P.stretch.share,sl=contrib.filter(c=>STRB.includes(c.id));
    h+=`<div class="card fa-c" id="deepdive-${m}-stretch"><div class="ch"><h2>Stretch share</h2><small>${pc(sh)} of sets</small></div><div class="str" role="img" aria-label="Stretch share ${pc(sh)}, guideline ${pc(thr)}"><i style="width:${Math.min(100,sh*100)}%"></i><span class="gd" style="left:${thr*100}%"></span><span class="gt" style="left:${thr*100}%">Guideline ${pc(thr)}</span></div>
     <p class="read">${pc(sh)} of ${mu} sets are stretch-biased${sl.length?` (${sl.map(c=>esc(c.disp)).join(', ')})`:''}, ${sh>=thr?'at or above':'below'} the ${pc(thr)} guideline.</p><p class="src">${P.stretch.checked?'Checked for '+mu:'Measure only for '+mu} (Modeled).</p></div>`}
  // one-side share, with the exercise names
  if(P.one_side_share>0){const uni=contrib.filter(c=>((dt.EX[c.id].swap||{}).flags||[]).includes('unilateral'));h+=`<div class="card fa-c fa-one"><div class="ch"><h2>One side at a time</h2><small>${pc(P.one_side_share)} of sets</small></div><span class="tr" role="img" aria-label="${pc(P.one_side_share)} one side at a time"><i style="width:${Math.min(100,P.one_side_share*100)}%"></i></span><p class="read">${pc(P.one_side_share)} of ${mu} sets are one side at a time${uni.length?`: ${uni.map(c=>esc(c.disp)).join(', ')}`:''}.</p></div>`}
  // Nurd Sh!t
  const N=(NURD||{})[m];if(N){h+=`<div class="card fa-c"><div class="ch"><h2>Nurd Sh!t</h2><small>articles</small></div>${N.note?`<p class="sub">${esc(N.note)}</p>`:''}<div class="nl">`+N.links.map(l=>`<button class="nla" data-fa="nurd" data-k="${l.kind}" data-id="${l.id}"><span class="grow"><span class="k">${l.kind==='muscle'?'Muscle':'Fundamental'}</span><b>${esc(l.title)}</b>${l.sublabel?`<small>${esc(l.sublabel)}</small>`:''}</span><span class="cv" aria-hidden="true">›</span></button>`).join('')+`</div>`+
    ((ev.sources||[]).length?`<div class="cit"><h3>Citations</h3>`+ev.sources.map(s=>`<p>${esc(s.cite)}. ${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url.replace('https://doi.org/','doi:'))}</a>`:''}</p>`).join('')+`</div>`:'')+`</div>`}
  // how it's counted (collapsed)
  const mc=(dt.targets.curve.modeling_choices||[]).filter(q=>!/^Exponential saturating/.test(q.item)),cr=dt.VM.credit,sd=dt.targets.curve.session_discount||{};
  h+=`<details class="fa-how"><summary>How it's counted</summary><div class="bd"><p><code>effective = rating × sets</code> per exercise; ratings under ${dt.targets.counting.min_rating_to_count} count as 0. ${esc(cr.formula.replace(/^effective\(set, muscle\) = /,'Credit: '))}.</p>${sd.cap?`<p>Sets past ${sd.cap} for a muscle in one session count at ${sd.factor*100}%.</p>`:''}<p>The curve rises to the minimum (①, 60%), through the sweet spot (②, 76–86%) to the diminishing point (③, 89%), then flattens. Values are a share of this muscle's modeled plateau. Calibrated to Schoenfeld 2017 and Pelland 2026.</p>${STRB?'':`<p>${esc(ML(m))} has no stretch list, so stretch share isn't tracked for it.</p>`}<p>Modeling choices:</p><ul>${mc.map(q=>`<li>${esc(q.item)}: ${esc(q.rationale)}</li>`).join('')}</ul></div></details><p class="fa-foot">Suggestions come from the plan engine; swaps are ranked by its score, staples first. Every number is Modeled from Coach's data.</p></div>`;
  return h}

// ---------- Full analysis page ----------
const GROUPS={All:null,Push:['chest','front_delts','side_delts','triceps'],Pull:['lats','upper_back','rear_delts','traps','biceps','forearms'],Legs:['quads','hamstrings','glutes','calves','adductors','abductors'],Arms:['biceps','triceps','forearms'],Core:['abs','obliques','lower_back']};
const ST={sel:null,grp:'All',open:{}};
const goalKey=()=>{try{return GOALS.mode==='efficient'?'efficient':'max_growth'}catch(e){return 'max_growth'}};
// typical range = p25–p75 of this muscle's weekly credited sets across Coach's preset routines at your level (day-metrics-presets.json)
function typical(dt,lv,m){const P=((dt.DMP||{}).presets||{})[goalKey()]||{},v=[];for(const k in P){if(k.split('/')[1]!==lv)continue;let s=0;for(const D of P[k].days||[])for(const e of D.exercises||[])s+=((e.stimulus_by_muscle||{})[m]||0);v.push(s)}
  if(v.length<4)return null;v.sort((a,b)=>a-b);const q=p=>{const i=(v.length-1)*p,lo=Math.floor(i);return v[lo]+(v[Math.min(lo+1,v.length-1)]-v[lo])*(i-lo)};return [q(.25),q(.75)]}
const loggedWeeks=()=>Object.keys(loggedByWeek(RD())).length;
// after 4 logged weeks the band is the user's own: p25–p75 of their last (up to) 8 logged weeks for the muscle
function ownBand(dt,m){const W=loggedByWeek(dt),k=Object.keys(W).sort().slice(-8);if(k.length<4)return null;const v=k.map(x=>(W[x]||{})[m]||0).sort((a,b)=>a-b);const q=p=>{const i=(v.length-1)*p,lo=Math.floor(i);return v[lo]+(v[Math.min(lo+1,v.length-1)]-v[lo])*(i-lo)};return [q(.25),q(.75)]}
function faHtml(){const dt=RD(),d=DAYS(),lv=LV(),A=PC().analytics(dt,d,lv),MU=Object.keys(A.muscles),x=m=>weekX(A,m);
  if(!ST.sel&&window.BOARD.MSEL&&A.muscles[window.BOARD.MSEL])ST.sel=window.BOARD.MSEL;if(!ST.sel||!A.muscles[ST.sel])ST.sel=MU.slice().sort((a,b)=>(A.muscles[b].min||0)-(A.muscles[a].min||0)||x(b)-x(a))[0]||'chest';const m=ST.sel,wk=zoneW(dt,lv,m,x(m));
  let h=appliedBar()+`<div class="fa">`;
  // map card
  h+=`<div class="card fa-c" id="fa-map"><div class="ch"><h2>This week on your body</h2><small>tap a muscle</small></div><div class="fa-maps">${X.map('front',{},{})}${X.map('back',{},{})}</div>${MR().legend('weekly')}
   <div class="mapsel"><span class="mv"><b>${esc(ML(m))}</b> · ${f1(x(m))} sets · ${esc(ZL[wk.zone])}</span><button class="chip ddchip" data-fa="deep" data-m="${m}">${esc(ML(m))} › deep dive</button></div></div>`;
  // weekly volume: one chart for the selected muscle, the muscle list is its selector
  const S=diveOf(dt,d,lv,m),XM=Math.max(30,Math.ceil(((MR().weeklyBp(dt,lv,m)||{}).red||25)*1.12));
  h+=`<div class="card fa-c" id="fa-vol"><div class="ch"><h2>Weekly volume</h2><small>${esc(ML(m))} · ${f1(x(m))} sets</small></div><div class="fa-cv" data-fa="pdot" data-m="${m}" role="button" aria-label="${esc(ML(m))} on the curve, show fixes">${curveSvg(dt,lv,m,S.curve,S.sets,XM)}</div>
   <div class="chips fa-grp">${Object.keys(GROUPS).map(g=>`<button class="chip${ST.grp===g?' on':''}" data-fa="grp" data-g="${g}" aria-pressed="${ST.grp===g}">${g}</button>`).join('')}</div><p class="tip">Tap a muscle to show its chart · › opens its deep dive</p><div class="fa-list">`+
   MU.filter(k=>!GROUPS[ST.grp]||GROUPS[ST.grp].includes(k)).map(k=>{const a=A.muscles[k],z=zoneW(dt,lv,k,x(k)),mx=Math.max(a.max||20,x(k))*1.15,sw=(a.zones||{}).sweet;
     return `<div class="fa-mr${k===m?' on':''}"><button class="fa-ms" data-fa="sel" data-m="${k}" aria-pressed="${k===m}"><span class="nm">${esc(ML(k))}</span><span class="vb">${sw?`<i class="sw" style="left:${sw[0]/mx*100}%;width:${(sw[1]-sw[0])/mx*100}%"></i>`:''}<i class="v" style="width:${Math.min(100,x(k)/mx*100)}%;background:${z.hex}"></i></span><span class="num">${f1(x(k))}</span></button><button class="fa-go" data-fa="deep" data-m="${k}" aria-label="${esc(ML(k))} deep dive">›</button></div>`}).join('')+`</div></div>`;
  // muscle × day grid (cells tappable; the day-count column is not)
  const LD=d.filter(D=>D.tiles.length),eff=LD.map(D=>PC().eff(dt,tiles0(D))),dly=LD.map(D=>MR().daily(dt,tiles0(D))),FM=FMIN(dt);
  const GM=MU.filter(k=>eff.some(e=>(e[k]||0)>0));
  h+=`<div class="card fa-c" id="fa-grid"><div class="ch"><h2>Muscle × day</h2><small>colour = that day's band</small></div><table class="fa-gt"><thead><tr><th></th>${LD.map(D=>`<th>${WD[D.day]}</th>`).join('')}<th>days</th></tr></thead><tbody>`+
   GM.map(k=>`<tr><th scope="row">${esc(ML(k))}</th>${LD.map((D,i)=>{const v=eff[i][k]||0,c=dly[i][k];return v>0?`<td><button class="fa-cell" data-fa="pcell" data-m="${k}" data-day="${D.day}" style="background:${c.hex};color:${fgOn(c.hex)}" aria-label="${esc(ML(k))} ${WDL[D.day]} ${f1(v)} sets">${f1(v)}</button></td>`:`<td class="z">·</td>`}).join('')}<td class="dc">${eff.filter(e=>(e[k]||0)>=FM).length}</td></tr>`).join('')+`</tbody></table></div>`;
  // fatigue by day + session length
  const fv=LD.map(D=>dayVal(dt,D,lv)),fmax=Math.max(30,...fv);
  h+=`<div class="card fa-c" id="fa-fatigue"><div class="ch"><h2>Fatigue by day</h2><small>per workout</small></div><div class="fa-fat">`+LD.map((D,i)=>{const L=dayLevel(dt,D,lv),c=FDAY[L]||FDAY.Normal;
     return `<button class="fb" data-fa="pfat" data-day="${D.day}" aria-label="${WDL[D.day]} fatigue ${L}"><span class="lv">${L}</span><span class="bw"><i style="height:${Math.max(6,fv[i]/fmax*100)}%;background:${c[0]}"></i></span><span class="dy">${WD[D.day]}</span><span class="mn">~${mins(dt,D,lv)} min est.</span></button>`}).join('')+`</div></div>`;
  // this week vs normal (not tappable until 4 weeks are logged)
  const OWN=loggedWeeks()>=4,VM=MU.filter(k=>(A.muscles[k].min||0)>0).map(k=>({k,t:OWN?ownBand(dt,k):typical(dt,lv,k)})).filter(o=>o.t);const tapV=OWN,BANDL=OWN?'your usual (last weeks logged)':'typical for preset plans';
  if(VM.length){const vx=Math.max(...VM.map(o=>Math.max(o.t[1],x(o.k))))*1.1;
   h+=`<div class="card fa-c" id="fa-vsn"><div class="ch"><h2>This week vs normal</h2><small>${OWN?'vs your usual':'vs preset plans'}</small></div>`+VM.map(({k,t})=>{const v=x(k),dl=v<t[0]?v-t[0]:v>t[1]?v-t[1]:0;
     return `<div class="vr${tapV?' tap':''}"${tapV?` data-fa="pvsn" data-m="${k}" role="button"`:''}><span class="nm">${esc(ML(k))}</span><span class="vb"><i class="tb" style="left:${t[0]/vx*100}%;width:${Math.max(1,(t[1]-t[0])/vx*100)}%"></i><i class="tk" style="left:${v/vx*100}%"></i></span><span class="dl num">${f1(Math.abs(dl))==='0'?'typical':(dl>0?'+':'−')+f1(Math.abs(dl))}</span></div>`}).join('')+
     `<div class="k"><span><i class="tbk"></i>${BANDL}</span><span><i class="tkk"></i>this week</span></div><p class="src">${OWN?`Band = middle half of your last ${Math.min(8,loggedWeeks())} logged weeks.`:`Band = middle half of Coach's ${lv} preset plans. After 4 logged weeks it switches to your own usual weeks and the rows open.`}</p></div>`}
  // collapsed rows: sources, balance, flags
  const det=(id,t,sub,body)=>`<details class="fa-x" data-x="${id}"${ST.open[id]?' open':''}><summary><span class="g"><b>${t}</b><small>${sub}</small></span><span class="cv" aria-hidden="true">›</span></summary><div class="bd">${body}</div></details>`;
  const src=MU.filter(k=>x(k)>0&&(A.muscles[k].min||0)>0).map(k=>{const P=diveOf(dt,d,lv,k);let dir=0,hel=0;for(const c of P.contributors){const e=dt.EX[c.id],r=e.muscles[k]||0,mx=Math.max(...Object.values(e.muscles));if(r>=0.75||r===mx)dir+=c.effective_sets;else hel+=c.effective_sets}const t=dir+hel||1;
    return `<button class="sr" data-fa="psrc" data-m="${k}"><span class="nm">${esc(ML(k))}</span><span class="sb"><i class="d" style="width:${dir/t*100}%"></i><i class="h" style="width:${hel/t*100}%"></i></span><span class="num">${f1(dir)} + ${f1(hel)}</span></button>`}).join('');
  h+=det('src','Where your sets come from','Direct work vs helper sets from compounds',`<div class="k"><span><i class="dk"></i>direct</span><span><i class="hk"></i>helper</span></div>${src}`);
  const M=AN().metrics(dt,d,lv),pp=(()=>{try{const it=AN().items(dt,d,lv,null).find(i=>i.id==='push_pull_ratio');return it&&it.value}catch(e){return null}})(),MPL=(dt.rules.movement_patterns||{}).labels||{},mps=M.movement_pattern_sets||{},mpx=Math.max(1,...Object.values(mps));
  const thr=dt.targets.analytics.stretch_share_flag_below,STRB=dt.rules.stretch_biased||{};
  const fmix={Low:0,Normal:0,High:0};for(const D of LD)for(const t of D.tiles){const c=fcls(dt,t.id);if(c)fmix[c.cls]+=t.sets}const ftot=fmix.Low+fmix.Normal+fmix.High||1;
  let bal='';
  if(pp)bal+=`<div class="bl1"><h3>Pull : push</h3><div class="pp"><i class="pu" style="width:${pp.pull_sets/(pp.pull_sets+pp.push_sets)*100}%"></i><i class="pu2" style="width:${pp.push_sets/(pp.pull_sets+pp.push_sets)*100}%"></i></div><p class="sub">${pp.pull_sets} pull · ${pp.push_sets} push sets · ratio ${pp.pull_to_push}</p></div>`;
  bal+=`<div class="bl1"><h3>Movement patterns</h3>`+Object.entries(mps).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="mpr"><span class="nm">${esc(MPL[k]||k.replace(/_/g,' '))}</span><span class="vb"><i style="width:${v/mpx*100}%"></i></span><span class="num">${f1(v)}</span></div>`).join('')+`</div>`;
  bal+=`<div class="bl1"><h3>Stretch share</h3>`+Object.keys(STRB).filter(k=>(M.stretch_biased_share||{})[k]!=null).map(k=>{const v=M.stretch_biased_share[k];return `<button class="mpr st" data-fa="pstr" data-m="${k}"><span class="nm">${esc(ML(k))}</span><span class="vb"><i style="width:${v*100}%"></i><span class="gd" style="left:${thr*100}%"></span></span><span class="num">${pc(v)}</span></button>`}).join('')+`<p class="sub">Line = Guideline ${pc(thr)}, stretch-list muscles only.</p></div>`;
  bal+=`<div class="bl1"><h3>One side at a time</h3><div class="mpr"><span class="nm">Unilateral sets</span><span class="vb"><i style="width:${(M.unilateral_share||0)*100}%"></i></span><span class="num">${pc(M.unilateral_share||0)}</span></div></div>`;
  bal+=`<div class="bl1"><h3>Fatigue mix <small>per set, Modeled</small></h3><div class="pp">${['Low','Normal','High'].map(c=>`<i style="width:${fmix[c]/ftot*100}%;background:${FTAG[c][0]}"></i>`).join('')}</div><p class="sub">${['Low','Normal','High'].map(c=>`${c} ${fmix[c]}`).join(' · ')} sets</p></div>`;
  h+=det('balance','Balance','Pull:push, patterns, stretch, one-side, fatigue mix',bal);
  const FL=window.BOARD.flags14(),cp=M.checks_pass||{},nfix=FL.filter(f=>f.sev>=2).length,nnote=FL.filter(f=>f.sev<2).length;
  h+=det('flags','All flags',`${cp.pass||0} ✓ passing · ${nfix} ! to fix · ${nnote} ⓘ notes`,FL.map(f=>`<button class="fr" data-fa="pflag" data-id="${esc(f.id)}"><span class="ic s${f.sev}" aria-hidden="true">${f.sev>=2?'!':'ⓘ'}</span><span class="t">${esc(f.short||f.text)}</span><span class="cv" aria-hidden="true">›</span></button>`).join('')||'<p class="sub">No flags.</p>');
  return h+`</div>`}
function paintMaps(root){if(!root)return;const dt=RD(),d=DAYS(),lv=LV(),A=PC().analytics(dt,d,lv);
  $$('.fa-maps .mp',root).forEach(p=>{const k=p.dataset.mu;p.style.fill=A.muscles[k]?zoneW(dt,lv,k,weekX(A,k)).hex:'var(--map-off)';p.classList.toggle('msel',k===ST.sel);p.setAttribute('data-fa','sel');p.setAttribute('data-m',k)});
  $$('.fa-maps .mp.msel',root).forEach(p=>p.parentNode.appendChild(p))}   // selected outline drawn on top

// ---------- tap panels (Coach's table): insight + at most 2 fixes, each passing the no-new-flag check ----------
const moveFix=f=>({ops:f.ops,label:`Move ${EXN(f.t.id)} (${f.t.sets} sets) ${WD[f.from]} → ${WD[f.to]}`,sub:`${WD[f.from]} ${f.lvFrom0} → ${f.lvFrom1||'Rest'} · ${WD[f.to]} ${f.lvTo0} → ${f.lvTo1}`});
const mfList=MF=>[MF.combo,...MF.singles].filter(Boolean).slice(0,2).map(f=>({ops:f.ops,label:f.preview,sub:`→ ${f1(f.r.eff)} sets, ${ZL[f.r.zone]}`}));
const MOVE_NONE=mu=>`No move passes every check: the new day stays below High, ${mu} gets no new back to back days, and no muscle drops under its minimum.`;
function panelData(kind,a){const dt=RD(),d=DAYS(),lv=LV(),A=PC().analytics(dt,d,lv),m=a.m,mu=m&&mlow(m);
  if(kind==='pdot'){const P=diveOf(dt,d,lv,m),x=P.sets.effective,z=zoneW(dt,lv,m,x).zone;const fx=mfList(muscleFixes(dt,d,lv,m,P));
    return {title:ML(m),insight:`${f1(x)} sets this week, ${ZL[z]}. Minimum ${P.sets.level_min}, top of the range ${P.sets.max}. The next set adds about ${pc(P.curve.next_set)} (Modeled).`+(fx.length?'':` Nothing to change here.`),fixes:fx}}
  if(kind==='pcell'){const D=d.find(q=>q.day===a.day),v=(PC().eff(dt,tiles0(D))[m])||0,c=MR().daily(dt,tiles0(D))[m]||{zone:'grey'};
    const prob=['yellow','red'].includes(c.zone)||dayLevel(dt,D,lv)==='High'||dayLevel(dt,D,lv)==='Extreme',mv=prob?moveFixes(dt,d,lv,m,a.day,2):moveFixes(dt,d,lv,m,a.day,2,null,true);
    const hd=hitDays(dt,d,m);let ins=`${ML(m)} on ${WDL[a.day]}: ${f1(v)} sets, ${ZL[c.zone]} for one session. ${ML(m)} trains on ${spacingLine(hd)}.`;
    if(!mv.length)ins+=' '+(prob?MOVE_NONE(mu):'Nothing to change.');return {title:`${ML(m)} · ${WDL[a.day]}`,insight:ins,fixes:mv.map(moveFix)}}
  if(kind==='pfat'){const D=d.find(q=>q.day===a.day),L=dayLevel(dt,D,lv);let mv=[];
    if(FLV.indexOf(L)>=FLV.indexOf('Extra')){const tl=D.tiles.map(t=>({t,f:(fcls(dt,t.id)||{per_set:1}).per_set*t.sets})).sort((p,q)=>q.f-p.f).slice(0,3);
      for(const {t} of tl){const e=dt.EX[t.id],pm=Object.keys(e.muscles).sort((p,q)=>e.muscles[q]-e.muscles[p])[0];mv=mv.concat(moveFixes(dt,d,lv,pm,a.day,2,t.id))}
      mv.sort((p,q)=>p.even-q.even||p.peak-q.peak);mv=mv.filter((o,i)=>mv.findIndex(q=>q.t.id===o.t.id&&q.to===o.to)===i).slice(0,2)}
    let ins=`${WDL[a.day]}: ${L} fatigue, ~${mins(dt,D,lv)} min est.`+(FLV.indexOf(L)<FLV.indexOf('Extra')?' Nothing to change.':mv.length?'':' No move passes every check: the new day stays below High, no new back to back days, and no muscle drops under its minimum.');
    return {title:`Fatigue · ${WDL[a.day]}`,insight:ins,fixes:mv.map(moveFix)}}
  if(kind==='psrc'){const P=diveOf(dt,d,lv,m);const dir=[],hel=[];for(const c of P.contributors){const e=dt.EX[c.id],r=e.muscles[m]||0,mx=Math.max(...Object.values(e.muscles));(r>=0.75||r===mx?dir:hel).push(c)}
    const s=L=>L.reduce((q,c)=>q+c.effective_sets,0);const fx=mfList(muscleFixes(dt,d,lv,m,P));
    return {title:`${ML(m)} · where the sets come from`,insight:`${f1(s(dir))} direct sets${dir.length?` (${dir.map(c=>EXN(c.id)).join(', ')})`:''} and ${f1(s(hel))} helper sets${hel.length?` from ${hel.map(c=>EXN(c.id)).join(', ')}`:''}.`,fixes:fx}}
  if(kind==='pstr'){const P=diveOf(dt,d,lv,m),thr=dt.targets.analytics.stretch_share_flag_below,sh=P.stretch.share||0;
    const contrib=P.contributors.map(c=>({...c,disp:EXN(c.id)}));const SI=sh<thr?swapIdeas(dt,d,lv,m,contrib):null;
    const fx=SI?SI.shown.filter(s=>s.reasons.includes('stretch')).slice(0,2).map(s=>({ops:s.ops,label:`Swap ${EXN(SI.main.id)} → ${EXN(s.id)}`,sub:`→ stretch share ${pc(s.r.stretch||0)} · ${f1(s.r.eff)} sets, ${ZL[s.r.zone]}`})):[];
    return {title:`${ML(m)} · stretch share`,insight:`${pc(sh)} of ${mu} sets are stretch-biased. Guideline ${pc(thr)}.`+(sh>=thr?' At or above the guideline.':fx.length?'':' No stretch swap passes every check.'),fixes:fx}}
  if(kind==='pflag'||kind==='pmflags'){const FL=window.BOARD.flags14();const list=kind==='pflag'?FL.filter(f=>f.id===a.id):FL.filter(f=>f.muscle===m&&f.sev>=2);let fixes=[];
    for(const f of list){if(fixes.length>=2)break;const fm=f.muscle;
      if(f.fix&&f.fix.ops){let ok=true;try{ok=!newFlags(dt,d,applyL(d,f.fix.ops),lv).add.length}catch(e){ok=false}if(ok)fixes.push({ops:f.fix.ops,label:f.fix.label||f.fix.preview||'Fix',sub:''})}
      else if(fm&&(f.kind==='low_frequency'||f.kind==='recovery_gap_long')){const E=effByDay(dt,d,fm),top=ORD.filter(x=>E[x]).sort((p,q)=>E[q]-E[p])[0];if(top)fixes=fixes.concat(moveFixes(dt,d,lv,fm,top,2,null,true).map(moveFix));if(fixes.length<2){const h0=hitDays(dt,d,fm).length,MF=muscleFixes(dt,d,lv,fm);fixes=fixes.concat([MF.combo,...MF.singles].filter(f=>f&&f.r.days_hit>h0).map(f=>({ops:f.ops,label:f.preview,sub:`→ ${f1(f.r.eff)} sets over ${f.r.days_hit} days, ${ZL[f.r.zone]}`})))}}
      else if(fm)fixes=fixes.concat(mfList(muscleFixes(dt,d,lv,fm)))}
    fixes=fixes.slice(0,2);const t=list.map(f=>f.text).join(' ');
    return {title:kind==='pflag'?'Flag':`${ML(m)} · to fix`,insight:(t||'This flag is fixed.')+(list.length&&!fixes.length?' No change passes every check yet.':''),fixes}}
  if(kind==='pvsn'){const t=ownBand(dt,m)||typical(dt,lv,m),x=weekX(A,m);return {title:`${ML(m)} vs normal`,insight:`${f1(x)} sets this week; your usual weeks give ${f1(t[0])}–${f1(t[1])}.`,fixes:[]}}
  return {title:'',insight:'',fixes:[]}}
function panelHtml(kind,a){const P=panelData(kind,a);return {title:P.title,body:appliedBar()+`<div class="fa-pn"><p class="ins">${esc(P.insight)}</p>`+P.fixes.map(f=>`<div class="row"><div class="grow"><div class="t1">${esc(f.label)}</div>${f.sub?`<div class="t2">${esc(f.sub)}</div>`:''}</div>${fxBtn(f,'acc')}</div>`).join('')+`</div>`}}
// ---------- sheets ----------
const OPEN={fa:null,dd:null,pn:null};let RQ=0;
const keepScroll=(api,fn)=>{const y=api.body.scrollTop;fn();api.body.scrollTop=y};
function fixChip(n,act,m){return n?`<button class="chip fixchip" data-fa="${act}"${m?` data-m="${m}"`:''}>${n} to fix ›</button>`:''}
function renderFA(){const o=OPEN.fa;if(!o||o.closed)return;keepScroll(o,()=>{o.body.innerHTML=faHtml();paintMaps(o.body)});const n=window.BOARD.flags14().filter(f=>f.sev>=2).length;o.el.querySelector('.sh-head .r').innerHTML=fixChip(n,'tofix')}
function renderDD(){const o=OPEN.dd;if(!o||o.closed)return;keepScroll(o,()=>{o.body.innerHTML=deepHtml(o.m)});const n=window.BOARD.flags14().filter(f=>f.muscle===o.m&&f.sev>=2).length;o.el.querySelector('.sh-head .r').innerHTML=fixChip(n,'mflags',o.m)}
function renderPN(){const o=OPEN.pn;if(!o||o.closed)return;const P=panelHtml(o.kind,o.a);keepScroll(o,()=>{o.body.innerHTML=P.body})}
function rerender(){FX.clear();renderFA();renderDD();renderPN()}
const BACK='<button class="btn plain fa-back" data-fa="close" aria-label="Back">‹</button>';
function open(opts){opts=opts||{};if(!OPEN.fa||OPEN.fa.closed){OPEN.fa=X.sheet({title:'Full analysis',cls:'tall grouped fa-sheet',left:BACK,right:'',onClose(){OPEN.fa=null;if(!OPEN.dd&&!OPEN.pn)APPL.length=0}});OPEN.fa.el.dataset.fa='fa';requestAnimationFrame(()=>OPEN.fa&&OPEN.fa.wrap.classList.add('open'))}
  if(opts.open)ST.open[opts.open]=true;if(opts.m)ST.sel=opts.m;renderFA();
  if(opts.section){const el=OPEN.fa.body.querySelector('#fa-'+opts.section)||OPEN.fa.body.querySelector(`[data-x="${opts.section}"]`);if(el)setTimeout(()=>el.scrollIntoView({block:'start'}),30)}
  if(opts.panel){const dt=RD(),d=DAYS(),lv=LV();let a={m:ST.sel};if(opts.panel==='grid'){const A=PC().analytics(dt,d,lv);let best=null;for(const D of d)for(const [k,v] of Object.entries(PC().eff(dt,tiles0(D)))){if(v<=0||!A.muscles[k])continue;const n=moveFixes(dt,d,lv,k,D.day,2).length;const sc=[n?1:0,(MR().daily(dt,tiles0(D))[k]||{}).zone==='yellow'?1:0,v];if(!best||sc[0]>best.sc[0]||(sc[0]===best.sc[0]&&(sc[1]>best.sc[1]||(sc[1]===best.sc[1]&&sc[2]>best.sc[2]))))best={sc,k,day:D.day}}
      if(best)a={m:best.k,day:best.day};panel('pcell',a)}else panel(opts.panel==='dot'?'pdot':opts.panel,a)}
  return OPEN.fa}
function deep(m,anchor){if(OPEN.dd&&!OPEN.dd.closed)OPEN.dd.close();ST.sel=m;OPEN.dd=X.sheet({title:ML(m),cls:'tall grouped fa-sheet fa-ddsheet',left:BACK,right:'',onClose(){OPEN.dd=null;if(OPEN.fa)renderFA()}});OPEN.dd.m=m;OPEN.dd.el.dataset.fa='dd';
  requestAnimationFrame(()=>OPEN.dd&&OPEN.dd.wrap.classList.add('open'));renderDD();if(anchor){const el=OPEN.dd.body.querySelector('#'+CSS.escape(anchor));if(el)setTimeout(()=>el.scrollIntoView({block:'start'}),30)}return OPEN.dd}
function panel(kind,a){if(OPEN.pn&&!OPEN.pn.closed)OPEN.pn.close();const P=panelHtml(kind,a);OPEN.pn=X.sheet({title:P.title,cls:'fa-panel',right:'<button class="btn plain" data-fa="close">Done</button>',body:P.body,onClose(){OPEN.pn=null}});OPEN.pn.kind=kind;OPEN.pn.a=a;
  requestAnimationFrame(()=>OPEN.pn&&OPEN.pn.wrap.classList.add('open'));return OPEN.pn}
function refresh(){if(!(OPEN.fa||OPEN.dd||OPEN.pn))return;cancelAnimationFrame(RQ);RQ=requestAnimationFrame(rerender)}
const sheetOfEl=el=>{const s=el.closest('.sheet');return s&&[OPEN.pn,OPEN.dd,OPEN.fa].find(o=>o&&o.el===s)};
document.addEventListener('click',e=>{const b=e.target.closest('[data-fa]');if(!b||!b.closest('.sheet'))return;const k=b.dataset.fa;if(k==='fa'||k==='dd')return;const host=sheetOfEl(b);e.preventDefault();
  if(k==='close'){if(host)host.close();return}
  if(k==='apply')return doApply(b.dataset.i);if(k==='undo')return doUndo(+b.dataset.i);
  if(k==='sel'){ST.sel=b.dataset.m;return renderFA()}
  if(k==='grp'){ST.grp=b.dataset.g;return renderFA()}
  if(k==='deep')return deep(b.dataset.m);
  if(k==='tofix'){ST.open.flags=true;renderFA();const el=OPEN.fa.body.querySelector('[data-x="flags"]');if(el)el.scrollIntoView({block:'start'});return}
  if(k==='mflags')return panel('pmflags',{m:b.dataset.m});
  if(k==='evb'){const n=host&&host.body.querySelector('#fa-evn');if(n){n.classList.toggle('on');b.setAttribute('aria-expanded',n.classList.contains('on'))}return}
  if(k==='remove'){const id=b.dataset.id,day=b.dataset.day;FX.set(++FXN,{ops:[{op:'remove',day,id}],label:`Remove ${EXN(id)} from ${WD[day]}`});return doApply(FXN)}
  if(k==='nurd'){const go=b.dataset.k==='muscle'?'#learn-'+b.dataset.id:'#learn-f-'+b.dataset.id;X.closeAll&&X.closeAll();OPEN.fa=OPEN.dd=OPEN.pn=null;APPL.length=0;return X.go(go)}
  if(/^p(dot|cell|fat|src|str|flag|vsn)$/.test(k))return panel(k,{m:b.dataset.m,day:b.dataset.day,id:b.dataset.id})},true);
document.addEventListener('toggle',e=>{const d=e.target;if(d.matches&&d.matches('details.fa-x'))ST.open[d.dataset.x]=d.open},true);
window.FA={open,deep,refresh,panel,_x:{muscleFixes,swapIdeas,moveFixes,newFlags,typical,spacingLine,panelData,faHtml,deepHtml}};
})();
