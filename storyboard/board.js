// Build = the magnetic whiteboard. Storyboard glue (mock board, real logic): chits are dragged between day columns,
// every number comes from logic/progcheck.js (Coach's check_program.py port), logic/rank.js (tray suggestions + why lines),
// targets.json (targets, curves, session thresholds) and rules.json (volume_bands, rules, fix_actions, spinal_load).
(function(){'use strict';
const X=window.SBX,PC=window.PCHECK,RANK=window.RANK,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const DAYS=PC.ORDER,WD=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],WDL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const RD=()=>X.RD,LEVELS=['beginner','intermediate','advanced'];
// Coach's whiteboard data (logic/whiteboard.js = tools/whiteboard.py): short_name, primary body region (edge colour = tokens.css --region-*),
// rep_range(id, goals)
const WB=window.WHITEBOARD;
const shortName=id=>WB.shortName(RD(),id);
const ex=id=>RD().EX[id];
const repRange=id=>{const g=(X.prefs().goals||[]).filter(x=>x in RD().rules.rep_ranges.by_goal);return WB.repRange(RD(),id,g.length?g:null)};
const repsFor=id=>repRange(id).display;
const REP_STEP={reps:1,seconds:5,meters:5};
const setsFor=id=>{const G=RD().rules.pattern_gap_fix.sets_by_kind;return ex(id).type==='isolation'?G.isolation:G.compound}; // rules.json pattern_gap_fix
let UID=0;const T=(id,sets,reps,from)=>Object.assign({u:'c'+(++UID),id,sets,reps:reps||null},from?{from}:{}); // from: {sid,i} when the chit filled a template slot
// Clean / Detail (item 5): Detail adds one line under each chit name with its top 3 muscle fractions (exercises.json muscles).
// Labels: exercises.json muscle_short_labels (.muscles, .heads); a head id with no label uses its muscle's label, any other id its full name.
const fr=v=>v>=1?'1':String(+v.toFixed(2)).replace(/^0/,'');
const fracs=id=>{const M=(ex(id)||{}).muscles||{},O=(RD().exl.muscles||Object.keys(M)).map(x=>typeof x==='object'?x.id:x);return O.filter(m=>M[m]>0).map(m=>[m,M[m]]).sort((a,b)=>b[1]-a[1]||O.indexOf(a[0])-O.indexOf(b[0]))};
const MSL=()=>(RD().exl||{}).muscle_short_labels||{muscles:{},heads:{}};
const headMuscle=h=>{const M=RD().exl.muscles;return M.includes(h)?h:M.find(m=>h.startsWith(m+'_'))||M.find(m=>h.startsWith(m.replace(/s$/,'')+'_'))||null};
const muscleShort=m=>{const L=MSL(),mu=L.muscles||{},hd=L.heads||{};if(mu[m])return mu[m];if(hd[m])return hd[m];const pm=headMuscle(m);if(pm&&mu[pm])return mu[pm];return X.ML[m]||m.replace(/_/g,' ')};
// all-zero muscle map (tibialis-raise): the untracked_target tag stands where the fractions would go
const utOf=id=>(ex(id)||{}).untracked_target||null;
const fracLine=id=>{const f=fracs(id);if(!f.length&&utOf(id))return utOf(id).tag;return f.slice(0,3).map(([m,v])=>`${muscleShort(m)} ${fr(v)}`).join(' · ')};
const BD={detail:(()=>{try{return localStorage.getItem('apechit.sb.boardDetail')==='1'}catch(e){return false}})()};
// ------------------------------------------------------------- state
const B={name:'',level:'intermediate',version:0,dirty:false,edited:0,days:[],sel:new Set(),hist:[],tpl:null};
function blankDays(){return DAYS.map(d=>({day:d,label:'',rest:true,tiles:[]}))}
function loadDays(list,name){const days=blankDays();for(const d of list){const k=DAYS.indexOf(d.day);days[k].label=d.label||'';days[k].rest=false;days[k].tiles=d.tiles.filter(t=>ex(t.id)).map(t=>T(t.id,t.sets))}B.days=days;if(name)B.name=name}
function initBoard(){ // Mr Dude's draft: his Upper / Lower with two edits since v3 (bench 6 sets, cable fly in for the Thursday incline press)
  const r=X.ROUTINES[0],dmap={Mon:'mon',Tue:'tue',Wed:'wed',Thu:'thu',Fri:'fri',Sat:'sat',Sun:'sun'};
  const list=r.days.map(d=>({day:dmap[d.d],label:d.n,tiles:d.ex.map(e=>({id:e.id,sets:e.s,reps:e.r}))}));
  list[0].tiles[0].sets=6;list[0].tiles.splice(1,1,{id:'incline-dumbbell-press',sets:3});list[2].tiles.splice(0,1,{id:'cable-fly',sets:3});
  loadDays(list,r.name);B.version=3;B.dirty=true;B.edited=Date.now()-2*60000;B.level='intermediate';B.sel.clear();B.hist=[]}
const snap=()=>JSON.stringify({days:B.days,name:B.name,dirty:B.dirty,edited:B.edited,version:B.version,level:B.level,tpl:B.tpl||null});
function restore(s){const o=JSON.parse(s);Object.assign(B,o);B.sel=new Set()}
const isRest=d=>!d.tiles.length&&!(d.slots||[]).length&&d.rest!==false;
const openSlots=()=>sum(B.days.map(d=>(d.slots||[]).length));
const dayLabel=d=>d.label||(isRest(d)?'Rest':'Training day');
const stripTxt=d=>isRest(d)?'Rest':`${sum(d.tiles.map(t=>t.sets))} sets`;
function commit(fn,undoText){B.hist.push(snap());fn();B.days.forEach(d=>{if(d.tiles.length)d.rest=false});B.dirty=true;B.edited=Date.now();paint();if(undoText)undoBar(undoText)}
function undo(){const s=B.hist.pop();if(!s)return;restore(s);paint();hideUndo();X.toast('Undone')}
const checkDays=days=>(days||B.days).filter(d=>d.tiles.length).map(d=>({day:d.day,tiles:d.tiles.map(t=>({id:t.id,sets:t.sets}))}));
const rankBoard=()=>B.days.filter(d=>d.tiles.length).map(d=>({day:d.day,label:d.label,tiles:d.tiles.map(t=>({id:t.id,sets:t.sets}))}));
const sum=a=>a.reduce((x,y)=>x+y,0);
const mins5=m=>Math.round(m/5)*5,hm=m=>{m=Math.round(m);const h=Math.floor(m/60);return h?`${h} h ${String(m%60).padStart(2,'0')} m`:`${m} min`};
function stateLine(){if(!B.dirty)return `<b class="saved">Saved v${B.version}</b> · in your Library${LVL()}`;const s=Math.max(0,(Date.now()-B.edited)/1000);
  const ago=s<60?'just now':Math.round(s/60)+' min ago';return `<b class="draft">Draft</b> · edited ${ago}${B.version?` · last saved v${B.version}`:' · not saved yet'}${LVL()}`}
const LVL=()=>` · <span class="blv">${B.level[0].toUpperCase()+B.level.slice(1)}</span>`;
// ------------------------------------------------------------- stats (live: board, or the drag preview)
function stats(days){const d=checkDays(days),A=PC.analytics(RD(),d,B.level),C=PC.checks(RD(),d,B.level);
  // check count = rules.analysis_metrics checks_pass (analysis.py): pass = rules with no non-info flag, total = len(rules); strip and sheet header agree
  const CP=window.ANALYSIS.checksPass(RD(),d,B.level);C.pass=CP.pass;C.total=CP.total;C.failing=CP.failing;C.na=CP.not_applicable;return {A,C,d}}
function volMap(A){const o={};for(const [m,v] of Object.entries(A.muscles))o[m]=v.raw>0?X.volFill(v.raw,v.min,v.max):null;return o} // same fill as the Progress map
// Summary map (bigger, markup round 1): Week = weekly sets vs target (same fill as Progress); Day = that day's sets per muscle.
// Tapping a day in the strip or a day header switches the map to that day. Tapping a muscle opens its Learn page.
const MAPV={mode:'week',day:0};
// Round 2: ONE sequential ramp (tokens --ramp-0..4) for the Day-mode map AND the days-per-muscle grid. Level by effective sets that day.
const RAMPT=[0,1.5,3,5],RAMPL=r=>!(r>0)?0:r>=5?4:r>=3?3:r>=1.5?2:1,DAYF=r=>{const l=RAMPL(r);return l?`var(--ramp-${l})`:null};
const rampLeg=(cls='')=>`<span class="mleg mlday ${cls}"><i style="background:var(--ramp-1)"></i>&lt;1.5<i style="background:var(--ramp-2)"></i>1.5<i style="background:var(--ramp-3)"></i>3<i style="background:var(--ramp-4)"></i>5+ sets</span>`;
function dayMap(d){const o={};if(!d||!d.tiles.length)return o;const A=PC.analytics(RD(),[{day:d.day,tiles:d.tiles.map(t=>({id:t.id,sets:t.sets}))}],B.level);for(const [m,v] of Object.entries(A.muscles))o[m]=DAYF(v.raw);return o}
function mapHtml(st,days){const day=MAPV.mode==='day',d=days[MAPV.day],vm=day?dayMap(d):volMap(st.A);
  const cap=day?`<b>${WD[MAPV.day]}</b> · ${isRest(d)?'Rest':`${dayLabel(d)} · ${sum(d.tiles.map(t=>t.sets))} sets`}`:'<b>This week</b> · vs targets';
  const leg=day?rampLeg()
    :`<span class="mleg">${['under','in','amber','red'].map(k=>`<i style="background:${X.VFILL[k]}"></i>${({under:'Under',in:'In',amber:'Over',red:'Well over'})[k]}`).join('')}</span>`;
  return `<div class="bmaps" data-mode="${MAPV.mode}" data-day="${d?d.day:''}">${X.map('front',vm)}${X.map('back',vm)}</div><div class="bmcap" id="bmcap">${cap}</div><div class="bmleg">${leg}</div>`}
function setMap(mode,i){MAPV.mode=mode;if(i!=null)MAPV.day=i;$$('#mapseg button').forEach(b=>b.classList.toggle('on',b.dataset.mm===MAPV.mode));paintStats()}
function stripHtml(st){const {A,C,d}=st,avg=d.length?A.weekMinutes/d.length:0,fail=C.total-C.pass;
  return `<span class="ast"><b class="num" data-s="sets">${A.weekSets}</b><small>sets / wk</small></span>
   <span class="ast"><b class="num" data-s="min">${d.length?'≈ '+mins5(avg):'–'}</b><small>min / session</small></span>
   ${openSlots()?`<span class="ast chk pend"><b class="num" data-s="checks">–</b><small>Fill slots to check</small></span>`:`<span class="ast chk ${fail?'bad':'ok'}"><b class="num" data-s="checks">${C.pass}/${C.total}</b><small>checks pass</small></span>`}<span class="ago">Analysis ›</span>`}
function dayMeta(day){const n=sum(day.tiles.map(t=>t.sets));return day.tiles.length?`${n} sets · ≈ ${mins5(PC.sessionMinutes(RD(),day.tiles.map(t=>({id:t.id,sets:t.sets}))))} min`:''}
function paintStats(days){days=days||B.days;const st=stats(days);const mp=$('#bmap');if(mp)mp.innerHTML=mapHtml(st,days);const s=$('#astrip');if(s){s.innerHTML=stripHtml(st);s.setAttribute('aria-label',`Analysis: ${st.A.weekSets} sets a week, ${st.C.pass} of ${st.C.total} checks pass`)}
  days.forEach((d,i)=>{const n=sum(d.tiles.map(t=>t.sets));const b=$(`#dstrip [data-jump="${i}"] .dn`);if(b){b.textContent=stripTxt(d);b.parentNode.classList.toggle('rd',isRest(d))}
    const h=$(`.col[data-day="${d.day}"] .cm`);if(h)h.textContent=dayMeta(d)});
  $$('.col').forEach((c,i)=>{const d=days[i];if(!d)return;c.classList.toggle('restday',isRest(d));const l=$('.cl',c);if(l)l.textContent=dayLabel(d)}); // preview days mid-drag
  const bs=$('#bstate');if(bs)bs.innerHTML=stateLine();return st}
// ------------------------------------------------------------- view
function chit(t){const e=ex(t.id),g=WB.primaryRegion(RD(),t.id),sel=B.sel.has(t.u)?' sel':'';
  return `<div class="chit${sel}" data-u="${t.u}" data-id="${t.id}" data-region="${g}" style="--mc:var(--region-${g})" role="button" tabindex="0" aria-label="${X.exNameP(t.id)}, ${t.sets} sets"><span class="cg ${e.type}" aria-hidden="true">${X.GLY[e.type]}</span><span class="cn">${shortName(t.id)}</span><span class="cs num">${t.sets}</span><span class="cf" aria-hidden="true">${fracLine(t.id)}</span></div>`}
// item 6: an open template slot is a dashed placeholder (label + set range); it is not a tile, so stats and checks ignore it.
const slotHtml=(d,s)=>`<button class="slotc" data-b="slot" data-day="${d.day}" data-sid="${s.sid}" aria-label="Open slot: ${s.label}, ${s.min} to ${s.max} sets. Tap to pick an exercise"><span class="cg ${s.type}" aria-hidden="true">${X.GLY[s.type]}</span><span class="sl">${s.label}</span><span class="sr">${s.min}–${s.max} sets</span></button>`;
function colHtml(d,i){return `<section class="col${isRest(d)?' restday':''}" data-day="${d.day}" data-i="${i}"><header data-b="dayh" data-day="${d.day}" role="button" tabindex="0" aria-label="${WDL[i]}: ${dayLabel(d)}. Rename or set Rest"><b>${WD[i]}</b><span class="cl">${dayLabel(d)}</span><span class="cm num">${dayMeta(d)}</span></header>
  <div class="chits" data-day="${d.day}">${d.tiles.map(chit).join('')}${(d.slots||[]).map(s=>slotHtml(d,s)).join('')}</div><button class="cadd" data-b="add" data-day="${d.day}" aria-label="Add exercise to ${WDL[i]}">${X.I('plus',2.2)}</button></section>`}
function boardHtml(){return `<div class="cols">${B.days.map(colHtml).join('')}</div>`}
X.V.build=()=>{if(!B.days.length)initBoard();
  return `<div class="bw">${X.header('Build',`<button class="ibtn tabsbtn" data-b="tabs" aria-label="Other tabs">${X.I('tabs',1.8)}</button><button class="ibtn" data-b="new" aria-label="New routine">${X.I('plus',2.2)}</button>`+X.bookBtn+X.gearBtn)}
  <div class="bname"><div class="bn">${B.name||'New routine'}</div>
   <div class="bacts"><button class="btn ink" data-b="push" aria-label="Push to Library">${X.I('up',2.2)}<span class="bl-l">Push to Library</span><span class="bl-s">Push</span></button><button class="btn accent" data-b="start" aria-label="Start training">${X.I('play')}<span class="bl-l">Start training</span><span class="bl-s">Start</span></button></div>
   <div class="bstate" id="bstate">${stateLine()}</div></div>
  <div class="bsum"><div class="bsegs"><div class="seg xs" id="mapseg" role="group" aria-label="Map: week or day"><button data-b="mapm" data-mm="week" class="${MAPV.mode==='week'?'on':''}">Week</button><button data-b="mapm" data-mm="day" class="${MAPV.mode==='day'?'on':''}">Day</button></div><div class="seg xs bdseg" id="bdseg" role="group" aria-label="Board: clean or detail">${bdsegHtml()}</div></div>
   <div class="bsmap" id="bmap"></div><div class="bsr"><button class="astrip" id="astrip" data-b="analysis"></button></div></div>
  <div class="bstick">
   <div class="dstrip" id="dstrip">${WD.map((w,i)=>`<button data-jump="${i}" aria-label="Jump to ${WDL[i]}"><span>${w}</span><small class="dn"></small></button>`).join('')}</div>
   <div class="selbar" id="selbar"><span id="selt"></span><button class="btn plain" data-b="seldone">Done</button></div></div>
  <div class="btools" id="btools">${toolsHtml()}</div>
  <div class="board${BD.detail?' b-detail':''}" id="board">${boardHtml()}</div>
  <div class="glegend" aria-label="Chit shapes">${['primary','accessory','isolation'].map(t=>`<span><span class="cg ${t}">${X.GLY[t]}</span>${t[0].toUpperCase()+t.slice(1)}</span>`).join('')}</div>
  <p class="foot bhint">Tap a muscle on the map to learn about it. Hold a chit to lift it. Drag it to another day, or off the board to remove it. Tap a day's name to rename it or make it a Rest day.</p></div>`};
X.AFTER.build=()=>{paint(true);const bd=$('#board');bd.addEventListener('scroll',markDay,{passive:true});markDay()};
const bdsegHtml=()=>`<button data-b="bmode" data-v="clean" class="${BD.detail?'':'on'}">Clean</button><button data-b="bmode" data-v="detail" class="${BD.detail?'on':''}">Detail</button>`;
function toolsHtml(){const n=openSlots();return (n?`<div class="slotbar" id="slotbar"><span>${n} open slot${n>1?'s':''}</span><button class="btn grey" data-b="slotfill">Fill with defaults</button></div>`:'')}
function paint(full){const bd=$('#board');if(!bd)return;const sl=bd.scrollLeft;if(!full)bd.innerHTML=boardHtml();bd.classList.toggle('b-detail',BD.detail);const bt=$('#btools');if(bt)bt.innerHTML=toolsHtml();$$('.bdseg').forEach(x=>x.innerHTML=bdsegHtml());bd.scrollLeft=sl;const bn=$('.bname .bn');if(bn)bn.textContent=B.name||'New routine';
  paintStats();paintSel();if(AN&&!AN.closed)renderAnalysis()}
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
  if(DRAG.y>br.top&&DRAG.y<br.bottom){if(DRAG.x<br.left+E)bd.scrollLeft-=9;else if(DRAG.x>br.right-E)bd.scrollLeft+=9}
  const vs=bd.scrollHeight>bd.clientHeight+2?bd:document.getElementById('view'),vr=vs===bd?br:{top:0,bottom:innerHeight-(($('.tabs')||{}).offsetHeight||0)};
  if(vs&&DRAG.x>br.left&&DRAG.x<br.right){if(DRAG.y>vr.bottom-E&&DRAG.y<vr.bottom+20)vs.scrollTop+=8;else if(vs===bd&&DRAG.y<vr.top+E&&DRAG.y>vr.top-10)vs.scrollTop-=8}
  RAF=requestAnimationFrame(step)};RAF=requestAnimationFrame(step)}
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
  const body=()=>{const g=findT(u);if(!g)return '';const t=g.t,rr=repRange(t.id),rp=t.reps||rr.display;
    return `<div class="csh"><div class="csh-h">${X.gl(t.id)}<div class="grow"><div class="t1">${X.exNameP(t.id)}</div><div class="t2">${X.exSub(t.id)} · ${WDL[DAYS.indexOf(g.d.day)]}</div></div></div>
     <div class="group"><div class="row"><div class="grow t1">Sets</div><div class="step"><button data-b="sets-" aria-label="Fewer sets">−</button><b class="num" id="cs-sets">${t.sets}</b><button data-b="sets+" aria-label="More sets">+</button></div></div>
      <div class="row"><div class="grow"><div class="t1">${rr.unit==='reps'?'Reps':rr.unit==='seconds'?'Seconds':'Meters'}</div><div class="t2 rrn">${t.reps?'Your range':(X.prefs().goals||[]).length?'Typical for your goals':'Typical range'}${rr.per_side?' · per side':''}${rr.not_to_failure?' · stop well short of failure':''}</div></div><div class="step"><button data-b="reps-" aria-label="Lower reps">−</button><b class="num" id="cs-reps">${rp}</b><button data-b="reps+" aria-label="Higher reps">+</button></div></div></div>
     <div class="ghead">Muscles worked · set credit per set</div><div class="group csfr">${!fracs(t.id).length&&utOf(t.id)?`<div class="row utn" data-ut="${utOf(t.id).id}"><span class="fn">${utOf(t.id).label}</span><span class="sub">${utOf(t.id).tag}</span></div>`:''}${fracs(t.id).map(([m,v])=>`<div class="row" data-fm="${m}"><span class="fn">${X.ML[m]||m.replace(/_/g,' ')}</span><span class="fb"><i style="--w:${Math.round(v*100)}%;--mc:var(--region-${WB.primaryRegion(RD(),t.id)})"></i></span><b class="fv num">${fr(v)}</b></div>`).join('')}</div>
     <div class="cacts"><button data-b="c-swap">${X.I('swap',1.8)}<span>Swap</span></button><button data-b="c-info">${X.I('info',1.8)}<span>Info</span></button><button data-b="c-dup">${X.I('plus',2)}<span>Duplicate</span></button><button data-b="c-del" class="dl">${X.I('trash',1.8)}<span>Delete</span></button></div></div>`};
  CS=X.sheet({title:'',cls:'grouped csheet',body:body(),onClose(){CS=null}});CS.u=u;CS.re=()=>{CS.body.innerHTML=body()};return CS}
