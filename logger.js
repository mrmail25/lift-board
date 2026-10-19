// Lift Board workout logger (v24; v25: Train page, tabs, notes, options sheet, in-place tray), built from data/logging-spec.md v0.3.
// One source of truth (§0.1): uses the board's globals and data (EX, MUS, RULE, tgt, totals, status, state, RU from rules.json,
// heat.js via heatInto, fixes.js swaps/toast, custom.js modal, v14.js split helpers). No colours, bands, level factors,
// rest values or muscle lists live in this file.
(function(){
'use strict';
const LOG_SCHEMA=2;window.LOG_SCHEMA=LOG_SCHEMA;
// Logger-only defaults from the spec that have no data file (§5 hard-set RIR, §6 rep ranges / target RIR / increments, §7 e1RM rep cap).
// pure UI values only; coaching defaults come from rules.json `logger` (LR())
const CFG={restStepSec:15,kpSwipePx:60,lbPerKg:2.20462,swipeMaxPx:120,timerGapPx:12,beepMs:250,longPressMs:550,addSets:3};
const LR=()=>(typeof RU!='undefined'&&RU&&RU.logger)||{};const HR=()=>S.hardRIR??LR().hardRIR;
const SKEY='liftboard.logSettings',AKEY='liftboard.logActive',FKEY='liftboard.logs',TKEY='liftboard.logTimer';
let S={unit:'lb',hardRIR:null,rpe:false,sound:false,restByType:{},restBy:{},repBy:{}};
try{Object.assign(S,JSON.parse(localStorage.getItem(SKEY))||{})}catch{}
const saveS=()=>localStorage.setItem(SKEY,JSON.stringify(S));
// v25 settings migration (kept, not lost): v24 sticky notes -> carried from the last session's workout note; per-exercise load step removed (rules.json default)
function migrateS(){let ch=false;['sticky','incBy'].forEach(k=>{if(k in S){if(S[k]&&Object.keys(S[k]).length){S.v24=S.v24||{};S.v24[k]=S[k]}delete S[k];ch=true}});if(ch)saveS()}migrateS();
const NKEY='liftboard.exNotes';let NOTES={};try{NOTES=JSON.parse(localStorage.getItem(NKEY))||{}}catch{}
const saveN=()=>localStorage.setItem(NKEY,JSON.stringify(NOTES));const exNote=id=>NOTES[resolve(id)]||'';
let L={sessions:[],entries:[],sets:[],prs:[]},ALIAS={},db=null,ready=false,cur=null,activeSet=null,openEntry=null,view='plan';
const H=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let lastT=0;const nowISO=()=>{let t=Date.now();if(t<=lastT)t=lastT+1;lastT=t;return new Date(t).toISOString()};
const tOf=s=>s.endedAt||s.date;const byT=(a,b)=>tOf(a)<tOf(b)?-1:tOf(a)>tOf(b)?1:0;
// ---------- ids: alias map (chains) + archived exercises ----------
function resolve(id){let x=id,n=0;while(ALIAS[x]&&n++<50)x=ALIAS[x];return x}
const isArch=id=>!EX[resolve(id)];
const exName=e=>{const x=EX[resolve(e.exerciseId)];return x?x.name:(e.nameSnapshot||e.exerciseId)};
function migrateNoteIds(){Object.keys(NOTES).forEach(k=>{const r=resolve(k);if(r!==k){if(!NOTES[r])NOTES[r]=NOTES[k];delete NOTES[k];saveN()}})}
function migrateIds(){migrateNoteIds();let ch=false;const f=o=>{['exerciseId','swappedFrom'].forEach(k=>{if(o[k]&&resolve(o[k])!==o[k]){o[k]=resolve(o[k]);ch=true}})};
  L.entries.forEach(f);L.prs.forEach(f);L.sessions.forEach(s=>((s.snapshot||{}).exercises||[]).forEach(f));return ch}
// ---------- schema migrations (ordered); schema 0 = pre-schema shape (no schema/unit/status, entry.exercise, set.weight) ----------
const MIG={1:d=>{(d.entries||[]).forEach(e=>{if(typeof e.notes!='string')e.notes=''});return d},0:d=>{(d.sessions||[]).forEach(s=>{s.status=s.status||'completed';s.unit=s.unit||'lb';s.snapshot=s.snapshot||{exercises:[]};s.notes=s.notes||''});
  (d.entries||[]).forEach(e=>{if(e.exercise&&!e.exerciseId){e.exerciseId=e.exercise;delete e.exercise}e.nameSnapshot=e.nameSnapshot||(EX[e.exerciseId]||{}).name||e.exerciseId;e.notes=e.notes||'';e.skipped=!!e.skipped});
  const em={};(d.entries||[]).forEach(e=>em[e.id]=e);(d.sets||[]).forEach(x=>{if('weight' in x&&!('load' in x)){x.load=x.weight;delete x.weight}x.kind=x.kind||'working';if(!x.sessionId&&em[x.entryId])x.sessionId=em[x.entryId].sessionId;if(!('rir' in x))x.rir=null});
  d.prs=d.prs||[];return d}};
function migrate(d){let v=typeof d.schema=='number'?d.schema:0;while(v<LOG_SCHEMA){d=MIG[v](d);v++}d.schema=LOG_SCHEMA;(d.sessions||[]).forEach(s=>s.schema=LOG_SCHEMA);return d}
// ---------- storage: IndexedDB 'liftboard' + localStorage mirror of the current session ----------
function idbOpen(){return new Promise(res=>{try{if(!window.indexedDB)return res(null);const r=indexedDB.open('liftboard',1);
  r.onupgradeneeded=()=>{const d=r.result,s=d.createObjectStore('sessions',{keyPath:'id'});s.createIndex('date','date');s.createIndex('status','status');
    const e=d.createObjectStore('entries',{keyPath:'id'});e.createIndex('sessionId','sessionId');e.createIndex('exerciseId','exerciseId');
    const t=d.createObjectStore('sets',{keyPath:'id'});t.createIndex('entryId','entryId');t.createIndex('sessionId','sessionId');
    const p=d.createObjectStore('prs',{keyPath:'id'});p.createIndex('exerciseId','exerciseId')};
  r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)}catch{res(null)}})}
const getAll=st=>new Promise(res=>{const q=db.transaction(st).objectStore(st).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>res([])});
function mirror(){if(cur&&cur.status=='active')localStorage.setItem(AKEY,JSON.stringify({s:cur,e:L.entries.filter(x=>x.sessionId==cur.id),t:L.sets.filter(x=>x.sessionId==cur.id)}));else localStorage.removeItem(AKEY);
  if(!db)localStorage.setItem(FKEY,JSON.stringify(L))}
function persist(sid){recomputePrs();mirror();if(!db)return Promise.resolve();return new Promise(res=>{const tx=db.transaction(['sessions','entries','sets','prs'],'readwrite');
  const Ss=tx.objectStore('sessions'),En=tx.objectStore('entries'),St=tx.objectStore('sets'),P=tx.objectStore('prs');const s=L.sessions.find(x=>x.id==sid);if(s)Ss.put(s);else Ss.delete(sid);
  const redo=(store,list)=>{const c=store.index('sessionId').openCursor(IDBKeyRange.only(sid));c.onsuccess=()=>{const k=c.result;if(k){k.delete();k.continue()}else list.forEach(x=>store.put(x))}};
  redo(En,L.entries.filter(e=>e.sessionId==sid));redo(St,L.sets.filter(x=>x.sessionId==sid));P.clear();L.prs.forEach(p=>P.put(p));
  tx.oncomplete=()=>res();tx.onerror=()=>res()})}
function persistAll(){recomputePrs();mirror();if(!db)return Promise.resolve();return new Promise(res=>{const tx=db.transaction(['sessions','entries','sets','prs'],'readwrite');
  [['sessions',L.sessions],['entries',L.entries],['sets',L.sets],['prs',L.prs]].forEach(([n,a])=>{const o=tx.objectStore(n);o.clear();a.forEach(x=>o.put(x))});tx.oncomplete=()=>res();tx.onerror=()=>res()})}
// ---------- units ----------
const conv=(v,from,to)=>v==null||v===''?null:from==to?v:from=='kg'?v*CFG.lbPerKg:v/CFG.lbPerKg;
const fmt=v=>v==null?'':String(Math.round(v*10)/10);
const toLb=(v,u)=>conv(v,u,'lb');
const sessUnit=sid=>(L.sessions.find(s=>s.id==sid)||{}).unit||'lb';
const dLoad=x=>conv(x.load,sessUnit(x.sessionId),S.unit);
// ---------- rules from data ----------
const slRule=()=>((typeof RU!='undefined'&&RU&&RU.rules)||[]).find(r=>r.id=='session_length')||{};
const typeRest=t=>{const r=slRule().rest_min_by_type||{};const m=r[t]!=null?r[t]:r.isolation;return Math.round(m*60)};
const restFor=(exId,kind)=>{const x=EX[resolve(exId)]||{},t=kind=='warmup'?'warmup':x.type;if(kind!='warmup'&&S.restBy[exId]!=null)return S.restBy[exId];if(S.restByType[t]!=null)return S.restByType[t];return typeRest(t)};
const repFor=exId=>S.repBy[exId]||(LR().rep_range_by_type||{})[(EX[resolve(exId)]||{}).type]||(LR().rep_range_by_type||{}).accessory;
const incFor=exId=>(()=>{const t=(LR().load_step||{})[S.unit]||{};return t[(EX[resolve(exId)]||{}).equipment]??t.default??0})();
const tRIR=exId=>(LR().target_rir_by_type||{})[(EX[resolve(exId)]||{}).type]??(LR().target_rir_by_type||{}).accessory;
// e1RM formula chosen by rules.json logger.e1rm_formula; unknown values fall back to Epley with a warning
const E1RM={epley:(w,r)=>w*(1+r/30),brzycki:(w,r)=>w*36/(37-r)};let e1warned=null;
function e1Formula(){const f=LR().e1rm_formula;if(E1RM[f])return{name:f,fn:E1RM[f],warn:null};const warn=`Unknown e1rm_formula '${f}' in rules.json; using Epley`;if(e1warned!==f){e1warned=f;console.warn('[Lift Board] '+warn)}return{name:Object.keys(E1RM)[0],fn:E1RM.epley,warn}}
const e1rm=(load,reps)=>e1Formula().fn(load,reps);
const isHard=x=>x.kind=='working'&&x.done&&Number(x.reps)>0&&(x.rir==null||x.rir<=HR());/* v28 rules.json v8: a hard set needs at least 1 rep */
// ---------- history ----------
function hist(exId,exceptSid){return L.sessions.filter(s=>s.status=='completed'&&s.id!==exceptSid).sort(byT).reverse().map(s=>{const es=L.entries.filter(e=>e.sessionId==s.id&&resolve(e.exerciseId)==exId);if(!es.length)return null;
  const ids=new Set(es.map(e=>e.id));return{s,e:es[0],sets:L.sets.filter(x=>ids.has(x.entryId)&&x.done).sort((a,b)=>a.idx-b.idx)}}).filter(Boolean)}
const work=a=>a.filter(x=>x.kind=='working');
const bestOf=a=>{let b=null;work(a).forEach(x=>{if(x.reps>LR().e1rm_max_reps||!x.reps)return;const v=e1rm(toLb(x.load,sessUnit(x.sessionId))||0,x.reps);if(!b||v>b.v)b={v,x}});return b};
const volOf=a=>work(a).reduce((s,x)=>s+(toLb(x.load,sessUnit(x.sessionId))||0)*(x.reps||0),0);
function progression(exId,sid){const h=hist(exId,sid),last=h[0];if(!last)return{};const w=work(last.sets);if(!w.length)return{};const[lo,hi]=repFor(exId),inc=incFor(exId),u=sessUnit(last.s.id);
  const top=Math.max(...w.map(x=>conv(x.load,u,S.unit)||0));const allTop=w.every(x=>x.reps>=hi&&(x.rir==null?LR().missing_rir_meets_target!==false:x.rir<=tRIR(exId)));
  const missed=w.some(x=>x.reps<lo),prevMissed=h[1]&&work(h[1].sets).some(x=>x.reps<lo);const b=bestOf(last.sets);
  const out={beat:b?`Beat ${fmt(conv(b.x.load,u,S.unit))}×${b.x.reps}`:'',cut:missed&&prevMissed};
  if(allTop){if(inc>0&&top>0&&inc/top<=LR().jump_prefer_reps_above)out.sugLoad=top+inc,out.sugReps=lo;else out.addRep=true}return out}
function carryNote(id){const r=resolve(id),h=hist(r,cur&&cur.id)[0];if(h&&h.e.notes)return h.e.notes;const v=(S.v24||{}).sticky||{};return v[r]||v[id]||''}
function prevFor(exId,kind,pos,sid){const h=hist(exId,sid)[0];if(!h)return null;const a=h.sets.filter(x=>x.kind==kind);return a[pos]||null}
// ---------- split order / Continue ----------
function loaded(){return window.loadedSplit?loadedSplit():null}
function dayTiles(i){const m=loaded();return(state.days[i]&&state.days[i].length)?state.days[i]:(m&&m.days[i])||[]}
function order(){const m=loaded(),d=m?m.days:state.days;return DAYS.map((_,i)=>i).filter(i=>(d[i]||[]).length&&dayTiles(i).length)}
function lastDone(){return L.sessions.filter(s=>s.status=='completed'||s.status=='skipped').sort(byT).pop()}
function continueIdx(){const o=order();if(!o.length)return null;const l=lastDone();if(!l)return o[0];const k=o.indexOf(l.dayIdx);if(k>=0)return o[(k+1)%o.length];
  for(let j=1;j<=7;j++){const d=(l.dayIdx+j)%7;if(o.includes(d))return d}return o[0]}
const dayLabel=i=>DAYS[i]+((state.labels||[])[i]?' · '+state.labels[i]:'');
// ---------- sessions ----------
function newSet(e,kind,idx){return{id:uid('t'),entryId:e.id,sessionId:e.sessionId,idx,kind,load:null,reps:null,rir:null,done:false,doneAt:null}}
function prefill(e){const p=progression(resolve(e.exerciseId),e.sessionId);e.cue=p;const pos={warmup:0,working:0};
  L.sets.filter(x=>x.entryId==e.id).sort((a,b)=>a.idx-b.idx).forEach(x=>{const k=pos[x.kind]++;if(x.done)return;const pv=prevFor(resolve(e.exerciseId),x.kind,k,e.sessionId);
    if(pv){x.load=conv(pv.load,sessUnit(pv.sessionId),cur.unit);x.reps=pv.reps;x.prevLoad=x.load;x.prevReps=x.reps}
    if(x.kind=='working'&&p.sugLoad!=null){x.load=conv(p.sugLoad,S.unit,cur.unit);x.reps=p.sugReps;x.sug=true}})}
function startSession(i){if(cur)return openLogger();const tiles=dayTiles(i);if(!tiles.length)return;const m=loaded();
  const s={id:uid('s'),schema:LOG_SCHEMA,status:'active',date:nowISO(),startedAt:nowISO(),splitId:m?'my:'+m.id:undefined,dayIdx:i,label:dayLabel(i),unit:S.unit,notes:'',snapshot:{exercises:tiles.map(t=>({exerciseId:t.id,sets:t.sets}))}};
  L.sessions.push(s);cur=s;tiles.forEach((t,k)=>{const e={id:uid('e'),sessionId:s.id,order:k,exerciseId:t.id,nameSnapshot:(EX[t.id]||{}).name||t.id,repRange:[...repFor(t.id)],restSec:restFor(t.id,'working'),notes:carryNote(t.id),skipped:false};
    L.entries.push(e);for(let j=0;j<t.sets;j++)L.sets.push(newSet(e,'working',j));prefill(e)});
  const first=L.entries.find(e=>e.sessionId==s.id);openEntry=first&&first.id;activeSet=firstOpenSet(first);persist(s.id);closeModal();openLogger()}
function skipDays(list){const made=list.map(i=>{const m=loaded();const s={id:uid('s'),schema:LOG_SCHEMA,status:'skipped',date:nowISO(),dayIdx:i,splitId:m?'my:'+m.id:undefined,label:dayLabel(i),unit:S.unit,notes:'',snapshot:{exercises:dayTiles(i).map(t=>({exerciseId:t.id,sets:t.sets}))}};L.sessions.push(s);return s});
  Promise.all(made.map(s=>persist(s.id))).then(()=>{refreshBar();toast(`Skipped ${made.map(s=>DAYS[s.dayIdx]).join(', ')}`,()=>{made.forEach(s=>{L.sessions=L.sessions.filter(x=>x.id!==s.id);persist(s.id)});refreshBar();if(document.getElementById('lg-start'))startSheet()})})}
const entriesOf=sid=>L.entries.filter(e=>e.sessionId==sid).sort((a,b)=>a.order-b.order);
const setsOf=eid=>L.sets.filter(x=>x.entryId==eid).sort((a,b)=>a.idx-b.idx);
function firstOpenSet(e){if(!e)return null;const x=setsOf(e.id).find(x=>!x.done);return x?x.id:null}
// ---------- board bottom bar + start sheet ----------
function refreshBar(){const tt=document.getElementById('tab-train');if(tt)tt.classList.toggle('live',!!cur);const b=document.getElementById('lg');if(!b||!b.querySelector('#lg-cont'))return;const c=continueIdx();const bt=b.querySelector('#lg-cont');
  if(cur){bt.textContent='Resume: '+cur.label;bt.disabled=false}else if(c==null){bt.textContent='Continue: add exercises first';bt.disabled=true}else{bt.textContent='Continue: '+dayLabel(c);bt.disabled=false}}
function startSheet(){const c=continueIdx(),o=order();
  modal(`<div id="lg-start"><h3>Start a session</h3>${c==null?'<p class="cf-hint">Put exercises on the board first.</p>':`<button class="pri lg-big" id="lg-go">Continue: ${H(dayLabel(c))}</button>`}
  <div class="lg-days">${o.map(i=>`<div class="lg-day" data-d="${i}"><span>${H(dayLabel(i))}${i===c?' <em>next</em>':''}</span><button data-a="start">Start this day</button><button data-a="skip">Skip ${DAYS[i]}</button></div>`).join('')}</div>
  <div class="cf-btns"><button id="lg-week">Week &amp; history</button><button id="lg-x">Close</button></div></div>`);
  const g=document.getElementById('lg-go');if(g)g.onclick=()=>startSession(c);document.getElementById('lg-x').onclick=closeModal;document.getElementById('lg-week').onclick=()=>weekView();
  document.querySelectorAll('#lg-start .lg-day button').forEach(b=>b.onclick=()=>{const i=+b.closest('.lg-day').dataset.d;
    if(b.dataset.a=='skip'){skipDays([i]);startSheet();return}
    const between=c==null?[]:(()=>{const k=o.indexOf(c),t=o.indexOf(i),r=[];if(k<0||t<0||t==k)return r;for(let j=k;j!=t;j=(j+1)%o.length)r.push(o[j]);return r})();
    if(!between.length)return startSession(i);
    modal(`<h3>Skip the ${between.length} session${between.length>1?'s':''} in between?</h3><p class="cf-hint">${between.map(d=>H(dayLabel(d))).join(', ')}. Skipped sessions are recorded and count as skipped in adherence.</p>
      <div class="cf-btns"><button class="pri" id="lg-sk-no">No, just start ${DAYS[i]}</button><button id="lg-sk-yes">Yes, skip them</button></div>`);
    document.getElementById('lg-sk-no').onclick=()=>startSession(i);document.getElementById('lg-sk-yes').onclick=()=>{skipDays(between);startSession(i)}})}
// ---------- logger screen ----------
// ---------- app shell: Build / Train / Analytics pages (bottom tab bar). Pages are shown/hidden, never rebuilt, so a running
// session, its timer, an open keypad and half-typed notes survive tab switches. ----------
function setView(v){if(!['build','train','log','analytics'].includes(v))v='build';document.body.dataset.view=v;
  document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.v==v)));
  if(v=='train'){const o=document.getElementById('lg');if(cur){if(!o.querySelector('.lg-body:not(#lg-start-pg)'))renderSession()}else if(!o.querySelector('#lg-start-pg'))renderStart()}
  if(v=='analytics'&&window.renderAnalytics)renderAnalytics();if(v=='log'&&window.renderLog)renderLog();/* v28: planning analytics live in Build again; Analytics = completed workouts only */
  if(v=='build'&&typeof render=='function')render();refreshBar()}
