/* PR detection (round 2, Log detail + edit): a line-for-line port of Coach's tools/prs.py detect_prs (v29 D.1 tie rule,
   rules.json logger.prs) and the parts of tools/loads.py (available_loads) that step_kg needs. Reuses progress.js flatten
   (same port of prs.py flatten). Everything compared in kg; e1RM = rules logger.e1rm_formula, sets with reps <= e1rm_max_reps only.
   Parity: node test/prs.diff.js (vs data/prs-reference.json and data/prs-tie-reference.json). Browser: window.PRS; node: module.exports. */
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const PG=isNode?require('./progress.js'):root.PROGRESS,RANK=isNode?require('./rank.js'):root.RANK;
const pyR=RANK.pyRound,EPS=1e-6,TYPES=['weight','set_volume','e1rm','reps_at_load'];
const PLATE_EQ=['barbell','trap bar','smith machine','landmine','plate-loaded machine'],STACK_EQ=['machine','cable'],LIST_EQ=['dumbbell','kettlebell'];
const r6=v=>pyR(v+0,6);
// ---------- loads.py ----------
function subsetSums(items){let sums=new Set([0]);for(const [w,c] of items){const nxt=new Set(sums);for(const s of sums)for(let k=1;k<=Math.trunc(c);k++)nxt.add(r6(s+w*k));sums=nxt}return sums}
const platesOf=(p,micro=true)=>[...(p.plates||[]),...(micro?(p.microplates||[]):[])].map(x=>[+x.weight,Math.trunc(x.pairs)]);
const baseOf=(p,eq,id)=>{const ov=(p.bar_by_exercise||{})[id];return ov!=null?+ov:+((p.bars||{})[eq]||0)};
function stackOf(p,eq,id){const st=p.stacks||{},s=st[id]||st[eq];if(!s)return null;const w='weights' in s?s.weights.map(Number):Array.from({length:Math.trunc(s.count)},(_,i)=>r6(s.start+i*s.step));
  const add=(s.add_ons||[]).map(a=>[+a,1]),sums=add.length?subsetSums(add):new Set([0]),o=new Set();for(const x of w)for(const a of sums)o.add(r6(x+a));return [...o].sort((a,b)=>a-b)}
function availableLoads(p,eq,id){
  if(PLATE_EQ.includes(eq)){if(!(p.plates&&p.plates.length))return null;const b=baseOf(p,eq,id);
    if(eq==='landmine')return [...new Set([...subsetSums(platesOf(p).map(([w,c])=>[w,2*c]))].map(s=>r6(b+s)))].sort((a,c)=>a-c);
    return [...new Set([...subsetSums(platesOf(p))].map(s=>r6(b+2*s)))].sort((a,c)=>a-c)}
  if(LIST_EQ.includes(eq)){const l=p[eq==='dumbbell'?'dumbbells':'kettlebells'];return l&&l.length?[...new Set(l.map(x=>r6(+x)))].sort((a,b)=>a-b):null}
  if(STACK_EQ.includes(eq))return stackOf(p,eq,id);return null}
// ---------- prs.py ----------
function ctx(dt){const LG=dt.rules.logger;return {LG,lb:LG.lbPerKg||2.20462,mx:LG.e1rm_max_reps,formula:LG.e1rm_formula||'epley',set_tags:LG.set_tags||{},load_step:LG.load_step||{},
  flat:(dt.rules.review||{}).flat_pct??1,sf:((LG.prs||{}).tie||{}).step_fraction??0.5}}
const E1={epley:(w,r)=>w*(1+r/30),brzycki:(w,r)=>w*36/(37-r)};
const toKg=(v,u,C)=>v==null||v===''?0:(u==='lb'?+v/C.lb:+v);
const prSet=x=>x.kind==='working'&&x.reps>0;
const prOk=(x,k,C)=>{if(!prSet(x))return false;const t=x.tag;return !(t&&((C.set_tags[t]||{}).pr_exclude||[]).includes(k))};
function stepKg(dt,x,unit,C,profile){const eq=((dt.EX[x.ex]||{}).equipment)||'default';
  if(profile==null)profile=(C.LG.gym_profile_default||{})[unit];
  if(profile){let av=null;try{av=availableLoads(profile,eq,x.ex)}catch(e){av=null}
    if(av&&av.length>1){const pu=profile.unit||unit,v=x.added_kg*(pu==='lb'?C.lb:1);let i=0;for(let k=1;k<av.length;k++)if(Math.abs(av[k]-v)<Math.abs(av[i]-v))i=k;const j=i>0?i:1,g=av[j]-av[j-1];if(g>0)return toKg(g,pu,C)}}
  const st=C.load_step,u=st[unit]||st.lb||{};return toKg(u[eq]??u.default??5,unit in st?unit:'lb',C)}
