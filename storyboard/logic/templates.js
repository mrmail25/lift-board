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
const find=(TJ,id)=>(TJ.templates||[]).find(t=>t.id===id);
const API={ruleFor,eligible,fill,presetFill,legacyGroup,find,COMPOUND};
if(isNode)module.exports=API;else root.TEMPLATES=API;
})(typeof window!=='undefined'?window:this);
