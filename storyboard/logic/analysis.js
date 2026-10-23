/* Analysis sheet logic (round 1): a line-for-line port of Coach's tools/analysis.py (metrics, sheet, apply_ops, invert_ops)
   and the analytic suggestion sources of tools/suggest.py (lower_fatigue_swap, stretch_share, effective_frequency,
   recovery_vs_baseline, weekly_band). Program-check suggestions come from logic/progcheck.js fixes() (port of check_program.py).
   Types, order and labels come from rules.json suggestions.analysis_sheet; metrics from rules.json analysis_metrics.
   Parity: node test/analysis.diff.js (vs data/analysis-reference.json). Browser: window.ANALYSIS; node: module.exports.
   Models, not measurements. */
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const RANK=isNode?require('./rank.js'):root.RANK,PC=isNode?require('./progcheck.js'):root.PCHECK;
const X=PC._x,{_day,load,col,RULE_OF,total,clone,cmpT,sortBy,fmtPy}=X,pyR=RANK.pyRound,ORDER=PC.ORDER;
const ctx=dt=>X.ctx(dt);
// ---------- ops (analysis.py apply_ops / invert_ops) ----------
function applyOps(days,ops){const nw=clone(days);for(const o of ops){const d=_day(nw,o.day);if(!d)throw new Error('no day '+o.day);const t=d.tiles;
    if(o.op==='swap'){const k=t.findIndex(x=>x.id===o.from_id);t[k]={id:o.to_id,sets:o.sets}}
    else if(o.op==='sets')t.find(x=>x.id===o.id).sets=o.to;
    else if(o.op==='add')t.push({id:o.id,sets:o.sets});
    else if(o.op==='remove')t.splice(t.findIndex(x=>x.id===o.id),1);
    else throw new Error(o.op)}return nw}
function invertOps(ops){const inv={swap:o=>({op:'swap',day:o.day,from_id:o.to_id,to_id:o.from_id,sets:o.sets}),sets:o=>({op:'sets',day:o.day,id:o.id,from:o.to,to:o.from}),
  add:o=>({op:'remove',day:o.day,id:o.id,sets:o.sets}),remove:o=>({op:'add',day:o.day,id:o.id,sets:o.sets})};return ops.slice().reverse().map(o=>inv[o.op](o))}
// ---------- suggest.py helpers ----------
const fat=(dt,i)=>dt.EX[i].fatigue;
const weekCost=(dt,days)=>{let s=0;for(const d of days)for(const t of d.tiles)s+=t.sets*fat(dt,t.id);return s};
function mainMuscle(dt,i){let best=null,bv=-Infinity;for(const [m,v] of Object.entries(dt.EX[i].muscles))if(v>bv){bv=v;best=m}return best}
const spf=(dt,i,m)=>(dt.EX[i].muscles[m]||0)/fat(dt,i);
const MINR=dt=>((dt.targets.counting||{}).min_rating_to_count??0.25);
function stretchShare(dt,days,m){const S=dt.rules.stretch_biased[m]||[],mr=MINR(dt);let t=0,s=0;for(const d of days)for(const x of d.tiles){const r=dt.EX[x.id].muscles[m]||0;if(r<mr)continue;t+=r*x.sets;if(S.includes(x.id))s+=r*x.sets}return [t?s/t:0,t]}
const A=dt=>dt.targets.analytics;
const freq=(dt,days,m)=>days.filter(d=>load(dt,d,m)>=A(dt).frequency_min_effective).length;
function diff(old,nw){const out=[];for(const od of old){const nd=_day(nw,od.day),o=od.tiles,n=nd.tiles;
    if(o.length===n.length){o.forEach((a,k)=>{const b=n[k];if(a.id!==b.id)out.push({op:'swap',day:od.day,from_id:a.id,to_id:b.id,sets:b.sets});else if(a.sets!==b.sets)out.push({op:'sets',day:od.day,id:a.id,from:a.sets,to:b.sets})});continue}
    const os={},ns={};for(const t of o)os[t.id]=t.sets;for(const t of n)ns[t.id]=t.sets;
    for(const i in os){if(!(i in ns))out.push({op:'remove',day:od.day,id:i,sets:os[i]});else if(ns[i]!==os[i])out.push({op:'sets',day:od.day,id:i,from:os[i],to:ns[i]})}
    for(const i in ns)if(!(i in os))out.push({op:'add',day:od.day,id:i,sets:ns[i]})}return out}