function openLogger(){closeModal();setView('train');renderSession()}
function closeLogger(){closeKp();renderStart();refreshBar()}
function renderStart(){const o=document.getElementById('lg');if(!o)return;const ad=adherence();
  o.innerHTML=`<div class="lg-top"><b class="lg-name">Train</b></div><div class="lg-body" id="lg-start-pg"><button class="pri lg-big" id="lg-cont"></button>
  <div class="lg-startbtns"><button id="lg-days">Choose a day…</button><button id="lg-wkb">Week &amp; history</button></div>
  <p class="cf-hint lg-adh0">This week (logged totals): ${ad.completed} completed · ${ad.skipped} skipped · ${ad.notStarted} not started</p></div>`;
  o.querySelector('#lg-cont').onclick=()=>{if(cur)return openLogger();const c=continueIdx();if(c!=null)startSession(c)};o.querySelector('#lg-days').onclick=startSheet;o.querySelector('#lg-wkb').onclick=()=>weekView();refreshBar()}
function cueHtml(e){const c=e.cue||{};const a=[];if(c.sugLoad!=null)a.push(`↑ Try ${fmt(c.sugLoad)}×${c.sugReps}`);else if(c.addRep)a.push('Add a rep this time');if(c.beat)a.push(H(c.beat));if(c.cut)a.push('Missed the range twice: consider −5%');return a.join(' · ')}
function rowHtml(e,x,n){const pv=x.kind=='working'?prevFor(resolve(e.exerciseId),'working',n.w,cur.id):prevFor(resolve(e.exerciseId),'warmup',n.u,cur.id);
  const pvs=pv?`${fmt(dLoad(pv))} × ${pv.reps}${pv.rir!=null?' @'+pv.rir:''}`:'—';const L_=conv(x.load,cur.unit,S.unit);
  const pt=prTypesOf(x.id,LP);const rirTxt=x.rir==null?(S.rpe?'RPE':'RIR'):(S.rpe?'RPE '+(10-x.rir):'@'+(x.rir==5?'5+':x.rir));
  return`<div class="lg-row${x.id==activeSet?' active':''}${x.done?' done':''}${x.kind=='warmup'?' warm':''}" data-s="${x.id}">
   <button class="lg-n" aria-label="Set type">${x.kind=='warmup'?'W':n.w+1}</button><button class="lg-prev" aria-label="Copy previous">${pvs}</button>
   <button class="lg-fld lg-load${x.sug?' sug':''}" data-f="load">${L_==null?'':fmt(L_)}<small>${S.unit}</small></button>
   <button class="lg-fld lg-reps" data-f="reps">${x.reps==null?'':x.reps}<small>reps</small></button>
   <button class="lg-rirb${x.rir==null?'':' on'}">${rirTxt}</button><button class="lg-ck" aria-label="Done">${pt.length?'🏆':'✓'}</button></div>${pt.length?`<div class="lg-prb" data-s="${x.id}" data-t="${pt.join(',')}">${pt.map(k=>`<span data-k="${k}">🏆 ${PRL[k]}</span>`).join('')}</div>`:''}
   ${x.sug&&!x.done?`<div class="lg-sugrow"><button class="lg-sugchip" data-s="${x.id}">↑ suggested · tap for last time</button></div>`:''}
   <div class="lg-rir" data-s="${x.id}" hidden>${[0,1,2,3,4,5].map(r=>`<button data-r="${r}" class="${x.rir===r?'on':''}">${S.rpe?10-r:(r==5?'5+':r)}</button>`).join('')}</div>`}
