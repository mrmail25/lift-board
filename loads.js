// v29 A: gym profile loads + double-progression jump rule. Exact port of tools/loads.py (rules.json v9 logger.gym_profile_schema,
// logger.gym_profile_default, logger.load_jump, logger.load_step). Pure functions; profile weights are in profile.unit.
// Model, not a measurement: the jump thresholds are coaching choices (data/v29-coach-spec.md, [M]).
const LD_EPS=1e-6,LD_PLATE=['barbell','trap bar','smith machine','landmine','plate-loaded machine'],LD_STACK=['machine','cable'],LD_LIST=['dumbbell','kettlebell'];
const ldR=()=>(typeof RU!='undefined'&&RU&&RU.logger)||{};
const ldLbKg=()=>prRules().lbPerKg;
const ldConv=(v,frm,to)=>v==null?null:frm==to?Number(v):frm=='lb'?Number(v)/ldLbKg():Number(v)*ldLbKg();
const ldr=v=>pyRound(v+0,6);
// items [[weight,maxCount]] -> Map(sum -> combo Map(weight->count)); each weight up to maxCount times; fewest plates wins (first found on ties)
function ldSubsetSums(items){let sums=new Map([[0,new Map()]]);const n=c=>[...c.values()].reduce((a,b)=>a+b,0);
  for(const[w,c]of items){const nxt=new Map(sums);for(const[s,combo]of sums){for(let k=1;k<=Math.trunc(c);k++){const t=ldr(s+w*k),cand=new Map(combo);cand.set(w,(cand.get(w)||0)+k);
      if(!nxt.has(t)||n(cand)<n(nxt.get(t)))nxt.set(t,cand)}}sums=nxt}return sums}
const ldPlates=(p,micro=true)=>(p.plates||[]).map(x=>[Number(x.weight),Math.trunc(x.pairs)]).concat(micro?(p.microplates||[]).map(x=>[Number(x.weight),Math.trunc(x.pairs)]):[]);
function ldBase(p,eq,id){const ov=(p.bar_by_exercise||{})[id];if(ov!=null)return Number(ov);return Number((p.bars||{})[eq]??0)}
function ldStack(p,eq,id){const st=p.stacks||{},s=st[id]||st[eq];if(!s)return null;const w='weights' in s?s.weights.map(Number):Array.from({length:Math.trunc(s.count)},(_,i)=>ldr(s.start+i*s.step));
  const add=(s.add_ons||[]).map(a=>[Number(a),1]),sums=add.length?ldSubsetSums(add):new Map([[0,new Map()]]);const o=new Set();w.forEach(x=>sums.forEach((_,a)=>o.add(ldr(x+a))));return[...o].sort((a,b)=>a-b)}
function availableLoads(p,eq,id){p=p||{};
  if(LD_PLATE.includes(eq)){if(!(p.plates&&p.plates.length))return null;const base=ldBase(p,eq,id);
    if(eq=='landmine'){const sums=ldSubsetSums(ldPlates(p).map(([w,c])=>[w,2*c]));return[...new Set([...sums.keys()].map(s=>ldr(base+s)))].sort((a,b)=>a-b)}
    const sums=ldSubsetSums(ldPlates(p));return[...new Set([...sums.keys()].map(s=>ldr(base+2*s)))].sort((a,b)=>a-b)}
  if(LD_LIST.includes(eq)){const l=p[eq=='dumbbell'?'dumbbells':'kettlebells'];return l&&l.length?[...new Set(l.map(x=>ldr(Number(x))))].sort((a,b)=>a-b):null}
  if(LD_STACK.includes(eq))return ldStack(p,eq,id);return null}
function ldGrid(cur,dir,step){const v=dir>0?Math.floor(cur/step+LD_EPS)*step+step:Math.ceil(cur/step-LD_EPS)*step-step;return dir>0||v>-LD_EPS?ldr(Math.max(v,0)):null}
const ldStep=(eq,u,R)=>{const t=(R||ldR()).load_step[u];return t[eq]??t.default};
function nextRealLoad(current,dir,p,eq,unit,id,R){const pu=(p||{}).unit||unit||'lb',cur=ldConv(current||0,unit||pu,pu),loads=availableLoads(p||{},eq,id);
  if(loads==null){const v=ldGrid(cur,dir,ldStep(eq,pu,R));return v==null||(dir<0&&v<0)?null:v}
  const tol=(unit||pu)!=pu?1e-4:LD_EPS;if(dir>0){const c=loads.filter(x=>x>cur+tol);return c.length?c[0]:null}const c=loads.filter(x=>x<cur-tol);return c.length?c[c.length-1]:null}
