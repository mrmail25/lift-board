/* Program check + one-tap fixes + planning analytics for the Build whiteboard.
   check()/fixes(): line-for-line port of Coach's tools/check_program.py (check, fixes, evaluate, the g_* generators)
   and tools/patterns.py g_fill_slot. Flags are the same tuples as Python: [sev, rule, ...args].
   analytics(): the old app's analytics.js / check.js maths (targets.json curve, session_discount, recovery fatigue cost,
   analytics.frequency_min_effective, rules.json session_length + spinal_load). Every threshold comes from the data.
   Parity: node test/progcheck.diff.js (vs check_program.py). Browser: window.PCHECK; node: module.exports. */
(function(root){'use strict';
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
function sessionMinutes(dt,tiles){const SL=ctx(dt).RU.session_length;let m=SL.warmup_min;for(const t of tiles)m+=t.sets*(SL.work_min_per_set+SL.rest_min_by_type[dt.EX[t.id].type]);return m}
function eff(dt,tiles){const {T}=ctx(dt),v={};for(const m in T)v[m]=0;for(const t of tiles)for(const [m,r] of Object.entries(dt.EX[t.id].muscles))if(r>=0.25&&m in v)v[m]+=t.sets*r;return v}
function slotCounts(dt,days){const {PJ}=ctx(dt),c={};for(const k in PJ.slots)c[k]=0;
  for(const d of days)for(const t of d.tiles){const e=dt.EX[t.id],hit=new Set();for(const s of e.patterns||[]){if(PJ.slots[s].kind==='compound'&&e.type==='isolation')continue;hit.add(s);(PJ.slots[s].counts_toward||[]).forEach(x=>hit.add(x))}hit.forEach(s=>c[s]+=1)}return c}
function patternFlags(dt,days,level){const {PJ}=ctx(dt);if(!days.some(d=>d.tiles.length))return [];const c=slotCounts(dt,days),out=[];
  for(const [s,mn] of Object.entries(PJ.weekly_min_by_level[level])){if(mn<=0||c[s]>=mn)continue;out.push([c[s]===0&&PJ.required.includes(s)?'warn':'info','pattern_gap',s,c[s],mn])}return out}
function col(dt,m,x,level){const {T,LF}=ctx(dt),a=pyR(T[m].min*LF[level]*2)/2,b=T[m].max;if(a<=x&&x<=b)return 'G';if((a-2<=x&&x<a)||(b<x&&x<=b*1.25))return 'A';return 'R'}
// days: [{day:'mon', tiles:[{id,sets}]}] (training days only, any order). Returns [flags, week]
function check(dt,days,level){const {R,RU,T,S,HEAVY}=ctx(dt),PAT=dt.PAT,f=[],week={},freq={};for(const m in T){week[m]=0;freq[m]=0}
  let push=0,pull=0,spw=0;const byday={};days.forEach(d=>byday[d.day]=d);const HS=new Set(R.heavy_squats),HH=new Set(R.heavy_hinges);
  for(const d of days){const n=d.tiles.length,tot=total(d);
    if(n>RU.many_small_entries.min_tiles&&tot/n<RU.many_small_entries.max_avg_sets)f.push(['info','many_small_entries',d.day,n,pyR(tot/n,2)]);
    const hs=RU.session_hard_sets,w=hs.warn_above[level];if(tot>w)f.push(['warn','session_hard_sets',d.day,tot]);else if(tot>w-hs.info_band)f.push(['info','session_hard_sets',d.day,tot]);
    const mins=sessionMinutes(dt,d.tiles),sl=RU.session_length;if(mins>=sl.warn_min)f.push(['warn','session_length',d.day,pyR(mins)]);else if(mins>=sl.info_min)f.push(['info','session_length',d.day,pyR(mins)]);
    let sp=0;for(const t of d.tiles)if(HEAVY.has(t.id))sp+=t.sets;spw+=sp;if(sp>RU.spinal_load.session_warn_above[level])f.push(['warn','spinal_load_session',d.day,sp]);
    const pc=new Map();for(const t of d.tiles){if(t.sets>5)f.push(['warn','sets_per_exercise',d.day,t.id]);const p=PAT[t.id]??null;pc.set(p,(pc.get(p)||0)+1);
      if(R.push_patterns.includes(p))push+=t.sets;if(R.pull_patterns.includes(p))pull+=t.sets}
    for(const [p,c] of pc){if(c<2)continue;const pv=eff(dt,d.tiles.filter(t=>(PAT[t.id]??null)===p));const over=Object.keys(pv).filter(m=>pv[m]>RU.redundant_pattern.threshold);
      if(over.length)f.push(['warn','redundant_pattern',d.day,p,c,over[0],pyR(pv[over[0]],1)])}
    const v=eff(dt,d.tiles);for(const m in v){const x=v[m];week[m]+=x;if(x>=2)freq[m]+=1;if(x>10)f.push(['warn','junk_volume_session',d.day,m,pyR(x,1)])}
    const ids=new Set(d.tiles.map(t=>t.id));if(level==='beginner'&&[...ids].some(i=>HS.has(i))&&[...ids].some(i=>HH.has(i)))f.push(['warn','beginner_squat_and_deadlift',d.day])}
  for(let i=0;i<6;i++){const dd=ORDER[i],a=byday[dd],b=byday[ORDER[i+1]];if(!(a&&b))continue;
    if(a.tiles.some(t=>HH.has(t.id))&&b.tiles.some(t=>HS.has(t.id)))f.push(['warn','hinge_before_squat',dd]);
    const va=eff(dt,a.tiles),vb=eff(dt,b.tiles);for(const m in T)if(va[m]>=S[m].solid&&vb[m]>=S[m].solid)f.push(['warn','consecutive_high_volume',dd,m])}
  if(spw>RU.spinal_load.week_warn_above[level])f.push(['warn','spinal_load_week',spw]);
  if(push===0&&pull>0)f.push(['warn','push_pull_imbalance',99.0]);
  if(push){const r=pull/push;if(r<0.75||r>2.0)f.push(['warn','push_pull_imbalance',pyR(r,2)])}
  const all=new Set(days.flatMap(d=>d.tiles.map(t=>t.id)));
  for(const [m,ids] of Object.entries(R.stretch_biased))if(!ids.some(i=>all.has(i)))f.push(['info','missing_stretch',m]);
  for(const m of R.frequency_muscles)if(freq[m]<2&&days.length>=2)f.push(['info','low_frequency',m,freq[m]]);
  for(const m in week)if(col(dt,m,week[m],level)==='R')f.push(['warn','weekly_volume',m,pyR(week[m],1)]);
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
    for(const c of RANK.swaps(dt,t.id,N)){const k=dt.EX[c.id],e=dt.EX[t.id];
      if(criteria==='stretch_biased'&&!(R.stretch_biased[muscle||pm(dt,t.id)]||[]).includes(c.id))continue;
      if(criteria==='lower_fatigue'&&k.fatigue>=e.fatigue)continue;
      if(criteria==='lower_spinal'&&(HEAVY.has(c.id)||k.muscles.lower_back>=e.muscles.lower_back))continue;
      if(criteria==='same_pattern'&&PAT[c.id]!==PAT[t.id])continue;
      if(d.tiles.some(x=>x.id===c.id))continue;const n=clone(days);_day(n,d.day).tiles[i].id=c.id;
      yield ['swap_exercise',{target:t.id,criteria,name:nm(dt,t.id),new_name:k.name,day:d.day},n]}}}
const RARE_EQ=new Set(['rings','suspension','medicine ball','stability ball']);
function bestFor(dt,days,muscle,stretch=false,patterns=null){const {R}=ctx(dt),PAT=dt.PAT,used=new Set(days.flatMap(d=>d.tiles.map(t=>dt.EX[t.id].equipment)));
  let ref=null;for(const d of days)for(const t of d.tiles){const c=[t.sets*dt.EX[t.id].muscles[muscle],t.id];if(ref===null||cmpT(c,ref)>0)ref=c}if(ref===null)ref=[0,null]; // python max(..., default=(0,None))
  const ok=i=>{const e=dt.EX[i];return (e.muscles[muscle]||0)>=0.75&&['isolation','accessory'].includes(e.type)&&PAT[i]!=='plyometric'&&(!RARE_EQ.has(e.equipment)||used.has(e.equipment))
    &&(!stretch||(R.stretch_biased[muscle]||[]).includes(i))&&(!patterns||patterns.includes(PAT[i]))};
  let c=(R.staples||[]).filter(i=>i in dt.EX&&ok(i));if(!c.length)c=Object.keys(dt.EX).filter(ok);
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
    for(const c of RANK.swaps(dt,t.id,N)){if(PAT[c.id]!==PAT[t.id]||d.tiles.some(x=>x.id===c.id))continue;const n=clone(days),tl=_day(n,day).tiles;tl[i].sets-=mv;tl.splice(i+1,0,{id:c.id,sets:mv});
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
  if(rid==='junk_volume_session'){const [d,m]=[f[2],f[3]];return [gReduceSets(dt,days,d,'highest_contributor',m),gMoveSets(dt,days,d,m),gMoveTile(dt,days,d,_day(days,d).tiles.filter(t=>(dt.EX[t.id].muscles[m]||0)>=0.25).map(t=>t.id))]}
  if(rid==='session_hard_sets'||rid==='session_length'){const d=f[2],dd=_day(days,d),tot=total(dd),hs=RU.session_hard_sets,sl=RU.session_length,mins=sessionMinutes(dt,dd.tiles);
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
function message(dt,f,days,level){const {R,RU,PJ}=ctx(dt),DN=R.day_names,id=f[1],rid=id.startsWith('spinal_load')?'spinal_load':id,r=RU[rid],L=m=>{const s=dt.rules.ranking.labels.regions[m]||m.replace(/_/g,' ');return s[0].toUpperCase()+s.slice(1)};
  const P={},put=(ks)=>ks.forEach((k,j)=>P[k]=f[2+j]);
  ({many_small_entries:['day','n'],session_hard_sets:['day','sets'],session_length:['day','min'],spinal_load_session:['day','sets'],sets_per_exercise:['day','exercise'],
    redundant_pattern:['day','pattern','n','muscle','sets'],junk_volume_session:['day','muscle','sets'],beginner_squat_and_deadlift:['day'],hinge_before_squat:['day1'],
    consecutive_high_volume:['day1','muscle'],spinal_load_week:['sets'],push_pull_imbalance:['ratio'],missing_stretch:['muscle'],low_frequency:['muscle','n'],weekly_volume:['muscle','sets'],pattern_gap:['slot','n','min']}[id]||[]).forEach((k,j)=>P[k]=f[2+j]);
  if(P.day1&&!P.day2)P.day2=ORDER[ORDER.indexOf(P.day1)+1];for(const k of ['day','day1','day2'])if(P[k])P[k]=DN[P[k]];
  if(id==='sets_per_exercise'){const dd=days.find(x=>x.day===f[2]),t=dd&&dd.tiles.find(x=>x.id===f[3]);P.sets=t?t.sets:''}
  if(P.muscle)P.muscle=L(P.muscle);if(P.pattern)P.pattern=P.pattern.replace(/_/g,' ');if(P.exercise)P.exercise=nm(dt,P.exercise);
  if(id==='session_hard_sets')P.max=RU.session_hard_sets.warn_above[level];if(id==='spinal_load_session')P.max=RU.spinal_load.session_warn_above[level];if(id==='spinal_load_week')P.max=RU.spinal_load.week_warn_above[level];
  if(id==='weekly_volume'){const T=ctx(dt).T,m=f[2];P.min=pyR(T[m].min*ctx(dt).LF[level]*2)/2;P.max=T[m].max}
  if(id==='missing_stretch')P.examples=R.stretch_biased[f[2]].slice(0,2).map(i=>nm(dt,i)).join(' or ').toLowerCase();
  if(id==='push_pull_imbalance'&&(f[2]===0||f[2]===99))return f[2]?r.message_no_push:r.message_no_pull;
  if(id==='pattern_gap'){const S=PJ.slots[f[2]];return fmtPy(f[0]==='warn'?r.message:r.message_info,{slot_lower:S.name.toLowerCase(),slot_name:S.name,n:f[3],min:f[4],examples:RANK.slotRecommendations(dt,f[2],level,days,2).map(x=>nm(dt,x.id)).join(', ')})}
  let msg=r.message;if(id==='low_frequency'&&f[3]===0&&r.message_indirect_only)msg=r.message_indirect_only;else if(id==='spinal_load_week')msg=r.message_week||msg;else if(f[0]==='info'&&r.message_info)msg=r.message_info;
  return fmtPy(msg,P)}
const RULE_OF=id=>id.startsWith('spinal_load')?'spinal_load':id;
// rules.json rules[].short_label, with short_label_variants picked the same way message() picks its variant
function shortLabel(dt,f){const id=f[1],r=dt.rules.rules.find(x=>x.id===RULE_OF(id));if(!r)return id;const V=r.short_label_variants||{};let k=null;
  if(id==='spinal_load_session')k='session';else if(id==='spinal_load_week')k='week';
  else if(id==='push_pull_imbalance'&&(f[2]===0||f[2]===99))k=f[2]?'no_push':'no_pull';
  else if(id==='low_frequency'&&f[3]===0&&r.message_indirect_only)k='indirect_only';
  else if(id==='weekly_volume'){const T=ctx(dt).T[f[2]];k=T&&f[3]>T.max?'over':'under'}
  else if(f[0]==='info'&&r.severity!=='info')k='info';
  return (k&&V[k])||r.short_label||id}
const ruleLabel=(dt,id)=>{const r=dt.rules.rules.find(x=>x.id===id);return (r&&r.short_label)||id};
// the checks the board is scored on: every rules.json rule that applies (app_only rules need a saved baseline; `levels` limits a rule)
function checks(dt,days,level){const [fl,week]=check(dt,days,level),rules=dt.rules.rules.filter(r=>!r.app_only&&(!r.levels||r.levels.includes(level)));
  const byRule={};rules.forEach(r=>byRule[r.id]={id:r.id,warn:[],info:[]});fl.forEach(f=>{const b=byRule[RULE_OF(f[1])];if(b)b[f[0]].push(f)});
  const list=rules.map(r=>byRule[r.id]),pass=list.filter(c=>!c.warn.length).length;return {list,pass,total:list.length,flags:fl,week}}
// ---------------- analytics (old app analytics.js; targets.json curve / recovery / analytics) ----------------
function analytics(dt,days,level){const TT=dt.targets,C=TT.curve,A=TT.analytics,{T,LF,RU,HEAVY}=ctx(dt),MUS=Object.keys(T);
  const kOf=m=>(C.k_by_muscle&&C.k_by_muscle[m]&&C.k_by_muscle[m][level])||C.k[level],Sx=(x,k)=>1-Math.exp(-x/k),disc=v=>Math.min(v,C.session_discount.cap)+Math.max(0,v-C.session_discount.cap)*C.session_discount.factor;
  const perDay=days.map(d=>eff(dt,d.tiles)),muscles={};
  for(const m of MUS){const raw=perDay.reduce((a,v)=>a+v[m],0),x=perDay.reduce((a,v)=>a+disc(v[m]),0),k=kOf(m),min=pyR(T[m].min*LF[level]*2)/2;
    muscles[m]={raw,x,k,stim:Sx(x,k),next:Sx(x+1,k)-Sx(x,k),min,max:T[m].max,freq:perDay.filter(v=>v[m]>=A.frequency_min_effective).length}}
  const fat=e=>e.fatigue!=null?e.fatigue:(e.type==='isolation'?.8:1.2);
  const day=days.map(d=>({day:d.day,minutes:sessionMinutes(dt,d.tiles),sets:total(d),cost:d.tiles.reduce((a,t)=>a+t.sets*fat(dt.EX[t.id]),0),spinal:d.tiles.reduce((a,t)=>a+(HEAVY.has(t.id)?t.sets:0),0)}));
  return {muscles,day,weekSets:days.reduce((a,d)=>a+total(d),0),weekMinutes:day.reduce((a,d)=>a+d.minutes,0),weekCost:day.reduce((a,d)=>a+d.cost,0),
    spinal:{week:day.reduce((a,d)=>a+d.spinal,0),week_max:RU.spinal_load.week_warn_above[level],session_max:RU.spinal_load.session_warn_above[level]},disclaimer:A.disclaimer,curveModel:C.model}}
const API={check,fixes,evaluate,message,checks,analytics,sessionMinutes,eff,flagKey,ORDER,shortLabel,ruleLabel,
  // internals reused by logic/analysis.js and logic/progress.js (same functions, so the ports cannot drift)
  _x:{gAddSets,gAddExercise,gReduceSets,prev,nonin,_day,load,col,RULE_OF,total,ctx,clone,cmpT,sortBy,fmtPy}};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.PCHECK=API;
})(typeof window!=='undefined'?window:this);
