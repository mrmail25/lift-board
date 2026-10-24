/* Port of Coach's tools/custom_exercise.py (2026-10-24): custom exercises from the Build tray. MODELLED defaults from the library
   (data/custom-exercise-defaults.json), not evidence. build(form) -> an exercises.json-shaped record (same keys, enums, units) plus
   custom:true, estimated:true, pattern, stretch_biased_for, rep_range, defaults_source. validate(form) -> {errors, warnings}.
   makeId / shortName / slug / stretchFor / formOf as the Python. register(dt, records) is the Builder load step (md "Registering"):
   EX table, rules.patterns (legacy push/pull map) + dt.PAT, stretch lists, a rep-range override WITH an id; never heavy lists / staples.
   Browser: window.CUSTOMEX; node: module.exports. Defaults come from ONE loader (CUSTOMEX.make(defaults, exercisesJson, rules)). */
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const RANK=isNode?require('./rank.js'):root.RANK;
const COMPOUND=['horizontal_push','vertical_push','horizontal_pull','vertical_pull','squat','hinge','lunge'],CORE_SLOTS=new Set(['abs','carry_core']);
// tools/movement.py movement_pattern(e)
function movementPattern(e){const ps=e.patterns||[];if(e.type!=='isolation')for(const s of ps)if(COMPOUND.includes(s))return s;
  if(!ps.length)return 'other';if(CORE_SLOTS.has(ps[0]))return 'core';if(ps[0]==='power')return 'other';return 'isolation'}
const TYPES=['primary','accessory','isolation'];
const DEFAULT_FLAGS=['unilateral','constant_tension','grip_demand','spinal_load','static_hold','overhead_finish','peak_contraction_focus'];
const ORD_FIELDS=['stretch_emphasis','muscle_isolation','stability','systemic_fatigue','loading_potential','skill_demand','grip_width'];
const GLUTE_STRETCH_PATTERNS=['squat','lunge','hinge'];
const ID_RE=/^custom-[a-z0-9]+(-[a-z0-9]+)*-[a-z0-9]{6}$/;
const ABBR=[['Smith Machine','Smith'],['One-Arm','1-Arm'],['Single-Arm','1-Arm'],['Plate-Loaded','Plate-Load'],['Chest-Supported','Supp'],['Chest Supported','Supp'],['Single-Leg','SL'],['Single Leg','SL'],['Close-Grip','CG'],['Close Grip','CG'],
  ['Romanian Deadlift','RDL'],['Straight-Arm','Str-Arm'],['Dumbbell','DB'],['Barbell','BB'],['Kettlebell','KB'],['Overhead','OH'],
  ['Deadlift','DL'],['Handstand','HS'],['Suspension','Susp'],['Machine','Mach'],['Converging','Conv'],['Reverse','Rev'],
  ['Standing','Stand'],['Forward','Fwd'],['Hamstring','Ham'],['Triceps','Tri'],['Isolateral','Iso'],['Iso-Lateral','Iso'],['Lateral','Lat']];