/** detect(dt, history, {aliases, profile}) -> {sessionId: {exerciseId: {type: {value,set_id,load_kg,reps,set_ids}}}} */
function detect(dt,h,o={}){const C=ctx(dt),e1=(w,r)=>(E1[C.formula]||E1.epley)(w,r),fl=1+C.flat/100,ok=(x,k)=>prOk(x,k,C);
  const d2=Object.assign({},dt,{_lr:undefined,aliases:o.aliases||dt.aliases||{}}),prior={},out={};
  for(const q of PG.flatten(d2,h)){const sid=q.s.id,cur={},unit=q.s.unit||'lb';
    for(const x of q.sets)if(TYPES.some(k=>ok(x,k)))(cur[x.ex]=cur[x.ex]||[]).push(x);
    for(const [ex,xs] of Object.entries(cur)){const P=prior[ex];
      if(P&&P.length){const loaded=k=>P.filter(p=>p.load_kg>EPS&&ok(p,k)),mx=a=>a.length?Math.max(...a):0;
        const bw=mx(loaded('weight').map(p=>p.load_kg)),bv=mx(loaded('set_volume').map(p=>p.load_kg*p.reps)),be=mx(loaded('e1rm').filter(p=>p.reps<=C.mx).map(p=>e1(p.load_kg,p.reps)));
        const hit={};
        for(const x of xs){const L=x.load_kg,r=x.reps,c=[],tol=C.sf*stepKg(dt,x,unit,C,o.profile);
          if(L>EPS){if(ok(x,'weight')&&L>bw+tol+EPS)c.push(['weight',L]);if(ok(x,'set_volume')&&L*r>bv*fl+EPS)c.push(['set_volume',L*r]);
            if(ok(x,'e1rm')&&r<=C.mx&&e1(L,r)>be*fl+EPS)c.push(['e1rm',e1(L,r)])}
          if(ok(x,'reps_at_load')){const hv=P.filter(p=>ok(p,'reps_at_load')&&p.load_kg>=L-(L>EPS?tol:0)-EPS).map(p=>p.reps);if(hv.length&&r>Math.max(...hv))c.push(['reps_at_load',r])}
          for(const [k,v] of c)(hit[k]=hit[k]||[]).push([v,x])}
        if(Object.keys(hit).length){const rec={};
          for(const k of TYPES){if(!hit[k])continue;const [v,x]=hit[k].slice().sort((a,b)=>(b[0]-a[0])||(b[1].load_kg-a[1].load_kg)||(a[1].idx-b[1].idx))[0];
            rec[k]={value:r6(v),set_id:x.id,load_kg:r6(x.load_kg),reps:x.reps,set_ids:hit[k].map(([,y])=>y.id)};
            if(x.bw==='logged'||x.bw==='backfilled')Object.assign(rec[k],{added_kg:r6(x.added_kg),bodyweight_kg:r6(x.bw_kg),bodyweight:x.bw})}
          (out[sid]=out[sid]||{})[ex]=rec}}
      (prior[ex]=prior[ex]||[]).push(...xs)}}
  return out}
/** e1RM of one set in its own unit (null when not eligible: warm-up, 0 reps, reps > maxReps (default logger.e1rm_max_reps), no load). */
function e1rmSet(dt,load,reps,kind='working',maxReps){const C=ctx(dt),mx=maxReps||C.mx;if(kind!=='working'||!(reps>0)||!(+load>0)||reps>mx)return null;return (E1[C.formula]||E1.epley)(+load,reps)}
const API={detect,availableLoads,e1rmSet,stepKg,ctx,TYPES};
if(isNode)module.exports=API;else root.PRS=API;
})(typeof window!=='undefined'?window:globalThis);
