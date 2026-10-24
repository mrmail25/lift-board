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
  function formFromRecord(e){const ms={};for(const [m,r] of Object.entries(e.muscles)){const b=bandOf(r);if(b)ms[m]=b}
    return {name:e.name,short_name:e.short_name,equipment:e.equipment,movement_pattern:e.movement_pattern,muscles:ms,unilateral:(e.swap.flags||[]).includes('unilateral'),stretch_focused:(e.stretch_biased_for||[]).length>0||e.swap.stretch_emphasis===3}}
  // ================= base exercise (piece 1, 2026-10-24): port of custom_exercise.py rank_bases / suggest_bases / from_base / chips / explainer_for.
  // Every weight, threshold, vocabulary and table comes from D.base (custom-exercise-defaults.json); only the typo cut-offs (4 letters, ratio 0.8,
  // credit 0.8) are the md's typo_rule numbers.
  const BS=(D.base&&D.base.suggest)||null,NORM=BS&&BS.normalization||{},HV=BS&&(BS.hint_vocab||D.base.hint_vocab)||{};
  const BW=BS?BS.weights:{},BONUS=BS?BS.bonus:{},MIN_S=BS?BS.min_score:0.35,MIN_N=BS?BS.min_name_score:0.2,DEF_N=BS?BS.default_count:3,MAX_N=BS?BS.max_count:5;
  const NEAR=BS&&(BS.pattern_near||D.base.pattern_near)||[],FAMS=BS&&(BS.equipment_families||D.base.equipment_families)||{};
  const STOP=new Set(NORM.stopwords||[]),KEEP=new Set(NORM.plural_keep||[]),SYN=NORM.synonyms||{};
  const PHRX=(NORM.phrases||[]).map(x=>[new RegExp('\\b'+reEsc(x.from)+'\\b','g'),x.to]);
  const HINT_OF={};for(const [g,d] of Object.entries(HV))for(const [t,v] of Object.entries(d))HINT_OF[t]=[g,v];
  const fold=s=>String(s).normalize('NFKD').replace(/[^\x00-\x7F]/g,'');
  function plural(t){if(KEEP.has(t)||t.length<3)return t;if(t.endsWith('ies')&&t.length>=5)return t.slice(0,-3)+'y';
    if(/(ss|sh|ch|x)es$/.test(t))return t.slice(0,-2);if(t.endsWith('s')&&!t.endsWith('ss')&&!t.endsWith('us'))return t.slice(0,-1);return t}
  function nameTokens(name){let s=fold(stripBrands(name)).toLowerCase().replace(/'/g,'').replace(/\u2019/g,'');
    s=s.split(/[^a-z0-9]+/).filter(Boolean).map(plural).join(' ');for(const [rx,b] of PHRX)s=s.replace(rx,b);
    const out=[];for(const t0 of s.split(/\s+/).filter(Boolean)){const t=t0 in SYN?SYN[t0]:t0;for(const u of t.split(/\s+/).filter(Boolean))if(!STOP.has(u)&&!out.includes(u))out.push(u)}return out}
  // difflib.SequenceMatcher(None, a, b).ratio(): Ratcliff/Obershelp, same longest-match tie rules (earliest in a, then in b), no junk (strings < 200)
  function smRatio(a,b){const b2j={};for(let j=0;j<b.length;j++)(b2j[b[j]]=b2j[b[j]]||[]).push(j);
    const longest=(alo,ahi,blo,bhi)=>{let bi=alo,bj=blo,bs=0,j2={};for(let i=alo;i<ahi;i++){const nj={};for(const j of b2j[a[i]]||[]){if(j<blo)continue;if(j>=bhi)break;const k=(j2[j-1]||0)+1;nj[j]=k;if(k>bs){bi=i-k+1;bj=j-k+1;bs=k}}j2=nj}
      while(bi>alo&&bj>blo&&a[bi-1]===b[bj-1]){bi--;bj--;bs++}while(bi+bs<ahi&&bj+bs<bhi&&a[bi+bs]===b[bj+bs])bs++;return [bi,bj,bs]};
    const Q=[[0,a.length,0,b.length]];let M=0;while(Q.length){const [alo,ahi,blo,bhi]=Q.pop(),[i,j,k]=longest(alo,ahi,blo,bhi);
      if(k){M+=k;if(alo<i&&blo<j)Q.push([alo,i,blo,j]);if(i+k<ahi&&j+k<bhi)Q.push([i+k,ahi,j+k,bhi])}}
    const T=a.length+b.length;return T?2*M/T:1}
  let IDX=null;const LIBX=LIB.filter(e=>!e.custom);
  function index(){if(IDX)return IDX;const toks={},df={};for(const e of LIBX){toks[e.id]=nameTokens(e.name);for(const t of new Set(toks[e.id]))df[t]=(df[t]||0)+1}return IDX={toks,df,n:LIBX.length}}
  const tw=t=>{const I=index();return Math.log((I.n+1)/((I.df[t]||0)+0.5))};
  const pyCmp=(x,y)=>x<y?-1:x>y?1:0;
  function nameScore(dt,bt){const ds=new Set(dt),bs=new Set(bt),shared=[...ds].filter(t=>bs.has(t)).sort(pyCmp);
    const du=[...ds].filter(t=>!bs.has(t)).sort(pyCmp),bu=[...bs].filter(t=>!ds.has(t)).sort(pyCmp),typos=[];
    for(const t of du){if(t.length<4)continue;let best=[0,null];for(const u of bu){if(u.length<4||typos.some(p=>p[1]===u))continue;const r=smRatio(t,u);
        if(r>best[0]||(r===best[0]&&best[1]!==null&&u>best[1]))best=[r,u]}   // python max() of (ratio, u): ties go to the larger u
      if(best[0]>=0.8)typos.push([t,best[1]])}
    const tu=new Set(typos.map(p=>p[0])),tl=new Set(typos.map(p=>p[1]));let sh=0;for(const t of shared)sh+=tw(t);
    let num=sh;for(const [,u] of typos)num+=0.8*tw(u);let den=sh;for(const [,u] of typos)den+=tw(u);for(const t of du)if(!tu.has(t))den+=tw(t);for(const u of bu)if(!tl.has(u))den+=tw(u);
    return [den?RANK.pyRound(num/den,4):0,shared,typos]}
  function hintsOf(toks){const h={};for(const t of toks)if(t in HINT_OF){const [g,v]=HINT_OF[t],k=g!=='feature'?g:'feature:'+v;(h[k]=h[k]||new Set()).add(v)}return h}
  function hintScore(dt,bt){const dh=hintsOf(dt),bh=hintsOf(bt);let s=0,conf=0;
    for(const [g,vs] of Object.entries(dh)){const b=bh[g];if(b&&[...vs].some(v=>b.has(v)))s+=1;else if(b&&!g.startsWith('feature:')){s-=0.5;conf++}}
    s-=0.25*Object.keys(bh).filter(g=>!(g in dh)).length;return [RANK.pyRound(Math.max(-1,Math.min(1,s/Math.max(1,Object.keys(dh).length))),4),conf]}
  const near=(p,q)=>p===q?1:NEAR.some(g=>g.includes(p)&&g.includes(q))?0.5:0;
  const fam=q=>FAMS[q]||'other';
  const vec=ms=>MUSCLES.map(m=>ms[m]||0),cos=(a,b)=>{const na=Math.sqrt(a.reduce((s,x)=>s+x*x,0)),nb=Math.sqrt(b.reduce((s,x)=>s+x*x,0));if(!na||!nb)return 0;let d=0;for(let k=0;k<a.length;k++)d+=a[k]*b[k];return d/(na*nb)};
  function rankBases(draft){const name=String(draft.name||'').trim();if(!name)throw new Error('name is required');
    const I=index(),dt=nameTokens(name),ds=new Set(dt),p=draft.movement_pattern||null,q=draft.equipment||null,ms=draft.muscles||{},hasMs=Object.keys(ms).length>0;
    const main=draft.main_muscle||Object.keys(ms).find(m=>ms[m]==='main')||null,fv={};for(const [m,b] of Object.entries(ms))fv[m]=BANDS[b].ratio;
    const avail=['name','hints',...(p?['movement_pattern']:[]),...(q?['equipment']:[]),...(hasMs?['muscle_similarity']:[])];let wsum=0;for(const k of avail)wsum+=BW[k];
    const out=[];
    for(const e of LIBX){if(!Object.values(e.muscles).some(Boolean))continue;
      const bt=I.toks[e.id],[ns,shared,typos]=nameScore(dt,bt),[hs,conf]=hintScore(dt,bt),c={name:ns,hints:hs};
      if(p)c.movement_pattern=near(p,e.movement_pattern);
      if(q)c.equipment=e.equipment===q?1:fam(e.equipment)===fam(q)?0.5:0;
      if(hasMs){const cm={};for(const [m,r] of Object.entries(e.muscles))if(r>=0.25)cm[m]=r;c.muscle_similarity=RANK.pyRound(cos(vec(fv),vec(cm)),4)}
      const bonus=main&&pm(e)===main?{main_muscle:BONUS.main_muscle}:{};let s=0;for(const k of avail)s+=BW[k]*c[k];let bsum=0;for(const v of Object.values(bonus))bsum+=v;
      const sc=RANK.pyRound(Math.min(1,s/wsum+bsum),4),bset=new Set(bt),exact=ds.size>0&&ds.size===bset.size&&[...ds].every(t=>bset.has(t));
      out.push({id:e.id,name:e.name,score:sc,exact_name:exact,suggestable:exact||(sc>=MIN_S&&ns>=MIN_N),components:c,bonus,hint_conflicts:conf,shared_tokens:shared,typo_matches:typos.map(x=>x.slice()),
        _k:[!exact,e.name.toLowerCase()!==name.toLowerCase(),-sc,-ns,conf,e.equipment!==q,e.movement_pattern!==p,bt.length,e.name,e.id]})}
    out.sort((x,y)=>{for(let k=0;k<x._k.length;k++){const a=x._k[k],b=y._k[k];if(a<b)return -1;if(a>b)return 1}return 0});
    return out.map(x=>{const {_k,...r}=x;return r})}
  function suggestBases(draft,n=DEF_N){n=Math.max(1,Math.min(MAX_N,n));return rankBases(draft).filter(x=>x.suggestable).slice(0,n)}
  // chips: counted muscles (>= 0.25) with their band; the exact ratio stays in the data
  function bandOf(r){if(r>=0.75-1e-9)return 'main';if(r>=0.4-1e-9)return 'helper';if(r>=0.25-1e-9)return 'minor';return null}
  function chips(e){return Object.entries(e.muscles).filter(([,r])=>bandOf(r)).sort((a,b)=>b[1]-a[1]||MUSCLES.indexOf(a[0])-MUSCLES.indexOf(b[0])).map(([m,r])=>({muscle:m,band:bandOf(r),label:BANDS[bandOf(r)].label,ratio:r}))}
  const libOf=id=>LIBX.find(e=>e.id===id)||null;
  let PATOF=null;const patOf=id=>{if(!PATOF){PATOF={};for(const [p,ids] of Object.entries(R.patterns||{}))for(const i of ids)if(!/^custom-/.test(i))PATOF[i]=p}return PATOF[id]};
  // the base's whiteboard rep range (py _rep): override included; needs the ranking data (o.dt) for whiteboard.repRange
  function repOf(dt,id){const W2=(typeof WHITEBOARD!=='undefined'&&WHITEBOARD)||(isNode?require('./whiteboard.js'):null),r=W2.repRange(dt,id,null);return {low:r.low,high:r.high,unit:r.unit||'reps',not_to_failure:!!r.not_to_failure}}
  // validation as the band form, except a second Main mover kept from the base is allowed (py from_base)
  function validateBase(baseId,form,customNames=[]){const b=libOf(baseId);if(!b)return {errors:['base: unknown library exercise'],warnings:[]};
    const msf=form.muscles||{},baseMains=new Set(Object.keys(b.muscles).filter(m=>bandOf(b.muscles[m])==='main'));
    const mains=Object.keys(msf).filter(m=>msf[m]==='main'),extra=mains.length>1?mains.slice(1).filter(m=>!(baseMains.has(m)&&bandOf(b.muscles[m])==='main')):[];
    const f2=Object.assign({},form,{muscles:mains.length?Object.fromEntries(Object.entries(msf).filter(([m,x])=>x!=='main'||m===mains[0])):msf});
    const v=validate(f2,customNames);
    if(extra.length||(mains.length>1&&!mains.every(m=>baseMains.has(m))))v.errors.push('muscles: only one Main mover can be added (a second one may be kept from the base)');
    return {errors:v.errors,warnings:v.warnings,mains}}
  function fromBase(baseId,form,o={}){const b=libOf(baseId);if(!b)throw new Error('unknown base '+baseId);
    const msf=form.muscles||{},V=validateBase(baseId,form),mains=V.mains,err=V.errors;
    if(err.length)throw new Error(err.join('; '));
    const p=form.movement_pattern,q=form.equipment,cell=D.cells[`${p}|${q}`],pch=p!==b.movement_pattern,qch=q!==b.equipment,main=mains.includes(pm(b))?pm(b):mains[0],mch=main!==pm(b);
    const ms={},how={};
    for(const m of MUSCLES){const r0=b.muscles[m]||0,b0=bandOf(r0),b1=msf[m];
      if(b1&&b1===b0){ms[m]=r0;how[m]='kept'}else if(b1){ms[m]=BANDS[b1].ratio;how[m]=b0?'moved':'added'}else if(b0){ms[m]=0;how[m]='removed'}else{ms[m]=r0;how[m]=r0?'trace_kept':'none'}}
    const hd=((D.pattern_fallback[p]||{}).heads)||D.heads_by_pattern[p]||{},nz=x=>x&&Object.keys(x).length?x:null,heads={};
    for(const h of REGIONS){const m=GROUP[h],hs=HEADS_OF[m];
      if(['kept','trace_kept','none'].includes(how[m])){heads[h]=b.heads[h];continue}if(how[m]==='removed'){heads[h]=0;continue}
      const shape=hs.some(x=>b.heads[x])?Object.fromEntries(hs.map(x=>[x,b.heads[x]])):(nz(hd[m])||nz(D.heads_global[m])||Object.fromEntries(hs.map(x=>[x,1.0])));
      const top=Math.max(...Object.values(shape))||1.0;heads[h]=RANK.pyRound(ms[m]*(h in shape?shape[h]:0)/top,3)}
    const sl=slotsFor(p,main);let typ=pch?cell.type:b.type;
    if(p==='isolation'&&pch)typ='isolation';else if(COMPOUND.includes(p)&&typ==='isolation')typ='accessory';
    let pats=!(pch||mch)?b.patterns.slice():sl.patterns.slice();if(COMPOUND.includes(p)&&!pats.includes(p))pats=[p,...pats];
    if(movementPattern({type:typ,patterns:pats})!==p)pats=({core:['abs'],other:['power']})[p]||(COMPOUND.includes(p)?[p]:sl.patterns.slice());
    const bsw=b.swap,sw={};for(const k of ORD_FIELDS)sw[k]=bsw[k];if(qch)sw.stability=cell.swap.stability;
    if(pch||qch)for(const k of ['muscle_isolation','systemic_fatigue','loading_potential','skill_demand','grip_width'])sw[k]=cell.swap[k];
    const gsrc=(pch||qch)?cell.swap.flags:bsw.flags,gen=DEFAULT_FLAGS.filter(f=>f!=='unilateral'&&gsrc.includes(f)),bias=!(pch||mch)?bsw.flags.filter(f=>!DEFAULT_FLAGS.includes(f)):[];
    const uni=form.unilateral==null?bsw.flags.includes('unilateral'):!!form.unilateral;
    const baseLists=Object.entries(R.stretch_biased).filter(([,v])=>v.includes(b.id)).map(([m])=>m);
    const stDef=!mch?(baseLists.length>0||bsw.stretch_emphasis===3):!!((sl.stretch_default||{}).default_on),st=form.stretch_focused==null?stDef:!!form.stretch_focused;
    let sfor;if(!st)sfor=[];else if(!mch&&form.stretch_focused==null){sfor=baseLists.filter(m=>bandOf(ms[m]));if(!sfor.length)sfor=stretchFor(R,main,msf,p)}
    else{const S=new Set([...stretchFor(R,main,msf,p),...baseLists.filter(m=>bandOf(ms[m]))]);sfor=[...S].sort((x,y)=>MUSCLES.indexOf(x)-MUSCLES.indexOf(y))}
    sw.stretch_emphasis=st?3:Math.min(bsw.stretch_emphasis,2);
    const name=spaces(form.name),short=o.short_name&&spaces(o.short_name)?spaces(o.short_name).slice(0,16):shortName(name,o.takenShort||[]);
    const e={id:o.id||makeId(name,o.takenIds||[],o.rnd),name,short_name:short,type:typ,equipment:q,equipment_needs:(qch?cell.equipment_needs:b.equipment_needs).slice(),muscles:ms,heads,
      description:b.description||'',howTo:(b.howTo||[]).slice(),tip:b.tip||'',youtube:b.youtube||'',fatigue:(pch||qch)?cell.fatigue:b.fatigue,howto:JSON.parse(JSON.stringify(b.howto||{setup:'',cues:[],mistake:''})),
      patterns:pats,movement_pattern:p,swap:Object.assign(sw,{flags:[...gen,...(uni?['unilateral']:[]),...bias]}),custom:true,estimated:true,
      pattern:(pch||mch)?sl.pattern:(patOf(b.id)||sl.pattern),stretch_biased_for:sfor,rep_range:pch?Object.assign({},cell.rep_range):repOf(o.dt,b.id),base_id:b.id,
      derived:{muscles:Object.fromEntries(Object.entries(how).filter(([,v])=>v!=='none')),changed:{movement_pattern:pch,equipment:qch,main_mover:mch}},
      defaults_source:{cell:`${p}|${q}`,base:b.id}};
    const bw=(qch||pch)?cell.bodyweight:(b.bodyweight_fraction?{bodyweight_fraction:b.bodyweight_fraction,bodyweight_basis:b.bodyweight_basis}:null);if(bw)Object.assign(e,bw);
    const cats=qch?cell.categories:(b.categories||[]);if(cats&&cats.length)e.categories=cats.slice();
    return e}
  // the chip form a base gives before any edit (py derive_form with no edits)
  function baseForm(baseId){const b=libOf(baseId);return {equipment:b.equipment,movement_pattern:b.movement_pattern,muscles:Object.fromEntries(chips(b).map(c=>[c.muscle,c.band])),
    unilateral:b.swap.flags.includes('unilateral'),stretch_focused:Object.values(R.stretch_biased).some(v=>v.includes(b.id))||b.swap.stretch_emphasis===3}}
  const EXPL=D.estimated_explainer||(D.base&&D.base.estimated_explainer)||null;
  function explainerFor(e){const V=EXPL.variants;
    if(e.base_id){const b=libOf(e.base_id),d=e.derived||{},changed=Object.values(d.changed||{}).some(Boolean)||Object.values(d.muscles||{}).some(v=>['moved','added','removed'].includes(v));
      const v=changed?'based_on_base_edited':'based_on_base';return [v,V[v].replace('{base}',b?b.name:e.base_id)]}
    const PL=(R.movement_patterns&&R.movement_patterns.labels)||{};return ['pattern_defaults',V.pattern_defaults.replace('{pattern}',(PL[e.movement_pattern]||e.movement_pattern).toLowerCase()).replace('{equipment}',e.equipment)]}
  return {D,BANDS,PATTERNS,EQUIPMENT,MUSCLES,HEADS_OF,REGIONS,pm,makeId,shortName,findBrands,stripBrands,shorten,validate,build,formOf,formFromRecord,toggleDefaults,slotsFor,
    nameTokens,smRatio,rankBases,suggestBases,bandOf,chips,fromBase,validateBase,baseForm,explainerFor,libOf,hasBase:!!BS,EXPL,
    BASE:{min_score:MIN_S,min_name:MIN_N,default_count:DEF_N,max_count:MAX_N},
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