function nearestRealLoad(target,p,eq,unit,id,mode='nearest',R){const pu=(p||{}).unit||unit||'lb',t=ldConv(target,unit||pu,pu),loads=availableLoads(p||{},eq,id);
  if(loads==null){const st=ldStep(eq,pu,R),f=mode=='down'?Math.floor:mode=='up'?Math.ceil:Math.round/* = Python floor(v + 0.5) */;return ldr(f(t/st+(mode=='down'?LD_EPS:mode=='up'?-LD_EPS:0))*st)}
  if(mode=='down'){const c=loads.filter(x=>x<=t+LD_EPS);return c.length?c[c.length-1]:loads[0]}
  if(mode=='up'){const c=loads.filter(x=>x>=t-LD_EPS);return c.length?c[0]:loads[loads.length-1]}
  return loads.reduce((b,x)=>{const d=Math.abs(x-t),bd=Math.abs(b-t);return d<bd||(d==bd&&x<b)?x:b})}/* ties -> lighter */
function plateBreakdown(load,p,eq,id){p=p||{};if(!LD_PLATE.includes(eq)||!(p.plates&&p.plates.length))return null;const base=ldBase(p,eq,id),per=eq!='landmine'?2:1;
  const sums=ldSubsetSums(per==2?ldPlates(p):ldPlates(p).map(([w,c])=>[w,2*c]));let ach=0;for(const s of sums.keys())if(base+per*s<=load+LD_EPS&&s>ach)ach=s;
  const combo=sums.get(ldr(ach))||new Map(),side=[];combo.forEach((k,w)=>{for(let i=0;i<k;i++)side.push(w)});side.sort((a,b)=>b-a);const got=ldr(base+per*ach);
  return{bar:base,[per==2?'per_side':'on_sleeve']:side,load:got,exact:Math.abs(got-load)<1e-4}}
// Double progression with real loads (rules.json logger.load_jump). last: working sets of the last completed session [{load,reps,rir}] in `unit`
// (assisted machines: load = assistance). baseLoad = bodyweight part of the effective load (phase B; 0 here). Load out = profile unit.
function suggestNext(last,type,range,tRir,p,eq,unit,id,baseLoad=0,assisted=false,R){R=R||ldR();const J=R.load_jump,[lo,hi]=range,pu=(p||{}).unit||unit;
  const w=last.filter(s=>(s.reps||0)>0);if(!w.length)return{action:'hold',load:null,reps:null,jump_pct:null,reason:'no completed working sets'};
  const loads=w.map(s=>ldConv(s.load||0,unit,pu)),cur=assisted?Math.min(...loads):Math.max(...loads),top=w.filter((s,i)=>Math.abs(loads[i]-cur)<1e-4),minReps=Math.min(...top.map(s=>s.reps));
  const missOk=R.missing_rir_meets_target??true,met=s=>s.rir==null?missOk:s.rir<=tRir;
  if(!w.every(s=>s.reps>=hi&&met(s)))return{action:'hold',load:ldr(cur),reps:null,jump_pct:null,reason:'not every working set reached the top of the range at target RIR: keep the load, beat last time'};
  const nxt=nextRealLoad(cur,assisted?-1:1,p,eq,pu,id,R),cap=hi+J.rep_overshoot;
  if(nxt==null){if(minReps<cap)return{action:'reps',load:ldr(cur),reps:minReps+1,jump_pct:null,reason:'heaviest available load: add a rep'};
    return{action:'max',load:ldr(cur),reps:cap,jump_pct:null,reason:'heaviest available load and rep cap reached: pick a harder variation'}}
  const eff=L=>ldConv(baseLoad,unit,pu)+(assisted?-L:L),den=eff(cur),pct=den>LD_EPS?(eff(nxt)-den)/den*100:Infinity,jp=isFinite(pct)?ldr(pct):null;
  const M=J.max_jump_pct_by_type,mx=M[type]??M[J.unknown_type_uses];
  if(pct<=mx+1e-9)return{action:'load',load:nxt,reps:lo,jump_pct:jp,reason:`next real load is a ${pct.toFixed(1)}% jump (<= ${mx}%)`};
  if(minReps<cap)return{action:'reps',load:ldr(cur),reps:minReps+1,jump_pct:jp,reason:`${isFinite(pct)?`next real load is a ${pct.toFixed(1)}% jump (> ${mx}%)`:'no effective load to compare (no bodyweight logged)'}: add a rep first (up to ${cap})`};
  return{action:'load',load:nxt,reps:lo,jump_pct:jp,reason:`rep cap ${cap} reached: take the jump anyway`}}