const B36='0123456789abcdefghijklmnopqrstuvwxyz';
const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const spaces=s=>String(s||'').split(/\s+/).filter(Boolean).join(' ');   // ' '.join(s.split())
function slug(name){let s=String(name||'').normalize('NFKD').replace(/[^\x00-\x7F]/g,'').toLowerCase();
  s=s.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');return s.slice(0,40).replace(/-+$/,'')||'exercise'}
function stretchFor(R,main,bands,p){const out=main in R.stretch_biased?[main]:[];
  if(GLUTE_STRETCH_PATTERNS.includes(p)&&['main','helper'].includes(bands.glutes)&&!out.includes('glutes'))out.push('glutes');return out}

function make(D,EXJ,R){
  // ---- the single defaults loader: everything below reads D (custom-exercise-defaults.json); nothing is hardcoded here
  const LIB=EXJ.exercises,MUSCLES=EXJ.muscles,GROUP=EXJ.regionGroup,REGIONS=Array.isArray(EXJ.regions)?EXJ.regions:Object.keys(EXJ.regions||{});
  const HEADS_OF={};for(const m of MUSCLES)HEADS_OF[m]=REGIONS.filter(h=>GROUP[h]===m);
  const PATTERNS=D.form.movement_patterns.map(x=>x.id),EQUIPMENT=D.form.equipment.map(x=>x.id),BANDS=D.form.bands;
  const LIBIDS=new Set(LIB.map(e=>e.id)),LIBNAMES=new Set(LIB.map(e=>e.name.toLowerCase())),LIBSHORT=new Set(LIB.map(e=>e.short_name));
  const pm=e=>RANK.primaryMuscle(e,MUSCLES);
  function makeId(name,taken=[],rnd=Math.random){const t=new Set(taken);for(;;){let r='';for(let k=0;k<6;k++)r+=B36[Math.floor(rnd()*36)%36];
    const i=`custom-${slug(name)}-${r}`;if(!LIBIDS.has(i)&&!t.has(i))return i}}
  // ---- short name (Coach's brandfix rule, 2026-10-24): brands, abbreviations and max length come from D.short_name, never hardcoded.
  // Python's \w is Unicode, so W = letters / digits / underscore in any script (the 'u' flag).
  const SN=D.short_name||{},MAXS=SN.max_len||16,ABBRS=SN.abbreviations||ABBR,W='[\\p{L}\\p{N}_]';
  const BRX=(SN.brands||[]).slice().sort((a,b)=>b.brand.length-a.brand.length)
    .map(b=>({b,rx:new RegExp(`(?<!${W.slice(0,-1)}-])`+b.brand.split(/[ -]+/).map(reEsc).join('[ -]?')+`(?!${W.slice(0,-1)}-])`,'giu')}));
  const findBrands=name=>BRX.filter(x=>{x.rx.lastIndex=0;return x.rx.test(name)}).map(x=>x.b);
  const strip=(s,cs)=>{s=String(s);while(s&&cs.includes(s[0]))s=s.slice(1);while(s&&cs.includes(s[s.length-1]))s=s.slice(0,-1);return s};
  function stripBrands(name){let s=name;for(const x of BRX)s=s.replace(x.rx,'');return strip(spaces(s.split(' - ').join(' ')),' -')}
  function shorten(s,n=MAXS){s=spaces(s);
    if(s.length>n)s=spaces(s.replace(/\s*\([^)]*\)/g,''))||s;
    for(const [a,b] of ABBRS){if(s.length<=n)break;s=s.replace(new RegExp(`(?<!${W.slice(0,-1)}-])`+reEsc(a)+`(?!${W})`,'giu'),b)}
    let w=s.split(' ');
    while(s.length>n&&w.length>2){w=w.slice(1);s=w.join(' ')}
    if(s.length>n&&w.length===2&&w[0].includes('-')){let h=w[0].split('-');   // 'Pseudo-Planche Push-Up' -> 'Planche Push-Up'
      while(h.length>1&&h[h.length-1].length&&[h.join('-'),w[1]].join(' ').length>n)h=h.slice(1);w=[h.join('-'),w[1]];s=w.join(' ')}
    if(s.length>n&&w.length===2&&n-w[1].length-2>=4)s=w[0].slice(0,n-w[1].length-2)+'. '+w[1];   // 'Concentrat. Curl': a period, never a silent cut
    if(s.length>n&&w.length===2&&w[1].length<=n)s=w[1];   // keep the movement noun
    if(s.length>n)s=s.slice(0,n);   // one over-long word (never a brand: brands are gone by now)
    return s.replace(/[ -]+$/,'')}
  function unique(s,taken){let k=2;const base=s;
    while(taken.has(s)){const suf=` ${k}`;let w=base.split(' '),t=base;while(t.length+suf.length>MAXS&&w.length>1){w=w.slice(1);t=w.join(' ')}
      s=t.slice(0,MAXS-suf.length).replace(/\s+$/,'')+suf;k++}return s}
  function shortName(name,taken=[],exclude=[]){const s0=spaces(name),ex=new Set(exclude),T=new Set([...LIBSHORT,...taken].filter(x=>!ex.has(x)));
    if(s0.length<=MAXS&&!T.has(s0))return s0;
    let br=findBrands(s0),core=br.length?stripBrands(s0):s0;
    if(!core){core=br[0].brand.length<=MAXS?br[0].brand:br[0].abbr;br=[]}
    let s=shorten(core);
    if(br.length&&T.has(s)){const pre=br.map(b=>b.abbr).join(' ');s=strip(`${pre} ${shorten(core,MAXS-pre.length-1)}`,' ')}
    return unique(s,T)}
  function validate(form,customNames=[]){const err=[],warn=[],n=String(form.name||'').trim();
    if(!n)err.push('name: required');if(n.length>60)err.push('name: at most 60 characters');
    if(n&&customNames.some(x=>String(x).toLowerCase()===n.toLowerCase()))err.push('name: already used by another custom exercise');
    if(n&&LIBNAMES.has(n.toLowerCase()))warn.push('name: same as a library exercise; consider using the library one');
    if(!EQUIPMENT.includes(form.equipment))err.push(`equipment: one of ${EQUIPMENT.join(', ')}`);
    if(!PATTERNS.includes(form.movement_pattern))err.push(`movement_pattern: one of ${PATTERNS.join(', ')}`);
    const ms=form.muscles||{},bad=Object.keys(ms).filter(m=>!MUSCLES.includes(m)),badb=Object.values(ms).filter(b=>!(b in BANDS));
    if(bad.length)err.push(`muscles: unknown ids ${bad.join(', ')}`);if(badb.length)err.push(`muscles: band must be one of ${Object.keys(BANDS).join(', ')}`);
    if(Object.values(ms).filter(b=>b==='main').length!==1)err.push('muscles: exactly one Main mover');
    if(Object.keys(ms).length>6)warn.push('muscles: more than 6 muscles is unusual (library median is 3); ratings may be overestimated');
    return {errors:err,warnings:warn}}
  // the toggle defaults the form shows before the user touches them (py build: unilateral from the cell flags, stretch from pattern x main muscle)
  function slotsFor(p,main){return D.slots_by_pattern_muscle[`${p}|${main}`]||D.slots_by_pattern[p]}
  function toggleDefaults(p,q,main){const cell=D.cells[`${p}|${q}`],sl=main&&slotsFor(p,main);
    return {unilateral:!!cell&&cell.swap.flags.includes('unilateral'),stretch_focused:!!(sl&&sl.stretch_default&&sl.stretch_default.default_on)}}
  function build(form,o={}){const v=validate(form);if(v.errors.length)throw new Error(v.errors.join('; '));
    const p=form.movement_pattern,q=form.equipment,cell=D.cells[`${p}|${q}`],ms={};for(const m of MUSCLES)ms[m]=0;
    for(const [m,b] of Object.entries(form.muscles))ms[m]=BANDS[b].ratio;
    const main=Object.keys(form.muscles).find(m=>form.muscles[m]==='main'),sl=slotsFor(p,main);
    let typ=cell.type;if(COMPOUND.includes(p)&&typ==='isolation')typ='accessory';if(!COMPOUND.includes(p)&&p!=='isolation'&&typ==='primary')typ='accessory';if(p==='isolation')typ='isolation';
    let pats=sl.patterns.slice();if(COMPOUND.includes(p)&&!pats.includes(p))pats=[p,...pats];
    if(movementPattern({type:typ,patterns:pats})!==p)pats=({core:['abs'],other:['power']})[p]||pats;
    // py: Dd['pattern_fallback'][p]['heads']; the JSON keeps them under heads_by_pattern[p] (same values)
    const hd=((D.pattern_fallback[p]||{}).heads)||D.heads_by_pattern[p]||{},nz=x=>x&&Object.keys(x).length?x:null,heads={};
    for(const h of REGIONS){const m=GROUP[h],hs=HEADS_OF[m],rat=nz(hd[m])||nz(D.heads_global[m])||Object.fromEntries(hs.map(x=>[x,1.0]));const top=Math.max(...Object.values(rat))||1.0;
      heads[h]=RANK.pyRound(ms[m]*(h in rat?rat[h]:1.0)/top,3)}
    const sw={};for(const k of ORD_FIELDS)sw[k]=cell.swap[k];const flags=cell.swap.flags.slice();
    if(form.unilateral===true&&!flags.includes('unilateral'))flags.push('unilateral');if(form.unilateral===false&&flags.includes('unilateral'))flags.splice(flags.indexOf('unilateral'),1);
    const sd=sl.stretch_default||{default_on:false},st=form.stretch_focused==null?!!sd.default_on:!!form.stretch_focused;
    sw.stretch_emphasis=st?3:Math.min(sw.stretch_emphasis,2);
    sw.muscle_isolation=typ==='isolation'&&sw.stability===3?3:typ==='isolation'?2:COMPOUND.includes(p)?1:sw.muscle_isolation;
    const name=spaces(form.name),short=o.short_name&&spaces(o.short_name)?spaces(o.short_name).slice(0,16):shortName(name,o.takenShort||[]);
    const e={id:o.id||makeId(name,o.takenIds||[],o.rnd),name,short_name:short,type:typ,equipment:q,equipment_needs:cell.equipment_needs.slice(),muscles:ms,heads,
      description:'',howTo:[],tip:'',youtube:'',fatigue:cell.fatigue,howto:{setup:'',cues:[],mistake:''},patterns:pats,movement_pattern:p,
      swap:Object.assign(sw,{flags:DEFAULT_FLAGS.filter(f=>flags.includes(f))}),
      custom:true,estimated:true,pattern:sl.pattern,stretch_biased_for:st?stretchFor(R,main,form.muscles,p):[],
      rep_range:Object.assign({},cell.rep_range),defaults_source:Object.assign({cell:`${p}|${q}`},cell.source,{slots:`${p}|${main}` in D.slots_by_pattern_muscle?`${p}|${main}`:p})};
    if(cell.bodyweight)Object.assign(e,cell.bodyweight);if(cell.categories&&cell.categories.length)e.categories=cell.categories.slice();
    return e}
  // round trip (py form_of): the form a user would fill for a library exercise
  function formOf(e){const main=pm(e),ms={};for(const [m,r] of Object.entries(e.muscles)){if(m===main)ms[m]='main';else if(r>=0.4)ms[m]='helper';else if(r>=0.25)ms[m]='minor'}
    return {name:e.name,equipment:e.equipment,movement_pattern:e.movement_pattern,muscles:ms,unilateral:(e.swap.flags||[]).includes('unilateral'),
      stretch_focused:Object.values(R.stretch_biased).some(v=>v.includes(e.id))}}
  // the form back from a record (edit): bands from the ratios, toggles from the record
  function formFromRecord(e){const ms={};for(const [m,r] of Object.entries(e.muscles)){const b=Object.keys(BANDS).find(k=>Math.abs(BANDS[k].ratio-r)<1e-9);if(r>0&&b)ms[m]=b}
    return {name:e.name,short_name:e.short_name,equipment:e.equipment,movement_pattern:e.movement_pattern,muscles:ms,unilateral:(e.swap.flags||[]).includes('unilateral'),stretch_focused:(e.stretch_biased_for||[]).length>0||e.swap.stretch_emphasis===3}}
  return {D,BANDS,PATTERNS,EQUIPMENT,MUSCLES,HEADS_OF,REGIONS,pm,makeId,shortName,findBrands,stripBrands,shorten,validate,build,formOf,formFromRecord,toggleDefaults,slotsFor,
    labels:{pattern:Object.fromEntries(D.form.movement_patterns.map(x=>[x.id,x.label])),equipment:Object.fromEntries(D.form.equipment.map(x=>[x.id,x.label])),muscle:Object.fromEntries(D.form.muscles.map(x=>[x.id,x.label])),toggles:D.form.toggles}}
}
// ---- registration (md "Registering a custom exercise", steps 1-5). Idempotent; unregister reverses it.
const CACHES=['_pc','_sany','_cp','_lr','_lg'];
function resetCaches(dt){for(const k of CACHES)if(k in dt)dt[k]=null;dt._anchor={}}
function unregister(dt,id){const e=dt.EX[id];if(!e||!e.custom)return false;delete dt.EX[id];delete dt.order[id];delete dt.PAT[id];
  for(const ids of Object.values(dt.rules.patterns||{})){const k=ids.indexOf(id);if(k>=0)ids.splice(k,1)}
  for(const ids of Object.values(dt.rules.stretch_biased||{})){const k=ids.indexOf(id);if(k>=0)ids.splice(k,1)}
  const ov=dt.rules.rep_ranges.overrides;for(let k=ov.length-1;k>=0;k--)if(ov[k].id===id)ov.splice(k,1);resetCaches(dt);return true}