function preview(dt,src,p){const SG=dt.rules.suggestions,DN=dt.rules.day_names;p=Object.assign({},p);for(const k of ['day','to_day','from_day'])if(k in p)p[k+'_name']=DN[p[k]]??p[k];
  return fmtPy(p.kind==='swap'&&src==='recovery_vs_baseline'?SG[src].preview_swap:SG[src].preview,p)}
function valid(dt,days,nw,level){const a=X.nonin(PC.check(dt,days,level)[0]),b=X.nonin(PC.check(dt,nw,level)[0]);for(const k of b)if(!a.has(k))return false;return true}
function pack(dt,a,p,pv,nw,days,resolves,before,after){const params={};for(const [k,v] of Object.entries(p))if(!k.endsWith('name'))params[k]=v;
  return {action:a,params,preview:pv,resolves,metric:{before:pyR(before,3),after:pyR(after,3)},diff:diff(days,nw),days:nw}}
const notResolvesFirst=fx=>sortBy(fx,x=>[x.resolves?0:1]);
// ---------- analytic sources ----------
function lowerFatigueCandidates(dt,cur){const m=mainMuscle(dt,cur),r=dt.EX[cur].muscles[m],p=dt.PAT[cur],out=[];
  for(const [i,e] of Object.entries(dt.EX)){if(i===cur||e.custom)continue;if(p!==undefined&&dt.PAT[i]!==p)continue;
    const [sc,,cs]=RANK.swapScore(dt,cur,i);if(p===undefined&&cs<0.6)continue;
    if(dt.EX[cur].type!=='isolation'&&e.type==='isolation')continue;
    if((e.muscles[m]||0)<r-0.1||spf(dt,i,m)<=spf(dt,cur,m)+1e-9)continue;out.push([-pyR(spf(dt,i,m),4),-sc,i])}
  out.sort(cmpT);return [out.map(x=>x[2]),m]}
const uniqIds=days=>[...new Set(days.flatMap(d=>d.tiles.map(t=>t.id)))];
function sLowerFatigue(dt,days,level){const res=[],DN=dt.rules.day_names;
  for(const cur of uniqIds(days)){const [cands,m]=lowerFatigueCandidates(dt,cur);if(!cands.length)continue;const fx=[];
    for(const c of cands.slice(0,8)){const nw=clone(days),hit=[];for(const d of nw){if(d.tiles.some(t=>t.id===c))continue;for(const t of d.tiles)if(t.id===cur){t.id=c;hit.push(d.day)}}
      if(!hit.length||!valid(dt,days,nw,level))continue;const b=weekCost(dt,days),a=weekCost(dt,nw);if(a>=b)continue;
      const p={target:cur,criteria:'lower_fatigue',days:hit,name:dt.EX[cur].name,new_name:dt.EX[c].name,day:hit[0],day_list:hit.map(x=>DN[x]).join(', '),
        spf_from:spf(dt,cur,m).toFixed(2),spf_to:spf(dt,c,m).toFixed(2),muscle:m.replace(/_/g,' ')};
      fx.push(pack(dt,'swap_exercise',p,preview(dt,'lower_fatigue_swap',p),nw,days,true,b,a));break}
    res.push({target:{exercise:cur,muscle:m},fixes:fx})}return res}
function sStretchShare(dt,days,level){const res=[],thr=A(dt).stretch_share_flag_below,STRB=dt.rules.stretch_biased,N=Object.keys(dt.EX).length;
  for(const m of Object.keys(STRB)){const [sh,tot]=stretchShare(dt,days,m);if(tot<=0||sh>=thr)continue;const fx=[];
    const tiles=[];for(const d of days)d.tiles.forEach((t,i)=>{if((dt.EX[t.id].muscles[m]||0)>=0.5&&!STRB[m].includes(t.id))tiles.push([t.sets*(dt.EX[t.id].muscles[m]||0),d.day,i])});
    const ts=sortBy(tiles,x=>[-x[0],ORDER.indexOf(x[1]),x[2]]);let best=null;
    for(const [,dn,i] of ts){const cur=_day(days,dn).tiles[i].id;
      for(const c of RANK.swaps(dt,cur,N)){const ci=c.id;if(!STRB[m].includes(ci)||dt.EX[ci].custom)continue;const [,sp,cs]=RANK.swapScore(dt,cur,ci);if(!(sp||cs>=0.6))continue;
        if(_day(days,dn).tiles.some(x=>x.id===ci))continue;const nw=clone(days);_day(nw,dn).tiles[i].id=ci;const a=stretchShare(dt,nw,m)[0];
        if(a<=sh||!valid(dt,days,nw,level))continue;const p={target:cur,criteria:'stretch_biased',muscle:m,name:dt.EX[cur].name,new_name:dt.EX[ci].name,day:dn};
        const cand=pack(dt,'swap_exercise',p,preview(dt,'stretch_share',Object.assign({},p,{kind:'swap'})),nw,days,a>=thr,sh,a);
        if(cand.resolves){best=cand;break}best=best||cand}
      if(best&&best.resolves)break}
    if(best)fx.push(best);
    for(const [a_,p,nw] of X.gAddExercise(dt,days,m,true)){const a=stretchShare(dt,nw,m)[0];if(a<=sh||!valid(dt,days,nw,level))continue;fx.push(pack(dt,a_,p,X.prev(dt,a_,p),nw,days,a>=thr,sh,a));break}
    res.push({target:{muscle:m,share:pyR(sh,3)},fixes:notResolvesFirst(fx)})}return res}
