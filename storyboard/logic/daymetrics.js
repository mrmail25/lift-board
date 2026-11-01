/* vol10 Plan day card metrics (volume-model.json day_metrics; rules wasted_late_sets). Per muscle per workout day:
     stimulus      = sum of sets x credit (face value, no decay), so the days add up to the weekly value
     fatigue       = load points: sets x per-set fatigue (PC.loadPoints) x rating share (rating / sum of the exercise's ratings >= 0.25)
     recovery_h    = per-set recovery hours (ANALYSIS.sessionHours), shown as a day range
     sfr           = stimulus / fatigue; sfr_index = round(100 x sfr / day_metrics.sfr.benchmark_sfr); zone from day_metrics.sfr.zones
     sfr_pct_of_preset_avg = 100 x sfr / (week stimulus / week fatigue)
     stimulus_per_set, stimulus_per_min (minutes = sets x (work + rest by type) x rating share), per_min_vs_benchmark_pct, per_min_pct_of_preset_avg
     session_limit (PC.seLim for the goal), over_limit = max(0, stimulus - limit), last_set_credit_c = 1/(1+(n-1)/c)
   The day row totals: stimulus = sum over muscles, fatigue index = 100 x day load points / workout.fatigue.reference.points,
   recovery = slowest muscle, S:F index from the day's stimulus / load points. Works in node (module.exports) and the browser (window.DAYMX). */