function register(dt,records){for(const e of records){if(dt.EX[e.id]&&dt.EX[e.id].custom)unregister(dt,e.id);
    dt.EX[e.id]=e;dt.order[e.id]=Object.keys(dt.order).length;                                                    // 1. exercise table
    if(e.pattern){dt.PAT[e.id]=e.pattern;const L=(dt.rules.patterns[e.pattern]=dt.rules.patterns[e.pattern]||[]);if(!L.includes(e.id))L.push(e.id)} // 2. legacy pattern map
    for(const m of e.stretch_biased_for||[]){const L=dt.rules.stretch_biased[m];if(L&&!L.includes(e.id))L.push(e.id)}   // 3. stretch lists
    const rr=e.rep_range;dt.rules.rep_ranges.overrides.push({id:e.id,exercises:[e.id],unit:rr.unit,range:{low:rr.low,high:rr.high},not_to_failure:rr.not_to_failure,custom:true}); // 4. rep range (id required)
    // 5. never rules.heavy_squats / heavy_hinges / staples
  }resetCaches(dt);return dt}
const API={make,register,unregister,movementPattern,slug,stretchFor,ID_RE,COMPOUND,DEFAULT_FLAGS,ORD_FIELDS,TYPES};
if(isNode)module.exports=API;else root.CUSTOMEX=API;
})(typeof window!=='undefined'?window:globalThis);