function sEffectiveFrequency(dt,days,level){const res=[],fme=A(dt).frequency_min_effective;if(days.length<2)return res;
  for(const m of dt.rules.frequency_muscles){const f0=freq(dt,days,m);if(f0>=2)continue;
    let sdD=days[0];for(const d of days)if(load(dt,d,m)>load(dt,sdD,m))sdD=d;const src=sdD.day;
    const rank=n=>{const i=ORDER.indexOf(n),nb=new Set([i-1,i+1].filter(j=>j>=0&&j<7).map(j=>ORDER[j]));
      const adj=days.some(d=>nb.has(d.day)&&d.day!==n&&load(dt,d,m)>=fme);return [adj?1:0,load(dt,_day(days,n),m),total(_day(days,n)),ORDER.indexOf(n)]};
    const targets=sortBy(days.filter(d=>d.day!==src&&load(dt,d,m)<fme).map(d=>d.day),rank);const fx=[];const sd=_day(days,src);
    const tiles=sortBy(sd.tiles.map((_,i)=>i),i=>[-sd.tiles[i].sets*(dt.EX[sd.tiles[i].id].muscles[m]||0)]);let done=false;
    for(const i of tiles){const t=sd.tiles[i];if((dt.EX[t.id].muscles[m]||0)<0.5)continue;
      for(const to of targets){for(let k=2;k<t.sets-1;k++){const nw=clone(days);_day(nw,src).tiles[i].sets-=k;const tl=_day(nw,to).tiles,ex=tl.filter(x=>x.id===t.id);
          if(ex.length){if(ex[0].sets+k>5)continue;ex[0].sets+=k}else tl.push({id:t.id,sets:k});
          const f1=freq(dt,nw,m);if(f1<=f0||!valid(dt,days,nw,level))continue;
          const p={target:t.id,sets:k,day:src,to_day:to,muscle:m,name:dt.EX[t.id].name};fx.push(pack(dt,'move_sets_to_day',p,X.prev(dt,'move_sets_to_day',p),nw,days,f1>=2,f0,f1));done=true;break}
        if(done)break}
      if(done)break}
    for(const [a_,p,nw] of X.gAddExercise(dt,days,m,false,src)){const f1=freq(dt,nw,m);if(f1<=f0||!valid(dt,days,nw,level))continue;fx.push(pack(dt,a_,p,X.prev(dt,a_,p),nw,days,f1>=2,f0,f1));break}
    res.push({target:{muscle:m,days:f0},fixes:notResolvesFirst(fx)})}return res}
