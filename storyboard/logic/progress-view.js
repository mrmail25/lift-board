// Progress dashboard display adapter (piece C, 2026-10-24). The numbers come from Coach's report().dashboard (logic/progress.js,
// parity with tools/progress.py dashboard(), spec data/progress-spec.md §13). Only one thing here is worked out by the storyboard,
// because the dashboard block has no field for it:
// Deload: PROGRESS.isDeloadSession (the one switch) marks deload-only weeks, which the sparkline bridges (no marker, the line joins across).
//   dotSet(): the set behind a dot, for the tooltip "185 × 8 → est. 230": the session's set that gives the dot's value
//             (e1rm: highest estimated 1RM on sets <= 12 reps; load_index: highest load-reps index; best_reps: most reps at
//             bodyweight; hold_s: longest hold). The dot's value and display are Coach's.
// progress7 (spec §15): rows = dashboard.table_rows (one per unique main lift; a shared lift lists its muscles), headline = dashboard.headline,
//   overlay = dashboard.overlay. Display choices added here (none change a number): which % lines are highlighted on a phone: the top
//   D.OVL_TOP lines on the estimated-1RM scale (unit_flag estimated_1rm / load_index) by 3-month change, plus the lowest of them when it is
//   below 0 (a lift going backwards); the rest are drawn muted. Reps and seconds lines (unit_flag reps / seconds) start hidden (hidden_default):
//   they move much faster in % (7 -> 12 reps = +71%) and would flatten every other line on a shared axis; one legend tap shows them, dashed.
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const D={BUCKET_ORDER:['stalled_or_dropping','flat',null,'progressing'],RANGE_DAYS:{'4w':28,'12w':84,all:null},OVL_TOP:3};
const dayMs=864e5,ymd=s=>Date.parse(String(s).slice(0,10)+'T12:00:00Z'),addDays=(s,n)=>new Date(ymd(s)+n*dayMs).toISOString().slice(0,10);
function build(rep,flat,asOf,h){const d=rep.dashboard,PG=isNode?require('./progress.js'):root.PROGRESS;if(!d)return null;const K=d.kpis,mc=K.muscle_counts,muscles={};
  // weeks whose sessions are all deloads (PROGRESS.isDeloadSession, the one switch): their sparkline point is null and the line joins across
  const wkS={};for(const q of flat||[]){const w=PG.weekStart(PG.localDate(q.s.startedAt||q.s.date));(wkS[w]=wkS[w]||[]).push(q.s)}
  const dlOnly=new Set(Object.keys(wkS).filter(w=>wkS[w].every(s=>PG.isDeloadSession(s))));
  for(const [m,x] of Object.entries(d.muscles)){if(!x.trained)continue;const c=x.change||{};
    muscles[m]={main:x.main_lift.id,metric:x.main_lift.metric,label:x.main_lift.label,band:x.band,role:x.colour_role,bucket:x.bucket,stalled:x.stalled,
      change:c.status==='ok'?c.pct:null,change_display:c.status==='ok'?c.pct_display:null,reason:c.status==='ok'?null:c.reason,
      spark:x.sparkline.map(w=>w.value),spark_deload:x.sparkline.map(w=>dlOnly.has(w.week)),avg_rir:x.avg_rir}}
  const ar=K.avg_rir,bo=b=>D.BUCKET_ORDER.indexOf(b===undefined?null:b);
  const rows=(d.table_rows||[]).map(r=>{const m0=r.muscles[0],x=muscles[m0]||{},c=r.change||{},bk=r.muscles.map(m=>(muscles[m]||{}).bucket??null).sort((a,b)=>bo(a)-bo(b))[0];
    return {lift:r.lift,name:r.name,label:r.label,muscles:r.muscles,m:m0,shared:r.shared,metric:r.metric,band:r.band,role:r.colour_role,bucket:bk??null,stalled:r.stalled,
      change:c.status==='ok'?c.pct:null,change_display:c.status==='ok'?c.pct_display:null,reason:c.status==='ok'?null:c.reason,
      spark:(r.sparkline||[]).map(w=>w.value),spark_deload:(r.sparkline||[]).map(w=>dlOnly.has(w.week)),avg_rir:r.avg_rir,avg_rir_by_muscle:r.avg_rir_by_muscle,selection:r.selection}});
  const HL=d.headline||null,OV=d.overlay||{lifts:[]},okL=OV.lifts.filter(o=>o.status==='ok'&&o.points.length);
  const E1=new Set(['estimated_1rm','load_index']),byPct=okL.filter(o=>E1.has(o.unit_flag)).slice().sort((a,b)=>(b.last_pct-a.last_pct)||(a.lift<b.lift?-1:1)),hi=byPct.slice(0,D.OVL_TOP).map(o=>o.lift),low=byPct[byPct.length-1];
  if(low&&low.last_pct<0&&!hi.includes(low.lift))hi.push(low.lift);
  const overlay={window:OV.window,note:OV.note,hi,hidden_default:okL.filter(o=>!E1.has(o.unit_flag)).map(o=>o.lift),lines:OV.lifts.map(o=>({lift:o.lift,name:o.name,muscles:o.muscles,m:o.muscles[0],metric:o.metric,unit_flag:o.unit_flag,status:o.status,reason:o.reason,
    baseline:o.baseline,last_pct:o.last_pct,points:o.points.map(q=>({date:q.date,pct:q.pct,best:q.best})),hi:hi.indexOf(o.lift)}))};
  const headline=HL&&{score:{value:HL.strength_score.value,display:HL.strength_score.display,arrow:HL.strength_score.arrow,n:HL.strength_score.n_lifts,label:HL.strength_score.label,sub:HL.strength_score.sublabel,status:HL.strength_score.status},
    prs:{count:HL.prs_this_month.count,main_lifts:HL.prs_this_month.main_lifts,new_best_sessions:HL.prs_this_month.new_best_sessions,label:HL.prs_this_month.label,sub:HL.prs_this_month.sublabel},
    streak:{current:HL.streak.current,best:HL.streak.best,target:HL.streak.target,target_source:HL.streak.target_source,display:HL.streak.display,label:HL.streak.label},
    mix:{up:HL.muscle_mix.up,holding:HL.muscle_mix.holding,down:HL.muscle_mix.down,insufficient:HL.muscle_mix.insufficient,not_trained:HL.muscle_mix.not_trained,stalled:HL.muscle_mix.stalled_marker,labels:HL.muscle_mix.labels}};
  return {source:'dashboard',window:d.window,rows,headline,overlay,kpi:{prs_30d:K.prs_30d.count,strength_pct:K.strength_change.pct,strength_display:K.strength_change.display,strength_n:K.strength_change.n_lifts,
    strength_sub:K.strength_change.sublabel,buckets:{up:mc.progressing,flat:mc.flat,stalled:mc.stalled_or_dropping,insufficient:mc.insufficient},avg_rir:ar.value,avg_rir_display:ar.display,avg_rir_note:ar.note,avg_rir_status:ar.status,rir_sets:ar.logged_sets},muscles}}
function dotSet(flat,id,metric,sid,e1){const q=(flat||[]).find(q=>q.s.id===sid);if(!q)return null;const xs=q.sets.filter(x=>x.ex===id&&x.kind==='working'&&x.reps>0);if(!xs.length)return null;
  const by=f=>xs.reduce((b,x)=>{const v=f(x);return v!=null&&(b==null||v>b.v)?{x,v}:b},null);
  const b=metric==='e1rm'?by(x=>e1(x.load_kg,x.reps)):metric==='load_index'?by(x=>x.load_kg*(1+x.reps/30)):metric==='best_reps'?(by(x=>Math.abs(x.added_kg)<1e-6?x.reps:null)||by(x=>x.reps)):by(x=>x.reps);
  return b?{added_kg:b.x.added_kg,reps:b.x.reps,unit:q.s.unit||'lb'}:null}
const inRange=(dots,rng)=>{const n=D.RANGE_DAYS[rng];return n==null?dots:dots.filter(d=>d.days_ago<n)};
const API={D,build,dotSet,inRange};
if(isNode)module.exports=API;else root.PVIEW=API;
})(typeof window!=='undefined'?window:globalThis);
