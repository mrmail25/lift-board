// Progress dashboard display adapter (piece C, 2026-10-24). The numbers come from Coach's report().dashboard (logic/progress.js,
// parity with tools/progress.py dashboard(), spec data/progress-spec.md §13). Only two things here are worked out by the storyboard,
// because the dashboard block has no field for them (swap them here when it does):
//   avgRir(): the KPI tile's average effort = mean RIR over done working sets with RIR logged in the last 28 days, deload sessions
//             excluded (the §7 window and rules, unweighted across muscles; per-muscle values are Coach's effort.avg_rir).
//   dotSet(): the set behind a dot, for the tooltip "185 × 8 → est. 230": the session's set that gives the dot's value
//             (e1rm: highest estimated 1RM on sets <= 12 reps; load_index: highest load-reps index; best_reps: most reps at
//             bodyweight; hold_s: longest hold). The dot's value and display are Coach's.
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const D={RIR_DAYS:28,BUCKET_ORDER:['stalled_or_dropping','flat',null,'progressing'],RANGE_DAYS:{'4w':28,'12w':84,all:null}};
const dayMs=864e5,ymd=s=>Date.parse(String(s).slice(0,10)+'T12:00:00Z'),addDays=(s,n)=>new Date(ymd(s)+n*dayMs).toISOString().slice(0,10);
function avgRir(flat,asOf){const from=addDays(asOf,-D.RIR_DAYS),rs=[];
  for(const q of flat||[]){if(q.s.deload)continue;const d=String(q.s.startedAt||q.s.date).slice(0,10);if(d<=from||d>asOf)continue;for(const x of q.sets)if(x.kind==='working'&&x.reps>0&&x.rir!=null)rs.push(x.rir)}
  return {avg:rs.length?rs.reduce((a,x)=>a+x,0)/rs.length:null,sets:rs.length}}
function build(rep,flat,asOf){const d=rep.dashboard;if(!d)return null;const K=d.kpis,mc=K.muscle_counts,muscles={};
  for(const [m,x] of Object.entries(d.muscles)){if(!x.trained)continue;const c=x.change||{};
    muscles[m]={main:x.main_lift.id,metric:x.main_lift.metric,label:x.main_lift.label,band:x.band,role:x.colour_role,bucket:x.bucket,stalled:x.stalled,
      change:c.status==='ok'?c.pct:null,change_display:c.status==='ok'?c.pct_display:null,reason:c.status==='ok'?null:c.reason,
      spark:x.sparkline.map(w=>w.value),spark_deload:x.sparkline.map(w=>w.deload_week),avg_rir:x.avg_rir}}
  const r=avgRir(flat,asOf);
  return {source:'dashboard',window:d.window,kpi:{prs_30d:K.prs_30d.count,strength_pct:K.strength_change.pct,strength_display:K.strength_change.display,strength_n:K.strength_change.n_lifts,
    strength_sub:K.strength_change.sublabel,buckets:{up:mc.progressing,flat:mc.flat,stalled:mc.stalled_or_dropping,insufficient:mc.insufficient},avg_rir:r.avg,rir_sets:r.sets},muscles}}
function dotSet(flat,id,metric,sid,e1){const q=(flat||[]).find(q=>q.s.id===sid);if(!q)return null;const xs=q.sets.filter(x=>x.ex===id&&x.kind==='working'&&x.reps>0);if(!xs.length)return null;
  const by=f=>xs.reduce((b,x)=>{const v=f(x);return v!=null&&(b==null||v>b.v)?{x,v}:b},null);
  const b=metric==='e1rm'?by(x=>e1(x.load_kg,x.reps)):metric==='load_index'?by(x=>x.load_kg*(1+x.reps/30)):metric==='best_reps'?(by(x=>Math.abs(x.added_kg)<1e-6?x.reps:null)||by(x=>x.reps)):by(x=>x.reps);
  return b?{added_kg:b.x.added_kg,reps:b.x.reps,unit:q.s.unit||'lb'}:null}
const inRange=(dots,rng)=>{const n=D.RANGE_DAYS[rng];return n==null?dots:dots.filter(d=>d.days_ago<n)};
const API={D,build,avgRir,dotSet,inRange};
if(isNode)module.exports=API;else root.PVIEW=API;
})(typeof window!=='undefined'?window:globalThis);
