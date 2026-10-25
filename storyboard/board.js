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
const MAPV={mode:'week',day:0};let MLEG='';
// Round 2: ONE sequential ramp (tokens --ramp-0..4) for the Day-mode map AND the days-per-muscle grid. Level by effective sets that day.
const RAMPT=[0,1.5,3,5],RAMPL=r=>!(r>0)?0:r>=5?4:r>=3?3:r>=1.5?2:1,DAYF=r=>{const l=RAMPL(r);return l?`var(--ramp-${l})`:null};
const rampLeg=(cls='')=>`<span class="mleg mlday ${cls}"><i style="background:var(--ramp-1)"></i>&lt;1.5<i style="background:var(--ramp-2)"></i>1.5<i style="background:var(--ramp-3)"></i>3<i style="background:var(--ramp-4)"></i>5+ sets</span>`;
function dayMap(d){const o={};if(!d||!d.tiles.length)return o;const A=PC.analytics(RD(),[{day:d.day,tiles:d.tiles.map(t=>({id:t.id,sets:t.sets}))}],B.level);for(const [m,v] of Object.entries(A.muscles))o[m]=DAYF(v.raw);return o}
function mapHtml(st,days){const day=MAPV.mode==='day',d=days[MAPV.day],vm=day?dayMap(d):volMap(st.A);
  const cap=day?`<b>${WD[MAPV.day]}</b> · ${isRest(d)?'Rest':`${dayLabel(d)} · ${sum(d.tiles.map(t=>t.sets))} sets`}`:'<b>This week</b> · vs targets';
  const leg=day?rampLeg()
    :`<span class="mleg">${['under','in','amber','red'].map(k=>`<i style="background:${X.VFILL[k]}"></i>${({under:'Under',in:'In',amber:'Over',red:'Well over'})[k]}`).join('')}</span>`;
  MLEG=leg; // Round 3: the key sits in the right column (#bmleg) so the cropped map gets the card's full height
  return `<div class="bmaps" data-mode="${MAPV.mode}" data-day="${d?d.day:''}">${X.map('front',vm,{crop:1})}${X.map('back',vm,{crop:1})}</div><div class="bmcap" id="bmcap">${cap}</div>`}
function setMap(mode,i){MAPV.mode=mode;if(i!=null)MAPV.day=i;$$('#mapseg button').forEach(b=>b.classList.toggle('on',b.dataset.mm===MAPV.mode));paintStats()}
function stripHtml(st){const {A,C,d}=st,avg=d.length?A.weekMinutes/d.length:0,fail=C.total-C.pass;
  return `<span class="ast"><b class="num" data-s="sets">${A.weekSets}</b><small>sets / wk</small></span>
   <span class="ast"><b class="num" data-s="min">${d.length?'≈ '+mins5(avg):'–'}</b><small>min / session</small></span>
   ${openSlots()?`<span class="ast chk pend"><b class="num" data-s="checks">–</b><small>Fill slots to check</small></span>`:`<span class="ast chk ${fail?'bad':'ok'}"><b class="num" data-s="checks">${C.pass}/${C.total}</b><small>checks pass</small></span>`}<span class="ago">Analysis ›</span>`}
function dayMeta(day){const n=sum(day.tiles.map(t=>t.sets));return day.tiles.length?`${n} sets · ≈ ${mins5(PC.sessionMinutes(RD(),day.tiles.map(t=>({id:t.id,sets:t.sets}))))} min`:''}
function paintStats(days){days=days||B.days;const st=stats(days);const mp=$('#bmap');if(mp)mp.innerHTML=mapHtml(st,days);const lg=$('#bmleg');if(lg)lg.innerHTML=MLEG||'';const s=$('#astrip');if(s){s.innerHTML=stripHtml(st);s.setAttribute('aria-label',`Analysis: ${st.A.weekSets} sets a week, ${st.C.pass} of ${st.C.total} checks pass`)}
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
X.V.build=()=>{if(!B.days.length){initBoard();cxRestorePlaced()}
  return `<div class="bw">${X.header('Build',`<button class="ibtn tabsbtn" data-b="tabs" aria-label="Other tabs">${X.I('tabs',1.8)}</button><button class="ibtn" data-b="new" aria-label="New routine">${X.I('plus',2.2)}</button>`+X.bookBtn+X.gearBtn)}
  <div class="bname"><div class="bn">${B.name||'New routine'}</div>
   <div class="bacts"><button class="btn ink" data-b="push" aria-label="Push to Library">${X.I('up',2.2)}<span class="bl-l">Push to Library</span><span class="bl-s">Push</span></button><button class="btn accent" data-b="start" aria-label="Start training">${X.I('play')}<span class="bl-l">Start training</span><span class="bl-s">Start</span></button></div>
   <div class="bstate" id="bstate">${stateLine()}</div></div>
  <div class="bsum"><div class="bsegs"><div class="seg xs" id="mapseg" role="group" aria-label="Map: week or day"><button data-b="mapm" data-mm="week" class="${MAPV.mode==='week'?'on':''}">Week</button><button data-b="mapm" data-mm="day" class="${MAPV.mode==='day'?'on':''}">Day</button></div><div class="seg xs bdseg" id="bdseg" role="group" aria-label="Board: clean or detail">${bdsegHtml()}</div></div>
   <div class="bsmap" id="bmap"></div><div class="bsr"><button class="astrip" id="astrip" data-b="analysis"></button><div class="bmleg" id="bmleg"></div></div></div>
  <div class="bstick">
   <div class="dstrip" id="dstrip">${WD.map((w,i)=>`<button data-jump="${i}" aria-label="Jump to ${WDL[i]}"><span>${w}</span><small class="dn"></small></button>`).join('')}</div>
   <div class="selbar" id="selbar"><span id="selt"></span><button class="btn plain" data-b="seldone">Done</button></div></div>
  <div class="btools" id="btools">${toolsHtml()}</div>
  <div class="board${BD.detail?' b-detail':''}" id="board">${boardHtml()}</div>
  <div class="pcheck" id="pcheck"></div>
  <div class="glegend" aria-label="Chit shapes">${['primary','accessory','isolation'].map(t=>`<span><span class="cg ${t}">${X.GLY[t]}</span>${t[0].toUpperCase()+t.slice(1)}</span>`).join('')}</div>
  <p class="foot bhint">Tap a muscle on the map to learn about it. Hold a chit to lift it. Drag it to another day, or off the board to remove it. Tap a day's name to rename it or make it a Rest day.</p></div>`};
X.AFTER.build=()=>{paint(true);const bd=$('#board');bd.addEventListener('scroll',markDay,{passive:true});markDay()};
const bdsegHtml=()=>`<button data-b="bmode" data-v="clean" class="${BD.detail?'':'on'}">Clean</button><button data-b="bmode" data-v="detail" class="${BD.detail?'on':''}">Detail</button>`;
function toolsHtml(){const n=openSlots();return (n?`<div class="slotbar" id="slotbar"><span>${n} open slot${n>1?'s':''}</span><button class="btn grey" data-b="slotfill">Fill with defaults</button></div>`:'')}
function cxSavePlaced(){try{const P=[];B.days.forEach(d=>d.tiles.forEach((t,i)=>{if(ex(t.id)&&ex(t.id).custom)P.push({day:d.day,i,id:t.id,sets:t.sets,reps:t.reps||null})}));localStorage.setItem(X.cxPlacedKey,JSON.stringify(P))}catch(e){}}
function cxRestorePlaced(){let P=[];try{P=JSON.parse(localStorage.getItem(X.cxPlacedKey)||'[]')||[]}catch(e){}
  for(const p of P){const D=B.days.find(d=>d.day===p.day);if(!D||!ex(p.id))continue;D.tiles.splice(Math.min(p.i,D.tiles.length),0,T(p.id,p.sets,p.reps));D.rest=false}}
function paint(full){const bd=$('#board');if(!bd)return;cxSavePlaced();const sl=bd.scrollLeft;if(!full)bd.innerHTML=boardHtml();bd.classList.toggle('b-detail',BD.detail);const bt=$('#btools');if(bt)bt.innerHTML=toolsHtml();$$('.bdseg').forEach(x=>x.innerHTML=bdsegHtml());bd.scrollLeft=sl;const bn=$('.bname .bn');if(bn)bn.textContent=B.name||'New routine';
  paintStats();paintSel();paintPcheck();if(AN&&!AN.closed)renderAnalysis();cbRe()}
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
    return `<div class="csh"><div class="csh-h">${X.gl(t.id)}<div class="grow"><div class="t1">${X.exNameP(t.id)}${X.cxL(t.id)}</div><div class="t2">${X.exSub(t.id)} · ${WDL[DAYS.indexOf(g.d.day)]}</div></div></div>
     <div class="group"><div class="row"><div class="grow t1">Sets</div><div class="step"><button data-b="sets-" aria-label="Fewer sets">−</button><b class="num" id="cs-sets">${t.sets}</b><button data-b="sets+" aria-label="More sets">+</button></div></div>
      <div class="row"><div class="grow"><div class="t1">${rr.unit==='reps'?'Reps':rr.unit==='seconds'?'Seconds':'Meters'}</div><div class="t2 rrn">${t.reps?'Your range':(X.prefs().goals||[]).length?'Typical for your goals':'Typical range'}${rr.per_side?' · per side':''}${rr.not_to_failure?' · stop well short of failure':''}</div></div><div class="step"><button data-b="reps-" aria-label="Lower reps">−</button><b class="num" id="cs-reps">${rp}</b><button data-b="reps+" aria-label="Higher reps">+</button></div></div></div>
     <div class="ghead">Muscles worked · set credit per set</div><div class="group csfr">${!fracs(t.id).length&&utOf(t.id)?`<div class="row utn" data-ut="${utOf(t.id).id}"><span class="fn">${utOf(t.id).label}</span><span class="sub">${utOf(t.id).tag}</span></div>`:''}${fracs(t.id).map(([m,v])=>`<div class="row" data-fm="${m}"><span class="fn">${X.ML[m]||m.replace(/_/g,' ')}</span><span class="fb"><i style="--w:${Math.round(v*100)}%;--mc:var(--region-${WB.primaryRegion(RD(),t.id)})"></i></span><b class="fv num">${fr(v)}</b></div>`).join('')}</div>
     <div class="cacts"><button data-b="c-swap">${X.I('swap',1.8)}<span>Swap</span></button><button data-b="c-info">${X.I('info',1.8)}<span>Info</span></button><button data-b="c-dup">${X.I('plus',2)}<span>Duplicate</span></button><button data-b="c-del" class="dl">${X.I('trash',1.8)}<span>Delete</span></button></div></div>`};
  CS=X.sheet({title:'',cls:'grouped csheet',body:body(),onClose(){CS=null}});CS.u=u;CS.re=()=>{CS.body.innerHTML=body()};return CS}