function chitAct(k){if(!CS)return;const u=CS.u,f=findT(u);if(!f)return;const t=f.t;
  if(k==='sets-'||k==='sets+'){const n=Math.max(1,Math.min(10,t.sets+(k==='sets+'?1:-1)));if(n!==t.sets)commit(()=>{findT(u).t.sets=n});CS.re();return}
  if(k==='reps-'||k==='reps+'){const rr=repRange(t.id),m=/^(\d+)\u2013(\d+)(.*)$/.exec(t.reps||rr.display);if(!m)return;const st=REP_STEP[rr.unit]||1,d=(k==='reps+'?1:-1)*st,a=+m[1]+d,b=+m[2]+d;if(a<1)return;commit(()=>{findT(u).t.reps=`${a}\u2013${b}${m[3]}`});CS.re();return}
  if(k==='c-swap'){X.setSC({board:rankBoard(),day:f.d.day});const s=CS;s.close();X.swapSheet(t.id,{onPick:nid=>{commit(()=>{const g=findT(u);g.t.id=nid;g.t.reps=null},`Swapped in ${X.exNameP(nid)}`)}});return}
  if(k==='c-info'){CS.close();return X.go('#learn-ex-'+t.id)}
  if(k==='c-dup'){commit(()=>{const g=findT(u);g.d.tiles.splice(g.i+1,0,T(g.t.id,g.t.sets,g.t.reps))},`Duplicated ${X.exNameP(t.id)}`);CS.close();return}
  if(k==='c-del'){CS.close();commit(()=>removeU([u]),`Removed ${X.exNameP(t.id)}`)}}