function cardHtml(e){const x=EX[resolve(e.exerciseId)],sets=setsOf(e.id),done=sets.filter(s=>s.done).length,open=e.id==openEntry,n={w:0,u:0};
  const rows=sets.map(s=>{const h=rowHtml(e,s,n);s.kind=='working'?n.w++:n.u++;return h}).join('');
  return`<div class="lg-card${open?' open':''}${e.skipped?' skipped':''}${x?'':' arch'}" data-e="${e.id}"><div class="lg-ch"><button class="lg-title">${x?ICON[x.type]:'⌧'} ${H(exName(e))}${x?'':' <em>archived exercise</em>'}${e.swappedFrom?' <em>swapped</em>':''}</button>
   <span class="lg-cnt">${done}/${sets.length}</span><button class="lg-more" aria-label="Options">⋯</button></div>
   <div class="lg-meta"><button class="lg-chip lg-rest" aria-label="Rest time, tap to adjust">⏱ ${mmss(e.restSec)}</button><button class="lg-chip lg-rr" aria-label="Rep range, tap to adjust">${e.repRange[0]}–${e.repRange[1]} reps</button></div>
   ${x&&(open||exNote(e.exerciseId))?pnHtml(resolve(e.exerciseId)):''}
   ${open&&!e.skipped?`<div class="lg-cue">${cueHtml(e)}${beatHtml(e)}</div><div class="lg-sets">${rows}</div><button class="lg-addset">+ Set</button>
   <label class="lg-wn">Workout note <small>(this session; carries to next time)</small><textarea data-wn="${e.id}" rows="2" placeholder="How did it go?">${H(e.notes||'')}</textarea></label>`:''}${e.skipped?'<div class="lg-cue">Skipped</div>':''}</div>`}
const mmss=sec=>sec==null?'–':Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
function adjSheet(e){const id=e.exerciseId;const draw=()=>{modal(`<div id="lg-adj"><h3>${H(exName(e))}</h3>
  <div class="lg-adjrow"><span>Rest</span><button data-a="r-" aria-label="Less rest">−${CFG.restStepSec}s</button><b id="adj-r">${mmss(e.restSec)}</b><button data-a="r+" aria-label="More rest">+${CFG.restStepSec}s</button></div>
  <div class="lg-adjrow"><span>Reps from</span><button data-a="l-">−</button><b id="adj-l">${e.repRange[0]}</b><button data-a="l+">+</button></div>
  <div class="lg-adjrow"><span>Reps to</span><button data-a="h-">−</button><b id="adj-h">${e.repRange[1]}</b><button data-a="h+">+</button></div>
  <div class="cf-btns"><button class="pri" id="adj-ok">Done</button></div></div>`);
  document.querySelectorAll('#lg-adj [data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a,d=a[1]=='+'?1:-1;let[lo,hi]=e.repRange;
    if(a[0]=='r'){e.restSec=Math.max(0,(e.restSec||0)+d*CFG.restStepSec);S.restBy[id]=e.restSec}
    if(a[0]=='l')lo=Math.max(1,Math.min(hi,lo+d));if(a[0]=='h')hi=Math.max(lo,hi+d);if(a[0]!='r'){e.repRange=[lo,hi];S.repBy[id]=[lo,hi]}saveS();persist(cur.id);draw()});
  document.getElementById('adj-ok').onclick=()=>{closeModal();renderSession()}};draw()}
function beatHtml(e){const b=beatOf(e);return b?` <b class="lg-beat">${b}</b>`:''}
function beatOf(e){const now=bestOf(setsOf(e.id).filter(x=>x.done));if(!now)return'';const h=hist(resolve(e.exerciseId),cur&&cur.id)[0];if(!h)return'';const prev=bestOf(h.sets);if(!prev)return'▲';
  if(Math.abs(now.v-prev.v)>1e-9)return now.v>prev.v?'▲':'▼';const a=volOf(setsOf(e.id).filter(x=>x.done)),b=volOf(h.sets);return a>b?'▲':a<b?'▼':'='}
function renderSession(){const o=document.getElementById('lg');if(!o||!cur)return;LP=livePrs();const es=entriesOf(cur.id);
  o.innerHTML=`<div class="lg-top"><b class="lg-name">${H(cur.label)}</b><span class="lg-el" id="lg-el"></span><button class="pri" id="lg-fin">Finish</button></div>
  <div class="lg-body">${es.map(cardHtml).join('')}<button class="lg-addex" id="lg-addex">+ Exercise</button><button class="lg-hide" id="lg-hide">Back to Build (session keeps running)</button></div>`;
  bindSession(o);tick();const a=o.querySelector('.lg-row.active');if(a&&!o._noScroll)a.scrollIntoView({block:'center'});clearTimer()}
function bindSession(o){o.querySelector('#lg-fin').onclick=summary;o.querySelector('#lg-addex').onclick=addExercise;o.querySelector('#lg-hide').onclick=()=>setView('build');
  o.querySelectorAll('.lg-card').forEach(c=>{const e=L.entries.find(x=>x.id==c.dataset.e);
    c.querySelector('.lg-ch').onclick=ev=>{if(ev.target.closest('.lg-more')||ev.target.closest('.lg-title')&&e.id==openEntry)return;openEntry=e.id;activeSet=firstOpenSet(e);renderSession()};
    c.querySelector('.lg-title').addEventListener('click',ev=>{if(e.id==openEntry){ev.stopPropagation();history_(resolve(e.exerciseId),e)}});
    c.querySelector('.lg-more').onclick=ev=>{ev.stopPropagation();moreMenu(e)};
    c.querySelectorAll('.lg-chip').forEach(b=>b.onclick=ev=>{ev.stopPropagation();adjSheet(e)});bindPn(c,renderSession);
    const wn=c.querySelector('textarea[data-wn]');if(wn){wn.onclick=ev=>ev.stopPropagation();wn.oninput=()=>{e.notes=wn.value;mirror();clearTimeout(wn._t);wn._t=setTimeout(()=>persist(cur.id),400)}}const ad=c.querySelector('.lg-addset');if(ad)ad.onclick=()=>{const ss=setsOf(e.id),last=ss[ss.length-1],x=newSet(e,'working',(last?last.idx:-1)+1);if(last){x.load=last.load;x.reps=last.reps}L.sets.push(x);activeSet=x.id;persist(cur.id);renderSession()};
    c.querySelectorAll('.lg-row').forEach(r=>bindRow(e,r))});
  o.querySelectorAll('.lg-sugchip').forEach(b=>b.onclick=()=>{const x=L.sets.find(s=>s.id==b.dataset.s);x.load=x.prevLoad??null;x.reps=x.prevReps??x.reps;x.sug=false;persist(cur.id);renderSession()})}
