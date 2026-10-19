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
// v29.1: a past load in the display unit. Same unit -> as logged. Logged in the other unit -> the exact conversion is not a load anyone can lift
// (112.6162 kg = 248.27 lb), so it becomes the nearest real load of that unit: the saved gym profile if it is in that unit, else rules.json
// logger.gym_profile_default[unit] (no profile -> loads.js falls back to logger.load_step). Display / prefill only; stored sets are never changed.
function realIn(v,from,to,exId){if(v==null||v==='')return null;if(from==to)return Number(v);const id=resolve(exId),g=gymP(),p=g&&g.unit==to?g:JSON.parse(JSON.stringify((LR().gym_profile_default||{})[to]||{unit:to}));
  return nearestRealLoad(conv(Number(v),from,to),p,exEq(id),to,id)}
const dLoad=x=>realIn(x.load,sessUnit(x.sessionId),S.unit,setEx(x));
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
// v29 B: effective load (lb) of a logged set = bodyweight_fraction x session bodyweight + added (assisted: max(0, f x bw - assistance)); no bodyweight -> v8 (added only, assisted = 0)
const bwOn=day=>prBwOn(prBwTable({bodyweights:BW},prRules()),day);
const setEx=x=>{const e=L.entries.find(q=>q.id==x.entryId);return e?resolve(e.exerciseId):null};
function effLb(x){const added=toLb(x.load,sessUnit(x.sessionId))||0,m=EX[setEx(x)]||{},f=m.bodyweight_fraction||0;if(!(f>0))return added;const s=L.sessions.find(q=>q.id==x.sessionId);
  const[bw]=bwOn(prDay(s?(s.startedAt||s.date):nowISO()));if(bw==null)return m.bodyweight_assisted?0:added;const b=conv(f*bw,'kg','lb');return m.bodyweight_assisted?Math.max(0,b-added):b+added}
const tagOk=(x,k)=>!(x.tag&&(((LR().set_tags||{})[x.tag]||{}).pr_exclude||[]).includes(k));/* logger.set_tags pr_exclude: excluded tags also leave e1RM / trends */
const bwBase=(exId,u)=>{const f=(EX[exId]||{}).bodyweight_fraction||0;if(!(f>0))return 0;const[bw]=bwOn(prLocalDate(nowISO()));return bw==null?0:conv(f*bw,'kg',u)};
const bestOf=a=>{let b=null;work(a).forEach(x=>{if(x.reps>LR().e1rm_max_reps||!x.reps||!tagOk(x,'e1rm'))return;const lb=effLb(x);if(!(lb>0))return;const v=e1rm(lb,x.reps);if(!b||v>b.v)b={v,x}});return b};
const volOf=a=>work(a).reduce((s,x)=>s+effLb(x)*(x.reps||0),0);
// v29 A: gym profile (rules.json v9 logger.gym_profile_schema). Stored in settings (S.gymProfiles[], S.activeGymId) -> localStorage + backups.
// Until he saves his own, the rules.json gym_profile_default for the display unit is used.
/* PR ties (logger.prs.tie): the user's saved active profile; none -> null -> prs.js uses logger.gym_profile_default[session unit], the gym suggestions use */
function prProf(){return(S.gymProfiles||[]).find(x=>x.id==S.activeGymId)||null}
function gymP(){const g=(S.gymProfiles||[]).find(x=>x.id==S.activeGymId);return g||JSON.parse(JSON.stringify((LR().gym_profile_default||{})[S.unit]||{}))}
const exEq=exId=>(EX[resolve(exId)]||{}).equipment,exAsst=exId=>!!(EX[resolve(exId)]||{}).bodyweight_assisted;
// next real load from the gym in the display unit (assisted machines step toward less assistance); null when the gym has nothing further
function realStep(exId,v,dir){const g=gymP(),r=nextRealLoad(v||0,exAsst(exId)?-dir:dir,g,exEq(exId),S.unit,resolve(exId));return r==null?null:Math.round(conv(r,g.unit||S.unit,S.unit)*1e6)/1e6}
function progression(exId,sid){const h=hist(exId,sid),last=h[0];if(!last)return{};const w=work(last.sets);if(!w.length)return{};const[lo,hi]=repFor(exId),inc=incFor(exId),u=sessUnit(last.s.id);
  const top=Math.max(...w.map(x=>conv(x.load,u,S.unit)||0));const allTop=w.every(x=>x.reps>=hi&&(x.rir==null?LR().missing_rir_meets_target!==false:x.rir<=tRIR(exId)));
  const missed=w.some(x=>x.reps<lo),prevMissed=h[1]&&work(h[1].sets).some(x=>x.reps<lo);const b=bestOf(last.sets);
  const out={beat:b?`Beat ${fmt(conv(b.x.load,u,S.unit))}×${b.x.reps}`:'',cut:missed&&prevMissed};
  // v29 A: double progression with real loads (loads.js suggestNext = tools/loads.py); suggestions only use weights the gym has
  const g=gymP(),sg=suggestNext(w.map(x=>({load:x.load,reps:x.reps,rir:x.rir})),(EX[exId]||{}).type,[lo,hi],tRIR(exId),g,exEq(exId),u,exId,bwBase(exId,u)/* v29 B: bodyweight part (0 without a bodyweight) */,exAsst(exId));
  const inS=v=>v==null?null:Math.round(conv(v,g.unit||u,S.unit)*1e6)/1e6;out.sg={...sg,loadS:inS(sg.load)};
  if(sg.action=='load')out.sugLoad=inS(sg.load),out.sugReps=sg.reps;else if(sg.action=='reps')out.addRep=sg.reps,out.holdLoad=inS(sg.load);else if(sg.action=='max')out.max=true;void allTop;void top;void inc;return out}
function carryNote(id){const r=resolve(id),h=hist(r,cur&&cur.id)[0];if(h&&h.e.notes)return h.e.notes;const v=(S.v24||{}).sticky||{};return v[r]||v[id]||''}
function prevFor(exId,kind,pos,sid){const h=hist(exId,sid)[0];if(!h)return null;const a=h.sets.filter(x=>x.kind==kind);return a[pos]||null}
// ---------- split order / Continue ----------
function loaded(){return window.loadedSplit?loadedSplit():null}
// v28 C: Train library = published routines. Each Publish stores an immutable, versioned snapshot of the Build board (days + labels).
// The active routine (S.activeRoutine) drives Continue / day picker; with none active, Train uses the Build board as before.
const RKEY='liftboard.routines';let ROUT=[];try{ROUT=JSON.parse(localStorage.getItem(RKEY))||[]}catch{}const saveR=()=>localStorage.setItem(RKEY,JSON.stringify(ROUT));
// v28.1: decimal-bug cleanup state: {shown, sets:{setId:{a:'fixed'|'dismissed',from,to,at}}}; kept in backups
// v29 B: history.bodyweights [{date:'YYYY-MM-DD', value, unit}] (rules.json logger.bodyweight). Own key, in backups; fed to prs.js via hx().
const BKEY='liftboard.bodyweights';let BW=[];try{const v=JSON.parse(localStorage.getItem(BKEY));if(Array.isArray(v))BW=v}catch{}const saveBW=()=>localStorage.setItem(BKEY,JSON.stringify(BW));
// v29 E: suggested-deload state (history.deloads / deloadPrompt / readiness in deload.py terms); in backups
const DLKEY='liftboard.deload';let DLS={deloads:[],deloadPrompt:null,readiness:[]};try{const v=JSON.parse(localStorage.getItem(DLKEY));if(v&&typeof v=='object')DLS={...DLS,...v}}catch{}const saveDL=()=>localStorage.setItem(DLKEY,JSON.stringify(DLS));
const DKEY='liftboard.decimalFix';let DFX={shown:false,sets:{}};try{Object.assign(DFX,JSON.parse(localStorage.getItem(DKEY))||{})}catch{}const saveDF=()=>localStorage.setItem(DKEY,JSON.stringify(DFX));
const rtVers=id=>ROUT.filter(r=>r.id==id).sort((a,b)=>a.version-b.version);const rtLatest=id=>rtVers(id).pop()||null;
const rtList=()=>[...new Set(ROUT.map(r=>r.id))].map(rtLatest).sort((a,b)=>a.publishedAt<b.publishedAt?1:-1);
function activeRt(){return S.activeRoutine?rtLatest(S.activeRoutine):null}
const srcKey=()=>state.loaded?String(state.loaded):'board';
function boardSnap(){return{days:JSON.parse(JSON.stringify(DAYS.map((_,i)=>dayTilesBoard(i)))),labels:JSON.parse(JSON.stringify(DAYS.map((_,i)=>(state.labels||[])[i]||'')))}}
function defaultRtName(){const r=ROUT.filter(x=>x.source==srcKey()).sort((a,b)=>a.publishedAt<b.publishedAt?1:-1)[0];if(r)return r.name;const m=loaded();return m?m.name:'My routine'}
function publish(name){name=String(name||'').trim()||defaultRtName();const sn=boardSnap();if(!sn.days.some(d=>d.length))return null;
  const same=ROUT.find(r=>r.name.toLowerCase()==name.toLowerCase()),id=same?same.id:uid('r'),last=rtLatest(id);
  if(last&&JSON.stringify({days:last.days,labels:last.labels})==JSON.stringify(sn))return{r:last,fresh:false};
  const r={id,name,version:last?last.version+1:1,publishedAt:nowISO(),source:srcKey(),days:sn.days,labels:sn.labels,planSnap:planOf(sn.days.map(d=>d.map(t=>({id:t.id,sets:t.sets}))))};ROUT.push(r);saveR();return{r,fresh:true}}
function setActive(id){S.activeRoutine=id||null;saveS();renderStart();refreshBar()}
function dayTilesBoard(i){const m=loaded();return(state.days[i]&&state.days[i].length)?state.days[i]:(m&&m.days[i])||[]}
function dayTiles(i){const r=activeRt();return r?(r.days[i]||[]):dayTilesBoard(i)}
function order(){const r=activeRt();if(r)return DAYS.map((_,i)=>i).filter(i=>(r.days[i]||[]).length);const m=loaded(),d=m?m.days:state.days;return DAYS.map((_,i)=>i).filter(i=>(d[i]||[]).length&&dayTiles(i).length)}
function lastDone(){const r=activeRt();return L.sessions.filter(s=>(s.status=='completed'||s.status=='skipped')&&s.dayIdx!=null&&(!r||s.routineId==r.id)).sort(byT).pop()}
// session clock: paused time never counts; manual moves (adjMs) do
function elMs(s,now){const end=s.endedAt?Date.parse(s.endedAt):(now||Date.now()),p=(s.pausedMs||0)+(s.pausedAt&&!s.endedAt?end-Date.parse(s.pausedAt):0);return Math.max(0,end-Date.parse(s.startedAt)-p+(s.adjMs||0))}
const durMs=s=>s.startedAt?elMs(s):null;
function continueIdx(){const o=order();if(!o.length)return null;const l=lastDone();if(!l)return o[0];const k=o.indexOf(l.dayIdx);if(k>=0)return o[(k+1)%o.length];
  for(let j=1;j<=7;j++){const d=(l.dayIdx+j)%7;if(o.includes(d))return d}return o[0]}
