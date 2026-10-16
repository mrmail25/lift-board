// v26: movement-pattern check (rule pattern_gap) + slot templates. Exact port of tools/patterns.py and
// tools/check_program.py slot_counts/pattern_flags. All data from patterns.json v1, rules.json v7, exercises.json v5.
let PJ=null;fetch('data/patterns.json').then(r=>r.json()).then(j=>{PJ=j;if(window.bar)bar();if(window.render)render()}).catch(()=>{});
// Python 3.12+ float sum() is Neumaier-compensated; mirror it so ties round identically
const nsum=a=>{let f=0,c=0;for(const x of a){const s=f+x;c+=Math.abs(f)>=Math.abs(x)?(f-s)+x:(x-s)+f;f=s}return c&&isFinite(c)?f+c:f};
const patsOf=e=>e?(e.patterns||(e.base&&EX[e.base]&&EX[e.base].patterns)||[]):[];
function slotCounts(days){const c={};for(const s in PJ.slots)c[s]=0;
days.forEach(d=>d.tiles.forEach(t=>{const e=EX[t.id];if(!e)return;const hit=new Set();
patsOf(e).forEach(s=>{const S=PJ.slots[s];if(!S||(S.kind=='compound'&&e.type=='isolation'))return;hit.add(s);(S.counts_toward||[]).forEach(x=>hit.add(x))});hit.forEach(s=>c[s]=(c[s]||0)+1)}));return c}
function patternFlags(days,level){if(!PJ||!days.some(d=>d.tiles.length))return[];const c=slotCounts(days),out=[],M=PJ.weekly_min_by_level[level];
for(const s in M){const mn=M[s];if(mn<=0||c[s]>=mn)continue;out.push({sev:c[s]==0&&PJ.required.includes(s)?'warn':'info',id:'pattern_gap',slot:s,n:c[s],min:mn})}return out}
// ---------- recommendations ----------
const canCount=(i,slot)=>{const e=EX[i];return(e.patterns||[]).includes(slot)&&!(PJ.slots[slot].kind=='compound'&&e.type=='isolation')};
function slotCands(slot,level){const ADV=new Set(PJ.scoring.advanced_only),ST=RU.staples||[];return LIB().filter(i=>{const e=EX[i];if(!canCount(i,slot))return false;
if(level=='beginner'&&(ADV.has(i)||RARE.has(e.equipment)))return false;if(level=='intermediate'&&RARE.has(e.equipment)&&!ST.includes(i))return false;return true})}
function slotFit(i,slot){const w=PJ.scoring.muscle_weights,pm=PJ.slots[slot].primary_muscles,n=Math.min(w.length,pm.length);
return nsum(pm.slice(0,n).map((m,k)=>w[k]*(EX[i].muscles[m]||0)))/nsum(w.slice(0,pm.length))}
const ANCH={};function slotAnchor(slot){if(!ANCH[slot]){const U=useC();ANCH[slot]=sortBy(LIB().filter(i=>canCount(i,slot)),i=>[-(U[i]||0),-slotFit(i,slot),i])[0]}return ANCH[slot]}
function slotScore(i,slot,level,ids,eq){const sc=PJ.scoring,e=EX[i],a=slotAnchor(slot),U=useC();const sim=i==a?100:swScore(a,i)[0];
let s=sc.w_fit*slotFit(i,slot)+sc.w_similarity*sim/100+sc.w_main_slot*(e.patterns[0]==slot)+sc.w_staple*((RU.staples||[]).includes(i))+sc.w_use*Math.min(U[i]||0,12)-sc.fatigue_penalty_by_level[level]*e.fatigue;
if(level=='beginner'&&['machine','cable'].includes(famOf(e)))s+=sc.beginner_machine_bonus;if(eq.size&&eq.has(e.equipment))s+=sc.board_equipment_bonus;if(ids.has(i))s-=sc.already_on_board_penalty;return pyR(s,2)}
function slotReason(i,slot,rank,eq){const e=EX[i],nm=PJ.slots[slot].name.toLowerCase(),b=[];b.push((rank==0?'Top-rated ':(RU.staples||[]).includes(i)?'Staple ':'Alternative ')+nm);
if(e.fatigue<=.8)b.push('low fatigue');else if(e.fatigue>=1.4)b.push('high fatigue, use fewer sets');if((RU.stretch_biased[primaryMuscle(e)]||[]).includes(i))b.push('trains the stretched position');
b.push(eq.size&&eq.has(e.equipment)?'uses equipment already on your board':e.equipment);const s=b.slice(0,3).join('; ');return s[0].toUpperCase()+s.slice(1).toLowerCase()}
function slotRecommendations(slot,level,board,n=6){const ids=new Set((board||[]).flatMap(d=>d.tiles.map(t=>t.id))),eq=new Set([...ids].filter(i=>EX[i]).map(i=>EX[i].equipment));
const c=sortBy(slotCands(slot,level),i=>[-slotScore(i,slot,level,ids,eq),i]).slice(0,n);
return c.map((i,k)=>({id:i,name:EX[i].name,type:EX[i].type,score:slotScore(i,slot,level,ids,eq),reason:slotReason(i,slot,k,eq)}))}
function gapMsg(fl,board,level){const S=PJ.slots[fl.slot],r=RU.rules.find(x=>x.id=='pattern_gap');const V={slot_lower:S.name.toLowerCase(),slot_name:S.name,n:fl.n,min:fl.min,
examples:slotRecommendations(fl.slot,level,board,2).map(x=>x.name).join(', ')};return(fl.sev=='warn'?r.message:r.message_info).replace(/\{(\w+)\}/g,(_,k)=>V[k]!=null?V[k]:k)}
function patternGaps(board,level){return patternFlags(board,level).map(f=>({severity:f.sev,rule:'pattern_gap',slot:f.slot,count:f.n,min:f.min,message:gapMsg(f,board,level),flag:[f.sev,'pattern_gap',f.slot,f.n,f.min]}))}
// ---------- quick fix add_slot_exercise (generator used by fixes.js gens) ----------
function slotDaysFor(days,slot){const g=PJ.slots[slot].group,has=d=>d.tiles.some(t=>patsOf(EX[t.id]).slice(0,1).some(s=>PJ.slots[s]&&PJ.slots[s].group==g));
return sortBy(days,d=>[!has(d),d.tiles.reduce((a,t)=>a+t.sets,0),ORD.indexOf(d.day)]).map(d=>d.day)}
function*gFillSlot(days,slot,level){const GF=RU.pattern_gap_fix,first=GF.sets_by_kind[PJ.slots[slot].kind];
for(const r of slotRecommendations(slot,level,days,GF.max_candidates))for(const to of slotDaysFor(days,slot)){if(dayOf(days,to).tiles.some(x=>x.id==r.id))continue;
for(const sets of [...new Set([first,GF.fallback_sets])]){const n=dcopy(days);dayOf(n,to).tiles.push({id:r.id,sets});yield['add_slot_exercise',{slot,sets,to_day:to,name:r.name,target:r.id},n]}}}
// ---------- templates ----------
const LOCALR=new Set(['session_hard_sets','session_length','spinal_load_session','junk_volume_session','sets_per_exercise','redundant_pattern','beginner_squat_and_deadlift','hinge_before_squat','consecutive_high_volume']);
const localKeys=(b,l)=>new Set(chk(b,l).filter(f=>f[0]!='info'&&LOCALR.has(f[1])).map(fkey));
function fillTemplate(tm,level='intermediate'){const board=tm.map(d=>({day:d.day,label:d.label||'',tiles:[]})),used={};
board.forEach((d,di)=>tm[di].slots.forEach(x=>{let recs=slotRecommendations(x.slot,level,null,6);recs=[...recs.filter(r=>r.type==x.type),...recs.filter(r=>r.type!=x.type)];
const k=used[x.slot]||0,m=Math.max(1,Math.min(3,recs.length)),o=k%m,order=[...recs.slice(o),...recs.slice(0,o)],base=localKeys(board,level);let pick=null;
for(const r of order){if(d.tiles.some(t=>t.id==r.id))continue;d.tiles.push({id:r.id,sets:x.sets});const nw=localKeys(board,level);if(![...nw].some(z=>!base.has(z))){pick=r;break}d.tiles.pop()}
if(!pick){const r=order.find(r=>!d.tiles.some(t=>t.id==r.id));d.tiles.push({id:r.id,sets:x.sets})}used[x.slot]=k+1}));return board}
const tplOf=(id,level,days)=>PJ&&PJ.templates[id]&&PJ.templates[id].levels[level]&&PJ.templates[id].levels[level][days];
// Build page: slot tiles live in state.slots[dayIdx] = [{slot,sets,type,o}] (o = template position), merged with tiles when rendered
function applyTemplate(id,force){const tm=tplOf(id,sel.level,sel.days);if(!tm)return;const sp=SP.splits.find(x=>x.id==id);
const empty=state.days.every(c=>!c.length)&&!(state.slots||[]).some(c=>c&&c.length),untouched=state.applied&&state.applied==snap();
if(!force&&!empty&&!untouched&&!confirm('Your week has edits. Replace it with the '+(sp?sp.name:id)+' pattern template?'))return;
const days=DAYS.map(()=>[]),labels=DAYS.map(()=>''),reasons=DAYS.map(()=>''),slots=DAYS.map(()=>[]);
tm.forEach(d=>{const i=ORD.indexOf(d.day);labels[i]=d.label||'';reasons[i]=d.reason||'';d.slots.forEach((x,o)=>slots[i].push({slot:x.slot,sets:x.sets,type:x.type,o}))});
state={days,labels,reasons,slots,sel:{...sel},tpl:id};state.applied=snap();upd()}
function slotTile(it,i){const S=PJ&&PJ.slots[it.slot];const d=document.createElement('div');d.className='tile slot';d.dataset.slot=it.slot;
d.innerHTML=`<span class="ic">${ICON[it.type]||''}</span><div class="sl-n">${S?S.name:it.slot} <b>×${it.sets}</b></div><small class="sl-d">${S?S.description:''}</small><em class="sl-tap">Tap to choose</em>`;d.onclick=()=>slotPick(i,it);return d}
function mergedDay(i){const t=state.days[i].map(x=>({t:x})),sl=((state.slots||[])[i]||[]).slice().sort((a,b)=>a.o-b.o);sl.forEach(s=>t.splice(Math.min(s.o,t.length),0,{s}));return t}
function slotPick(i,it){const recs=slotRecommendations(it.slot,sel.level,boardDays(),6),S=PJ.slots[it.slot],E=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
const o=modal(`<div id="slpick"><h3>${E(S.name)}</h3><p class="cf-hint">${E(S.description)}</p>${recs.map(r=>`<button class="sl-opt" data-id="${r.id}"><span>${ICON[r.type]||''} ${E(r.name)}</span><small>${E(r.reason)}</small></button>`).join('')}<div class="cf-hint">Adds ${it.sets} sets.</div><div class="cf-btns"><button id="sl-x">Close</button></div></div>`);
o.querySelector('#sl-x').onclick=closeModal;o.querySelectorAll('.sl-opt').forEach(b=>b.onclick=()=>{const prior=JSON.stringify(state),L=state.slots[i],k=L.indexOf(it);
const at=it.o-L.filter(s=>s.o<it.o).length;L.splice(k,1);state.days[i].splice(Math.min(at,state.days[i].length),0,{id:b.dataset.id,sets:it.sets});closeModal();upd();
toast(`${EX[b.dataset.id].name} fills ${S.name.toLowerCase()}`,()=>{state=JSON.parse(prior);upd()})})}
// v27: slot suggestion for a new custom exercise (patterns-spec "Slot suggestion for new custom exercises"; mirrors tools/patterns.py suggest_slots_for_custom)
function suggestSlotsForCustom(muscles,type){const iso=type=='isolation',lib=LIB().map(i=>EX[i]).filter(e=>(e.type=='isolation')==iso&&(e.patterns||[]).length);
const ks=MUS,cos=(a,b)=>{const d=nsum(ks.map(k=>(a[k]||0)*(b[k]||0))),na=Math.sqrt(nsum(Object.values(a).map(v=>v*v))),nb=Math.sqrt(nsum(Object.values(b).map(v=>v*v)));return na&&nb?d/(na*nb):0};
const c=lib.map((e,k)=>[cos(muscles,e.muscles),k,e]).sort((x,y)=>y[0]-x[0]||x[1]-y[1]);if(!c.length||c[0][0]<.6)return[];
const out=[c[0][2].patterns[0]];for(const[s,,e]of c.slice(1,6))if(s>=.85&&!out.includes(e.patterns[0])&&out.length<3)out.push(e.patterns[0]);return out}
const cleanSlots=a=>Array.isArray(a)?[...new Set(a.filter(s=>PJ&&PJ.slots[s]))]:undefined;