function bindRow(e,r){const x=L.sets.find(s=>s.id==r.dataset.s);let sw=false;
  r.querySelector('.lg-n').onclick=()=>{if(sw)return;x.kind=x.kind=='warmup'?'working':'warmup';renum(e);persist(cur.id);renderSession()};
  r.querySelector('.lg-prev').onclick=()=>{const n=work(setsOf(e.id)).indexOf(x),pv=prevFor(resolve(e.exerciseId),x.kind,n<0?setsOf(e.id).filter(s=>s.kind==x.kind).indexOf(x):n,cur.id);if(pv&&!x.done){x.load=conv(pv.load,sessUnit(pv.sessionId),cur.unit);x.reps=pv.reps;x.sug=false;persist(cur.id);renderSession()}};
  r.querySelectorAll('.lg-fld').forEach(b=>b.onclick=()=>{if(sw)return;activeSet=x.id;openKp(e,x,b.dataset.f)});
  r.querySelector('.lg-rirb').onclick=()=>{const p=document.querySelector(`.lg-rir[data-s="${x.id}"]`);p.hidden=!p.hidden};
  document.querySelectorAll(`.lg-rir[data-s="${x.id}"] button`).forEach(b=>b.onclick=()=>{const v=+b.dataset.r;x.rir=x.rir===v?null:v;persist(cur.id);renderSession()});
  const ck=r.querySelector('.lg-ck');let lp=null;ck.addEventListener('pointerdown',()=>{lp=setTimeout(()=>{lp='fired';editSet(e,x)},CFG.longPressMs)});
  const cl=()=>{if(lp&&lp!=='fired')clearTimeout(lp)};ck.addEventListener('pointerup',cl);ck.addEventListener('pointerleave',cl);
  ck.onclick=()=>{if(lp==='fired'){lp=null;return}if(sw)return;check(e,x)};
  let sx=null,sy=null;r.addEventListener('pointerdown',ev=>{sx=ev.clientX;sy=ev.clientY});r.addEventListener('pointermove',ev=>{if(sx==null)return;const dx=ev.clientX-sx;if(dx<0&&Math.abs(ev.clientY-sy)<30)r.style.transform=`translateX(${Math.max(dx,-CFG.swipeMaxPx)}px)`});
  r.addEventListener('pointerup',ev=>{if(sx==null)return;const dx=ev.clientX-sx;sx=null;r.style.transform='';if(dx<-70&&Math.abs(ev.clientY-sy)<30){sw=true;delSet(e,x)}})}
function renum(e){let w=0,u=0;setsOf(e.id).forEach((s,i)=>{s.idx=i})}
function delSet(e,x){const before=JSON.stringify(L.sets);L.sets=L.sets.filter(s=>s.id!==x.id);renum(e);persist(cur.id);renderSession();toast('Set deleted',()=>{L.sets=JSON.parse(before);persist(cur.id);renderSession()})}
function check(e,x){if(x.done){x.done=false;x.doneAt=null;delete x.pr;persist(cur.id);renderSession();return}if(x.reps==null||x.reps==='' ){activeSet=x.id;openKp(e,x,x.load==null?'load':'reps');return}
  x.done=true;x.doneAt=nowISO();x.sug=false;delete x.pr;{const won=prTypesOf(x.id);if(won.length)celebrate(won)}startTimer(x.kind=='warmup'?restFor(e.exerciseId,'warmup'):e.restSec);
  const nx=setsOf(e.id).find(s=>!s.done);if(nx)activeSet=nx.id;else{const es=entriesOf(cur.id).filter(q=>!q.skipped),k=es.indexOf(e),ne=es.slice(k+1).concat(es.slice(0,k)).find(q=>setsOf(q.id).some(s=>!s.done));if(ne){openEntry=ne.id;activeSet=firstOpenSet(ne)}else activeSet=null}
  persist(cur.id);renderSession()}
// v28: PRs are derived from the logged history by prs.js (port of tools/prs.py) and recomputed after every change; nothing stored is a source of truth.
let LP={};function hx(live){const ss=L.sessions.map(s=>live&&cur&&s.id==cur.id?{...s,status:'completed',endedAt:nowISO()}:s);return{schema:LOG_SCHEMA,plannedSessionsPerWeek:order().length||undefined,sessions:ss,entries:L.entries,sets:L.sets}}
function livePrs(){return cur?(detectPrs(hx(true),ALIAS)[cur.id]||{}):{}}
function prTypesOf(setId,sp){const P=sp||livePrs(),o=[];Object.values(P).forEach(r=>PR_TYPES.forEach(k=>{if(r[k]&&r[k].set_id==setId)o.push(k)}));return o}
function recomputePrs(){const P=detectPrs(hx(false),ALIAS),out=[];Object.keys(P).forEach(sid=>Object.keys(P[sid]).forEach(ex=>PR_TYPES.forEach(k=>{const r=P[sid][ex][k];if(r)out.push({id:sid+'|'+ex+'|'+k,sessionId:sid,exerciseId:ex,kind:k,value:r.value,unit:k=='reps_at_load'?'reps':k=='set_volume'?'kg·reps':'kg',setId:r.set_id,load_kg:r.load_kg,reps:r.reps})})));L.prs=out;return P}
const PRL={weight:'Weight PR',set_volume:'Set-volume PR',e1rm:'Estimated 1RM PR',reps_at_load:'Rep PR'};
const prVal=(k,r)=>k=='reps_at_load'?`${r.reps} reps at ${fmt(conv(r.load_kg,'kg',S.unit))} ${S.unit}`:k=='set_volume'?`${fmt(conv(r.value,'kg',S.unit))} ${S.unit}·reps`:`${fmt(conv(r.value,'kg',S.unit))} ${S.unit}`;
const reduceMotion=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
function celebrate(types){const o=document.getElementById('lg-cel');if(o)o.remove();const c=document.createElement('div');c.id='lg-cel';c.setAttribute('role','status');c.setAttribute('aria-live','polite');
  const rm=reduceMotion();c.dataset.motion=rm?'reduced':'full';c.dataset.types=types.join(',');c.innerHTML=`<span class="cel-t">🏆</span><b>New ${types.map(k=>PRL[k]).join(' · ')}</b>${rm?'':'<i class="cel-burst" aria-hidden="true">'+'<s></s>'.repeat(12)+'</i>'}`;
  document.body.appendChild(c);setTimeout(()=>c.remove(),rm?2200:1800)}
function editSet(e,x){modal(`<h3>Edit set</h3><div class="lg-ed"><label>Type <select id="ed-k"><option value="working" ${x.kind=='working'?'selected':''}>Working</option><option value="warmup" ${x.kind=='warmup'?'selected':''}>Warm-up</option></select></label>
  <label>Load (${S.unit}) <input id="ed-l" inputmode="decimal" value="${fmt(conv(x.load,cur.unit,S.unit))}"></label><label>Reps <input id="ed-r" inputmode="numeric" value="${x.reps??''}"></label>
  <label>${S.rpe?'RPE':'RIR'} (optional) <input id="ed-i" inputmode="decimal" value="${x.rir==null?'':S.rpe?10-x.rir:x.rir}"></label><label>Note <input id="ed-n" value="${H(x.note||'')}"></label></div>
  <div class="cf-btns"><button class="pri" id="ed-ok">Save</button><button id="ed-x">Cancel</button></div>`);
  document.getElementById('ed-x').onclick=closeModal;document.getElementById('ed-ok').onclick=()=>{const g=id=>document.getElementById(id).value.trim();x.kind=g('ed-k');x.load=g('ed-l')===''?null:conv(+g('ed-l'),S.unit,cur.unit);x.reps=g('ed-r')===''?null:+g('ed-r');
    const i=g('ed-i');x.rir=i===''?null:S.rpe?10-(+i):+i;x.note=g('ed-n');x.sug=false;renum(e);closeModal();persist(cur.id);renderSession()}}