const dayLabel=i=>{const r=activeRt(),l=r?(r.labels||[])[i]:(state.labels||[])[i];return DAYS[i]+(l?' · '+l:'')};
// ---------- sessions ----------
function newSet(e,kind,idx){return{id:uid('t'),entryId:e.id,sessionId:e.sessionId,idx,kind,load:null,reps:null,rir:null,done:false,doneAt:null}}
function prefill(e){const p=progression(resolve(e.exerciseId),e.sessionId);e.cue=p;const pos={warmup:0,working:0};
  L.sets.filter(x=>x.entryId==e.id).sort((a,b)=>a.idx-b.idx).forEach(x=>{const k=pos[x.kind]++;if(x.done)return;const pv=prevFor(resolve(e.exerciseId),x.kind,k,e.sessionId);
    if(pv){x.load=realIn(pv.load,sessUnit(pv.sessionId),cur.unit,e.exerciseId);x.reps=pv.reps;x.prevLoad=x.load;x.prevReps=x.reps}
    if(x.kind=='working'&&p.sugLoad!=null){x.load=conv(p.sugLoad,S.unit,cur.unit);x.reps=p.sugReps;x.sug=true}})}
function startSession(i){if(cur)return openLogger();const dw=dlActive();let tiles=dayTiles(i);if(!tiles.length)return;if(dw)tiles=deloadVersion([tiles])[0];const m=loaded();
  const rt=activeRt();const s={id:uid('s'),schema:LOG_SCHEMA,status:'active',date:nowISO(),startedAt:nowISO(),splitId:m?'my:'+m.id:undefined,...rtRef(rt),dayIdx:i,label:dayLabel(i),unit:S.unit,notes:'',snapshot:{exercises:tiles.map(t=>({exerciseId:t.id,sets:t.sets}))},planSnap:planOf(planDays()),...(dw?{deload:true,deloadStart:dw.start}:{})};
  L.sessions.push(s);cur=s;tiles.forEach((t,k)=>{const e={id:uid('e'),sessionId:s.id,order:k,exerciseId:t.id,nameSnapshot:(EX[t.id]||{}).name||t.id,repRange:[...repFor(t.id)],restSec:restFor(t.id,'working'),notes:carryNote(t.id),skipped:false};
    if(t.rir_target)e.rirTarget=[...t.rir_target];L.entries.push(e);for(let j=0;j<t.sets;j++)L.sets.push(newSet(e,'working',j));prefill(e);if(dw)dlPrefill(e)});ssCarry(s);
  const first=L.entries.find(e=>e.sessionId==s.id);openEntry=first&&first.id;activeSet=firstOpenSet(first);persist(s.id);closeModal();openLogger()}
const rtRef=r=>r?{routineId:r.id,routineVersion:r.version,routineName:r.name}:{};
function startEmpty(){if(cur)return openLogger();const s={id:uid('s'),schema:LOG_SCHEMA,status:'active',date:nowISO(),startedAt:nowISO(),dayIdx:null,label:'Empty workout',empty:true,unit:S.unit,notes:'',snapshot:{exercises:[]}};
  L.sessions.push(s);cur=s;openEntry=null;activeSet=null;persist(s.id);closeModal();openLogger();addExercise()}
function skipDays(list){const made=list.map(i=>{const m=loaded();const s={id:uid('s'),schema:LOG_SCHEMA,status:'skipped',date:nowISO(),...rtRef(activeRt()),dayIdx:i,splitId:m?'my:'+m.id:undefined,label:dayLabel(i),unit:S.unit,notes:'',snapshot:{exercises:dayTiles(i).map(t=>({exerciseId:t.id,sets:t.sets}))}};L.sessions.push(s);return s});
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
  if(v=='train'){const o=document.getElementById('lg');if(cur){if(!o.querySelector('.lg-body:not(#lg-start-pg)'))renderSession()}else renderStart()/* D.1: always fresh, so the dashboard line reads the same data as Analytics after Log edits */}
  if(v=='analytics'&&window.renderAnalytics)renderAnalytics();if(v=='log'&&window.renderLog)renderLog();/* v28: planning analytics live in Build again; Analytics = completed workouts only */
  if(v=='build'&&typeof render=='function')render();refreshBar()}
function openLogger(){closeModal();setView('train');renderSession()}
function closeLogger(){closeKp();renderStart();refreshBar()}
function renderStart(){const o=document.getElementById('lg');if(!o)return;const ad=adherence(),r=activeRt(),n=rtList().length;
  o.innerHTML=`<div class="lg-top"><b class="lg-name">Train</b></div><div class="lg-body" id="lg-start-pg">
  <div class="tr-rt" data-r="${r?H(r.id):''}" data-v="${r?r.version:''}">${r?`<small>Active routine</small><b>${H(r.name)}</b><span>v${r.version} · published ${H(new Date(r.publishedAt).toLocaleDateString())}</span>`:`<small>No routine active</small><b>Build board</b><span>${n?'Pick a published routine, or train from the board.':'Publish from Build to add routines to this library.'}</span>`}</div>
  <button class="pri lg-big" id="lg-cont"></button>
  <div class="lg-startbtns"><button id="lg-days">Choose a day…</button><button id="tr-change">${n?'Change routine…':'Routines…'}</button><button id="tr-empty">Empty workout</button><button id="lg-wkb">Week &amp; history</button></div>
  <p class="cf-hint lg-adh0">This week (logged totals): ${ad.completed} completed · ${ad.skipped} skipped · ${ad.notStarted} not started</p>${dashLine()}${dlHtml()}</div>`;dlWire(o);
  o.querySelector('#lg-cont').onclick=()=>{if(cur)return openLogger();const c=continueIdx();if(c!=null)startSession(c)};o.querySelector('#lg-days').onclick=startSheet;o.querySelector('#lg-wkb').onclick=()=>weekView();
  o.querySelector('#tr-change').onclick=routinePicker;o.querySelector('#tr-empty').onclick=startEmpty;refreshBar()}
function routinePicker(){const a=activeRt(),L_=rtList();modal(`<div id="tr-pick"><h3>Train library</h3>${L_.length?'':'<p class="cf-hint">Nothing published yet. Use Publish on Build.</p>'}
  <div class="lg-menu">${L_.map(r=>`<button data-r="${H(r.id)}" class="${a&&a.id==r.id?'on':''}"><b>${H(r.name)}</b> v${r.version}<small>${DAYS.filter((_,i)=>(r.days[i]||[]).length).join(' · ')} · ${rtVers(r.id).length} version${rtVers(r.id).length>1?'s':''}</small></button>`).join('')}<button data-r="" class="${a?'':'on'}">Build board (unpublished)</button></div>
  <div class="cf-btns"><button id="tr-x">Close</button></div></div>`);document.getElementById('tr-x').onclick=closeModal;
  document.querySelectorAll('#tr-pick .lg-menu button').forEach(b=>b.onclick=()=>{setActive(b.dataset.r);closeModal();toast(b.dataset.r?'Active routine: '+rtLatest(b.dataset.r).name:'Training from the Build board',null)})}
function publishSheet(){const nm=defaultRtName(),ex=ROUT.find(r=>r.name.toLowerCase()==nm.toLowerCase());
  modal(`<div id="pb"><h3>Publish to Train</h3><p class="cf-hint">Saves a versioned snapshot of this board to the Train library. Later board edits don't change it until you publish again.</p>
  <label>Routine name <input id="pb-n" value="${H(nm)}"></label><p class="cf-hint" id="pb-v">${ex?`Publishes ${H(ex.name)} v${rtLatest(ex.id).version+1}`:'New routine, v1'}</p>
  <div class="cf-btns"><button class="pri" id="pb-ok">Publish</button><button id="pb-x">Cancel</button></div></div>`);
  const n=document.getElementById('pb-n');n.oninput=()=>{const e=ROUT.find(r=>r.name.toLowerCase()==n.value.trim().toLowerCase());document.getElementById('pb-v').textContent=e?`Publishes ${e.name} v${rtLatest(e.id).version+1}`:'New routine, v1'};
  document.getElementById('pb-x').onclick=closeModal;document.getElementById('pb-ok').onclick=()=>{const p=publish(n.value);closeModal();if(!p){toast('Add exercises to the board first',null);return}
    if(!activeRt())S.activeRoutine=p.r.id,saveS();renderStart();toast(p.fresh?`Published ${p.r.name} v${p.r.version}`:`${p.r.name} v${p.r.version} is already up to date`,null)}}
function startTraining(){if(cur)return openLogger();const p=publish(defaultRtName());if(!p){toast('Add exercises to the board first',null);return}S.activeRoutine=p.r.id;saveS();const c=continueIdx();if(c==null)return;startSession(c)}
function buildBtns(){const a=document.querySelector('header .actions');if(!a||document.getElementById('pb-btn'))return;a.insertAdjacentHTML('afterbegin','<button id="pb-btn" title="Save a versioned snapshot of this board to the Train library">Publish</button><button id="st-btn" class="pri" title="Publish, make it the active routine and start the session clock">Start training</button>');
  document.getElementById('pb-btn').onclick=publishSheet;document.getElementById('st-btn').onclick=startTraining}
