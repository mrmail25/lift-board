/* vol11 impact data (day body map, S:F dial, week recovery strip), per volume-model.json vol11.builder_paths:
     presets (unmodified)  -> data/day-metrics-presets.json presets[goal][preset] {days[], recovery_strip, session_efficiency_warnings}
     custom boards (live)  -> the same rules, computed here:
       stimulus_hard_set_eq[m] = sum sets x credit (face value)                         (PC.credit)
       fatigue_fresh_set_eq[m] = sum sets x rating x fatigue_per_set x effort[RIR + role offset]   (data/fatigue.json, PC.fatSet)
       sf_ratio = round(round(stim,2) / round(fatigue,2), 2); sf_dial = visuals.sf_dial; fatigue_band = visuals.fatigue_bands
       recovery_days = recovery hours / 24 (0.1), hours = recovery.hours_formula with F = fatigue (PC.recHours); day = slowest muscle
       ready_range_days = [max(0.5, floor(0.8 h / 12) / 2), ceil(1.2 h / 12) / 2]
       recovery strip: bars for meaningful sessions (effective sets >= targets session.muscles[m].light), red per visuals.overlap
   test/vol11 harness: live == precomputed for every preset day, muscle and bar. */
(function(root){
const isNode=typeof module!=='undefined'&&module.exports;
const PCm=()=>isNode?require('./progcheck.js'):root.PCHECK,RANK=()=>isNode?require('./rank.js'):root.RANK;
const ORDER=['mon','tue','wed','thu','fri','sat','sun'];
const pr=(x,n)=>RANK().pyRound(x,n);
const V=dt=>(dt.VM&&dt.VM.visuals)||{};
// vol11c: S:F is per muscle only; colour cuts = visuals.body_map.efficiency.cuts (the day/exercise dials are retired)
function dial(dt,x){if(x==null)return null;const c=(((V(dt).body_map||{}).efficiency||{}).cuts)||{green_from:.9,amber_from:.15};return x>=c.green_from?'green':x>=c.amber_from?'amber':'red'}
function fband(dt,es,f,lim){const c=(V(dt).fatigue_bands||{}).cuts||{warm_from_x_limit:.75,hot_above_x_limit:1.5};if(!(PCm().r2u(es)>=1))return 'none';if(lim==null)return 'cool';   // vol11b: 'none' is effective-set based
  return f<c.warm_from_x_limit*lim?'cool':f<=c.hot_above_x_limit*lim?'warm':'hot'}
const num=x=>String(+(+x).toFixed(2)),dnum=x=>String(+(+x).toFixed(1));
function display(dt,o){const t=((dt.VM.day_metrics||{}).sf_ratio||{}).display||'S:F {stim} / {fatigue} = {ratio} (ready in ~{days} days)';
  const s=t.replace('{stim}',num(o.stimulus_hard_set_eq)).replace('{fatigue}',num(o.fatigue_fresh_set_eq)).replace('{ratio}',o.sf_ratio!=null?o.sf_ratio.toFixed(2):'–');
  return o.recovery_days>0?s.replace('{days}',dnum(o.recovery_days)):s.replace(/\(ready in ~\{days\} days\)/,'(below the recovery threshold)')}
const ratio=(s,f)=>{const a=pr(s,2),b=pr(f,2);return b>0?pr(a/b,2):null};
const range=h=>h>0?[Math.max(0.5,Math.floor(0.8*h/12)/2),Math.ceil(1.2*h/12)/2]:[0,0];
// prime + secondary roles (vol11b.stimulus_roles): top rating or >= 0.75 prime, 0.5-0.75 secondary; minor excluded
function counted(e,r){let mx=0;for(const v of Object.values(e.muscles||{}))if(v>mx)mx=v;return r>=0.25&&(r>=mx-1e-9||r>=0.5)}
const ANCH=dt=>((dt.VM.day_metrics||{}).systemic||{}).anchor_stimulus||1;
// vol11c day row / exercise rows: stimulus on all credited muscles (hard sets), fatigue_fresh_set_eq = whole-body, once per set
// (sets x fatigue_per_set x effort[planned RIR]); no ratio.
function sysOf(dt,tiles){const PC=PCm(),by={};let S=0,F=0;for(const t of tiles){const e=dt.EX[t.id];if(!e)continue;const FE=dt.FAT&&dt.FAT.exercises[t.id];
    for(const [m,r] of Object.entries(e.muscles||{})){if(!(r>=0.25))continue;const c=t.sets*PC.credit(dt,e,m,r,t.rir);if(c>0){by[m]=(by[m]||0)+c;S+=c}}
    F+=t.sets*(FE?FE.fatigue_per_set:1)*PC.effortOf(dt,t.rir!=null?t.rir:plannedRir(dt,e))}
  const MO=Object.keys((dt.targets&&dt.targets.targets)||{}),mo=m=>{const i=MO.indexOf(m);return i<0?99:i};const bym={};Object.entries(by).sort((x,y)=>(y[1]-x[1])||mo(x[0])-mo(y[0])).forEach(([m,v])=>bym[m]=pr(v,2));
  return {stimulus_hard_set_eq:pr(S,2),stimulus_by_muscle:bym,fatigue_fresh_set_eq:pr(F,2)}}
const plannedRir=(dt,e)=>{const P=dt.VM.credit.planned_rir_default;return P[e.type]!=null?P[e.type]:2};
const dayDisp=o=>`Stimulus ${num(o.stimulus_hard_set_eq)} hard sets, fatigue ${num(o.fatigue_fresh_set_eq)} fresh-set eq, slowest muscle ready in ~${dnum(o.recovery_days)} days`;
function liveDay(dt,tiles,lv,goal){const PC=PCm(),E=PC.eff(dt,tiles),F=PC.fatMus(dt,tiles),RI=PC.recInputs(dt,tiles,lv),mus={};let rd=0;
  for(const m of Object.keys(Object.assign({},E,F))){const s=E[m]||0,f=F[m]||0;if(!(s>0)&&!(f>0))continue;const R=RI[m]||{hours:0,days:0,inputs:null},lim=PC.seLim(dt,m,lv,goal===undefined?PC.getGoal():goal);
    const o={stimulus_hard_set_eq:pr(s,2),fatigue_fresh_set_eq:pr(f,2),sf_ratio:ratio(s,f)};o.sf_dial=dial(dt,o.sf_ratio);o.recovery_days=R.days;o.display=display(dt,o);o.recovery_hours=R.hours;if(R.inputs)o.recovery_inputs=R.inputs;
    o.ready_range_days=range(R.hours);o.fatigue_band=fband(dt,s,pr(f,2),lim);o.session_limit=lim;mus[m]=o;if(o.recovery_days>rd)rd=o.recovery_days}
  const exercises=tiles.filter(t=>dt.EX[t.id]).map(t=>Object.assign({id:t.id,sets:t.sets},t.rir!==undefined?{rir:t.rir}:{},sysOf(dt,[t])));
  const S0=sysOf(dt,tiles),ds={stimulus_hard_set_eq:S0.stimulus_hard_set_eq,fatigue_fresh_set_eq:S0.fatigue_fresh_set_eq,recovery_days:rd};ds.display=dayDisp(ds);
  return {day_summary:ds,exercises,muscles:mus}}
// recovery strip: bars + red overlaps (visuals.overlap: early = gap_days < max(0.4 x ready_days, 1); streak = 3+ consecutive days, week wraps)
function liveStrip(dt,days,lv,goal){const PC=PCm(),SM=((dt.targets.session||{}).muscles)||{},bars=[],per={};
  for(const d of days){if(!d.tiles||!d.tiles.length)continue;const X=liveDay(dt,d.tiles,lv,goal),E=PC.eff(dt,d.tiles);
    for(const [m,o] of Object.entries(X.muscles)){const L=(SM[m]||{}).light;if(L!=null&&!(PC.r2u(E[m]||0)>=L))continue;if(!(o.recovery_hours>0))continue;
      bars.push({muscle:m,day:d.day,ready_days:o.recovery_days,ready_hours:o.recovery_hours,ready_range_days:o.ready_range_days});(per[m]=per[m]||[]).push({i:ORDER.indexOf(d.day),day:d.day,r:o.recovery_days})}}
  const RU=((dt.rules.rules||[]).find(r=>r.id==='recovery_overlap'))||{},K=RU.streak_days||3,frac=(RU.early_frac_of_lower||.5)*0.8,minG=(RU.min_gap_h||24)/24,overlaps=[];
  for(const [m,ss] of Object.entries(per)){ss.sort((a,b)=>a.i-b.i);const set=new Set(ss.map(s=>s.i));
    // streaks (wrap)
    let inStreak=new Set();for(const s of ss){let n=0;while(n<7&&set.has((s.i+n)%7))n++;if(n>=K&&n<7)for(let q=0;q<n;q++)inStreak.add((s.i+q)%7);if(n>=7)ss.forEach(x=>inStreak.add(x.i))}
    ss.forEach((s,k)=>{if(ss.length<2)return;const nx=ss[(k+1)%ss.length],gap=(nx.i-s.i+7)%7||7;
      if(inStreak.has(s.i)&&inStreak.has(nx.i)&&gap===1)overlaps.push({muscle:m,day:s.day,next_day:nx.day,gap_days:gap,ready_days:s.r,variant:'streak'});
      else if(gap<Math.max(frac*s.r,minG))overlaps.push({muscle:m,day:s.day,next_day:nx.day,gap_days:gap,ready_days:s.r,variant:'early'})})}
  return {bars,overlaps}}
function presetFor(dt,goal,pid){const P=dt.DMP&&dt.DMP.presets&&dt.DMP.presets[goal];return P&&pid?P[pid]||null:null}
// one entry point: {days:{mon:{day_summary,muscles}}, strip:{bars,overlaps}, source:'preset'|'live'}
function week(dt,days,lv,goal,pid){const P=presetFor(dt,goal,pid);
  if(P){const out={};for(const d of P.days)out[d.day]={day_summary:d.day_summary,exercises:d.exercises,muscles:d.muscles,label:d.label};return {days:out,strip:P.recovery_strip,source:'preset',pid}}
  const out={};for(const d of days)if(d.tiles&&d.tiles.length)out[d.day]=liveDay(dt,d.tiles,lv,goal);return {days:out,strip:liveStrip(dt,days,lv,goal),source:'live'}}
const API={week,liveDay,liveStrip,dial,fband,display,ratio,range,presetFor};
if(isNode)module.exports=API;else root.IMPACT=API})(typeof window!=='undefined'?window:globalThis);