// ---------- bottom keypad (load/reps) ----------
let KP=null;
function openKp(e,x,f){closeKp();KP={e,x,f,fresh:true};const k=document.createElement('div');k.id='lg-kp';document.body.appendChild(k);kpSwipe(k);drawKp();renderSession()}
function minKp(){if(cur)persist(cur.id);closeKp();renderSession()}
function kpSwipe(k){let y0=null,x0=null;k.addEventListener('pointerdown',ev=>{y0=ev.clientY;x0=ev.clientX});k.addEventListener('pointerup',ev=>{if(y0==null)return;const dy=ev.clientY-y0,dx=Math.abs(ev.clientX-x0);y0=null;if(dy>CFG.kpSwipePx&&dx<dy)minKp()});k.addEventListener('pointercancel',()=>{y0=null})}
function closeKp(){const k=document.getElementById('lg-kp');if(k)k.remove();KP=null}
function drawKp(){const k=document.getElementById('lg-kp');if(!k||!KP)return;const{e,x,f}=KP,inc=f=='load'?incFor(resolve(e.exerciseId))||1:1,v=f=='load'?conv(x.load,cur.unit,S.unit):x.reps;
  k.innerHTML=`<div class="kp-top"><span>${f=='load'?'Load ('+S.unit+')':'Reps'} · ${H(exName(e))}</span><b class="kp-val">${v==null?'':fmt(v)}</b><button id="kp-min" aria-label="Minimize keypad">▾</button></div><div class="kp-grid">
  ${['1','2','3','⌫','4','5','6','−'+fmt(inc),'7','8','9','+'+fmt(inc),'.','0','Done','Next'].map(b=>`<button data-k="${b}" class="${b=='Next'?'pri':''}">${b}</button>`).join('')}</div>`;
  k.querySelector('#kp-min').onclick=minKp;k.querySelectorAll('button[data-k]').forEach(b=>b.onclick=()=>{const t=b.dataset.k;let s=v==null?'':fmt(v);
    if(t=='Done'){closeKp();persist(cur.id);renderSession();return}
    if(t=='Next'){persist(cur.id);if(f=='load'){KP.f='reps';KP.fresh=true;drawKp();renderSession();return}const ss=setsOf(e.id),i=ss.indexOf(x),nx=ss.slice(i+1).find(q=>!q.done);if(nx){activeSet=nx.id;KP.x=nx;KP.f='load';KP.fresh=true;drawKp();renderSession()}else{closeKp();renderSession()}return}
    let n;if(t[0]=='−'||t[0]=='+'){n=Math.max(0,(v||0)+(t[0]=='+'?inc:-inc))}else if(t=='⌫'){s=KP.fresh?'':s.slice(0,-1);n=s===''?null:+s}else{s=(KP.fresh?'':s)+t;n=s==='.'?0:+s}KP.fresh=false;
    if(f=='load'){x.load=n==null?null:conv(n,S.unit,cur.unit);x.sug=false}else x.reps=n==null?null:Math.round(n);drawKp();const o=document.getElementById('lg');if(o){o._noScroll=true;renderSession();o._noScroll=false}})}
// ---------- rest timer (timestamps; survives reload/lock) ----------
function startTimer(sec){const t={start:Date.now(),end:Date.now()+sec*1000};localStorage.setItem(TKEY,JSON.stringify(t));tick();requestAnimationFrame(clearTimer)}
const plural=(n,w)=>`${n} ${w}${n==1?'':'s'}`;
// keep the active row (or the last row) above the floating rest-timer bar
function clearTimer(){const t=document.getElementById('lg-timer'),b=document.querySelector('#lg .lg-body');if(!t||!b)return;const top=t.getBoundingClientRect().top,gap=CFG.timerGapPx;
  b.style.paddingBottom=Math.max(parseFloat(getComputedStyle(b).paddingBottom)||0,t.offsetHeight+2*gap)+'px';const r=b.querySelector('.lg-row.active')||[...b.querySelectorAll('.lg-row')].pop();if(!r)return;const d=r.getBoundingClientRect().bottom-(top-gap);if(d>0)b.scrollBy(0,d)}
