/* Lift Board suggestion ranking: a line-for-line port of Coach's tools/rank.py (rules.json `ranking` v1), plus the parts of
   tools/swap.py (score, primary_muscle, fam) and tools/patterns.py (candidates, fit, anchor, _score) it calls.
   Every weight, label, reason string, threshold and band comes from the data files (rules.json, targets.json, patterns.json,
   splits.json, exercises.json). Constants below are the ones the Python reference itself hardcodes (structure, not tuning).
   Diff-tested against data/ranking-reference.json (test/rank.diff.js). One scorer for swap, tray, empty_workout and preset.
   Works in the browser (window.RANK) and in node (module.exports). */
(function(root){
'use strict';
const CONTEXTS=['swap','tray','empty_workout','preset'];
const TERMS=['fit','priority','goal_attr','bias','gap','theme','prefatigue','systemic','spinal','coverage','favorite','conflict'];
const PLATE_EQ=['barbell','trap bar','smith machine','landmine','plate-loaded machine'];          // rank.py PLATE_EQ
const RARE_EQ=new Set(['rings','suspension','medicine ball','stability ball']);                    // check_program.py RARE_EQ
const FAM={'machine':'machine','plate-loaded machine':'machine','smith machine':'machine','barbell':'free','dumbbell':'free',
  'kettlebell':'free','trap bar':'free','landmine':'free','bodyweight':'bodyweight','rings':'bodyweight','suspension':'bodyweight','cable':'cable'}; // swap.py FAM

// ---------- Python numeric semantics ----------
// round(x, n): correctly rounded, ties to even (exact ties are dyadic, so they show up exactly in toFixed(n+1)).
function pyRound(x,n=0){ // Python round(): exact binary value, ties to even. toFixed(n+40) exposes enough exact digits to see a true tie.
  if(!isFinite(x)||x===0)return x===0?0:x;const neg=x<0,t=Math.abs(x).toFixed(Math.min(100,n+40)),dot=t.indexOf('.');
  const keep=t.slice(0,dot)+t.slice(dot+1,dot+1+n),rest=t.slice(dot+1+n);let up;
  if(rest[0]>'5')up=true;else if(rest[0]<'5')up=false;else up=/[1-9]/.test(rest.slice(1))||(+keep[keep.length-1])%2===1;
  let q=BigInt(keep)+(up?1n:0n);const v=Number(q)/Math.pow(10,n);return neg?-v:v}
const rh=x=>pyRound(x*2+1e-9)/2;             // round half (0.5 grid)
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ri=x=>Math.floor(x+0.5);               // int(x + 0.5) for x >= 0
const cmpT=(a,b)=>{for(let k=0;k<a.length;k++){if(a[k]<b[k])return -1;if(a[k]>b[k])return 1}return 0};
const maxBy=(arr,key)=>{let best,bk;for(const x of arr){const k=key(x);if(best===undefined||cmpT([].concat(k),[].concat(bk))>0){best=x;bk=k}}return best};
const fmt=(s,a)=>s.replace(/\{(\w+)\}/g,(_,k)=>a[k]);
const uniq=a=>[...new Set(a)];

// ---------- data ----------
function makeData(j){ // j: {exercises, rules, targets, patterns, splits}
  const exl=j.exercises,EX={},order={};exl.exercises.forEach((e,k)=>{EX[e.id]=e;order[e.id]=k});
  const R=j.rules,PAT={};for(const [p,ids] of Object.entries(R.patterns||{}))for(const i of ids)PAT[i]=p;
  const USE={};for(const s of j.splits.splits)for(const dc of Object.values(s.levels))for(const dd of Object.values(dc))for(const x of dd)for(const t of x.tiles)USE[t.id]=(USE[t.id]||0)+1;
  return {exl,EX,order,rules:R,targets:j.targets,patterns:j.patterns,PAT,USE,_anchor:{}};
}

// ---------- swap.py ----------
const fam=e=>FAM[e.equipment]||'other';
function vec(e,MUS){return MUS.map(m=>e.muscles[m])}
function cos(a,b){let sa=0,sb=0,d=0;for(const x of a)sa+=x*x;for(const x of b)sb+=x*x;const na=Math.sqrt(sa),nb=Math.sqrt(sb);
  if(!na||!nb)return 0;for(let k=0;k<a.length;k++)d+=a[k]*b[k];return d/(na*nb)}
function primaryMuscle(e,MUS){return maxBy(MUS,m=>e.muscles[m])}
function swapScore(dt,cur,cand,pool){pool=pool||dt.EX;const MUS=dt.exl.muscles,c=pool[cur],k=pool[cand];
  const pc=c.pattern||dt.PAT[cur],pk=k.pattern||dt.PAT[cand];const sp=pc!=null&&pc===pk;
  const cs=cos(vec(c,MUS),vec(k,MUS));let big=MUS.filter(m=>c.muscles[m]>=0.5);if(!big.length)big=[primaryMuscle(c,MUS)];
  let mad=0;for(const m of big)mad+=Math.abs(c.muscles[m]-k.muscles[m]);mad=mad/big.length;
  const s=40*sp+25*cs+15*(1-mad)+10*(c.type===k.type)+5*(c.equipment===k.equipment)+5*(fam(c)===fam(k)); // swap.py weights
  return [pyRound(s,2),sp,cs]}
function swaps(dt,cur,n=6){const out=[];for(const cand in dt.EX){if(cand===cur)continue;const [s,sp,cs]=swapScore(dt,cur,cand);if(cs<0.6&&!sp)continue;out.push([s,cand])}
  out.sort((a,b)=>cmpT([-a[0],a[1]],[-b[0],b[1]]));return out.slice(0,n).map(([s,c])=>({id:c,score:s}))}

// ---------- patterns.py ----------
function canCount(dt,i,slot){const e=dt.EX[i],S=dt.patterns.slots;return (e.patterns||[]).includes(slot)&&!(S[slot].kind==='compound'&&e.type==='isolation')}
function candidates(dt,slot,level){const R=dt.rules,ADV=new Set(dt.patterns.scoring.advanced_only),out=[];
  for(const [i,e] of Object.entries(dt.EX)){if(e.custom||!canCount(dt,i,slot))continue;
    if(level==='beginner'&&(ADV.has(i)||RARE_EQ.has(e.equipment)))continue;
    if(level==='intermediate'&&RARE_EQ.has(e.equipment)&&!R.staples.includes(i))continue;out.push(i)}return out}
function pfit(dt,i,slot){const w=dt.patterns.scoring.muscle_weights,pm=dt.patterns.slots[slot].primary_muscles;let s=0,d=0;
  pm.slice(0,w.length).forEach((m,k)=>{s+=w[k]*(dt.EX[i].muscles[m]||0)});w.slice(0,pm.length).forEach(x=>d+=x);return s/d}
function anchor(dt,slot){if(dt._anchor[slot])return dt._anchor[slot];const c=Object.keys(dt.EX).filter(i=>canCount(dt,i,slot));
  c.sort((a,b)=>cmpT([-(dt.USE[a]||0),-pfit(dt,a,slot),a],[-(dt.USE[b]||0),-pfit(dt,b,slot),b]));return dt._anchor[slot]=c[0]}
function slotScore(dt,i,slot,level,boardIds,boardEq){const sc=dt.patterns.scoring,e=dt.EX[i],a=anchor(dt,slot),R=dt.rules;
  const sim=i===a?100.0:swapScore(dt,a,i)[0];
  let s=sc.w_fit*pfit(dt,i,slot)+sc.w_similarity*sim/100+sc.w_main_slot*(e.patterns[0]===slot)+sc.w_staple*(R.staples.includes(i))+sc.w_use*Math.min(dt.USE[i]||0,12)-sc.fatigue_penalty_by_level[level]*e.fatigue;
  if(level==='beginner'&&['machine','cable'].includes(fam(e)))s+=sc.beginner_machine_bonus;
  if(boardEq.size&&boardEq.has(e.equipment))s+=sc.board_equipment_bonus;
  if(boardIds.has(i))s-=sc.already_on_board_penalty;return pyRound(s,2)}
function slotRecommendations(dt,slot,level,board,n=6){const ids=new Set((board||[]).flatMap(d=>d.tiles.map(t=>t.id))),eq=new Set([...ids].filter(i=>dt.EX[i]).map(i=>dt.EX[i].equipment));
  const c=candidates(dt,slot,level).map(i=>[slotScore(dt,i,slot,level,ids,eq),i]);c.sort((a,b)=>cmpT([-a[0],a[1]],[-b[0],b[1]]));return c.slice(0,n).map(([s,i])=>({id:i,score:s}))}

// ---------- goals ----------
const label=(m,RK)=>RK.labels.regions[m]||m.replace(/_/g,' ');
function _goals(prefs,RK){return uniq(((prefs||{}).goals||[]).filter(g=>g in RK.goals)).slice(0,RK.goal_combine.max_goals)}
function combineGoals(goals,dt){const RK=dt.rules.ranking,mus=dt.exl.muscles,G=RK.goals,gs=goals.filter(g=>g in G);
  const M={};for(const m of mus){if(gs.length){let s=0;for(const g of gs)s+=(G[g].muscle_priority[m]??1.0);M[m]=s/gs.length}else M[m]=1.0}
  const vmean=(l,k)=>{if(!l.length)return 1.0;let s=0;for(const g of l)s+=G[g].volume[k];return s/l.length};
  const Vmin={},Vmax={},others=gs.filter(g=>g!=='maintain');
  for(const m of mus){const src=gs.includes('maintain')&&others.length?(M[m]>1+1e-9?others:['maintain']):gs;Vmin[m]=vmean(src,'min_factor');Vmax[m]=vmean(src,'max_factor')}
  const scfs=gs.map(g=>G[g].constraints.spinal_cap_factor??1.0);const scf=scfs.length?Math.min(...scfs):1.0;
  return {M,Vmin,Vmax,spinal_cap_factor:scf,goals:gs}}
function repRanges(goals,dt){const RK=dt.rules.ranking,base=dt.rules.logger.rep_range_by_type,out={};
  for(const [t,rr] of Object.entries(base)){const votes=goals.filter(g=>g in RK.goals&&(RK.goals[g].rep_range_by_type||{})[t]).map(g=>RK.goals[g].rep_range_by_type[t]);
    out[t]=votes.length?[ri(votes.reduce((s,v)=>s+v[0],0)/votes.length),ri(votes.reduce((s,v)=>s+v[1],0)/votes.length)]:[...rr]}return out}
function goalConflicts(goals,dt){const s=new Set(goals);return dt.rules.ranking.goal_conflicts.filter(c=>c.goals.every(g=>s.has(g)))}
function goalAttrScores(e,goals,RK){const sw=e.swap,out={};
  for(const g of goals){if(!sw){out[g]=0.0;continue}let s=0.0;
    for(const [k,w] of Object.entries(RK.goals[g].attr_pref)){let x;if(k==='type_primary')x=e.type==='primary'?1.0:0.0;else if(RK.goal_attrs.ordinals.includes(k))x=(sw[k]??2)-2;else x=(sw.flags||[]).includes(k)?1.0:0.0;s+=w*x}
    out[g]=clamp(s,-1.0,1.0)}return out}

// ---------- bias + targets ----------
function _bias(prefs,dt){const RK=dt.rules.ranking,ok=new Set([...dt.exl.muscles,...dt.exl.regions]);return uniq(((prefs||{}).bias_muscles||[]).filter(x=>ok.has(x))).slice(0,RK.bias.max)}
const _parent=(b,dt)=>dt.exl.muscles.includes(b)?b:dt.exl.regionGroup[b];
function adjustedTargets(prefs,dt){const RK=dt.rules.ranking,TT=dt.targets,T=TT.targets,level=(prefs||{}).level||'intermediate',LF=TT.levelMinFactor;
  const cg=combineGoals(_goals(prefs,RK),dt),{M,Vmin,Vmax}=cg,out={};
  for(const [m,t] of Object.entries(T)){let mn=rh(t.min*LF[level]*Vmin[m]*clamp(M[m],0.85,1.2));const mx=rh(t.max*Vmax[m]*clamp(M[m],1.0,1.2));
    mn=Math.min(mn,mn>0.8*mx?rh(0.8*mx):mn);const fl=Math.min(mn,rh(t.min*LF.beginner*Vmin[m]));
    out[m]={min:mn,max:mx,floor:fl,base_min:rh(t.min*LF[level]),base_max:t.max}}
  const biased=uniq(_bias(prefs,dt).map(b=>_parent(b,dt))),BR=RK.bias.target_raise;let added=0.0;
  for(const m of biased){const o=out[m],cap=rh(T[m].max*Vmax[m]*dt.rules.volume_bands.red_factor);const mx=Math.min(rh(o.max*BR.max_factor),cap),mn=Math.min(rh(o.min*BR.min_factor),rh(0.8*mx));
    added+=Math.max(0.0,mn-o.min);o.min=Math.max(o.min,mn);o.max=Math.max(o.max,mx)}
  let need=added,traded=0.0;const groups=RK.groups;
  for(const grp of ['accessory','primary']){if(need<=0)break;
    const pool=groups[grp].muscles.filter(m=>!biased.includes(m)&&M[m]<=1+1e-9&&out[m].min>out[m].floor);
    const slack={};let tot=0;for(const m of pool){slack[m]=out[m].min-out[m].floor;tot+=slack[m]}if(tot<=0)continue;
    const take=Math.min(need,tot);let got=0.0;
    for(const m of pool){const cut=Math.min(slack[m],Math.trunc(take*slack[m]/tot*2)/2);out[m].min-=cut;got+=cut}
    const srt=[...pool].sort((a,b)=>cmpT([-(out[a].min-out[a].floor),a],[-(out[b].min-out[b].floor),b]));
    for(const m of srt){if(got+0.5>take+1e-9)break;if(out[m].min-0.5>=out[m].floor-1e-9){out[m].min-=0.5;got+=0.5}}
    need-=got;traded+=got}
  out._trade={biased,added,traded,untraded:Math.max(0.0,added-traded)};return out}

// ---------- equipment ----------
function equipmentStatus(profile,equipment,id){const p=profile||{},ex=p.equipment||{};
  if(equipment in ex)return ex[equipment]?'available':'unavailable';
  if(equipment==='bodyweight')return 'available';
  if(PLATE_EQ.includes(equipment)){if('plates' in p&&!(p.plates&&p.plates.length))return 'unavailable';const bars=p.bars||{};
    if(equipment in bars&&bars[equipment]==null)return 'unavailable';if(equipment in bars&&p.plates&&p.plates.length)return 'available';return 'unknown'}
  if(equipment==='dumbbell'||equipment==='kettlebell'){const key=equipment==='dumbbell'?'dumbbells':'kettlebells';if(!(key in p))return 'unknown';return p[key]&&p[key].length?'available':'unavailable'}
  if(equipment==='machine'||equipment==='cable'){const st=p.stacks||{};if(id in st&&st[id])return 'available';if(equipment in st)return st[equipment]?'available':'unavailable';return 'unknown'}
  return 'unknown'}

// One rules.json equipment_items token against a gym profile (ranking.equipment.needs rule). Tokens, implications
// (items[t].implies) and legacy fallbacks all come from rules.json.
function itemStatus(dt,profile,token,id){const p=profile||{},m=p.equipment||{},items=dt.rules.equipment_items.items;
  if(token in m)return m[token]?'available':'unavailable';
  if(Object.entries(items).some(([t,it])=>m[t]===true&&(it.implies||[]).includes(token)))return 'available';
  if(!(token in items))return 'unknown';
  const leg=items[token].legacy;
  if(leg==='_plates'){if(!('plates' in p))return 'unknown';return p.plates&&p.plates.length?'available':'unavailable'}
  if(leg){const q={};for(const [k,v] of Object.entries(p))if(k!=='equipment')q[k]=v;return equipmentStatus(q,leg,id)}
  return 'unknown'}
// Exercise status: legacy equipmentStatus when the profile has no equipment map or the exercise has no equipment_needs
// (neutral parity); else AND over needs, each 'a|b' = any one of its tokens.
function needsStatus(dt,profile,e){const p=profile||{};
  if(!p.equipment||!Object.keys(p.equipment).length||e.equipment_needs==null)return equipmentStatus(p,e.equipment,e.id);
  let out='available';
  for(const item of e.equipment_needs){const sts=item.split('|').map(t=>itemStatus(dt,p,t,e.id));
    const st=sts.includes('available')?'available':sts.every(x=>x==='unavailable')?'unavailable':'unknown';
    if(st==='unavailable')return 'unavailable';if(st==='unknown')out='unknown'}
  return out}

// ---------- board helpers ----------
function _eff(tiles,pool,minr=0.25){const v={};for(const t of tiles){const e=pool[t.id];if(!e)continue;for(const [m,r] of Object.entries(e.muscles))if(r>=minr)v[m]=(v[m]||0.0)+t.sets*r}return v}
function _slotCounts(board,pool,PJ){const c={};for(const k in PJ.slots)c[k]=0;
  for(const d of board)for(const t of d.tiles){const e=pool[t.id];if(!e)continue;const hit=new Set();
    for(const s of e.patterns||[]){if(PJ.slots[s].kind==='compound'&&e.type==='isolation')continue;hit.add(s);(PJ.slots[s].counts_toward||[]).forEach(x=>hit.add(x))}
    for(const s of hit)c[s]+=1}return c}
const _countable=(e,PJ)=>(e.patterns||[]).filter(s=>!(PJ.slots[s].kind==='compound'&&e.type==='isolation'));
const truthy=v=>!(v==null||v===0||v===''||v===false||(Array.isArray(v)&&!v.length));

// ---------- main ----------
function rank(dt,context,cands,state,prefs,n){
  if(!CONTEXTS.includes(context))throw new Error(context);
  const R=dt.rules,RK=R.ranking,CX=RK.contexts[context],W=CX.weights;state=state||{};prefs=prefs||{};
  const level=prefs.level||'intermediate',pool=Object.assign({},dt.EX),custom=new Set();
  if(context==='swap'||context==='tray')for(const e of state.custom||[]){pool[e.id]=e;custom.add(e.id)}
  const goals=_goals(prefs,RK),cg=combineGoals(goals,dt),bias=_bias(prefs,dt);
  const favs=new Set(prefs.favorites||[]),excl=new Set(prefs.excluded||[]);
  const profile=prefs.gym_profile||R.logger.gym_profile_default[prefs.unit||'lb'];
  const board=state.board||[],dayname=state.day,cur=state.current;
  const day=board.find(d=>d.day===dayname)||null,tiles=day?[...day.tiles]:[];
  let pos=state.position,earlier,others,swTile;
  if(context==='swap'){if(pos==null&&cur!=null){const k=tiles.findIndex(t=>t.id===cur);pos=k<0?null:k}
    earlier=pos!=null?tiles.slice(0,pos):[];others=pos!=null?tiles.filter((t,k)=>k!==pos):tiles;swTile=pos!=null?tiles[pos]:null}
  else{earlier=tiles;others=tiles;swTile=null}
  const onDay=new Set(tiles.map(t=>t.id));
  const wboard=board.map(d=>({day:d.day,tiles:d.tiles.filter((t,k)=>!(d===day&&k===pos&&context==='swap'))}));
  const week=board.length?_eff(wboard.flatMap(d=>d.tiles),pool):null;
  const hasState=board.length>0&&board.some(d=>d.tiles.length);
  const TG=hasState?adjustedTargets(prefs,dt):null,PJ=dt.patterns;
  const counts=hasState?_slotCounts(wboard,pool,PJ):null,wmin=PJ.weekly_min_by_level[level];
  const HEAVY=new Set([...R.heavy_squats,...R.heavy_hinges]),rules={};for(const r of R.rules)rules[r.id]=r;
  const capSets=rules.session_hard_sets.warn_above[level],scf=cg.spinal_cap_factor;
  const spCap=rules.spinal_load.session_warn_above[level]*scf,spWcap=rules.spinal_load.week_warn_above[level]*scf;
  const sum=a=>a.reduce((s,x)=>s+x,0);
  const preSets=sum(earlier.map(t=>t.sets)),spPre=sum(earlier.filter(t=>HEAVY.has(t.id)).map(t=>t.sets));
  const spOther=sum(others.filter(t=>HEAVY.has(t.id)).map(t=>t.sets)),spWeek=sum(wboard.flatMap(d=>d.tiles).filter(t=>HEAVY.has(t.id)).map(t=>t.sets));
  const hv=earlier.filter(t=>HEAVY.has(t.id));const spSrc=hv.length?maxBy(hv,t=>t.sets):null;
  const pre=_eff(earlier,pool),heavy=dt.targets.session.muscles,redf=R.volume_bands.red_factor;
  const candSets=e=>{if(truthy(state.sets))return state.sets;if(swTile)return swTile.sets;return R.pattern_gap_fix.sets_by_kind[e.type==='isolation'?'isolation':'compound']};
  let ids;
  if(cands!=null)ids=cands.filter(i=>i in pool);
  else if(context==='preset')ids=candidates(dt,state.slot,level);
  else if(context==='empty_workout'){const ADV=new Set(PJ.scoring.advanced_only);ids=Object.keys(dt.EX).filter(i=>!dt.EX[i].custom).filter(i=>!(level==='beginner'&&(ADV.has(i)||RARE_EQ.has(dt.EX[i].equipment)))&&!(level==='intermediate'&&RARE_EQ.has(dt.EX[i].equipment)&&!R.staples.includes(i)))}
  else ids=Object.keys(pool);
  const boardIds=new Set(wboard.flatMap(d=>d.tiles.map(t=>t.id))),boardEq=new Set([...boardIds].filter(i=>pool[i]).map(i=>pool[i].equipment));
  const MUS=dt.exl.muscles,REG=dt.exl.regions,out=[];
  for(const i of ids){const e=pool[i],notes=[];let s,sp,cs;
    // ---- hard constraints (before scoring; nothing overrides them) ----
    if(excl.has(i)||i===cur)continue;
    if(context==='swap'){[s,sp,cs]=swapScore(dt,cur,i,pool);if(cs<0.6&&!sp)continue}
    if((context!=='swap'||day)&&onDay.has(i))continue;
    const st=needsStatus(dt,profile,e);if(st==='unavailable')continue;if(st==='unknown')notes.push('equipment_unknown');
    if(custom.has(i))notes.push('estimated');
    const parts={};TERMS.forEach(t=>parts[t]=0.0);const why={};let fit;
    // ---- fit ----
    if(context==='swap'){fit=s/100.0;let fr=sp&&fit>=RK.reasons.thresholds.fit_swap_close?'fit_swap_close':sp?'fit_swap_pattern':'fit_swap';let ft=null;
      if(bias.length&&!sp){const c=pool[cur],cpm=primaryMuscle(c,MUS),cslot=(c.patterns&&c.patterns.length?c.patterns:[null])[0];
        for(const b of bias){if(_parent(b,dt)!==cpm)continue;const rb=x=>REG.includes(b)&&!MUS.includes(b)?((x.heads||{})[b]||0):(x.muscles[b]||0);
          if(cslot&&(e.patterns&&e.patterns.length?e.patterns:[null])[0]===cslot&&rb(e)>rb(c)+1e-9){fit+=RK.bias.related_pattern.size;fr='fit_swap_related';ft=b;break}}}
      why.fit=[fr,ft?{target:label(ft,RK)}:{}]}
    else if(context==='tray'){fit=0.5;const mm=e.muscles&&Object.keys(e.muscles).length?primaryMuscle(e,MUS):'';why.fit=['fit_tray',{muscle:label(mm,RK)}]}
    else{const slot=context==='preset'?state.slot:(_countable(e,PJ)[0]??null);
      if(slot){fit=Math.max(0.0,slotScore(dt,i,slot,level,boardIds,boardEq)/100.0);why.fit=[fit>=0.7?'fit_slot_top':'fit_slot',{slot:PJ.slots[slot].name.toLowerCase()}]}
      else{fit=0.3;why.fit=['fit_tray',{muscle:label(primaryMuscle(e,MUS),RK)}]}}
    parts.fit=fit;
    const mus={};for(const [m,r] of Object.entries(e.muscles))if(r>=0.25)mus[m]=r;const musK=Object.keys(mus);
    const rs=sum(Object.values(mus))||1.0;
    // ---- priority ----
    if(musK.length&&(goals.length||bias.length||context==='tray'||context==='empty_workout')){
      const flat=context==='swap'||context==='preset',bp=new Set(bias.filter(b=>MUS.includes(b)));
      const Pm=m=>{const g=flat?1.0:(RK.groups.primary.muscles.includes(m)?RK.groups.primary.weight:RK.groups.accessory.weight);const p=g*(cg.M[m]??1.0);return bp.has(m)?Math.max(p,RK.bias.priority_floor):p};
      let ps=0;for(const m of musK)ps+=mus[m]*Pm(m);const prio=ps/rs;
      parts.priority=W.priority*clamp((prio-1)/0.25,-1,1);
      const top=maxBy(musK,m=>[mus[m]*(Pm(m)-1),m]);
      if(bp.has(top))why.priority=['priority_bias',{muscle:label(top,RK)}];
      else if(goals.length){const gb=maxBy(goals,g=>RK.goals[g].muscle_priority[top]??1.0);why.priority=['priority',{muscle:label(top,RK),goal:RK.goals[gb].short}]}}
    // ---- goal attributes + conflict ----
    if(goals.length){const ag=goalAttrScores(e,goals,RK),vals=goals.map(g=>ag[g]);const A=sum(vals)/vals.length;
      parts.goal_attr=W.goal_attr*A;const gb=maxBy(goals,g=>[ag[g],-goals.indexOf(g)]);why.goal_attr=['goal_attr',{goal:RK.goals[gb].short}];
      if(goals.length>1&&Math.max(...vals)>=0.5&&Math.min(...vals)<=-0.5){parts.conflict=-W.conflict;notes.push('goal_conflict')}}
    // ---- bias ----
    if(bias.length){let best=0.0,bb=null,bflag=false;
      for(const b of bias){const r=REG.includes(b)&&!MUS.includes(b)?((e.heads||{})[b]||0):(e.muscles[b]||0);const fl=RK.bias.exercise_boost.flags[b];
        const f=fl&&((e.swap||{}).flags||[]).includes(fl)?1.0:0.0;const x=0.8*clamp((r-0.5)/0.5,0,1)+0.2*f;if(x>best+1e-12){best=x;bb=b;bflag=!!f}}
      parts.bias=W.bias*best;if(bb)why.bias=[bflag?'bias_flag':'bias',{target:label(bb,RK)}]}
    const sets=candSets(e);
    if(hasState){
      // ---- weekly gap / over (bands from rules.volume_bands, same key as the volume panel and body map) ----
      let num=0.0,gm=null,gv=0.0;const fa=RK.context_terms.gap.full_at;
      for(const m of musK){const r=mus[m];if(!(m in TG))continue;const wk=week[m]||0.0,deficit=TG[m].min-wk,total=wk+sets*r,mx=TG[m].max;let u;
        if(deficit>0)u=clamp(deficit/fa,0,1);else if(total>mx*redf+1e-9)u=-1.0;else if(total>mx+1e-9)u=-0.5*clamp((total-mx)/fa,0,1);else u=0.0;
        num+=r*u;if(r*u>gv+1e-12){gm=m;gv=r*u}}
      parts.gap=W.gap*num/rs;
      if(gm){const L=label(gm,RK);why.gap=['gap',{muscle:L,a:'aeiou'.includes(L[0])?'an':'a'}]}
      // ---- coverage ----
      if(W.coverage){let cv=0.0,cs_=null;
        for(const s_ of _countable(e,PJ)){for(const h of [s_,...(PJ.slots[s_].counts_toward||[])]){const v=PJ.required.includes(h)&&counts[h]===0?1.0:counts[h]<(wmin[h]||0)?0.5:0.0;if(v>cv){cv=v;cs_=h}}}
        parts.coverage=W.coverage*cv;if(cs_)why.coverage=[cv===1.0?'coverage_missing':'coverage',{slot:PJ.slots[cs_].name.toLowerCase()}]}}
    if(W.theme&&earlier.length&&musK.length){
      // ---- day theme: overlap with muscles already credited that day, capped at each muscle's solid session level ----
      const solid=dt.targets.session.muscles;let th=0;for(const m of musK)if(m in solid)th+=mus[m]*clamp((pre[m]||0)/solid[m].solid,0,1);th=th/rs;
      parts.theme=W.theme*th;if(parts.theme>0)why.theme=['theme',{}]}
    if(tiles.length&&(earlier.length||others.length)){
      const tm={};for(const [m,r] of Object.entries(e.muscles))if(r>=0.5)tm[m]=r;const tmK=Object.keys(tm);
      if(tmK.length&&Object.keys(pre).length){const tw=RK.context_terms.prefatigue.type_weight[e.type]??0.75;let a=0;for(const m of tmK)if(m in heavy)a+=tm[m]*clamp((pre[m]||0)/heavy[m].heavy,0,1);
        const pf=a/sum(Object.values(tm))*tw;parts.prefatigue=-W.prefatigue*pf}
      const sf=(e.swap||{}).systemic_fatigue??2;parts.systemic=-W.systemic*clamp(preSets/capSets,0,1)*(sf-2);if(parts.systemic>0)why.systemic=['systemic',{}];
      const spf=((e.swap||{}).flags||[]).includes('spinal_load');const frac=spCap?clamp(spPre/spCap,0,1):0.0;let v=(W.spinal/2)*frac*(spf?-1:1);
      if(HEAVY.has(i)&&(spOther+sets>spCap||spWeek+sets>spWcap))v-=W.spinal;parts.spinal=v;
      if(v>0&&spSrc&&RK.context_terms.spinal.reason_muscles.some(m=>(e.muscles[m]||0)>=0.5))why.spinal=['spinal',{exercise:pool[spSrc.id].name}]}
    if(favs.has(i)){parts.favorite=RK.favorites.boost;why.favorite=['favorite',{}]}
    let tot=0;for(const t of TERMS)tot+=parts[t];const score=pyRound(tot,4);
    // ---- reasons: top positive non-fit terms (>= min_contribution), else the fit reason ----
    const pt=TERMS.filter(k=>k!=='fit'&&k in why&&parts[k]>=RK.reasons.min_contribution-1e-12).map(k=>[parts[k],k]);
    pt.sort((a,b)=>cmpT([-a[0],TERMS.indexOf(a[1])],[-b[0],TERMS.indexOf(b[1])]));
    let keys=pt.slice(0,RK.reasons.max).map(([,k])=>why[k]);if(!keys.length)keys=[why.fit];
    if(keys.length<2&&why.fit[0]==='fit_swap_related'&&!keys.includes(why.fit))keys.push(why.fit);
    const strings=RK.reasons.strings,rp={};for(const t of TERMS)rp[t]=pyRound(parts[t],4);
    out.push({id:i,name:e.name,score,fit:pyRound(fit,4),favorite:favs.has(i),reasons:keys.map(([k,a])=>fmt(strings[k],a)),reason_keys:keys.map(([k])=>k),parts:rp,notes})}
  const tb=context==='tray'?(r=>dt.order[r.id]??1e6):(r=>r.id);
  out.sort((a,b)=>cmpT([-a.score,-a.fit,!a.favorite,tb(a),a.id],[-b.score,-b.fit,!b.favorite,tb(b),b.id]));
  n=n!==undefined&&n!==null?n:CX.default_n;return n?out.slice(0,n):out}

function meta(dt,prefs){const gs=_goals(prefs,dt.rules.ranking);
  return {goals:gs,targets:adjustedTargets(prefs,dt),rep_ranges:repRanges(gs,dt),conflicts:goalConflicts(gs,dt),spinal_cap_factor:combineGoals(gs,dt).spinal_cap_factor,bias:_bias(prefs,dt)}}

const API={candidates,primaryMuscle,fam,makeData,rank,meta,equipmentStatus,itemStatus,needsStatus,combineGoals,adjustedTargets,repRanges,goalConflicts,swaps,swapScore,slotRecommendations,pyRound,TERMS};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.RANK=API;
})(typeof window!=='undefined'?window:this);
