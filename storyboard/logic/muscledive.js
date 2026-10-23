/* Muscle deep-dive (Round 3): a line-for-line port of Coach's tools/muscle_deepdive.py deepdive(): ONE function returns the
   per-muscle payload (sets vs band, stimulus curve position, frequency per day, stretch, one-side share, recovery cost,
   stimulus per fatigue, contributors, Apply-ready suggestions, ranked adds). Reuses progcheck.js check / eff / col, analysis.js
   breakdowns / sheet / stretchFocused, templates.js band and rank.js (context tray). Spec: data/muscle-deepdive-spec.md.
   Parity: node test/muscledive.diff.js (vs data/muscle-deepdive-reference.json, 4 presets x 19 muscles, abs tol 1e-4).
   Values are models, not measurements. Browser: window.MUSCLEDIVE; node: module.exports. */
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const RANK=isNode?require('./rank.js'):root.RANK,PC=isNode?require('./progcheck.js'):root.PCHECK,AN=isNode?require('./analysis.js'):root.ANALYSIS;
const pyR=RANK.pyRound,_r=(x,n=4)=>pyR(x,n),ORDER=PC.ORDER,DEFAULT_GOALS=['muscle_size'];
const band=(dt,m,level)=>{const T=dt.targets.targets[m],LF=dt.targets.levelMinFactor;return [pyR(T.min*LF[level]*2)/2,T.max]};
const S=(x,k)=>1-Math.exp(-x/k);
function dayEff(dt,days,m){const o={};for(const d of days)if(d.tiles.length)o[d.day]=_r(PC.eff(dt,d.tiles)[m],4);return o}
function curveX(dt,days,m){const sd=dt.targets.curve.session_discount;let x=0;for(const d of days){const v=d.tiles.length?PC.eff(dt,d.tiles)[m]:0;x+=v<=sd.cap?v:sd.cap+(v-sd.cap)*sd.factor}return x}
function status(dt,m,x,level){const [lo]=band(dt,m,level),c=PC._x.col(dt,m,x,level);if(c==='G')return 'in_range';return c==='A'?(x<lo?'under':'over'):(x<lo?'far_under':'far_over')}
// one muscle (or every muscle with m == null): {id, label, short_label, anchor, sets, curve, frequency, stretch, one_side_share,
// recovery_cost, stimulus_per_fatigue, fatigue, contributors, suggestions:{apply, ranked_adds}}
function deepdive(dt,days,level,baseline=null,goals=null,profile=null,only=null,opt={}){goals=goals||DEFAULT_GOALS;profile=profile||dt.rules.equipment_items.example_profiles.commercial;
  const [fl,week]=PC.check(dt,days,level),bd=AN.breakdowns(dt,days).muscle,sheet=opt.sheet||AN.sheet(dt,days,level,baseline),chk=(dt.rules.stretch_check||{}).checked||{};
  const fmin=dt.targets.analytics.frequency_min_effective,labels=((dt.exl.muscle_short_labels||{}).muscles)||{},MR=((dt.targets.counting||{}).min_rating_to_count??0.25),MUS=dt.exl.muscles,BR=dt.rules.body_regions.muscles,out={};
  for(const m of Object.keys(dt.targets.targets)){if(only&&m!==only)continue;
    const [lo,hi]=band(dt,m,level),x=week[m],k=dt.targets.curve.k_by_muscle[m][level],xd=curveX(dt,days,m),perDay=dayEff(dt,days,m),hit=Object.keys(perDay).filter(d=>perDay[d]>=fmin);
    const contrib=new Map();for(const d of days)for(const t of d.tiles){const r=dt.EX[t.id].muscles[m]||0;if(r<MR)continue;
      if(!contrib.has(t.id))contrib.set(t.id,{id:t.id,name:dt.EX[t.id].name,rating:r,sets:0,effective_sets:0,days:[]});const c=contrib.get(t.id);c.sets+=t.sets;c.effective_sets+=t.sets*r;c.days.push({day:d.day,sets:t.sets,effective_sets:_r(t.sets*r)})}
    const cl=[...contrib.values()].sort((a,b)=>(b.effective_sets-a.effective_sets)||(a.id<b.id?-1:a.id>b.id?1:0));for(const c of cl){c.effective_sets=_r(c.effective_sets);c.share=x?_r(c.effective_sets/x):0}
    const b=bd[m]||{},g=key=>key in b?b[key]:null;
    const train=days.filter(d=>d.tiles.length).map(d=>d.day),reg=BR[m];
    const same=days.filter(d=>d.tiles.length&&d.tiles.some(t=>BR[RANK.primaryMuscle(dt.EX[t.id],MUS)]===reg)).map(d=>d.day),pool=same.length?same:train;
    const day=pool.length?pool.slice().sort((a,c)=>((perDay[a]||0)-(perDay[c]||0))||(ORDER.indexOf(a)-ORDER.indexOf(c)))[0]:null;
    const cands=Object.keys(dt.EX).filter(i=>{const e=dt.EX[i];return !e.custom&&RANK.primaryMuscle(e,MUS)===m&&(e.muscles[m]||0)>=0.5});
    const ranked=day?RANK.rank(dt,'tray',cands,{board:days,day},{goals,level,gym_profile:profile},opt.n||5):[];
    const apply=sheet.map((s,i)=>[s,i]).filter(([s])=>{const t=s.target||{};return t.muscle===m||((t.flag||[])[2]===m)}).map(([s,i])=>({type:s.type,source:s.source,severity:s.severity,
      fix:s.fixes.length?{ops:s.fixes[0].diff,preview:s.fixes[0].preview,resolves:s.fixes[0].resolves}:null,_i:i}));
    out[m]={id:m,label:m.replace(/_/g,' '),short_label:labels[m]??null,anchor:`deepdive-${m}`,
      sets:{effective:_r(x,2),level_min:lo,max:hi,red_under_below:lo-2,red_over_above:_r(hi*dt.rules.volume_bands.red_factor,2),status:status(dt,m,x,level),mev_band:[lo,hi],evidence_tag:dt.targets.targets[m].evidence.tag},
      curve:{k,x_after_session_discount:_r(xd),stimulus:_r(S(xd,k)),next_set:_r(S(xd+1,k)-S(xd,k)),ideal_band:[_r(S(lo,k)),_r(S(hi,k))],position:xd<lo-1e-9?'below':xd>hi+1e-9?'above':'in_band'},
      frequency:{days_hit:hit.length,days:hit,effective_by_day:perDay,min_effective_per_day:fmin},
      stretch:{share:g('stretch_share'),checked:m in chk,check_pass:m in chk?!fl.some(f=>f[1]==='missing_stretch'&&f[2]===m):null},
      one_side_share:g('one_side_share'),recovery_cost:g('recovery_cost'),stimulus_per_fatigue:g('stimulus_per_fatigue'),fatigue:g('fatigue'),
      contributors:cl,
      suggestions:{apply,ranked_adds:{day,context:'tray',goals,level,items:ranked.map(r=>({id:r.id,name:r.name,score:r.score,reasons:r.reasons||[],stretch_focused:AN.stretchFocused(dt,r.id)}))}}}}
  return out}
// the board's single entry point: one muscle's payload
const muscle=(dt,days,level,m,opt={})=>deepdive(dt,days,level,opt.baseline??null,opt.goals,opt.profile,m,opt)[m];
const API={deepdive,muscle,DEFAULT_GOALS};
if(isNode)module.exports=API;else root.MUSCLEDIVE=API;
})(this);
