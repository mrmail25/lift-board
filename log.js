// v28 Phase B: Log tab (completed workouts, newest first; expand, edit / delete with confirm + Undo; calendar) and the Analytics tab
// (completed workouts only: prs.js completedAnalytics). Everything is read from the log (window.LG) and the data files; PRs and figures are recomputed, never stored.
(function(){
const G=()=>window.LG,LVK='liftboard.logView';let LV={mode:'list',open:null,day:null,month:null,wk:null};try{Object.assign(LV,JSON.parse(localStorage.getItem(LVK))||{})}catch{}LV.open=null;LV.day=null;
const saveLV=()=>localStorage.setItem(LVK,JSON.stringify({mode:LV.mode}));
const E=s=>G().H(s),U=()=>G().S.unit,kgU=v=>G().fmt(G().conv(v,'kg',U())),tS=s=>s.startedAt||s.date;
const ymd=iso=>prLocalDate(iso),DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const dateTxt=s=>new Date(tS(s)).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
function done(){return G().L.sessions.filter(s=>s.status=='completed').sort((a,b)=>tS(a)<tS(b)?1:tS(a)>tS(b)?-1:(a.id<b.id?1:-1))}
function routineOf(s){if(s.routineName)return s.routineName;const id=String(s.splitId||'');if(id.startsWith('my:')){const m=(window.mySplits?mySplits():[]).find(x=>x.id==id.slice(3));if(m)return m.name}return'Board'}
const WA={};function wkA(ws){return WA[ws]||(WA[ws]=G().weekAnalytics(ws))}
function invalidate(){for(const k in WA)delete WA[k]}
// one session -> the board's day tiles (hard sets per exercise), so the same heat module and counting rule draw it
function tilesOf(s){const lg=G();return lg.entriesOf(s.id).flatMap(e=>{if(e.skipped||lg.isArch(e.exerciseId))return[];const n=lg.setsOf(e.id).filter(lg.isHard).length;return n?[{id:lg.resolve(e.exerciseId),sets:n}]:[]})}
function stats(s){const lg=G(),es=lg.entriesOf(s.id),hard=es.reduce((a,e)=>a+(e.skipped?0:lg.setsOf(e.id).filter(lg.isHard).length),0);
  const min=s.endedAt&&s.startedAt?Math.max(0,Math.round((Date.parse(s.endedAt)-Date.parse(s.startedAt)-(s.pausedMs||0))/60000)):null;
  const vol=wkA(prWeekStart(ymd(tS(s)))).volume.per_session_kg[s.id]||0;const prs=lg.L.prs.filter(p=>p.sessionId==s.id);
  const notes=[s.notes,...es.map(e=>e.notes?`${lg.exName(e)}: ${e.notes}`:'')].filter(x=>x&&x.trim()).flatMap(x=>x.split('\n')).filter(x=>x.trim()).slice(0,2);return{hard,min,vol,prs,notes}}
function prChips(prs){const c={};prs.forEach(p=>c[p.kind]=(c[p.kind]||0)+1);return PR_TYPES.filter(k=>c[k]).map(k=>`<span class="lgc-pr" data-k="${k}">🏆 ${G().PRL[k]}${c[k]>1?' ×'+c[k]:''}</span>`).join('')}
function cardHtml(s){const st=stats(s),open=LV.open==s.id;
  return`<article class="lgc${open?' open':''}" data-s="${E(s.id)}"><button class="lgc-hit" aria-expanded="${open}" aria-label="${E(dateTxt(s)+' '+s.label)}"></button><div class="lgc-map" data-s="${E(s.id)}"></div><div class="lgc-main">
   <div class="lgc-h"><b class="lgc-date">${E(dateTxt(s))}</b><span class="lgc-day">${E(s.label||'')}</span></div><div class="lgc-rt">${E(routineOf(s))}</div>
   <div class="lgc-st"><span data-k="min">⏱ ${st.min==null?'–':st.min+' min'}</span><span data-k="vol" data-kg="${st.vol}">${kgU(st.vol)} ${U()}</span><span data-k="hard" data-n="${st.hard}">${st.hard} hard</span></div>
   ${st.prs.length?`<div class="lgc-prs">${prChips(st.prs)}</div>`:''}${st.notes.length?`<div class="lgc-notes">${st.notes.map(n=>`<p>${E(n)}</p>`).join('')}</div>`:''}</div>
   ${open?detailHtml(s):''}</article>`}
function detailHtml(s){const lg=G(),u=s.unit||'lb',pr={};lg.L.prs.filter(p=>p.sessionId==s.id).forEach(p=>(pr[p.setId]=pr[p.setId]||[]).push(p.kind));
  return`<div class="lgc-x"><p class="cf-hint">Logged totals: ${kgU(stats(s).vol)} ${U()} volume (working sets, load × reps) · ${stats(s).hard} hard sets.</p>${lg.entriesOf(s.id).map(e=>`<div class="lgc-ex"><b>${E(lg.exName(e))}</b>${e.skipped?' <em>skipped</em>':''}${e.swappedFrom?' <em>swapped</em>':''}${e.added?' <em>added</em>':''}
   <div class="lgc-sets">${lg.setsOf(e.id).filter(x=>x.done).map(x=>`<span class="${x.kind}${pr[x.id]?' pr':''}" data-t="${E(x.id)}">${x.kind=='warmup'?'W ':''}${x.load?lg.fmt(lg.conv(x.load,u,U())):'BW'}×${x.reps??''}${x.rir!=null?' @'+x.rir:''}${pr[x.id]?' 🏆':''}</span>`).join('')}</div></div>`).join('')}
   ${s.notes?`<p class="lgc-sn">${E(s.notes)}</p>`:''}<div class="cf-btns"><button class="lgc-edit">Edit</button><button class="lgc-del dng">Delete</button></div></div>`}
function snap(sid){const L=G().L;return JSON.stringify({s:L.sessions.filter(x=>x.id==sid),e:L.entries.filter(x=>x.sessionId==sid),t:L.sets.filter(x=>x.sessionId==sid)})}
function restore(sid,j){const L=G().L,d=JSON.parse(j);L.sessions=L.sessions.filter(x=>x.id!=sid).concat(d.s);L.entries=L.entries.filter(x=>x.sessionId!=sid).concat(d.e);L.sets=L.sets.filter(x=>x.sessionId!=sid).concat(d.t);changed()}
function changed(){G().persistAll();invalidate();if(document.body.dataset.view=='log')renderLog();if(document.body.dataset.view=='analytics')renderAnalytics();if(window.render)render()}
function del(sid){const s=G().L.sessions.find(x=>x.id==sid);if(!s||!confirm(`Delete the ${s.label||''} workout on ${dateTxt(s)}? PRs and analytics are recomputed.`))return;const b=snap(sid),L=G().L;
  L.sessions=L.sessions.filter(x=>x.id!=sid);L.entries=L.entries.filter(x=>x.sessionId!=sid);L.sets=L.sets.filter(x=>x.sessionId!=sid);LV.open=null;changed();toast('Workout deleted',()=>restore(sid,b))}
function edit(sid){const lg=G(),s=lg.L.sessions.find(x=>x.id==sid);if(!s)return;const u=s.unit||'lb',es=lg.entriesOf(sid);
  modal(`<div id="lgc-ed"><h3>Edit ${E(s.label||'workout')} · ${E(dateTxt(s))}</h3><p class="cf-hint">Loads in ${u} (as logged). PRs and analytics are recomputed when you save.</p>
  ${es.map(e=>`<div class="lgc-ee" data-e="${E(e.id)}"><b>${E(lg.exName(e))}</b>${lg.setsOf(e.id).filter(x=>x.done).map(x=>`<div class="lgc-er" data-t="${E(x.id)}"><select data-f="kind" aria-label="Set type"><option value="working" ${x.kind=='working'?'selected':''}>Work</option><option value="warmup" ${x.kind=='warmup'?'selected':''}>Warm</option></select>
   <input data-f="load" inputmode="decimal" aria-label="Load ${u}" value="${x.load??''}"><span>×</span><input data-f="reps" inputmode="numeric" aria-label="Reps" value="${x.reps??''}"><select data-f="rir" aria-label="RIR"><option value="">RIR –</option>${[0,1,2,3,4,5].map(r=>`<option value="${r}" ${x.rir===r?'selected':''}>@${r==5?'5+':r}</option>`).join('')}</select><button class="lgc-rm" aria-label="Remove set">✕</button></div>`).join('')}</div>`).join('')}
  <label>Session notes<textarea id="lgc-n" rows="2">${E(s.notes||'')}</textarea></label><div class="cf-btns"><button class="pri" id="lgc-save">Save</button><button id="lgc-cancel">Cancel</button></div></div>`);
  const rm=new Set();document.querySelectorAll('#lgc-ed .lgc-rm').forEach(b=>b.onclick=()=>{const r=b.closest('.lgc-er');rm.add(r.dataset.t);r.remove()});document.getElementById('lgc-cancel').onclick=closeModal;
  document.getElementById('lgc-save').onclick=()=>{if(!confirm('Save changes to this workout? PRs and analytics are recomputed.'))return;const b=snap(sid),L=lg.L;
    document.querySelectorAll('#lgc-ed .lgc-er').forEach(r=>{const x=L.sets.find(q=>q.id==r.dataset.t);if(!x)return;const v=f=>r.querySelector(`[data-f="${f}"]`).value;
      x.kind=v('kind');const ld=parseFloat(v('load'));x.load=isFinite(ld)?ld:null;const rp=parseInt(v('reps'),10);x.reps=isFinite(rp)?rp:0;x.rir=v('rir')===''?null:+v('rir')});
    L.sets=L.sets.filter(x=>!rm.has(x.id));s.notes=document.getElementById('lgc-n').value;s.editedAt=new Date().toISOString();closeModal();changed();toast('Workout updated',()=>restore(sid,b))}}
// calendar: month grid (Mon-first, device-local dates); tap a day to list its workouts
function calHtml(){const ss=done(),by={};ss.forEach(s=>{const d=ymd(tS(s));(by[d]=by[d]||[]).push(s)});const m=LV.month||(ss[0]?ymd(tS(ss[0])):ymd(new Date().toISOString())).slice(0,7);LV.month=m;
  const [y,mo]=m.split('-').map(Number),first=`${m}-01`,start=prWeekStart(first),n=new Date(Date.UTC(y,mo,0)).getUTCDate(),cells=[];let d=start;
  while(d<=`${m}-${String(n).padStart(2,'0')}`||cells.length%7){cells.push(d);d=prAddDays(d,1)}const today=ymd(new Date().toISOString());
  return`<div class="lgcal" data-m="${m}"><div class="lgcal-h"><button class="lgcal-p" aria-label="Previous month">‹</button><b>${new Date(Date.UTC(y,mo-1,15)).toLocaleDateString(undefined,{month:'long',year:'numeric',timeZone:'UTC'})}</b><button class="lgcal-n" aria-label="Next month">›</button></div>
  <div class="lgcal-g">${DOW.map(w=>`<i>${w}</i>`).join('')}${cells.map(c=>{const a=by[c]||[],pr=a.some(s=>G().L.prs.some(p=>p.sessionId==s.id));return`<button class="lgcal-d${c.slice(0,7)!=m?' out':''}${a.length?' has':''}${c==LV.day?' on':''}${c==today?' today':''}" data-d="${c}" ${a.length?'':'disabled'} data-n="${a.length}">${+c.slice(8)}${a.length?`<s>${a.length>1?a.length:''}${pr?'🏆':'•'}</s>`:''}</button>`}).join('')}</div></div>`}
let IO=null;
function renderLog(){const o=document.getElementById('logview');if(!o||!G()||!G().ready)return;const all=done(),list=LV.mode=='cal'&&LV.day?all.filter(s=>ymd(tS(s))==LV.day):all;
  o.innerHTML=`<div class="lg-top"><b class="lg-name">Log</b><span class="lg-seg lgv-mode"><button data-m="list" class="${LV.mode=='list'?'on':''}">List</button><button data-m="cal" class="${LV.mode=='cal'?'on':''}">Calendar</button></span></div>
  <div class="lg-body lgv-body">${LV.mode=='cal'?calHtml():''}${LV.mode=='cal'&&LV.day?`<p class="cf-hint lgv-day">${list.length} workout${list.length==1?'':'s'} on ${E(new Date(LV.day+'T12:00:00').toLocaleDateString())} <button class="lgv-all">Show all</button></p>`:''}
  ${all.length?`<p class="cf-hint lgv-note">Completed workouts, newest first. ${E(G().loggedNote())}</p>`:''}<div class="lgv-list">${list.map(cardHtml).join('')||'<p class="cf-hint">No completed workouts yet. Finish a session in Train and it shows up here.</p>'}</div></div>`;
  o.querySelectorAll('.lgv-mode button').forEach(b=>b.onclick=()=>{LV.mode=b.dataset.m;LV.day=null;saveLV();renderLog()});
  const al=o.querySelector('.lgv-all');if(al)al.onclick=()=>{LV.day=null;renderLog()};
  o.querySelectorAll('.lgcal-d.has').forEach(b=>b.onclick=()=>{LV.day=LV.day==b.dataset.d?null:b.dataset.d;renderLog()});
  const mv=k=>{const[y,m]=LV.month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+k,1));LV.month=d.toISOString().slice(0,7);LV.day=null;renderLog()};
  const p=o.querySelector('.lgcal-p'),n=o.querySelector('.lgcal-n');if(p){p.onclick=()=>mv(-1);n.onclick=()=>mv(1)}
  o.querySelectorAll('.lgc').forEach(c=>{const sid=c.dataset.s;c.querySelector('.lgc-hit').onclick=()=>{LV.open=LV.open==sid?null:sid;renderLog();const k=document.querySelector(`.lgc[data-s="${CSS.escape(sid)}"]`);if(k&&LV.open)k.scrollIntoView({block:'nearest'})};
    const ed=c.querySelector('.lgc-edit');if(ed){ed.onclick=()=>edit(sid);c.querySelector('.lgc-del').onclick=()=>del(sid)}});
  // mini body maps: same heat module (day-mode tint, the session as one day), drawn lazily as cards scroll into view
  if(IO)IO.disconnect();const draw=el=>{if(el.dataset.done)return;const s=G().L.sessions.find(x=>x.id==el.dataset.s);if(!s)return;heatInto(el,[tilesOf(s),[],[],[],[],[],[]],'lc'+el.dataset.s.replace(/\W/g,''),0);el.dataset.done='1'};
  const maps=[...o.querySelectorAll('.lgc-map')];if('IntersectionObserver' in window){IO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){draw(e.target);IO.unobserve(e.target)}}),{rootMargin:'200px'});maps.forEach(m=>IO.observe(m))}else maps.forEach(draw)}
