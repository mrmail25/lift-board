/* Program check + one-tap fixes + planning analytics for the Build whiteboard.
   check()/fixes(): line-for-line port of Coach's tools/check_program.py (check, fixes, evaluate, the g_* generators)
   and tools/patterns.py g_fill_slot. Flags are the same tuples as Python: [sev, rule, ...args].
   analytics(): the old app's analytics.js / check.js maths (targets.json curve, session_discount, recovery fatigue cost,
   analytics.frequency_min_effective, rules.json session_length + spinal_load). Every threshold comes from the data.
   Parity: node test/progcheck.diff.js (vs check_program.py). Browser: window.PCHECK; node: module.exports. */
(function(root){'use strict';
// vol15 adapter: rules.staples is now per muscle {m:[ids]}; the whole-library list is rules.staples_flat (Coach keeps it)
const stFlat=R=>Array.isArray(R.staples)?R.staples:(R.staples_flat||[]);
const RANK=typeof module!=='undefined'&&module.exports?require('./rank.js'):root.RANK;
const pyR=RANK.pyRound,ORDER=['mon','tue','wed','thu','fri','sat','sun'];
const cmpT=(a,b)=>{for(let k=0;k<a.length;k++){if(a[k]<b[k])return -1;if(a[k]>b[k])return 1}return 0};
const sortBy=(arr,key)=>arr.map((x,i)=>[key(x),i,x]).sort((a,b)=>cmpT(a[0],b[0])||a[1]-b[1]).map(z=>z[2]); // stable, tuple keys
const clone=d=>JSON.parse(JSON.stringify(d));
const fmtPy=(s,p)=>s.replace(/\{(\w+)\}/g,(_,k)=>p[k]);
function ctx(dt){if(dt._pc)return dt._pc;const R=dt.rules,RU={};R.rules.forEach(r=>RU[r.id]=r);
  const TT=dt.targets,HEAVY=new Set([...R.heavy_squats,...R.heavy_hinges]);
  return dt._pc={R,RU,T:TT.targets,S:TT.session.muscles,LF:TT.levelMinFactor,HEAVY,PJ:dt.patterns,MUS:dt.exl.muscles}}
const total=d=>d.tiles.reduce((a,t)=>a+t.sets,0);
// ---- vol2 (Coach's data/volume-model.json = dt.VM; targets.json volume_zones; rules.json session_length.by_level). Without dt.VM the old maths run.
const r05=x=>Math.floor(x*2+0.5)/2,r1=x=>Math.round(x*10)/10;   // vol6: volume-model credit.warnings_rounding 'none' -> zones, colours and warnings use the exact credited total; numbers show at one decimal (shown())
const dRound=(dt,v)=>{const s=((dt.targets||{}).counting||{}).display_round_to;return s?Math.floor(v/s+0.5)*s:v};   // targets.json counting.display_round_to (display-only; Coach's swap records)
const exactWarn=dt=>!dt.VM||!/^none/.test(String((dt.VM.credit||{}).warnings_rounding||'none'));
   // weekly totals round to 0.5 before colouring (targets.json counting.round_to); ships with the new counting
function roleOff(dt,e,r){const C=dt.VM.credit.roles;let mx=0;for(const v of Object.values(e.muscles))if(v>mx)mx=v;return r>=mx-1e-9||r>=0.75?C.prime.rir_offset:r>=0.5?C.secondary.rir_offset:C.minor.rir_offset}
function prox(dt,rir){const T=dt.VM.credit.prox.table;return T[String(Math.max(0,Math.min(6,Math.round(rir))))]}
const plannedRir=(dt,e)=>{const P=dt.VM.credit.planned_rir_default;return P[e.type]!=null?P[e.type]:2};
// credit per set: rating x prox(RIR + role offset); rating < 0.25 counts 0. rir null = planned default (2 compounds, 1 isolation)
function credit(dt,e,m,r,rir){if(!(r>=0.25))return 0;if(!dt.VM)return r;const q=rir==null?plannedRir(dt,e):rir;return r*prox(dt,q+roleOff(dt,e,r))}
// zones {min, sweet:[lo,hi], diminishing} for one muscle at one level (targets.json volume_zones), else the old band
function zones(dt,m,level){const Z=dt.targets.volume_zones,z=Z&&Z[level]&&Z[level][m];if(z)return z;const T=dt.targets.targets[m],LF=dt.targets.levelMinFactor;return {min:pyR(T.min*LF[level]*2)/2,sweet:null,diminishing:T.max}}
// curve: x <= D: sqrt(x/D)/1.1; x > D: (1 + 0.1(1 - exp(-(x-D)/(0.2D))))/1.1 (volume-model.json curve.params); no k_by_muscle
function stim(dt,m,level,x){const z=zones(dt,m,level),D=z.diminishing,CV=dt.VM.curve||{},p=CV.params||{};x=Math.max(0,x);
  // vol8g (spec §11): per-muscle anchored curve from curve.per_muscle[m].params (same for every level). 0..min log segment,
  // min..D quadratic pieces [xa,xb,za,sa,curv], past D exponential approach to the plateau. Muscles without an entry fall back below.
  const PMc=CV.active==='anchored_per_muscle'&&(CV.per_muscle||{})[m];
  // vol8i: params_by_level[level] + anchors_by_level[level] (a_min = anchors_pct[0], may exceed the 0.60 rule-of-thumb min (vol12) where a concave fallback applied)
  const PQ=PMc&&((PMc.params_by_level&&PMc.params_by_level[level])||PMc.params),PA=PMc&&((PMc.anchors_by_level&&PMc.anchors_by_level[level])||PMc.anchors);
  if(PQ&&PA){const q=PQ,A=PA,a1=q.anchors_pct?q.anchors_pct[0]:A.min.pct/100,mn=A.min.sets,Dm=A.dim.sets,a4=q.anchors_pct?q.anchors_pct[3]:A.dim.pct/100;
    if(x<=mn)return a1*Math.log(1+x/q.log_k)/Math.log(1+mn/q.log_k);
    if(x<=Dm){const pc=q.pieces.find(r=>x<=r[1]+1e-12)||q.pieces[q.pieces.length-1],d=x-pc[0];return pc[2]+pc[3]*d+pc[4]*d*d}
    return a4+(q.plateau-a4)*(1-Math.exp(-(x-Dm)/q.tau))}
  if(CV.active==='log'){const c=D*(p.c_frac_of_D!=null?p.c_frac_of_D:1/45),n=p.normaliser||1.1,g=p.plateau_gain!=null?p.plateau_gain:.1,L=Math.log(1+D/c);   // vol5 log: c = D/45
    if(x<=D)return Math.log(1+x/c)/L/n;const tau=0.1*(c+D)*L;return (1+g*(1-Math.exp(-(x-D)/tau)))/n}
  return x<=D?Math.sqrt(x/D)/(p.normaliser||1.1):(1+(p.plateau_gain||.1)*(1-Math.exp(-(x-D)/((p.plateau_tau_frac_of_D||.2)*D))))/(p.normaliser||1.1)}
// vol5 per-session credit (curve.session_discount.smooth): s <= a: s; s > a: a + b ln(1 + (s-a)/b); a = 0.8H, b = 0.4H, H = targets session.muscles[m].heavy
// vol8b per-set model (spec §10): set n in one workout is worth 1/(1+(n-1)/c) (fractional last set pro rata), reset each day (>= 20 h);
// weekly input x_equiv = raw sets that give the same decayed total split evenly over 2 workouts (2 g(x/2) = x_dec, bisection)
// vol9b: session_discount.active is 'none (vol9)' (decay no longer feeds weekly). The per-set era (per-set fatigue/recovery, vol8 flags,
// workout cards, per-set efficiency display) stays on whenever per_set params exist; the weekly input is chosen by face() from curve.input.
const perSet=dt=>!!(dt.VM&&dt.VM.curve.session_discount&&(dt.VM.curve.session_discount.active==='per_set'||(dt.VM.curve.input||{}).vol9));
const face=dt=>!!(dt.VM&&((dt.VM.curve||{}).input||{}).vol9);
// vol8i: decay c per level (rules session_dose.c_by_level, falling back to session.c_by_level, then per_muscle.c = intermediate).
// CUR = the level of the last check/analytics call, used when a caller passes no level.
let CUR='intermediate';const setLevel=l=>{if(l)CUR=l};
const sdRule=dt=>((dt.rules&&dt.rules.rules)||[]).find(r=>r.id==='session_dose')||{};   // vol9: session_dose removed; kept only as an empty fallback
// vol9b (Coach vol9.builder_paths): session limits = rules[id=session_efficiency].limits_by_level[level][muscle]; read from data, never hardcoded
// vol13 (CoS #17): the session limit is strictly greater-than on the shown value: effective sets rounded half-up to 0.1, then > limit
const seOver=(x,L)=>L!=null&&x!=null&&Math.floor(x*10+0.5+1e-9)/10>L;
const seRule=dt=>((dt.rules&&dt.rules.rules)||[]).find(r=>r.id==='session_efficiency')||null;
// vol10 (vol10.builder_paths): the analysis goal. GOAL=null = no goal (vol9 fallback: limits_by_level, no goal targets).
// session limits = rules[id=session_efficiency].limits_by_goal[goal][level][muscle] when a goal is set, else limits_by_level.
let GOAL=null,TONE=null;const setGoal=g=>{GOAL=g||null};const setTone=t=>{TONE=t||null};const getGoal=()=>GOAL;const gOf=g=>g===undefined?GOAL:g;
// vol16a(3) (Coach ruling): every user-facing session warning uses ONE limit (lvLim, below). limits_by_goal[goal] is ONLY the
// Make-more-efficient trim target (trimLim), used by logic/trim.js while TRIMMODE is on; it never drives a warning.
let TRIMMODE=false;const setTrimMode=v=>{TRIMMODE=!!v};
// vol16b (CoS): the ONE warning limit = the Max growth cap, rules[id=session_efficiency].limits_by_goal.max_growth[level][muscle]
// (the cap 'Push for max growth' builds sessions up to; suggestion_buttons.push_for_max_growth.caps). limits_by_level = fallback only.
const lvLim=(dt,m,lv)=>{const r=seRule(dt),L=lv||CUR,G=r&&r.limits_by_goal&&r.limits_by_goal.max_growth&&r.limits_by_goal.max_growth[L],t=G&&G[m]!=null?G:r&&r.limits_by_level&&r.limits_by_level[L];return t&&t[m]!=null?t[m]:null};
const trimLim=(dt,m,lv,g)=>{const r=seRule(dt),L=lv||CUR,G=gOf(g),bg=G&&r&&r.limits_by_goal&&r.limits_by_goal[G],t=bg&&bg[L];return t&&t[m]!=null?t[m]:lvLim(dt,m,L)};
const seLim=(dt,m,lv,g)=>TRIMMODE?trimLim(dt,m,lv,g):lvLim(dt,m,lv);
// weekly targets by goal: rules[id=weekly_volume].targets_by_goal[goal][level][muscle] {min,target,upper}; curve % from volume-model goals[goal].weekly
const goalTarget=(dt,m,lv,g)=>{const G=gOf(g);if(!G)return null;const w=((dt.rules&&dt.rules.rules)||[]).find(r=>r.id==='weekly_volume'),t=w&&w.targets_by_goal&&w.targets_by_goal[G]&&w.targets_by_goal[G][lv||CUR];const o=t&&t[m];if(!o)return null;
  const P=(((((dt.VM||{}).goals||{})[G]||{}).weekly||{})[lv||CUR]||{})[m]||{};return Object.assign({},o,{min_pct:P.min_pct,target_pct:P.target_pct,upper_pct:P.upper_pct})};
const goalsCfg=dt=>(dt.rules&&dt.rules.goals)||null;
// vol10c (rules[id=session_efficiency].exemption): with a goal set (efficient or max_growth; not the vol9 history limits), no
// session_efficiency warning when the muscle has exactly one day with >= single_day_min_eff effective sets AND its weekly effective
// sets (rounded to 0.01) < weekly minimum for the level + near_margin. Show info session_efficiency_single_day instead (never add sets).
const seExm=dt=>{const r=seRule(dt);return r&&r.exemption||null};
const exMin=(dt,m,lv)=>{const T=goalTarget(dt,m,lv);if(T&&T.min!=null)return T.min;return zones(dt,m,lv).min};
function exemptSet(dt,days,lv){const out=new Set(),E=seExm(dt);if(!E||!gOf()||!days)return out;const XW={},XN={};for(const d of days){const v=eff(dt,d.tiles);for(const m in v){XW[m]=(XW[m]||0)+v[m];if(r2u(v[m])>=E.single_day_min_eff)XN[m]=(XN[m]||0)+1}}for(const m in XW)if(exempt(dt,m,lv,XW,XN))out.add(m);return out}
function exempt(dt,m,lv,XW,XN){const E=seExm(dt);if(!E||!gOf())return false;if(XN[m]!==1)return false;return Math.round((XW[m]||0)*100)/100<exMin(dt,m,lv)+(E.near_margin!=null?E.near_margin:1)}
// vol10 wasted late sets (rules[id=wasted_late_sets]): walk the day's tiles in board order; the set that takes the muscle's running
// effective sets past the limit, and every later set for that muscle, are late. Returns [[tile id, late sets, wasted effective sets], …].
function lateSets(dt,tiles,m,limit){let cum=0;const out=[];for(const t of tiles){const e=dt.EX[t.id],r=e&&e.muscles[m]||0;if(!(r>=0.25))continue;const c=credit(dt,e,m,r,t.rir);let n=0,w=0;
  for(let k=0;k<t.sets;k++){const b=cum;cum+=c;if(Math.round(cum*100)/100>limit){n++;w+=cum-Math.max(b,limit)}}if(n)out.push([t.id,n,pyR(w,2)])}return out}
const seEff=(dt,m,lv)=>{const r=seRule(dt),L=lv||CUR,t=r&&r.efficiency_at_limit&&r.efficiency_at_limit[L];return (t&&t[m])||null};
const ruleOff=(dt,id)=>{const r=((dt.rules&&dt.rules.rules)||[]).find(x=>x.id===id);return !r||r.active===false};
// vol9 (Mr Dude via CoS, supersedes the per-set credit discount): weekly volume = effective sets at face value (RIR /
// secondary / minor multipliers kept). The per-set decay only feeds the informational session-efficiency note (session_dose
// heavy) and the per-workout curve; it never changes a weekly number, zone, colour or %. Without curve.input.vol9 (face() false) the vol8i path still runs (vol8i.
const psC=(dt,m,lv)=>{const L=lv||CUR,cb=sdRule(dt).c_by_level||(dt.VM.session||{}).c_by_level;return (cb&&cb[L]&&cb[L][m])||(((dt.VM.session||{}).per_muscle||{})[m]||{}).c};
const heavyLim=(dt,m,lv)=>seLim(dt,m,lv);   // vol9b: replaces max(1 + c, 6)
// per-level session zones: intermediate reads the data as given; other levels derive from that level's c (useful = 1 + c/3, i.e. set credit 0.75; half = 1 + c)
function sessZ(dt,m,lv){const L=lv||CUR,z=(((dt.VM.workout||{}).stimulus||{}).per_muscle_zones||{})[m],P=((dt.VM.session||{}).per_muscle||{})[m];if(!z&&!P)return null;
  const BL=P&&P.by_level&&P.by_level[L];if(BL)return {dose_floor:(z||{}).dose_floor,useful_to:BL.useful_up_to!=null?BL.useful_up_to:BL.useful,half:BL.half_value_from!=null?BL.half_value_from:(BL.low_return_from!=null?BL.low_return_from:BL.half)};
  if(L==='intermediate')return {dose_floor:(z||{}).dose_floor,useful_to:P?P.useful_up_to:z.useful_to,half:P?P.low_return_from:z.low_return_from};const c=psC(dt,m,L);return {dose_floor:(z||{}).dose_floor,useful_to:Math.round((1+c/3)*10)/10,half:1+c}}
function gPS(c,s){if(!(s>0))return 0;const n=Math.floor(s+1e-12);let t=0;for(let i=1;i<=n;i++)t+=1/(1+(i-1)/c);return t+Math.max(0,s-n)/(1+n/c)}
function xEquiv(dt,m,xd){const c=psC(dt,m);if(!c)return xd;if(!(xd>0))return 0;let lo=0,hi=400;for(let k=0;k<90;k++){const md=(lo+hi)/2;if(2*gPS(c,md/2)<xd)lo=md;else hi=md}return (lo+hi)/2}
// vol8c: weekly value = min(x_equiv, raw weekly effective sets), rounded to 0.01 before any zone/colour/warning comparison (check_program.py capped_week)
const capW=(dt,m,xd,raw)=>Math.min(xEquiv(dt,m,xd),raw);   // % uses this exact value; zones/colours/warnings compare it rounded to 0.01
function sessZone8(dt,m,s,lv){const z=sessZ(dt,m,lv);if(!z||z.dose_floor==null)return null;const lim=z.half;   // vol9: history zones (display only); red = session_efficiency fires (board)
  return s<z.dose_floor?'below_dose':s<=z.useful_to+1e-9?'useful':s<=lim+1e-9?'diminishing':'low_return'}
// per-set fatigue (load points) and vol8 recovery hours (recovery.params type_base / axial_by_exercise / effort; hours_formula)
const effortOf=(dt,rir)=>{const E=dt.VM.recovery.params.effort;return E[String(Math.max(0,Math.min(4,Math.round(rir))))]};
const axialOf=(dt,id)=>{const A=dt.VM.recovery.params.axial_by_exercise||{};return A[id]!=null?A[id]:1};
function loadPoints(dt,tiles){const P=dt.VM.recovery.params;let s=0;for(const t of tiles){const e=dt.EX[t.id],rir=t.rir!=null?t.rir:plannedRir(dt,e);s+=t.sets*(P.type_base[e.type]||1)*axialOf(dt,t.id)*effortOf(dt,rir)}return s}
// vol11 (recovery.load_vol11, data/fatigue.json): muscle fatigue per set in fresh-set equivalents = rating[m] x fatigue_per_set(exercise)
// x effort[planned RIR + role offset]; the same number is the recovery load F. Without fatigue.json: the vol8-vol10c load (credit x effort x axial).
function fatSet(dt,e,m,r,rir,id){if(!(r>=0.25))return 0;const FE=dt.FAT&&dt.FAT.exercises&&dt.FAT.exercises[id||e.id];
  if(FE)return r*FE.fatigue_per_set*effortOf(dt,rir+roleOff(dt,e,r));return credit(dt,e,m,r,rir)*effortOf(dt,rir)*axialOf(dt,id||e.id)}
function fatMus(dt,tiles){const out={};for(const t of tiles){const e=dt.EX[t.id];if(!e)continue;const rir=t.rir!=null?t.rir:plannedRir(dt,e);for(const [m,r] of Object.entries(e.muscles||{})){const f=t.sets*fatSet(dt,e,m,r,rir,t.id);if(f>0)out[m]=(out[m]||0)+f}}return out}
// vol11b recovery (volume-model.json recovery.load_vol11b.formula): per muscle ES = sum credit, ST = credit on stretch-biased tiles,
// F = sum sets x rating x fatigue_per_set x effort[RIR + role offset]; r2 = half-up 0.01; gate r2(ES) >= 1.00 (F not gated);
// h = (base + h_per_set x max(0, F2 - free)) x (1 + stretch_add x r2(ST/ES)) x size x level, clamp, 6 x floor(h/6 + .5); days half-up 0.1.
const r2u=x=>Math.floor(x*100+0.5+1e-9)/100;
function recInputs(dt,tiles,level){const P=dt.VM.recovery.params,out={};const A={};
  for(const t of tiles){const e=dt.EX[t.id];if(!e)continue;const rir=t.rir!=null?t.rir:plannedRir(dt,e),SBl=dt.rules.stretch_biased||{};
    for(const [m,r] of Object.entries(e.muscles||{})){if(!(r>=0.25))continue;const c=t.sets*credit(dt,e,m,r,rir),f=t.sets*fatSet(dt,e,m,r,rir,t.id);const a=A[m]=A[m]||{ES:0,ST:0,F:0};a.ES+=c;a.F+=f;if((SBl[m]||[]).includes(t.id))a.ST+=c}}
  for(const [m,a] of Object.entries(A)){const ES2=r2u(a.ES),F2=r2u(a.F),sh=ES2>=(dt.VM.recovery.min_effective_sets_for_hours||1)&&a.ES>0?r2u(a.ST/a.ES):null,size=P.size[m]||1,lf=P.level[level]||1;let hours=0;
    if(ES2>=(dt.VM.recovery.min_effective_sets_for_hours||1)){let h=(P.base_h+P.h_per_set*Math.max(0,F2-P.free_sets));h=h*(1+P.stretch_add*(sh||0));h=h*size;h=h*lf;h=Math.max(P.clamp[0],Math.min(P.clamp[1],h));hours=P.round_to_h*Math.floor(h/P.round_to_h+0.5)}
    out[m]={hours,share:a.ES>0?r2u(a.ST/a.ES):0,days:Math.floor((hours*10+12)/24)/10,inputs:{effective_sets_r2:ES2,recovery_load_r2:F2,stretch_share_r2:sh,size,level_factor:lf}}}
  return out}
function recHours(dt,tiles,level){if(dt.FAT&&dt.VM.recovery.load_vol11b){const I=recInputs(dt,tiles,level),o={};for(const m in I)if(I[m].hours>0)o[m]=I[m].hours;return o}
const RC=dt.VM.recovery,P=RC.params,E=eff(dt,tiles),out={},mr=0.25,FM=dt.FAT?fatMus(dt,tiles):null;
  for(const m of Object.keys(E)){if(!(E[m]>=(RC.min_effective_sets_for_hours||1))||(FM&&!(pyR(FM[m]||0,2)>=(RC.min_effective_sets_for_hours||1))))continue;/* vol11: effective sets AND fatigue load F >= 1 */let F=0,tt=0,ss=0;const SB=dt.rules.stretch_biased[m];
    for(const t of tiles){const e=dt.EX[t.id],r=e.muscles[m]||0;if(r<mr)continue;const rir=t.rir!=null?t.rir:plannedRir(dt,e);F+=t.sets*fatSet(dt,e,m,r,rir,t.id);tt+=r*t.sets;if(SB&&SB.includes(t.id))ss+=r*t.sets}
    let h=(P.base_h+P.h_per_set*Math.max(0,F-P.free_sets))*(1+P.stretch_add*(SB&&tt?ss/tt:0))*(P.size[m]||1)*(P.level[level]||1);h=Math.max(P.clamp[0],Math.min(P.clamp[1],h));
    out[m]=P.round_to_h*Math.floor(h/P.round_to_h+0.5)}return out}
// vol8 flags (rules.json, all info): session_dose, recovery_gap_long, recovery_overlap
function flags8(dt,days,level){setLevel(level);const RU={};dt.rules.rules.forEach(r=>RU[r.id]=r);const out=[],{T}=ctx(dt),SM=(dt.targets.session||{}).muscles||{},PM=(dt.VM.session||{}).per_muscle||{};
  const per=days.map(d=>({d,E:eff(dt,d.tiles),i:ORDER.indexOf(d.day)}));
  if(RU.session_dose)for(const {d,E} of per)for(const m in T){const s=E[m],z=PM[m];if(!z||!(s>0))continue;
    const HL=heavyLim(dt,m,level);if(s>HL+1e-9)out.push(['info','session_dose',d.day,m,'heavy',pyR(s,1),pyR(s-HL,1)]);
    else if(s<RU.session_dose.light_below-1e-9&&d.tiles.some(t=>{const M=dt.EX[t.id].muscles,r=M[m]||0;return r>0&&(r>=0.75||r>=Math.max(...Object.values(M)))}))out.push(['info','session_dose',d.day,m,'light',pyR(s,1),pyR(RU.session_dose.light_below-s,1)])}
  if(days.length<2)return out;
  for(const m in T){const lt=(SM[m]||{}).light;if(lt==null)continue;const M=per.filter(p=>p.E[m]>=lt-1e-9).sort((a,b)=>a.i-b.i);if(!M.length)continue;
    if(RU.recovery_gap_long&&dt.rules.frequency_muscles.includes(m)){let best=null;for(let k=0;k<M.length;k++){const a=M[k],b=M[(k+1)%M.length],g=((b.i-a.i+7)%7||7)*24;if(!best||g>best[2])best=[a.d.day,b.d.day,g]}
      if(best[2]>RU.recovery_gap_long.max_gap_h)out.push(['info','recovery_gap_long',m,best[0],best[1],best[2],best[2]-RU.recovery_gap_long.max_gap_h])}
    if(RU.recovery_overlap){const R=RU.recovery_overlap;let k=0;const streaks=new Set();while(k<M.length){let j=k;while(j+1<M.length&&M[j+1].i===M[j].i+1)j++;if(j-k+1>=R.streak_days){out.push(['info','recovery_overlap',m,'streak',M[k].d.day,M[j].d.day,j-k+1]);for(let q=k;q<=j;q++)streaks.add(q)}k=j+1}
      for(let q=0;q+1<M.length;q++){if(streaks.has(q)&&streaks.has(q+1))continue;const g=(M[q+1].i-M[q].i)*24,h=recHours(dt,M[q].d.tiles,level)[m]||0;const thr=R.early_frac_of_lower*0.8*h;if(g<R.min_gap_h||g<thr-1e-9)out.push(['info','recovery_overlap',m,'early',M[q].d.day,M[q+1].d.day,g,pyR(thr,1),pyR(thr-g,1)]) /* vol8c: [gap h, early threshold h, short by h] */}}}
  return out}
function sessCredit(dt,m,s){if(face(dt))return s;   // vol9: workout stimulus g = undiscounted effective sets
  if(perSet(dt)){const c=psC(dt,m);if(c)return gPS(c,s)}const SD=(dt.VM&&dt.VM.curve.session_discount)||dt.targets.curve.session_discount;
  if(SD.active==='smooth'&&SD.smooth){const H=((dt.targets.session||{}).muscles||{})[m];if(H&&H.heavy){const a=SD.smooth.a_frac_of_heavy*H.heavy,b=SD.smooth.b_frac_of_heavy*H.heavy;return s<=a?s:a+b*Math.log(1+(s-a)/b)}}
  return Math.min(s,SD.cap)+Math.max(0,s-SD.cap)*SD.factor}
// shown value: one decimal, nudged (floor/ceil at 1 dp) when plain rounding would cross a zone or colour boundary, so number, zone and colour agree
function shown(dt,m,level,z,x){const r=r1(x),k=v=>zoneOf(z,v)+'|'+col(dt,m,v,level);if(k(r)===k(x))return r;const f=r>x?Math.floor(x*10)/10:Math.ceil(x*10)/10;return k(f)===k(x)?f:r}
function sessZones(dt,m,lv){if(perSet(dt)){const z=((dt.VM.session||{}).per_muscle||{})[m],Q=sessZ(dt,m,lv);return z?{useful:Q.useful_to,half:Q.half,lim:heavyLim(dt,m,lv),heavy:z.heavy_anchor,c:psC(dt,m,lv),perSet:true}:null}
  return sessZones5(dt,m)}
function sessZones5(dt,m){const SD=(dt.VM&&dt.VM.curve.session_discount)||{},H=((dt.targets.session||{}).muscles||{})[m];if(!(SD.smooth&&H&&H.heavy))return null;const a=SD.smooth.a_frac_of_heavy*H.heavy,b=SD.smooth.b_frac_of_heavy*H.heavy;return {useful:a,half:a+b,heavy:H.heavy}}
function zoneOf(z,x){if(!(x>0))return 'none';if(x<z.min-1e-9)return 'below_min';if(z.sweet&&x<z.sweet[0]-1e-9)return 'growth';if(z.sweet&&x<=z.sweet[1]+1e-9)return 'sweet_spot';if(x<=z.diminishing+1e-9)return z.sweet?'upper':'growth';return 'diminishing'}
// session time for the UI: rules.json session_length.by_level[level] (flag_min / warn_min / warm-up / rest); program-check parity stays in Python
function sessP(dt,level){const SL=ctx(dt).RU.session_length,L=level&&SL.by_level&&SL.by_level[level];return L?{warmup_min:L.warmup_min,work_min_per_set:L.work_min_per_set,rest_min_by_type:L.rest_min_by_type,info_min:L.info_min!=null?L.info_min:L.flag_min,warn_min:L.warn_min}:SL}
function sessionMinutes(dt,tiles,level){const SL=sessP(dt,level);let m=SL.warmup_min;for(const t of tiles)m+=t.sets*(SL.work_min_per_set+SL.rest_min_by_type[dt.EX[t.id].type]);return m}
// vol16b latency: eff() is pure in (dt, tile ids/sets/rir, the exercise objects); the deep-dive fix search calls it thousands of times on the
// same days. Memoised per data object (exercise identity checked on every hit, so an edited custom exercise recomputes); callers get a copy.
const EFFM=new WeakMap();
function eff(dt,tiles){let M=EFFM.get(dt);if(!M){M=new Map();EFFM.set(dt,M)}let k='';for(const t of tiles)k+=t.id+'\u0001'+t.sets+'\u0001'+(t.rir==null?'':t.rir)+'\u0002';
  const h=M.get(k);if(h&&h.ex.every((e,i)=>dt.EX[tiles[i].id]===e))return Object.assign({},h.v);
  const {T}=ctx(dt),v={};for(const m in T)v[m]=0;for(const t of tiles){const e=dt.EX[t.id];for(const [m,r] of Object.entries(e.muscles))if(r>=0.25&&m in v)v[m]+=t.sets*credit(dt,e,m,r,t.rir)}
  if(M.size>4000)M.clear();M.set(k,{v:Object.assign({},v),ex:tiles.map(t=>dt.EX[t.id])});return v}
function slotCounts(dt,days){const {PJ}=ctx(dt),c={};for(const k in PJ.slots)c[k]=0;
  for(const d of days)for(const t of d.tiles){const e=dt.EX[t.id],hit=new Set();for(const s of e.patterns||[]){if(PJ.slots[s].kind==='compound'&&e.type==='isolation')continue;hit.add(s);(PJ.slots[s].counts_toward||[]).forEach(x=>hit.add(x))}hit.forEach(s=>c[s]+=1)}return c}
function patternFlags(dt,days,level){const {PJ}=ctx(dt);if(!days.some(d=>d.tiles.length))return [];const c=slotCounts(dt,days),out=[];
  for(const [s,mn] of Object.entries(PJ.weekly_min_by_level[level])){if(mn<=0||c[s]>=mn)continue;out.push([c[s]===0&&PJ.required.includes(s)?'warn':'info','pattern_gap',s,c[s],mn])}return out}
function col(dt,m,x,level){const {T,LF}=ctx(dt),a=pyR(T[m].min*LF[level]*2)/2,b=T[m].max;if(dt.VM&&face(dt))x=Math.round(x*100)/100;else if(dt.VM&&!exactWarn(dt))x=r1(x);if(a<=x&&x<=b)return 'G';if((a-2<=x&&x<a)||(b<x&&x<=b*1.25))return 'A';return 'R'}
// days: [{day:'mon', tiles:[{id,sets}]}] (training days only, any order). Returns [flags, week]
function check(dt,days,level){setLevel(level);const {R,RU,T,S,HEAVY}=ctx(dt),PAT=dt.PAT,f=[],week={},freq={},rawW={};for(const m in T){week[m]=0;freq[m]=0}
  let push=0,pull=0,spw=0;const byday={};days.forEach(d=>byday[d.day]=d);const HS=new Set(R.heavy_squats),HH=new Set(R.heavy_hinges);
  const XW={},XN={};if(gOf()&&seExm(dt))for(const d of days){const v=eff(dt,d.tiles);for(const m in v){XW[m]=(XW[m]||0)+v[m];if(r2u(v[m])>=seExm(dt).single_day_min_eff)XN[m]=(XN[m]||0)+1}}   // vol10c exemption inputs
  for(const d of days){const n=d.tiles.length,tot=total(d);
    if(n>RU.many_small_entries.min_tiles&&tot/n<RU.many_small_entries.max_avg_sets)f.push(['info','many_small_entries',d.day,n,pyR(tot/n,2)]);
    const hs=RU.session_hard_sets,w=hs.warn_above[level];if(tot>w)f.push(['warn','session_hard_sets',d.day,tot]);else if(tot>w-hs.info_band)f.push(['info','session_hard_sets',d.day,tot]);
    const mins=sessionMinutes(dt,d.tiles,level),sl=sessP(dt,level);if(mins>=sl.warn_min)f.push(['warn','session_length',d.day,pyR(mins)]);else if(mins>=sl.info_min)f.push(['info','session_length',d.day,pyR(mins)]);
    let sp=0;for(const t of d.tiles)if(HEAVY.has(t.id))sp+=t.sets;spw+=sp;if(sp>RU.spinal_load.session_warn_above[level])f.push(['warn','spinal_load_session',d.day,sp]);
    const pc=new Map();for(const t of d.tiles){if(t.sets>5)f.push(['warn','sets_per_exercise',d.day,t.id]);const p=PAT[t.id]??null;pc.set(p,(pc.get(p)||0)+1);
      if(R.push_patterns.includes(p))push+=t.sets;if(R.pull_patterns.includes(p))pull+=t.sets}
    for(const [p,c] of pc){if(c<2)continue;const pv=eff(dt,d.tiles.filter(t=>(PAT[t.id]??null)===p));const over=Object.keys(pv).filter(m=>pv[m]>RU.redundant_pattern.threshold);
      if(over.length)f.push(['warn','redundant_pattern',d.day,p,c,over[0],pyR(pv[over[0]],1)])}
    const v=eff(dt,d.tiles);for(const m in v){const x=v[m];week[m]+=dt.VM&&!face(dt)?sessCredit(dt,m,x):x;rawW[m]=(rawW[m]||0)+x;   // qc3009: weekly totals use the per-session credit (JS diverges from Coach's Python here, accepted)
      if(x>=2)freq[m]+=1;if(x>10&&!ruleOff(dt,'junk_volume_session'))f.push(['warn','junk_volume_session',d.day,m,pyR(x,1)]);
      const SL=seRule(dt)&&seLim(dt,m,level);if(seOver(x,SL)&&exempt(dt,m,level,XW,XN))f.push(['info','session_efficiency_single_day',d.day,m,pyR(x,1),pyR(XW[m],1)]);   // vol10c
      else if(seOver(x,SL)){f.push([(TONE&&TONE.session_efficiency)||seRule(dt).severity||'warn','session_efficiency',d.day,m,pyR(x,1),pyR(x-SL,1)]);   // vol9b
        if(RU.wasted_late_sets&&RU.wasted_late_sets.active!==false){const L=lateSets(dt,d.tiles,m,SL);if(L.length)f.push([RU.wasted_late_sets.severity||'info','wasted_late_sets',d.day,m,L.map(z=>z[0]).join('+'),pyR(x-SL,1)])}}}   // vol10
    const ids=new Set(d.tiles.map(t=>t.id));if(level==='beginner'&&[...ids].some(i=>HS.has(i))&&[...ids].some(i=>HH.has(i)))f.push([RU.beginner_squat_and_deadlift.severity||'warn','beginner_squat_and_deadlift',d.day])} // r2fix: severity from rules[]
  for(let i=0;i<6;i++){const dd=ORDER[i],a=byday[dd],b=byday[ORDER[i+1]];if(!(a&&b))continue;
    if(a.tiles.some(t=>HH.has(t.id))&&b.tiles.some(t=>HS.has(t.id)))f.push([RU.hinge_before_squat.severity||'warn','hinge_before_squat',dd]);
    const va=eff(dt,a.tiles),vb=eff(dt,b.tiles);for(const m in T)if(va[m]>=S[m].solid&&vb[m]>=S[m].solid)f.push(['warn','consecutive_high_volume',dd,m])}
  if(spw>RU.spinal_load.week_warn_above[level])f.push(['warn','spinal_load_week',spw]);
  if(push===0&&pull>0)f.push(['warn','push_pull_imbalance',99.0]);
  if(push){const r=pull/push;if(r<0.75||r>2.0)f.push(['warn','push_pull_imbalance',pyR(r,2)])}
  const all=new Set(days.flatMap(d=>d.tiles.map(t=>t.id)));
  for(const [m,ids] of Object.entries(R.stretch_biased))if(!ids.some(i=>all.has(i)))f.push([(RU.missing_stretch.check_muscles||[]).includes(m)?'warn':'info','missing_stretch',m]); // r2fix: stretch_check muscles warn
  for(const m of R.frequency_muscles)if(freq[m]<2&&days.length>=2)f.push(['info','low_frequency',m,freq[m]]);
  if(perSet(dt)){for(const m in week)week[m]=Math.round((face(dt)?(rawW[m]||0):capW(dt,m,week[m],rawW[m]||0))*100)/100;f.push(...flags8(dt,days,level))}   // vol8b: weekly totals = x_equiv; CoS: zones/colours/warnings on this shown value
  for(const m in week)if(col(dt,m,week[m],level)==='R')f.push(['warn','weekly_volume',m,dt.VM&&face(dt)?shown(dt,m,level,zones(dt,m,level),week[m]):pyR(week[m],1)]);   // vol9b: flag carries the same shown face-value number as the table
  f.push(...patternFlags(dt,days,level));return [f,week]}
// ---------------- fixes (check_program.py v18) ----------------
const flagKey=f=>JSON.stringify([f[1],...f.slice(2).filter(x=>typeof x==='string')]);
const nonin=fl=>new Set(fl.filter(x=>x[0]!=='info').map(flagKey));
const _day=(days,n)=>days.find(d=>d.day===n);
const nm=(dt,i)=>dt.EX[i].name;
const pm=(dt,i)=>{const MUS=ctx(dt).MUS,e=dt.EX[i];let b=MUS[0];for(const m of MUS)if(e.muscles[m]>e.muscles[b])b=m;return b};
function prev(dt,a,p){const {R,PJ}=ctx(dt),FA=R.fix_actions,DN=R.day_names;p=Object.assign({},p);if('slot' in p)p.slot_lower=PJ.slots[p.slot].name.toLowerCase();
  for(const k of ['day','to_day','from_day'])if(k in p)p[k+'_name']=DN[p[k]]??p[k];
  if(a==='reduce_sets'&&p.from==='')return fmtPy(FA[a].preview_multi,p);return fmtPy(FA[a].preview,p)}
const TORD={primary:0,accessory:1,isolation:2};
const ordIdx=(dt,d)=>sortBy(d.tiles.map((_,i)=>i),i=>[TORD[dt.EX[d.tiles[i].id].type],i]);
const load=(dt,d,m)=>eff(dt,d.tiles)[m]||0;
function daysByLoad(dt,days,m,exclude){const {S}=ctx(dt),names=days.map(d=>d.day).filter(n=>n!==exclude);
  const adj=n=>{const i=ORDER.indexOf(n),nb=[i-1,i+1].filter(j=>j>=0&&j<7).map(j=>ORDER[j]);let c=0;for(const x of nb)for(const d of days)if(d.day===x&&load(dt,d,m)>=S[m].solid)c++;return c};
  return sortBy(names,n=>[adj(n),load(dt,_day(days,n),m),total(_day(days,n))])}
function* gReduceSets(dt,days,day,target,muscle=null,need=null,minSets=2){const ds=day?[_day(days,day)]:days,c=[];
  for(const d of ds)d.tiles.forEach((t,i)=>{if(t.sets<=minSets)return;let key;const r=dt.EX[t.id].muscles[muscle]||0;
    if(target==='highest_contributor')key=-(r>=0.25?t.sets*r:0);else{if(dt.EX[t.id].type!=='isolation')return;key=-i}
    if(key===0&&target==='highest_contributor')return;c.push([key,d.day,i])});
  c.sort(cmpT);for(const [,dn,i] of c){const t=_day(days,dn).tiles[i];for(let by=1;by<=t.sets-minSets;by++){const n=clone(days);_day(n,dn).tiles[i].sets-=by;
    yield ['reduce_sets',{target,muscle,by,min_sets:minSets,name:nm(dt,t.id),day:dn,from:t.sets,to:t.sets-by},n]}}}
function* gTrimIsolation(dt,days,day,need){const n=clone(days),d=_day(n,day);let left=need;const parts=[];
  for(let i=d.tiles.length-1;i>=0;i--){const t=d.tiles[i];if(dt.EX[t.id].type!=='isolation'||t.sets<=2)continue;const k=Math.min(left,t.sets-2);parts.push(`${nm(dt,t.id)} ${t.sets}→${t.sets-k}`);t.sets-=k;left-=k;if(left<=0)break}
  if(parts.length)yield ['reduce_sets',{target:'lowest_priority_isolation',by:need-Math.max(left,0),min_sets:2,name:parts.join(', '),day,from:'',to:''},n]}
function* gRemoveTile(dt,days,day){const d=_day(days,day);for(const i of sortBy(d.tiles.map((_,i)=>i),i=>[dt.EX[d.tiles[i].id].type!=='isolation'?1:0,d.tiles[i].sets,-i])){
  const n=clone(days),t=_day(n,day).tiles.splice(i,1)[0];yield ['remove_tile',{target:t.id,name:nm(dt,t.id),day},n]}}
function* gMoveTile(dt,days,day,ids=null){const d=_day(days,day),order=ordIdx(dt,d).reverse().filter(i=>ids==null||ids.includes(d.tiles[i].id));
  for(const i of order){const t=d.tiles[i];for(const to of daysByLoad(dt,days,pm(dt,t.id),day)){if(_day(days,to).tiles.some(x=>x.id===t.id))continue;
    const n=clone(days),tt=_day(n,day).tiles.splice(i,1)[0];_day(n,to).tiles.push(tt);yield ['move_tile',{target:t.id,to_day:to,name:nm(dt,t.id),day},n]}}}
function* gMoveSets(dt,days,day,muscle=null,ids=null,need=1){const d=_day(days,day);
  for(const i of sortBy(d.tiles.map((_,i)=>i),i=>[muscle?-(d.tiles[i].sets*(dt.EX[d.tiles[i].id].muscles[muscle]||0)):0])){const t=d.tiles[i];
    if(ids&&!ids.includes(t.id))continue;if(muscle&&(dt.EX[t.id].muscles[muscle]||0)<0.25)continue;
    for(let k=Math.max(1,need);k<t.sets-1;k++)for(const to of daysByLoad(dt,days,pm(dt,t.id),day)){const n=clone(days),nd=_day(n,day).tiles;nd[i].sets-=k;if(nd[i].sets<2)continue;
      const tl=_day(n,to).tiles,ex=tl.filter(x=>x.id===t.id);if(ex.length){if(ex[0].sets+k>5)continue;ex[0].sets+=k}else{if(k<2)continue;tl.push({id:t.id,sets:k})}
      yield ['move_sets_to_day',{target:t.id,sets:k,to_day:to,name:nm(dt,t.id),day},n]}}}
function* gSwap(dt,days,day,criteria,ids=null,muscle=null){const {R,HEAVY}=ctx(dt),PAT=dt.PAT,ds=day?[_day(days,day)]:days,N=Object.keys(dt.EX).length;
  for(const d of ds)for(let i=0;i<d.tiles.length;i++){const t=d.tiles[i];if(ids!=null&&!ids.includes(t.id))continue;if(muscle&&(dt.EX[t.id].muscles[muscle]||0)<0.5)continue;
    for(const c of RANK.swaps(dt,t.id,N)){const k=dt.EX[c.id],e=dt.EX[t.id];if(k.custom)continue; // fixes never suggest a custom exercise (custom-exercise-defaults.md Limits)
      if(criteria==='stretch_biased'&&!(R.stretch_biased[muscle||pm(dt,t.id)]||[]).includes(c.id))continue;
      if(criteria==='lower_fatigue'&&k.fatigue>=e.fatigue)continue;
      if(criteria==='lower_spinal'&&(HEAVY.has(c.id)||k.muscles.lower_back>=e.muscles.lower_back))continue;
      if(criteria==='same_pattern'&&PAT[c.id]!==PAT[t.id])continue;
      if(criteria==='fresher_same_muscle'&&((k.muscles[muscle]||0)<0.5||!(k.fatigue<e.fatigue)))continue;   // vol9b fix_actions.swap_exercise.fresher_same_muscle
      if(d.tiles.some(x=>x.id===c.id))continue;const n=clone(days);_day(n,d.day).tiles[i].id=c.id;
      yield ['swap_exercise',{target:t.id,criteria,name:nm(dt,t.id),new_name:k.name,day:d.day},n]}}}
const RARE_EQ=new Set(['rings','suspension','medicine ball','stability ball']);
function bestFor(dt,days,muscle,stretch=false,patterns=null){const {R}=ctx(dt),PAT=dt.PAT,used=new Set(days.flatMap(d=>d.tiles.map(t=>dt.EX[t.id].equipment)));
  let ref=null;for(const d of days)for(const t of d.tiles){const c=[t.sets*dt.EX[t.id].muscles[muscle],t.id];if(ref===null||cmpT(c,ref)>0)ref=c}if(ref===null)ref=[0,null]; // python max(..., default=(0,None))
  const ok=i=>{const e=dt.EX[i];return !e.custom&&(e.muscles[muscle]||0)>=0.75&&['isolation','accessory'].includes(e.type)&&PAT[i]!=='plyometric'&&(!RARE_EQ.has(e.equipment)||used.has(e.equipment))
    &&(!stretch||(R.stretch_biased[muscle]||[]).includes(i))&&(!patterns||patterns.includes(PAT[i]))};
  let c=stFlat(R).filter(i=>i in dt.EX&&ok(i));if(!c.length)c=Object.keys(dt.EX).filter(ok);
  const sc=i=>ref[0]>0?RANK.swapScore(dt,ref[1],i)[0]+20*dt.EX[i].muscles[muscle]:100*dt.EX[i].muscles[muscle]-10*dt.EX[i].fatigue;
  const po=i=>patterns?patterns.indexOf(PAT[i]):0;
  return sortBy(c,i=>[po(i),-pyR(sc(i),1),-(dt.USE[i]||0),i])}
function* gAddExercise(dt,days,muscle,stretch=false,excludeDay=null,patterns=null){for(const c of bestFor(dt,days,muscle,stretch,patterns).slice(0,6))
  for(const to of sortBy(days.map(d=>d.day).filter(n=>n!==excludeDay),n=>[total(_day(days,n))])){if(_day(days,to).tiles.some(x=>x.id===c))continue;
    const n=clone(days);_day(n,to).tiles.push({id:c,sets:2});yield ['add_exercise',{muscle,sets:2,to_day:to,name:nm(dt,c)},n]}}
function* gAddSets(dt,days,muscle,day=null,need=1,pats=null){const PAT=dt.PAT,c=[];
  for(const d of days){if(day&&d.day!==day)continue;d.tiles.forEach((t,i)=>{const r=dt.EX[t.id].muscles[muscle]||0;if(r>=0.5&&(!pats||pats.includes(PAT[t.id])))c.push([r,d.day,i])})}
  c.sort((a,b)=>cmpT(b,a));for(const [,dn,i] of c){const t=_day(days,dn).tiles[i];for(let by=1;by<6-t.sets;by++){const n=clone(days);_day(n,dn).tiles[i].sets+=by;
    yield ['add_sets',{muscle,by,max_sets:5,name:nm(dt,t.id),day:dn,from:t.sets,to:t.sets+by},n]}}}
function* gReorder(dt,days,day){const d=_day(days,day),o=ordIdx(dt,d);if(o.some((x,k)=>x!==k)){const n=clone(days);_day(n,day).tiles=o.map(i=>d.tiles[i]);
  yield ['reorder_day',{order:'primary,accessory,isolation',day},n]}}
function* gSplitPattern(dt,days,day,pattern=null,tile=null){const PAT=dt.PAT,d=_day(days,day),N=Object.keys(dt.EX).length;
  const ts=d.tiles.map((t,i)=>[t.sets,i]).filter(([,i])=>(tile&&d.tiles[i].id===tile)||(pattern&&PAT[d.tiles[i].id]===pattern)).sort((a,b)=>cmpT(b,a));
  for(const [,i] of ts){const t=d.tiles[i],mv=Math.floor(t.sets/2);if(mv<2)continue;
    for(const c of RANK.swaps(dt,t.id,N)){if(dt.EX[c.id].custom||PAT[c.id]!==PAT[t.id]||d.tiles.some(x=>x.id===c.id))continue;const n=clone(days),tl=_day(n,day).tiles;tl[i].sets-=mv;tl.splice(i+1,0,{id:c.id,sets:mv});
      yield ['split_pattern',{target:t.id,move_sets:mv,name:nm(dt,t.id),new_name:dt.EX[c.id].name,day,from:t.sets,keep:t.sets-mv,moved:mv},n]}}}
function* gMerge(dt,days,day){const PAT=dt.PAT,d=_day(days,day);for(const i of sortBy(d.tiles.map((_,i)=>i),i=>[d.tiles[i].sets])){const t=d.tiles[i];
  for(let j=0;j<d.tiles.length;j++){const u=d.tiles[j];if(j===i||PAT[u.id]!==PAT[t.id]||u.sets+t.sets>5)continue;const n=clone(days),tl=_day(n,day).tiles;tl[j].sets+=t.sets;tl.splice(i,1);
    yield ['merge_tiles',{target:t.id,into:u.id,name:nm(dt,t.id),into_name:nm(dt,u.id),day,into_from:u.sets,into_to:u.sets+t.sets},n]}}}
// patterns.py g_fill_slot
function daysFor(dt,days,slot){const S=ctx(dt).PJ.slots,g=S[slot].group,has=d=>d.tiles.some(t=>(dt.EX[t.id].patterns||[]).slice(0,1).some(s=>S[s].group===g));
  return sortBy(days,d=>[has(d)?0:1,total(d),ORDER.indexOf(d.day)]).map(d=>d.day)}
function* gFillSlot(dt,days,slot,level){const {R,PJ}=ctx(dt),GF=R.pattern_gap_fix,first=GF.sets_by_kind[PJ.slots[slot].kind];
  for(const r of RANK.slotRecommendations(dt,slot,level,days,GF.max_candidates))for(const to of daysFor(dt,days,slot)){if(_day(days,to).tiles.some(x=>x.id===r.id))continue;
    for(const sets of [...new Set([first,GF.fallback_sets])]){const n=clone(days);_day(n,to).tiles.push({id:r.id,sets});yield ['add_slot_exercise',{slot,sets,to_day:to,name:dt.EX[r.id].name,target:r.id},n]}}}
function gens(dt,days,f,level){const {R,RU,T}=ctx(dt),PAT=dt.PAT,rid=f[1];
  if(rid==='session_efficiency'||rid==='wasted_late_sets'||rid==='session_efficiency_single_day'){const [d,m]=[f[2],f[3]],G={move_sets_to_day:()=>gMoveSets(dt,days,d,m),'reduce_sets:highest_contributor':()=>gReduceSets(dt,days,d,'highest_contributor',m),'swap_exercise:fresher_same_muscle':()=>gSwap(dt,days,d,'fresher_same_muscle',null,m)},SE=seRule(dt)||{},NV=new Set(SE.never_suggest||[]);
    return (SE.fix_order||[]).slice().sort((a,b)=>a.rank-b.rank).filter(o=>!NV.has(o.action)&&G[o.fixes_key]).map(o=>G[o.fixes_key]())}
  if(rid==='junk_volume_session'){const [d,m]=[f[2],f[3]];return [gReduceSets(dt,days,d,'highest_contributor',m),gMoveSets(dt,days,d,m),gMoveTile(dt,days,d,_day(days,d).tiles.filter(t=>(dt.EX[t.id].muscles[m]||0)>=0.25).map(t=>t.id))]}
  if(rid==='session_hard_sets'||rid==='session_length'){const d=f[2],dd=_day(days,d),tot=total(dd),hs=RU.session_hard_sets,sl=sessP(dt,level),mins=sessionMinutes(dt,dd.tiles,level);
    let need=rid==='session_hard_sets'?tot-hs.warn_above[level]:Math.ceil((mins-sl.warn_min+0.01)/2.25);
    if(f[0]==='info')need=rid==='session_hard_sets'?tot-hs.warn_above[level]+hs.info_band:Math.ceil((mins-sl.info_min+0.01)/2.25);
    return [gTrimIsolation(dt,days,d,Math.max(1,need)),gReduceSets(dt,days,d,'lowest_priority_isolation'),gMoveTile(dt,days,d),gRemoveTile(dt,days,d)]}
  const H=[...ctx(dt).HEAVY];
  if(rid==='spinal_load_session'){const d=f[2];return [gSwap(dt,days,d,'lower_spinal',H),gMoveTile(dt,days,d,H),gReduceSets(dt,days,d,'highest_contributor','lower_back')]}
  if(rid==='spinal_load_week')return [gSwap(dt,days,null,'lower_spinal',H),gReduceSets(dt,days,null,'highest_contributor','lower_back')];
  if(rid==='sets_per_exercise'){const [d,i]=[f[2],f[3]];return [gSplitPattern(dt,days,d,null,i),gMoveSets(dt,days,d,null,[i]),gReduceSets(dt,days,d,'highest_contributor',pm(dt,i),null,5)]}
  if(rid==='redundant_pattern'){const [d,p,m]=[f[2],f[3],f[5]];return [gReduceSets(dt,days,d,'highest_contributor',m),gMoveSets(dt,days,d,m,R.patterns[p]),gMoveTile(dt,days,d,R.patterns[p])]}
  if(rid==='weekly_volume'){const [m,x]=[f[2],f[3]];if(x>T[m].max)return [gReduceSets(dt,days,null,'highest_contributor',m)];return [gAddSets(dt,days,m),gAddExercise(dt,days,m)]}
  if(rid==='push_pull_imbalance'){let pushs=0,pulls=0;for(const d of days)for(const t of d.tiles){if(R.push_patterns.includes(PAT[t.id]))pushs+=t.sets;if(R.pull_patterns.includes(PAT[t.id]))pulls+=t.sets}
    if(pulls===0){const pp=['horizontal_row','vertical_pull'];return [gAddExercise(dt,days,'upper_back',false,null,pp),gAddExercise(dt,days,'lats',false,null,pp),gAddSets(dt,days,'upper_back',null,1,R.pull_patterns)]}
    if(pushs===0){const pp=['horizontal_press','incline_press','vertical_press'];return [gAddExercise(dt,days,'chest',false,null,pp),gAddExercise(dt,days,'front_delts',false,null,pp),gAddSets(dt,days,'chest',null,1,R.push_patterns)]}
    const lag=f[2]<1?'pull':'push',ms=lag==='pull'?['upper_back','lats']:['chest','front_delts'],lead=lag==='pull'?['chest']:['lats'];
    return [gAddSets(dt,days,ms[0]),gAddExercise(dt,days,ms[0]),gAddExercise(dt,days,ms[1]),gReduceSets(dt,days,null,'highest_contributor',lead[0])]}
  if(rid==='missing_stretch'){const m=f[2];return [gSwap(dt,days,null,'stretch_biased',null,m),gAddExercise(dt,days,m,true)]}
  if(rid==='low_frequency'){const m=f[2];let hv=days[0];for(const d of days)if(load(dt,d,m)>load(dt,hv,m))hv=d;hv=hv.day;return [gMoveSets(dt,days,hv,m),gAddExercise(dt,days,m,false,hv)]}
  if(rid==='hinge_before_squat'){const d=f[2],nx=ORDER[ORDER.indexOf(d)+1];return [gMoveTile(dt,days,d,R.heavy_hinges),gMoveTile(dt,days,nx,R.heavy_squats),gSwap(dt,days,nx,'lower_spinal',R.heavy_squats)]}
  if(rid==='beginner_squat_and_deadlift'){const d=f[2];return [gMoveTile(dt,days,d,R.heavy_hinges),gMoveTile(dt,days,d,R.heavy_squats),gSwap(dt,days,d,'lower_spinal',H)]}
  if(rid==='consecutive_high_volume'){const [d,m]=[f[2],f[3]],nx=ORDER[ORDER.indexOf(d)+1];return [gMoveSets(dt,days,nx,m),gMoveSets(dt,days,d,m),gReduceSets(dt,days,nx,'highest_contributor',m)]}
  if(rid==='pattern_gap')return [gFillSlot(dt,days,f[2],level)];
  if(rid==='many_small_entries'){const d=f[2];return [gMerge(dt,days,d),gRemoveTile(dt,days,d)]}
  return []}
function dist(dt,f,level){const {T,LF}=ctx(dt);if(f[1]==='weekly_volume'){const [m,x]=[f[2],f[3]],a=pyR(T[m].min*LF[level]*2)/2;return x<a?a-x:x-T[m].max}
  if(f[1]==='push_pull_imbalance')return f[2]<0.75?0.75-f[2]:f[2]-2.0;if(f[1]==='low_frequency')return 2-f[3];if(f[1]==='pattern_gap')return f[4]-f[3];
  const nums=f.slice(2).filter(x=>typeof x==='number');return nums.length?nums[nums.length-1]:0}
function evaluate(dt,days,nw,level,f){const old=check(dt,days,level)[0],nf=check(dt,nw,level)[0],a=nonin(old),b=nonin(nf);for(const k of b)if(!a.has(k))return null;
  const k=flagKey(f),same=nf.filter(x=>flagKey(x)===k&&(f[0]==='info'||x[0]!=='info'));if(!same.length)return 'resolves';
  return dist(dt,same[0],level)<dist(dt,f,level)-1e-9?'improves':null}
function fixes(dt,days,level,f,maxn=3,budget=400){const out=[];
  for(const g of gens(dt,days,f,level)){let best=null,tried=0;for(const [a,p,n] of g){if(tried++>=budget)break;const r=evaluate(dt,days,n,level,f);
      if(r==='resolves'){best=[r,a,p,n];break}if(r==='improves'&&best===null)best=[r,a,p,n]}
    if(best&&out.some(o=>o.preview===prev(dt,best[1],best[2])))best=null;
    if(best){const [r,a,p,n]=best,pp={};for(const k in p)if(!['name','new_name','into_name'].includes(k))pp[k]=p[k];out.push({action:a,params:pp,preview:prev(dt,a,p),resolves:r==='resolves',days:n})}
    if(out.length>=maxn)break}
  return sortBy(out,x=>[x.resolves?0:1])}
// ---------------- messages (rules.json wording, as the old app's check.js fmsg) ----------------
const LEVELS_OK=l=>['beginner','intermediate','advanced'].includes(l)?l:'intermediate';
function message(dt,f,days,level){const {R,RU,PJ}=ctx(dt),DN=R.day_names,id=f[1],rid=id.startsWith('spinal_load')?'spinal_load':id,r=RU[rid],L=m=>{const s=dt.rules.ranking.labels.regions[m]||m.replace(/_/g,' ');return s[0].toUpperCase()+s.slice(1)};
  const P={},put=(ks)=>ks.forEach((k,j)=>P[k]=f[2+j]);
  ({many_small_entries:['day','n'],session_hard_sets:['day','sets'],session_length:['day','min'],spinal_load_session:['day','sets'],sets_per_exercise:['day','exercise'],
    redundant_pattern:['day','pattern','n','muscle','sets'],junk_volume_session:['day','muscle','sets'],session_efficiency:['day','muscle','sets','over'],wasted_late_sets:['day','muscle','tiles','wasted'],session_efficiency_single_day:['day','muscle','session','sets'],beginner_squat_and_deadlift:['day'],hinge_before_squat:['day1'],
    consecutive_high_volume:['day1','muscle'],spinal_load_week:['sets'],push_pull_imbalance:['ratio'],missing_stretch:['muscle'],low_frequency:['muscle','n'],weekly_volume:['muscle','sets'],pattern_gap:['slot','n','min'],session_dose:['day','muscle','variant','sets','delta'],recovery_gap_long:['muscle','day1','day2','gap','over'],recovery_overlap:['muscle','variant','day1','day2','n','ready']}[id]||[]).forEach((k,j)=>P[k]=f[2+j]);
  if(P.day1&&!P.day2)P.day2=ORDER[ORDER.indexOf(P.day1)+1];for(const k of ['day','day1','day2'])if(P[k])P[k]=DN[P[k]];
  if(id==='sets_per_exercise'){const dd=days.find(x=>x.day===f[2]),t=dd&&dd.tiles.find(x=>x.id===f[3]);P.sets=t?t.sets:''}
  if(P.muscle)P.muscle=L(P.muscle);if(P.pattern)P.pattern=P.pattern.replace(/_/g,' ');if(P.exercise)P.exercise=nm(dt,P.exercise);
  if(id==='session_hard_sets')P.max=RU.session_hard_sets.warn_above[level];if(id==='spinal_load_session')P.max=RU.spinal_load.session_warn_above[level];if(id==='spinal_load_week')P.max=RU.spinal_load.week_warn_above[level];
  if(id==='weekly_volume'){const T=ctx(dt).T,m=f[2];P.min=pyR(T[m].min*ctx(dt).LF[LEVELS_OK(level)]*2)/2;P.max=T[m].max}   /* vol16: {min} = sets.level_min (the level's weekly minimum); never NaN when a caller omits the level */
  if(id==='missing_stretch')P.examples=R.stretch_biased[f[2]].slice(0,2).map(i=>nm(dt,i)).join(' or ').toLowerCase();
  if(id==='push_pull_imbalance'&&(f[2]===0||f[2]===99))return f[2]?r.message_no_push:r.message_no_pull;
  /* vol16a: {pull}/{push}/{gap}/{side} are counted from the days (same rule as flags14); without days the numbers are left out, never 'undefined' */
  if(id==='push_pull_imbalance'){const PAT=dt.PAT||{};let ps=0,pu=0;for(const d of (days||[]))for(const t of d.tiles){if(R.push_patterns.includes(PAT[t.id]))ps+=t.sets;if(R.pull_patterns.includes(PAT[t.id]))pu+=t.sets}
    if(!days||!(ps+pu)){const fb=r.message_history_vol13?r.message_history_vol13.replace(/^Pull-to-push sets are \{ratio\}:1 this week\. /,''):'';return f[2]!=null&&isFinite(f[2])?`Pull-to-push sets are ${f[2]}:1 this week. ${fb}`.trim():fb||'Pulling and pressing are out of balance this week.'}
    const lo=r.min_ratio||0.75,hi=r.max_ratio||2,low=pu<ps*lo,gap=low?Math.ceil(ps*lo-pu-1e-9):Math.ceil(pu/hi-ps-1e-9);return fmtPy(r.message,{pull:pu,push:ps,gap,side:low?'rows or pulldowns':'presses'})}
  if(id==='pattern_gap'){const S=PJ.slots[f[2]];return fmtPy(f[0]==='warn'?r.message:r.message_info,{slot_lower:S.name.toLowerCase(),slot_name:S.name,n:f[3],min:f[4],examples:RANK.slotRecommendations(dt,f[2],level,days,2).map(x=>nm(dt,x.id)).join(', ')})}
  if(id==='session_length'){const sp=sessP(dt,level);P.warn_min=sp.warn_min;P.info_min=sp.info_min;P.level=level} // vol3: messages carry {warn_min}/{info_min} from by_level[level]
  // vol8 flags: variants, {gap} in days, {ready} as a range, {limit} from the per-set curve (never exact hours)
  const dys=h=>{const v=h/24;return `${+v.toFixed(1)} day${v===1?'':'s'}`};
  if(id==='session_efficiency_single_day'){P.sets=+(+f[5]).toFixed(1);return fmtPy(r.message,P)}
  if(id==='session_efficiency'){P.limit=seLim(dt,f[3]);P.sets=+(+P.sets).toFixed(1);return fmtPy(r.message,P)}
  if(id==='wasted_late_sets'){const D=(days||[]).find(x=>x.day===f[2]),lim=seLim(dt,f[3],level),L=D?lateSets(dt,D.tiles,f[3],lim):[],G=goalsCfg(dt);P.limit=lim;P.n=L.reduce((a,z)=>a+z[1],0);P.wasted=+(+f[5]).toFixed(1);P.goal=GOAL?((G&&G.labels&&G.labels[GOAL])||GOAL):'your level';return fmtPy(r.message,P)}
  // vol9b: session_dose removed from rules.json (its message branch is gone)
  if(id==='recovery_gap_long'){P.gap=dys(f[5]);return fmtPy(f[3]===f[4]&&r.message_once?r.message_once:r.message,P)}
  if(id==='recovery_overlap'){const R8=r;if(f[3]==='streak'){P.n=f[6];return fmtPy(r.message_streak,P)}P.gap=dys(f[6]);P.ready=f[7]?(h=>{h=h/(R8.early_frac_of_lower*0.8);if(h<20)return 'about a day';const lo=Math.floor(h*0.8/12)/2,hi=Math.ceil(h*1.2/12)/2;return (dt.VM.recovery.display.format||'about {lo}–{hi} days').replace('{lo}',String(lo)).replace('{hi}',String(hi))})(f[7]):'';return fmtPy(r.message_early,P)}
  let msg=r.message;if(id==='low_frequency'&&f[3]===0&&r.message_indirect_only)msg=r.message_indirect_only;else if(id==='spinal_load_week')msg=r.message_week||msg;else if(f[0]==='info'&&r.message_info)msg=r.message_info;
  return fmtPy(msg,P)}
const RULE_OF=id=>id.startsWith('spinal_load')?'spinal_load':id;
// rules.json rules[].short_label, with short_label_variants picked the same way message() picks its variant
function shortLabel(dt,f){const id=f[1],r=dt.rules.rules.find(x=>x.id===RULE_OF(id));if(!r)return id;const V=r.short_label_variants||{};let k=null;
  if(id==='spinal_load_session')k='session';else if(id==='spinal_load_week')k='week';
  else if(id==='push_pull_imbalance'&&(f[2]===0||f[2]===99))k=f[2]?'no_push':'no_pull';
  else if(id==='low_frequency'&&f[3]===0&&r.message_indirect_only)k='indirect_only';
  else if(id==='session_dose')k=f[4];else if(id==='recovery_overlap')k=f[3];
  else if(id==='weekly_volume'){const T=ctx(dt).T[f[2]];k=T&&f[3]>T.max?'over':'under'}
  else if(f[0]==='info'&&r.severity!=='info')k='info';
  return (k&&V[k])||r.short_label||id}
const ruleLabel=(dt,id)=>{const r=dt.rules.rules.find(x=>x.id===id);return (r&&r.short_label)||id};
// the checks the board is scored on: every rules.json rule that applies (app_only rules need a saved baseline; `levels` limits a rule)
function checks(dt,days,level){const [fl,week]=check(dt,days,level),rules=dt.rules.rules.filter(r=>!r.app_only&&(!r.levels||r.levels.includes(level)));
  const byRule={};rules.forEach(r=>byRule[r.id]={id:r.id,warn:[],info:[]});fl.forEach(f=>{const b=byRule[RULE_OF(f[1])];if(b)b[f[0]].push(f)});
  const list=rules.map(r=>byRule[r.id]),pass=list.filter(c=>!c.warn.length).length;return {list,pass,total:list.length,flags:fl,week}}
// ---------------- analytics (old app analytics.js; targets.json curve / recovery / analytics) ----------------
function analytics(dt,days,level){setLevel(level);const TT=dt.targets,C=TT.curve,A=TT.analytics,{T,LF,RU,HEAVY}=ctx(dt),MUS=Object.keys(T),VM=!!dt.VM;
  const kOf=m=>(C.k_by_muscle&&C.k_by_muscle[m]&&C.k_by_muscle[m][level])||C.k[level],Sx=(x,k)=>1-Math.exp(-x/k),SD=C.session_discount,disc=(v,m)=>VM?sessCredit(dt,m,v):Math.min(v,SD.cap)+Math.max(0,v-SD.cap)*SD.factor;
  const perDay=days.map(d=>eff(dt,d.tiles)),muscles={};
  for(const m of MUS){const rawx=perDay.reduce((a,v)=>a+v[m],0),xd=perDay.reduce((a,v)=>a+disc(v[m],m),0),x=VM&&face(dt)?rawx:VM&&perSet(dt)?capW(dt,m,xd,rawx):xd,freq=perDay.filter(v=>v[m]>=A.frequency_min_effective).length;
    if(VM){const z=zones(dt,m,level);const xz=VM&&(face(dt)||perSet(dt))?Math.round(x*100)/100:x;muscles[m]={raw:shown(dt,m,level,z,xz),raw_exact:x,raw_sets:rawx,x_dec:xd,x,zones:z,zone:zoneOf(z,xz),stim:stim(dt,m,level,x),next:stim(dt,m,level,x+1)-stim(dt,m,level,x),min:z.min,max:z.diminishing,freq};continue}
    const k=kOf(m),min=pyR(T[m].min*LF[level]*2)/2;
    muscles[m]={raw:rawx,x,k,stim:Sx(x,k),next:Sx(x+1,k)-Sx(x,k),min,max:T[m].max,freq}}
  const fat=e=>e.fatigue!=null?e.fatigue:(e.type==='isolation'?.8:1.2);
  const day=days.map(d=>({day:d.day,minutes:sessionMinutes(dt,d.tiles,level),sets:total(d),cost:d.tiles.reduce((a,t)=>a+t.sets*fat(dt.EX[t.id]),0),spinal:d.tiles.reduce((a,t)=>a+(HEAVY.has(t.id)?t.sets:0),0)}));
  return {muscles,day,weekSets:days.reduce((a,d)=>a+total(d),0),weekMinutes:day.reduce((a,d)=>a+d.minutes,0),weekCost:day.reduce((a,d)=>a+d.cost,0),
    spinal:{week:day.reduce((a,d)=>a+d.spinal,0),week_max:RU.spinal_load.week_warn_above[level],session_max:RU.spinal_load.session_warn_above[level]},disclaimer:VM?dt.VM.disclaimer:A.disclaimer,curveModel:VM?dt.VM.curve.reads_as:C.model}}
function anchors(dt,m,level){const CV=dt.VM.curve||{},P=(CV.per_muscle||{})[m];if(!P)return null;const A=(P.anchors_by_level&&P.anchors_by_level[level])||P.anchors;if(!A)return null;const lm=P.anchors_by_level?A.min:((P.level_min_pct||{})[level]||A.min);return {min:lm,sweet_low:A.sweet_low,sweet_high:A.sweet_high,dim:A.dim,basis:P.basis,ev:(P.min_evidence||{}).tag||null,fallback:(P.concave_fallback||{})[level]||null}}
const fmtN=v=>{const n=+(+v).toFixed(1);return String(n)};
const API={trimLim,lvLim,setTrimMode,seOver,recInputs,r2u,exemptSet,fatSet,fatMus,roleOff,setTone,setGoal,getGoal,goalTarget,goalsCfg,lateSets,face,anchors,heavyLim,seLim,seEff,seRule,ruleOff,setLevel,check,fixes,evaluate,message,checks,analytics,sessionMinutes,eff,credit,sessCredit,sessZones,perSet,gPS,xEquiv,sessZone8,capW,loadPoints,recHours,flags8,effortOf,axialOf,zones,stim,zoneOf,sessP,r05,r1,dRound,shown,flagKey,ORDER,shortLabel,ruleLabel,
  // internals reused by logic/analysis.js and logic/progress.js (same functions, so the ports cannot drift)
  _x:{gAddSets,gAddExercise,gReduceSets,prev,nonin,_day,load,col,RULE_OF,total,ctx,clone,cmpT,sortBy,fmtPy}};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.PCHECK=API;
})(typeof window!=='undefined'?window:this);