function sRecovery(dt,days,level,baseline,modifier=1.0){if(!baseline)return [];const rr=dt.rules.rules.find(r=>r.id==='recovery_vs_baseline'),goal=rr.info_above,DN=dt.rules.day_names;
  const pct=d=>weekCost(dt,d)*modifier/baseline,p0=pct(days);if(p0<=goal)return [];const fx=[];
  let nw=clone(days);const steps=new Map(),blocked=new Set();
  while(pct(nw)>goal){const c=[];for(const d of nw)d.tiles.forEach((t,i)=>{if(t.sets>2&&!blocked.has(d.day+'|'+i))c.push([-(t.sets*fat(dt,t.id)),-fat(dt,t.id),ORDER.indexOf(d.day),i,d.day])});
    if(!c.length)break;c.sort(cmpT);const [,,,i,dn]=c[0];const tr=clone(nw);_day(tr,dn).tiles[i].sets-=1;
    if(!valid(dt,days,tr,level)){blocked.add(dn+'|'+i);continue}nw=tr;const k=dn+'|'+i;steps.set(k,(steps.get(k)||0)+1)}
  if(steps.size){const parts=[...steps.keys()].map(k=>{const [dn,i]=[k.split('|')[0],+k.split('|')[1]];const t0=_day(days,dn).tiles[i];return `${dt.EX[t0.id].name} on ${DN[dn]} ${t0.sets}→${_day(nw,dn).tiles[i].sets}`});
    const p={target:'highest_fatigue',sets:[...steps.values()].reduce((a,b)=>a+b,0),n:steps.size,parts:parts.join('; ')};
    fx.push(pack(dt,'reduce_sets',p,preview(dt,'recovery_vs_baseline',Object.assign({},p,{kind:'trim'})),nw,days,pct(nw)<=goal,p0,pct(nw)))}
  nw=clone(days);const sw=[];const ids=uniqIds(days),tot=i=>days.reduce((a,d)=>a+d.tiles.filter(t=>t.id===i).reduce((b,t)=>b+t.sets,0),0);
  for(const cur of sortBy(ids,i=>[-fat(dt,i),-tot(i),i])){if(pct(nw)<=goal)break;
    for(const c of lowerFatigueCandidates(dt,cur)[0].slice(0,8)){const tr=clone(nw);let hit=0;for(const d of tr){if(d.tiles.some(t=>t.id===c))continue;for(const t of d.tiles)if(t.id===cur){t.id=c;hit++}}
      if(hit&&valid(dt,days,tr,level)&&pct(tr)<pct(nw)){nw=tr;sw.push(`${dt.EX[cur].name} → ${dt.EX[c].name}`);break}}}
  if(sw.length){const p={target:'lower_fatigue',n:sw.length,parts:sw.join('; ')};fx.push(pack(dt,'swap_exercise',p,preview(dt,'recovery_vs_baseline',Object.assign({},p,{kind:'swap'})),nw,days,pct(nw)<=goal,p0,pct(nw)))}
  return [{target:{pct:pyR(p0*100)},fixes:notResolvesFirst(fx)}]}
function sWeeklyBand(dt,days,level){const res=[],{T,LF}=ctx(dt),week=PC.check(dt,days,level)[1];
  for(const [m,x] of Object.entries(week)){const lo=Math.max(0.5,pyR(T[m].min*LF[level]*2)/2),hi=T[m].max;if((lo<=x&&x<=hi)||col(dt,m,x,level)==='R')continue;
    const under=x<lo,dist=v=>under?lo-v:v-hi;const gens=under?[X.gAddSets(dt,days,m),X.gAddExercise(dt,days,m)]:[X.gReduceSets(dt,days,null,'highest_contributor',m)];const fx=[];
    for(const g of gens){let best=null,n_=0;for(const [a_,p,nw] of g){if(n_++>200)break;const v=PC.eff(dt,nw.flatMap(d=>d.tiles))[m];
        if(dist(v)>=dist(x)-1e-9||!valid(dt,days,nw,level))continue;const c=pack(dt,a_,p,X.prev(dt,a_,p),nw,days,dist(v)<=0,x,v);if(c.resolves){best=c;break}best=best||c}
      if(best)fx.push(best)}
    res.push({target:{muscle:m,sets:pyR(x,1),side:under?'under':'over'},fixes:notResolvesFirst(fx).slice(0,3)})}return res}
const ANALYTIC=[['lower_fatigue_swap',sLowerFatigue],['stretch_share',sStretchShare],['effective_frequency',sEffectiveFrequency],['recovery_vs_baseline',sRecovery],['weekly_band',sWeeklyBand]];
// suggest.py suggest(): {source_id: [{target, fixes}]} as an ordered list of [source, items]
function suggest(dt,days,level,baseline=null){const out=new Map(),add=(k,v)=>{if(!out.has(k))out.set(k,[]);out.get(k).push(...v)};
  for(const f of PC.check(dt,days,level)[0]){const rid=RULE_OF(f[1]);add(rid,[{target:{flag:f.slice()},fixes:PC.fixes(dt,days,level,f).map(x=>Object.assign({},x,{diff:diff(days,x.days)}))}])}
  for(const [sid,fn] of ANALYTIC){const r=fn(dt,days,level,baseline);if(r.length)add(sid,r)}return out}