// ------------------------------------------------------------- day header sheet: rename, set Rest, back to training
// Set Rest on a day with chits removes them in one step (the sheet says how many) and the Undo bar brings them back.
let DS=null;
function daySheet(day){const i=DAYS.indexOf(day),d=B.days[i];if(!d)return;const n=d.tiles.length,ns=sum(d.tiles.map(t=>t.sets)),rest=isRest(d);
  DS=X.sheet({title:WDL[i],cls:'grouped dsheet',right:'<button class="btn plain" data-b="dsclose">Cancel</button>',onClose(){DS=null},
    body:`<div class="ghead">Day name</div><div class="group"><div class="row"><input id="dsname" class="dsin" type="text" maxlength="24" enterkeyhint="done" autocomplete="off" value="${(d.label||'').replace(/"/g,'&quot;')}" placeholder="${rest?'e.g. Upper A (makes it a training day)':'e.g. Upper A'}"></div></div>
     ${rest?`<div class="pad"><button class="btn accent block" data-b="dstrain" data-day="${day}">Make it a training day</button></div><p class="foot">Then add exercises with + or drag them in from the tray.</p>`
      :`<div class="pad"><button class="btn accent block" data-b="dsrename" data-day="${day}">Save name</button></div>
     <div class="group"><button class="row dsrest" data-b="dsrest" data-day="${day}"><div class="grow"><div class="t1">Make it a Rest day</div><div class="t2">${n?`Removes ${n} exercise${n>1?'s':''} (${ns} sets) from ${WD[i]}. You can undo.`:'Nothing on this day yet.'}</div></div></button></div>`}`});
  DS.day=day;const inp=$('#dsname',DS.el);inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();dayAct(rest?'dstrain':'dsrename')}});return DS}
