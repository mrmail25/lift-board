/* Slot templates (round 1): port of Coach's tools/templates.py (rule_for, eligible, fill) over data/templates.json
   (pointer rules.json templates). Explicit per-slot eligible ids live in data/templates-reference.json; eligible() recomputes
   the same rule (patterns.candidates + type + movement_pattern + primary muscle) for any exercise (used by progress stall swaps).
   Parity: node test/templates.diff.js. Browser: window.TEMPLATES; node: module.exports. dt = RANK.makeData(...). */
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;const RANK=isNode?require('./rank.js'):root.RANK;
const COMPOUND=['horizontal_push','vertical_push','horizontal_pull','vertical_pull','squat','hinge','lunge']; // tools/movement.py COMPOUND
const mp=e=>e.movement_pattern||'other';
const slotOf=e=>COMPOUND.includes(mp(e))?mp(e):e.patterns[0];
// templates v2 (r2fix): legacy_group = rules.json `patterns` group; compound slots take primary or accessory picks of the same group
function legacyGroup(dt,id){if(!dt._lg){dt._lg={};for(const [g,ids] of Object.entries(dt.rules.patterns||{}))for(const i of ids)dt._lg[i]=g}return dt._lg[id]??null}
function ruleFor(dt,id){const e=dt.EX[id],s=slotOf(e),r=COMPOUND.includes(mp(e))?{slot:s,movement_pattern:mp(e),types:['primary','accessory'],variant:legacyGroup(dt,id)}:{slot:s,movement_pattern:mp(e),types:[e.type]};
  if(dt.patterns.slots[s].kind==='isolation'||['isolation','core','other'].includes(mp(e)))r.primary_muscle=RANK.primaryMuscle(e,dt.exl.muscles);return r}
function eligible(dt,rule,level){const out=[];for(const i of RANK.candidates(dt,rule.slot,level)){const e=dt.EX[i];
    const types=rule.types||[rule.slot_type];if(!types.includes(e.type)||mp(e)!==rule.movement_pattern)continue;if(rule.variant&&legacyGroup(dt,i)!==rule.variant)continue;if('primary_muscle' in rule&&RANK.primaryMuscle(e,dt.exl.muscles)!==rule.primary_muscle)continue;out.push(i)}
  return out.sort()}
// picks / sets: optional {slot_id: exercise id / n}; default = each slot's default_exercise and default sets
const fill=(t,picks={},sets={})=>t.days.map(d=>({day:d.day,label:d.label,tiles:d.slots.map(s=>({id:picks[s.id]||s.default_exercise,sets:sets[s.id]??s.sets.default}))}));
// v2: default_exercise is the ranked pick (Coach's choose_defaults); filling every slot with preset_exercise reproduces the preset exactly
const presetFill=t=>t.days.map(d=>({day:d.day,label:d.label,tiles:d.slots.map(s=>({id:s.preset_exercise||s.default_exercise,sets:s.sets.default}))}));
// ---------- ranked defaults (batch B; port of templates.py ranked / choose_defaults) ----------
const DEFAULT_GOALS=['muscle_size'],TYPE_BONUS={primary:0.10,accessory:0.0,isolation:0.0}; // templates.json ranking.type_bonus
const PC=isNode?require('./progcheck.js'):root.PCHECK;
const commercial=dt=>dt.rules.equipment_items.example_profiles.commercial;
// eligible picks ranked by the shared ranker (context preset for the slot, goals, level, gym profile) + type bonus on compound slots
function ranked(dt,rule,level,goals,profile){const el=eligible(dt,rule,level),TB=((dt.TJ||{}).ranking||{}).type_bonus||TYPE_BONUS;
  const rs=RANK.rank(dt,'preset',el,{slot:rule.slot},{goals:goals||DEFAULT_GOALS,level,gym_profile:profile||commercial(dt)},1e6),comp=COMPOUND.includes(rule.movement_pattern);
  return rs.map(r=>[r.id,RANK.pyRound(r.score+(comp?(TB[dt.EX[r.id].type]||0):0),4)]).sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0))}
function band(dt,m,level){const TT=dt.targets,T=TT.targets,LF=TT.levelMinFactor;return [RANK.pyRound(T[m].min*LF[level]*2)/2,T[m].max]}
function nonin(dt,days,level,protect=[]){const [f,week]=PC.check(dt,days,level);
  return [...f.filter(x=>x[0]!=='info'),...Object.entries(week).filter(([m,x])=>x>band(dt,m,level)[1]+1e-9).map(([m])=>['over',m]),...protect.filter(m=>week[m]<band(dt,m,level)[0]-1e-9).map(m=>['under',m])]}
// greedy, day then slot order: best-ranked pick not on that day, unused elsewhere if possible, keeping 0 non-info flags, no muscle over
// its max and no protected muscle under its min -> {slot_id: [id, rank_index]}
function chooseDefaults(dt,tdays,level,goals,profile){const cur={};for(const d of tdays)for(const s of d.slots)cur[s.id]=s.preset_exercise;
  const board=()=>tdays.map(d=>({day:d.day,label:d.label,tiles:d.slots.map(s=>({id:cur[s.id],sets:s.sets.default}))}));
  const pw=PC.check(dt,board(),level)[1],protect=Object.entries(pw).filter(([m,x])=>x>=band(dt,m,level)[0]-1e-9).map(([m])=>m),used=new Set(),out={};
  for(const d of tdays)for(const s of d.slots){const rk=ranked(dt,s.eligibility,level,goals,profile).map(x=>x[0]),dayIds=new Set(d.slots.filter(x=>x.id!==s.id).map(x=>cur[x.id]));let pick=null;
    for(const pass of [0,1]){for(let k=0;k<rk.length;k++){const i=rk[k];if(dayIds.has(i)||(pass===0&&used.has(i)))continue;const old=cur[s.id];cur[s.id]=i;
        if(!nonin(dt,board(),level,protect).length){pick=[i,k];break}cur[s.id]=old}if(pick)break}
    if(!pick){pick=[s.preset_exercise,rk.indexOf(s.preset_exercise)];cur[s.id]=pick[0]}used.add(pick[0]);out[s.id]=pick}
  return out}
const find=(TJ,id)=>(TJ.templates||[]).find(t=>t.id===id);
const API={ruleFor,eligible,fill,presetFill,legacyGroup,find,COMPOUND,ranked,chooseDefaults,band,nonin,DEFAULT_GOALS};
if(isNode)module.exports=API;else root.TEMPLATES=API;
})(typeof window!=='undefined'?window:this);