function timer(){try{return JSON.parse(localStorage.getItem(TKEY))}catch{return null}}
function tick(){const el=document.getElementById('lg-el');if(el&&cur&&cur.startedAt){const m=Math.floor((Date.now()-Date.parse(cur.startedAt))/1000);el.textContent=Math.floor(m/60)+':'+String(m%60).padStart(2,'0')}
  const t=timer();let p=document.getElementById('lg-timer');if(!t||!cur){if(p)p.remove();return}const left=Math.ceil((t.end-Date.now())/1000);
  if(!p){p=document.createElement('div');p.id='lg-timer';p.innerHTML=`<span class="tm-t"></span><button data-t="-">−15s</button><button data-t="+">+15s</button><button data-t="x">Skip</button>`;document.body.appendChild(p);
    p.querySelectorAll('button').forEach(b=>b.onclick=()=>{const q=timer();if(!q)return;if(b.dataset.t=='x'){localStorage.removeItem(TKEY);p.remove();return}q.end+=(b.dataset.t=='+'?15:-15)*1000;localStorage.setItem(TKEY,JSON.stringify(q));tick()})}
  const T=p.querySelector('.tm-t');if(left>0){T.textContent='Rest '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');p.classList.remove('flash')}else{T.textContent='Rest done';if(!p.classList.contains('flash')){p.classList.add('flash');beep()}if(left<-8){localStorage.removeItem(TKEY);p.remove()}}}
function beep(){if(!S.sound)return;try{const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator();o.connect(a.destination);o.start();o.stop(a.currentTime+CFG.beepMs/1000)}catch{}}
setInterval(tick,250);
// ---------- card menu: swap / skip / note / rest / rep range / increment / history ----------
// ---------- options sheet (⋯ / title): actions, permanent note, how-to, history chart (metric switch) + swipeable list ----------
const METRICS=[['e1rm','e1RM'],['maxw','Max weight'],['bestvol','Best-set volume'],['totvol','Total volume'],['reps','Best reps']];let metric=METRICS[0][0];
function metricOf(q,m){const w=work(q.sets).filter(x=>x.reps);if(!w.length)return null;const lb=x=>toLb(x.load,sessUnit(x.sessionId))||0,u=v=>conv(v,'lb',S.unit);
  if(m=='e1rm'){const b=bestOf(q.sets);return b?u(b.v):null}if(m=='maxw')return u(Math.max(...w.map(lb)));if(m=='bestvol')return u(Math.max(...w.map(x=>lb(x)*x.reps)));
  if(m=='totvol')return u(w.reduce((a,x)=>a+lb(x)*x.reps,0));if(m=='reps')return Math.max(...w.map(x=>x.reps));return null}
function metricSeries(id,m){return hist(id).reverse().map(q=>metricOf(q,m))}
function howtoHtml(id){const x=EX[id],h=x&&!x.custom&&x.howto;const img=h&&typeof h.image=='string'&&/^img\//.test(h.image)?h.image:null;
  const pic=img?`<img class="lg-pic" src="${H(img)}" alt="${H(x.name)}">`:`<div class="lg-pic ph" role="img" aria-label="No picture yet">No picture yet</div>`;
  const txt=h&&h.setup?`<div class="lg-howto"><p class="ht-setup"><b>Setup</b> ${H(h.setup)}</p>${Array.isArray(h.cues)&&h.cues.length?`<ul class="ht-cues">${h.cues.map(c=>`<li>${H(c)}</li>`).join('')}</ul>`:''}${h.mistake?`<p class="ht-mis"><b>Common mistake</b> ${H(h.mistake)}</p>`:''}</div>`
    :`<p class="lg-howto ph">No how-to for this exercise yet${x&&x.custom?' (custom exercise)':''}.</p>`;return`<div class="lg-ht">${pic}${txt}</div>`}
function histHtml(id,e){const h=hist(id).reverse(),nm=(EX[id]||{}).name||(e&&e.nameSnapshot)||id,f=e1Formula();const pts=metricSeries(id,metric),ml=METRICS.find(q=>q[0]==metric)[1];
  const vals=pts.filter(v=>v!=null),mx=Math.max(...vals,0)||1,mn=vals.length?Math.min(...vals):0,W=300,Hh=110,px=i=>h.length<2?W/2:10+i*(W-20)/(h.length-1),py=v=>Hh-10-(mx==mn?1/2:(v-mn)/(mx-mn))*(Hh-20);
  const line=pts.map((v,i)=>v==null?null:`${px(i).toFixed(1)},${py(v).toFixed(1)}`).filter(Boolean).join(' ');const bu=v=>fmt(conv(v,'lb',S.unit));
  const best=h.flatMap(q=>work(q.sets).filter(s=>s.reps&&s.reps<=LR().e1rm_max_reps).map(s=>({s,v:e1rm(toLb(s.load,sessUnit(s.sessionId))||0,s.reps),d:q.s.date}))).sort((a,b)=>b.v-a.v).slice(0,5);
  const prs=new Set(L.prs.filter(p=>resolve(p.exerciseId)==id).map(p=>p.setId));
  return`<div id="lg-hist" data-x="${H(id)}"><p class="cf-hint">Estimated 1RM (${cap(f.name)}, working sets ≤ ${LR().e1rm_max_reps} reps), ${S.unit}.</p>${f.warn?`<p class="lg-warn" id="e1-warn">⚠ ${H(f.warn)}</p>`:''}
  <div class="lg-pgdots"><button data-pg="0" class="on">Chart</button><button data-pg="1">History list</button></div>
  <div class="lg-pager"><section class="pg pg-chart"><div class="lg-seg lg-met">${METRICS.map(([k,t])=>`<button data-m="${k}" class="${k==metric?'on':''}">${t}</button>`).join('')}</div>
   ${vals.length?`<svg class="lg-chart" viewBox="0 0 ${W} ${Hh}" data-m="${metric}"><polyline points="${line}"/>${pts.map((v,i)=>v==null?'':`<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="3"/>`).join('')}<text x="4" y="12">${fmt(mx)}</text><text x="4" y="${Hh-2}">${fmt(mn)}</text></svg><p class="cf-hint lg-mlab">${ml}${metric=='reps'?'':', '+S.unit}</p>`:'<p class="cf-hint">No completed sessions yet.</p>'}</section>
  <section class="pg pg-list">${best.length?`<h4>Best sets</h4><table class="lg-tbl">${best.map(b=>`<tr><td>${fmt(dLoad(b.s))} × ${b.s.reps}${b.s.rir!=null?' @'+b.s.rir:''}</td><td>e1RM ${bu(b.v)}</td><td>${new Date(b.d).toLocaleDateString()}</td></tr>`).join('')}</table>`:''}
  <h4>Sessions</h4>${h.slice().reverse().map(q=>`<div class="lg-hs"><b>${new Date(q.s.date).toLocaleDateString()}</b> ${H(q.s.label)}<div>${q.sets.map(s=>`<span class="${s.kind=='warmup'?'w':''}">${s.kind=='warmup'?'W ':''}${fmt(dLoad(s))}×${s.reps}${s.rir!=null?' @'+s.rir:''}${prs.has(s.id)?' 🏆':''}</span>`).join(' ')}</div>${q.e.notes?`<small class="lg-hwn">Workout note: ${H(q.e.notes)}</small>`:''}</div>`).join('')||'<p class="cf-hint">None yet.</p>'}</section></div></div>`}
function bindHist(again){const r=document.getElementById('lg-hist');if(!r)return;const pg=r.querySelector('.lg-pager'),dots=r.querySelectorAll('.lg-pgdots button');
  dots.forEach(b=>b.onclick=()=>pg.scrollTo({left:+b.dataset.pg*pg.clientWidth,behavior:'instant'}));pg.addEventListener('scroll',()=>{const k=Math.round(pg.scrollLeft/Math.max(1,pg.clientWidth));dots.forEach(d=>d.classList.toggle('on',+d.dataset.pg==k))});
  r.querySelectorAll('.lg-met button').forEach(b=>b.onclick=()=>{metric=b.dataset.m;const sc=document.getElementById('modal');const y=sc?sc.scrollTop:0;again();const s2=document.getElementById('modal');if(s2)s2.scrollTop=y})}
function pnHtml(id){const n=exNote(id);return`<div class="lg-pnwrap"><button class="lg-pn${n?'':' empty'}" data-x="${H(id)}">📌 ${n?H(n):'Add exercise note (permanent)'}</button></div>`}
function bindPn(root,after){root.querySelectorAll('.lg-pn').forEach(b=>b.onclick=ev=>{ev.stopPropagation();editPn(b.dataset.x,after)})}
function editPn(id,after){modal(`<div id="lg-pnm"><h3>${H((EX[id]||{}).name||id)}</h3><p class="cf-hint">Permanent note for this exercise: shown on the board and in every session that programs it.</p>
  <textarea id="pn-t" rows="3" placeholder="e.g. Seat on 4, pins at 6">${H(exNote(id))}</textarea><div class="cf-btns"><button class="pri" id="pn-save">Save</button><button id="pn-x">Cancel</button></div></div>`);
  document.getElementById('pn-x').onclick=()=>{closeModal();after&&after()};document.getElementById('pn-save').onclick=()=>{const v=document.getElementById('pn-t').value.trim();if(v)NOTES[id]=v;else delete NOTES[id];saveN();closeModal();if(typeof render=='function')render();after&&after()}}
function moreMenu(e){const id=resolve(e.exerciseId),x=EX[id];const draw=()=>{modal(`<div id="lg-opt"><h3>${H(exName(e))}</h3><div class="lg-menu lg-acts">${x?'<button data-a="swap">Swap</button>':''}<button data-a="skip">${e.skipped?'Unskip exercise':'Skip exercise'}</button></div>
  ${x?pnHtml(id):''}${howtoHtml(id)}${histHtml(id,e)}<div class="cf-btns"><button id="mm-x">Close</button></div></div>`);
  document.getElementById('mm-x').onclick=()=>{closeModal();renderSession()};bindPn(document.getElementById('lg-opt'),draw);bindHist(draw);
  document.querySelectorAll('#lg-opt .lg-acts button').forEach(b=>b.onclick=()=>{const a=b.dataset.a;if(a=='swap')return swapMenu(e);
    if(a=='skip'){e.skipped=!e.skipped;closeModal();persist(cur.id);renderSession()}})};draw()}
function history_(id,e){const draw=()=>{modal(`<div id="lg-hsheet"><h3>${H((EX[id]||{}).name||(e&&e.nameSnapshot)||id)}${isArch(id)?' <em>archived exercise</em>':''}</h3>${EX[id]?pnHtml(id):''}${howtoHtml(id)}${histHtml(id,e)}<div class="cf-btns"><button id="hi-x">Close</button></div></div>`);
  document.getElementById('hi-x').onclick=closeModal;bindPn(document.getElementById('lg-hsheet'),draw);bindHist(draw)};draw()}
// ---------- in-place exercise tray (the board's own tray panel, filters and search, moved into the logger) + create via custom-exercise form ----------
let pendingCreate=null;
function trayPick(title,onPick){const panel=document.getElementById('tray').closest('.panel'),home=panel.parentNode,next=panel.nextSibling;closeModal();
  const sh=document.createElement('div');sh.id='lg-tray';sh.innerHTML=`<div class="lg-tray-top"><b>${H(title)}</b><button id="lt-x">Close</button></div><div id="lt-slot"></div>`;document.body.appendChild(sh);sh.querySelector('#lt-slot').appendChild(panel);
  const isTile=ev=>{const t=ev.target.closest&&ev.target.closest('#tray .tile');return t&&!ev.target.closest('.cedit')?t:null};
  const block=ev=>{if(isTile(ev))ev.stopPropagation()};const EVS=['pointerdown','pointermove','pointerup','mousedown','touchstart','touchmove','touchend','dragstart'];EVS.forEach(n=>panel.addEventListener(n,block,true));
  const pick=ev=>{const t=isTile(ev);if(!t)return;ev.stopPropagation();ev.preventDefault();done();onPick(t.dataset.id)};panel.addEventListener('click',pick,true);
  const done=()=>{EVS.forEach(n=>panel.removeEventListener(n,block,true));panel.removeEventListener('click',pick,true);home.insertBefore(panel,next);sh.remove()};
  sh.querySelector('#lt-x').onclick=()=>{done();renderSession()};const q=panel.querySelector('#q');if(q)q.scrollIntoView({block:'start'})}
function createEx(onNew){const before=new Set(CUS.map(c=>c.id));openForm();pendingCreate={before,cb:onNew}}
if(typeof syncCustom=='function'){const sc0=syncCustom;syncCustom=function(){const r=sc0.apply(this,arguments);if(pendingCreate){const n=CUS.find(c=>!pendingCreate.before.has(c.id));if(n){const cb=pendingCreate.cb;pendingCreate=null;setTimeout(()=>cb(n.id))}}return r}}
if(typeof closeModal=='function'){const cm0=closeModal;closeModal=function(){pendingCreate=null;return cm0.apply(this,arguments)}}
// ---------- swap ----------
function doSwap(e,nid){if(!cur||!EX[nid])return;const ss=setsOf(e.id),done=ss.filter(s=>s.done),rest=ss.filter(s=>!s.done);
  let ne;if(!done.length){if(!e.swappedFrom)e.swappedFrom=e.exerciseId;e.exerciseId=nid;e.nameSnapshot=EX[nid].name;e.repRange=[...repFor(nid)];e.restSec=restFor(nid,'working');e.notes=carryNote(nid);ne=e}
  else{ne={id:uid('e'),sessionId:cur.id,order:e.order+1/2,exerciseId:nid,nameSnapshot:EX[nid].name,swappedFrom:e.swappedFrom||e.exerciseId,repRange:[...repFor(nid)],restSec:restFor(nid,'working'),notes:carryNote(nid),skipped:false};L.entries.push(ne);rest.forEach((s,i)=>{s.entryId=ne.id;s.idx=i});entriesOf(cur.id).forEach((q,i)=>q.order=i)}
  rest.forEach(s=>{s.load=null;s.reps=null;s.sug=false;delete s.prevLoad;delete s.prevReps});prefill(ne);openEntry=ne.id;activeSet=firstOpenSet(ne);closeModal();persist(cur.id);renderSession();toast(`Swapped to ${EX[nid].name}`,null)}
function swapMenu(e){const id=resolve(e.exerciseId),list=swaps(id,null,6);modal(`<h3>Swap ${H(exName(e))}</h3><p class="cf-hint">Similar exercises</p><div class="lg-menu" id="sw-l">${list.map(c=>`<button data-id="${c.id}">${H(c.name)}${c.badge?' <em class="est">est.</em>':''}<small>${H(c.tags.join(' · '))}</small></button>`).join('')||'<p class="cf-hint">No close alternatives.</p>'}</div>
  <div class="lg-menu lg-more2"><button id="sw-all">Browse all exercises…</button><button id="sw-new">Create new exercise…</button></div><div class="cf-btns"><button id="sw-x">Cancel</button></div>`);
  document.getElementById('sw-x').onclick=closeModal;document.querySelectorAll('#sw-l button[data-id]').forEach(b=>b.onclick=()=>doSwap(e,b.dataset.id));
  document.getElementById('sw-all').onclick=()=>trayPick('Swap '+exName(e)+' for…',nid=>doSwap(e,nid));document.getElementById('sw-new').onclick=()=>createEx(nid=>doSwap(e,nid))}
function weekDone(){const ws=weekStart(),d=[];let arch=0;L.sessions.filter(s=>s.status=='completed'&&Date.parse(s.startedAt||s.date)>=ws&&Date.parse(s.startedAt||s.date)<ws+7*864e5)/* v28: weekly totals are completed sessions only */.forEach(s=>entriesOf(s.id).forEach(e=>{const n=setsOf(e.id).filter(isHard).length;if(!n)return;if(isArch(e.exerciseId)){arch+=n;return}d.push({id:resolve(e.exerciseId),sets:n})}));
  return{days:[d,[],[],[],[],[],[]],arch}}
function countsFor(days){const sv=state.days;state.days=days;try{return totals()}finally{state.days=sv}}
function addEx(id){if(!cur||!EX[id])return;const e={id:uid('e'),sessionId:cur.id,order:entriesOf(cur.id).length,exerciseId:id,nameSnapshot:EX[id].name,added:true,repRange:[...repFor(id)],restSec:restFor(id,'working'),notes:carryNote(id),skipped:false};
  L.entries.push(e);for(let j=0;j<CFG.addSets;j++)L.sets.push(newSet(e,'working',j));prefill(e);openEntry=e.id;activeSet=firstOpenSet(e);closeModal();persist(cur.id);renderSession()}
function addExercise(){const done=countsFor(weekDone().days),rem=countsFor([entriesOf(cur.id).flatMap(e=>e.skipped||isArch(e.exerciseId)?[]:[{id:resolve(e.exerciseId),sets:setsOf(e.id).filter(s=>(!s.done&&s.kind=='working')||isHard(s)).length}]),[],[],[],[],[],[]]);
  const gap=MUS.filter(m=>done[m]+rem[m]<tgt(m).min);const sc=x=>gap.reduce((a,m)=>a+((x.muscles[m]||0)>=RULE.min_rating_to_count?x.muscles[m]:0),0);
  const all=Object.values(EX).map(x=>({x,s:sc(x)})).sort((a,b)=>b.s-a.s||(a.x.name<b.x.name?-1:1));
  modal(`<h3>Add exercise</h3><div class="lg-menu lg-more2"><button id="ax-tray">Open tray (all exercises, filters)…</button><button id="ax-new">Create exercise…</button></div>
  <p class="cf-hint">${gap.length?'Suggestions sorted by what fills this week\'s gaps: '+gap.map(m=>H(lab(m))).join(', '):'No weekly gaps left; sorted by name.'}</p><input id="ax-q" placeholder="Search suggestions…"><div class="lg-menu" id="ax-l"></div><div class="cf-btns"><button id="ax-x">Cancel</button></div>`);
  const draw=()=>{const q=document.getElementById('ax-q').value.toLowerCase();document.getElementById('ax-l').innerHTML=all.filter(o=>!q||o.x.name.toLowerCase().includes(q)).slice(0,30).map(o=>`<button data-id="${o.x.id}">${ICON[o.x.type]||''} ${H(o.x.name)}${o.x.estimated?' <em class="est">est.</em>':''}</button>`).join('');
    document.querySelectorAll('#ax-l button').forEach(b=>b.onclick=()=>addEx(b.dataset.id))};
  document.getElementById('ax-q').oninput=draw;document.getElementById('ax-x').onclick=closeModal;document.getElementById('ax-tray').onclick=()=>trayPick('Add exercise',addEx);document.getElementById('ax-new').onclick=()=>createEx(addEx);draw()}
// ---------- summary + write back to routine ----------
function diffRows(s){const es=entriesOf(s.id),rows=[],plan=(s.snapshot||{}).exercises||[];const wk=e=>setsOf(e.id).filter(x=>x.kind=='working').length;
  plan.forEach(p=>{const g=es.filter(e=>!e.added&&(e.swappedFrom||e.exerciseId)==p.exerciseId);const live=g.filter(e=>!e.skipped);const n=live.reduce((a,e)=>a+wk(e),0);
    if(!live.length){rows.push({type:'remove',from:p.exerciseId,txt:`Remove ${(EX[p.exerciseId]||{}).name||p.exerciseId} (skipped)`});return}
    const sw=live.filter(e=>e.swappedFrom).pop();if(sw){rows.push({type:'swap',from:p.exerciseId,to:sw.exerciseId,sets:n,txt:`Swap ${(EX[p.exerciseId]||{}).name||p.exerciseId} → ${EX[sw.exerciseId].name}${n!=p.sets?` (${p.sets}→${n} sets)`:''}`});return}
    if(n!=p.sets)rows.push({type:'sets',from:p.exerciseId,sets:n,txt:`${(EX[p.exerciseId]||{}).name||p.exerciseId}: ${p.sets}→${n} working sets`})});
  es.filter(e=>e.added&&!e.skipped&&!isArch(e.exerciseId)).forEach(e=>rows.push({type:'add',to:e.exerciseId,sets:wk(e),txt:`Add ${EX[e.exerciseId].name} (${wk(e)} sets)`}));return rows}
function applyRows(tiles,rows){let t=tiles.map(x=>({...x}));rows.forEach(r=>{if(r.type=='add'){t.push({id:r.to,sets:r.sets});return}const i=t.findIndex(x=>x.id==r.from);if(i<0)return;
  if(r.type=='remove')t.splice(i,1);else if(r.type=='swap')t[i]={id:r.to,sets:r.sets};else t[i].sets=r.sets});return t}
function sessStats(s){const es=entriesOf(s.id),live=es.filter(e=>!isArch(e.exerciseId));const all=live.flatMap(e=>setsOf(e.id));const planned=((s.snapshot||{}).exercises||[]).reduce((a,p)=>a+p.sets,0);
  const doneW=es.flatMap(e=>e.skipped?[]:setsOf(e.id)).filter(x=>x.kind=='working'&&x.done).length;const skippedW=es.filter(e=>e.skipped).reduce((a,e)=>a+setsOf(e.id).filter(x=>x.kind=='working').length,0);
  return{hard:all.filter(isHard).length,doneW,planned,skippedW,beat:es.map(e=>beatOf(e)).filter(b=>b=='▲').length,prs:(()=>{const P=cur&&s.id==cur.id?livePrs():(detectPrs(hx(false),ALIAS)[s.id]||{});return Object.keys(P).flatMap(ex=>PR_TYPES.filter(k=>P[ex][k]).map(k=>({ex,k,r:P[ex][k]})))})(),
    min:Math.round((Date.now()-Date.parse(s.startedAt))/60000)}}
function summary(){closeKp();const ot=document.getElementById('toast');if(ot)ot.remove();const s=cur,st=sessStats(s),rows=diffRows(s),m=loaded();
  modal(`<div id="lg-sum"><h3>Finish ${H(s.label)}</h3><div class="lg-stats"><span>${st.min} min</span><span>${plural(st.hard,'hard set')}</span><span>${st.doneW}/${st.planned} planned working sets${st.skippedW?` · ${st.skippedW} skipped`:''}</span><span>${st.beat} beat last time</span></div>
  ${st.prs.length?`<h4>PRs</h4><ul class="lg-sumpr">${st.prs.map(p=>`<li data-k="${p.k}" data-x="${H(p.ex)}">🏆 ${H((EX[p.ex]||{}).name||p.ex)}: ${PRL[p.k]} · ${prVal(p.k,p.r)}</li>`).join('')}</ul>`:''}
  <label>Session notes<textarea id="sm-n">${H(s.notes||'')}</textarea></label>
  <h4>Write back to routine</h4>${rows.length?`<p class="cf-hint">Structural changes only (loads, reps and RIR are never written back).</p><div class="lg-diff">${rows.map((r,i)=>`<label><input type="checkbox" data-i="${i}" checked> ${H(r.txt)}</label>`).join('')}</div>
   <div class="lg-wb">${m?`<label><input type="radio" name="wb" value="split"> Update loaded split '${H(m.name)}'</label>`:''}<label><input type="radio" name="wb" value="board"> Apply to this board only</label><label><input type="radio" name="wb" value="none" checked> Don't apply</label></div>`:'<p class="cf-hint">No structural changes.</p>'}
  <div class="cf-btns"><button class="pri" id="sm-ok">Save session</button><button id="sm-back">Keep logging</button><button id="sm-del" class="dng">Discard session</button></div></div>`);
  document.getElementById('sm-back').onclick=()=>{closeModal();renderSession()};document.getElementById('sm-del').onclick=()=>{if(confirm('Discard this session? Logged sets will be deleted.'))discard()};
  document.getElementById('sm-ok').onclick=()=>{s.notes=document.getElementById('sm-n').value;const pick=(document.querySelector('input[name=wb]:checked')||{}).value||'none';const sel=rows.filter((r,i)=>{const c=document.querySelector(`.lg-diff input[data-i="${i}"]`);return c&&c.checked});
    s.status='completed';s.endedAt=nowISO();s.writeBack=rows.length?pick:'none';
    L.sets.filter(x=>x.sessionId==s.id).forEach(x=>{delete x.sug;delete x.prevLoad;delete x.prevReps});localStorage.removeItem(TKEY);const sid=s.id;cur=null;persist(sid);closeModal();closeLogger();
    if(pick!='none'&&sel.length)writeBack(s,sel,pick);else toast('Session saved',null)}}
function writeBack(s,rows,pick){const i=s.dayIdx,prior=JSON.stringify(state),m=loaded(),priorM=m?JSON.stringify(m):null;
  state.days[i]=applyRows(state.days[i]||[],rows);if(pick=='split'&&m){m.days[i]=applyRows(m.days[i]||[],rows);m.saved=new Date().toISOString();saveMy()}
  upd();if(window.bar)bar();refreshBar();
  toast(pick=='split'?`Updated '${m.name}'`:'Applied to this board',()=>{state=JSON.parse(prior);if(pick=='split'&&m){Object.assign(m,JSON.parse(priorM));saveMy()}upd();if(window.bar)bar();refreshBar()})}
function discard(){const sid=cur.id;L.sessions=L.sessions.filter(x=>x.id!==sid);L.entries=L.entries.filter(x=>x.sessionId!==sid);L.sets=L.sets.filter(x=>x.sessionId!==sid);cur=null;localStorage.removeItem(TKEY);persist(sid);closeModal();closeLogger()}
// ---------- week view: Planned / Done body map, counts, adherence; history; settings ----------
function weekStart(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()}
function weekKey(){const d=new Date(weekStart());return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function weekAnalytics(wk){return completedAnalytics(hx(false),wk||weekKey(),{aliases:ALIAS,plannedSessions:order().length||undefined/* no plan on the board: prs.py default (completed + skipped) */,hardRIR:HR(),exercises:EX})}
const loggedNote=()=>((LR().completed_analytics||{}).note)||'';
function adherence(){const a=weekAnalytics().adherence;return{completed:a.sessions_completed,skipped:a.sessions_skipped,notStarted:a.sessions_not_started,doneW:a.completed_planned_sets,planW:a.planned_sets,skW:a.skipped_sets,ratio:a.sets_ratio}}
function weekView(tab){tab=tab||'week';const wd=weekDone(),days=view=='done'?wd.days:state.days,ad=adherence();const pc=countsFor(state.days),dc=countsFor(wd.days);
  modal(`<div id="lg-wk"><div class="lg-tabs">${['week','history','settings'].map(t=>`<button data-t="${t}" class="${t==tab?'on':''}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
  ${tab=='week'?`<div class="lg-seg"><button id="wk-plan" class="${view=='plan'?'on':''}">Planned</button><button id="wk-done" class="${view=='done'?'on':''}">Done</button></div><div id="lg-map"></div>
   ${wd.arch?`<p class="lg-arch">${wd.arch} set${wd.arch>1?'s':''} from archived exercises not counted.</p>`:''}
   <p class="cf-hint lg-logged">Done = logged total of hard sets in completed sessions this week (at least 1 rep, RIR ≤ ${HR()} or not logged), counted with the board's rule. ${H(loggedNote())}</p>
   <table class="lg-tbl lg-cnt">${MUS.map(m=>`<tr data-m="${m}" class="${status(view=='done'?dc[m]:pc[m],tgt(m))}"><td>${H(cap(lab(m)))}</td><td class="dn" data-v="${dc[m]}">${dc[m]}</td><td class="pl" data-v="${pc[m]}">/ ${pc[m]}</td><td>${tgt(m).min}–${tgt(m).max}</td></tr>`).join('')}</table>
   ${(()=>{const w=weekAnalytics(),n=L.prs.filter(p=>L.sessions.some(s=>s.id==p.sessionId&&Date.parse(s.startedAt||s.date)>=weekStart())).length;return`<h4>Logged totals this week</h4><p class="lg-wtot" data-kg="${w.volume.week_kg}" data-hs="${w.hard_sets.set_count}" data-pr="${n}">Logged total volume ${fmt(conv(w.volume.week_kg,'kg',S.unit))} ${S.unit} · logged total ${plural(w.hard_sets.set_count,'hard set')} · ${plural(n,'PR')}</p>`})()}<h4>Adherence this week (logged totals)</h4><p class="lg-adh" data-c="${ad.completed}" data-s="${ad.skipped}" data-n="${ad.notStarted}">Sessions: ${ad.completed} completed · ${ad.skipped} skipped · ${ad.notStarted} not started<br>Working sets: ${ad.doneW}/${ad.planW} done${ad.planW?` (${Math.round(ad.doneW/ad.planW*100)}%)`:''}${ad.skW?` · ${ad.skW} skipped`:''}</p>`:''}
  ${tab=='history'?`<div class="lg-hl">${L.sessions.filter(s=>s.status!='active').sort(byT).reverse().map(s=>`<div class="lg-hs ${s.status}"><b>${new Date(s.date).toLocaleDateString()}</b> ${H(s.label)} <em>${s.status}</em>${s.status=='completed'?`<div>${entriesOf(s.id).map(e=>`<button class="lg-hx" data-x="${H(resolve(e.exerciseId))}">${H(exName(e))}${isArch(e.exerciseId)?' (archived)':''}</button>`).join(' ')}</div>`:''}</div>`).join('')||'<p class="cf-hint">No sessions yet.</p>'}</div>`:''}
  ${tab=='settings'?`<div class="lg-set"><label>Units <span class="lg-seg"><button data-u="lb" class="${S.unit=='lb'?'on':''}">lb</button><button data-u="kg" class="${S.unit=='kg'?'on':''}">kg</button></span></label>
   <label>Hard set = RIR ≤ <span class="lg-seg"><button data-h="-">−</button><b id="st-h">${HR()}</b><button data-h="+">+</button></span></label>
   <label><input type="checkbox" id="st-rpe" ${S.rpe?'checked':''}> Show effort as RPE (10 − RIR)</label><label><input type="checkbox" id="st-snd" ${S.sound?'checked':''}> Sound when rest ends</label></div>`:''}
  <div class="cf-btns"><button id="wk-x">Close</button></div></div>`);
  document.querySelectorAll('#lg-wk .lg-tabs button').forEach(b=>b.onclick=()=>weekView(b.dataset.t));document.getElementById('wk-x').onclick=closeModal;
  if(tab=='week'){heatInto(document.getElementById('lg-map'),days,'lg');document.getElementById('wk-plan').onclick=()=>{view='plan';weekView()};document.getElementById('wk-done').onclick=()=>{view='done';weekView()}}
  if(tab=='history')document.querySelectorAll('.lg-hx').forEach(b=>b.onclick=()=>history_(b.dataset.x));
  if(tab=='settings'){document.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{S.unit=b.dataset.u;saveS();weekView('settings')});document.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{S.hardRIR=(()=>{const r=LR().hardRIR_range||[];return Math.max(r[0],Math.min(r[1],HR()+(b.dataset.h=='+'?1:-1)))})();saveS();weekView('settings')});
    document.getElementById('st-rpe').onchange=e=>{S.rpe=e.target.checked;saveS()};document.getElementById('st-snd').onchange=e=>{S.sound=e.target.checked;saveS()}}}
// ---------- backup / restore ----------
window.logBackup=()=>({schema:LOG_SCHEMA,exNotes:NOTES,sessions:L.sessions,entries:L.entries,sets:L.sets,prs:L.prs,settings:S});
window.importLogs=function(d){if(!d||!d.logs)return;let g=JSON.parse(JSON.stringify(d.logs));if(typeof g.schema!='number'&&typeof d.schema=='number')g.schema=d.schema;
  if(!Array.isArray(g.sessions)||!Array.isArray(g.entries||[])||!Array.isArray(g.sets||[])){alert('The workout logs in this file are not valid.');return}
  g=migrate(g);if(L.sessions.length&&!confirm('Replace your workout logs with the ones in this backup?'))return;
  L={sessions:g.sessions,entries:g.entries||[],sets:g.sets||[],prs:g.prs||[]};if(g.settings&&typeof g.settings=='object'){Object.assign(S,g.settings);migrateS();saveS()}if(g.exNotes&&typeof g.exNotes=='object'){NOTES={...g.exNotes};saveN();migrateNoteIds()}migrateIds();
  cur=L.sessions.find(s=>s.status=='active')||null;persistAll();refreshBar()};
// ---------- boot ----------
async function boot(){for(let i=0;i<200&&(!Object.keys(EX).length||(typeof RU=='undefined'||!RU)||!MUS.length);i++)await new Promise(r=>setTimeout(r,50));
  try{ALIAS=await fetch('data/id-aliases.json').then(r=>r.json())}catch{ALIAS={}}
  db=await idbOpen();if(db){const[a,b,c,d]=await Promise.all(['sessions','entries','sets','prs'].map(getAll));L={sessions:a,entries:b,sets:c,prs:d}}else{try{L=Object.assign(L,JSON.parse(localStorage.getItem(FKEY))||{})}catch{}}
  let m=null;try{m=JSON.parse(localStorage.getItem(AKEY))}catch{}
  if(m&&m.s&&m.s.status=='active'){L.sessions=L.sessions.filter(x=>x.id!==m.s.id).concat([m.s]);L.entries=L.entries.filter(x=>x.sessionId!==m.s.id).concat(m.e||[]);L.sets=L.sets.filter(x=>x.sessionId!==m.s.id).concat(m.t||[])}
  const mn=Math.min(LOG_SCHEMA,...L.sessions.map(q=>typeof q.schema=='number'?q.schema:LOG_SCHEMA));const lg=migrate({schema:mn,...L});L={sessions:lg.sessions,entries:lg.entries||[],sets:lg.sets||[],prs:lg.prs||[]};if(migrateIds()||mn<LOG_SCHEMA)await persistAll();
  cur=L.sessions.find(s=>s.status=='active')||null;recomputePrs();ready=true;window.LG.ready=true;buildBar();
  if(cur){const e=entriesOf(cur.id);e.forEach(prefillKeep);openEntry=(e.find(q=>setsOf(q.id).some(s=>!s.done))||e[0]||{}).id;activeSet=firstOpenSet(e.find(q=>q.id==openEntry));
    modal(`<div id="lg-resume"><h3>Unfinished session</h3><p>${H(cur.label)} (started ${new Date(cur.startedAt).toLocaleString()})</p><div class="cf-btns"><button class="pri" id="rs-go">Resume</button><button id="rs-del" class="dng">Discard</button></div></div>`);
    document.getElementById('rs-go').onclick=()=>openLogger();document.getElementById('rs-del').onclick=()=>{if(confirm('Discard the unfinished session? Logged sets will be deleted.'))discard()}}}
function prefillKeep(e){e.cue=progression(resolve(e.exerciseId),e.sessionId)}
function buildBar(){if(!document.getElementById('lg')){const o=document.createElement('section');o.id='lg';o.className='lg-page';document.body.appendChild(o)}
  if(!document.getElementById('tabs')){const t=document.createElement('nav');t.id='tabs';t.setAttribute('role','tablist');t.innerHTML=[['build','Build'],['train','Train'],['log','Log'],['analytics','Analytics']].map(([v,n])=>`<button id="tab-${v}" data-v="${v}" role="tab">${n}<i class="tab-dot"></i></button>`).join('');document.body.appendChild(t);
    t.querySelectorAll('button').forEach(b=>b.onclick=()=>setView(b.dataset.v))}
  renderStart();setView(document.body.dataset.view||'build')}
// keep the Continue label in sync with board edits
function tileNotes(){document.querySelectorAll('#board .tile[data-id]').forEach(t=>{const n=exNote(t.dataset.id);let el=t.querySelector('.tnote');if(!n){if(el)el.remove();return}if(!el){el=document.createElement('div');el.className='tnote';t.appendChild(el)}el.textContent='📌 '+n})}
if(typeof render=='function'){const r0=render;render=function(){const x=r0.apply(this,arguments);tileNotes();if(ready)refreshBar();return x}}
window.LG={get L(){return L},set L(v){L=v},isHard,entriesOf,setsOf,exName,PRL,prVal,fmt,conv,H,sessUnit,loggedNote,weekKey,weekStart,get ALIAS(){return ALIAS},livePrs,recomputePrs,weekAnalytics,celebrate,hx,get S(){return S},get cur(){return cur},order,continueIdx,diffRows,applyRows,weekDone,countsFor,adherence,resolve,isArch,migrate,startSession,skipDays,weekView,history_,persistAll,ready:false,CFG,HR,LR,e1rm,e1Formula,setView,metricSeries,METRICS,get NOTES(){return NOTES},exNote,carryNote,get KP(){return KP},incFor};
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
boot();
})();
