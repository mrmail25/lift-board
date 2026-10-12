// v12 custom exercises (rules: data/custom-rules.json)
const CKEY='liftboard.custom';let CR=null,CUS=[];
const clamp01=v=>Math.max(0,Math.min(1,Math.round(v*100)/100));
const tplCat=id=>{for(const c in CR.templates)if(CR.templates[c].includes(id))return c;return null};
function buildCustom(c){// order: template/picker ratings -> position delta -> resistance curve -> feel nudges; clamp; groups = max of heads
const h={},mods=c.position&&CR.modifiers.position[c.cat]&&CR.modifiers.position[c.cat].options[c.position]||{};let stretch=c.curve=='stretch'||!!mods.stretch_biased;
REG.forEach(r=>h[r]=clamp01((c.ratings[r]||0)+(typeof mods[r]=='number'?mods[r]:0)));
if(c.curve=='top')REG.forEach(r=>{if(h[r]>=.75)h[r]=clamp01(h[r]+CR.modifiers.resistance_curve.options.top.primary_delta)});
const post={...h};REG.forEach(r=>h[r]=clamp01(h[r]+((c.feelOffsets||{})[r]||0)));
const m={};MUS.forEach(g=>m[g]=0);REG.forEach(r=>{const g=RG[r];m[g]=Math.max(m[g]||0,h[r])});
return{id:c.id,name:c.name,type:c.type,equipment:c.equipment,base:c.base,muscles:m,heads:h,post,custom:true,estimated:true,pattern:c.pattern||null,fatigue:(EX[c.base]&&EX[c.base].fatigue)||undefined,stretch_biased:stretch,def:c}}
const basePat=b=>{if(typeof RU=='undefined'||!RU)return null;for(const p in RU.patterns)if(RU.patterns[p].includes(b))return p;return null};
function migratePat(){if(typeof RU=='undefined'||!RU)return;let ch=0;CUS.forEach(c=>{if(!c.pattern&&c.base){const p=basePat(c.base);if(p){c.pattern=p;ch=1}}});if(ch){localStorage.setItem(CKEY,JSON.stringify(CUS));CUS.forEach(c=>{if(EX[c.id])EX[c.id].pattern=c.pattern||null})}}window.migratePat=migratePat;
function syncCustom(){migratePat();Object.keys(EX).forEach(k=>{if(EX[k].custom)delete EX[k]});CUS.forEach(c=>EX[c.id]=buildCustom(c));localStorage.setItem(CKEY,JSON.stringify(CUS))}
async function loadCustom(){try{CR=await fetch('data/custom-rules.json').then(r=>r.json())}catch{return}try{CUS=JSON.parse(localStorage.getItem(CKEY))||[]}catch{CUS=[]}
CUS=CUS.filter(c=>c&&c.id&&c.ratings);syncCustom();addBtn()}
function addBtn(){const tr=document.getElementById('tray');if(document.getElementById('addex'))return;const b=document.createElement('button');b.id='addex';b.className='addex';b.textContent='+ Add exercise';b.onclick=()=>openForm();tr.parentNode.insertBefore(b,tr)}
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'exercise';
const rid=()=>Array.from({length:6},()=>'0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random()*36)]).join('');
const newId=n=>'custom-'+slug(n)+'-'+rid();
const LV=()=>CR.rating_levels,nearest=v=>{let best='none',d=9;for(const k in LV()){const e=Math.abs(LV()[k]-v);if(e<d-1e-9){d=e;best=k}}return best};
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function modal(html){closeModal();const o=document.createElement('div');o.id='modal';o.innerHTML=`<div class="mbox">${html}</div>`;o.onclick=e=>{if(e.target===o)closeModal()};document.body.appendChild(o);return o}
function closeModal(){const m=document.getElementById('modal');if(m)m.remove()}
function openForm(editId,dup){const ex=editId&&CUS.find(c=>c.id==editId);const eqs=[...new Set(Object.values(EX).filter(x=>!x.custom).map(x=>x.equipment))].sort();
const f=ex?JSON.parse(JSON.stringify(ex)):{name:'',equipment:'machine',base:'',type:'accessory',cat:null,ratings:{},curve:'mid',position:'standard',feelOffsets:{}};
if(dup){f.name=f.name+' (copy)';f.id=null;f.feelOffsets={}}
const o=modal(`<h3>${ex&&!dup?'Edit':'Add'} custom exercise</h3>
<label>Name<input id="cf-name" value="${esc(f.name)}" placeholder="e.g. Hammer Strength incline press, Gym X"></label>
<label>Equipment<select id="cf-eq">${eqs.map(e=>`<option ${e==f.equipment?'selected':''}>${e}</option>`).join('')}</select></label>
<label>Closest library exercise (base template)<select id="cf-base"><option value="">Choose…</option>${Object.entries(CR.templates).map(([c,ids])=>`<optgroup label="${cap(lab(c))}">${ids.filter(i=>EX[i]).map(i=>`<option value="${i}" ${i==f.base?'selected':''}>${EX[i].name}</option>`).join('')}</optgroup>`).join('')}</select></label>
<div id="cf-rest"></div><div id="cf-err" class="cf-err"></div>
<div class="cf-btns"><button id="cf-save" class="pri">Save</button>${ex&&!dup?'<button id="cf-dup">Duplicate</button><button id="cf-del" class="dng">Delete</button>':''}<button id="cf-x">Cancel</button></div>`);
const $=s=>o.querySelector(s);let adv=false;
const rest=()=>{const el=$('#cf-rest');if(!f.base){el.innerHTML='<p class="cf-hint">Pick the closest library exercise. Its type and every muscle rating are copied, then you can adjust them.</p>';return}
const pos=CR.modifiers.position[f.cat],rc=CR.modifiers.resistance_curve;const x=buildCustom({...f,id:'tmp'});
el.innerHTML=`<label>Type<select id="cf-type">${['primary','accessory','isolation'].map(t=>`<option value="${t}" ${t==f.type?'selected':''}>${ICON[t]} ${t}</option>`).join('')}</select></label>
<label>${rc.label}<select id="cf-curve">${Object.entries(rc.options).map(([k,v])=>`<option value="${k}" ${k==f.curve?'selected':''}>${v.label}</option>`).join('')}</select></label>
${pos?`<label>${pos.label}<select id="cf-pos">${Object.keys(pos.options).map(k=>`<option value="${esc(k)}" ${k==f.position?'selected':''}>${cap(k)}</option>`).join('')}</select></label>`:''}
<div class="cf-mh"><b>Muscles worked</b><label class="cf-adv"><input type="checkbox" id="cf-adv" ${adv?'checked':''}> Exact numbers</label></div>
<div class="cf-musc">${REG.map(r=>{const v=f.ratings[r]||0,lv=nearest(v);return`<div class="cf-row" data-r="${r}"><span class="cf-rn">${rname(r)}</span><span class="seg cf-seg">${Object.keys(LV()).map(k=>`<button data-l="${k}" class="${k==lv?'on':''}">${cap(k)}</button>`).join('')}</span>${adv?`<input type="number" min="0" max="1" step="0.05" value="${v}">`:''}<i class="cf-fin">${x.heads[r]!=v?'→ '+x.heads[r]:''}</i></div>`}).join('')}</div>
<p class="cf-hint">Final values (→) include the position and curve adjustments${Object.keys(f.feelOffsets||{}).length?' and your feel adjustments':''}. All custom ratings are estimates.</p>`;
$('#cf-type').onchange=e=>f.type=e.target.value;$('#cf-curve').onchange=e=>{f.curve=e.target.value;rest()};if(pos)$('#cf-pos').onchange=e=>{f.position=e.target.value;rest()};
$('#cf-adv').onchange=e=>{adv=e.target.checked;rest()};
o.querySelectorAll('.cf-row').forEach(row=>{const r=row.dataset.r;row.querySelectorAll('button').forEach(b=>b.onclick=()=>{f.ratings[r]=LV()[b.dataset.l];rest()});const i=row.querySelector('input');if(i)i.onchange=()=>{f.ratings[r]=clamp01(Math.round((+i.value||0)/.05)*.05);rest()}})};
$('#cf-base').onchange=e=>{const b=EX[e.target.value];f.base=e.target.value;if(b){f.type=b.type;f.cat=tplCat(b.id);f.ratings={...b.heads};f.position='standard';f.curve=(Object.values(RU?RU.stretch_biased:{}).some(l=>l.includes(b.id)))?'stretch':'mid'}rest()};rest();
$('#cf-x').onclick=closeModal;
$('#cf-save').onclick=()=>{f.name=$('#cf-name').value.trim();f.equipment=$('#cf-eq').value;const err=[],warn=[];
if(!f.name)err.push('Give it a name.');if(CUS.some(c=>c.name.toLowerCase()==f.name.toLowerCase()&&c.id!==(dup?null:f.id)))err.push('You already have a custom exercise with that name.');
if(!f.base)err.push('Pick a base template.');const x=f.base&&buildCustom({...f,id:'tmp'});if(x&&!REG.some(r=>x.heads[r]>=.25))err.push('Set at least one muscle to Minor or higher.');
if(x&&REG.filter(r=>x.heads[r]>=1).length>4)warn.push('More than 4 muscles are Primary, which usually means the ratings are overestimated.');
if(err.length){$('#cf-err').textContent=err.join(' ');return}if(warn.length&&!$('#cf-err').dataset.w){$('#cf-err').dataset.w=1;$('#cf-err').textContent=warn[0]+' Press Save again to keep it.';return}
f.pattern=basePat(f.base)||f.pattern||null;if(!f.id||dup){f.id=newId(f.name);CUS.push(f)}else CUS[CUS.findIndex(c=>c.id==f.id)]=f;f.estimated=true;syncCustom();closeModal();upd()};
if(ex&&!dup){$('#cf-dup').onclick=()=>openForm(ex.id,true);$('#cf-del').onclick=()=>{const used=state.days.flat().filter(t=>t.id==ex.id).length;if(!confirm(`Delete "${ex.name}"?`+(used?` It's on the board ${used} time(s) and will be removed.`:'')))return;
CUS=CUS.filter(c=>c.id!=ex.id);state.days=state.days.map(c=>c.filter(t=>t.id!=ex.id));syncCustom();closeModal();upd()}}}
function openFeel(id){const c=CUS.find(x=>x.id==id);if(!c)return;const x=EX[id],fb=CR.feel_feedback,pick={};
const o=modal(`<h3>${fb.prompt}</h3><p class="cf-hint">${esc(c.name)}: tap only the muscles you noticed. Each session moves a rating by at most ${fb.per_session_cap}, and never more than ${fb.total_drift_cap} in total.</p>
<div class="cf-musc">${REG.filter(r=>x.post[r]>0||(RG[r]&&x.muscles[RG[r]]>0)).map(r=>`<div class="cf-row" data-r="${r}"><span class="cf-rn">${rname(r)} <i>${x.heads[r]}</i></span><span class="seg cf-seg">${Object.keys(fb.choices).map(k=>`<button data-k="${k}">${cap(k)}</button>`).join('')}</span></div>`).join('')}</div>
<div class="cf-btns"><button id="fb-ok" class="pri">Apply</button><button id="fb-reset">Reset feel adjustments</button><button id="fb-x">Cancel</button></div>`);
o.querySelectorAll('.cf-row').forEach(row=>row.querySelectorAll('button').forEach(b=>b.onclick=()=>{row.querySelectorAll('button').forEach(z=>z.classList.toggle('on',z===b));pick[row.dataset.r]=b.dataset.k}));
o.querySelector('#fb-x').onclick=closeModal;o.querySelector('#fb-reset').onclick=()=>{c.feelOffsets={};syncCustom();closeModal();upd()};
o.querySelector('#fb-ok').onclick=()=>{c.feelOffsets=c.feelOffsets||{};for(const r in pick){const d=Math.max(-fb.per_session_cap,Math.min(fb.per_session_cap,fb.choices[pick[r]]));
let off=Math.max(-fb.total_drift_cap,Math.min(fb.total_drift_cap,(c.feelOffsets[r]||0)+d));const base=x.post[r];if(base==0)off=Math.min(off,.25);
off=Math.max(-base,Math.min(1-base,off));off=Math.round(off*100)/100;if(off)c.feelOffsets[r]=off;else delete c.feelOffsets[r]}syncCustom();closeModal();upd()}}
// share of a region's load coming from estimated (custom) exercises
function estShare(r,day){const grp=r.startsWith('g:'),g=grp?r.slice(2):null;let tot=0,est=0;(day==null?state.days.flat():state.days[day]).forEach(it=>{const x=EX[it.id];if(!x)return;const v=grp?(x.muscles[g]||0):((x.heads||{})[r]||0);if(v<RULE.min_rating_to_count)return;tot+=v*it.sets;if(x.estimated)est+=v*it.sets});return tot?est/tot:0}