(function(root){
const isNode=typeof module!=='undefined'&&module.exports;
const PCm=()=>isNode?require('./progcheck.js'):root.PCHECK,ANm=()=>isNode?require('./analysis.js'):root.ANALYSIS;
const r2=(x,n)=>{const f=10**n;return Math.round((x+Math.sign(x)*1e-12)*f)/f};
const DM=dt=>(dt.VM||{}).day_metrics||null,DM0=dt=>DM(dt)||{};
function rshare(e,m){let s=0;for(const v of Object.values(e.muscles))if(v>=0.25)s+=v;const r=e.muscles[m]||0;return r>=0.25&&s>0?r/s:0}
function cOf(dt,m,lv){const cb=((dt.VM||{}).session||{}).c_by_level;return cb&&cb[lv]&&cb[lv][m]}
function sfrZone(dt,idx){const Z=((DM(dt)||{}).sfr||{}).zones||[];for(const z of Z){if(z.below!=null&&idx<z.below)return z.id;if(z.above!=null&&idx>z.above)return z.id;if(z.from!=null&&idx>=z.from&&(z.to==null||idx<=z.to))return z.id}return null}
// raw per-muscle sums for one day
function dayRaw(dt,tiles,lv){const PC=PCm(),SL=PC.sessP(dt,lv),E=PC.eff(dt,tiles),F={},MN={},NS={};let pts=0,mins=0;
  for(const t of tiles){const e=dt.EX[t.id];if(!e)continue;const lp=PC.loadPoints(dt,[t]),tm=t.sets*(SL.work_min_per_set+SL.rest_min_by_type[e.type]);pts+=lp;mins+=tm;
    for(const m of Object.keys(e.muscles)){const sh=rshare(e,m);if(!sh)continue;F[m]=(F[m]||0)+lp*sh;MN[m]=(MN[m]||0)+tm*sh;NS[m]=(NS[m]||0)+t.sets}}
  let stim=0;for(const v of Object.values(E))stim+=v;return {E,F,MN,NS,pts,mins,stim}}
function week(dt,days,lv){let s=0,f=0,mn=0;for(const d of days){if(!d.tiles.length)continue;const R=dayRaw(dt,d.tiles,lv);s+=R.stim;f+=R.pts;mn+=R.mins}return {stim:s,fatigue:f,minutes:mn,sfr:f>0?s/f:null,per_min:mn>0?s/mn:null}}
function muscle(dt,R,H,m,lv,W){const PC=PCm(),D=DM(dt)||{},s=R.E[m]||0,f=R.F[m]||0,mn=R.MN[m]||0,lim=PC.seLim(dt,m,lv),c=cOf(dt,m,lv);
  const sfr=f>0?s/f:null,idx=sfr!=null&&(D.sfr||{}).benchmark_sfr?Math.round(100*sfr/D.sfr.benchmark_sfr):null,spm=mn>0?s/mn:null;
  return {m,stimulus:r2(s,2),fatigue:r2(f,2),recovery_h:H[m]!=null?Math.round(H[m]):null,sfr:sfr!=null?r2(sfr,2):null,sfr_index:idx,sfr_zone:idx!=null?sfrZone(dt,idx):null,
    sfr_pct_of_preset_avg:sfr!=null&&W&&W.sfr?Math.round(100*sfr/W.sfr):null,stimulus_per_set:R.NS[m]?r2(s/R.NS[m],2):null,stimulus_per_min:spm!=null?r2(spm,3):null,
    per_min_vs_benchmark_pct:spm!=null&&(D.stimulus_per_min||{}).benchmark_per_min?Math.round(100*spm/D.stimulus_per_min.benchmark_per_min):null,per_min_pct_of_preset_avg:spm!=null&&W&&W.per_min?Math.round(100*spm/W.per_min):null,
    session_limit:lim,over_limit:lim!=null?r2(Math.max(0,s-lim),2):0,last_set_credit_c:c&&s>0?r2(1/(1+(s-1)/c),2):null,fatigue_index_share:null}}
// one day: totals for the card row + per-muscle rows (muscles with >= 0.5 effective sets, largest first)
function day(dt,tiles,lv,days){if(!dt||!dt.VM||!tiles||!tiles.length)return null;const PC=PCm(),R=dayRaw(dt,tiles,lv),H=ANm().sessionHours(dt,tiles,lv)||{},W=days?week(dt,days,lv):null,REF=(((dt.VM.workout||{}).fatigue||{}).reference||{}).points,D=DM(dt)||{};
  const EX=days&&PC.exemptSet?PC.exemptSet(dt,days,lv):new Set();const ms=Object.keys(R.E).filter(m=>R.E[m]>=0.5).sort((a,b)=>R.E[b]-R.E[a]).map(m=>{const o=muscle(dt,R,H,m,lv,W);o.fatigue_index_share=REF?Math.round(100*o.fatigue/REF):null;o.over=PC.seOver(o.stimulus,o.session_limit);o.late=o.over?PC.lateSets(dt,tiles,m,o.session_limit):[];o.exempt=EX.has(m)&&o.over;return o});
  const sfr=R.pts>0?R.stim/R.pts:null,idx=sfr!=null&&(D.sfr||{}).benchmark_sfr?Math.round(100*sfr/D.sfr.benchmark_sfr):null;let rec=0;for(const o of ms)if(o.recovery_h>rec)rec=o.recovery_h;
  return {stimulus:r2(R.stim,2),fatigue_points:r2(R.pts,2),fatigue_index:REF?Math.round(100*R.pts/REF):null,recovery_h:rec,sfr:sfr!=null?r2(sfr,2):null,sfr_index:idx,sfr_zone:idx!=null?sfrZone(dt,idx):null,
    over_limit:r2(ms.reduce((a,o)=>a+(o.over_limit||0),0),2),over_warn:r2(ms.reduce((a,o)=>a+(o.exempt||!o.over?0:(o.over_limit||0)),0),2),n_over:ms.filter(o=>o.over&&!o.exempt).length,muscles:ms}}
// ---- vol10b indexes (volume-model.json day_metrics.reference / stimulus_index / fatigue_index / sf_ratio). Stimulus and fatigue are
// indexed against the SAME reference: the median intermediate day of the same day type (reference.by_day_type, label -> day_type_map)
// on the card, the median intermediate muscle-day for that muscle (reference.by_muscle) in the sheet. sf_ratio = round(si / fi, 2)
// from the two rounded whole-number indexes, so the display divides exactly. A day whose label is not in day_type_map has no day-level
// index (muscle-level only). The vol10 sfr_index and its 80/120 zones are retired (day_metrics.retired).
// vol10c: the reference is swappable. Read reference.sources[reference.source]; only a populated source is used (classic_programs is an
// empty placeholder). No populated source -> {} and the card/sheet simply show no indexes (raw units only). Older data without
// .sources falls back to the mirrored reference.by_day_type / by_muscle.
const REFD=dt=>{const R=(DM(dt)||{}).reference||{};if(!R.sources)return R;const S=R.sources[R.source];
  if(!S||S.populated===false||!S.by_day_type||!S.by_muscle)return {};return Object.assign({day_type_map:R.day_type_map},S)};
const dayType=(dt,label)=>((REFD(dt).day_type_map)||{})[label]||null;
function band(dt,x){if(x==null)return null;for(const b of (((DM(dt)||{}).sf_ratio||{}).bands)||[]){if(b.below!=null&&x<b.below)return b.id;if(b.above!=null&&x>b.above)return b.id;if(b.from!=null&&x>=b.from&&(b.to==null||x<=b.to))return b.id}return null}
function idx(dt,ref,stim,pts,rec_h){if(!ref||!ref.stimulus_eff_sets||!ref.fatigue_points)return null;const si=Math.round(100*stim/ref.stimulus_eff_sets.median),fi=Math.round(100*pts/ref.fatigue_points.median),ratio=fi>0?r2(si/fi,2):null;
  return {stimulus_index:si,stimulus_eff_sets:r2(stim,1),fatigue_index:fi,fatigue_points:r2(pts,2),recovery_days:rec_h!=null?(isNode?require('./rank.js'):root.RANK).pyRound(rec_h/24,1):null,sf_ratio:ratio,sf_band:band(dt,ratio)}}
const dfmt=x=>String(+(+x).toFixed(1));
function display(dt,o){if(!o)return '';const t=((DM(dt)||{}).sf_ratio||{}).display||'Stimulus {si} ({eff} effective sets) / Fatigue {fi} (~{days} days to recover) = {ratio}x typical';
  let s=t.replace('{si}',o.stimulus_index).replace('{eff}',(+o.stimulus_eff_sets).toFixed(1)).replace('{fi}',o.fatigue_index).replace('{ratio}',o.sf_ratio!=null?o.sf_ratio.toFixed(2):'–');
  return o.recovery_days==null?s.replace(/\(~\{days\} days to recover\)/,'(recovery not given)'):s.replace('{days}',dfmt(o.recovery_days))}
// card + sheet payload: {label, day_type, day:{…index fields}|null, muscles:{m:{…}}} plus the vol10 per-muscle rows (day())
function dayIdx(dt,tiles,lv,days,label){const M=day(dt,tiles,lv,days);if(!M)return null;const R=REFD(dt),ty=dayType(dt,label),H=ANm().sessionHours(dt,tiles,lv)||{};
  let rec=null;for(const m in H)if(H[m]>0&&(rec==null||H[m]>rec))rec=H[m];const raw=dayRaw(dt,tiles,lv);
  M.label=label||null;M.day_type=ty;M.idx=ty&&R.by_day_type?idx(dt,R.by_day_type[ty],raw.stim,raw.pts,rec||0):null;
  for(const o of M.muscles){const h=H[o.m]!=null?H[o.m]:0;o.idx=R.by_muscle?idx(dt,R.by_muscle[o.m],raw.E[o.m]||0,raw.F[o.m]||0,h):null}
  M.idxAll={};for(const m of Object.keys(raw.E))if((raw.E[m]||0)>0&&R.by_muscle&&R.by_muscle[m])M.idxAll[m]=idx(dt,R.by_muscle[m],raw.E[m],raw.F[m]||0,H[m]!=null?H[m]:0);
  return M}
const API={day,dayIdx,idx,band,display,dayType,week,dayRaw,muscle,sfrZone,rshare};
if(isNode)module.exports=API;else root.DAYMX=API;
})(typeof window!=='undefined'?window:globalThis);