function dayAct(k){if(!DS)return;const day=DS.day,i=DAYS.indexOf(day),v=($('#dsname',DS.el).value||'').trim().slice(0,24),s=DS;s.close();
  if(k==='dsrename'){const d=B.days[i];if(v===(d.label||''))return;commit(()=>{B.days[i].label=v},v?`${WD[i]} renamed “${v}”`:`${WD[i]} name cleared`);return}
  if(k==='dsrest'){const d=B.days[i],n=d.tiles.length;commit(()=>{const D=B.days[i];D.tiles=[];D.rest=true;D.label='';B.sel.clear()},n?`${WD[i]} is a Rest day · ${n} removed`:`${WD[i]} is a Rest day`);return}
  if(k==='dstrain'){commit(()=>{const D=B.days[i];D.rest=false;D.label=v||'Training day'},`${WD[i]} is a training day`);return}}
// other tabs while the tab bar is hidden (landscape phone)
function tabsSheet(){const T4=[['build','Build'],['train','Train'],['log','Log'],['progress','Progress']];
  const s=X.sheet({title:'Go to',cls:'grouped',body:`<div class="group">${T4.map(([k,l])=>`<button class="row" data-b="tabgo" data-to="${k}"><span class="ico gr">${X.I(k,1.7)}</span><div class="grow t1">${l}</div>${X.CHEV}</button>`).join('')}</div><p class="foot">The tab bar is hidden in landscape so the board gets the full height. Turn the phone upright to see it again.</p>`});return s}
// ------------------------------------------------------------- tray (Suggested / Library, filter chips, drag or +)
let TRAY=null;const TFB={mode:'sug',mus:null,pat:null,eq:null,day:'mon',slot:null,only:null};const anyTF=()=>!!(TFB.mus||TFB.pat||TFB.eq);
function trayRows(){const RDv=RD(),ids=Object.keys(RDv.EX).filter(i=>X.passF(TFB,i)&&(!TFB.only||TFB.only.includes(i)));
  let rows=TFB.mode==='sug'?RANK.rank(RDv,'tray',ids,{board:rankBoard(),day:TFB.day},X.prefs(),TFB.only?ids.length:24):ids.slice(0,60).map(id=>({id}));
  if(TFB.only){const have=new Set(rows.map(r=>r.id));rows=rows.concat(ids.filter(i=>!have.has(i)).map(id=>({id})));const df=TFB.slot.def;rows.sort((a,b)=>(b.id===df)-(a.id===df))}
  const dtag=id=>TFB.slot&&id===TFB.slot.def?'<span class="tag def">default</span>':'';
  return `<div class="tcount">${TFB.mode==='sug'?`Ranked for ${WDL[DAYS.indexOf(TFB.day)]} · hold a row to drag it onto any day`:'Library order · hold a row to drag it onto any day'}</div><div class="group">`+
   rows.map(r=>`<div class="row trow" data-id="${r.id}">${X.gl(r.id)}<div class="grow"><div class="t1">${X.exNameP(r.id)}${dtag(r.id)}</div>${r.reasons?X.whyR(r):`<div class="t2">${X.exSub(r.id)}</div>`}</div><button class="addc" data-b="tadd" data-id="${r.id}" aria-label="Add to ${WD[DAYS.indexOf(TFB.day)]}">${X.I('plus',2.2)}</button></div>`).join('')+'</div>'}
const trayTitle=()=>TFB.slot?`Fill ${WD[DAYS.indexOf(TFB.day)]} slot`:`Add to ${WD[DAYS.indexOf(TFB.day)]}`;
function slotEligible(sid){const R=(RD().TREF||{templates:{}}).templates[B.tpl],s=R&&R.slots[sid];if(s)return s.eligible.slice();
  const t=TP().find(RD().TJ,B.tpl),sl=t&&[].concat(...t.days.map(d=>d.slots)).find(x=>x.id===sid);return sl?window.TEMPLATES.eligible(RD(),sl.eligibility,B.level):[]}
const TP=()=>window.TEMPLATES;
function slotTray(day,sid){const D=B.days.find(d=>d.day===day),s=D&&(D.slots||[]).find(x=>x.sid===sid);if(!s)return;
  if(TRAY)TRAY.close();Object.assign(TFB,{mus:null,pat:null,eq:null,slot:{day,sid,def:s.def,label:s.label,min:s.min,max:s.max,n:s.n},only:slotEligible(sid)});traySheet(day);
  $$('.slotc').forEach(c=>c.classList.toggle('on',c.dataset.sid===sid));return TRAY}
function traySheet(day){TFB.day=day||TFB.day;
  TRAY=X.sheet({title:trayTitle(),cls:'grouped btray',modal:false,right:'<button class="btn plain" data-b="tclose">Done</button>',onClose(){TRAY=null;TFB.slot=null;TFB.only=null;$$('.slotc.on').forEach(c=>c.classList.remove('on'))},
    body:`${TFB.slot?`<div class="tslot" id="tslot"><b>${TFB.slot.label}</b> · ${TFB.slot.min}–${TFB.slot.max} sets (default ${TFB.slot.n}) · ${TFB.only.length} eligible exercises from templates-reference.json. Pick one to fill the slot.</div>`:''}<div class="tftop"><div class="seg sm" id="tmodeb"><button class="${TFB.mode==='sug'?'on':''}" data-tm="sug">Suggested</button><button class="${TFB.mode==='lib'?'on':''}" data-tm="lib">Library</button></div><button class="btn plain sm treset" data-b="treset" ${anyTF()?'':'disabled'}>Reset</button></div>
    <div id="tfbb"${TFB.slot?' hidden':''}>${X.filterHtml(TFB,'tf')}</div>
    <div class="tlist" id="btlist">${trayRows()}</div>`});return TRAY}
function refreshTray(){if(TRAY){$('#btlist',TRAY.el).innerHTML=trayRows();const rb=$('[data-b=treset]',TRAY.el);if(rb)rb.disabled=!anyTF();const h=$('.sh-head .t',TRAY.el);if(h)h.textContent=trayTitle()}}
// fill one slot (tile keeps from:{sid,i}; it goes before any filled tile from a later slot, so default fills keep the template order)
function fillSlot(D,s,id,sets){D.slots=D.slots.filter(x=>x.sid!==s.sid);const t=T(id,sets==null?s.n:sets,null,{sid:s.sid,i:s.i});
  const k=D.tiles.findIndex(x=>x.from&&x.from.i>s.i);k<0?D.tiles.push(t):D.tiles.splice(k,0,t)}
function fillDefaults(){const n=openSlots();if(!n)return;commit(()=>B.days.forEach(D=>(D.slots||[]).slice().forEach(s=>fillSlot(D,s,s.def))),`Filled ${n} slots with their defaults`)}
function loadTemplate(t){const days=blankDays();for(const td of t.days){const D=days[DAYS.indexOf(td.day)];D.label=td.label;D.rest=false;
    D.slots=td.slots.map((s,i)=>({sid:s.id,label:s.label,type:s.slot_type,min:s.sets.min,max:s.sets.max,n:s.sets.default,def:s.default_exercise,i}))}
  B.days=days;B.tpl=t.id;B.level=t.level;B.name=`${t.split_name} · ${t.days_per_week} days (slots)`;B.version=0;B.dirty=true;B.edited=Date.now()}