function cueHtml(e){const c=e.cue||{};const a=[];if(c.deload){const V=dlDS().deload_version;return`Deload: RIR ${V.rir_target[0]}–${V.rir_target[1]}, about ×${V.load_factor} of last time`}if(c.sugLoad!=null)a.push(`↑ Try ${fmt(c.sugLoad)}×${c.sugReps}`);else if(c.addRep)a.push(`Same load, aim for ${c.addRep} reps`);else if(c.max)a.push(exAsst(resolve(e.exerciseId))?'Least assistance on the stack: try a harder variation':'Top of your rack: try a harder variation');if(c.beat)a.push(H(c.beat));if(c.cut)a.push('Missed the range twice: consider −5%');return a.join(' · ')}
function rowHtml(e,x,n){const pv=x.kind=='working'?prevFor(resolve(e.exerciseId),'working',n.w,cur.id):prevFor(resolve(e.exerciseId),'warmup',n.u,cur.id);
  const pvs=pv?`${fmt(dLoad(pv))} × ${pv.reps}${pv.rir!=null?' @'+pv.rir:''}`:'—';const L_=conv(x.load,cur.unit,S.unit);
  const pt=prTypesOf(x.id,LP);const rirTxt=x.rir==null?(S.rpe?'RPE':'RIR'):(S.rpe?'RPE '+(10-x.rir):'@'+(x.rir==5?'5+':x.rir));const TG=tagDefs(),tg=x.tag&&TG[x.tag];
  return`<div class="lg-row${x.id==activeSet?' active':''}${x.done?' done':''}${x.kind=='warmup'?' warm':''}" data-s="${x.id}">
   <button class="lg-n" aria-label="${x.kind=='warmup'?'Warm-up set, not counted in stats. Tap to make it a working set':'Set type'}">${x.kind=='warmup'?'W':n.w+1}</button><button class="lg-prev" aria-label="Copy previous">${pvs}</button>
   <button class="lg-fld lg-load${x.sug?' sug':''}" data-f="load">${L_==null?'':fmt(L_)}<small>${S.unit}</small></button>
   <button class="lg-fld lg-reps" data-f="reps">${x.reps==null?'':x.reps}<small>reps</small></button>
   <button class="lg-rirb${x.rir==null&&!tg?'':' on'}">${rirTxt}${tg?`<small class="lg-tg" data-tag="${H(x.tag)}">${H(tagShort(tg))}</small>`:''}</button><button class="lg-ck" aria-label="Done">${pt.length?'🏆':'✓'}</button></div>${pt.length?`<div class="lg-prb" data-s="${x.id}" data-t="${pt.join(',')}">${pt.map(k=>`<span data-k="${k}">🏆 ${PRL[k]}</span>`).join('')}</div>`:''}
   ${x.sug&&!x.done?`<div class="lg-sugrow"><button class="lg-sugchip" data-s="${x.id}">↑ suggested · tap for last time</button></div>`:''}
   <div class="lg-rir" data-s="${x.id}" hidden>${[0,1,2,3,4,5].map(r=>`<button data-r="${r}" class="${x.rir===r?'on':''}">${S.rpe?10-r:(r==5?'5+':r)}</button>`).join('')}${x.kind=='working'?`<div class="lg-tags" role="group" aria-label="Set type">${Object.keys(TG).map(k=>`<button data-tag="${H(k)}" class="${x.tag==k?'on':''}" aria-pressed="${x.tag==k}">${H(TG[k].label)}</button>`).join('')}</div>`:''}</div>`}
