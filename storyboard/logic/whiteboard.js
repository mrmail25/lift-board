/* Port of Coach's tools/whiteboard.py: rep_range(exercise_id, goal) and primary_region(exercise_id), from rules.json rep_ranges and
   body_regions; short_name from exercises.json. Fixtures: data/rep-ranges-reference.json, data/body-regions-reference.json
   (test/whiteboard.diff.js). Browser: window.WHITEBOARD; node: module.exports. dt = RANK.makeData(...) (uses dt.rules, dt.EX). */
(function(root){'use strict';
const ri=x=>Math.floor(x+0.5); // half up, same as rank.py _ri
const goalsOf=g=>g==null?[]:typeof g==='string'?[g]:[...g];
const mk=(low,high,unit,units)=>({low,high,display:`${low}\u2013${high}${units[unit]}`});
function combine(entries,goals,fallback){const votes=goals.filter(g=>g in entries).map(g=>entries[g]);if(!votes.length)return fallback;
  return [ri(votes.reduce((s,v)=>s+v.low,0)/votes.length),ri(votes.reduce((s,v)=>s+v.high,0)/votes.length)]}
function repRange(dt,id,goal){const RR=dt.rules.rep_ranges,e=dt.EX[id],goals=goalsOf(goal);
  for(const g of goals)if(!(g in RR.by_goal))throw new Error('unknown goal '+g);
  let perSide=((e.swap||{}).flags||[]).includes('unilateral');const ov=RR.overrides.find(o=>o.exercises.includes(id));
  if(ov){const unit=ov.unit||'reps';let low,high;
    if(ov.by_goal){const d=ov.by_goal.default,en={};for(const [k,v] of Object.entries(ov.by_goal))if(k!=='default')en[k]=v;[low,high]=combine(en,goals,[d.low,d.high])}
    else{low=ov.range.low;high=ov.range.high}
    if(ov.per_side_all)perSide=true;const ps=(ov.per_side||{})[id];if(ps!==undefined&&ps!==null)perSide=ps;
    return {...mk(low,high,unit,RR.units),unit,per_side:perSide,not_to_failure:!!ov.not_to_failure,source:'override:'+ov.id}}
  const t=e.type,d=RR.default[t],en={};for(const g of Object.keys(RR.by_goal))if(RR.votes[g].includes(t))en[g]=RR.by_goal[g][t];
  const [low,high]=combine(en,goals,[d.low,d.high]);
  return {...mk(low,high,'reps',RR.units),unit:'reps',per_side:perSide,not_to_failure:false,source:'type:'+t}}
const r6=x=>Math.round(x*1e6)/1e6;
function regionScores(dt,id){const M=dt.rules.body_regions.muscles,e=dt.EX[id],top={},tot={};
  for(const [m,v] of Object.entries(e.muscles)){if(v<=0)continue;const r=M[m];top[r]=Math.max(top[r]||0,v);tot[r]=r6((tot[r]||0)+v)}return [top,tot]}
function primaryRegion(dt,id,explain){const B=dt.rules.body_regions,e=dt.EX[id],[top,tot]=regionScores(dt,id);
  if(!Object.keys(top).length){const ut=e.untracked_target,r=ut?B.muscles[ut.filter_muscle]:B.order[B.order.length-1];return explain?[r,'untracked target']:r} // r2fix: no muscle credit -> untracked_target.filter_muscle's region
  const best=Math.max(...Object.values(top));let cand=B.order.filter(r=>top[r]===best),why='top muscle';
  if(cand.length>1){const bs=Math.max(...cand.map(r=>tot[r]));let c2=cand.filter(r=>tot[r]===bs);why='tie: region sum';
    if(c2.length>1){const pr=e.patterns&&e.patterns.length?B.pattern_region[e.patterns[0]]:null;c2=c2.includes(pr)?[pr]:c2;why=cand.includes(pr)&&c2.length===1?'tie: first pattern':'tie: region order'}
    cand=c2}
  return explain?[cand[0],why]:cand[0]}
const shortName=(dt,id)=>{const e=dt.EX[id];return (e&&(e.short_name||e.name))||id};
const API={repRange,regionScores,primaryRegion,shortName};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.WHITEBOARD=API;
})(typeof window!=='undefined'?window:this);