// ------------------------------------------------------------- analysis sheet
let AN=null,FIX=[];const RLAB=id=>PC.ruleLabel(RD(),id); // rules.json rules[].short_label
const LBL=m=>(RD().rules.ranking.labels.regions[m])||X.ML[m]||m.replace(/_/g,' ');
// Analysis (round 1, Coach's audit): headers, order and metrics come from rules.json analysis_metrics (7 ordered categories,
// 43 metrics, each with label, description, evidence and status; 'proposed' is marked). Suggestions are the 11 typed
// suggestions of rules.json suggestions.analysis_sheet, from logic/analysis.js (port of tools/analysis.py sheet()).
// Apply = board days := fix.days (Undo keeps the pre-Apply board). Each rule is filed under its
// rules.json rules[].category; only rules whose applies holds are listed and counted.
const ANL=window.ANALYSIS;const SUG_TOP=3;let SUGN=SUG_TOP; // CoS: top 3 by severity (sheet order), then "Show all N"
// CoS: one sentence on the card; the rest of the explanation behind "Why?"
const oneSentence=t=>{const m=/^([\s\S]*?[.!?])\s+(?=[A-Z(])([\s\S]+)$/.exec(t||'');return m?[m[1],m[2]]:[t||'','']};
const RULE_CAT=id=>{const r=RD().rules.rules.find(x=>x.id===id);return r&&r.category}; // rules.json rules[].category (Coach round 1 data)
const ruleOf=f=>PC._x.RULE_OF(f[1]);
let APPLIED=[];const sigD=()=>JSON.stringify(B.days.map(d=>[d.label,isRest(d),d.tiles.map(t=>[t.id,t.sets])]));
const pct=x=>`${Math.round(x*100)}%`,MLB=m=>X.ML[m]||LBL(m);
function sugTarget(s,days,lv){const t=s.target||{},A=stats().A;
  if(t.flag)return PC.message(RD(),t.flag,days,lv);
  if(s.source==='lower_fatigue_swap')return `${X.exNameP(t.exercise)} has a same-pattern option with more ${MLB(t.muscle).toLowerCase()} stimulus per unit of fatigue.`;
  if(s.source==='stretch_share')return `${MLB(t.muscle)}: ${pct(t.share)} of its sets are stretch-biased (the flag is below ${pct(RD().targets.analytics.stretch_share_flag_below)}).`;
  if(s.source==='effective_frequency')return `${MLB(t.muscle)} gets ${RD().targets.analytics.frequency_min_effective}+ effective sets on ${t.days} day${t.days===1?'':'s'} a week. Two days spreads the same volume.`;
  if(s.source==='recovery_vs_baseline')return `This week's modeled recovery cost is ${t.pct}% of your saved normal week.`;
  if(s.source==='weekly_band'){const v=A.muscles[t.muscle]||{};return `${MLB(t.muscle)}: ${t.sets} effective sets a week, ${t.side==='under'?'below':'above'} the ${v.min}–${v.max} target.`}
  return ''}
function renderAnalysis(){if(!AN)return;const dt=RD(),{A,C,d}=stats(),R=dt.rules,lv=B.level;FIX=[];
  const cur=sigD();APPLIED=APPLIED.filter(a=>a.bsig!==cur); // undone (here or with the Undo bar): drop it
  const M=ANL.metrics(dt,d,lv),SH=ANL.sheet(dt,d,lv,null),TY={};(R.suggestions.analysis_sheet.types||[]).forEach(t=>TY[t.id]=t);
  const CATS=ANL.catalogue(dt),EV=dt.rules.analysis_metrics;
  const fxRow=f=>{FIX.push(f);return `<div class="fxr"><span>${f.preview}${f.resolves?'':` <em>${R.partial_label}</em>`}</span><button class="btn sm accent" data-b="apply" data-k="${FIX.length-1}">Apply</button></div>`};
  const sevL={warn:'Warning',info:'Info',suggest:'Suggestion'};
  const sugCard=s=>`<div class="flag sugc ${s.severity}${s.fixes.length?' hasfix':''}" data-type="${s.type}" data-src="${s.source}"${(s.target||{}).flag?` data-rule="${ruleOf(s.target.flag)}"`:''}>
     <div class="ftl">${(TY[s.type]||{}).label||s.type} <span class="tag sev ${s.severity}">${sevL[s.severity]||s.severity}</span></div>${(([a,b])=>`<p class="s1">${a}</p>${b?`<details class="why"><summary class="whys">Why?</summary><p>${b}</p></details>`:''}`)(oneSentence(sugTarget(s,d,lv)))}
     ${s.fixes.length?s.fixes.map(fxRow).join(''):'<p class="sub nofix">No one-tap change passes the checks. Change it by hand.</p>'}</div>`;
  const vrow=([m,v])=>{const st=v.raw>0?X.vStat(v.raw,v.min,v.max):'under',VB=X.VB,top=v.max*(VB.red_factor!=null?VB.red_factor:1);return `<div class="row vrow" data-vs="${st}"><span class="vm">${X.ML[m]||m}</span><span class="vb"><i style="--w:${Math.min(1,v.raw/top)*100}%" class="vs-${st}"></i><b style="--x:${v.max/top*100}%"></b></span><span class="vn num">${+v.raw.toFixed(1)}<small>/${v.min}–${v.max}</small></span></div>`};
  const T=Object.entries(A.muscles).filter(([m,v])=>v.raw>0||v.min>0),RU={};R.rules.forEach(r=>RU[r.id]=r);
  const FM=R.frequency_muscles,fq=m=>B.days.map((dd,i)=>{const e=PC.eff(dt,dd.tiles.map(t=>({id:t.id,sets:t.sets})))[m]||0;const ok=e>=dt.targets.analytics.frequency_min_effective;return `<i class="${ok?'on':e>0?'lo':''}" data-r="${RAMPL(e)}" title="${WD[i]} · ${+e.toFixed(1)} sets${ok?' (counts)':''}"></i>`}).join('');
  const SL=RU.session_length,mx=Math.max(SL.warn_min+15,...A.day.map(x=>x.minutes)),SP=A.spinal,cm=Object.keys(A.muscles).includes(AN.mus)?AN.mus:'chest';
  const chips=o=>`<div class="mchips">${o.map(([k,v])=>`<span class="tag mv"><b>${k}</b> ${v}</span>`).join('')}</div>`;
  const pp=(()=>{let push=0,pull=0;for(const dd of d)for(const t of dd.tiles){if(R.push_patterns.includes(dt.PAT[t.id]))push+=t.sets;if(R.pull_patterns.includes(dt.PAT[t.id]))pull+=t.sets}return push?(pull/push).toFixed(2):pull?'no pressing':'—'})();
  const MPL=(R.movement_patterns||{}).labels||{},RGL=k=>k[0].toUpperCase()+k.slice(1);
  const flagsOf=id=>C.flags.filter(f=>ruleOf(f)===id&&f[0]!=='info').length,st=id=>{const n=flagsOf(id);return n?`${n} warning${n>1?'s':''}`:'passing'};
  const PRG=progressNow();
  const VAL={checks_pass:`${M.checks_pass.pass} of ${M.checks_pass.total}`,suggestion_list:`${SH.length}`,week_sets_total:`${M.week_sets_total} sets`,volume_status:'',
    weekly_sets_per_muscle:`${T.filter(([,v])=>v.raw>=v.min&&v.raw<=v.max).length} of ${T.length} in range`,
    marginal_set_gain:A.muscles[cm]?`${MLB(cm)}: next set ≈ +${(A.muscles[cm].next*100).toFixed(1)}%`:'',
    session_discount:`${dt.targets.curve.session_discount.cap} sets / muscle / session, then × ${dt.targets.curve.session_discount.factor}`,
    weekly_sets_per_region:'',effective_frequency:`${FM.filter(m=>(A.muscles[m]||{}).freq>=2).length} of ${FM.length} muscles on 2+ days`,consecutive_high_volume:st('consecutive_high_volume'),
    push_pull_ratio:`pull : push ${pp}`,pattern_coverage:st('pattern_gap'),missing_stretch:st('missing_stretch'),redundant_pattern:st('redundant_pattern'),
    stretch_biased_share:'',movement_pattern_sets:'',lengthened_bias_share:pct(M.lengthened_bias_share),unilateral_share:pct(M.unilateral_share),
    recovery_cost:`${A.weekCost.toFixed(1)} points (no saved normal week yet)`,stimulus_per_fatigue:`${SH.filter(s=>s.type==='swap_lower_fatigue').length} lower-fatigue swaps`,
    spinal_load:`${SP.week} of ${SP.week_max} heavy spine sets`,junk_volume_session:st('junk_volume_session'),session_length:st('session_length'),avg_session_minutes:`≈ ${M.avg_session_minutes} min`,
    session_hard_sets:st('session_hard_sets'),sets_per_exercise:st('sets_per_exercise'),many_small_entries:st('many_small_entries'),session_density:'',
    logged_hard_sets:PRG?`${Object.values(PRG.muscles).reduce((a,m)=>a+(m.last_week_sets||0),0).toFixed(1)} credited sets last week`:'',
    adherence:PRG&&PRG.adherence.sets_ratio!=null?`${pct(PRG.adherence.sets_ratio)} of planned sets`:'',progress_signal:PRG?`${PRG.refinements.filter(r=>r.type==='stall').length} stalled lifts`:''};
  const EXTRA={weekly_sets_per_muscle:`<div class="group vol">${T.map(vrow).join('')}</div>`,volume_status:X.volLegend(),
    stimulus_curve:`<div class="chips fl noswipe" id="anmus">${T.filter(([,v])=>v.raw>0).map(([m])=>`<button class="chip ${m===cm?'on':''}" data-anm="${m}">${X.ML[m]||m}</button>`).join('')}</div><div class="card curve">${curve(cm,A)}</div><p class="foot">${A.curveModel}. ${A.disclaimer}</p>`,
    weekly_sets_per_region:chips(Object.entries(M.weekly_sets_per_region).map(([k,v])=>[RGL(k),+(+v).toFixed(1)])),
    effective_frequency:`<div class="group freq"><div class="row fqh"><span class="vm"></span><span class="fq">${WD.map(w=>`<i>${w[0]}</i>`).join('')}</span></div>${FM.map(m=>`<div class="row"><span class="vm">${X.ML[m]}</span><span class="fq">${fq(m)}</span></div>`).join('')}<div class="row fqleg">${rampLeg()}</div></div>`,
    stretch_biased_share:chips(Object.entries(M.stretch_biased_share).map(([k,v])=>[MLB(k),pct(v)])),
    movement_pattern_sets:chips(Object.entries(M.movement_pattern_sets).map(([k,v])=>[MPL[k]||k,v])),
    spinal_load:`<div class="group sess">${A.day.map(x=>`<div class="row"><span class="vm">${WD[DAYS.indexOf(x.day)]}</span><span class="fz num">${x.cost.toFixed(1)} <small>fatigue</small></span><span class="fz num ${x.spinal>SP.session_max?'over':''}">${x.spinal}/${SP.session_max} <small>spine sets</small></span></div>`).join('')}</div>`,
    session_length:`<div class="group sess">${A.day.map(x=>`<div class="row"><span class="vm">${WD[DAYS.indexOf(x.day)]}</span><span class="sbar"><i style="--w:${x.minutes/mx*100}%" class="${x.minutes>=SL.warn_min?'w':x.minutes>=SL.info_min?'i':''}"></i><b style="--x:${SL.info_min/mx*100}%"></b><b class="w" style="--x:${SL.warn_min/mx*100}%"></b></span><span class="vn num">${Math.round(x.minutes)}</span></div>`).join('')||'<div class="row sub">No training days yet</div>'}</div>`,
    session_density:chips(Object.entries(M.session_density).map(([k,v])=>[WD[DAYS.indexOf(k)],`${v} sets/h`]))};
  const evTag=m=>`<span class="tag ev ${m.evidence}" title="${(m.citations||[]).join(', ')}">${({supported:'Supported',thin:'Thin evidence'})[m.evidence]||'Modeled'}</span>${m.status==='proposed'?'<span class="tag prop">Proposed</span>':''}`;
  const mrow=m=>`<div class="mrow" data-metric="${m.id}" data-status="${m.status}" data-evidence="${m.evidence}"><div class="mh"><b>${m.label}</b>${evTag(m)}<span class="mval num">${VAL[m.id]||''}</span></div><p class="mdesc">${m.description}</p>${EXTRA[m.id]||''}</div>`;
  // rules v10 (analysis_metrics v2): the pass / attention chips are the applicable kind=check items of the section (checks_pass counts
  // the same items); v1 data: rules[] with applies, filed under rules[].category
  const V2=!!(EV&&EV.items),ruleList=V2?EV.items.filter(it=>it.kind==='check'&&!C.na.includes(it.id)):R.rules.filter(r=>!C.na.includes(r.id));
  const catOf=r=>V2?r.section:RULE_CAT(r.id),labOf=r=>V2?r.label:RLAB(r.id);
  const rstat=cat=>ruleList.filter(r=>catOf(r)===cat).map(r=>{const bad=C.failing.includes(r.id);return `<span class="tag rs ${bad?'bad':'ok'}" data-${V2?'item':'rule'}="${r.id}">${bad?'!':'✓'} ${labOf(r)}</span>`}).join('');
  const sec=c=>{const rs=ruleList.filter(r=>catOf(r)===c.id),bad=rs.filter(r=>C.failing.includes(r.id)).length;
    const body=c.id==='suggestions'?suggestions():'';
    return `<section class="acat${c.id==='suggestions'?' sugs':''}" data-cat="${c.id}"><div class="ghead cath${c.id==='suggestions'?' sugh':''}">${c.label} <span class="gsub">${rs.length?`${rs.length-bad} of ${rs.length} checks pass`:''}</span></div>
      ${c.id==='suggestions'?'':`<p class="cdesc">${c.description}</p>`}${rs.length?`<div class="rstat">${rstat(c.id)}</div>`:''}${body}<div class="mlist">${(c.metrics||[]).map(mrow).join('')}</div></section>`};
  const suggestions=()=>{const top=SH.slice(0,SUGN),rest=SH.slice(SUGN);
    return `${APPLIED.length?`<div class="flags">${APPLIED.map((a,i)=>`<div class="aplc" data-k="${i}"><div class="grow"><div class="ftl">Applied</div><p>${a.preview}</p>${a.asig===cur?'':'<p class="sub">The board changed after this. Undo puts the whole board back as it was just before Apply, so later edits are lost.</p>'}</div><button class="btn sm ink" data-b="unapply" data-k="${i}">Undo</button></div>`).join('')}</div>`:''}
     ${SH.length?`<div class="flags" id="sugl">${top.map(sugCard).join('')}</div>${rest.length?`<button class="btn plain block more" data-b="sugmore">Show all ${SH.length}</button>`:''}`:(APPLIED.length?'':'<p class="foot">No suggestions: nothing on this board needs a change.</p>')}`};
  AN.body.innerHTML=`<div class="anh">${openSlots()?`<div class="big pend" data-pend="1">Fill slots to check</div><div class="sub">${openSlots()} open slots · the check count is pending until every slot is filled</div>`:`<div class="big num">${M.checks_pass.pass} of ${M.checks_pass.total}</div><div class="sub">checks pass · ${SH.filter(s=>s.severity==='warn').length} need attention · ${SH.length} suggestion${SH.length===1?'':'s'}</div>`}</div>
   ${CATS.map(sec).join('')}
   <div class="ghead">Still sample data <span class="smp">sample</span></div><div class="group asks" id="anasks">${DATA_ASKS.map(t=>`<div class="row"><div class="grow t2">${t}</div></div>`).join('')}</div>
   <p class="foot">${EV.note}</p><div style="height:24px"></div>`}
// Logged-progress values for the Analysis sheet and the Progress tab: the synthetic log (data/progress-reference.json), not real data.
function progressNow(){try{return X.progressData?X.progressData():null}catch(e){console.warn(e);return null}}
const DATA_ASKS=['Fatigue shows points, not %, until there is a saved baseline week (targets.json recovery), so Bring recovery cost back to normal cannot fire yet.','The starting board and the library routines are mock routines.','Logged-progress values come from the synthetic log in data/progress-reference.json.'];
function curve(m,A){const v=A.muscles[m],k=v.k,x=v.x,Sx=z=>1-Math.exp(-z/k),Xm=Math.max(30,Math.ceil((Math.max(x,v.max)+4)/5)*5),W=320,H=168,px=z=>30+z/Xm*(W-40),py=z=>H-30-z*(H-44);
  let d='';for(let i=0;i<=60;i++){const z=i/60*Xm;d+=(i?'L':'M')+px(z).toFixed(1)+','+py(Sx(z)).toFixed(1)}const nx=Sx(x+1)-Sx(x),tk=[];for(let z=0;z<=Xm;z+=Xm>30?10:5)tk.push(`<text x="${px(z)}" y="${H-14}" text-anchor="middle">${z}</text>`);
  return `<svg class="ancurve" viewBox="0 0 ${W} ${H}" data-m="${m}"><rect x="${px(v.min)}" y="8" width="${px(v.max)-px(v.min)}" height="${H-38}" class="band"/>${[0,.5,1].map(z=>`<line x1="30" x2="${W-8}" y1="${py(z)}" y2="${py(z)}"/><text x="26" y="${py(z)+3}" text-anchor="end">${z*100}%</text>`).join('')}${tk.join('')}
   <path d="${d}" class="cv"/><circle cx="${px(x)}" cy="${py(Sx(x))}" r="5" class="dot"/><text x="${px(v.min)+4}" y="20" class="bl">target ${v.min}–${v.max}</text></svg>
   <div class="anread"><b>${X.ML[m]||m}</b>: ${x.toFixed(1)} effective sets a week → ${Math.round(Sx(x)*100)}% of the modeled max. Next set ≈ +${(nx*100).toFixed(1)}%.</div>`}
function analysisSheet(){SUGN=SUG_TOP;AN=X.sheet({title:'Analysis',cls:'tall grouped ansheet',right:'<button class="btn plain" data-b="anclose">Done</button>',onClose(){AN=null}});AN.mus='chest';renderAnalysis();return AN}
// ------------------------------------------------------------- New menu (blank, split template, library preset)
let NW=null;const NS={split:'upper-lower',level:'intermediate',n:'4'};
const TJT=()=>((RD().TJ||{}).templates||[]);
function slotsBody(){const TT=TJT();if(!TT.length)return '<p class="foot">templates.json did not load.</p>';const sp=[...new Map(TT.map(t=>[t.split,t.split_name])).entries()];
  if(!sp.some(x=>x[0]===NS.split))NS.split=sp[0][0];let lvs=LEVELS.filter(l=>TT.some(t=>t.split===NS.split&&t.level===l));if(!lvs.includes(NS.level))NS.level=lvs[0];
  const ns=TT.filter(t=>t.split===NS.split&&t.level===NS.level).map(t=>String(t.days_per_week));if(!ns.includes(NS.n))NS.n=ns[0];
  const t=TT.find(x=>x.id===`${NS.split}/${NS.level}/${NS.n}`),vx=((RD().TJ.volume_exceptions||{})[t.id])||{},ns2=sum(t.days.map(d=>d.slots.length));
  return `<div class="nwv"><button class="btn plain nwback" data-b="nwback">‹ New</button>
   <div class="ghead">Split</div><div class="chips wrap">${sp.map(([id,n])=>`<button class="chip ${id===NS.split?'on':''}" data-ns="split" data-v="${id}">${n}</button>`).join('')}</div>
   <div class="ghead">Level</div><div class="pad0"><div class="seg">${LEVELS.map(l=>`<button class="${l===NS.level?'on':''} ${lvs.includes(l)?'':'off'}" data-ns="level" data-v="${l}" ${lvs.includes(l)?'':'disabled'}>${l[0].toUpperCase()+l.slice(1)}</button>`).join('')}</div></div>
   <div class="ghead">Days a week</div><div class="chips">${ns.map(n=>`<button class="chip ${n===NS.n?'on':''}" data-ns="n" data-v="${n}">${n} days</button>`).join('')}</div>
   <div class="ghead">Slots · ${t.days.length} days · ${ns2} slots</div>
   <div class="group" id="tslots">${t.days.map(d=>`<div class="row"><div class="grow"><div class="t1">${WD[DAYS.indexOf(d.day)]} · ${d.label}</div><div class="t2">${d.slots.map(s=>`${s.label} ${s.sets.min}–${s.sets.max}`).join(', ')}</div></div><span class="val num">${d.slots.length}</span></div>`).join('')}</div>
   <div class="ghead">Volume check · defaults</div><div class="group tvol" id="tvol">${Object.keys(vx).length?Object.entries(vx).map(([m,v])=>`<div class="row" data-mu="${m}" data-st="${v.status}"><div class="grow"><div class="t1"><span class="dot amber"></span>${X.ML[m]||m}</div><div class="t2">${v.sets} sets a week vs ${v.min}–${v.max}: amber, a documented exception</div></div></div>`).join(''):'<div class="row"><div class="grow t2">Every muscle in range with the defaults.</div></div>'}</div>
   <p class="foot">Slots from templates.json; each slot's eligible exercises from templates-reference.json. The defaults reproduce the ${t.split_name} ${t.level} ${t.days_per_week}-day prebuilt routine exactly (0 non-info warnings). Amber = within 2 sets under the level minimum or up to 25% over the max.</p>
   <div class="pad"><button class="btn accent block" data-b="nwslots" data-id="${t.id}">Use these slots</button></div></div>`}
function newBody(view){const SP=RD().splits.splits,PT=RD().patterns.templates;if(view==='slots')return slotsBody();
  if(view==='tpl'){const s=SP.find(x=>x.id===NS.split),lv=s.levels[NS.level]?NS.level:Object.keys(s.levels)[0];NS.level=lv;const ns=Object.keys(s.levels[lv]);if(!ns.includes(NS.n))NS.n=ns[0];
    const days=s.levels[lv][NS.n],pt=((PT[NS.split]||{}).levels||{})[lv],ptd=pt&&pt[NS.n],SL=RD().patterns.slots,mn=sum(days.map(d=>PC.sessionMinutes(RD(),d.tiles)));
    return `<div class="nwv"><button class="btn plain nwback" data-b="nwback">‹ New</button><div class="ghead">Prebuilt routine</div>
     <div class="ghead">Split</div><div class="chips wrap">${SP.map(x=>`<button class="chip ${x.id===NS.split?'on':''}" data-ns="split" data-v="${x.id}">${x.name}</button>`).join('')}</div>
     <div class="ghead">Level</div><div class="pad0"><div class="seg">${LEVELS.map(l=>`<button class="${l===lv?'on':''} ${s.levels[l]?'':'off'}" data-ns="level" data-v="${l}" ${s.levels[l]?'':'disabled'}>${l[0].toUpperCase()+l.slice(1)}</button>`).join('')}</div></div>
     <div class="ghead">Days a week</div><div class="chips">${ns.map(n=>`<button class="chip ${n===NS.n?'on':''}" data-ns="n" data-v="${n}">${n} days</button>`).join('')}</div>
     <div class="ghead">Preview · ${days.length} days · ≈ ${hm(mn)} a week</div>
     <div class="group">${days.map((d,i)=>`<div class="row"><div class="grow"><div class="t1">${WD[DAYS.indexOf(d.day)]} · ${d.label}</div><div class="t2">${ptd&&ptd[i]?ptd[i].slots.map(x=>SL[x.slot].name).join(', '):d.tiles.length+' exercises'}</div></div><span class="val num">${d.tiles.length}</span></div>`).join('')}</div>
     <p class="foot">Exercises from splits.json, slots from patterns.json. You can move anything after.</p>
     <div class="pad"><button class="btn accent block" data-b="nwtpl">Use this template</button></div></div>`}
  if(view==='lib')return `<div class="nwv"><button class="btn plain nwback" data-b="nwback">‹ New</button><div class="ghead">Your library</div>
     <div class="group">${X.ROUTINES.map(r=>`<div class="row"><div class="grow"><div class="t1">${r.name} <span class="smp" title="Mock routine">sample</span></div><div class="t2">${r.meta} · ${r.days.length} days</div></div><button class="btn sm grey" data-b="nwlib" data-id="${r.id}">Duplicate &amp; edit</button></div>`).join('')}</div>
     <p class="foot">The copy opens as a draft. The original stays as it is until you push the copy.</p></div>`;
  return `<div class="nwv"><div class="group nwopts">
    <button class="row" data-b="nwblank"><span class="ico gr">${X.I('plus',2)}</span><div class="grow"><div class="t1">Blank board</div><div class="t2">Seven empty days</div></div>${X.CHEV}</button>
    <button class="row" data-b="nwslotsv"><span class="ico acc">${X.I('build',1.8)}</span><div class="grow"><div class="t1">Template (slots)</div><div class="t2">Empty slots by movement; you pick each exercise</div></div>${X.CHEV}</button>
    <button class="row" data-b="nwprev"><span class="ico gr">${X.I('build',1.8)}</span><div class="grow"><div class="t1">Prebuilt routine</div><div class="t2">A full routine for the split, level and days</div></div>${X.CHEV}</button>
    <button class="row" data-b="nwlibv"><span class="ico gr">${X.I('book',1.8)}</span><div class="grow"><div class="t1">From your library</div><div class="t2">Duplicate a routine and edit the copy</div></div>${X.CHEV}</button></div>
    <p class="foot">Your current draft is kept in Undo until you leave Build.</p></div>`}
function newSheet(view){NW=X.sheet({title:'New routine',cls:'grouped',right:'<button class="btn plain" data-b="nwclose">Cancel</button>',body:newBody(view),onClose(){NW=null}});NW.v=view;return NW}
const nwView=v=>{if(NW){NW.v=v;NW.body.innerHTML=newBody(v)}};
function startFrom(kind,arg){if(NW)NW.close();
  if(kind!=='slots')B.tpl=null;
  if(kind==='slots'){const t=TP().find(RD().TJ,arg);commit(()=>loadTemplate(t),`Started ${t.split_name} slots`)}
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
  const ns=e.target.closest('[data-ns]');if(ns&&NW){NS[ns.dataset.ns]=ns.dataset.v;nwView(NW.v==='slots'?'slots':'tpl');return}
  const j=e.target.closest('[data-jump]');if(j){setMap('day',+j.dataset.jump);return jump(+j.dataset.jump)}
  const mp=e.target.closest('#bmap .mp');if(mp&&mp.dataset.mu){e.preventDefault();return X.go('#learn-'+mp.dataset.mu)}
  if(!b)return;const k=b.dataset.b;e.stopPropagation();
  if(k==='mapm')return setMap(b.dataset.mm,b.dataset.mm==='day'&&MAPV.mode!=='day'?Math.max(0,$$('#dstrip button').findIndex(x=>x.classList.contains('on'))):null);
  if(k==='treset'){Object.assign(TFB,{mus:null,pat:null,eq:null});if(TRAY)$('#tfbb',TRAY.el).innerHTML=X.filterHtml(TFB,'tf');refreshTray();return}
  if(k==='dayh'){setMap('day',DAYS.indexOf(b.dataset.day));return daySheet(b.dataset.day)}if(k==='dsclose')return DS&&DS.close();if(k==='dsrename'||k==='dsrest'||k==='dstrain')return dayAct(k);
  if(k==='tabs')return tabsSheet();if(k==='tabgo'){X.closeAll();return X.go('#'+b.dataset.to)}
  if(k==='analysis')return analysisSheet();if(k==='sugmore'){SUGN=999;const sc=AN.body.scrollTop;renderAnalysis();AN.body.scrollTop=sc;return}if(k==='anclose')return AN&&AN.close();
  if(k==='apply'){const z=FIX[+b.dataset.k];if(!z)return;const before=snap(),bsig=sigD();commit(()=>applyDays(z.days),`Applied: ${z.preview}`);APPLIED.unshift({preview:z.preview,before,bsig,asig:sigD()});if(AN&&!AN.closed){renderAnalysis();AN.body.scrollTop=0}return}
  if(k==='unapply'){const a=APPLIED[+b.dataset.k];if(!a)return;B.hist.push(snap());restore(a.before);APPLIED.splice(+b.dataset.k,1);paint();hideUndo();X.toast('Suggestion undone');return}
  if(k==='undo')return undo();
  if(k==='add'){if(TRAY){TFB.day=b.dataset.day;refreshTray();return}return traySheet(b.dataset.day)}
  if(k==='bmode'){BD.detail=b.dataset.v==='detail';try{localStorage.setItem('apechit.sb.boardDetail',BD.detail?'1':'0')}catch(x){}return paint()}
  if(k==='slot')return slotTray(b.dataset.day,b.dataset.sid);
  if(k==='slotfill')return fillDefaults();
  if(k==='tadd'&&TFB.slot){const id=b.dataset.id,z=TFB.slot,D=B.days.find(d=>d.day===z.day),s=D&&(D.slots||[]).find(x=>x.sid===z.sid);if(!s)return;
    commit(()=>fillSlot(D,s,id),`Filled ${z.label} with ${X.exNameP(id)}`);return TRAY&&TRAY.close()}
  if(k==='tadd'){const id=b.dataset.id;commit(()=>{const D=B.days.find(d=>d.day===TFB.day);D.tiles.push(T(id,setsFor(id)))},`Added ${X.exNameP(id)} to ${WD[DAYS.indexOf(TFB.day)]}`);refreshTray();return}
  if(k==='tclose')return TRAY&&TRAY.close();
  if(k==='seldone'){B.sel.clear();return paintSel()}
  if(k==='push'){B.version=(B.version||0)+1;B.dirty=false;paintStats();return X.toast(`Pushed to Library · v${B.version}`)}
  if(k==='start'){const i=MAPV.mode==='day'&&B.days[MAPV.day].tiles.length?MAPV.day:B.days.findIndex(d=>d.tiles.length);if(i<0)return X.toast('Add exercises first');const d=B.days[i];
    X.startWorkout(dayLabel(d),d.tiles.map(t=>({id:t.id,sets:t.sets})),{sub:`${B.name||'New routine'} · ${WDL[i]}`});return X.go('#workout')}
  if(k==='new')return newSheet();if(k==='nwclose')return NW&&NW.close();if(k==='nwback')return nwView(null);if(k==='nwtplv'||k==='nwprev')return nwView('tpl');if(k==='nwslotsv')return nwView('slots');if(k==='nwslots')return startFrom('slots',b.dataset.id);if(k==='nwlibv')return nwView('lib');
  if(k==='nwblank')return startFrom('blank');if(k==='nwtpl')return startFrom('tpl');if(k==='nwlib')return startFrom('lib',b.dataset.id);
  if(k.startsWith('sets')||k.startsWith('reps')||k.startsWith('c-'))return chitAct(k);
},true);
setInterval(()=>{if(X.S.scr==='build'&&!DRAG){const bs=$('#bstate');if(bs)bs.innerHTML=stateLine()}},30000);
// storyboard routes for the shots and tests
Object.assign(X.ROUTES,{
 'build-chit':['build','build',0,0,()=>{},()=>{const c=$('.chit');if(c)chitSheet(c.dataset.u)}],
 'build-tray':['build','build',0,0,()=>{Object.assign(TFB,{mus:null,pat:null,eq:null})},()=>traySheet('wed')],
 'build-analysis':['build','build',0,0,()=>{},analysisSheet],
 'build-new':['build','build',0,0,()=>{},()=>newSheet()],
 'build-new-tpl':['build','build',0,0,()=>{},()=>newSheet('tpl')],
 'build-day':['build','build',0,0,()=>{},()=>daySheet('mon')],
 'build-map-day':['build','build',0,0,()=>{MAPV.mode='day';MAPV.day=0},()=>{}],
 'build-detail':['build','build',0,0,()=>{BD.detail=true},()=>{}],
 'build-detail-chit':['build','build',0,0,()=>{BD.detail=true},()=>{const c=$('.chit');if(c)chitSheet(c.dataset.u)}],
 'build-new-slots':['build','build',0,0,()=>{Object.assign(NS,{split:'upper-lower',level:'intermediate',n:'4'})},()=>newSheet('slots')],
 'build-template':['build','build',0,0,()=>{BD.detail=false;loadTemplate(TP().find(RD().TJ,'upper-lower/intermediate/4'));B.hist=[];
   const D=B.days[0];fillSlot(D,D.slots[0],D.slots[0].def);fillSlot(D,D.slots[0],'chin-up')},()=>{}],
 'build-tray-slot':['build','build',0,0,()=>{BD.detail=false;loadTemplate(TP().find(RD().TJ,'upper-lower/intermediate/4'));B.hist=[]},()=>slotTray('mon','mon-4')],
 'build-tray-filter':['build','build',0,0,()=>{Object.assign(TFB,{mus:null,pat:'vertical_pull',eq:null})},()=>traySheet('thu')],
});
window.BOARD={get detail(){return BD.detail},fracLine,muscleShort,get tpl(){return B.tpl},slots:()=>B.days.map(d=>({day:d.day,slots:(d.slots||[]).map(s=>s.sid)})),rankBoard,fillDefaults,loadTemplate:id=>{loadTemplate(TP().find(RD().TJ,id));B.hist=[];paint()},get tray(){return {slot:TFB.slot,only:TFB.only}},get map(){return MAPV},get applied(){return APPLIED},get state(){return B},days:()=>checkDays(),stats:()=>stats(),reset:()=>{initBoard();X.render()},sig:()=>JSON.stringify(B.days.map(d=>d.tiles.map(t=>[t.id,t.sets]))),days7:()=>B.days.map(d=>({day:d.day,label:d.label,rest:isRest(d),n:d.tiles.length})),undo};
})();