// v29 B: set tags = rules.json logger.set_tags entries that have a label (failure, myo_rep, drop_set, partials); one tag per set
const tagDefs=()=>Object.fromEntries(Object.entries(LR().set_tags||{}).filter(([,v])=>v&&typeof v=='object'&&v.label));
const tagShort=d=>String(d.label).split(/[\s-]/)[0];
function setTag(x,k){const d=tagDefs()[k];if(!d)return;if(x.tag==k){delete x.tag;return}x.tag=k;if(d.default_rir!=null)x.rir=d.default_rir/* failure / drop set: RIR 0 */}
function cardHtml(e){const x=EX[resolve(e.exerciseId)],sets=setsOf(e.id),done=sets.filter(s=>s.done).length,open=e.id==openEntry,n={w:0,u:0};
  const rows=sets.map(s=>{const h=rowHtml(e,s,n);s.kind=='working'?n.w++:n.u++;return h}).join('');
  return`<div class="lg-card${open?' open':''}${e.skipped?' skipped':''}${x?'':' arch'}${ssLetter(e)?' ss':''}" data-e="${e.id}"${ssLetter(e)?` data-g="${ssLetter(e)}"`:''}><div class="lg-ch"><button class="lg-drag" aria-label="Drag to reorder">≡</button><button class="lg-title">${x?ICON[x.type]:'⌧'} ${H(exName(e))}${x?'':' <em>archived exercise</em>'}${e.swappedFrom?' <em>swapped</em>':''}${ssLetter(e)?` <em class="lg-ss">Superset ${ssLetter(e)}</em>`:''}</button>
   <span class="lg-cnt">${done}/${sets.length}</span><button class="lg-more" aria-label="Options">⋯</button></div>
   <div class="lg-meta"><button class="lg-chip lg-rest" aria-label="Rest time, tap to adjust">⏱ ${mmss(e.restSec)}</button><button class="lg-chip lg-rr" aria-label="Rep range, tap to adjust">${e.repRange[0]}–${e.repRange[1]} reps</button>${e.rirTarget?`<span class="lg-chip lg-dlr">RIR ${e.rirTarget[0]}–${e.rirTarget[1]}</span>`:''}</div>
   ${x&&(open||exNote(e.exerciseId))?pnHtml(resolve(e.exerciseId)):''}
   ${open&&!e.skipped?`<div class="lg-cue">${cueHtml(e)}${beatHtml(e)}</div>${wuBtn(e)}<div class="lg-sets">${rows}</div><button class="lg-addset">+ Set</button>
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
  <div class="lg-clock"><button id="lg-pause" aria-pressed="${!!cur.pausedAt}">${cur.pausedAt?'▶ Resume':'⏸ Pause'}</button><button id="lg-tmb" aria-label="Move elapsed time back 1 minute">−1 min</button><button id="lg-tmf" aria-label="Move elapsed time forward 1 minute">+1 min</button>${cur.pausedAt?'<em>Paused: not counted</em>':''}</div>
  <div class="lg-body">${es.length?'':'<p class="cf-hint lg-empty">Empty workout: add exercises as you go.</p>'}${es.map(cardHtml).join('')}<button class="lg-addex" id="lg-addex">+ Exercise</button><button class="lg-hide" id="lg-hide">Back to Build (session keeps running)</button></div>`;
  bindSession(o);tick();const a=o.querySelector('.lg-row.active');if(a&&!o._noScroll)a.scrollIntoView({block:'center'});clearTimer()}
function pauseToggle(){if(!cur)return;if(cur.pausedAt){cur.pausedMs=(cur.pausedMs||0)+Math.max(0,Date.now()-Date.parse(cur.pausedAt));delete cur.pausedAt}else cur.pausedAt=nowISO();persist(cur.id);renderSession()}
function moveClock(min){if(!cur)return;const raw=elMs({...cur,adjMs:0});cur.adjMs=Math.max(-raw,(cur.adjMs||0)+min*60000);persist(cur.id);tick()}
function moveEntry(e,to){const es=entriesOf(e.sessionId),k=es.indexOf(e);if(k<0||to<0||to>=es.length||to==k)return;es.splice(k,1);es.splice(to,0,e);es.forEach((q,i)=>q.order=i);persist(e.sessionId);renderSession()}
function dragBind(o){o.querySelectorAll('.lg-drag').forEach(h=>{h.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();const card=h.closest('.lg-card'),e=L.entries.find(x=>x.id==card.dataset.e),y0=ev.clientY;try{h.setPointerCapture(ev.pointerId)}catch{}card.classList.add('dragging');
  const mv=v=>{card.style.transform=`translateY(${v.clientY-y0}px)`},up=v=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);card.classList.remove('dragging');card.style.transform='';
    const cs=[...o.querySelectorAll('.lg-card')].filter(c=>c!==card),mid=c=>{const r=c.getBoundingClientRect();return r.top+r.height/2},y=v.clientY;const to=cs.filter(c=>mid(c)<y).length;moveEntry(e,to)};
  h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)});h.onclick=ev=>ev.stopPropagation()})}
function bindSession(o){o.querySelector('#lg-fin').onclick=summary;o.querySelector('#lg-pause').onclick=pauseToggle;o.querySelector('#lg-tmb').onclick=()=>moveClock(-1);o.querySelector('#lg-tmf').onclick=()=>moveClock(1);dragBind(o);o.querySelector('#lg-addex').onclick=addExercise;o.querySelector('#lg-hide').onclick=()=>setView('build');
  o.querySelectorAll('.lg-card').forEach(c=>{const e=L.entries.find(x=>x.id==c.dataset.e);
    c.querySelector('.lg-ch').onclick=ev=>{if(ev.target.closest('.lg-more')||ev.target.closest('.lg-drag')||ev.target.closest('.lg-title')&&e.id==openEntry)return;openEntry=e.id;activeSet=firstOpenSet(e);renderSession()};
    c.querySelector('.lg-title').addEventListener('click',ev=>{if(e.id==openEntry){ev.stopPropagation();history_(resolve(e.exerciseId),e)}});
    c.querySelector('.lg-more').onclick=ev=>{ev.stopPropagation();moreMenu(e)};
    c.querySelectorAll('.lg-chip').forEach(b=>b.onclick=ev=>{ev.stopPropagation();adjSheet(e)});bindPn(c,renderSession);
    const wn=c.querySelector('textarea[data-wn]');if(wn){wn.onclick=ev=>ev.stopPropagation();wn.oninput=()=>{e.notes=wn.value;mirror();clearTimeout(wn._t);wn._t=setTimeout(()=>persist(cur.id),400)}}const wu=c.querySelector('.lg-wu');if(wu)wu.onclick=ev=>{ev.stopPropagation();addWarmups(e)};const ad=c.querySelector('.lg-addset');if(ad)ad.onclick=()=>{const ss=setsOf(e.id),last=ss[ss.length-1],x=newSet(e,'working',(last?last.idx:-1)+1);if(last){x.load=last.load;x.reps=last.reps}L.sets.push(x);activeSet=x.id;persist(cur.id);renderSession()};
    c.querySelectorAll('.lg-row').forEach(r=>bindRow(e,r))});
  o.querySelectorAll('.lg-sugchip').forEach(b=>b.onclick=()=>{const x=L.sets.find(s=>s.id==b.dataset.s);x.load=x.prevLoad??null;x.reps=x.prevReps??x.reps;x.sug=false;persist(cur.id);renderSession()})}
function bindRow(e,r){const x=L.sets.find(s=>s.id==r.dataset.s);let sw=false;
  r.querySelector('.lg-n').onclick=()=>{if(sw)return;x.kind=x.kind=='warmup'?'working':'warmup';if(x.kind=='warmup')delete x.tag;renum(e);persist(cur.id);renderSession()};
  r.querySelector('.lg-prev').onclick=()=>{const n=work(setsOf(e.id)).indexOf(x),pv=prevFor(resolve(e.exerciseId),x.kind,n<0?setsOf(e.id).filter(s=>s.kind==x.kind).indexOf(x):n,cur.id);if(pv&&!x.done){x.load=realIn(pv.load,sessUnit(pv.sessionId),cur.unit,e.exerciseId);x.reps=pv.reps;x.sug=false;persist(cur.id);renderSession()}};
  r.querySelectorAll('.lg-fld').forEach(b=>b.onclick=()=>{if(sw)return;activeSet=x.id;openKp(e,x,b.dataset.f)});
  r.querySelector('.lg-rirb').onclick=()=>{const p=document.querySelector(`.lg-rir[data-s="${x.id}"]`);p.hidden=!p.hidden};
  document.querySelectorAll(`.lg-rir[data-s="${x.id}"] button[data-r]`).forEach(b=>b.onclick=()=>{const v=+b.dataset.r;x.rir=x.rir===v?null:v;persist(cur.id);renderSession()});
  document.querySelectorAll(`.lg-rir[data-s="${x.id}"] button[data-tag]`).forEach(b=>b.onclick=()=>{setTag(x,b.dataset.tag);persist(cur.id);renderSession();const p=document.querySelector(`.lg-rir[data-s="${x.id}"]`);if(p)p.hidden=false});
  const ck=r.querySelector('.lg-ck');let lp=null;ck.addEventListener('pointerdown',()=>{lp=setTimeout(()=>{lp='fired';editSet(e,x)},CFG.longPressMs)});
  const cl=()=>{if(lp&&lp!=='fired')clearTimeout(lp)};ck.addEventListener('pointerup',cl);ck.addEventListener('pointerleave',cl);
  ck.onclick=()=>{if(lp==='fired'){lp=null;return}if(sw)return;check(e,x)};
  let sx=null,sy=null;r.addEventListener('pointerdown',ev=>{sx=ev.clientX;sy=ev.clientY});r.addEventListener('pointermove',ev=>{if(sx==null)return;const dx=ev.clientX-sx;if(dx<0&&Math.abs(ev.clientY-sy)<30)r.style.transform=`translateX(${Math.max(dx,-CFG.swipeMaxPx)}px)`});
  r.addEventListener('pointerup',ev=>{if(sx==null)return;const dx=ev.clientX-sx;sx=null;r.style.transform='';if(dx<-70&&Math.abs(ev.clientY-sy)<30){sw=true;delSet(e,x)}})}
function renum(e){let w=0,u=0;setsOf(e.id).forEach((s,i)=>{s.idx=i})}
function delSet(e,x){const before=JSON.stringify(L.sets);L.sets=L.sets.filter(s=>s.id!==x.id);renum(e);persist(cur.id);renderSession();toast('Set deleted',()=>{L.sets=JSON.parse(before);persist(cur.id);renderSession()})}
function check(e,x){if(x.done){x.done=false;x.doneAt=null;delete x.pr;persist(cur.id);renderSession();return}if(x.reps==null||x.reps==='' ){activeSet=x.id;openKp(e,x,x.load==null?'load':'reps');return}
  x.done=true;x.doneAt=nowISO();x.sug=false;delete x.pr;{const won=prTypesOf(x.id);if(won.length)celebrate(won)}
  const sm=x.kind=='working'?ssLive(e):[];if(sm.length){const open=q=>setsOf(q.id).some(s=>!s.done),later=sm.slice(sm.indexOf(e)+1).find(open);
    if(later){openEntry=later.id;activeSet=firstOpenSet(later);persist(cur.id);renderSession();return}/* superset: straight to the partner, no rest */
    startTimer(e.restSec);const first=sm.find(open);if(first){openEntry=first.id;activeSet=firstOpenSet(first);persist(cur.id);renderSession();return}}
  else startTimer(x.kind=='warmup'?restFor(e.exerciseId,'warmup'):e.restSec);
  const nx=setsOf(e.id).find(s=>!s.done);if(nx)activeSet=nx.id;else{const es=entriesOf(cur.id).filter(q=>!q.skipped),k=es.indexOf(e),ne=es.slice(k+1).concat(es.slice(0,k)).find(q=>setsOf(q.id).some(s=>!s.done));if(ne){openEntry=ne.id;activeSet=firstOpenSet(ne)}else activeSet=null}
  persist(cur.id);renderSession()}
// v28: PRs are derived from the logged history by prs.js (port of tools/prs.py) and recomputed after every change; nothing stored is a source of truth.
let LP={};function hx(live){const ss=L.sessions.map(s=>live&&cur&&s.id==cur.id?{...s,status:'completed',endedAt:nowISO()}:s);return{schema:LOG_SCHEMA,plannedSessionsPerWeek:order().length||undefined,sessions:ss,entries:L.entries,sets:L.sets,bodyweights:BW,deloads:DLS.deloads||[],deloadPrompt:DLS.deloadPrompt||null,readiness:DLS.readiness||[]}}
function livePrs(){return cur?(detectPrs(hx(true),ALIAS,{profile:prProf()})[cur.id]||{}):{}}
function prTypesOf(setId,sp){const P=sp||livePrs(),o=[];Object.values(P).forEach(r=>PR_TYPES.forEach(k=>{if(r[k]&&r[k].set_id==setId)o.push(k)}));return o}
function recomputePrs(){const P=detectPrs(hx(false),ALIAS,{profile:prProf()}),out=[];Object.keys(P).forEach(sid=>Object.keys(P[sid]).forEach(ex=>PR_TYPES.forEach(k=>{const r=P[sid][ex][k];if(r)out.push({id:sid+'|'+ex+'|'+k,sessionId:sid,exerciseId:ex,kind:k,value:r.value,unit:k=='reps_at_load'?'reps':k=='set_volume'?'kg·reps':'kg',setId:r.set_id,load_kg:r.load_kg,reps:r.reps})})));L.prs=out;return P}
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
function openKp(e,x,f){closeKp();KP={e,x,f,fresh:true,buf:null};const k=document.createElement('div');k.id='lg-kp';document.body.appendChild(k);kpSwipe(k);drawKp();renderSession()}
function minKp(){if(cur)persist(cur.id);closeKp();renderSession()}
function kpSwipe(k){let y0=null,x0=null;k.addEventListener('pointerdown',ev=>{y0=ev.clientY;x0=ev.clientX});k.addEventListener('pointerup',ev=>{if(y0==null)return;const dy=ev.clientY-y0,dx=Math.abs(ev.clientX-x0);y0=null;if(dy>CFG.kpSwipePx&&dx<dy)minKp()});k.addEventListener('pointercancel',()=>{y0=null})}
function closeKp(){const k=document.getElementById('lg-kp');if(k)k.remove();KP=null}
function drawKp(){const k=document.getElementById('lg-kp');if(!k||!KP)return;const{e,x,f}=KP,inc=f=='load'?incFor(resolve(e.exerciseId))||1:1,v=f=='load'?conv(x.load,cur.unit,S.unit):x.reps;
  k.innerHTML=`<div class="kp-top"><span>${f=='load'?'Load ('+S.unit+')':'Reps'} · ${H(exName(e))}</span><b class="kp-val">${KP.buf!=null?H(KP.buf):v==null?'':fmt(v)}</b><button id="kp-min" aria-label="Minimize keypad">▾</button></div>${f=='load'?kpChips(e,x,v):''}<div class="kp-grid">
  ${['1','2','3','⌫','4','5','6','−'+fmt(inc),'7','8','9','+'+fmt(inc),'.','0','Done','Next'].map(b=>`<button data-k="${b}" class="${b=='Next'?'pri':''}">${b}</button>`).join('')}</div>`;
  k.querySelector('#kp-min').onclick=minKp;kpChipBind(k,e,x);k.querySelectorAll('button[data-k]').forEach(b=>b.onclick=()=>{const t=b.dataset.k;let s=v==null?'':fmt(v);
    if(t=='Done'){closeKp();persist(cur.id);renderSession();return}
    if(t=='Next'){persist(cur.id);if(f=='load'){KP.f='reps';KP.fresh=true;KP.buf=null;drawKp();renderSession();return}const ss=setsOf(e.id),i=ss.indexOf(x),nx=ss.slice(i+1).find(q=>!q.done);if(nx){activeSet=nx.id;KP.x=nx;KP.f='load';KP.fresh=true;KP.buf=null;drawKp();renderSession()}else{closeKp();renderSession()}return}
    // v28: typed keys edit a text buffer (KP.buf), so a decimal point survives until the next digit (101.5 was logged as 1015)
    const base=KP.fresh?'':(KP.buf!=null?KP.buf:s);let n;
    if(t[0]=='−'||t[0]=='+'){n=Math.max(0,Math.round(((v||0)+(t[0]=='+'?inc:-inc))*1e6)/1e6);KP.buf=null}
    else if(t=='⌫'){const b=base.slice(0,-1);KP.buf=b;n=b===''||b==='.'?null:parseFloat(b)}
    else{if(t=='.'&&(f!='load'||base.includes('.')))return;if(f=='load'&&/\.\d\d$/.test(base))return;const b=(t=='.'&&base==='')?'0.':(base==='0'&&t!='.'?t:base+t);KP.buf=b;n=parseFloat(b)}KP.fresh=false;
    if(f=='load'){x.load=n==null?null:conv(n,S.unit,cur.unit);x.sug=false}else x.reps=n==null?null:Math.round(n);drawKp();const o=document.getElementById('lg');if(o){o._noScroll=true;renderSession();o._noScroll=false}})}
// v29 A quick weight picker (#10) + plate calculator toggle (#6): one chip row on the load keypad. Every chip is a weight the gym has
// (gym profile; the v8 load_step grid where the profile doesn't describe the equipment). Plates: loads.js plateBreakdown (= tools/loads.py).
function kpPick(e,x,v){const id=resolve(e.exerciseId),c=e.cue||{},o=[],g=gymP(),last=x.prevLoad!=null?conv(x.prevLoad,cur.unit,S.unit):null;
  if(last!=null)o.push(['last','Last',last]);const sg=x.kind=='working'?(c.sugLoad!=null?c.sugLoad:c.holdLoad!=null?c.holdLoad:null):null;if(sg!=null)o.push(['sug','Suggested',sg]);
  const nx=realStep(id,v??last??0,1);if(nx!=null)o.push(['next','Next',nx]);else if(v!=null)o.push(['max',exAsst(id)?'Least assist':'Max',null]);/* CoS: nothing further on the stack -> a label, no empty value */return o}
function kpChips(e,x,v){const id=resolve(e.exerciseId),g=gymP(),pl=LD_PLATE.includes(exEq(id))&&(g.plates||[]).length;
  const b=kpPick(e,x,v).map(([k,l,w])=>w==null?`<button class="kp-chip kp-end" data-c="${k}" disabled>${l}</button>`:`<button class="kp-chip" data-c="${k}" data-w="${w}"><small>${l}</small> ${fmt(w)}</button>`).join('');
  let pt='';if(pl&&S.kpPlates&&v!=null){const pb=plateBreakdown(Math.round(conv(v,S.unit,g.unit||S.unit)*1e6)/1e6,g,exEq(id),id),side=pb.per_side||pb.on_sleeve||[];
    pt=`<div class="kp-plates" data-exact="${pb.exact}" data-load="${pb.load}" data-side="${side.join(',')}">${pb.exact?'':`Can't build ${fmt(v)} · nearest below ${fmt(conv(pb.load,g.unit||S.unit,S.unit))} ${S.unit}: `}${pb.bar?`bar ${fmt(pb.bar)} + `:''}${side.length?(pb.per_side?'per side ':'on sleeve ')+side.map(fmt).join(' · '):'no plates'} <small>${H(g.unit||S.unit)}</small></div>`}
  return`<div class="kp-chips">${b}${pl?`<button class="kp-chip kp-pl${S.kpPlates?' on':''}" aria-pressed="${!!S.kpPlates}">Plates</button>`:''}</div>${pt}`}
function kpChipBind(k,e,x){k.querySelectorAll('.kp-chip[data-w]').forEach(b=>b.onclick=()=>{x.load=conv(+b.dataset.w,S.unit,cur.unit);x.sug=false;KP.buf=null;KP.fresh=true;drawKp();const o=document.getElementById('lg');if(o){o._noScroll=true;renderSession();o._noScroll=false}});
  const pl=k.querySelector('.kp-pl');if(pl)pl.onclick=()=>{S.kpPlates=!S.kpPlates;saveS();drawKp()}}
// v29 A gym profile sheet (#4): everything his gym has, in one sheet. Lists are typed as text: "5, 10, 15" and plates as "45×4, 25×2" (weight × pairs).
const gpL=a=>(a||[]).join(', '),gpP=a=>(a||[]).map(p=>`${p.weight}×${p.pairs}`).join(', ');
const gpNums=s=>{const v=String(s||'').split(/[,\s]+/).filter(Boolean).map(Number);return v.every(n=>isFinite(n)&&n>=0)?v:null};
const gpPairs=s=>{const o=[];for(const t of String(s||'').split(',').map(q=>q.trim()).filter(Boolean)){const m=t.match(/^([\d.]+)\s*[×x*]\s*(\d+)$/);if(!m)return null;o.push({weight:+m[1],pairs:+m[2]})}return o};
function gymSheet(){const g=gymP(),st=g.stacks||{},sk=k=>st[k]||{},own=(S.gymProfiles||[]).some(x=>x.id==S.activeGymId),BK=Object.keys((LR().gym_profile_default||{})[S.unit]?.bars||g.bars||{});
  modal(`<div id="lg-gym"><h3>Gym profile</h3><p class="cf-hint">Suggestions, the weight picker and the plate calculator only use weights listed here.${own?'':' Showing the default gym until you save.'}</p>
  <label>Name<input id="gp-name" value="${H(g.name||'')}"></label><label>Unit <span class="lg-seg">${['lb','kg'].map(u=>`<button data-gu="${u}" class="${(g.unit||S.unit)==u?'on':''}">${u}</button>`).join('')}</span></label>
  <label>Dumbbells (per hand)<input id="gp-db" inputmode="decimal" value="${gpL(g.dumbbells)}"></label><label>Kettlebells<input id="gp-kb" inputmode="decimal" value="${gpL(g.kettlebells)}"></label>
  <label>Plates (weight × pairs)<input id="gp-pl" value="${gpP(g.plates)}"></label><label>Microplates<input id="gp-mp" value="${gpP(g.microplates)}"></label>
  <div class="gp-bars">${BK.map(k=>`<label>${H(k)}<input data-bar="${H(k)}" inputmode="decimal" value="${(g.bars||{})[k]??''}"></label>`).join('')}<label>EZ bar<input id="gp-ez" inputmode="decimal" value="${(g.bar_by_exercise||{})['ez-bar-curl']??''}"></label></div>
  ${['machine','cable'].map(k=>`<label>${k=='machine'?'Machine':'Cable'} stack: start, step, count, add-ons<input data-st="${k}" value="${sk(k).weights?gpL(sk(k).weights):[sk(k).start,sk(k).step,sk(k).count].filter(v=>v!=null).join(', ')}${(sk(k).add_ons||[]).length?' + '+gpL(sk(k).add_ons):''}"></label>`).join('')}
  <p class="cf-hint gp-err" hidden></p><div class="cf-btns"><button class="pri" id="gp-save">Save</button>${own?'<button id="gp-reset">Use default</button>':''}<button id="gp-x">Cancel</button></div></div>`);
  let unit=g.unit||S.unit;document.querySelectorAll('[data-gu]').forEach(b=>b.onclick=()=>{unit=b.dataset.gu;document.querySelectorAll('[data-gu]').forEach(q=>q.classList.toggle('on',q==b))});
  document.getElementById('gp-x').onclick=closeModal;const rs=document.getElementById('gp-reset');if(rs)rs.onclick=()=>{S.gymProfiles=(S.gymProfiles||[]).filter(x=>x.id!=S.activeGymId);S.activeGymId=null;saveS();closeModal();refreshKp()};
  document.getElementById('gp-save').onclick=()=>{const v=id=>document.getElementById(id).value,err=m=>{const e=document.querySelector('#lg-gym .gp-err');e.textContent=m;e.hidden=false};
    const db=gpNums(v('gp-db')),kb=gpNums(v('gp-kb')),pl=gpPairs(v('gp-pl')),mp=gpPairs(v('gp-mp'));if(!db||!kb)return err('Dumbbells and kettlebells: numbers separated by commas.');if(!pl||!mp)return err('Plates: weight × pairs, e.g. 45×4, 25×2.');
    const bars={};for(const i of document.querySelectorAll('#lg-gym [data-bar]')){const n=i.value===''?0:+i.value;if(!isFinite(n)||n<0)return err('Bar weights must be numbers.');bars[i.dataset.bar]=n}
    const be={...(g.bar_by_exercise||{})};if(v('gp-ez')==='')delete be['ez-bar-curl'];else{if(!isFinite(+v('gp-ez')))return err('EZ bar must be a number.');be['ez-bar-curl']=+v('gp-ez')}
    const stacks={...st};for(const i of document.querySelectorAll('#lg-gym [data-st]')){const[a,b]=i.value.split('+'),n=gpNums(a),ad=b==null?[]:gpNums(b);if(!n||!ad)return err('Stacks: start, step, count (+ add-ons).');
      if(!n.length){delete stacks[i.dataset.st];continue}const old=st[i.dataset.st]||{};stacks[i.dataset.st]=old.weights?{weights:n}:(n.length==3?{start:n[0],step:n[1],count:n[2]}:{weights:n});if(ad.length)stacks[i.dataset.st].add_ons=ad}
    const id=(S.gymProfiles||[]).some(x=>x.id==S.activeGymId)?S.activeGymId:uid('g');const np={id,name:v('gp-name').trim()||'My gym',unit,dumbbells:db,kettlebells:kb,plates:pl,microplates:mp,bars,bar_by_exercise:be,stacks};
    S.gymProfiles=(S.gymProfiles||[]).filter(x=>x.id!=id).concat([np]);S.activeGymId=id;saveS();closeModal();refreshKp();toast(`Saved ${np.name}`,null)}}
function refreshKp(){recomputePrs()/* D.1: PR ties use the active gym profile */;if(cur){entriesOf(cur.id).forEach(prefillKeep);if(document.getElementById('lg'))renderSession()}}
// ---------- rest timer (timestamps; survives reload/lock) ----------
function startTimer(sec){const t={start:Date.now(),end:Date.now()+sec*1000};localStorage.setItem(TKEY,JSON.stringify(t));tick();requestAnimationFrame(clearTimer)}
const plural=(n,w)=>`${n} ${w}${n==1?'':'s'}`;
// keep the active row (or the last row) above the floating rest-timer bar
function clearTimer(){const t=document.getElementById('lg-timer'),b=document.querySelector('#lg .lg-body');if(!t||!b)return;const top=t.getBoundingClientRect().top,gap=CFG.timerGapPx;
  b.style.paddingBottom=Math.max(parseFloat(getComputedStyle(b).paddingBottom)||0,t.offsetHeight+2*gap)+'px';const r=b.querySelector('.lg-row.active')||[...b.querySelectorAll('.lg-row')].pop();if(!r)return;const d=r.getBoundingClientRect().bottom-(top-gap);if(d>0)b.scrollBy(0,d)}
function timer(){try{return JSON.parse(localStorage.getItem(TKEY))}catch{return null}}
function tick(){const el=document.getElementById('lg-el');if(el&&cur&&cur.startedAt){const m=Math.floor(elMs(cur)/1000);el.textContent=Math.floor(m/60)+':'+String(m%60).padStart(2,'0');el.dataset.ms=elMs(cur);el.classList.toggle('paused',!!cur.pausedAt)}
  const t=timer();let p=document.getElementById('lg-timer');if(!t||!cur){if(p)p.remove();return}const left=Math.ceil((t.end-Date.now())/1000);
  if(!p){p=document.createElement('div');p.id='lg-timer';p.innerHTML=`<span class="tm-t"></span><button data-t="-">−15s</button><button data-t="+">+15s</button><button data-t="x">Skip</button>`;document.body.appendChild(p);
    p.querySelectorAll('button').forEach(b=>b.onclick=()=>{const q=timer();if(!q)return;if(b.dataset.t=='x'){localStorage.removeItem(TKEY);p.remove();return}q.end+=(b.dataset.t=='+'?15:-15)*1000;localStorage.setItem(TKEY,JSON.stringify(q));tick()})}
  const T=p.querySelector('.tm-t');if(left>0){T.textContent='Rest '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0');p.classList.remove('flash')}else{T.textContent='Rest done';if(!p.classList.contains('flash')){p.classList.add('flash');beep()}if(left<-8){localStorage.removeItem(TKEY);p.remove()}}}
function beep(){if(!S.sound)return;try{const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator();o.connect(a.destination);o.start();o.stop(a.currentTime+CFG.beepMs/1000)}catch{}}
setInterval(tick,250);
// ---------- card menu: swap / skip / note / rest / rep range / increment / history ----------
// ---------- options sheet (⋯ / title): actions, permanent note, how-to, history chart (metric switch) + swipeable list ----------
const METRICS=[['e1rm','e1RM'],['maxw','Max weight'],['bestvol','Best-set volume'],['totvol','Total volume'],['reps','Best reps']];let metric=METRICS[0][0];
function metricOf(q,m){const w=work(q.sets).filter(x=>x.reps);if(!w.length)return null;const lb=effLb,u=v=>conv(v,'lb',S.unit),wk=k=>w.filter(x=>tagOk(x,k)),mxv=a=>a.length?Math.max(...a):null;
  if(m=='e1rm'){const b=bestOf(q.sets);return b?u(b.v):null}if(m=='maxw'){const v=mxv(wk('weight').map(lb));return v==null?null:u(v)}if(m=='bestvol'){const v=mxv(wk('set_volume').map(x=>lb(x)*x.reps));return v==null?null:u(v)}
  if(m=='totvol')return u(w.reduce((a,x)=>a+lb(x)*x.reps,0));if(m=='reps')return Math.max(...w.map(x=>x.reps));return null}
function metricSeries(id,m){return hist(id).reverse().map(q=>metricOf(q,m))}
function howtoHtml(id){const x=EX[id],h=x&&!x.custom&&x.howto;const img=h&&typeof h.image=='string'&&/^img\//.test(h.image)?h.image:null;
  const pic=img?`<img class="lg-pic" src="${H(img)}" alt="${H(x.name)}">`:`<div class="lg-pic ph" role="img" aria-label="No picture yet">No picture yet</div>`;
  const txt=h&&h.setup?`<div class="lg-howto"><p class="ht-setup"><b>Setup</b> ${H(h.setup)}</p>${Array.isArray(h.cues)&&h.cues.length?`<ul class="ht-cues">${h.cues.map(c=>`<li>${H(c)}</li>`).join('')}</ul>`:''}${h.mistake?`<p class="ht-mis"><b>Common mistake</b> ${H(h.mistake)}</p>`:''}</div>`
    :`<p class="lg-howto ph">No how-to for this exercise yet${x&&x.custom?' (custom exercise)':''}.</p>`;return`<div class="lg-ht">${pic}${txt}</div>`}
function histHtml(id,e){const h=hist(id).reverse(),nm=(EX[id]||{}).name||(e&&e.nameSnapshot)||id,f=e1Formula();const pts=metricSeries(id,metric),ml=METRICS.find(q=>q[0]==metric)[1];
  const vals=pts.filter(v=>v!=null),mx=Math.max(...vals,0)||1,mn=vals.length?Math.min(...vals):0,W=300,Hh=110,px=i=>h.length<2?W/2:10+i*(W-20)/(h.length-1),py=v=>Hh-10-(mx==mn?1/2:(v-mn)/(mx-mn))*(Hh-20);
  const line=pts.map((v,i)=>v==null?null:`${px(i).toFixed(1)},${py(v).toFixed(1)}`).filter(Boolean).join(' ');const bu=v=>fmt(conv(v,'lb',S.unit));
  const best=h.flatMap(q=>work(q.sets).filter(s=>s.reps&&s.reps<=LR().e1rm_max_reps&&tagOk(s,'e1rm')).map(s=>({s,v:e1rm(effLb(s),s.reps),d:q.s.date}))).sort((a,b)=>b.v-a.v).slice(0,5);
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
function moreMenu(e){const id=resolve(e.exerciseId),x=EX[id];const draw=()=>{modal(`<div id="lg-opt"><h3>${H(exName(e))}</h3><div class="lg-menu lg-acts">${x?'<button data-a="swap">Swap</button>':''}<button data-a="skip">${e.skipped?'Unskip exercise':'Skip exercise'}</button><button data-a="up">Move up</button><button data-a="down">Move down</button>${e.group&&ssMembers(e).length>=2?'<button data-a="unlink">Unlink superset</button>':entriesOf(cur.id).indexOf(e)<entriesOf(cur.id).length-1?'<button data-a="link">Superset with next</button>':''}</div>
  ${x?pnHtml(id):''}${howtoHtml(id)}${histHtml(id,e)}<div class="cf-btns"><button id="mm-x">Close</button></div></div>`);
  document.getElementById('mm-x').onclick=()=>{closeModal();renderSession()};bindPn(document.getElementById('lg-opt'),draw);bindHist(draw);
  document.querySelectorAll('#lg-opt .lg-acts button').forEach(b=>b.onclick=()=>{const a=b.dataset.a;if(a=='swap')return swapMenu(e);
    if(a=='skip'){e.skipped=!e.skipped;closeModal();persist(cur.id);renderSession()}if(a=='link'||a=='unlink'){a=='link'?ssLink(e):ssUnlink(e);closeModal();persist(cur.id);renderSession()}if(a=='up'||a=='down'){const k=entriesOf(cur.id).indexOf(e);closeModal();moveEntry(e,k+(a=='up'?-1:1))}})};draw()}
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
// ---------- v29 C: warm-up ramp (warmup.js = tools/warmup.py) ----------
// working load = first working set of the entry (session unit); warm = prime mover done earlier in this session; loads from the gym profile
function wuPlan(e){if(!cur||e.skipped)return[];const ss=setsOf(e.id);if(ss.some(s=>s.kind=='warmup'))return[];const w=ss.find(s=>s.kind=='working');if(!w||w.load==null||w.load==='')return[];
  const id=resolve(e.exerciseId),before=entriesOf(cur.id).filter(q=>q.id!=e.id&&!q.skipped&&setsOf(q.id).some(s=>s.kind=='working'&&s.done)).map(q=>resolve(q.exerciseId));
  const g=gymP();return warmupSets(id,+w.load,cur.unit,g,isWarm(id,before)).map(r=>({...r,load:Math.round(conv(r.load,g.unit||cur.unit,cur.unit)*1e6)/1e6}))}
function wuBtn(e){const r=wuPlan(e);return r.length?`<button class="lg-wu" data-n="${r.length}" aria-label="Add warm-up sets">+ Warm-up · ${r.map(s=>`${fmt(conv(s.load,cur.unit,S.unit))}×${s.reps}`).join(', ')}</button>`:''}
function addWarmups(e){const r=wuPlan(e);if(!r.length)return;const before=JSON.stringify(L.sets),ss=setsOf(e.id);ss.forEach(s=>s.idx+=r.length);
  const ws=r.map((q,i)=>Object.assign(newSet(e,'warmup',i),{load:q.load,reps:q.reps}));L.sets.push(...ws);activeSet=ws[0].id;persist(cur.id);renderSession();
  toast(`Added ${plural(ws.length,'warm-up set')}`,()=>{L.sets=JSON.parse(before);activeSet=firstOpenSet(e);persist(cur.id);renderSession()})}
// ---------- v29 C: supersets (#11): entry.group links 2+ exercises; alternate, rest only after the last exercise of the group ----------
const ssMembers=e=>e&&e.group?entriesOf(e.sessionId).filter(q=>q.group==e.group):[];
const ssLive=e=>{const m=ssMembers(e);return m.length>=2?m.filter(q=>!q.skipped):[]};
function ssLetter(e){const gs=[];entriesOf(e.sessionId).forEach(q=>{if(q.group&&ssMembers(q).length>=2&&!gs.includes(q.group))gs.push(q.group)});const k=gs.indexOf(e.group);return k<0?'':String.fromCharCode(65+k%26)}
function ssLink(e){const es=entriesOf(e.sessionId),k=es.indexOf(e),nx=es[k+1];if(!nx)return;const g=e.group||nx.group||uid('g');
  [e.group,nx.group].filter(x=>x&&x!=g).forEach(old=>es.forEach(q=>{if(q.group==old)q.group=g}));e.group=g;nx.group=g}
function ssUnlink(e){const g=e.group;delete e.group;const rest=entriesOf(e.sessionId).filter(q=>q.group==g);if(rest.length<2)rest.forEach(q=>delete q.group)}
// links carry to the next session of the same routine day (matched by exercise)
function ssCarry(s){const prev=L.sessions.filter(q=>q.id!=s.id&&q.status!='active'&&q.dayIdx===s.dayIdx&&(q.routineId||null)===(s.routineId||null)).sort(byT).pop();if(!prev)return;
  const gOf={};entriesOf(prev.id).forEach(q=>{if(q.group)gOf[resolve(q.exerciseId)]=q.group});const es=entriesOf(s.id),map={};
  es.forEach(q=>{const g=gOf[resolve(q.exerciseId)];if(g){map[g]=map[g]||uid('g');q.group=map[g]}});es.forEach(q=>{if(q.group&&es.filter(z=>z.group==q.group).length<2)delete q.group})}
// ---------- swap ----------
function doSwap(e,nid){if(!cur||!EX[nid])return;const ss=setsOf(e.id),done=ss.filter(s=>s.done),rest=ss.filter(s=>!s.done);
  let ne;if(!done.length){if(!e.swappedFrom)e.swappedFrom=e.exerciseId;e.exerciseId=nid;e.nameSnapshot=EX[nid].name;e.repRange=[...repFor(nid)];e.restSec=restFor(nid,'working');e.notes=carryNote(nid);ne=e}
  else{ne={id:uid('e'),sessionId:cur.id,order:e.order+1/2,exerciseId:nid,nameSnapshot:EX[nid].name,swappedFrom:e.swappedFrom||e.exerciseId,repRange:[...repFor(nid)],restSec:restFor(nid,'working'),notes:carryNote(nid),skipped:false,...(e.group?{group:e.group}:{})};L.entries.push(ne);rest.forEach((s,i)=>{s.entryId=ne.id;s.idx=i});entriesOf(cur.id).forEach((q,i)=>q.order=i)}
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
  return{hard:all.filter(isHard).length,doneW,planned,skippedW,beat:es.map(e=>beatOf(e)).filter(b=>b=='▲').length,prs:(()=>{const P=cur&&s.id==cur.id?livePrs():(detectPrs(hx(false),ALIAS,{profile:prProf()})[s.id]||{});return Object.keys(P).flatMap(ex=>PR_TYPES.filter(k=>P[ex][k]).map(k=>({ex,k,r:P[ex][k]})))})(),
    min:Math.round(elMs(s)/60000)}}
function summary(){closeKp();const ot=document.getElementById('toast');if(ot)ot.remove();const s=cur,st=sessStats(s),rows=s.dayIdx==null?[]:diffRows(s)/* empty workout: nothing to write back */,m=loaded();
  modal(`<div id="lg-sum"><h3>Finish ${H(s.label)}</h3><div class="lg-stats"><span>${st.min} min</span><span>${plural(st.hard,'hard set')}</span><span>${st.doneW}/${st.planned} planned working sets${st.skippedW?` · ${st.skippedW} skipped`:''}</span><span>${st.beat} beat last time</span></div>
  ${st.prs.length?`<h4>PRs</h4><ul class="lg-sumpr">${st.prs.map(p=>`<li data-k="${p.k}" data-x="${H(p.ex)}">🏆 ${H((EX[p.ex]||{}).name||p.ex)}: ${PRL[p.k]} · ${prVal(p.k,p.r)}</li>`).join('')}</ul>`:''}
  <label>Session notes<textarea id="sm-n">${H(s.notes||'')}</textarea></label>
  <h4>Write back to routine</h4>${rows.length?`<p class="cf-hint">Structural changes only (loads, reps and RIR are never written back).</p><div class="lg-diff">${rows.map((r,i)=>`<label><input type="checkbox" data-i="${i}" checked> ${H(r.txt)}</label>`).join('')}</div>
   <div class="lg-wb">${m?`<label><input type="radio" name="wb" value="split"> Update loaded split '${H(m.name)}'</label>`:''}<label><input type="radio" name="wb" value="board"> Apply to this board only</label><label><input type="radio" name="wb" value="none" checked> Don't apply</label></div>`:'<p class="cf-hint">No structural changes.</p>'}
  <div class="cf-btns"><button class="pri" id="sm-ok">Save session</button><button id="sm-back">Keep logging</button><button id="sm-del" class="dng">Discard session</button></div></div>`);
  document.getElementById('sm-back').onclick=()=>{closeModal();renderSession()};document.getElementById('sm-del').onclick=()=>{if(confirm('Discard this session? Logged sets will be deleted.'))discard()};
  document.getElementById('sm-ok').onclick=()=>{s.notes=document.getElementById('sm-n').value;const pick=(document.querySelector('input[name=wb]:checked')||{}).value||'none';const sel=rows.filter((r,i)=>{const c=document.querySelector(`.lg-diff input[data-i="${i}"]`);return c&&c.checked});
    if(s.pausedAt){s.pausedMs=(s.pausedMs||0)+Math.max(0,Date.now()-Date.parse(s.pausedAt));delete s.pausedAt}s.status='completed';s.endedAt=nowISO();s.writeBack=rows.length?pick:'none';
    L.sets.filter(x=>x.sessionId==s.id).forEach(x=>{delete x.sug;delete x.prevLoad;delete x.prevReps});localStorage.removeItem(TKEY);const sid=s.id;cur=null;persist(sid);closeModal();closeLogger();
    vsSheet(sid);if(pick!='none'&&sel.length)writeBack(s,sel,pick);else toast('Session saved',null)}}
// ---------- v29 D: "vs last time" finish summary (#8; review.js finishSummary = tests/v29d_ref.py on prs.py) ----------
const sgn=(v,d=1)=>{const r=Math.round(v*10**d)/10**d;return(r>0?'+':r<0?'−':'±')+String(Math.abs(r))};
function vsRows(sid){return finishSummary(hx(false),sid,{aliases:ALIAS,exercises:EX,profile:prProf()})||[]}
const VSA={up:'▲',down:'▼',flat:'▶',first:'•'},VSB={e1rm:'e1RM',set_volume:'top-set volume',reps:'reps',volume:'session vol'};
/* D.1: a top-set load change within logger.prs.tie (step_fraction x real step: active gym profile gap, else load_step) is a tie, the
   same test prs.py uses for weight PRs: shown as ±0, and the e1RM / set-volume change is shown from the reps alone. */
function vsTie(r,unit){if(r.d_load_kg==null||r.top_load_kg==null||r.last_top_load_kg==null)return false;const R=prRules();
  return Math.abs(r.top_load_kg-r.last_top_load_kg)<=R.sf*prStepKg({ex:r.exercise,added_kg:r.top_load_kg},unit||S.unit,R,prProf(),{exercises:EX})+PRS_EPS}
function vsDisp(r,unit){const tie=vsTie(r,unit);if(!tie||r.status=='first')return{tie:false,pct:r.d_basis_pct,st:r.status};const R=prRules(),L_=r.top_load_kg;let pct=r.d_basis_pct;
  if(r.basis=='e1rm'){const a=prE1(L_,r.top_reps,R),b=prE1(L_,r.last_top_reps,R);pct=b>PRS_EPS?(a-b)/b*100:null}else if(r.basis=='set_volume'||r.basis=='reps')pct=r.last_top_reps>0?(r.top_reps-r.last_top_reps)/r.last_top_reps*100:null;
  const st=pct==null?r.status:Math.abs(pct)<=rvFlat()+1e-9?'flat':pct>0?'up':'down';return{tie,pct,st}}
function vsSheet(sid){const s=L.sessions.find(x=>x.id==sid);if(!s)return;const u=s.unit||S.unit,rows=vsRows(sid);if(!rows.length)return;const k=v=>conv(v,'kg',u);
  modal(`<div id="lg-vs" data-s="${H(sid)}"><h3>vs last time</h3><p class="cf-hint">${H(s.label||'')} · each exercise against the last time you did it (warm-ups not counted; deload sessions skipped).</p><ul class="vs-l">${rows.map(r=>{const nm=H((EX[r.exercise]||{}).name||r.exercise),top=r.top_load_kg==null?'drops/partials only':`${r.top_load_kg>PRS_EPS?fmt(k(r.top_load_kg)):'BW'}×${r.top_reps}`,pr=r.prs.length?` <span class="vs-pr" data-n="${r.prs.length}">🏆 ${r.prs.map(x=>PRL[x]).join(', ')}</span>`:'';
    if(r.status=='first')return`<li class="vs-r first" data-x="${H(r.exercise)}" data-st="first"><b>${nm}</b><span>${top} · first time</span>${pr}</li>`;
    const v=vsDisp(r,u),dl=v.tie?0:r.d_load_kg;
    return`<li class="vs-r ${v.st}" data-x="${H(r.exercise)}" data-st="${r.status}" data-show="${v.st}" data-tie="${v.tie?1:0}" data-basis="${r.basis}" data-dl="${r.d_load_kg}" data-dr="${r.d_reps}" data-dv="${r.d_volume_kg}" data-de="${r.d_e1rm_kg}" data-pct="${r.d_basis_pct}" data-deload="${r.last_deload?1:0}"><b><i class="vs-a" aria-label="${v.st}">${VSA[v.st]}</i> ${nm}${r.last_deload?' <em class="vs-dl">(deload)</em>':''}</b><span>${top}${r.d_load_kg!=null?` <em class="vs-d">(${sgn(k(dl))} ${u}, ${sgn(r.d_reps,0)} rep${Math.abs(r.d_reps)==1?'':'s'})</em>`:''} · ${VSB[r.basis]} ${v.pct!=null?sgn(v.pct)+'%':r.basis=='reps'?sgn(r.d_reps,0):'–'}${r.basis!='volume'?` · session vol ${sgn(k(r.d_volume_kg),0)} ${u}`:''}</span>${pr}</li>`}).join('')}</ul>
  <div class="cf-btns"><button class="pri" id="vs-x">Close</button></div></div>`);document.getElementById('vs-x').onclick=closeModal}
// ---------- v29 D: planned vs done (#9). Plan = the days Train uses (active routine, else the Build board); done = credited hard sets ----------
function planDays(){return DAYS.map((_,i)=>(dayTiles(i)||[]).map(t=>({id:t.id,sets:t.sets})))}
const todayYmd=()=>prLocalDate(nowISO());
const planOf=days=>plannedSets(days,L,{exercises:EX}).per_muscle;
/* D2: planned-sets snapshots taken at Publish (routine version) and Start (session); finished weeks compare with the latest one before they ended */
function planSnaps(){return[...ROUT.filter(r=>r.planSnap).map(r=>({at:r.publishedAt,per_muscle:r.planSnap})),...L.sessions.filter(s=>s.planSnap).map(s=>({at:s.startedAt||s.date,per_muscle:s.planSnap}))]}
function planVsDone(wk){wk=wk||weekKey();const pl=weekPlan(planDays(),wk,todayYmd(),planSnaps(),L,{exercises:EX});return{pl,dash:planDash(pl,weekAnalytics(wk).hard_sets.per_muscle)}}
// ---------- v29 E: suggested deload (deload.js = tools/deload.py) ----------
function dlActive(){const t=todayYmd();return(DLS.deloads||[]).find(d=>dlD(d.start)<=t&&t<=dlD(d.end))||null}
function dlCheckNow(){return deloadCheck(hx(false),todayYmd(),{aliases:ALIAS})}
// reasons with points, most points first (ties: rules order), at most 3
function dlReasons(c){const s=c.signals||{},D=dlDS(),a=[],P=s.performance,W=s.weeks_since_deload,Rr=s.rir_drift,Hs=s.hard_sets_over_target,Rd=s.readiness;
  if(W&&W.points)a.push([W.points,0,`${Math.floor(W.weeks)} weeks since your ${(DLS.deloads||[]).length?'last deload':'first logged session'}`]);
  if(P&&P.points)a.push([P.points,1,P.points==D.performance.points_dropping?`${P.dropping} of ${P.lifts} lifts dropping`:`${P.dropping+P.stalled} of ${P.lifts} lifts stalled or dropping`]);
  if(Rr&&Rr.points)a.push([Rr.points,2,`same loads at lower RIR on ${Rr.exercises.length} exercises`]);
  if(Hs&&Hs.points)a.push([Hs.points,3,`hard sets over target on ${D.hard_sets_over_target.min_muscles}+ muscles for ${Hs.weeks.length} weeks`]);
  if(Rd&&Rd.points)a.push([Rd.points,4,`readiness averaging ${Rd.mean.toFixed(1)}/5`]);
  return a.sort((x,y)=>y[0]-x[0]||x[1]-y[1]).slice(0,3).map(z=>z[2])}
const dlLabel=k=>(dlDS().prompt.choices[k]||k).split(':')[0];
function dlHtml(){const D=dlDS(),V=D.deload_version,w=dlActive();if(!D.prompt)return'';const dd=v=>new Date(dlD(v)+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
  if(w)return`<div class="dl-on" data-end="${H(dlD(w.end))}"><b>Deload week through ${H(dd(w.end))}</b><span>Sessions use the lighter version: sets ×${V.sets_factor} (rounded up), RIR ${V.rir_target[0]}–${V.rir_target[1]}, loads ×${V.load_factor} rounded down to real loads.</span></div>`;
  const c=dlCheckNow();if(!c.suggest)return'';const rs=dlReasons(c);
  return`<div id="dl-prompt" data-score="${c.score}" data-max="${D.score_max}" data-n="${rs.length}"><b>Suggested deload <small>score ${c.score}/${D.score_max}</small></b>
   <p class="dl-copy">${H(D.prompt.copy.replace('<top reasons>',rs.join('; ')))}</p>
   <p class="dl-ver">Deload version for ${V.days_length} days: same exercises and days, sets ×${V.sets_factor} (rounded up, min 1), RIR ${V.rir_target[0]}–${V.rir_target[1]}, loads ×${V.load_factor} rounded down to real loads.</p>
   <p class="dl-evs">${D.evidence_short?`<span class="dl-short">${H(D.evidence_short)}</span> `:''}${D.evidence_note?`<button type="button" class="dl-why" aria-expanded="false" aria-controls="dl-ev">Why?</button>`:''}</p>
   ${D.evidence_note?`<p class="dl-ev" id="dl-ev" hidden>${H(D.evidence_note)}</p>`:''}
   <div class="cf-btns"><button class="pri" id="dl-use">${H(dlLabel('use'))}</button><button id="dl-delay">${H(dlLabel('delay'))}</button><button id="dl-later">${H(dlLabel('later'))}</button></div></div>`}
function dlChoose(k){const before=JSON.stringify(DLS),g=applyChoice({deloads:DLS.deloads||[],deloadPrompt:DLS.deloadPrompt},k,todayYmd());DLS.deloads=g.deloads||[];DLS.deloadPrompt=g.deloadPrompt;saveDL();renderStart();
  toast(k=='use'?'Deload week started: sessions use the lighter version':k=='delay'?`Deload prompt snoozed until ${dlD(g.deloadPrompt.snoozedUntil)}`:'We will ask again tomorrow',()=>{DLS=JSON.parse(before);saveDL();renderStart()})}
function dlWire(o){[['use','#dl-use'],['delay','#dl-delay'],['later','#dl-later']].forEach(([k,s])=>{const b=o.querySelector(s);if(b)b.onclick=()=>dlChoose(k)});
  /* v29.1: Why? expands / collapses rules.json deload_signals.evidence_note (verbatim) */const w=o.querySelector('.dl-why'),n=o.querySelector('#dl-ev');if(w&&n)w.onclick=()=>{const open=n.hidden;n.hidden=!open;w.setAttribute('aria-expanded',String(open))}}
// deload session loads: last working load (top set of the latest non-deload session, drop/partial sets left out) x load_factor, rounded down
// to a real load (deloadLoad = deload.py deload_load). Assisted machines keep the last assistance (less assistance would make it harder).
function dlPrefill(e){const id=resolve(e.exerciseId),hs=hist(id,e.sessionId),q=hs.find(z=>!z.s.deload)||hs[0];e.cue={deload:true};if(!q)return;const R=prRules();
  const w=work(q.sets).filter(x=>prOk({kind:'working',reps:x.reps,tag:x.tag},'weight',R)&&x.load!=null);if(!w.length)return;const u=sessUnit(q.s.id),last=Math.max(...w.map(x=>+x.load||0)),g=gymP();
  const v=exAsst(id)?conv(last,u,cur.unit):conv(deloadLoad(last,g,exEq(id),u,id),g.unit||u,cur.unit);
  L.sets.filter(x=>x.entryId==e.id&&x.kind=='working'&&!x.done).forEach(x=>{x.load=Math.round(v*1e6)/1e6;x.sug=false;x.dl=true})}
function dashLine(){const{dash:d}=planVsDone();if(!d.muscles)return'';const b=d.behind;
  return`<p class="cf-hint tr-pvd" data-m="${d.muscles}" data-on="${d.on_plan}" data-b="${b?b.muscle:''}">Planned vs done so far this week: ${d.on_plan}/${d.muscles} muscles on plan${b?` · furthest behind: ${H(cap(lab(b.muscle)))} ${b.done}/${b.planned}`:''}</p>`}
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
   <button id="st-gym" class="st-gym">Gym profile · ${H(gymP().name||'')}</button><button id="st-bw" class="st-gym">Bodyweight · ${H(bwLabel())}</button><label><input type="checkbox" id="st-rpe" ${S.rpe?'checked':''}> Show effort as RPE (10 − RIR)</label><label><input type="checkbox" id="st-snd" ${S.sound?'checked':''}> Sound when rest ends</label></div>`:''}
  <div class="cf-btns"><button id="wk-x">Close</button></div></div>`);
  document.querySelectorAll('#lg-wk .lg-tabs button').forEach(b=>b.onclick=()=>weekView(b.dataset.t));document.getElementById('wk-x').onclick=closeModal;
  if(tab=='week'){heatInto(document.getElementById('lg-map'),days,'lg');document.getElementById('wk-plan').onclick=()=>{view='plan';weekView()};document.getElementById('wk-done').onclick=()=>{view='done';weekView()}}
  if(tab=='history')document.querySelectorAll('.lg-hx').forEach(b=>b.onclick=()=>history_(b.dataset.x));
  if(tab=='settings'){document.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{S.unit=b.dataset.u;saveS();weekView('settings')});document.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{S.hardRIR=(()=>{const r=LR().hardRIR_range||[];return Math.max(r[0],Math.min(r[1],HR()+(b.dataset.h=='+'?1:-1)))})();saveS();weekView('settings')});
    document.getElementById('st-gym').onclick=gymSheet;document.getElementById('st-bw').onclick=()=>bwSheet();document.getElementById('st-rpe').onchange=e=>{S.rpe=e.target.checked;saveS()};document.getElementById('st-snd').onchange=e=>{S.sound=e.target.checked;saveS()}}}
// v29 B: bodyweight sheet (Settings). Manual, dated entries in any unit; add/edit/delete recompute PRs + analytics (same pure functions).
const bwSorted=()=>BW.map((b,i)=>({b,i})).sort((p,q)=>String(q.b.date).localeCompare(String(p.b.date))||q.i-p.i);
function bwLabel(){const l=bwSorted()[0];return l?`${fmt(conv(+l.b.value,l.b.unit||'lb',S.unit))} ${S.unit}`:'not logged'}
function bwSheet(edit){const ed=edit!=null?BW[edit]:null,today=prLocalDate(nowISO());
  modal(`<div id="lg-bw"><h3>Bodyweight</h3><p class="cf-hint">Used for bodyweight exercises (pull-ups, dips, push-ups…): load = share of bodyweight + added weight. A model of the load moved, not a measurement.</p>
   <div class="bw-f"><input id="bw-v" inputmode="decimal" aria-label="Bodyweight" placeholder="${S.unit}" value="${ed?H(ed.value):''}"><span class="lg-seg">${['lb','kg'].map(u=>`<button data-bu="${u}" class="${(ed?ed.unit||'lb':S.unit)==u?'on':''}">${u}</button>`).join('')}</span><input id="bw-d" type="date" aria-label="Date" value="${ed?H(String(ed.date).slice(0,10)):today}" max="${today}"></div>
   <p class="gp-err" id="bw-err" hidden></p><div class="cf-btns"><button class="pri" id="bw-ok">${ed?'Save':'Add'}</button><button id="bw-x">Done</button></div>
   <ul class="bw-l">${bwSorted().map(({b,i})=>`<li data-i="${i}"><span>${H(String(b.date).slice(0,10))}</span><b>${fmt(+b.value)} ${H(b.unit||'lb')}</b><button class="bw-e" data-i="${i}">Edit</button><button class="bw-del" data-i="${i}">Delete</button></li>`).join('')||'<li class="cf-hint">No entries yet.</li>'}</ul></div>`);
  let unit=ed?ed.unit||'lb':S.unit;document.querySelectorAll('[data-bu]').forEach(b=>b.onclick=()=>{unit=b.dataset.bu;document.querySelectorAll('[data-bu]').forEach(q=>q.classList.toggle('on',q===b))});
  const done=()=>{persistAll();refreshBar();if(window.LOGV)LOGV.invalidate();const v=document.body.dataset.view;if(v=='log'&&window.renderLog)renderLog();if(v=='analytics'&&window.renderAnalytics)renderAnalytics();if(window.render)render()};
  document.getElementById('bw-ok').onclick=()=>{const v=Number(document.getElementById('bw-v').value.trim().replace(',','.')),d=document.getElementById('bw-d').value,er=document.getElementById('bw-err');
    if(!(v>0)||!/^\d{4}-\d{2}-\d{2}$/.test(d)){er.textContent='Enter a bodyweight and a date.';er.hidden=false;return}
    const e={date:d,value:v,unit};if(ed)BW[edit]=e;else BW.push(e);saveBW();done();bwSheet()};
  document.querySelectorAll('.bw-e').forEach(b=>b.onclick=()=>bwSheet(+b.dataset.i));
  document.querySelectorAll('.bw-del').forEach(b=>b.onclick=()=>{const before=JSON.stringify(BW);BW.splice(+b.dataset.i,1);saveBW();done();bwSheet();toast('Bodyweight entry deleted',()=>{BW=JSON.parse(before);saveBW();done();bwSheet()})});
  document.getElementById('bw-x').onclick=()=>weekView('settings')}
// ---------- backup / restore ----------
window.logBackup=()=>({schema:LOG_SCHEMA,routines:ROUT,decimalFix:DFX,bodyweights:BW,deloads:DLS.deloads||[],deloadPrompt:DLS.deloadPrompt||null,readiness:DLS.readiness||[],exNotes:NOTES,sessions:L.sessions,entries:L.entries,sets:L.sets,prs:L.prs,settings:S});
window.importLogs=function(d){if(!d||!d.logs)return;let g=JSON.parse(JSON.stringify(d.logs));if(typeof g.schema!='number'&&typeof d.schema=='number')g.schema=d.schema;
  if(!Array.isArray(g.sessions)||!Array.isArray(g.entries||[])||!Array.isArray(g.sets||[])){alert('The workout logs in this file are not valid.');return}
  g=migrate(g);if(L.sessions.length&&!confirm('Replace your workout logs with the ones in this backup?'))return;
  L={sessions:g.sessions,entries:g.entries||[],sets:g.sets||[],prs:g.prs||[]};if(Array.isArray(g.routines)){ROUT=JSON.parse(JSON.stringify(g.routines));saveR()}if(g.decimalFix&&typeof g.decimalFix=='object'){DFX={shown:!!g.decimalFix.shown,sets:{...(g.decimalFix.sets||{})}};saveDF()}if(Array.isArray(g.bodyweights)){BW=JSON.parse(JSON.stringify(g.bodyweights));saveBW()}if(Array.isArray(g.deloads)||g.deloadPrompt||Array.isArray(g.readiness)){DLS={deloads:JSON.parse(JSON.stringify(g.deloads||[])),deloadPrompt:g.deloadPrompt||null,readiness:JSON.parse(JSON.stringify(g.readiness||[]))};saveDL()}if(g.settings&&typeof g.settings=='object'){Object.assign(S,g.settings);migrateS();saveS()}if(g.exNotes&&typeof g.exNotes=='object'){NOTES={...g.exNotes};saveN();migrateNoteIds()}migrateIds();
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
  buildBtns();renderStart();setView(document.body.dataset.view||'build')}
// keep the Continue label in sync with board edits
function tileNotes(){document.querySelectorAll('#board .tile[data-id]').forEach(t=>{const n=exNote(t.dataset.id);let el=t.querySelector('.tnote');if(!n){if(el)el.remove();return}if(!el){el=document.createElement('div');el.className='tnote';t.appendChild(el)}el.textContent='📌 '+n})}
if(typeof render=='function'){const r0=render;render=function(){const x=r0.apply(this,arguments);tileNotes();if(ready)refreshBar();return x}}
window.LG={renderSession,realIn,get L(){return L},get DLS(){return DLS},dlHist:()=>hx(false),dlCheckNow,dlActive,dlReasons,vsTie,vsDisp,vsSheet,vsRows,planDays,planVsDone,planSnaps,todayYmd,wuPlan,addWarmups,ssLink,ssUnlink,ssLetter,get BW(){return BW},bwSheet,effLb,setTag,tagDefs,gymP,gymSheet,realStep,kpPick,get DFX(){return DFX},saveDF,publishSheet,startTraining,routinePicker,get ROUT(){return ROUT},publish,setActive,activeRt,rtList,rtVers,elMs,durMs,startEmpty,moveEntry,pauseToggle,moveClock,set L(v){L=v},isHard,entriesOf,setsOf,exName,PRL,prVal,fmt,conv,H,sessUnit,loggedNote,weekKey,weekStart,get ALIAS(){return ALIAS},livePrs,recomputePrs,weekAnalytics,celebrate,hx,get S(){return S},get cur(){return cur},order,continueIdx,diffRows,applyRows,weekDone,countsFor,adherence,resolve,isArch,migrate,startSession,skipDays,weekView,history_,persistAll,ready:false,CFG,HR,LR,e1rm,e1Formula,setView,metricSeries,METRICS,get NOTES(){return NOTES},exNote,carryNote,get KP(){return KP},incFor};
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
boot();
})();