// ---------- Analytics tab: completed workouts only ----------
function weeksAvail(){const w=new Set(done().map(s=>prWeekStart(ymd(tS(s)))));w.add(G().weekKey());return[...w].sort()}
function spark(pts){if(pts.length<2)return'';const W=128,Hh=28,v=pts.map(p=>p.e1rm_kg),mx=Math.max(...v),mn=Math.min(...v),px=i=>2+i*(W-4)/(pts.length-1),py=x=>Hh-3-(mx==mn?1/2:(x-mn)/(mx-mn))*(Hh-6);
  return`<svg class="an-spark" viewBox="0 0 ${W} ${Hh}"><polyline points="${pts.map((p,i)=>px(i).toFixed(1)+','+py(p.e1rm_kg).toFixed(1)).join(' ')}"/></svg>`}
function renderAnalytics(){const o=document.getElementById('anview');if(!o||!G()||!G().ready)return;invalidate();const lg=G(),W=weeksAvail();if(!LV.wk||!W.includes(LV.wk))LV.wk=lg.weekKey();const ws=LV.wk,a=wkA(ws),i=W.indexOf(ws);
  const ss=done().filter(s=>prWeekStart(ymd(tS(s)))==ws).reverse(),days=[ss.flatMap(tilesOf),[],[],[],[],[],[]],board=lg.countsFor(days),ad=a.adherence,prs=lg.L.prs.filter(p=>ss.some(s=>s.id==p.sessionId));
  const trend=Object.keys(a.load_trend).filter(x=>a.load_trend[x].some(p=>prWeekStart(p.date)==ws)).sort((x,y)=>((EX[x]||{}).name||x)<((EX[y]||{}).name||y)?-1:1);
  const pct=v=>v==null?'–':Math.round(v*100)+'%',wl=d=>new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
  let c=o.querySelector('#anc');if(!c){c=document.createElement('div');c.id='anc';o.appendChild(c)}
  c.innerHTML=`<div class="an-wk"><button id="anw-p" ${i>0?'':'disabled'} aria-label="Previous week">‹</button><b id="anw-l" data-w="${ws}">Week of ${E(wl(ws))}</b><button id="anw-n" ${i<W.length-1?'':'disabled'} aria-label="Next week">›</button></div>
  <p class="cf-hint an-logged">Completed workouts only (the session in progress is not counted). ${E(lg.loggedNote())}</p>
  <div class="an-tiles"><div data-k="vol" data-kg="${a.volume.week_kg}"><b>${kgU(a.volume.week_kg)} ${U()}</b><small>logged total volume</small></div><div data-k="hard" data-n="${a.hard_sets.set_count}"><b>${a.hard_sets.set_count}</b><small>logged hard sets</small></div>
   <div data-k="sess" data-c="${ad.sessions_completed}" data-p="${ad.sessions_planned}"><b>${ad.sessions_completed}/${ad.sessions_planned}</b><small>sessions done (logged)</small></div><div data-k="sets" data-r="${ad.sets_ratio}"><b>${pct(ad.sets_ratio)}</b><small>planned sets done (logged)</small></div></div>
  <h3>Hard sets per muscle (logged totals)</h3><div id="an-map"></div>${a.hard_sets.archived_sets_not_counted?`<p class="lg-arch">${a.hard_sets.archived_sets_not_counted} hard sets from archived exercises not counted.</p>`:''}
  <table class="lg-tbl an-hs">${MUS.map(m=>`<tr data-m="${m}" data-v="${board[m]}" class="${status(board[m],tgt(m))}"><td>${E(cap(lab(m)))}</td><td>${board[m]}</td><td>/ ${tgt(m).min}–${tgt(m).max}</td></tr>`).join('')}</table>
  <h3>Adherence (logged totals)</h3><p class="an-adh" data-done="${ad.completed_planned_sets}" data-plan="${ad.planned_sets}" data-skip="${ad.skipped_sets}">Planned working sets done: ${ad.completed_planned_sets}/${ad.planned_sets}${ad.skipped_sets?` · ${ad.skipped_sets} skipped`:''} · sessions: ${ad.sessions_completed} completed, ${ad.sessions_skipped} skipped, ${ad.sessions_not_started} not started</p>
  <h3>Volume per session (logged totals)</h3><table class="lg-tbl an-vol">${ss.map(s=>`<tr data-s="${E(s.id)}"><td>${E(dateTxt(s))}</td><td>${E(s.label||'')}</td><td>${kgU(a.volume.per_session_kg[s.id]||0)} ${U()}</td></tr>`).join('')||'<tr><td>No completed workouts this week.</td></tr>'}</table>
  <h3>Load trend: best e1RM per session (logged)</h3><table class="lg-tbl an-trend">${trend.map(x=>{const p=a.load_trend[x],l=p[p.length-1];return`<tr data-x="${E(x)}" data-n="${p.length}"><td>${E((EX[x]||{}).name||x)}</td><td>${spark(p)}</td><td>${kgU(l.e1rm_kg)} ${U()}</td></tr>`}).join('')||'<tr><td>No loaded working sets this week.</td></tr>'}</table>
  <h3>PRs this week (logged)</h3><ul class="an-prs">${prs.map(p=>`<li data-k="${p.kind}">🏆 ${E((EX[p.exerciseId]||{}).name||p.exerciseId)}: ${lg.PRL[p.kind]} · ${lg.prVal(p.kind,{value:p.value,load_kg:p.load_kg,reps:p.reps})}</li>`).join('')||'<li class="cf-hint">None this week.</li>'}</ul>`;
  heatInto(c.querySelector('#an-map'),days,'anc');c.querySelector('#anw-p').onclick=()=>{LV.wk=W[i-1];renderAnalytics()};c.querySelector('#anw-n').onclick=()=>{LV.wk=W[i+1];renderAnalytics()}}
window.renderLog=renderLog;window.renderAnalytics=renderAnalytics;window.LOGV={LV,tilesOf,stats,done,wkA,invalidate};
})();
