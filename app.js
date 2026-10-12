const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],ICON={primary:'★',accessory:'✚',isolation:'●'},KEY='liftboard.v1';
let SP=null,sel={level:'beginner',days:3,split:null};let F={types:[],mus:[],eq:[],minor:false};let EX={},MUS=[],TG={},LMF={beginner:.6,intermediate:.8,advanced:1},RULE={min_rating_to_count:.25,round_to:.5},state={days:DAYS.map(()=>[])};
const lab=m=>m.replace(/_/g,' ');
async function init(){try{const[e,t]=await Promise.all([fetch('data/exercises.json').then(r=>r.json()),fetch('data/targets.json').then(r=>r.json())]);
MUS=e.muscles;window.REG=e.regions;window.RG=e.regionGroup;e.exercises.forEach(x=>EX[x.id]=x);TG=t.targets;if(t.levelMinFactor)LMF=t.levelMinFactor;try{SP=await fetch('data/splits.json').then(r=>r.json())}catch{}Object.assign(RULE,t.counting||{});if(window.loadCustom)await loadCustom();}catch(err){alert('Could not load data files. Serve this folder over http.');}
try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.days){state=s;if(s.sel)sel={...sel,...s.sel}}}catch{}filt();render();bar()}
const snap=()=>JSON.stringify(state.days);const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
function tile(x,item){const d=document.createElement('div');d.className='tile '+x.type;d.dataset.id=x.id;
const tags=Object.entries(x.muscles).filter(([,v])=>v>=RULE.min_rating_to_count).sort((a,b)=>b[1]-a[1]).map(([m,v])=>`<span>${lab(m)}${v<1?' '+v:''}</span>`).join('');
d.innerHTML=`<span class="grip" title="Drag">⋮⋮</span><div class="n"><span class="ic">${ICON[x.type]}</span>${x.name}${x.estimated?' <em class="est" title="Estimated ratings (custom exercise)">est.</em>':''}</div><div class="tags">${tags}</div>${x.custom&&!item?'<button class="cedit" title="Edit, duplicate or delete">✎</button>':''}`;
if(x.custom&&!item)d.querySelector('.cedit').onclick=()=>openForm(x.id);
if(item){d.innerHTML+=`<div class="sets"><button data-a="-">−</button><input type="number" min="0" value="${item.sets}"><button data-a="+">+</button> sets${x.custom?'<button class="feel" title="Where did you feel it?">Feel?</button>':''}</div><button class="del">✕</button>`;
if(x.custom)d.querySelector('.feel').onclick=()=>openFeel(x.id);
const inp=d.querySelector('input');inp.onchange=()=>{item.sets=Math.max(0,+inp.value||0);upd()};
d.querySelectorAll('.sets button[data-a]').forEach(b=>b.onclick=()=>{item.sets=Math.max(0,item.sets+(b.dataset.a=='+'?1:-1));upd()});
d.querySelector('.del').onclick=()=>{state.days.forEach(c=>{const i=c.indexOf(item);if(i>=0)c.splice(i,1)});upd()};}
d.addEventListener('pointerdown',ev=>{if(ev.target.closest('button,input,select'))return;if(ev.target.closest('.grip')){startDrag(ev,d,x.id,item);return}
const sx=ev.clientX,sy=ev.clientY;let lp=setTimeout(()=>{lp=null;cleanup();if(navigator.vibrate)try{navigator.vibrate(15)}catch{};startDrag(ev,d,x.id,item)},250);
const mv=e=>{if(Math.hypot(e.clientX-sx,e.clientY-sy)>8)cleanup()},cleanup=()=>{if(lp)clearTimeout(lp);lp=null;removeEventListener('pointermove',mv);removeEventListener('pointerup',cleanup);removeEventListener('pointercancel',cleanup)};
addEventListener('pointermove',mv);addEventListener('pointerup',cleanup);addEventListener('pointercancel',cleanup)});if(!item)d.insertAdjacentHTML('beforeend','<button class="info" title="Details" aria-label="Details">i</button>');const ib=d.querySelector('.info');if(ib)ib.onclick=()=>openDetail(x.id);
d.addEventListener('click',ev=>{if(ev.target.closest('button,input,select')||Date.now()-(window._dragEnd||0)<400)return;if(item)openDetail(x.id);else if(!d.closest('.floatmag'))floatAdd(x.id)});return d}
function render(){const b=document.getElementById('board');b.innerHTML='';
DAYS.forEach((n,i)=>{const c=document.createElement('div');c.className='col'+(window.HD===i?' daysel':'');c.innerHTML=`<h3>${n}<small>${(state.labels||[])[i]||''}</small></h3>`;const body=document.createElement('div');body.className='col-body';body.dataset.day=i;
state.days[i].forEach(it=>EX[it.id]&&body.appendChild(tile(EX[it.id],it)));c.querySelector('h3').onclick=()=>{if(window.FLOAT){placeFloat(i);return}window.HD=window.HD===i?null:i;render()};c.appendChild(body);b.appendChild(c)});
const q=document.getElementById('q').value.toLowerCase(),tr=document.getElementById('tray');tr.innerHTML='';
Object.values(EX).filter(x=>pass(x,q)).forEach(x=>tr.appendChild(tile(x)));const fc=document.getElementById('fcount');if(fc)fc.textContent=tr.children.length+' shown';vol();if(window.markTray)markTray();if(window.pcheck)pcheck();if(window.anUpdate)anUpdate();if(window.heat)heat()}
function pass(x,q){if(q&&!(x.name.toLowerCase().includes(q)||Object.keys(x.muscles).some(m=>x.muscles[m]>=.5&&lab(m).includes(q))))return false;
if(F.types.length&&!F.types.includes(x.type))return false;if(F.eq.length&&!F.eq.some(q=>q==x.equipment||(q=='machine'&&/^(plate-loaded|selectorized) machine$/.test(x.equipment))))return false;
const th=F.minor?RULE.min_rating_to_count:.5;if(F.mus.length&&!F.mus.some(m=>(m=='back'?['lats','upper_back']:[m]).some(k=>(x.muscles[k]||0)>=th)))return false;return true}
function filt(){const el=document.getElementById('filt'),eqs=[...new Set(Object.values(EX).map(x=>x.equipment))].sort();
const ch=(k,v,t)=>`<button class="chip ${F[k].includes(v)?'on':''}" data-k="${k}" data-v="${v}">${t}</button>`;
const nAct=F.types.length+F.mus.length+F.eq.length+(F.minor?1:0);let op=localStorage.getItem('liftboard.filtOpen');op=op==null?innerWidth>800:op=='1';
el.innerHTML=`<button id="ftog" class="ftog">${op?'▾':'▸'} Filters (${nAct} active)</button><div id="fbody" style="display:${op?'flex':'none'}"><div class="fl">Type</div><div class="chips">${['primary','accessory','isolation'].map(t=>ch('types',t,ICON[t]+' '+t)).join('')}</div>
<div class="fl">Muscles</div><div class="chips">${[ch('mus','back','Back (all)')].concat(MUS.map(m=>ch('mus',m,cap(lab(m))))).join('')}</div>
<label><input type="checkbox" id="minor" ${F.minor?'checked':''}> Include minor hits (0.25+)</label>
<div class="fl">Equipment</div><div class="chips">${eqs.map(e=>ch('eq',e,cap(e))).join('')}</div>
<div><button id="fclr" class="chip">Clear filters</button> <span id="fcount"></span></div></div>`;el.querySelector('#ftog').onclick=()=>{localStorage.setItem('liftboard.filtOpen',op?'0':'1');filt()};
el.querySelectorAll('.chip[data-k]').forEach(b=>b.onclick=()=>{const a=F[b.dataset.k],i=a.indexOf(b.dataset.v);i<0?a.push(b.dataset.v):a.splice(i,1);filt();render()});
el.querySelector('#minor').onchange=e=>{F.minor=e.target.checked;render()};
el.querySelector('#fclr').onclick=()=>{F={types:[],mus:[],eq:[],minor:false};document.getElementById('q').value='';filt();render()}}
const cap=s=>s[0].toUpperCase()+s.slice(1);
function upd(){save();render()}
function totals(day){const t={};MUS.forEach(m=>t[m]=0);(day==null?state.days.flat():state.days[day]).forEach(it=>{const x=EX[it.id];if(!x)return;for(const m in x.muscles){const r=x.muscles[m];if(r>=RULE.min_rating_to_count)t[m]+=r*it.sets}});
for(const m in t)t[m]=Math.round(t[m]/RULE.round_to)*RULE.round_to;return t}
const tgt=m=>{const g=TG[m]||{min:0,max:10};return{min:Math.round(g.min*(LMF[sel.level]||1)*2)/2,max:g.max}};
function status(v,{min,max}){if(v<min-2||v>max*1.25)return'red';if(v<min||v>max)return'amber';return'green'}
function vol(){const t=totals(),el=document.getElementById('vol');el.innerHTML=MUS.map(m=>{const g=tgt(m),s=status(t[m],g),p=Math.min(100,t[m]/(g.max*1.25)*100);
return`<div class="row ${s}" data-m="${m}"><span>${cap(lab(m))}</span><div class="bar"><i style="width:${p}%"></i></div><b>${t[m]} / ${g.min}-${g.max}</b></div>`}).join('');el.querySelectorAll('.row').forEach(r=>r.onclick=e=>window.musclePop&&musclePop('g:'+r.dataset.m,e.clientX,e.clientY))}
let drag=null;document.addEventListener('touchmove',e=>{if(drag)e.preventDefault()},{passive:false});
function startDrag(ev,el,id,item){ev.preventDefault();const r=el.getBoundingClientRect(),g=el.cloneNode(true);g.classList.add('dragging');document.body.appendChild(g);
const ph=document.createElement('div');ph.className='ph';drag={id,item,g,ph,dx:ev.clientX-r.left,dy:ev.clientY-r.top,src:el};if(item)el.style.display='none';
document.body.classList.add('isdrag');move(ev);addEventListener('pointermove',move);addEventListener('pointerup',end,{once:true});addEventListener('pointercancel',end,{once:true})}
function move(ev){if(!drag)return;drag.g.style.left=ev.clientX-drag.dx+'px';drag.g.style.top=ev.clientY-drag.dy+'px';
const cc=document.elementsFromPoint(ev.clientX,ev.clientY).map(e=>e.closest&&e.closest('.col')).find(Boolean),col=cc&&cc.querySelector('.col-body[data-day]');if(!col){drag.ph.remove();return}
const after=[...col.querySelectorAll('.tile')].filter(x=>x.style.display!='none').find(x=>{const b=x.getBoundingClientRect();return ev.clientY<b.top+b.height/2});
after?col.insertBefore(drag.ph,after):col.appendChild(drag.ph)}
function end(){if(!drag)return;removeEventListener('pointermove',move);removeEventListener('pointerup',end);removeEventListener('pointercancel',end);document.body.classList.remove('isdrag');const{ph,item,id,g}=drag;g.remove();const _fl=ph.parentNode&&drag.src.closest('.floatmag');
if(ph.parentNode){const col=ph.parentNode,day=+col.dataset.day;const idx=[...col.children].filter(x=>x===ph||x.style.display!='none').indexOf(ph);
const it=item||{id,sets:3};state.days.forEach(c=>{const i=c.indexOf(it);if(i>=0)c.splice(i,1)});state.days[day].splice(idx,0,it);ph.remove()}
const fl=_fl;window._dragEnd=Date.now();drag=null;if(fl&&window.unstage)unstage(id);upd()}
document.getElementById('q').oninput=render;
document.getElementById('clr').onclick=()=>{if(confirm('Clear the whole week?')){state={days:DAYS.map(()=>[])};upd()}};
const WD=['mon','tue','wed','thu','fri','sat','sun'];
function bar(){if(!SP)return;const L=document.getElementById('lvl'),D=document.getElementById('dc'),S=document.getElementById('split');
L.innerHTML=['beginner','intermediate','advanced'].map(l=>`<button data-v="${l}" class="${sel.level==l?'on':''}">${l[0].toUpperCase()+l.slice(1)}</button>`).join('');
D.innerHTML=[2,3,4,5,6].map(d=>`<button data-v="${d}" class="${sel.days==d?'on':''}">${d} days</button>`).join('');
const ok=SP.splits.filter(x=>(x.levelDayCounts?(x.levelDayCounts[sel.level]||[]).includes(sel.days):x.dayCounts.includes(sel.days))&&x.levels[sel.level]&&x.levels[sel.level][sel.days]);
const MY=window.mySplits?mySplits():[];if(!ok.find(x=>x.id==sel.split)&&!MY.find(x=>'my:'+x.id==sel.split))sel.split=ok[0]&&ok[0].id;
S.innerHTML=`<optgroup label="Presets">`+ok.map(x=>`<option value="${x.id}" ${x.id==sel.split?'selected':''}>${x.name}</option>`).join('')+'</optgroup>'+(MY.length?`<optgroup label="My splits">${MY.map(x=>`<option value="my:${x.id}" ${'my:'+x.id==sel.split?'selected':''}>${x.name.replace(/</g,'&lt;')}</option>`).join('')}</optgroup>`:'');
L.querySelectorAll('button').forEach(b=>b.onclick=()=>{sel.level=b.dataset.v;state.sel={...sel};save();bar();render()});
D.querySelectorAll('button').forEach(b=>b.onclick=()=>{sel.days=+b.dataset.v;state.sel={...sel};save();bar()});S.onchange=()=>{sel.split=S.value}}
function applySplit(force){if(String(sel.split).startsWith('my:'))return applyMy(sel.split.slice(3),force);const sp=SP.splits.find(x=>x.id==sel.split);if(!sp)return;
const empty=state.days.every(c=>!c.length),untouched=state.applied&&state.applied==snap();
if(!force&&!empty&&!untouched&&!confirm('Your week has edits. Replace it with '+sp.name+'?'))return;
const days=DAYS.map(()=>[]),labels=DAYS.map(()=>''),reasons=DAYS.map(()=>'');
sp.levels[sel.level][sel.days].forEach(d=>{const i=WD.indexOf(d.day);labels[i]=d.label;reasons[i]=d.reason||'';d.tiles.forEach(t=>EX[t.id]&&days[i].push({id:t.id,sets:t.sets}))});
state={days,labels,reasons,sel:{...sel}};state.applied=snap();upd()}
document.getElementById('apply').onclick=()=>applySplit();
document.getElementById('exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'lift-board',version:2,...state,customExercises:typeof CUS!='undefined'?CUS:[],mySplits:window.mySplits?mySplits():[],youtube:window.YT||{},analytics:window.AN?{sleep:AN.sleep,age:AN.age,baselines:AN.baselines,normal:AN.normal}:undefined},null,1)],{type:'application/json'}));a.download='lift-board-week.json';a.click()};
document.getElementById('imp').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(s=>{const d=JSON.parse(s);if(!Array.isArray(d.days)||d.days.length!=7)throw 0;if(Array.isArray(d.customExercises)&&window.syncCustom){d.customExercises.forEach(c=>{if(c&&c.id&&c.ratings&&String(c.id).startsWith('custom-')){const i=CUS.findIndex(x=>x.id==c.id);i<0?CUS.push(c):CUS[i]=c}});syncCustom()}if(window.importV14)importV14(d);if(window.importAN)importAN(d);state={labels:d.labels,days:d.days.map(c=>c.filter(i=>EX[i.id]).map(i=>({id:i.id,sets:+i.sets||0})))};upd()}).catch(()=>alert('Not a valid Lift Board file.'));e.target.value=''};
init();
// test hook: #fill=level,days,splitId
addEventListener('load',()=>setTimeout(()=>{const m=location.hash.match(/fill=(\w+),(\d),([\w-]+)/);if(m&&SP){sel={level:m[1],days:+m[2],split:m[3]};bar();applySplit(true)}},500));
addEventListener('load',()=>setTimeout(()=>{const h=new URLSearchParams(location.hash.slice(1).replace(/^fill=[^&]*&?/,''));
if(h.get('day'))window.HD=+h.get('day');if(h.get('mus'))F.mus=h.get('mus').split('.');if(h.get('eq'))F.eq=h.get('eq').split('.');if(h.get('type'))F.types=h.get('type').split('.');filt();render()},900));
