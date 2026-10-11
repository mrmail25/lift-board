// v14: floating magnet, saved splits, exercise detail sheet, custom photos, muscle pop-up
let IMG={map:{}},YT={};try{YT=JSON.parse(localStorage.getItem('liftboard.youtube'))||{}}catch{}window.YT=YT;
fetch('data/exercise-images.json').then(r=>r.json()).then(j=>IMG=j).catch(()=>{});
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// ---- 1) staging strip (multi-select), persisted
let STG=[];try{STG=(JSON.parse(localStorage.getItem('liftboard.staged'))||[]).filter(i=>typeof i=='string')}catch{}window.STG=STG;window.FLOAT=STG.length?STG:null;
const saveStg=()=>{if(Object.keys(EX).length)STG=STG.filter(i=>EX[i]);window.STG=STG;window.FLOAT=STG.length?STG:null;localStorage.setItem('liftboard.staged',JSON.stringify(STG))};
function renderStrip(){let f=document.querySelector('.floatmag');if(!STG.length){if(f)f.remove();return}
if(!f){f=document.createElement('div');f.className='floatmag';document.body.appendChild(f)}
f.innerHTML=`<div class="fm-head"><b>${STG.length} staged</b><span>Drag one onto a day, or tap a day name to drop all</span><button class="fm-x" aria-label="Clear all staged">✕</button></div><div class="fm-row"></div>`;
const row=f.querySelector('.fm-row');STG.forEach(id=>{const w=document.createElement('div');w.className='fm-item';w.dataset.id=id;const t=tile(EX[id]);t.classList.remove('staged');w.appendChild(t);
w.insertAdjacentHTML('beforeend','<button class="fm-rm" aria-label="Remove">✕</button>');w.querySelector('.fm-rm').onclick=()=>unstage(id);row.appendChild(w)});f.querySelector('.fm-x').onclick=clearFloat}
function markTray(){if(STG.length&&!document.querySelector('.floatmag')&&Object.keys(EX).length){saveStg();renderStrip()}document.querySelectorAll('#tray .tile').forEach(t=>t.classList.toggle('staged',!!t.dataset.id&&STG.includes(t.dataset.id)))}
function floatAdd(id){const i=STG.indexOf(id);i<0?STG.push(id):STG.splice(i,1);saveStg();renderStrip();markTray()}
function unstage(id){STG=STG.filter(x=>x!=id);saveStg();renderStrip();markTray()}
function clearFloat(){STG=[];saveStg();renderStrip();markTray()}
const TORD={primary:0,accessory:1,isolation:2};
function placeFloat(i){const ids=STG.filter(id=>EX[id]).map((id,k)=>[id,k]).sort((a,b)=>(TORD[EX[a[0]].type]??3)-(TORD[EX[b[0]].type]??3)||a[1]-b[1]).map(x=>x[0]);
STG=[];saveStg();renderStrip();ids.forEach(id=>state.days[i].push({id,sets:3}));upd()}
// ---- 2) saved splits
const MKEY='liftboard.mysplits';let MYS=[];try{MYS=JSON.parse(localStorage.getItem(MKEY))||[]}catch{}
const mySplits=window.mySplits=()=>MYS,saveMy=()=>localStorage.setItem(MKEY,JSON.stringify(MYS));
function applyMy(id,force){const m=MYS.find(x=>x.id==id);if(!m)return;const empty=state.days.every(c=>!c.length),untouched=state.applied&&state.applied==snap();
if(!force&&!empty&&!untouched&&!confirm('Your week has edits. Replace it with '+m.name+'?'))return;
state={days:m.days.map(c=>c.filter(t=>EX[t.id]).map(t=>({id:t.id,sets:t.sets}))),labels:[...(m.labels||[])],reasons:[],sel:{...sel}};state.applied=snap();upd()}
function saveAsSplit(){if(state.days.every(c=>!c.length)){alert('Put some exercises on the board first.');return}
modal(`<h3>Save as split</h3><label>Name<input id="ms-n" placeholder="e.g. My 4-day upper/lower"></label><div class="cf-err" id="ms-e"></div><div class="cf-btns"><button class="pri" id="ms-ok">Save</button><button id="ms-x">Cancel</button></div>`);
const o=document.getElementById('modal');o.querySelector('#ms-n').focus();o.querySelector('#ms-x').onclick=closeModal;
o.querySelector('#ms-ok').onclick=()=>{const n=o.querySelector('#ms-n').value.trim();if(!n){o.querySelector('#ms-e').textContent='Give it a name.';return}
if(MYS.some(x=>x.name.toLowerCase()==n.toLowerCase())){o.querySelector('#ms-e').textContent='You already have a split with that name.';return}
const m={id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:n,days:state.days.map(c=>c.map(t=>({id:t.id,sets:t.sets}))),labels:[...(state.labels||[])],saved:new Date().toISOString()};
MYS.push(m);saveMy();sel.split='my:'+m.id;state.applied=snap();save();closeModal();bar();manageSplits()}}
function manageSplits(){const days=m=>m.days.filter(c=>c.length).length;
modal(`<h3>My splits</h3>${MYS.length?'':'<p class="cf-hint">No saved splits yet. Build a week on the board and press "Save as split".</p>'}<div class="ms-list">${MYS.map(m=>`<div class="ms-row" data-id="${m.id}"><span class="ms-name">${E(m.name)}<small>${days(m)} training days · ${m.days.flat().length} exercises</small></span><button data-a="load">Load</button><button data-a="ren">Rename</button><button data-a="del" class="dng">Delete</button></div>`).join('')}</div><div class="cf-btns"><button id="ms-close">Close</button></div>`);
const o=document.getElementById('modal');o.querySelector('#ms-close').onclick=closeModal;
o.querySelectorAll('.ms-row button').forEach(b=>b.onclick=()=>{const id=b.closest('.ms-row').dataset.id,m=MYS.find(x=>x.id==id);
if(b.dataset.a=='load'){sel.split='my:'+id;closeModal();bar();applyMy(id)}
if(b.dataset.a=='ren'){const n=prompt('New name',m.name);if(n&&n.trim()){m.name=n.trim();saveMy();bar();manageSplits()}}
if(b.dataset.a=='del'&&confirm(`Delete "${m.name}"?`)){MYS=MYS.filter(x=>x.id!=id);saveMy();bar();manageSplits()}})}
function importV14(d){if(Array.isArray(d.mySplits))d.mySplits.forEach(m=>{if(m&&m.id&&m.name&&Array.isArray(m.days)&&m.days.length==7){const i=MYS.findIndex(x=>x.id==m.id);i<0?MYS.push(m):MYS[i]=m}});saveMy();
if(d.youtube&&typeof d.youtube=='object'){for(const k in d.youtube)if(/^https?:\/\//.test(d.youtube[k]))YT[k]=d.youtube[k];localStorage.setItem('liftboard.youtube',JSON.stringify(YT))}setTimeout(bar,0)}
// ---- 3/4) detail sheet
const imgsFor=x=>{if(!x)return[];if(x.custom){const c=x.def;if(c.photo)return[c.photo];const b=c.imgFrom||c.base;return imgsFor(EX[b]&&!EX[b].custom?EX[b]:null)}const m=(IMG.map||{})[x.id];return m?m.images:[]};
function openDetail(id){const x=EX[id];if(!x)return;const b=x.custom?EX[x.base]:null,src=x.custom?b:x,im=imgsFor(x),yt=YT[id]||x.youtube||'';
const map=(IMG.map||{})[x.custom?(x.def.imgFrom||x.base):x.id];
modal(`<h3>${ICON[x.type]} ${E(x.name)}${x.estimated?' <em class="est">est.</em>':''}</h3>
<div class="dt-img">${im.length?im.map(u=>`<img src="${E(u)}" alt="">`).join(''):'<div class="dt-ph">No picture yet</div>'}</div>
${im.length&&!(x.custom&&x.def.photo)&&map?`<div class="cf-hint">Picture: “${E(map.source_name)}”${map.match=='approximate'?' (closest variant)':''}, free-exercise-db, public domain (Unlicense).</div>`:''}
${x.custom?`<div class="dt-ph-ctl"><label class="btn">📷 Add machine photo<input type="file" id="dt-file" accept="image/*" capture="environment" hidden></label>
<label>Or use a library picture<select id="dt-lib"><option value="">${b?'Same as base ('+E(b.name)+')':'None'}</option>${Object.values(EX).filter(e=>!e.custom&&(IMG.map||{})[e.id]).map(e=>`<option value="${e.id}" ${x.def.imgFrom==e.id?'selected':''}>${E(e.name)}</option>`).join('')}</select></label>${x.def.photo?'<button id="dt-rm">Remove photo</button>':''}</div>
<p class="cf-hint">Custom exercise based on ${b?E(b.name):'a library exercise'}. Ratings are estimates.</p>`:''}
${src&&src.description?`<p>${E(src.description)}</p>`:''}
${src&&src.howTo&&src.howTo.length?`<b>How to</b><ol class="dt-how">${src.howTo.map(s=>`<li>${E(s)}</li>`).join('')}</ol>`:''}
${src&&src.tip?`<p class="dt-tip">💡 ${E(src.tip)}</p>`:''}
<label>YouTube link<input id="dt-yt" type="url" placeholder="https://youtube.com/…" value="${E(yt)}"></label>${yt?`<a href="${E(yt)}" target="_blank" rel="noopener" class="dt-ytlink">▶ Open video</a>`:''}
<div class="cf-btns"><button class="pri" id="dt-ok">Done</button>${x.custom?'<button id="dt-edit">Edit ratings</button>':''}</div>`);
const o=document.getElementById('modal'),$=s=>o.querySelector(s);
const keepYt=()=>{const v=$('#dt-yt').value.trim();if(!v)delete YT[id];else if(/^https?:\/\//i.test(v))YT[id]=v;localStorage.setItem('liftboard.youtube',JSON.stringify(YT))};
$('#dt-ok').onclick=()=>{keepYt();closeModal()};$('#dt-yt').onchange=keepYt;
if(x.custom){const c=CUS.find(z=>z.id==id);$('#dt-edit').onclick=()=>{keepYt();openForm(id)};
$('#dt-lib').onchange=e=>{c.imgFrom=e.target.value||null;delete c.photo;syncCustom();openDetail(id)};if($('#dt-rm'))$('#dt-rm').onclick=()=>{delete c.photo;syncCustom();openDetail(id)};
$('#dt-file').onchange=e=>{const f=e.target.files[0];if(!f)return;resizeImg(f,800).then(u=>{c.photo=u;try{syncCustom()}catch(err){delete c.photo;alert('Not enough browser storage for this photo.');syncCustom()}keepYt();openDetail(id)}).catch(()=>alert('Could not read that image.'))}}}
function resizeImg(file,max){return new Promise((res,rej)=>{const r=new FileReader();r.onerror=rej;r.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.82))};im.src=r.result};r.readAsDataURL(file)})}
// ---- 5) muscle pop-up
function musclePop(r,cx,cy){if(!r)return;const d=window.HD,grp=r.startsWith('g:'),g=grp?r.slice(2):RG[r],nm=grp?cap(lab(g)):rname(r);const agg={},RAT={};
(d==null?state.days.flat():state.days[d]).forEach(it=>{const x=EX[it.id];if(!x)return;const v=grp?(x.muscles[g]||0):((x.heads||{})[r]||0);if(v<RULE.min_rating_to_count)return;agg[it.id]=(agg[it.id]||0)+v*it.sets;(RAT[it.id]=RAT[it.id]||{r:v,s:0}).s+=it.sets});
const rows=Object.entries(agg).sort((a,b)=>b[1]-a[1]),tot=rows.reduce((a,b)=>a+b[1],0);let p=document.getElementById('mpop');if(!p){p=document.createElement('div');p.id='mpop';document.body.appendChild(p)}
p.innerHTML=`<button class="mp-x" aria-label="Close">✕</button><b>${E(nm)}</b> <span class="mp-sc">${d==null?'this week':DAYS[d]}</span><div class="mp-tot">${Math.round(tot*10)/10} effective sets</div>
${rows.length?`<table>${rows.map(([id,v])=>`<tr><td>${E(EX[id].name)}${EX[id].estimated?' <em class="est">est.</em>':''}</td><td class="mp-ratio">${RAT[id].r.toFixed(2).replace(/0$/,'')} × ${RAT[id].s} sets = ${(Math.round(v*10)/10).toFixed(1)} eff</td><td>${Math.round(v/tot*100)}%</td></tr>`).join('')}</table>`:'<div class="cf-hint">No exercise on the board hits this muscle'+(d==null?' this week':' on '+DAYS[d])+'.</div>'}`;
p.querySelector('.mp-x').onclick=()=>p.remove();const W=Math.min(300,innerWidth-16);p.style.width=W+'px';p.style.left=Math.max(8,Math.min(innerWidth-W-8,(cx||innerWidth/2)-W/2))+'px';
const h=p.offsetHeight;let top=(cy||100)+14;if(top+h>innerHeight-8)top=Math.max(8,(cy||100)-h-14);p.style.top=top+'px'}
document.addEventListener('pointerdown',e=>{const p=document.getElementById('mpop');if(p&&!p.contains(e.target)&&!e.target.closest('.mm,#vol .row'))p.remove()});
addEventListener('scroll',()=>{const p=document.getElementById('mpop');if(p)p.remove()},{passive:true});
// toolbar buttons + About
(function(){const nb=document.getElementById('bar');nb.insertAdjacentHTML('beforeend','<button id="savesp">Save as split</button><button id="mysp">My splits</button>');
document.getElementById('savesp').onclick=saveAsSplit;document.getElementById('mysp').onclick=manageSplits;
const a=document.querySelector('header .actions');a.insertAdjacentHTML('beforeend','<button id="about">About</button>');document.getElementById('about').onclick=()=>{modal(`<h3>About Lift Board</h3>
<p>Exercise pictures: <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a> by yuhonas, released into the public domain under <a href="https://unlicense.org/" target="_blank" rel="noopener">The Unlicense</a>. Some pictures show the closest available variant.</p>
<p>Body map: <a href="https://github.com/Jsplice/MuscleMap" target="_blank" rel="noopener">MuscleMap</a> (@musclemap/assets 1.1.0), MIT License, © 2026 Jsplice / MuscleMap contributors. <a href="img/mm/LICENSE-MuscleMap.txt" target="_blank">License</a></p>
<p class="cf-hint">Your board, custom exercises, photos, saved splits and video links are stored only in this browser. Use Export to back them up.</p><div class="cf-btns"><button id="ab-x">Close</button></div>`);document.getElementById('ab-x').onclick=closeModal}})();