// ---------- analysis.py sheet ----------
const types=dt=>((dt.rules.suggestions||{}).analysis_sheet||{}).types||[];
function typeOf(dt,source,item,level){const {T,LF}=ctx(dt),tg=item.target||{},flag=tg.flag;
  for(const ty of types(dt)){if(!ty.sources.includes(source))continue;
    if(ty.id==='add_sets_under_target'||ty.id==='trim_sets_over_target'){const under=flag?flag[3]<pyR(T[flag[2]].min*LF[level]*2)/2:tg.side==='under';if((ty.id==='add_sets_under_target')!==under)continue}
    return ty.id}return 'program_check'}
// json.dumps(obj, sort_keys=True) for the tie-break (Python separators)
function pyDumps(v){if(v===null||v===undefined)return 'null';if(Array.isArray(v))return '['+v.map(pyDumps).join(', ')+']';
  if(typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+': '+pyDumps(v[k])).join(', ')+'}';if(typeof v==='boolean')return v?'true':'false';return JSON.stringify(v)}
function sheet(dt,days,level,baseline=null){const res=suggest(dt,days,level,baseline),order=types(dt).map(t=>t.id),out=[],mx=(dt.rules.suggestions.analysis_sheet||{}).max_fixes_per_suggestion||3;
  for(const [src,items] of res)for(const it of items){const flag=(it.target||{}).flag,sev=flag?flag[0]:'suggest';
    out.push({type:typeOf(dt,src,it,level),source:src,severity:sev,target:it.target,fixes:it.fixes.slice(0,mx).map(f=>({preview:f.preview,resolves:f.resolves,diff:f.diff,days:f.days}))})}
  const rank={warn:0,suggest:1,info:2};
  return sortBy(out,s=>[rank[s.severity]??1,order.includes(s.type)?order.indexOf(s.type):99,pyDumps(s.target)])}
// ---------- analysis.py metrics ----------
function checksPass(dt,days,level){const ids=dt.rules.rules.map(r=>r.id),fl=PC.check(dt,days,level)[0],failing=new Set(fl.filter(f=>f[0]!=='info').map(f=>RULE_OF(f[1])));
  return {pass:ids.filter(r=>!failing.has(r)).length,total:ids.length,failing:[...failing].sort()}}
const mpOrder=dt=>((dt.rules.movement_patterns||{}).order)||[];
function metrics(dt,days,level){const [,week]=PC.check(dt,days,level),train=days.filter(d=>d.tiles.length),R=dt.rules;
  const allsets=days.reduce((a,d)=>a+total(d),0),mins=train.map(d=>PC.sessionMinutes(dt,d.tiles)),regions={};
  for(const [m,x] of Object.entries(week)){const r=R.body_regions.muscles[m];if(r)regions[r]=pyR((regions[r]||0)+x,2)}
  const mp={};for(const d of days)for(const t of d.tiles){const k=dt.EX[t.id].movement_pattern;mp[k]=(mp[k]||0)+t.sets}
  const share=pred=>{if(!allsets)return 0;let s=0;for(const d of days)for(const t of d.tiles)if(pred(dt.EX[t.id]))s+=t.sets;return pyR(s/allsets,4)};
  const sbs={};for(const m of Object.keys(R.stretch_biased)){const [sh,tot]=stretchShare(dt,days,m);if(tot>0)sbs[m]=pyR(sh,4)}
  const mps={};for(const k of mpOrder(dt))if(k in mp)mps[k]=mp[k];
  const dens={};for(const d of train)dens[d.day]=pyR(total(d)/(PC.sessionMinutes(dt,d.tiles)/60),2);
  return {checks_pass:checksPass(dt,days,level),week_sets_total:allsets,avg_session_minutes:mins.length?pyR(mins.reduce((a,b)=>a+b,0)/mins.length,1):0,
    stretch_biased_share:sbs,weekly_sets_per_region:regions,movement_pattern_sets:mps,
    lengthened_bias_share:share(e=>(e.swap||{}).stretch_emphasis===3),unilateral_share:share(e=>((e.swap||{}).flags||[]).includes('unilateral')),session_density:dens}}
// the metric catalogue (rules.json analysis_metrics), grouped and ordered by category
function catalogue(dt){const AM=dt.rules.analysis_metrics||{categories:[],metrics:[]};
  return AM.categories.map(c=>Object.assign({},c,{metrics:AM.metrics.filter(m=>m.category===c.id)}))}
const API={applyOps,invertOps,diff,suggest,sheet,metrics,checksPass,catalogue,typeOf,weekCost,stretchShare,lowerFatigueCandidates,pyDumps};
if(isNode)module.exports=API;else root.ANALYSIS=API;
})(typeof window!=='undefined'?window:this);
