// Build = the magnetic whiteboard. Storyboard glue (mock board, real logic): chits are dragged between day columns,
// every number comes from logic/progcheck.js (Coach's check_program.py port), logic/rank.js (tray suggestions + why lines),
// targets.json (targets, curves, session thresholds) and rules.json (volume_bands, rules, fix_actions, spinal_load).
(function(){'use strict';
const X=window.SBX,PC=window.PCHECK,RANK=window.RANK,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const DAYS=PC.ORDER,WD=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],WDL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const RD=()=>X.RD,LEVELS=['beginner','intermediate','advanced'];
// body region of a muscle -> chit edge colour (tokens.css --mg-*)
const REGION={chest:'chest',front_delts:'shoulders',side_delts:'shoulders',rear_delts:'shoulders',lats:'back',upper_back:'back',traps:'back',
  biceps:'arms',triceps:'arms',forearms:'arms',abs:'core',obliques:'core',lower_back:'core',quads:'legs',hamstrings:'legs',glutes:'legs',calves:'legs',adductors:'legs',abductors:'legs'};
const SHORT=[[/\s*\(.*?\)/g,''],[/\bDumbbell\b/g,'DB'],[/\bBarbell\b/g,'BB'],[/\bOverhead\b/g,'OH'],[/\bTriceps\b/g,'Tri'],[/\bExtension\b/g,'Ext'],[/\bSingle-Arm\b/g,'1-Arm'],[/\bMachine\b/g,'Mach.']];
const shortName=id=>SHORT.reduce((s,[a,b])=>s.replace(a,b),X.exNameP(id)).trim();
const ex=id=>RD().EX[id];
const mainMuscle=id=>{const e=ex(id),M=RD().exl.muscles;let b=M[0];for(const m of M)if(e.muscles[m]>e.muscles[b])b=m;return b};
const repsFor=id=>{const rr=RANK.meta(RD(),X.prefs()).rep_ranges[ex(id).type]||[8,12];return rr[0]+'–'+rr[1]};
const setsFor=id=>{const G=RD().rules.pattern_gap_fix.sets_by_kind;return ex(id).type==='isolation'?G.isolation:G.compound}; // rules.json pattern_gap_fix
let UID=0;const T=(id,sets,reps)=>({u:'c'+(++UID),id,sets,reps:reps||null});
// ------------------------------------------------------------- state
const B={name:'',level:'intermediate',version:0,dirty:false,edited:0,days:[],sel:new Set(),hist:[]};
function blankDays(){return DAYS.map(d=>({day:d,label:'',tiles:[]}))}
function loadDays(list,name){const days=blankDays();for(const d of list){const k=DAYS.indexOf(d.day);days[k].label=d.label||'';days[k].tiles=d.tiles.filter(t=>ex(t.id)).map(t=>T(t.id,t.sets,t.reps))}B.days=days;if(name)B.name=name}
function initBoard(){ // Mr Dude's draft: his Upper / Lower with two edits since v3 (bench 6 sets, cable fly in for the Thursday incline press)
  const r=X.ROUTINES[0],dmap={Mon:'mon',Tue:'tue',Wed:'wed',Thu:'thu',Fri:'fri',Sat:'sat',Sun:'sun'};
  const list=r.days.map(d=>({day:dmap[d.d],label:d.n,tiles:d.ex.map(e=>({id:e.id,sets:e.s,reps:e.r}))}));
  list[0].tiles[0].sets=6;list[0].tiles.splice(1,1,{id:'incline-dumbbell-press',sets:3,reps:'8–10'});list[2].tiles.splice(0,1,{id:'cable-fly',sets:3,reps:'12–15'});
  loadDays(list,r.name);B.version=3;B.dirty=true;B.edited=Date.now()-2*60000;B.level='intermediate';B.sel.clear();B.hist=[]}
const snap=()=>JSON.stringify({days:B.days,name:B.name,dirty:B.dirty,edited:B.edited,version:B.version,level:B.level});
function restore(s){const o=JSON.parse(s);Object.assign(B,o);B.sel=new Set()}
function commit(fn,undoText){B.hist.push(snap());fn();B.dirty=true;B.edited=Date.now();paint();if(undoText)undoBar(undoText)}
function undo(){const s=B.hist.pop();if(!s)return;restore(s);paint();hideUndo();X.toast('Undone')}
const checkDays=days=>(days||B.days).filter(d=>d.tiles.length).map(d=>({day:d.day,tiles:d.tiles.map(t=>({id:t.id,sets:t.sets}))}));
const rankBoard=()=>B.days.filter(d=>d.tiles.length).map(d=>({day:d.day,label:d.label,tiles:d.tiles.map(t=>({id:t.id,sets:t.sets}))}));
const sum=a=>a.reduce((x,y)=>x+y,0);
const mins5=m=>Math.round(m/5)*5,hm=m=>{m=Math.round(m);const h=Math.floor(m/60);return h?`${h} h ${String(m%60).padStart(2,'0')} m`:`${m} min`};
function stateLine(){if(!B.dirty)return `<b class="saved">Saved v${B.version}</b> · in your Library`;const s=Math.max(0,(Date.now()-B.edited)/1000);
  const ago=s<60?'just now':Math.round(s/60)+' min ago';return `<b class="draft">Draft</b> · edited ${ago}${B.version?` · last saved v${B.version}`:' · not saved yet'}`}
// ------------------------------------------------------------- stats (live: board, or the drag preview)
function stats(days){const d=checkDays(days),A=PC.analytics(RD(),d,B.level),C=PC.checks(RD(),d,B.level);return {A,C,d}}
function volMap(A){const o={};for(const [m,v] of Object.entries(A.muscles))o[m]=v.raw>0?X.vStat(v.raw,v.min,v.max):null;return o}
function stripHtml(st){const {A,C,d}=st,avg=d.length?A.weekMinutes/d.length:0,fail=C.total-C.pass;
  return `<span class="amaps">${X.map('front',volMap(A))}${X.map('back',volMap(A))}</span>
   <span class="ast"><b class="num" data-s="sets">${A.weekSets}</b><small>sets / wk</small></span>
   <span class="ast"><b class="num" data-s="min">${d.length?'≈ '+mins5(avg):'–'}</b><small>min / session</small></span>
   <span class="ast chk ${fail?'bad':'ok'}"><b class="num" data-s="checks">${C.pass}/${C.total}</b><small>checks pass</small></span>`}
function dayMeta(day){const n=sum(day.tiles.map(t=>t.sets));return day.tiles.length?`${n} sets · ≈ ${mins5(PC.sessionMinutes(RD(),day.tiles.map(t=>({id:t.id,sets:t.sets}))))} min`:''}
function paintStats(days){days=days||B.days;const st=stats(days);const s=$('#astrip');if(s){s.innerHTML=stripHtml(st);s.setAttribute('aria-label',`Analysis: ${st.A.weekSets} sets a week, ${st.C.pass} of ${st.C.total} checks pass`)}
  days.forEach((d,i)=>{const n=sum(d.tiles.map(t=>t.sets));const b=$(`#dstrip [data-jump="${i}"] .dn`);if(b)b.textContent=d.tiles.length?n:'–';
    const h=$(`.col[data-day="${d.day}"] .cm`);if(h)h.textContent=dayMeta(d)});
  const bs=$('#bstate');if(bs)bs.innerHTML=stateLine();return st}
// ------------------------------------------------------------- view
function chit(t){const e=ex(t.id),g=REGION[mainMuscle(t.id)]||'core',sel=B.sel.has(t.u)?' sel':'';
  return `<div class="chit${sel}" data-u="${t.u}" data-id="${t.id}" style="--mc:var(--mg-${g})" role="button" tabindex="0" aria-label="${X.exNameP(t.id)}, ${t.sets} sets"><span class="cg ${e.type}" aria-hidden="true">${X.GLY[e.type]}</span><span class="cn">${shortName(t.id)}</span><span class="cs num">${t.sets}</span></div>`}
function colHtml(d,i){return `<section class="col${d.tiles.length?'':' restday'}" data-day="${d.day}" data-i="${i}"><header><b>${WD[i]}</b><span class="cl">${d.label||(d.tiles.length?'':'Rest')}</span><span class="cm num">${dayMeta(d)}</span></header>
  <div class="chits" data-day="${d.day}">${d.tiles.map(chit).join('')}</div><button class="cadd" data-b="add" data-day="${d.day}" aria-label="Add exercise to ${WDL[i]}">${X.I('plus',2.2)}</button></section>`}
function boardHtml(){return `<div class="cols">${B.days.map(colHtml).join('')}</div>`}
X.V.build=()=>{if(!B.days.length)initBoard();
  return `<div class="bw">${X.header('Build',`<button class="ibtn" data-b="new" aria-label="New routine">${X.I('plus',2.2)}</button>`+X.bookBtn+X.gearBtn)}
  <div class="bname"><div class="grow"><div class="bn">${B.name||'New routine'}</div><div class="bstate" id="bstate">${stateLine()}</div></div><span class="blv">${B.level[0].toUpperCase()+B.level.slice(1)}</span></div>
  <div class="bstick"><button class="astrip" id="astrip" data-b="analysis"></button>
   <div class="dstrip" id="dstrip">${WD.map((w,i)=>`<button data-jump="${i}" aria-label="Jump to ${WDL[i]}"><span>${w}</span><b class="dn num">–</b></button>`).join('')}</div>
   <div class="selbar" id="selbar"><span id="selt"></span><button class="btn plain" data-b="seldone">Done</button></div></div>
  <div class="board" id="board">${boardHtml()}</div>
  <p class="foot bhint">Hold a chit to lift it. Drag it to another day, or off the board to remove it.</p>
  <div class="bacts"><button class="btn ink" data-b="push">${X.I('up',2.2)} Push to Library</button><button class="btn accent" data-b="start">${X.I('play')} Start training</button></div></div>`};
X.AFTER.build=()=>{paint(true);const bd=$('#board');bd.addEventListener('scroll',markDay,{passive:true});markDay()};
function paint(full){const bd=$('#board');if(!bd)return;const sl=bd.scrollLeft;if(!full)bd.innerHTML=boardHtml();bd.scrollLeft=sl;const bn=$('.bname .bn');if(bn)bn.textContent=B.name||'New routine';
  const lv=$('.blv');if(lv)lv.textContent=B.level[0].toUpperCase()+B.level.slice(1);paintStats();paintSel();if(AN&&!AN.closed)renderAnalysis()}
let JMP=-1;function markDay(){const bd=$('#board');if(!bd)return;const cols=$$('.col',bd),o=cols[0].offsetLeft,x=bd.scrollLeft+8;let k=0;cols.forEach((c,i)=>{if(c.offsetLeft-o<=x)k=i});
  if(JMP>k&&bd.scrollLeft>=bd.scrollWidth-bd.clientWidth-2)k=JMP;$$('#dstrip button').forEach((b,i)=>b.classList.toggle('on',i===k))}
function jump(i){const bd=$('#board'),c=$$('.col',bd)[i];if(!c)return;JMP=i;bd.scrollTo({left:c.offsetLeft-bd.firstElementChild.offsetLeft,behavior:'smooth'});$$('#dstrip button').forEach((b,j)=>b.classList.toggle('on',j===i))}
function paintSel(){const bar=$('#selbar');if(!bar)return;const n=B.sel.size;bar.classList.toggle('on',n>0);$('#selt').textContent=n?`${n} selected · drag one to move all`:'';
  $$('.chit').forEach(c=>c.classList.toggle('sel',B.sel.has(c.dataset.u)));document.body.classList.toggle('b-select',n>0)}
// ------------------------------------------------------------- undo bar
let UT=null;function undoBar(t){let u=$('#bundo');if(!u){u=document.createElement('div');u.id='bundo';u.className='bundo';$('#app').appendChild(u)}
  u.innerHTML=`<span>${t}</span><button data-b="undo">Undo</button>`;u.classList.add('on');clearTimeout(UT);UT=setTimeout(hideUndo,6000)}
function hideUndo(){const u=$('#bundo');if(u)u.classList.remove('on')}
// ------------------------------------------------------------- model edits
const findT=u=>{for(const d of B.days){const i=d.tiles.findIndex(t=>t.u===u);if(i>=0)return {d,i,t:d.tiles[i]}}return null};
function removeU(uids){const out=[];for(const d of B.days)d.tiles=d.tiles.filter(t=>{if(uids.includes(t.u)){out.push(t);return false}return true});return out}
function moveTo(uids,day,idx){const order=[];B.days.forEach(d=>d.tiles.forEach(t=>{if(uids.includes(t.u))order.push(t)}));removeU(uids);const D=B.days.find(d=>d.day===day);D.tiles.splice(Math.min(idx,D.tiles.length),0,...order)}
function previewDays(uids,target,add){const days=JSON.parse(JSON.stringify(B.days)),moved=[];days.forEach(d=>d.tiles=d.tiles.filter(t=>{if(uids.includes(t.u)){moved.push(t);return false}return true}));
  if(add)moved.push(add);if(target){const D=days.find(d=>d.day===target.day);D.tiles.splice(target.idx,0,...moved)}return days}
// fix -> board: keep uids/reps of tiles that stay, new tiles get new chits
function applyDays(list){const pool={};B.days.forEach(d=>d.tiles.forEach(t=>(pool[t.id]=pool[t.id]||[]).push(t)));
  const by={};list.forEach(d=>by[d.day]=d);B.days.forEach(d=>{const n=by[d.day];if(!n){if(d.tiles.length)d.tiles=[];return}
    d.tiles=n.tiles.map(x=>{const p=(pool[x.id]||[]).shift();return p?Object.assign(p,{sets:x.sets}):T(x.id,x.sets)})})}
// ------------------------------------------------------------- drag engine (pointer events; long-press lifts)
const LONG=380,SLOP=8;let P=null,DRAG=null,RAF=0,TAP={},NOCLICK=0;
const vib=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
document.addEventListener('pointerdown',e=>{if(X.S.scr!=='build'||e.button>0)return;const c=e.target.closest('.chit,.trow[data-id]');if(!c||e.target.closest('button'))return;
  const tray=c.classList.contains('trow');P={el:c,tray,x:e.clientX,y:e.clientY,t:performance.now(),lifted:false,moved:false,id:e.pointerId};
  const quick=!tray&&B.sel.has(c.dataset.u); // in select mode a selected chit drags at once
  if(!quick)P.timer=setTimeout(()=>{if(P&&!P.moved)lift(P.x,P.y)},LONG)},true);
document.addEventListener('pointermove',e=>{if(!P)return;const dx=e.clientX-P.x,dy=e.clientY-P.y;P.cx=e.clientX;P.cy=e.clientY;
  if(!P.lifted){if(Math.hypot(dx,dy)>SLOP){P.moved=true;clearTimeout(P.timer);if(!(B.sel.has(P.el.dataset.u)&&!P.tray))P=null;else lift(P.x,P.y)}return}
  if(Math.hypot(e.clientX-P.lx,e.clientY-P.ly)>4)P.dragged=true;e.preventDefault();moveDrag(e.clientX,e.clientY)},{passive:false});
document.addEventListener('touchmove',e=>{if(DRAG)e.preventDefault()},{passive:false}); // no page/board scroll while a chit is up
const endP=e=>{if(!P)return;clearTimeout(P.timer);const p=P;P=null;
  if(!p.lifted){if(!p.moved&&!p.tray&&performance.now()-p.t<LONG+200){clearTimeout(TAP.t);TAP={el:p.el,t:setTimeout(()=>{const el=TAP.el;TAP={};if(el)tapChit(el)},350)}}return}
  NOCLICK=performance.now();
  if(!p.dragged){settle(false);if(!p.tray){B.sel.add(p.el.dataset.u);paintSel();vib(8)}return}
  drop()};
document.addEventListener('pointerup',endP);
document.addEventListener('pointercancel',()=>{if(!P)return;clearTimeout(P.timer);const lifted=P.lifted;P=null;if(lifted){settle(false);paintStats()}}); // a cancelled gesture never taps or drops
function lift(x,y){const p=P;if(!p)return;p.lifted=true;p.lx=x;p.ly=y;vib(12);
  const uids=p.tray?[]:(B.sel.has(p.el.dataset.u)?[...B.sel]:[p.el.dataset.u]);if(!p.tray&&!B.sel.has(p.el.dataset.u)&&B.sel.size){B.sel.clear();paintSel()}
  const add=p.tray?T(p.el.dataset.id,setsFor(p.el.dataset.id)):null;
  const g=document.createElement('div');g.className='bghost';g.innerHTML=p.tray?chit(add):p.el.outerHTML;const gc=g.firstElementChild;gc.classList.add('lifted');gc.classList.remove('sel');
  if(uids.length>1)g.insertAdjacentHTML('beforeend',`<span class="gcount num">${uids.length}</span>`);$('#app').appendChild(g);
  const r=p.tray?{width:Math.min(150,$('.col')?$('.col').offsetWidth-14:140),height:46,left:x-60,top:y-23}:p.el.getBoundingClientRect();
  g.style.width=r.width+'px';DRAG={uids,add,g,ox:x-r.left,oy:y-r.top,target:null,ph:null,tray:p.tray};
  uids.forEach(u=>{const el=$(`.chit[data-u="${u}"]`);if(el)el.classList.add('src')});
  document.body.classList.add('b-dragging');if(p.tray&&TRAY)TRAY.el.classList.add('peek');
  const ph=document.createElement('div');ph.className='cph';DRAG.ph=ph;moveDrag(x,y);autoScroll()}
function moveDrag(x,y){const D=DRAG;if(!D)return;D.x=x;D.y=y;D.g.style.transform=`translate(${x-D.ox}px,${y-D.oy}px)`;
  const bd=$('#board'),br=bd.getBoundingClientRect(),inside=x>=br.left&&x<=br.right&&y>=br.top-10&&y<=br.bottom+30;
  let target=null;if(inside){const el=document.elementFromPoint(Math.min(Math.max(x,br.left+2),br.right-2),Math.min(Math.max(y,br.top+2),br.bottom-2)),col=el&&el.closest('.col');
    if(col){const box=$('.chits',col),items=$$('.chit:not(.src)',box);let idx=items.length;for(let k=0;k<items.length;k++){const r=items[k].getBoundingClientRect();if(y<r.top+r.height/2){idx=k;break}}
      target={day:col.dataset.day,idx};if(D.ph.parentNode!==box||D.ph.__idx!==idx){D.ph.__idx=idx;D.ph.style.height=(D.g.firstElementChild.offsetHeight||44)+'px';box.insertBefore(D.ph,items[idx]||null)}}}
  if(!target&&D.ph.parentNode)D.ph.remove();
  document.body.classList.toggle('b-off',!target&&!D.tray);$$('.col').forEach(c=>c.classList.toggle('over',!!target&&c.dataset.day===target.day));
  const key=JSON.stringify(target);if(key!==D.key){D.key=key;D.target=target;paintStats(previewDays(D.uids,target,D.add))}} // the strip previews the drop, mid-drag
function autoScroll(){cancelAnimationFrame(RAF);const step=()=>{if(!DRAG)return;const bd=$('#board'),br=bd.getBoundingClientRect(),E=34;
  if(DRAG.y>br.top&&DRAG.y<br.bottom){if(DRAG.x<br.left+E)bd.scrollLeft-=9;else if(DRAG.x>br.right-E)bd.scrollLeft+=9}RAF=requestAnimationFrame(step)};RAF=requestAnimationFrame(step)}
function settle(keepTray){const D=DRAG;DRAG=null;cancelAnimationFrame(RAF);if(!D)return null;D.g.remove();if(D.ph.parentNode)D.ph.remove();$$('.chit.src').forEach(c=>c.classList.remove('src'));
  document.body.classList.remove('b-dragging','b-off');$$('.col.over').forEach(c=>c.classList.remove('over'));if(TRAY&&!keepTray)TRAY.el.classList.remove('peek');return D}
function drop(){const D=settle(false);if(!D)return;const t=D.target;
  if(D.tray){if(!t){paintStats();return}commit(()=>{const Dd=B.days.find(d=>d.day===t.day);Dd.tiles.splice(t.idx,0,D.add)},`Added ${X.exNameP(D.add.id)} to ${WD[DAYS.indexOf(t.day)]}`);refreshTray();return}
  if(!t){const n=D.uids.length,nm=n>1?`${n} exercises`:X.exNameP(findT(D.uids[0]).t.id);commit(()=>{removeU(D.uids);B.sel.clear()},`Removed ${nm}`);return}
  commit(()=>{moveTo(D.uids,t.day,t.idx);B.sel.clear()},null);const n=D.uids.length;X.toast(n>1?`Moved ${n} to ${WD[DAYS.indexOf(t.day)]}`:`Moved to ${WD[DAYS.indexOf(t.day)]}`)}
function tapChit(el){const u=el.dataset.u;if(B.sel.size){B.sel.has(u)?B.sel.delete(u):B.sel.add(u);paintSel();return}chitSheet(u)}
// ------------------------------------------------------------- chit sheet
let CS=null;
function chitSheet(u){const f=findT(u);if(!f)return;const id=f.t.id,e=ex(id),day=f.d.day;
  const body=()=>{const g=findT(u);if(!g)return '';const t=g.t,rp=t.reps||repsFor(t.id);
    return `<div class="csh"><div class="csh-h">${X.gl(t.id)}<div class="grow"><div class="t1">${X.exNameP(t.id)}</div><div class="t2">${X.exSub(t.id)} · ${WDL[DAYS.indexOf(g.d.day)]}</div></div></div>
     <div class="group"><div class="row"><div class="grow t1">Sets</div><div class="step"><button data-b="sets-" aria-label="Fewer sets">−</button><b class="num" id="cs-sets">${t.sets}</b><button data-b="sets+" aria-label="More sets">+</button></div></div>
      <div class="row"><div class="grow t1">Reps <span class="smp" title="No rep data in splits.json yet">sample</span></div><div class="step"><button data-b="reps-" aria-label="Lower reps">−</button><b class="num" id="cs-reps">${rp}</b><button data-b="reps+" aria-label="Higher reps">+</button></div></div></div>
     <div class="cacts"><button data-b="c-swap">${X.I('swap',1.8)}<span>Swap</span></button><button data-b="c-info">${X.I('info',1.8)}<span>Info</span></button><button data-b="c-dup">${X.I('plus',2)}<span>Duplicate</span></button><button data-b="c-del" class="dl">${X.I('trash',1.8)}<span>Delete</span></button></div></div>`};
  CS=X.sheet({title:'',cls:'grouped csheet',body:body(),onClose(){CS=null}});CS.u=u;CS.re=()=>{CS.body.innerHTML=body()};return CS}
function chitAct(k){if(!CS)return;const u=CS.u,f=findT(u);if(!f)return;const t=f.t;
  if(k==='sets-'||k==='sets+'){const n=Math.max(1,Math.min(10,t.sets+(k==='sets+'?1:-1)));if(n!==t.sets)commit(()=>{findT(u).t.sets=n});CS.re();return}
  if(k==='reps-'||k==='reps+'){const [a,b]=(t.reps||repsFor(t.id)).split('–').map(Number),d=k==='reps+'?1:-1;if(a+d<1)return;commit(()=>{findT(u).t.reps=(a+d)+'–'+(b+d)});CS.re();return}
  if(k==='c-swap'){X.setSC({board:rankBoard(),day:f.d.day});const s=CS;s.close();X.swapSheet(t.id,{onPick:nid=>{commit(()=>{const g=findT(u);g.t.id=nid;g.t.reps=null},`Swapped in ${X.exNameP(nid)}`)}});return}
  if(k==='c-info'){CS.close();return X.go('#learn-ex-'+t.id)}
  if(k==='c-dup'){commit(()=>{const g=findT(u);g.d.tiles.splice(g.i+1,0,T(g.t.id,g.t.sets,g.t.reps))},`Duplicated ${X.exNameP(t.id)}`);CS.close();return}
  if(k==='c-del'){CS.close();commit(()=>removeU([u]),`Removed ${X.exNameP(t.id)}`)}}
// ------------------------------------------------------------- tray (Suggested / Library, filter chips, drag or +)
let TRAY=null;const TFB={mode:'sug',type:null,mus:null,day:'mon'};
function trayRows(){const RDv=RD(),ids=Object.keys(RDv.EX).filter(i=>{const e=RDv.EX[i];return (!TFB.type||e.type===TFB.type)&&(!TFB.mus||(e.muscles[TFB.mus]||0)>=0.5)});
  const rows=TFB.mode==='sug'?RANK.rank(RDv,'tray',ids,{board:rankBoard(),day:TFB.day},X.prefs(),24):ids.slice(0,60).map(id=>({id}));
  return `<div class="tcount">${TFB.mode==='sug'?`Ranked for ${WDL[DAYS.indexOf(TFB.day)]} · hold a row to drag it onto any day`:'Library order · hold a row to drag it onto any day'}</div><div class="group">`+
   rows.map(r=>`<div class="row trow" data-id="${r.id}">${X.gl(r.id)}<div class="grow"><div class="t1">${X.exNameP(r.id)}</div>${r.reasons?X.whyR(r):`<div class="t2">${X.exSub(r.id)}</div>`}</div><button class="addc" data-b="tadd" data-id="${r.id}" aria-label="Add to ${WD[DAYS.indexOf(TFB.day)]}">${X.I('plus',2.2)}</button></div>`).join('')+'</div>'}
function traySheet(day){TFB.day=day||TFB.day;const ch=(k,v,l)=>`<button class="chip ${TFB[k]===v?'on':''}" data-tf="${k}" data-v="${v}">${l}</button>`;
  TRAY=X.sheet({title:`Add to ${WD[DAYS.indexOf(TFB.day)]}`,cls:'grouped btray',modal:false,right:'<button class="btn plain" data-b="tclose">Done</button>',onClose(){TRAY=null},
    body:`<div class="pad0"><div class="seg sm" id="tmodeb"><button class="${TFB.mode==='sug'?'on':''}" data-tm="sug">Suggested</button><button class="${TFB.mode==='lib'?'on':''}" data-tm="lib">Library</button></div></div>
    <div class="chips fl noswipe">${['primary','accessory','isolation'].map(t=>ch('type',t,X.GLY[t]+' '+t[0].toUpperCase()+t.slice(1))).join('')}${['chest','lats','upper_back','side_delts','rear_delts','biceps','triceps','quads','hamstrings','glutes','calves','abs'].map(m=>ch('mus',m,X.ML[m])).join('')}</div>
    <div class="tlist" id="btlist">${trayRows()}</div>`});return TRAY}
function refreshTray(){if(TRAY){$('#btlist',TRAY.el).innerHTML=trayRows();const h=$('.sh-head .t',TRAY.el);if(h)h.textContent=`Add to ${WD[DAYS.indexOf(TFB.day)]}`}}
// ------------------------------------------------------------- analysis sheet
let AN=null,FIX=[];const RLAB=id=>id.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
const LBL=m=>(RD().rules.ranking.labels.regions[m])||X.ML[m]||m.replace(/_/g,' ');
function renderAnalysis(){if(!AN)return;const {A,C,d}=stats(),R=RD().rules,RU={};R.rules.forEach(r=>RU[r.id]=r);FIX=[];const lv=B.level;
  const warn=C.flags.filter(f=>f[0]==='warn'),info=C.flags.filter(f=>f[0]==='info'),fx=f=>{const list=PC.fixes(RD(),d,lv,f);return list.map(z=>{FIX.push(z);return `<div class="fxr"><span>${z.preview}${z.resolves?'':` <em>${R.partial_label}</em>`}</span><button class="btn sm grey" data-b="apply" data-k="${FIX.length-1}">Apply</button></div>`}).join('')||'<div class="fxr none">No one-tap fix passes the checks. Adjust it by hand.</div>'};
  const flagRow=f=>`<div class="flag ${f[0]}" data-flag="${f[1]}" data-rule="${f[1].startsWith('spinal_load')?'spinal_load':f[1]}"><p>${PC.message(RD(),f,d,lv)}</p>${fx(f)}</div>`;
  const passing=C.list.filter(c=>!c.warn.length).map(c=>RLAB(c.id));
  const T=Object.entries(A.muscles).filter(([m,v])=>v.raw>0||v.min>0),VB=X.VB;
  const vrow=([m,v])=>{const st=v.raw>0?X.vStat(v.raw,v.min,v.max):'under',top=v.max*(VB.red_factor||1.25);return `<div class="row vrow" data-vs="${st}"><span class="vm">${X.ML[m]||m}</span><span class="vb"><i style="--w:${Math.min(1,v.raw/top)*100}%" class="vs-${st}"></i><b style="--x:${v.max/top*100}%"></b></span><span class="vn num">${+v.raw.toFixed(1)}<small>/${v.min}–${v.max}</small></span></div>`};
  const FM=R.frequency_muscles,fq=m=>B.days.map((dd,i)=>{const e=PC.eff(RD(),dd.tiles.map(t=>({id:t.id,sets:t.sets})))[m]||0;return `<i class="${e>=RD().targets.analytics.frequency_min_effective?'on':e>0?'lo':''}" title="${WD[i]}"></i>`}).join('');
  const SL=RU.session_length,mx=Math.max(SL.warn_min+15,...A.day.map(x=>x.minutes));
  const SP=A.spinal,cm=Object.keys(A.muscles).includes(AN.mus)?AN.mus:'chest';
  AN.body.innerHTML=`<div class="anh"><div class="big num">${C.pass} of ${C.total}</div><div class="sub">checks pass · ${warn.length?`${new Set(warn.map(f=>f[1])).size} need attention`:'nothing needs attention'} · ${info.length} notes</div></div>
   ${warn.length?`<div class="ghead">Needs attention</div><div class="flags">${warn.map(flagRow).join('')}</div>`:''}
   <div class="ghead">Weekly sets per muscle</div><div class="group vol">${T.map(vrow).join('')}</div>${X.volLegend()}
   <div class="ghead">Frequency <span class="gsub">days with ${RD().targets.analytics.frequency_min_effective}+ effective sets</span></div>
   <div class="group freq"><div class="row fqh"><span class="vm"></span><span class="fq">${WD.map(w=>`<i>${w[0]}</i>`).join('')}</span></div>${FM.map(m=>`<div class="row"><span class="vm">${X.ML[m]}</span><span class="fq">${fq(m)}</span></div>`).join('')}</div>
   <div class="ghead">Session length <span class="gsub">info ${SL.info_min} · warn ${SL.warn_min} min</span></div>
   <div class="group sess">${A.day.map(x=>`<div class="row"><span class="vm">${WD[DAYS.indexOf(x.day)]}</span><span class="sbar"><i style="--w:${x.minutes/mx*100}%" class="${x.minutes>=SL.warn_min?'w':x.minutes>=SL.info_min?'i':''}"></i><b style="--x:${SL.info_min/mx*100}%"></b><b class="w" style="--x:${SL.warn_min/mx*100}%"></b></span><span class="vn num">${Math.round(x.minutes)}</span></div>`).join('')||'<div class="row sub">No training days yet</div>'}</div>
   <div class="ghead">Fatigue and spinal load</div>
   <div class="group sess">${A.day.map(x=>`<div class="row"><span class="vm">${WD[DAYS.indexOf(x.day)]}</span><span class="fz num">${x.cost.toFixed(1)} <small>fatigue</small></span><span class="fz num ${x.spinal>SP.session_max?'over':''}">${x.spinal}/${SP.session_max} <small>spine sets</small></span></div>`).join('')}
    <div class="row"><span class="vm"><b>Week</b></span><span class="fz num"><b>${A.weekCost.toFixed(1)}</b> <small>fatigue</small></span><span class="fz num ${SP.week>SP.week_max?'over':''}"><b>${SP.week}/${SP.week_max}</b> <small>spine sets</small></span></div></div>
   <p class="foot">Fatigue = sets × each exercise's fatigue rating (targets.json recovery). It becomes a % once you save a normal week. Heavy spine sets = heavy squats and hinges (rules.json spinal_load).</p>
   <div class="ghead">Stimulus curve</div>
   <div class="chips fl noswipe" id="anmus">${T.filter(([,v])=>v.raw>0).map(([m])=>`<button class="chip ${m===cm?'on':''}" data-anm="${m}">${X.ML[m]||m}</button>`).join('')}</div>
   <div class="card curve">${curve(cm,A)}</div>
   <p class="foot">${A.curveModel}. ${A.disclaimer}</p>
   ${info.length?`<details class="andet" id="annotes"><summary class="ghead">${info.length} notes <span class="gsub">suggestions, not problems</span></summary><div class="flags">${info.map(flagRow).join('')}</div></details>`:''}
   <div class="ghead">Sample data <span class="smp">sample</span></div><div class="group asks" id="anasks">${DATA_ASKS.map(t=>`<div class="row"><div class="grow t2">${t}</div></div>`).join('')}</div>
   <details class="andet" id="anpass"><summary class="ghead">${passing.length} passing checks</summary><div class="pass">${passing.map(p=>`<span class="tag">✓ ${p}</span>`).join('')}</div></details><div style="height:24px"></div>`}
const DATA_ASKS=['Rep ranges are sample values: splits.json tiles carry sets only.','Fatigue shows points, not %, until there is a baseline week (targets.json recovery).','Chit edge colours use a storyboard muscle → body-region map, not data.'];
function curve(m,A){const v=A.muscles[m],k=v.k,x=v.x,Sx=z=>1-Math.exp(-z/k),Xm=Math.max(30,Math.ceil((Math.max(x,v.max)+4)/5)*5),W=320,H=168,px=z=>30+z/Xm*(W-40),py=z=>H-30-z*(H-44);
  let d='';for(let i=0;i<=60;i++){const z=i/60*Xm;d+=(i?'L':'M')+px(z).toFixed(1)+','+py(Sx(z)).toFixed(1)}const nx=Sx(x+1)-Sx(x),tk=[];for(let z=0;z<=Xm;z+=Xm>30?10:5)tk.push(`<text x="${px(z)}" y="${H-14}" text-anchor="middle">${z}</text>`);
  return `<svg class="ancurve" viewBox="0 0 ${W} ${H}" data-m="${m}"><rect x="${px(v.min)}" y="8" width="${px(v.max)-px(v.min)}" height="${H-38}" class="band"/>${[0,.5,1].map(z=>`<line x1="30" x2="${W-8}" y1="${py(z)}" y2="${py(z)}"/><text x="26" y="${py(z)+3}" text-anchor="end">${z*100}%</text>`).join('')}${tk.join('')}
   <path d="${d}" class="cv"/><circle cx="${px(x)}" cy="${py(Sx(x))}" r="5" class="dot"/><text x="${px(v.min)+4}" y="20" class="bl">target ${v.min}–${v.max}</text></svg>
   <div class="anread"><b>${X.ML[m]||m}</b>: ${x.toFixed(1)} effective sets a week → ${Math.round(Sx(x)*100)}% of the modeled max. Next set ≈ +${(nx*100).toFixed(1)}%.</div>`}
function analysisSheet(){AN=X.sheet({title:'Analysis',cls:'tall grouped ansheet',right:'<button class="btn plain" data-b="anclose">Done</button>',onClose(){AN=null}});AN.mus='chest';renderAnalysis();return AN}
// ------------------------------------------------------------- New menu (blank, split template, library preset)
let NW=null;const NS={split:'upper-lower',level:'intermediate',n:'4'};
function newBody(view){const SP=RD().splits.splits,PT=RD().patterns.templates;
  if(view==='tpl'){const s=SP.find(x=>x.id===NS.split),lv=s.levels[NS.level]?NS.level:Object.keys(s.levels)[0];NS.level=lv;const ns=Object.keys(s.levels[lv]);if(!ns.includes(NS.n))NS.n=ns[0];
    const days=s.levels[lv][NS.n],pt=((PT[NS.split]||{}).levels||{})[lv],ptd=pt&&pt[NS.n],SL=RD().patterns.slots,mn=sum(days.map(d=>PC.sessionMinutes(RD(),d.tiles)));
    return `<div class="nwv"><button class="btn plain nwback" data-b="nwback">‹ New</button>
     <div class="ghead">Split</div><div class="chips wrap">${SP.map(x=>`<button class="chip ${x.id===NS.split?'on':''}" data-ns="split" data-v="${x.id}">${x.name}</button>`).join('')}</div>
     <div class="ghead">Level</div><div class="pad0"><div class="seg">${LEVELS.map(l=>`<button class="${l===lv?'on':''} ${s.levels[l]?'':'off'}" data-ns="level" data-v="${l}" ${s.levels[l]?'':'disabled'}>${l[0].toUpperCase()+l.slice(1)}</button>`).join('')}</div></div>
     <div class="ghead">Days a week</div><div class="chips">${ns.map(n=>`<button class="chip ${n===NS.n?'on':''}" data-ns="n" data-v="${n}">${n} days</button>`).join('')}</div>
     <div class="ghead">Preview · ${days.length} days · ≈ ${hm(mn)} a week</div>
     <div class="group">${days.map((d,i)=>`<div class="row"><div class="grow"><div class="t1">${WD[DAYS.indexOf(d.day)]} · ${d.label}</div><div class="t2">${ptd&&ptd[i]?ptd[i].slots.map(x=>SL[x.slot].name).join(', '):d.tiles.length+' exercises'}</div></div><span class="val num">${d.tiles.length}</span></div>`).join('')}</div>
     <p class="foot">Exercises from splits.json, slots from patterns.json. You can move anything after.</p>
     <div class="pad"><button class="btn accent block" data-b="nwtpl">Use this template</button></div></div>`}
  if(view==='lib')return `<div class="nwv"><button class="btn plain nwback" data-b="nwback">‹ New</button><div class="ghead">Your library</div>
     <div class="group">${X.ROUTINES.map(r=>`<div class="row"><div class="grow"><div class="t1">${r.name}</div><div class="t2">${r.meta} · ${r.days.length} days</div></div><button class="btn sm grey" data-b="nwlib" data-id="${r.id}">Duplicate &amp; edit</button></div>`).join('')}</div>
     <p class="foot">The copy opens as a draft. The original stays as it is until you push the copy.</p></div>`;
  return `<div class="nwv"><div class="group nwopts">
    <button class="row" data-b="nwblank"><span class="ico gr">${X.I('plus',2)}</span><div class="grow"><div class="t1">Blank board</div><div class="t2">Seven empty days</div></div>${X.CHEV}</button>
    <button class="row" data-b="nwtplv"><span class="ico acc">${X.I('build',1.8)}</span><div class="grow"><div class="t1">From a split template</div><div class="t2">Choose the split, level and days</div></div>${X.CHEV}</button>
    <button class="row" data-b="nwlibv"><span class="ico gr">${X.I('book',1.8)}</span><div class="grow"><div class="t1">From your library</div><div class="t2">Duplicate a routine and edit the copy</div></div>${X.CHEV}</button></div>
    <p class="foot">Your current draft is kept in Undo until you leave Build.</p></div>`}
function newSheet(view){NW=X.sheet({title:'New routine',cls:'grouped',right:'<button class="btn plain" data-b="nwclose">Cancel</button>',body:newBody(view),onClose(){NW=null}});NW.v=view;return NW}
const nwView=v=>{if(NW){NW.v=v;NW.body.innerHTML=newBody(v)}};
function startFrom(kind,arg){if(NW)NW.close();
  if(kind==='blank')commit(()=>{B.days=blankDays();B.name='New routine';B.version=0},'Started a blank board');
  if(kind==='tpl'){const s=RD().splits.splits.find(x=>x.id===NS.split);commit(()=>{loadDays(s.levels[NS.level][NS.n],`${s.name} · ${NS.n} days`);B.level=NS.level;B.version=0},`Started from ${s.name}`)}
  if(kind==='lib'){const r=X.ROUTINES.find(x=>x.id===arg),dm={Mon:'mon',Tue:'tue',Wed:'wed',Thu:'thu',Fri:'fri',Sat:'sat',Sun:'sun'};
    commit(()=>{loadDays(r.days.map(d=>({day:dm[d.d],label:d.n,tiles:d.ex.map(e=>({id:e.id,sets:e.s,reps:e.r}))})),'Copy of '+r.name);B.level=/Beginner/.test(r.meta)?'beginner':/Advanced/.test(r.meta)?'advanced':'intermediate';B.version=0},`Copied ${r.name}`)}
  const bd=$('#board');if(bd)bd.scrollLeft=0;markDay()}
// ------------------------------------------------------------- one delegated click handler for Build
// a tap opens its sheet on the click that follows it (else the synthesized click lands on the new sheet's backdrop);
// clicks right after a lift/drag are swallowed for the same reason.
document.addEventListener('click',e=>{if(X.S.scr!=='build')return;
  if(TAP.el){const el=TAP.el;clearTimeout(TAP.t);TAP={};e.preventDefault();e.stopPropagation();return tapChit(el)}
  if(NOCLICK&&performance.now()-NOCLICK<350){NOCLICK=0;e.preventDefault();e.stopPropagation();return}const b=e.target.closest('[data-b]');
  const tm=e.target.closest('[data-tm]');if(tm&&TRAY){TFB.mode=tm.dataset.tm;$$('#tmodeb button').forEach(x=>x.classList.toggle('on',x===tm));refreshTray();return}
  const tf=e.target.closest('[data-tf]');if(tf&&TRAY){const k=tf.dataset.tf;TFB[k]=TFB[k]===tf.dataset.v?null:tf.dataset.v;$$(`[data-tf=${k}]`,TRAY.el).forEach(c=>c.classList.toggle('on',TFB[k]===c.dataset.v));refreshTray();return}
  const am=e.target.closest('[data-anm]');if(am&&AN){AN.mus=am.dataset.anm;const sc=AN.body.scrollTop;renderAnalysis();AN.body.scrollTop=sc;return}
  const ns=e.target.closest('[data-ns]');if(ns&&NW){NS[ns.dataset.ns]=ns.dataset.v;nwView('tpl');return}
  const j=e.target.closest('[data-jump]');if(j)return jump(+j.dataset.jump);
  if(!b)return;const k=b.dataset.b;e.stopPropagation();
  if(k==='analysis')return analysisSheet();if(k==='anclose')return AN&&AN.close();
  if(k==='apply'){const z=FIX[+b.dataset.k];if(!z)return;commit(()=>applyDays(z.days),`Applied: ${z.preview}`);return}
  if(k==='undo')return undo();
  if(k==='add'){if(TRAY){TFB.day=b.dataset.day;refreshTray();return}return traySheet(b.dataset.day)}
  if(k==='tadd'){const id=b.dataset.id;commit(()=>{const D=B.days.find(d=>d.day===TFB.day);D.tiles.push(T(id,setsFor(id)))},`Added ${X.exNameP(id)} to ${WD[DAYS.indexOf(TFB.day)]}`);refreshTray();return}
  if(k==='tclose')return TRAY&&TRAY.close();
  if(k==='seldone'){B.sel.clear();return paintSel()}
  if(k==='push'){B.version=(B.version||0)+1;B.dirty=false;paintStats();return X.toast(`Pushed to Library · v${B.version}`)}
  if(k==='start'){X.S.session=true;return X.go('#workout')}
  if(k==='new')return newSheet();if(k==='nwclose')return NW&&NW.close();if(k==='nwback')return nwView(null);if(k==='nwtplv')return nwView('tpl');if(k==='nwlibv')return nwView('lib');
  if(k==='nwblank')return startFrom('blank');if(k==='nwtpl')return startFrom('tpl');if(k==='nwlib')return startFrom('lib',b.dataset.id);
  if(k.startsWith('sets')||k.startsWith('reps')||k.startsWith('c-'))return chitAct(k);
},true);
setInterval(()=>{if(X.S.scr==='build'&&!DRAG){const bs=$('#bstate');if(bs)bs.innerHTML=stateLine()}},30000);
// storyboard routes for the shots and tests
Object.assign(X.ROUTES,{
 'build-chit':['build','build',0,0,()=>{},()=>{const c=$('.chit');if(c)chitSheet(c.dataset.u)}],
 'build-tray':['build','build',0,0,()=>{},()=>traySheet('wed')],
 'build-analysis':['build','build',0,0,()=>{},analysisSheet],
 'build-new':['build','build',0,0,()=>{},()=>newSheet()],
 'build-new-tpl':['build','build',0,0,()=>{},()=>newSheet('tpl')],
});
window.BOARD={get state(){return B},days:()=>checkDays(),stats:()=>stats(),reset:()=>{initBoard();X.render()},sig:()=>JSON.stringify(B.days.map(d=>d.tiles.map(t=>[t.id,t.sets]))),undo};
})();