function chitAct(k){if(!CS)return;const u=CS.u,f=findT(u);if(!f)return;const t=f.t;
  if(k==='sets-'||k==='sets+'){const n=Math.max(1,Math.min(10,t.sets+(k==='sets+'?1:-1)));if(n!==t.sets)commit(()=>{findT(u).t.sets=n});CS.re();return}
  if(k==='reps-'||k==='reps+'){const rr=repRange(t.id),m=/^(\d+)\u2013(\d+)(.*)$/.exec(t.reps||rr.display);if(!m)return;const st=REP_STEP[rr.unit]||1,d=(k==='reps+'?1:-1)*st,a=+m[1]+d,b=+m[2]+d;if(a<1)return;commit(()=>{findT(u).t.reps=`${a}\u2013${b}${m[3]}`});CS.re();return}
  if(k==='c-swap'){X.setSC({board:rankBoard(),day:f.d.day});const s=CS;s.close();X.swapSheet(t.id,{onPick:nid=>{commit(()=>{const g=findT(u);g.t.id=nid;g.t.reps=null},`Swapped in ${X.exNameP(nid)}`)}});return}
  if(k==='c-info'){CS.close();if(X.isCx(t.id))return X.exDetail(t.id);return X.go('#learn-ex-'+t.id)}
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
let TRAY=null;const TFB={q:'',mode:'sug',mus:null,pat:null,eq:null,day:'mon',slot:null,only:null};const anyTF=()=>!!(TFB.mus||TFB.pat||TFB.eq||TFB.q);
function trayRows(){const RDv=RD(),ids=Object.keys(RDv.EX).filter(i=>X.passF(TFB,i)&&(!TFB.only||TFB.only.includes(i))&&X.qMatch(i,TFB.q)); // search: live, case/accent-insensitive, name + short name + aliases; combines with the filters
  const md=X.sortMode(TFB.mode,TFB.mus);
  let rows=md==='sug'?RANK.rank(RDv,'tray',ids,{board:rankBoard(),day:TFB.day,custom:ids.filter(i=>RDv.EX[i].custom).map(i=>RDv.EX[i])},X.prefs(),TFB.only?ids.length:24):X.sortIds(ids,md,TFB.mus).slice(0,TFB.only?ids.length:80).map(id=>({id}));
  if(TFB.only&&md==='sug'){const have=new Set(rows.map(r=>r.id));rows=rows.concat(ids.filter(i=>!have.has(i)).map(id=>({id})));const df=TFB.slot.def;rows.sort((a,b)=>(b.id===df)-(a.id===df))}
  const dtag=id=>TFB.slot&&id===TFB.slot.def?'<span class="tag def">default</span>':'';
  if(!ids.length)return `<div class="tnone">${TFB.q?`No exercises match “${X.esc(TFB.q.trim())}”`:'No exercises match these filters'}${TFB.slot?'':`<br><button class="btn accent sm nxnone" data-b="newex" data-q="${X.esc(TFB.q.trim())}">${X.I('plus',2.2)} New exercise${TFB.q.trim()?` “${X.esc(TFB.q.trim().slice(0,40))}”`:''}</button>`}${anyTF()?'<br><button class="btn plain sm" data-b="treset">Clear search and filters</button>':''}</div>`;
  const stim=r=>md==='stim'?`<span class="tag mv sv"><b>${+(TFB.mus?(RDv.EX[r.id].muscles[TFB.mus]||0):Object.values(RDv.EX[r.id].muscles).reduce((a,v)=>a+(+v||0),0)).toFixed(2)}</b> ${TFB.mus?'per set':'total per set'}</span>`:md==='fat'?`<span class="tag mv sv"><b>${RDv.EX[r.id].fatigue}</b> fatigue</span>`:'';
  const nx=TFB.slot?'':`<div class="group nxg"><button class="row nxrow" data-b="newex" data-q=""><span class="nxi">${X.I('plus',2.2)}</span><div class="grow"><div class="t1 acc">New exercise</div><div class="t2">Name it, pick its muscles; it goes on ${WD[DAYS.indexOf(TFB.day)]}</div></div></button></div>`;
  return nx+`<div class="tcount">${md==='sug'?`Ranked for ${WDL[DAYS.indexOf(TFB.day)]} · tap a row for details, hold to drag`:`${X.sortNote(md,TFB.mus)[0].toUpperCase()+X.sortNote(md,TFB.mus).slice(1)} · tap a row for details, hold to drag`}</div><div class="group">`+
   rows.map(r=>`<div class="row trow" data-id="${r.id}">${X.gl(r.id)}<div class="grow"><div class="t1">${X.exNameP(r.id)}${X.cxL(r.id)}${dtag(r.id)}</div>${r.reasons?X.whyR(r):`<div class="t2">${X.exSub(r.id)}${stim(r)}</div>`}</div><button class="addc" data-b="tadd" data-id="${r.id}" aria-label="Add to ${WD[DAYS.indexOf(TFB.day)]}">${X.I('plus',2.2)}</button></div>`).join('')+'</div>'}
const trayTitle=()=>TFB.slot?`Fill ${WD[DAYS.indexOf(TFB.day)]} slot`:`Add to ${WD[DAYS.indexOf(TFB.day)]}`;
function slotEligible(sid){const R=(RD().TREF||{templates:{}}).templates[B.tpl],s=R&&R.slots[sid];if(s)return s.eligible.slice();
  const t=TP().find(RD().TJ,B.tpl),sl=t&&[].concat(...t.days.map(d=>d.slots)).find(x=>x.id===sid);return sl?window.TEMPLATES.eligible(RD(),sl.eligibility,B.level):[]}
const TP=()=>window.TEMPLATES;
function slotTray(day,sid){const D=B.days.find(d=>d.day===day),s=D&&(D.slots||[]).find(x=>x.sid===sid);if(!s)return;
  if(TRAY)TRAY.close();Object.assign(TFB,{mus:null,pat:null,eq:null,slot:{day,sid,def:s.def,rank:s.rank,label:s.label,min:s.min,max:s.max,n:s.n},only:slotEligible(sid)});traySheet(day);
  $$('.slotc').forEach(c=>c.classList.toggle('on',c.dataset.sid===sid));return TRAY}
function traySheet(day){TFB.day=day||TFB.day;
  TRAY=X.sheet({title:trayTitle(),cls:'grouped btray',modal:false,right:'<button class="btn plain" data-b="tclose">Done</button>',onClose(){TRAY=null;TFB.q='';TFB.slot=null;TFB.only=null;$$('.slotc.on').forEach(c=>c.classList.remove('on'))},
    body:`<div class="srch"><span>${X.I('search',2)}</span><input id="tqb" type="search" placeholder="Search ${Object.keys(RD().EX).length} exercises" value="${X.esc(TFB.q)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search exercises"><button class="srx" data-b="tclr" aria-label="Clear search" ${TFB.q?'':'hidden'}>${X.I('x',2.4)}</button></div>${TFB.slot?`<div class="tslot" id="tslot"><b>${TFB.slot.label}</b> · ${TFB.slot.min}–${TFB.slot.max} sets (default ${TFB.slot.n}) · ${TFB.only.length} eligible exercises from templates-reference.json. Default: ${X.exNameP(TFB.slot.def)}, the ranker's #${TFB.slot.rank||1} pick for your slot. Pick one to fill it.</div>`:''}<div class="tftop"><div id="tmodeb" class="grow">${X.sortHtml(TFB.mode,TFB.mus,'tm')}</div><button class="btn plain sm treset" data-b="treset" ${anyTF()?'':'disabled'}>Reset</button></div>
    <div id="tfbb"${TFB.slot?' hidden':''}>${X.filterHtml(TFB,'tf')}</div>
    <div class="tlist" id="btlist">${trayRows()}</div>`});
  $('#tqb',TRAY.el).addEventListener('input',e=>{TFB.q=e.target.value;refreshTray()});$('#tqb',TRAY.el).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur()}});
  $('#btlist',TRAY.el).addEventListener('click',()=>{}); // WebKit only sends a tap's click to a plain div when an ancestor below body listens (the real handler is the delegated one)
  return TRAY}
// add from the tray (+ button or the detail popup): fills the open slot, else adds to the tray's day
function trayAdd(id){if(TFB.slot){const z=TFB.slot,D=B.days.find(d=>d.day===z.day),s=D&&(D.slots||[]).find(x=>x.sid===z.sid);if(!s)return;
    commit(()=>fillSlot(D,s,id),`Filled ${z.label} with ${X.exNameP(id)}`);return TRAY&&TRAY.close()}
  commit(()=>{const D=B.days.find(d=>d.day===TFB.day);D.tiles.push(T(id,setsFor(id)))},`Added ${X.exNameP(id)} to ${WD[DAYS.indexOf(TFB.day)]}`);refreshTray()}
function refreshTray(){if(TRAY){$('#btlist',TRAY.el).innerHTML=trayRows();const sx=$('.srx',TRAY.el);if(sx)sx.hidden=!TFB.q;const sm=$('#tmodeb',TRAY.el);if(sm)sm.innerHTML=X.sortHtml(TFB.mode,TFB.mus,'tm');const rb=$('[data-b=treset]',TRAY.el);if(rb)rb.disabled=!anyTF();const h=$('.sh-head .t',TRAY.el);if(h)h.textContent=trayTitle()}}
// fill one slot (tile keeps from:{sid,i}; it goes before any filled tile from a later slot, so default fills keep the template order)
function fillSlot(D,s,id,sets){D.slots=D.slots.filter(x=>x.sid!==s.sid);const t=T(id,sets==null?s.n:sets,null,{sid:s.sid,i:s.i});
  const k=D.tiles.findIndex(x=>x.from&&x.from.i>s.i);k<0?D.tiles.push(t):D.tiles.splice(k,0,t)}
function fillDefaults(){const n=openSlots();if(!n)return;commit(()=>B.days.forEach(D=>(D.slots||[]).slice().forEach(s=>fillSlot(D,s,s.def))),`Filled ${n} slots with their defaults`)}
// slot defaults = Coach's ranked picks: TEMPLATES.chooseDefaults (port of tools/templates.py; the shared ranker under
// templates.json ranking, diffed against slot-defaults-reference.json and templates.json default_exercise at 0 mismatches)
function loadTemplate(t){const days=blankDays(),CH=TP().chooseDefaults(RD(),t.days,t.level);for(const td of t.days){const D=days[DAYS.indexOf(td.day)];D.label=td.label;D.rest=false;
    D.slots=td.slots.map((s,i)=>({sid:s.id,label:s.label,type:s.slot_type,min:s.sets.min,max:s.sets.max,n:s.sets.default,def:(CH[s.id]||[s.default_exercise])[0],rank:CH[s.id]?CH[s.id][1]+1:s.default_rank,i}))}
  B.days=days;B.tpl=t.id;B.level=t.level;B.name=`${t.split_name} · ${t.days_per_week} days (slots)`;B.version=0;B.dirty=true;B.edited=Date.now()}
// ------------------------------------------------------------- analysis sheet
let AN=null,FIX=[],AMBU=null;const RLAB=id=>PC.ruleLabel(RD(),id); // rules.json rules[].short_label
const LBL=m=>(RD().rules.ranking.labels.regions[m])||X.ML[m]||m.replace(/_/g,' ');
// Analysis: sections, items and wording come from rules.json analysis_metrics v2 (see the batch B note below). Suggestions
// are the typed suggestions of rules.json suggestions.analysis_sheet, from logic/analysis.js (port of tools/analysis.py
// sheet()); each carries its section. Apply = board days := fix.days (Undo keeps the pre-Apply board).
const ANL=window.ANALYSIS;const SUG_TOP=3; // CoS: top 3 per section by severity (sheet order), then "Show all N"
// CoS: one sentence on the card; the rest of the explanation behind "Why?"
const oneSentence=t=>{const m=/^([\s\S]*?[.!?])\s+(?=[A-Z(])([\s\S]+)$/.exec(t||'');return m?[m[1],m[2]]:[t||'','']};
const RULE_CAT=id=>{const r=RD().rules.rules.find(x=>x.id===id);return r&&r.category}; // rules.json rules[].category (Coach round 1 data)
const ruleOf=f=>PC._x.RULE_OF(f[1]);
let APPLIED=[];const sigD=()=>JSON.stringify(B.days.map(d=>[d.label,isRest(d),d.tiles.map(t=>[t.id,t.sets])]));
const pct=x=>`${Math.round(x*100)}%`,MLB=m=>X.ML[m]||LBL(m);
function sugTarget(s,days,lv){const t=s.target||{},A=stats().A;
  if(t.flag)return PC.message(RD(),t.flag,days,lv);
  if(s.source==='lower_fatigue_swap')return `${X.exNameP(t.exercise)} has a same-pattern option with more ${MLB(t.muscle).toLowerCase()} stimulus per unit of fatigue.`;
  if(s.source==='stretch_share')return `${MLB(t.muscle)}: ${bpct(t.share,RD().targets.analytics.stretch_share_flag_below)} of its sets are stretch-biased (the flag is below ${pct(RD().targets.analytics.stretch_share_flag_below)}).`;
  if(s.source==='effective_frequency')return `${MLB(t.muscle)} gets ${RD().targets.analytics.frequency_min_effective}+ effective sets on ${t.days} day${t.days===1?'':'s'} a week. Two days spreads the same volume.`;
  if(s.source==='recovery_vs_baseline')return `This week's modeled recovery cost is ${t.pct}% of your saved normal week.`;
  if(s.source==='weekly_band'){const v=A.muscles[t.muscle]||{};return `${MLB(t.muscle)}: ${bfmt(v.raw!=null?v.raw:t.sets,v.min,v.max)} effective sets a week, ${t.side==='under'?'below':'above'} the ${v.min}–${v.max} target.`}
  return ''}
// Logged-progress values for the Analysis sheet and the Progress tab: the synthetic log (data/progress-reference.json), not real data.
function progressNow(){try{return X.progressData?X.progressData():null}catch(e){console.warn(e);return null}}
const DATA_ASKS=['Fatigue shows points, not %, until there is a saved baseline week, so Bring recovery cost back to normal cannot fire yet.','The starting board and the library routines are mock routines.','Logged-progress values come from a synthetic six-week log.'];
function curve(m,A){const v=A.muscles[m],k=v.k,x=v.x,Sx=z=>1-Math.exp(-z/k),Xm=Math.max(30,Math.ceil((Math.max(x,v.max)+4)/5)*5),W=320,H=168,px=z=>30+z/Xm*(W-40),py=z=>H-30-z*(H-44);
  let d='';for(let i=0;i<=60;i++){const z=i/60*Xm;d+=(i?'L':'M')+px(z).toFixed(1)+','+py(Sx(z)).toFixed(1)}const nx=Sx(x+1)-Sx(x),tk=[];for(let z=0;z<=Xm;z+=Xm>30?10:5)tk.push(`<text x="${px(z)}" y="${H-14}" text-anchor="middle">${z}</text>`);
  return `<svg class="ancurve" viewBox="0 0 ${W} ${H}" data-m="${m}"><rect x="${px(v.min)}" y="8" width="${px(v.max)-px(v.min)}" height="${H-38}" class="band"/>${[0,.5,1].map(z=>`<line x1="30" x2="${W-8}" y1="${py(z)}" y2="${py(z)}"/><text x="26" y="${py(z)+3}" text-anchor="end">${z*100}%</text>`).join('')}${tk.join('')}
   <path d="${d}" class="cv"/><circle cx="${px(x)}" cy="${py(Sx(x))}" r="5" class="dot"/><text x="${px(v.min)+4}" y="20" class="bl">target ${v.min}–${v.max}</text></svg>
   <div class="anread"><b>${X.ML[m]||m}</b>: ${bfmt(x,v.min,v.max)} effective sets a week → ${Math.round(Sx(x)*100)}% of the modeled max. Next set ≈ +${(nx*100).toFixed(1)}%.</div>`}
// Round 2 batch B (item 3, Coach's analysis-spec-r2.md): no top Suggestions block. The sections are analysis_metrics v2's
// build_analysis sections in order; each shows its suggestions inline (sheet() entry .section), then its items from
// logic/analysis.js items() (port of tools/analysis.py items()). Every item has a kind chip (Check / Measure / Info) and an (i)
// that opens its explain sheet (what / how / why + Learn page#section); checks show pass / attention / n/a and their named
// flags (flagDetails: the days and exercises behind each flag). Muscle and pattern rows open a contributor sheet.
const SUGX=new Set(); // sections whose suggestion list is expanded ("Show all N")
const dayN=d=>WD[DAYS.indexOf(d)]||d;
function fatigueHtml(v){const C=v.components||{};if(!v.sets)return '<p class="foot">No sets on the board yet.</p>';const mpL=(RD().rules.movement_patterns||{}).labels||{};
  const bars=(o,lab)=>{const e=Object.entries(o).sort((a,b)=>b[1]-a[1]),mx=Math.max(...e.map(x=>x[1]),1e-9);return e.map(([k,x])=>`<div class="row fzr"><span class="vm">${lab(k)}</span><span class="fzb"><i style="--w:${x/mx*100}%"></i></span><span class="vn num">${(+x).toFixed(1)}</span></div>`).join('')};
  return `<div class="ghead">Breakdown · ${v.value} per set × ${v.sets} sets = ${v.week_cost} points</div>
   <div class="group fzt">${(C.tiers||[]).map(t=>`<div class="row" data-tier="${t.tier}"><div class="grow"><div class="t1">${t.tier[0].toUpperCase()+t.tier.slice(1)} <span class="sub num">${t.sets} sets · ${t.cost} pts · ${pct(t.share_of_cost)}</span></div><div class="t2">${t.exercises.map(X.exNameP).join(', ')}</div></div></div>`).join('')}</div>
   <div class="ghead">By day</div><div class="group">${bars(C.by_day||{},dayN)}</div>
   <div class="ghead">By exercise · top 8</div><div class="group">${(C.by_exercise||[]).slice(0,8).map(x=>`<div class="row fzr"><span class="vm wide">${X.exNameP(x.id)}${X.cxL(x.id)}</span><span class="vn num">${x.cost}</span></div>`).join('')}</div>
   <div class="ghead">By muscle</div><div class="group">${bars(C.by_muscle||{},MLB)}</div>
   <div class="ghead">By movement pattern</div><div class="group">${bars(C.by_pattern||{},k=>mpL[k]||k)}</div>
   <div class="group"><div class="row"><div class="grow t1">Heavy spine sets</div><span class="val num">${C.heavy_spine_sets}</span></div><div class="row"><div class="grow t1">Mean systemic-fatigue tag</div><span class="val num">${C.systemic_fatigue_tag_mean}</span></div>
    <div class="row"><div class="grow t1">Vs your saved normal week</div><span class="val num">${C.vs_baseline!=null?pct(C.vs_baseline):'no saved week'}</span></div></div>
   <p class="foot">${(C.modifiers||{}).note||''} Tiers: heavy axial compound 1.5, other compound 1.1–1.2, lighter compound 1.0, isolation 0.8 per set.</p>`}
// ===== Round 3 (Mr Dude markup): data first, graphic first, consolidated =====
// Five boxed sections (Volume, Frequency, Balance, Recovery & fatigue, Session), each collapsible (chevron; open state in
// localStorage apechit.sb.anOpen) with a sticky header. Inside: the section's graphic(s) first, then ONE compact checklist
// (state icon: subtle green tick = pass, amber = close, red = needs attention; measures just show values; no kind words, per
// data/analysis-display.json render_kind false), then the suggestions not already shown next to the data they fix. Suggestions
// are compact rows: the muscle (a link to its deep-dive) and its numbers, the fix, a small Apply. Results are unchanged:
// the same items() / sheet() objects as before, only placed differently.
const DLAB=id=>((((RD()||{}).DISP||{}).items||{})[id]||{}).display_label;
const ANOPEN_K='apechit.sb.anOpen',anOpen=()=>{try{return JSON.parse(localStorage.getItem(ANOPEN_K)||'{}')||{}}catch(e){return {}}};
function setAnOpen(id,v){const o=anOpen();o[id]=v?1:0;try{localStorage.setItem(ANOPEN_K,JSON.stringify(o))}catch(e){}}
const ICO={pass:'<span class="cki ok" role="img" aria-label="Pass">✓</span>',close:'<span class="cki amb" role="img" aria-label="Close to target">!</span>',attention:'<span class="cki bad" role="img" aria-label="Needs attention">!</span>','n/a':'<span class="cki na" role="img" aria-label="Not counted">–</span>'};
const mlk=(m,anchor)=>`<button class="mlk" data-b="mus" data-m="${m}"${anchor?` data-anchor="${anchor}"`:''}>${MLB(m)}</button>`;
const escA=s=>String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const nfmt=x=>+(+x).toFixed(2);
// a value shown next to a target range never looks in range when it isn't: whole numbers stay whole; otherwise one decimal,
// rounded normally unless that flips the side of the range, then rounded away from the range (7.95 of 8–20 -> 7.9)
const bfmt=(v,lo,hi)=>{v=+v;if(Number.isInteger(v))return String(v);const side=x=>x<lo?-1:hi!=null&&x>hi?1:0,s=side(v);let r=Math.round(v*10)/10;
  if(side(r)!==s)r=s<0?Math.floor(v*10+1e-9)/10:s>0?Math.ceil(v*10-1e-9)/10:r;return String(+r.toFixed(1))};
// same for a share against a floor: 24.7% against 25% shows 24.7%, never 25%
const bpct=(x,lo)=>{const p=x*100,L=lo*100,r=Math.round(p);return (p<L)===(r<L)?`${r}%`:`${+(Math.floor(p*10+1e-9)/10).toFixed(1)}%`};
const weekLeg=()=>`<span class="mleg">${['under','in','amber','red'].map(k=>`<i style="background:${X.VFILL[k]}"></i>${({under:'Under',in:'In',amber:'Over',red:'Well over'})[k]}`).join('')}</span>`;
function renderAnalysis(){if(!AN)return;const dt=RD(),{A,C,d}=stats(),R=dt.rules,lv=B.level;FIX=[];const sc0=AN.body.scrollTop;
  const cur=sigD();APPLIED=APPLIED.filter(a=>a.bsig!==cur); // undone (here or with the Undo bar): drop it
  const SH=ANL.sheet(dt,d,lv,null);
  const EV=R.analysis_metrics,AMI={};EV.items.forEach(i=>AMI[i.id]=i);const IT=ANL.items(dt,d,lv,null),IB={};IT.forEach(i=>IB[i.id]=i);AN.items=IB;
  const LB=id=>DLAB(id)||(IB[id]||AMI[id]||{}).label||id;
  const VCOL=((IB.weekly_sets_per_muscle||{}).value||{}).muscles||{};
  // Coach's per-muscle colour (G in range, A close, R far): amber shows amber with a Close status and is never green
  const vrow=([m,v])=>{const col=(VCOL[m]||{}).colour,st0=v.raw>0?X.vStat(v.raw,v.min,v.max):'under',st=col==='A'?'amber':col==='R'&&st0==='in'?'red':st0,VB=X.VB,top=v.max*(VB.red_factor!=null?VB.red_factor:1);const ks=col==='A'?(st0==='under'?'close-under':'close-over'):st==='amber'?'close-over':st==='red'?'over':st;
    return `<button class="row vrow${col==='A'?' vclose':''}" data-vs="${st}" data-st="${ks}" data-col="${col||''}" data-b="mus" data-m="${m}" data-anchor="sets"><span class="vm">${X.ML[m]||m}${ks==='close-under'||ks==='close-over'||ks==='over'?`<small class="vst ${ks==='over'?'red':'amb'}">${X.VLAB[ks]}</small>`:''}</span><span class="vb"><i style="--w:${Math.min(1,v.raw/top)*100}%" class="vs-${st}"></i><b style="--x:${v.max/top*100}%"></b></span><span class="vn num">${bfmt(v.raw,v.min,v.max)}<small>/${v.min}–${v.max}</small></span></button>`};
  const T=Object.entries(A.muscles).filter(([m,v])=>v.raw>0||v.min>0),RU={};R.rules.forEach(r=>RU[r.id]=r);
  const FM=R.frequency_muscles,fq=m=>B.days.map((dd,i)=>{const e=PC.eff(dt,dd.tiles.map(t=>({id:t.id,sets:t.sets})))[m]||0;const ok=e>=dt.targets.analytics.frequency_min_effective;return `<i class="${ok?'on':e>0?'lo':''}" data-r="${RAMPL(e)}" title="${WD[i]} · ${+e.toFixed(1)} sets${ok?' (counts)':''}"></i>`}).join('');
  const SL=RU.session_length,mx=Math.max(SL.warn_min+15,...A.day.map(x=>x.minutes)),SP=A.spinal,cm=Object.keys(A.muscles).includes(AN.mus)?AN.mus:'chest';
  const MPL=(R.movement_patterns||{}).labels||{},RGL=k=>k[0].toUpperCase()+k.slice(1);
  const val=id=>(IB[id]||{}).value,ntc=id=>((IB[id]||{}).notes||[]).length;
  const fz=val('fatigue_rating')||{},rc=val('recovery_cost')||{},ss=val('stretch_share')||{per_muscle:{}},mps=val('movement_pattern_sets')||{},us=val('unilateral_share')||{},spf=(val('stimulus_per_fatigue')||{}).per_muscle||{},pp=val('push_pull_ratio');
  const VAL={weekly_sets_per_muscle:`${T.filter(([,v])=>v.raw>=v.min&&v.raw<=v.max).length} of ${T.length} in range · ${(val('weekly_sets_per_muscle')||{}).week_sets_total} sets`,
    stimulus_curve:A.muscles[cm]?`${MLB(cm)}: next set ≈ +${(A.muscles[cm].next*100).toFixed(1)}%`:'',
    weekly_sets_per_region:Object.entries(val('weekly_sets_per_region')||{}).map(([k,v])=>`${RGL(k)} ${nfmt(v)}`).join(' · '),
    effective_frequency:`${FM.filter(m=>(A.muscles[m]||{}).freq>=2).length} of ${FM.length} on 2+ days`,frequency_two_days:ntc('frequency_two_days')?`${ntc('frequency_two_days')} on 1 day`:'all on 2+ days',
    push_pull_ratio:pp?`${pp.pull_sets} pull : ${pp.push_sets} push`:'',stretch_share:ss.overall!=null?`${pct(ss.overall)} of sets`:'',
    unilateral_share:us.overall!=null?`${pct(us.overall)} of sets`:'',movement_pattern_sets:`${Object.keys(mps).length} patterns`,
    fatigue_rating:fz.sets?`${fz.value} per set · ${fz.week_cost} pts`:'',recovery_cost:rc.week!=null?`${rc.week} points${rc.vs_baseline==null?' · no saved week':''}`:'',
    stimulus_per_fatigue:`${SH.filter(s=>s.type==='swap_lower_fatigue').length} lower-fatigue swaps`,spinal_load:`${SP.week} of ${SP.week_max} heavy spine sets`,
    lower_back_fatigue:ntc('lower_back_fatigue')?`${ntc('lower_back_fatigue')} note${ntc('lower_back_fatigue')>1?'s':''}`:'no notes',stretch_coverage:ntc('stretch_coverage')?`${ntc('stretch_coverage')} note${ntc('stretch_coverage')>1?'s':''}`:'none',
    session_length:(v=>v?`≈ ${v.average} min a session`:'')(val('session_length'))};
  const NA=it=>{const a=(AMI[it.id]||{}).applies||{};return (a.requires||[]).includes('baseline_saved')?'needs a saved normal week':(a.levels&&!a.levels.includes(lv))?`not used at ${lv} level`:'needs 2+ training days'};
  const AMB=Object.entries(VCOL).filter(([,c])=>c.colour==='A').map(([m,c])=>({m,sets:c.sets,min:(A.muscles[m]||{}).min,max:(A.muscles[m]||{}).max}));
  VAL.volume_in_reach=(IB.volume_in_reach||{}).status==='pass'?(AMB.length?`Passing · ${AMB.length} close`:'All in range'):`${Object.values(VCOL).filter(c=>c.colour==='R').length} out of reach`;
  const st=it=>!it||it.kind!=='check'?null:it.id==='volume_in_reach'&&it.status==='pass'&&AMB.length?'close':it.status;
  const ibx=id=>`<button class="ixb" data-b="anx" data-id="${id}" aria-label="Explain: ${escA(LB(id))}">${X.I('info',1.8)}</button>`;
  // ---- suggestions: deduped per section (same muscle + same first fix = one row), placed next to their data, the rest at the end
  const sgM=s=>{const t=s.target||{};return t.muscle||(t.flag&&typeof t.flag[2]==='string'&&X.ML[t.flag[2]]?t.flag[2]:null)};
  const SGS={},seen=new Set(),used=new Set();SH.forEach(s=>{const k=[s.section,sgM(s)||'',(s.fixes[0]||{}).preview||s.type].join('|');if(seen.has(k))return;seen.add(k);(SGS[s.section]=SGS[s.section]||[]).push(s)});
  const fxRow=(f,s)=>{FIX.push(Object.assign({section:s.section},f));return `<div class="fxr"><span>${f.preview}${f.resolves?'':` <em>${R.partial_label}</em>`}</span><button class="btn xs accent" data-b="apply" data-k="${FIX.length-1}">Apply</button></div>`};
  const sgHead=s=>{const t=s.target||{},m=sgM(s),v=m&&A.muscles[m];
    if(s.source==='weekly_band')return [mlk(m,'sets'),`${bfmt(v.raw!=null?v.raw:t.sets,v.min,v.max)} of ${v.min}–${v.max}`];
    if(s.source==='effective_frequency')return [mlk(m,'frequency'),`${t.days} of 2 days`];
    if(s.source==='low_frequency')return [mlk(m,'frequency'),`${t.flag[3]} of 2 days`];
    if(s.source==='stretch_share')return [mlk(m,'stretch'),`${bpct(t.share,RD().targets.analytics.stretch_share_flag_below)} stretch-focused`];
    if(s.source==='lower_fatigue_swap')return [mlk(m),X.exNameP(t.exercise)];
    if(s.source==='pattern_gap'){const f=t.flag;return [m?mlk(m):(MPL[f[2]]||f[2].replace(/_/g,' ')),`${f[3]} of ${f[4]} a week`]}
    if(t.flag){const r=ruleOf(t.flag);if(r==='push_pull_imbalance')return [RLAB(r),`${t.flag[2]} pull per push`];if(r==='sets_per_exercise'){const dd=d.find(x=>x.day===t.flag[2]),tl=dd&&dd.tiles.find(x=>x.id===t.flag[3]);return [RLAB(r),`${tl?tl.sets:''} sets of ${X.exNameP(t.flag[3])} on ${dayN(t.flag[2])}`]}return [RLAB(r),'']}
    if(s.source==='recovery_vs_baseline')return [LB('recovery_vs_baseline'),`${t.pct}%`];
    return [m?mlk(m):((TYL[s.type])||s.type),'']};
  const TYL={};(R.suggestions.analysis_sheet.types||[]).forEach(t=>TYL[t.id]=t.label);
  const sgRow=(s,inl)=>{const [who,num]=sgHead(s),f0=s.fixes[0];let k=-1;if(f0){FIX.push(Object.assign({section:s.section},f0));k=FIX.length-1}const m=sgM(s);
    return `<div class="sgr ${s.severity}${inl?' inl':''}${s.fixes.length?' hasfix':''}" data-type="${s.type}" data-src="${s.source}" data-sec="${s.section}"${(s.target||{}).flag?` data-rule="${ruleOf(s.target.flag)}"`:''}${m?` data-m="${m}"`:''} title="${escA(sugTarget(s,d,lv))}">
      ${inl?'':`<div class="sgt">${who}${num?` <span class="num">${num}</span>`:''}</div>`}<div class="sgp">${f0?`${f0.preview}${f0.resolves?'':` <em>${R.partial_label}</em>`}`:'No one-tap change passes the checks. Change it by hand.'}</div>
      ${f0?`<button class="btn xs accent" data-b="apply" data-k="${k}">Apply</button>`:''}${s.fixes.length>1?`<details class="sgmore"><summary>${s.fixes.length-1} more fix${s.fixes.length>2?'es':''}</summary>${s.fixes.slice(1).map(f=>fxRow(f,s)).join('')}</details>`:''}</div>`};
  const take=(sec,pred,inl)=>{const L=(SGS[sec]||[]).filter(s=>!used.has(s)&&pred(s));L.forEach(s=>used.add(s));return L.map(s=>sgRow(s,inl)).join('')};
  const rest=(sec,label)=>{const L=(SGS[sec]||[]).filter(s=>!used.has(s));if(!L.length)return '';const top=SUGX.has(sec)?L:L.slice(0,SUG_TOP);L.forEach(s=>used.add(s));
    return `<div class="sgl isug" data-n="${L.length}"><div class="ash"><span>${label||'Suggestions'}</span><span class="ashv num">${L.length}</span></div>${top.map(s=>sgRow(s)).join('')}${L.length>top.length?`<button class="btn plain block more" data-b="sugmore" data-sec="${sec}">Show all ${L.length}</button>`:''}</div>`};
  // ---- flags and notes under a checklist row, with the suggestions that fix them
  const who=f=>{const ds=(f.days||[]).map(dayN).join(', '),xs=(f.exercises||[]).map(X.exNameP);
    return `${ds?`<b>${ds}</b>`:''}${xs.length?`${ds?' · ':''}${xs.slice(0,5).join(', ')}${xs.length>5?` +${xs.length-5} more`:''}`:''}${f.missing_slot?`Nothing on the board fills ${(MPL[f.missing_slot]||f.missing_slot.replace(/_/g,' ')).toLowerCase()}`:''}`};
  const fdet=(it,f,note)=>`<div class="ckd fdet ${note?'note':f.severity}" data-rule="${f.rule}"${f.muscle?` data-m="${f.muscle}"`:''}><p>${f.muscle?mlk(f.muscle)+' · ':''}${PC.message(dt,f.flag,d,lv)}</p>${who(f)?`<p class="fwho">${who(f)}</p>`:''}</div>${take(it.section,s=>(s.target||{}).flag&&JSON.stringify(s.target.flag)===JSON.stringify(f.flag),true)}`;
  const flagsOf=it=>(it.flags||[]).map(f=>fdet(it,f)).join('')+(it.notes||[]).map(f=>fdet(it,f,1)).join('');
  const ckRow=(id,o={})=>{const it=IB[id];if(!it)return '';const def=AMI[id]||{},s=st(it);
    return `<div class="ckr${s?'':' ms'}" data-metric="${id}" data-kind="${it.kind}" data-status="${def.status}" data-evidence="${def.evidence}"${it.status?` data-check="${it.status}"`:''}${s?` data-state="${s}"`:''}${id==='volume_in_reach'?` data-amber="${AMB.length}"`:''}>${s?ICO[s]:''}<span class="ckt">${LB(id)}</span><span class="ckv num">${it.status==='n/a'?`n/a · ${NA(it)}`:o.v!=null?o.v:(VAL[id]||'')}</span>${ibx(id)}</div>${o.after||''}${o.noflags?'':flagsOf(it)}`};
  const gfx=(id,inner,o={})=>{const it=IB[id];if(!it)return '';const s=st(it),def=AMI[id]||{};
    return `<div class="agfx" data-metric="${id}" data-kind="${it.kind}" data-status="${def.status}" data-evidence="${def.evidence}"${it.status?` data-check="${it.status}"`:''}${s?` data-state="${s}"`:''}><div class="ash">${s?ICO[s]:''}<span>${o.label||LB(id)}</span>${o.mod?'<span class="evl" data-ev="modeled">Modeled</span>':''}<span class="ashv num">${o.v!=null?o.v:(VAL[id]||'')}</span>${ibx(id)}</div>${inner}${o.noflags?'':flagsOf(it)}</div>`};
  const hbar=(lab,w,v,o={})=>`<div class="hbar${o.cls?' '+o.cls:''}"${o.attr||''}><span class="vm hbs">${lab}</span><span class="hbt"><i class="${o.c||''}" style="--w:${Math.max(0,Math.min(100,w))}%"></i>${o.x!=null?`<b style="--x:${o.x}%"></b>`:''}</span><span class="vn num">${v}</span></div>`;
  // ---- Volume: modeled stimulus (curve + one row per muscle with its green ideal band), weekly sets with fixes inline, checklist
  const volFix=new Set((SGS.volume||[]).filter(s=>s.source==='weekly_band'&&s.fixes.length).map(sgM));
  const ambInline=m=>{const a=AMB.find(x=>x.m===m);if(!a||volFix.has(m))return '';const p=cbPick('mus',m);return p?`<div class="sgr inl ambr" data-m="${m}"><div class="sgp">Suggested: ${X.exNameP(p.id)} on ${WDL[DAYS.indexOf(p.day)]}, ${setsFor(p.id)} sets</div><button class="btn xs accent ambadd" data-b="ambadd" data-m="${m}" data-id="${p.id}" data-day="${p.day}">Add</button></div>`:''};
  const stRows=`<div class="strows">${T.map(([m,v])=>{const S=z=>1-Math.exp(-z/v.k),a=S(v.min)*100,b=S(v.max)*100,x=S(v.x)*100;
    return `<div class="strow${m===cm?' on':''}" data-m="${m}"><span class="vm">${mlk(m,'curve')}</span><button class="stt" data-anm="${m}" aria-label="Show the ${MLB(m)} curve"><i class="sband" style="left:${a.toFixed(2)}%;width:${(b-a).toFixed(2)}%"></i><i class="stm" style="left:${x.toFixed(2)}%"></i></button><span class="vn num">${Math.round(x)}%</span></div>`}).join('')}</div>`;
  const ambList=AMB.length?`<div class="ckd ambl" data-n="${AMB.length}"><p class="ambh">Passing, ${AMB.length} close to target: ${AMB.map(a=>`${mlk(a.m,'sets')} <span class="num">${bfmt(a.sets,a.min,a.max)} of ${a.min}–${a.max}</span>`).join(', ')}</p>${AMBU&&AMBU.sig===sigD()?`<div class="aplr aplc ambu"><div class="grow"><p>${AMBU.text}</p></div><button class="btn xs ink" data-b="ambundo">Undo</button></div>`:''}</div>`:'';
  const BODY={
    volume:()=>gfx('stimulus_curve',`<div class="curvec card curve">${curve(cm,A)}</div>${stRows}<p class="foot">Green = the modeled stimulus of the muscle's ideal weekly set range; dot = this week. ${A.curveModel}. ${A.disclaimer}</p>`,{mod:1})
      +gfx('weekly_sets_per_muscle',`<div class="group vol">${T.map(r=>vrow(r)+take('volume',s=>s.source==='weekly_band'&&sgM(s)===r[0],true)+ambInline(r[0])).join('')}</div>${X.volLegend(true)}`)
      +`<div class="ckl">${ckRow('volume_in_reach',{after:IB.volume_in_reach&&IB.volume_in_reach.status==='pass'?ambList:''})}${ckRow('weekly_sets_per_region')}</div>`+rest('volume'),
    frequency:()=>{const N=dt.FN&&window.FREQNOTES?FREQNOTES.notes(dt,d,lv,dt.FN.templates):[];
      const nrow=n=>{const m=n.link&&n.link.muscle,lab=m?MLB(m):'',txt=m&&n.text.toLowerCase().startsWith(m.replace(/_/g,' ')+':')?n.text.slice(m.length+1):n.text;
        return `<div class="nrow" data-note="${n.id}" data-pol="${n.polarity}"${m?` data-m="${m}"`:''}>${n.polarity==='positive'?ICO.pass:ICO.close}<span>${m?`<button class="mlk" data-b="mus" data-m="${m}" data-anchor="${n.link.anchor.replace('deepdive-'+m+'-','')}">${lab}</button>:`:''}${txt}</span></div>${m&&n.polarity==='negative'?take('frequency',s=>sgM(s)===m,true):''}`};
      return gfx('effective_frequency',`<div class="group freq"><div class="row fqh"><span class="vm"></span><span class="fq">${WD.map(w=>`<i>${w[0]}</i>`).join('')}</span></div>${FM.map(m=>`<button class="row" data-b="mus" data-m="${m}" data-anchor="frequency"><span class="vm">${X.ML[m]}</span><span class="fq">${fq(m)}</span></button>`).join('')}<div class="row fqleg">${rampLeg()}</div></div>`)
        +gfx('frequency_two_days',`<div class="ckl fnotes">${N.map(nrow).join('')}</div>`,{noflags:1})
        +`<div class="ckl">${ckRow('consecutive_high_volume',{noflags:1})}${ckRow('day_shading')}</div>`+rest('frequency')},
    balance:()=>{const fb=dt.targets.analytics.stretch_share_flag_below,inG=new Set();
      // bar colour follows the muscle's own stretch check when it has one (pass = green + tick, otherwise amber, no tick);
      // muscles without a check are coloured by their share against the line. A pass below the line says why in a short note.
      const SB=dt.rules.stretch_biased||{},onB=new Set(d.flatMap(x=>x.tiles.map(t=>t.id)));
      const ssRows=Object.entries(ss.per_muscle||{}).map(([m,v])=>{const ci=IB['stretch_'+m];if(ci)inG.add(ci.id);
        const c=ci&&ci.status!=='n/a'?(ci.status==='pass'?'ok':'amb'):(v<fb?'amb':'ok');
        const why=ci&&ci.status==='pass'&&v<fb?(()=>{const ex=(SB[m]||[]).filter(i=>onB.has(i)).map(EXN);return `<p class="ssn" data-m="${m}">Passes because ${ex.length?ex.join(' and ')+(ex.length>1?' count':' counts')+' as':'it has'} stretch-focused work. Its share is still under ${pct(fb)}.</p>`})():'';
        return hbar(`${mlk(m,'stretch')}${ci?`<button class="cbx" data-b="anx" data-id="${ci.id}" data-check-item="${ci.id}" data-check="${ci.status}" aria-label="Explain: ${DLAB(ci.id)||ci.id}">${ci.status==='pass'?ICO.pass:ci.status==='attention'?ICO.close:ICO['n/a']}</button>`:''}`,v*100,bpct(v,fb),{cls:'ssr',attr:` data-m="${m}" data-c="${c}"`,c,x:fb*100})+why+take('balance',s=>s.source==='stretch_share'&&sgM(s)===m,true)}).join('');
      const pmx=Math.max(1,...Object.values(mps));
      const ppBar=pp&&(pp.pull_sets+pp.push_sets)?`<div class="ckd"><div class="ppbar"><span class="pu" style="flex:${pp.pull_sets}">Pull ${pp.pull_sets}</span><span class="ps" style="flex:${pp.push_sets}">Push ${pp.push_sets}</span></div><p class="ppcap">${pp.pull_to_push} pull per push · in balance at 0.75–2</p></div>`:'';
      const stretchChecks=IT.filter(i=>/^stretch_/.test(i.id)&&i.kind==='check'&&(!inG.has(i.id)||i.status!=='pass')).map(i=>ckRow(i.id)).join('');
      return gfx('stretch_share',`<div class="hbars">${ssRows}</div><p class="foot">Line = ${pct(fb)}: below it a muscle gets few stretch-focused sets. ✓ = the muscle's own stretch check passes; the bar colour follows that check.</p>`)
        +gfx('unilateral_share',hbar('All sets',(us.overall||0)*100,pct(us.overall||0)))
        +gfx('movement_pattern_sets',`<div class="hbars pats">${Object.entries(mps).map(([k,v])=>`<button class="hbar prow" data-b="pat" data-p="${k}"><span class="vm hbs">${MPL[k]||k}</span><span class="hbt"><i style="--w:${v/pmx*100}%"></i></span><span class="vn num">${v} sets</span></button>`).join('')}</div>`)
        +`<div class="ckl">${ckRow('push_pull_ratio',{after:ppBar})}${ckRow('pattern_coverage')}${ckRow('redundant_pattern')}${stretchChecks}${ckRow('stretch_coverage')}</div>`+rest('balance')},
    recovery_fatigue:()=>{const bd=rc.by_day||{},bmx=Math.max(1e-9,...Object.values(bd)),sm=Object.entries(spf).sort((a,b)=>a[1]-b[1]),smx=Math.max(1e-9,...sm.map(x=>x[1]));
      const tiers=(fz.components||{}).tiers||[],FTI=l=>['heavy axial compound','other compound','lighter compound','isolation'].indexOf(l)+1; // week tier list: same tier colours as the day stacks
      // r3fu: each day's bar stacked by fatigue tier (MUSCLEDIVE.recoveryTiers, port of Coach's recovery_tiers; tier costs sum exactly to the day total)
      const RTD=window.MUSCLEDIVE&&MUSCLEDIVE.recoveryTiers?MUSCLEDIVE.recoveryTiers(dt,checkDays()):null,TI=id=>(RTD?RTD.tiers.findIndex(t=>t.id===id):0)+1,TL=id=>RGL(((RTD&&RTD.tiers.find(t=>t.id===id))||{label:id}).label);
      const stk=(k,v)=>{const T=((RTD||{}).by_day||{})[k];if(!T)return hbar(dayN(k),v/bmx*100,v);
        return `<div class="hbar rtrow" data-day="${k}" data-total="${T.total}"><span class="vm hbs">${dayN(k)}</span><span class="hbt rtk"><span class="rtstk" style="--w:${T.total/bmx*100}%">${T.tiers.map(t=>`<i data-tier="${t.tier}" data-cost="${t.cost}" style="--tw:${T.total?t.cost/T.total*100:0}%;background:var(--tier-${TI(t.tier)})" title="${TL(t.tier)} · ${t.cost} pts · ${t.sets} sets"></i>`).join('')}</span></span><span class="vn num">${T.total}</span></div>`};
      const rleg=RTD?`<div class="tierleg rtleg">${RTD.tiers.map(t=>`<span data-tier="${t.id}"><i style="background:var(--tier-${TI(t.id)})"></i>${RGL(t.label)}</span>`).join('')}</div>`:'';
      return gfx('recovery_cost',`<div class="hbars">${Object.entries(bd).map(([k,v])=>stk(k,v)).join('')||'<p class="foot">No training days yet.</p>'}</div>${Object.keys(bd).length?rleg:''}`,{mod:1})
        +gfx('stimulus_per_fatigue',`<div class="hbars">${sm.map(([m,v])=>hbar(mlk(m,'fatigue'),v/smx*100,(+v).toFixed(2))).join('')}</div><p class="foot">Effective sets per fatigue point; lowest first.</p>`,{mod:1})
        +gfx('fatigue_rating',fz.sets?`<div class="tierbar">${tiers.map(t=>`<i style="flex:${t.share_of_cost};background:var(--tier-${FTI(t.tier)})" title="${RGL(t.tier)}"></i>`).join('')}</div><div class="tierleg">${tiers.map(t=>`<span><i style="background:var(--tier-${FTI(t.tier)})"></i>${RGL(t.tier)} ${pct(t.share_of_cost)}</span>`).join('')}</div><button class="btn plain sm fzmore" data-b="anx" data-id="fatigue_rating">Full breakdown ›</button>`:'',{mod:1})
        +`<div class="ckl">${ckRow('recovery_vs_baseline')}${ckRow('spinal_load',{after:A.day.length?`<div class="ckd">${A.day.map(x=>`<span class="${x.spinal>SP.session_max?'over':''}">${WD[DAYS.indexOf(x.day)]} ${x.spinal}/${SP.session_max}</span>`).join(' · ')} spine sets</div>`:''})}${ckRow('lower_back_fatigue')}</div>`+rest('recovery_fatigue','Lower-fatigue swaps')},
    session:()=>gfx('session_length',`<div class="group sess">${A.day.map(x=>`<div class="row"><span class="vm">${WD[DAYS.indexOf(x.day)]}</span><span class="sbar"><i style="--w:${x.minutes/mx*100}%" class="${x.minutes>=SL.warn_min?'w':x.minutes>=SL.info_min?'i':''}"></i><b style="--x:${SL.info_min/mx*100}%"></b><b class="w" style="--x:${SL.warn_min/mx*100}%"></b></span><span class="vn num">${Math.round(x.minutes)}</span></div>`).join('')||'<div class="row sub">No training days yet</div>'}</div><p class="foot">Minutes per day; lines at ${SL.info_min} and ${SL.warn_min} min.</p>`)
      +`<div class="ckl">${ckRow('session_design')}</div>`+rest('session')};
  const aplc=([a,i])=>`<div class="aplr aplc" data-k="${i}"><div class="grow"><p><b>Applied</b> · ${a.preview}</p>${a.asig===cur?'':'<p class="sub">The board changed after this. Undo puts the whole board back as it was just before Apply, so later edits are lost.</p>'}</div><button class="btn xs ink" data-b="unapply" data-k="${i}">Undo</button></div>`;
  const SECS=EV.sections.filter(s=>s.tab==='build_analysis'&&s.id!=='suggestions'),OPEN=anOpen();
  const sec=c=>{const its=IT.filter(i=>i.section===c.id),chk=its.filter(i=>i.kind==='check'&&i.status!=='n/a'),bad=chk.filter(i=>i.status==='attention').length,cl=c.id==='volume'&&its.some(i=>st(i)==='close')?AMB.length:0;
    const ap=APPLIED.map((a,i)=>[a,i]).filter(([a])=>a.section===c.id),open=OPEN[c.id]!==0,body=BODY[c.id]?BODY[c.id]():'';
    return `<section class="asec acat" data-cat="${c.id}" data-open="${open?1:0}"><button class="asech" data-b="asec" aria-expanded="${open}"><span class="asl">${c.label}</span><span class="ass gsub">${chk.length?`${bad?ICO.attention:cl?ICO.close:ICO.pass}${chk.length-bad} of ${chk.length} pass`:''}${cl?` · ${cl} close`:''}</span>${X.CHEV}</button>
      <div class="asecb">${ap.map(aplc).join('')}<p class="cdesc">${c.description}</p>${body}</div></section>`};
  const nWarn=SH.filter(s=>s.severity==='warn').length,vm=volMap(A);
  if(!AN.body.onclick)AN.body.onclick=()=>{}; // WebKit: taps on the map paths need a listener below body
  AN.body.innerHTML=`<div class="anh"><div class="anmap" aria-label="This week vs targets">${X.map('front',vm,{crop:1})}${X.map('back',vm,{crop:1})}</div><div class="anmapleg">${weekLeg()}</div>
     ${openSlots()?`<div class="big pend" data-pend="1">Fill slots to check</div><div class="sub">${openSlots()} open slots · the check count is pending until every slot is filled</div>`:`<div class="anbig"><div class="big num">${C.pass} of ${C.total}</div><button class="ixb" data-b="anx" data-id="checks_pass" aria-label="How checks are counted">${X.I('info',1.8)}</button></div><div class="sub">checks pass · ${nWarn} need attention · ${SH.length} suggestion${SH.length===1?'':'s'} in the sections below</div>`}
     ${SH.length||APPLIED.length?'':'<p class="sub nosug">No suggestions: nothing on this board needs a change.</p>'}</div>
    ${SECS.map(sec).join('')}
    <div class="ghead">Still sample data <span class="smp">sample</span></div><div class="group asks" id="anasks">${DATA_ASKS.map(t=>`<div class="row"><div class="grow t2">${t}</div></div>`).join('')}</div>
    <div style="height:24px"></div>`;AN.body.scrollTop=sc0}
// explain sheet for an item; the fatigue rating adds its breakdown
function explainItem(id){const it=(AN&&AN.items||{})[id];const ex=id==='fatigue_rating'&&it?fatigueHtml(it.value):id==='checks_pass'?(()=>{const c=stats().C;return `<div class="group"><div class="row"><div class="grow t1">This board</div><span class="val num">${c.pass} of ${c.total}</span></div></div>`})():'';return X.explainSheet(id,ex)}
// contributor sheet: the exercises behind a muscle or a movement pattern, their sets and effective sets; Remove (per chit),
// Add suggested (the shared ranker's top pick for that muscle / pattern, added to the training day with the least of it); Undo.
let CB=null;
// Round 3: the muscle deep-dive. ONE payload from logic/muscledive.js (port of Coach's muscle_deepdive.py, diffed at 0 against
// data/muscle-deepdive-reference.json) drives the whole sheet: sets vs band, modeled stimulus curve, frequency per day, stretch,
// recovery / fatigue, contributing exercises (Remove per chit), Apply-ready suggestions and the ranker's adds. Sub-anchors
// deepdive-<m>-sets / -curve / -frequency / -stretch / -fatigue / -session are the link targets of the Analysis rows and notes.
let CFIX=[];
const DDST={in_range:['In range','in'],under:['Close, under','close-under'],over:['Close, over','close-over'],far_under:['Under','under'],far_over:['Well over','over']};
function applyOpsBoard(ops){for(const o of ops){const D=B.days.find(x=>x.day===o.day);if(!D)throw new Error('no day '+o.day);const t=D.tiles;
  if(o.op==='swap'){const k=t.findIndex(x=>x.id===o.from_id);if(k<0)throw new Error('swap: no '+o.from_id);t[k]=T(o.to_id,o.sets)}
  else if(o.op==='sets'){const x=t.find(x=>x.id===o.id);if(!x)throw new Error('sets: no '+o.id);x.sets=o.to}
  else if(o.op==='add')t.push(T(o.id,o.sets));
  else if(o.op==='remove'){const k=t.findIndex(x=>x.id===o.id);if(k<0)throw new Error('remove: no '+o.id);t.splice(k,1)}
  else throw new Error(o.op)}}
function ddBody(){const m=CB.key,dt=RD(),d=checkDays(),lv=B.level,SH=ANL.sheet(dt,d,lv,null),P=window.MUSCLEDIVE.muscle(dt,d,lv,m,{sheet:SH}),{A}=stats();CFIX=[];
  const s=P.sets,[stl,stk]=DDST[s.status]||[s.status,''],top=Math.max(s.red_over_above,s.effective,1)*1.04,X0=v=>Math.max(0,Math.min(100,v/top*100)),sec=(id,lab,inner,o={})=>`<div class="ddsec" id="deepdive-${m}-${id}" data-dd="${id}"><div class="ash"><span>${lab}</span>${o.mod?'<span class="evl" data-ev="modeled">Modeled</span>':''}<span class="ashv num">${o.v||''}</span></div>${inner}</div>`;
  const kv=(k,v)=>`<div class="ddkv"><span>${k}</span><span class="num">${v}</span></div>`;
  const RAMP=e=>RAMPL(e);
  const rows=[];P.contributors.forEach(c=>c.days.forEach(x=>{const D=B.days.find(y=>y.day===x.day),t=D&&D.tiles.find(y=>y.id===c.id);if(t)rows.push({t,di:DAYS.indexOf(x.day),sets:x.sets,eff:x.effective_sets,share:c.share,name:c.name})}));
  const ap=P.suggestions.apply,ra=P.suggestions.ranked_adds,pk=ra.items[0];
  const sgs=ap.map(a=>{if(!a.fix)return `<div class="sgr" data-src="${a.source}"><div class="sgp">${(R0=>R0[a.type]||a.type)(Object.fromEntries((dt.rules.suggestions.analysis_sheet.types||[]).map(t=>[t.id,t.label])))}: no one-tap change passes the checks.</div></div>`;
    CFIX.push({preview:a.fix.preview,ops:a.fix.ops});return `<div class="sgr hasfix" data-src="${a.source}"><div class="sgp">${a.fix.preview}${a.fix.resolves?'':` <em>${dt.rules.partial_label}</em>`}</div><button class="btn xs accent" data-b="ddapply" data-k="${CFIX.length-1}">Apply</button></div>`}).join('');
  const FN=dt.FN&&window.FREQNOTES?FREQNOTES.notes(dt,d,lv,dt.FN.templates).filter(n=>(n.muscles||[]).includes(m)):[];
  return `<div class="cbh dd" data-st="${stk}"><div class="big num">${+(+s.effective).toFixed(1)}</div><div class="sub">effective sets a week · target ${s.level_min}–${s.max} · <b class="vst ${stk==='in'?'':stk==='over'||stk==='under'?'red':'amb'}">${stl}</b></div></div>
   ${CB.last?`<div class="aplc cbu"><div class="grow"><p>${CB.last}</p></div><button class="btn sm ink" data-b="cbundo">Undo</button></div>`:''}
   ${sec('sets','Sets vs target',`<div class="hbar ddsets"><span class="vm hbs">This week</span><span class="hbt"><s class="bnd" style="left:${X0(s.level_min)}%;width:${X0(s.max)-X0(s.level_min)}%"></s><i class="${stk==='in'?'ok':stk==='over'||stk==='under'?'bad':'amb'}" style="--w:${X0(s.effective)}%"></i></span><span class="vn num">${bfmt(s.effective,s.level_min,s.max)}</span></div>${kv('Ideal band',`${s.level_min}–${s.max} sets`)}${kv('Far under / far over',`below ${s.red_under_below} · above ${s.red_over_above}`)}${kv('Target evidence',s.evidence_tag)}`)}
   ${sec('curve','Stimulus curve',A.muscles[m]?`<div class="curvec">${curve(m,A)}</div>${kv('Position',({below:'Below the ideal band',in_band:'In the ideal band',above:'Above the ideal band'})[P.curve.position])}${kv('Next set',`+${(P.curve.next_set*100).toFixed(1)}%`)}`:'',{mod:1,v:`${Math.round(P.curve.stimulus*100)}% of max`})}
   ${sec('frequency','Frequency',`<div class="ddfq">${Object.entries(P.frequency.effective_by_day).map(([k,v])=>`<span><i data-r="${RAMP(v)}"></i>${WD[DAYS.indexOf(k)]} ${nfmt(v)}</span>`).join('')}</div>${FN.map(n=>`<div class="nrow" data-note="${n.id}" data-pol="${n.polarity}">${n.polarity==='positive'?ICO.pass:ICO.close}<span>${n.text}</span></div>`).join('')}`,{v:`${P.frequency.days_hit} day${P.frequency.days_hit===1?'':'s'} with ${P.frequency.min_effective_per_day}+ sets`})}
   ${sec('stretch','Stretch',P.stretch.share==null?'<p class="foot">No stretch list for this muscle, or no sets.</p>':`<div class="hbar"><span class="vm hbs">Share${P.stretch.checked?(P.stretch.check_pass?ICO.pass:ICO.attention):''}</span><span class="hbt"><i class="${P.stretch.share<dt.targets.analytics.stretch_share_flag_below?'amb':'ok'}" style="--w:${P.stretch.share*100}%"></i><b style="--x:${dt.targets.analytics.stretch_share_flag_below*100}%"></b></span><span class="vn num">${pct(P.stretch.share)}</span></div>${P.stretch.checked?kv('Stretch check',P.stretch.check_pass?'Passes':'Needs stretch-focused work'):''}`)}
   ${sec('fatigue','Recovery and fatigue',`${kv('Recovery cost',P.recovery_cost!=null?`${P.recovery_cost} pts`:'–')}${kv('Stimulus per fatigue',P.stimulus_per_fatigue!=null?(+P.stimulus_per_fatigue).toFixed(2):'–')}${kv('Fatigue per effective set',P.fatigue!=null?(+P.fatigue).toFixed(2):'–')}${kv('One-side share',P.one_side_share!=null?pct(P.one_side_share):'–')}`,{mod:1})}
   ${sec('session','Contributing exercises',rows.length?`<div class="group cbl">${rows.map(r=>`<div class="row cbr" data-u="${r.t.u}" data-id="${r.t.id}">${X.gl(r.t.id)}<div class="grow"><div class="t1">${X.exNameP(r.t.id)}${X.cxL(r.t.id)}</div><div class="t2 num">${WD[r.di]} · ${r.sets} sets → ${nfmt(r.eff)} effective</div></div><button class="btn sm grey" data-b="cbrm" data-u="${r.t.u}">Remove</button></div>`).join('')}</div>`:'<p class="foot">Nothing on the board trains this yet.</p>',{v:rows.length?`${P.contributors.length} exercise${P.contributors.length===1?'':'s'}`:''})}
   ${sec('suggest','Suggestions',`${sgs||'<p class="foot">No suggestions for this muscle.</p>'}${pk?`<div class="pad0"><button class="btn accent block cbadd" data-b="cbadd" data-id="${pk.id}" data-day="${ra.day}"><span>${X.I('plus',2)} Add suggested</span><small>${X.exNameP(pk.id)} · ${WD[DAYS.indexOf(ra.day)]}</small></button></div><p class="foot">Top pick of the shared ranker for ${MLB(m).toLowerCase()} on ${WDL[DAYS.indexOf(ra.day)]}${ra.items.length>1?`; then ${ra.items.slice(1,3).map(x=>X.exNameP(x.id)).join(', ')}`:''}; ${setsFor(pk.id)} sets.</p>`:''}`)}
   <p class="foot">Effective sets = sets × the exercise's counted credit for this muscle (the Volume model). Curve, recovery and fatigue values are models, not measurements.</p>`}
function cbRows(kind,key){const dt=RD(),out=[];B.days.forEach((D,di)=>D.tiles.forEach(t=>{let e=0;
    if(kind==='mus'){const b=ANL.breakdowns(dt,[{day:D.day,tiles:[{id:t.id,sets:t.sets}]}]).muscle[key];e=b?b.effective_sets:0}else e=(dt.EX[t.id].movement_pattern||'other')===key?t.sets:0;
    if(e>0)out.push({t,day:D.day,di,eff:e})}));return out}
function cbPick(kind,key){const dt=RD(),F={mus:kind==='mus'?key:null,pat:kind==='pat'?key:null,eq:null},train=B.days.filter(D=>D.tiles.length);if(!train.length)return null;
  const per=D=>cbRows(kind,key).filter(r=>r.day===D.day).reduce((a,r)=>a+r.eff,0),tot=D=>D.tiles.reduce((a,t)=>a+t.sets,0);
  const day=train.slice().sort((a,b)=>per(a)-per(b)||tot(a)-tot(b)||DAYS.indexOf(a.day)-DAYS.indexOf(b.day))[0].day;
  const on=new Set(B.days.find(D=>D.day===day).tiles.map(t=>t.id)),ids=Object.keys(dt.EX).filter(i=>X.passF(F,i)&&!on.has(i));
  const r=RANK.rank(dt,'tray',ids,{board:rankBoard(),day},X.prefs(),1)[0];return r?{id:r.id,day,r}:null}
function cbBody(){if(!CB)return '';if(CB.kind==='mus'&&window.MUSCLEDIVE)return ddBody();const {kind,key}=CB,dt=RD(),rows=cbRows(kind,key),{A}=stats(),MPL=(dt.rules.movement_patterns||{}).labels||{},pk=cbPick(kind,key);
  const v=kind==='mus'?A.muscles[key]:null,tot=rows.reduce((a,r)=>a+r.eff,0);
  return `<div class="cbh">${kind==='mus'?`<div class="big num">${+(v?v.raw:tot).toFixed(1)}</div><div class="sub">effective sets a week${v&&v.max?` · target ${v.min}–${v.max}`:''}</div>`:`<div class="big num">${tot}</div><div class="sub">sets a week · ${rows.length} exercise${rows.length===1?'':'s'}</div>`}</div>
   ${CB.last?`<div class="aplc cbu"><div class="grow"><p>${CB.last}</p></div><button class="btn sm ink" data-b="cbundo">Undo</button></div>`:''}
   <div class="ghead">${rows.length?'Contributing exercises':'Nothing on the board trains this yet'}</div>
   ${rows.length?`<div class="group cbl">${rows.map(r=>`<div class="row cbr" data-u="${r.t.u}" data-id="${r.t.id}">${X.gl(r.t.id)}<div class="grow"><div class="t1">${X.exNameP(r.t.id)}${X.cxL(r.t.id)}</div><div class="t2 num">${WD[r.di]} · ${r.t.sets} sets${kind==='mus'?` → ${+(+r.eff).toFixed(2)} effective`:''}</div></div><button class="btn sm grey" data-b="cbrm" data-u="${r.t.u}">Remove</button></div>`).join('')}</div>`:''}
   ${pk?`<div class="pad"><button class="btn accent block cbadd" data-b="cbadd" data-id="${pk.id}" data-day="${pk.day}"><span>${X.I('plus',2)} Add suggested</span><small>${X.exNameP(pk.id)} · ${WD[DAYS.indexOf(pk.day)]}</small></button></div><p class="foot">Top pick of the shared ranker for ${kind==='mus'?MLB(key).toLowerCase():(MPL[key]||key).toLowerCase()} on ${WDL[DAYS.indexOf(pk.day)]}, the training day with the least of it now; ${setsFor(pk.id)} sets.</p>`:''}
   <p class="foot">${kind==='mus'?"Effective sets = sets × the exercise's counted credit for this muscle (the Volume model).":'Sets of exercises whose movement pattern is this one.'}</p>`}
function contribSheet(kind,key,anchor){const MPL=(RD().rules.movement_patterns||{}).labels||{};if(CB)CB.close();
  CB=X.sheet({title:kind==='mus'?MLB(key):(MPL[key]||key),cls:kind==='mus'?'tall grouped cbsheet ddsheet':'grouped cbsheet',right:'<button class="btn plain" data-b="cbclose">Done</button>',onClose(){CB=null}});CB.kind=kind;CB.key=key;CB.last=null;
  CB.body.innerHTML=cbBody();CB.el.dataset.kind=kind;CB.el.dataset.key=key;
  if(anchor){const el=CB.body.querySelector(`#deepdive-${key}-${anchor}`),S=CB,go=()=>{if(S.closed)return;S.body.scrollTop=Math.max(0,el.getBoundingClientRect().top-S.body.getBoundingClientRect().top+S.body.scrollTop-8)};if(el){requestAnimationFrame(go);setTimeout(go,360)}}return CB}
const cbRe=()=>{if(CB&&!CB.closed){const sc=CB.body.scrollTop;CB.body.innerHTML=cbBody();CB.body.scrollTop=sc}};
function analysisSheet(){SUGX.clear();AN=X.sheet({title:'Analysis',cls:'tall grouped ansheet',right:'<button class="btn plain" data-b="anclose">Done</button>',onClose(){AN=null}});AN.mus='chest';renderAnalysis();return AN}
// ------------------------------------------------------------- Program check card (Round 3), under the week view
// The issues come from logic/checkpriority.js top() (port of Coach's check_priority.py, diffed at 0 against
// data/check-priority-reference.json): red first, then amber, score within a state, info never shown, cap 3. Apply runs the
// issue's fix.ops on the board; Undo runs fix.undo (inverse ops: swap / sets / add / remove; a move = remove + add). An issue
// without a validated fix (action see_analysis) links to its Analysis item instead. A board with no issue still shows the card.
let PCI=[],PCAP=null;
// r3fu: issue.analysis_item is always a real analysis item id and issue.analysis_item_muscle the row to highlight (null = board-level);
// the card uses both as-is (the old stretch_<muscle> -> stretch_share fallback is gone).
// Round 3 quick fixes: plain card sentences built here from the issue's structured fields (family, source, target, flag,
// muscle, days, exercises) and the fix ops, so no Coach string is shown verbatim on the card. Values next to a target
// range use bfmt / bpct (one decimal when whole-number rounding would make an out-of-range value look in range).
const SNM=id=>X.exNameP(id); // full name: short names like "BB Bench Press" / "DB Bench Press" read as codes, and a bare "Bench press" would be ambiguous
const EXN=id=>X.exNameP(id);
function pcSentence(it){const dt=RD(),t=it.target||{},m=it.muscle,A=stats().A,f=t.flag,r=f?ruleOf(f):it.source,lv=B.level,RU=id=>dt.rules.rules.find(x=>x.id===id)||{};
  const M=x=>mlk(x||m,'sets'),D=d=>dayN(d),N=x=>`<span class="num">${x}</span>`;
  const wk=(mm,sets)=>{const v=A.muscles[mm]||{},raw=v.raw!=null?v.raw:sets;return `${mlk(mm,'sets')}: ${N(`${bfmt(raw,v.min,v.max)} of ${v.min}–${v.max}`)} sets a week`};
  if(r==='weekly_band'||r==='weekly_volume')return wk(m||f[2],'sets' in t?t.sets:f&&f[3]);
  if(r==='stretch_share'){const fb=dt.targets.analytics.stretch_share_flag_below;return `${mlk(m,'stretch')}: ${N(bpct(t.share,fb,1))} of its sets are stretch-focused (aim ${pct(fb)} or more)`}
  if(r==='missing_stretch')return `${mlk(m||f[2],'stretch')}: no stretch-focused exercise this week`;
  if(r==='effective_frequency')return `${mlk(m,'frequency')}: ${dt.targets.analytics.frequency_min_effective}+ sets on only ${N(t.days)} day${t.days===1?'':'s'} a week (aim 2)`;
  if(r==='recovery_vs_baseline')return `Recovery cost: ${N(t.pct+'%')} of your normal week`;
  if(!f)return m?M():(DLAB(it.analysis_item)||it.family);
  const x=RU(r);
  switch(f[1]){
    case 'sets_per_exercise':{const dd=B.days.find(d=>d.day===f[2]),tl=dd&&dd.tiles.find(q=>q.id===f[3]);return `${SNM(f[3])}: ${N((tl?tl.sets:'')+' sets')} in one session (${D(f[2])})`}
    case 'push_pull_imbalance':{const q=+f[2];if(q===0)return 'No pulling this week';if(q===99)return 'No pushing this week';
      return `${q<x.min_ratio?'Pulling is low':'Pushing is low'}: ${N(q)} pull sets per push set (aim ${x.min_ratio}–${x.max_ratio})`}
    case 'pattern_gap':{const S=(dt.patterns.slots||{})[f[2]]||{name:f[2]};return `${S.name}: ${N(f[3])} exercise${f[3]===1?'':'s'} this week (aim ${f[4]||1} or more)`}
    case 'redundant_pattern':return `${mlk(f[5]||m,'session')}: ${N(nfmt(f[6])+' sets')} from ${String(f[3]).replace(/_/g,' ')} exercises in one session (${D(f[2])})`;
    case 'junk_volume_session':return `${mlk(f[3]||m,'session')}: ${N(nfmt(f[4])+' sets')} in one session (${D(f[2])})`;
    case 'consecutive_high_volume':{const d2=DAYS[(DAYS.indexOf(f[2])+1)%7];return `${mlk(f[3]||m,'frequency')}: hard sessions on back-to-back days (${D(f[2])}, ${D(d2)})`}
    case 'low_frequency':return f[3]===0?`${mlk(f[2],'frequency')}: only indirect work this week`:`${mlk(f[2],'frequency')}: trained on only ${N(f[3])} day a week (aim 2)`;
    case 'session_hard_sets':return `${D(f[2])}: ${N(f[3]+' hard sets')} in one session (limit ${x.warn_above[lv]})`;
    case 'session_length':return `${D(f[2])}: about ${N(f[3]+' minutes')} (aim under ${x.warn_min})`;
    case 'spinal_load_session':return `${D(f[2])}: ${N(f[3])} heavy squat and deadlift sets (limit ${RU('spinal_load').session_warn_above[lv]})`;
    case 'spinal_load_week':return `This week: ${N(f[2])} heavy squat and deadlift sets (limit ${RU('spinal_load').week_warn_above[lv]})`;
    case 'many_small_entries':return `${D(f[2])}: ${N(f[3])} exercises with under 2 sets each`;
    case 'hinge_before_squat':{const d2=DAYS[(DAYS.indexOf(f[2])+1)%7];return `Heavy deadlifts on ${D(f[2])}, then heavy squats on ${D(d2)}`}
    case 'beginner_squat_and_deadlift':return `${D(f[2])}: heavy squats and deadlifts on the same day`;
    case 'recovery_vs_baseline':return `Recovery cost: ${N(f[2]+'%')} of your normal week`}
  return m?M():RLAB(r)}
// the fix as a short plain line, from its ops (swap / sets / add / remove; remove + add of one exercise = a move)
function pcFixText(it){const ops=(it.fix||{}).ops||[],sub=(it.target||{}).flag&&it.target.flag[1]==='sets_per_exercise'?it.target.flag[3]:null,D=dayN,out=[];
  for(let k=0;k<ops.length;k++){const o=ops[k],nx=ops[k+1];
    if(o.op==='remove'&&nx&&nx.op==='add'&&nx.id===o.id){out.push(`Move ${EXN(o.id)} from ${D(o.day)} to ${D(nx.day)}`);k++;continue}
    if(o.op==='sets'){if(o.id===sub&&ops.length===1)out.push(o.to<o.from?`Cut to ${o.to}`:`Raise to ${o.to}`);
      else{const n=o.to-o.from;out.push(n>0?`Add ${n} set${n===1?'':'s'} to ${EXN(o.id)} (${D(o.day)}, ${o.from} → ${o.to})`:`Cut ${EXN(o.id)} to ${o.to} sets (${D(o.day)})`)}}
    else if(o.op==='swap')out.push(`Swap ${EXN(o.from_id)} for ${EXN(o.to_id)} (${D(o.day)})`);
    else if(o.op==='add')out.push(`Add ${EXN(o.id)}, ${o.sets} set${o.sets===1?'':'s'} (${D(o.day)})`);
    else if(o.op==='remove')out.push(`Remove ${EXN(o.id)} (${D(o.day)})`)}
  return out.join('; ')}
function pcheckHtml(){const dt=RD();if(!dt||!window.CHECKPRIORITY||!dt.rules.check_priority)return '';PCI=[];
  const foot=`<div class="pcfoot"><button class="btn plain" data-b="analysis">See full analysis ›</button></div>`;
  const head=n=>`<div class="pch"><b>Program check</b><span class="sub">${n}</span></div>`;
  if(openSlots())return head('Fill slots to check')+foot;
  const L=CHECKPRIORITY.top(dt,checkDays(),B.level);PCI=L;const fxT=it=>pcFixText(it)||it.fix.preview;
  const ap=PCAP&&PCAP.asig===sigD()?`<div class="pcap"><p><b>Applied</b> · ${PCAP.text||PCAP.preview}</p><button class="btn xs ink" data-b="pcundo">Undo</button></div>`:'';
  if(!L.length)return head('')+ap+`<div class="pcr none" data-state="none">${ICO.pass}<div class="sgt">No pressing issues</div></div>`+foot;
  return head(`${L.length} most pressing`)+ap+L.map((it,i)=>{const w=pcSentence(it);
    return `<div class="pcr" data-id="${it.id}" data-state="${it.state}" data-action="${it.action}" data-score="${it.score}"><span class="cki dot ${it.state==='red'?'bad':'amb'}" role="img" aria-label="${it.state==='red'?'Needs attention':'Close to target'}"></span><div class="sgt">${w}</div>
      ${it.fix?`<button class="btn xs accent" data-b="pcapply" data-k="${i}">Apply</button><div class="sgp">${fxT(it)}${it.fix.resolves?'':` <em>${dt.rules.partial_label}</em>`}</div><button class="pcin" data-b="pcin"${pcAt(it)}>In analysis ›</button>`:`<button class="btn xs grey" data-b="pcsee"${pcAt(it)}>See analysis</button><div class="sgp">No one-tap fix passes the checks.</div>`}</div>`}).join('')+foot}
const pcAt=it=>` data-item="${it.analysis_item||''}"${it.analysis_item_muscle?` data-m="${it.analysis_item_muscle}"`:''}`;
function paintPcheck(){const el=$('#pcheck');if(el)el.innerHTML=pcheckHtml()}
// open the Analysis sheet at one item (its section expanded)
// (r3fu) with a muscle, its row inside that item (or, failing that, inside the item's section) is highlighted and scrolled to
function analysisAt(item,m=null){const S=analysisSheet();const el=item&&S.body.querySelector(`[data-metric="${item}"],[data-check-item="${item}"]`);if(!el)return S;
  const sc=el.closest('.asec');if(sc&&sc.dataset.open==='0'){sc.dataset.open='1';setAnOpen(sc.dataset.cat,1)}
  const row=m?(el.querySelector(`[data-m="${m}"]`)||(sc&&sc.querySelector(`[data-m="${m}"]`))):null;if(row){row.classList.add('anhl');row.dataset.hl=item}
  requestAnimationFrame(()=>{const tg=row||el,top=tg.getBoundingClientRect().top-S.body.getBoundingClientRect().top+S.body.scrollTop-(row?140:56);S.body.scrollTop=Math.max(0,top);el.classList.add('flash')});return S}
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
   <p class="foot">Each slot lists Coach's eligible exercises. The defaults reproduce the ${t.split_name} ${t.level} ${t.days_per_week}-day prebuilt routine exactly (0 non-info warnings). Amber = within 2 sets under the level minimum or up to 25% over the max.</p>
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
     <p class="foot">Exercises and slots come from Coach's prebuilt splits. You can move anything after.</p>
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
  const tm=e.target.closest('[data-tm]');if(tm&&TRAY){if(tm.disabled)return;TFB.mode=tm.dataset.tm;refreshTray();return}
  const tr=e.target.closest('.trow[data-id]');if(tr&&TRAY&&!e.target.closest('button')){e.stopPropagation();return X.exDetail(tr.dataset.id,{addLabel:TFB.slot?'Fill slot':`Add to ${WD[DAYS.indexOf(TFB.day)]}`,onAdd:trayAdd})}
  const tf=e.target.closest('[data-tf]');if(tf&&TRAY){const k=tf.dataset.tf;TFB[k]=TFB[k]===tf.dataset.v?null:tf.dataset.v;$$(`[data-tf=${k}]`,TRAY.el).forEach(c=>c.classList.toggle('on',TFB[k]===c.dataset.v));refreshTray();return}
  const am=e.target.closest('[data-anm]');if(am&&AN){AN.mus=am.dataset.anm;const sc=AN.body.scrollTop;renderAnalysis();AN.body.scrollTop=sc;return}
  const ns=e.target.closest('[data-ns]');if(ns&&NW){NS[ns.dataset.ns]=ns.dataset.v;nwView(NW.v==='slots'?'slots':'tpl');return}
  const j=e.target.closest('[data-jump]');if(j){setMap('day',+j.dataset.jump);return jump(+j.dataset.jump)}
  const amp=e.target.closest('.anmap .mp');if(amp&&amp.dataset.mu&&AN){e.preventDefault();return contribSheet('mus',amp.dataset.mu)}
  const mp=e.target.closest('#bmap .mp');if(mp&&mp.dataset.mu){e.preventDefault();return X.go('#learn-'+mp.dataset.mu)}
  if(!b)return;const k=b.dataset.b;e.stopPropagation();
  if(k==='mapm')return setMap(b.dataset.mm,b.dataset.mm==='day'&&MAPV.mode!=='day'?Math.max(0,$$('#dstrip button').findIndex(x=>x.classList.contains('on'))):null);
  if(k==='newex'){const day=TFB.day;X.newExSheet({q:b.dataset.q,onSave:id=>{commit(()=>{const D=B.days.find(d=>d.day===day);D.tiles.push(T(id,setsFor(id)))},`Added ${X.exNameP(id)} to ${WD[DAYS.indexOf(day)]}`);refreshTray()}});return}
  if(k==='tclr'){TFB.q='';const q=TRAY&&$('#tqb',TRAY.el);if(q){q.value='';q.focus()}refreshTray();return}
  if(k==='treset'){Object.assign(TFB,{q:'',mus:null,pat:null,eq:null});if(TRAY)$('#tqb',TRAY.el).value='';if(TRAY)$('#tfbb',TRAY.el).innerHTML=X.filterHtml(TFB,'tf');refreshTray();return}
  if(k==='dayh'){setMap('day',DAYS.indexOf(b.dataset.day));return daySheet(b.dataset.day)}if(k==='dsclose')return DS&&DS.close();if(k==='dsrename'||k==='dsrest'||k==='dstrain')return dayAct(k);
  if(k==='tabs')return tabsSheet();if(k==='tabgo'){X.closeAll();return X.go('#'+b.dataset.to)}
  if(k==='analysis')return analysisSheet();if(k==='sugmore'){SUGX.add(b.dataset.sec);renderAnalysis();return}if(k==='anx')return explainItem(b.dataset.id);
  if(k==='mus'||k==='pat')return contribSheet(k,b.dataset[k==='mus'?'m':'p'],b.dataset.anchor);
  if(k==='asec'){const s=b.closest('.asec');const o=s.dataset.open!=='1';s.dataset.open=o?'1':'0';b.setAttribute('aria-expanded',String(o));setAnOpen(s.dataset.cat,o);return}
  if(k==='pcsee'||k==='pcin')return analysisAt(b.dataset.item,b.dataset.m||null);
  if(k==='pcapply'){const it=PCI[+b.dataset.k];if(!it||!it.fix)return;const before=snap();const tx=pcFixText(it)||it.fix.preview;commit(()=>applyOpsBoard(it.fix.ops),`Applied: ${tx}`);PCAP={id:it.id,preview:it.fix.preview,text:tx,undo:it.fix.undo,before,asig:sigD()};paintPcheck();return}
  if(k==='pcundo'){if(!PCAP)return;const P0=PCAP;PCAP=null;B.hist.push(snap());if(P0.asig===sigD()){try{applyOpsBoard(P0.undo)}catch(x){restore(P0.before)}}else restore(P0.before);paint();hideUndo();X.toast('Suggestion undone');return}
  if(k==='ddapply'){const z=CFIX[+b.dataset.k];if(!z)return;commit(()=>applyOpsBoard(z.ops),`Applied: ${z.preview}`);if(CB){CB.last=`Applied: ${z.preview}`;cbRe()}return}if(k==='cbclose')return CB&&CB.close();
  if(k==='cbrm'){const f=findT(b.dataset.u);if(!f)return;const nm=X.exNameP(f.t.id),dn=WD[DAYS.indexOf(f.d.day)];commit(()=>removeU([b.dataset.u]),`Removed ${nm}`);if(CB){CB.last=`Removed ${nm} from ${dn}.`;cbRe()}return}
  if(k==='cbadd'){const id=b.dataset.id,day=b.dataset.day,dn=WD[DAYS.indexOf(day)];commit(()=>{B.days.find(D=>D.day===day).tiles.push(T(id,setsFor(id)))},`Added ${X.exNameP(id)} to ${dn}`);if(CB){CB.last=`Added ${X.exNameP(id)} to ${dn} (${setsFor(id)} sets).`;cbRe()}return}
  if(k==='ambadd'){const id=b.dataset.id,day=b.dataset.day,m=b.dataset.m;commit(()=>{B.days.find(D=>D.day===day).tiles.push(T(id,setsFor(id)))},`Added ${X.exNameP(id)} to ${WD[DAYS.indexOf(day)]}`);
    AMBU={text:`Added ${X.exNameP(id)} to ${WDL[DAYS.indexOf(day)]} (${setsFor(id)} sets) for ${MLB(m).toLowerCase()}.`,sig:sigD(),m};if(AN&&!AN.closed)renderAnalysis();return}
  if(k==='ambundo'){undo();AMBU=null;hideUndo();if(AN&&!AN.closed)renderAnalysis();return}
  if(k==='cbundo'){undo();if(CB){CB.last=null;cbRe()}return}if(k==='anclose')return AN&&AN.close();
  if(k==='apply'){const z=FIX[+b.dataset.k];if(!z)return;const before=snap(),bsig=sigD();commit(()=>applyDays(z.days),`Applied: ${z.preview}`);APPLIED.unshift({preview:z.preview,before,bsig,asig:sigD(),section:z.section});if(AN&&!AN.closed){renderAnalysis();const el=AN.body.querySelector(`.acat[data-cat="${z.section}"] .aplc`);if(el)el.scrollIntoView({block:'center'})}return}
  if(k==='unapply'){const a=APPLIED[+b.dataset.k];if(!a)return;B.hist.push(snap());restore(a.before);APPLIED.splice(+b.dataset.k,1);paint();hideUndo();X.toast('Suggestion undone');return}
  if(k==='undo')return undo();
  if(k==='add'){if(TRAY){TFB.day=b.dataset.day;refreshTray();return}return traySheet(b.dataset.day)}
  if(k==='bmode'){BD.detail=b.dataset.v==='detail';try{localStorage.setItem('apechit.sb.boardDetail',BD.detail?'1':'0')}catch(x){}return paint()}
  if(k==='slot')return slotTray(b.dataset.day,b.dataset.sid);
  if(k==='slotfill')return fillDefaults();
  if(k==='tadd')return trayAdd(b.dataset.id);
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
 'build-tray':['build','build',0,0,()=>{Object.assign(TFB,{mus:null,pat:null,eq:null,mode:'sug'})},()=>traySheet('wed')],
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
 'build-analysis-balance':['build','build',0,0,()=>{},()=>{analysisSheet();setTimeout(()=>{const e=AN&&AN.body.querySelector('.acat[data-cat=balance]');if(e)AN.body.scrollTop=e.offsetTop-8},120)}],
 'build-analysis-fatigue':['build','build',0,0,()=>{},()=>{analysisSheet();setTimeout(()=>explainItem('fatigue_rating'),80)}],
 'build-analysis-explain':['build','build',0,0,()=>{},()=>{analysisSheet();setTimeout(()=>explainItem('stretch_hamstrings'),80)}],
 'build-analysis-muscle':['build','build',0,0,()=>{},()=>{analysisSheet();setTimeout(()=>contribSheet('mus','side_delts'),80)}],
 'build-deepdive':['build','build',0,0,()=>{},()=>{analysisSheet();setTimeout(()=>contribSheet('mus','calves'),80)}],
 'build-deepdive-freq':['build','build',0,0,()=>{},()=>{analysisSheet();setTimeout(()=>contribSheet('mus','upper_back','frequency'),80)}],
 // the first preset whose Program check has no red / amber issue (16 of the 46 in Coach's fixture)
 'build-pcheck-none':['build','build',0,0,()=>{const dt=RD();for(const s of dt.splits.splits)for(const [lv,dc] of Object.entries(s.levels))for(const [n,dd] of Object.entries(dc)){const days=dd.map(x=>({day:x.day,tiles:x.tiles.map(t=>({id:t.id,sets:t.sets}))}));if(!CHECKPRIORITY.top(dt,days,lv).length){loadDays(dd,`${s.name} · ${n} days`);B.level=lv;B.hist=[];B.pcNone=`${s.id}/${lv}/${n}`;return}}},()=>{const c=$('#pcheck');if(c)c.scrollIntoView({block:'center'})}],
 'build-pcheck':['build','build',0,0,()=>{},()=>{const c=$('#pcheck');if(c)c.scrollIntoView({block:'center'})}],
 'build-analysis-pattern':['build','build',0,0,()=>{},()=>{analysisSheet();setTimeout(()=>contribSheet('pat','vertical_pull'),80)}],
 'build-tray-sort':['build','build',0,0,()=>{Object.assign(TFB,{mus:'side_delts',pat:null,eq:null,mode:'stim'})},()=>traySheet('wed')],
 'build-tray-fatigue':['build','build',0,0,()=>{Object.assign(TFB,{mus:null,pat:null,eq:null,mode:'fat'})},()=>traySheet('wed')],
 'build-tray-detail':['build','build',0,0,()=>{Object.assign(TFB,{mus:null,pat:null,eq:null,mode:'sug'})},()=>{traySheet('wed');setTimeout(()=>X.exDetail('romanian-deadlift',{addLabel:'Add to Wed',onAdd:trayAdd}),60)}],
 'build-tray-detail-nophoto':['build','build',0,0,()=>{Object.assign(TFB,{mus:null,pat:null,eq:null,mode:'sug'})},()=>{traySheet('wed');setTimeout(()=>X.exDetail('cable-fly',{addLabel:'Add to Wed',onAdd:trayAdd}),60)}],
 'build-tray-filter':['build','build',0,0,()=>{Object.assign(TFB,{mus:null,pat:'vertical_pull',eq:null})},()=>traySheet('thu')],
});
window.BOARD={removeExercise:id=>{B.days.forEach(d=>{d.tiles=d.tiles.filter(t=>t.id!==id)});B.hist=B.hist.filter(h=>!h.includes(`"${id}"`));B.sel.clear();if($('#board'))paint();else cxSavePlaced();refreshTray()},
  countExercise:id=>sum(B.days.map(d=>d.tiles.filter(t=>t.id===id).length)),repaint:()=>{if($('#board'))paint();refreshTray()},fmt:{bfmt:(...a)=>bfmt(...a),bpct:(...a)=>bpct(...a)},loadPreset:id=>{const [sp,lv,n]=id.split('/'),s=RD().splits.splits.find(x=>x.id===sp);loadDays(s.levels[lv][n],`${s.name} · ${n} days`);B.level=lv;B.hist=[];PCAP=null;APPLIED=[];X.render()},applyOps:ops=>{applyOpsBoard(ops);paint()},get pcheck(){return PCI},get detail(){return BD.detail},fracLine,muscleShort,get tpl(){return B.tpl},slots:()=>B.days.map(d=>({day:d.day,slots:(d.slots||[]).map(s=>s.sid)})),rankBoard,fillDefaults,ensurePlan:(days,name,level)=>{if(B.days.length)return false;loadDays(days,name);B.level=level||'intermediate';B.hist=[];B.dirty=false;B.version=1;B.edited=Date.now();B.fromLog=true;return true},progApply:ops=>{const before=snap();B.hist.push(before);applyOpsBoard(ops);B.days.forEach(d=>{if(d.tiles.length)d.rest=false});B.dirty=true;B.edited=Date.now();if($('#board'))paint();return before},progUndo:before=>{restore(before);if($('#board'))paint()},loadTemplate:id=>{loadTemplate(TP().find(RD().TJ,id));B.hist=[];paint()},get tray(){return {slot:TFB.slot,only:TFB.only}},get map(){return MAPV},get applied(){return APPLIED},get state(){return B},days:()=>checkDays(),stats:()=>stats(),reset:()=>{initBoard();X.render()},sig:()=>JSON.stringify(B.days.map(d=>d.tiles.map(t=>[t.id,t.sets]))),days7:()=>B.days.map(d=>({day:d.day,label:d.label,rest:isRest(d),n:d.tiles.length})),undo};
})();
