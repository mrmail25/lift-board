/* Progress stats from logged workouts (round 1): a line-for-line port of Coach's tools/progress.py (rules.json progress,
   data/progress-spec.md) and the parts of tools/prs.py (flatten, hard_credit, completed_analytics, e1rm) and tools/deload.py
   (_session_bests, exercise_trends) it calls. Completed sessions only (skipped ones count for adherence). Weeks start Monday,
   local time America/Los_Angeles. A model for spotting trends, not a measurement of growth or strength.
   Parity: node test/progress.diff.js (vs data/progress-reference.json). Browser: window.PROGRESS; node: module.exports. */
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const RANK=isNode?require('./rank.js'):root.RANK,PC=isNode?require('./progcheck.js'):root.PCHECK,AN=isNode?require('./analysis.js'):root.ANALYSIS,
  TP=isNode?require('./templates.js'):root.TEMPLATES,WB=isNode?require('./whiteboard.js'):root.WHITEBOARD;
const pyR=RANK.pyRound,ORDER=PC.ORDER,{_day,cmpT,sortBy}=PC._x,EPS=1e-6,TZ='America/Los_Angeles';
const r4=v=>v==null?null:pyR(v,4);
// ---------- dates (YYYY-MM-DD strings) ----------
const dn=s=>Math.round(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5),ds=n=>new Date(n*864e5).toISOString().slice(0,10);
const wday=s=>(new Date(dn(s)*864e5).getUTCDay()+6)%7,wk=s=>ds(dn(s)-wday(s));
let FMT=null;function localDate(iso){if(!/T/.test(iso))return iso.slice(0,10);FMT=FMT||new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'});
  const p={};for(const x of FMT.formatToParts(new Date(iso)))p[x.type]=x.value;return `${p.year}-${p.month}-${p.day}`}
const sday=s=>localDate(s.startedAt||s.date),tOf=s=>s.endedAt||s.date;
// ---------- prs.py ----------
function rules(dt){if(dt._lr)return dt._lr;const LG=dt.rules.logger;
  return dt._lr={logger:LG,hardRIR:LG.hardRIR,e1rm_formula:LG.e1rm_formula||'epley',e1rm_max_reps:LG.e1rm_max_reps,lbPerKg:LG.lbPerKg||2.20462,
    min_rating:dt.targets.counting.min_rating_to_count,muscles:dt.exl.muscles.map(m=>typeof m==='string'?m:m.id),aliases:dt.aliases||{},set_tags:LG.set_tags||{},flat_pct:(dt.rules.review||{}).flat_pct??1}}
const E1RM={epley:(w,r)=>w*(1+r/30),brzycki:(w,r)=>w*36/(37-r)};
const e1rm=(L,w,r)=>(E1RM[L.e1rm_formula]||E1RM.epley)(w,r);
function resolve(i,al){let n=0;while(al&&i in al&&n<50){i=al[i];n++}return i}
const toKg=(v,unit,L)=>v==null||v===''?0:(unit==='lb'?+v/L.lbPerKg:+v);
function exTable(dt,h){const EX=Object.assign({},dt.EX);for(const c of h.customExercises||[])if(c.id&&c.muscles)EX[c.id]=c;return EX}
function bwTable(h,L){const out=[];for(const b of h.bodyweights||[]){if(!b||b.date==null||b.value==null)continue;out.push([String(b.date).slice(0,10),toKg(b.value,b.unit||'lb',L)])}return out.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0)}
function bodyweightOn(t,day){if(!t.length)return [null,'missing'];const prev=t.filter(([d])=>d<=day);return prev.length?[prev[prev.length-1][1],'logged']:[t[0][1],'backfilled']}
function flatten(dt,h){const L=rules(dt),al=L.aliases,ent={};for(const e of h.entries||[])ent[e.id]=e;const EX=exTable(dt,h),bwt=bwTable(h,L),byS={};
  for(const x of h.sets||[]){const e=ent[x.entryId];if(!e)continue;const sid=x.sessionId||e.sessionId;(byS[sid]=byS[sid]||[]).push([e,x])}
  const sess=sortBy((h.sessions||[]).filter(s=>s.status==='completed'),s=>[tOf(s),s.id]),out=[];
  for(const s of sess){const rows=[];let day=null;
    for(const [e,x] of sortBy(byS[s.id]||[],p=>[p[0].order||0,p[1].idx||0])){if(!x.done)continue;const reps=x.reps||0,exid=resolve(e.exerciseId,al);
      const added=toKg(x.load,s.unit||'lb',L);let load=added,bwk=0,bws=null;const meta=EX[exid]||{},f=meta.bodyweight_fraction||0;
      if(f>0){if(day===null)day=localDate(s.startedAt||s.date);const [bw,st]=bodyweightOn(bwt,day);bws=st;
        if(bw!==null){bwk=f*bw;load=meta.bodyweight_assisted?Math.max(0,bwk-added):bwk+added}else if(meta.bodyweight_assisted)load=0}
      const tag=x.tag||null;let rir=x.rir??null;if(rir===null&&tag)rir=((L.set_tags[tag]||{}).default_rir)??null;
      rows.push({id:x.id,entry:e,ex:exid,kind:x.kind||'working',load_kg:load,added_kg:added,bw_kg:bwk,bw:bws,tag,reps:Math.trunc(reps),rir,idx:x.idx||0})}
    out.push({s,sets:rows})}return out}
const prSet=x=>x.kind==='working'&&x.reps>0;
const prOk=(x,k,L)=>{if(!prSet(x))return false;const t=x.tag;return !(t&&((L.set_tags[t]||{}).pr_exclude||[]).includes(k))};
function hardCredit(sets,hr,L){const st=L.set_tags,out=[];let run=0;
  for(const x of sets){const isH=x.kind==='working'&&x.reps>0&&(x.rir===null||x.rir<=hr),t=x.tag,cfg=st[t]||{};if(t!=='drop_set')run=0;if(!isH){out.push(0);continue}
    let c=+(cfg.hard_credit??1);if(t==='drop_set'){const cap=+(cfg.cap_per_top_set??1);c=Math.max(0,Math.min(c,cap-run));run+=c}out.push(c)}return out}
// completed_analytics: the parts progress.py reads (hard_sets.per_muscle, adherence)
function completedAnalytics(dt,h,week,flat){const L=rules(dt),al=L.aliases,EX=exTable(dt,h),mr=L.min_rating,hr=L.hardRIR;
  const ws=wk(week),we=ds(dn(ws)+7),inwk=s=>{const d=localDate(s.startedAt||s.date);return ws<=d&&d<we};
  const hard={};for(const m of L.muscles)hard[m]=0;
  for(const q of flat||flatten(dt,h)){if(!inwk(q.s))continue;const ents=new Map();for(const x of q.sets)if(x.kind==='working'){const k=x.entry.id;if(!ents.has(k))ents.set(k,[]);ents.get(k).push(x)}
    const cr={};for(const xs of ents.values())hardCredit(xs,hr,L).forEach((c,k)=>cr[xs[k].id]=c);
    for(const x of q.sets){if(x.kind!=='working')continue;const isH=x.reps>0&&(x.rir===null||x.rir<=hr),c=cr[x.id]||0,e=EX[x.ex];if(!e)continue;
      for(const [m,r] of Object.entries(e.muscles))if(r>=mr&&isH)hard[m]=(hard[m]||0)+r*c}}
  const ent=h.entries||[],sets=h.sets||[];let comp=0,skip=0,planned=0,donePl=0,skippedSets=0;
  for(const s of h.sessions||[]){if(!['completed','skipped'].includes(s.status)||!inwk(s))continue;const plan=(s.snapshot||{}).exercises||[];
    if(s.status==='skipped'){skip++;const n=plan.reduce((a,p)=>a+p.sets,0);planned+=n;skippedSets+=n;continue}
    comp++;const es=ent.filter(e=>e.sessionId===s.id);
    for(const p of plan){planned+=p.sets;const pid=resolve(p.exerciseId,al);const g=es.filter(e=>!e.added&&resolve(e.swappedFrom||e.exerciseId,al)===pid),live=g.filter(e=>!e.skipped);
      if(!live.length){skippedSets+=p.sets;continue}const ids=new Set(live.map(e=>e.id));
      const n=sets.filter(x=>ids.has(x.entryId)&&(x.kind||'working')==='working'&&x.done).length;donePl+=Math.min(n,p.sets)}}
  const pm={};for(const [m,v] of Object.entries(hard))pm[m]=r4(v);
  return {week_start:ws,hard_sets:{per_muscle:pm},adherence:{planned_sets:planned,completed_planned_sets:donePl,skipped_sets:skippedSets,sessions_completed:comp,sessions_skipped:skip}}}
// ---------- deload.py ----------
function sessionBests(dt,flat){const L=rules(dt),out=[];for(const q of flat){if(q.s.deload)continue;const best={};
    for(const x of q.sets)if(prOk(x,'e1rm',L)&&x.load_kg>EPS&&x.reps<=L.e1rm_max_reps){const v=e1rm(L,x.load_kg,x.reps);best[x.ex]=Math.max(best[x.ex]||0,v)}
    const day=sday(q.s);for(const [ex,v] of Object.entries(best))out.push([day,ex,v])}return out}
function slopePct(pts){const n=pts.length,t0=dn(pts[0][0]),xs=pts.map(p=>dn(p[0])-t0),ys=pts.map(p=>p[1]);const mx=xs.reduce((a,b)=>a+b,0)/n,my=ys.reduce((a,b)=>a+b,0)/n;
  let den=0,num=0;xs.forEach((x,k)=>{den+=(x-mx)**2;num+=(x-mx)*(ys[k]-my)});if(den===0||my<=0)return 0;return num/den*7/my*100}
function exerciseTrends(dt,flat,now,weeks){const PS=dt.rules.logger.progress_signals,start=ds(dn(now)-7*(weeks||PS.window_weeks)),by={};
  for(const [day,ex,v] of sessionBests(dt,flat))if(start<day&&day<=now)(by[ex]=by[ex]||[]).push([day,v]);
  const st=p=>p===null?'insufficient':p>PS.up_pct_per_week?'up':p<PS.drop_pct_per_week?'dropping':'stalled',out={};
  for(const [ex,pts0] of Object.entries(by)){const pts=pts0.slice().sort(cmpT);const okd=pts.length>=PS.min_sessions&&dn(pts[pts.length-1][0])-dn(pts[0][0])>=PS.min_span_days;
    const p=okd?slopePct(pts):null;out[ex]={status:st(p),pct_per_week:p===null?null:pyR(p,4),sessions:pts.length,points:pts.map(([d,v])=>[d,pyR(v,4)])}}return out}
// ---------- progress.py ----------
const TYPE_RANK={primary:0,accessory:1,isolation:2};
function planPerMuscle(dt,routine){const mr=rules(dt).min_rating,out={};for(const d of routine)for(const t of d.tiles)for(const [m,r] of Object.entries(dt.EX[t.id].muscles))if(r>=mr)out[m]=(out[m]||0)+t.sets*r;
  const o={};for(const [m,v] of Object.entries(out))o[m]=pyR(v,4);return o}
function completedWeeks(h,now,n){const cur=wk(now),have=[...new Set((h.sessions||[]).filter(s=>s.status==='completed'&&wk(sday(s))<cur).map(s=>wk(sday(s))))].sort();return have.slice(-n)}
function trend(PG,values){const T=PG.trend;if(values.length<T.min_weeks)return {status:'insufficient',pct_per_week:null};const n=values.length,mx=(n-1)/2,my=values.reduce((a,b)=>a+b,0)/n;
  if(my<=0)return {status:'flat',pct_per_week:0.0};let num=0,den=0;values.forEach((v,i)=>{num+=(i-mx)*(v-my);den+=(i-mx)**2});const p=num/den/my*100;
  return {status:p>T.up_pct_per_week?'up':p<T.down_pct_per_week?'down':'flat',pct_per_week:pyR(p,4)}}
function mainLift(PG,trends,m,ex){const c=Object.entries(trends).filter(([i,t])=>t.status!=='insufficient'&&(((ex[i]||{}).muscles||{})[m]||0)>=PG.main_lift.min_rating);if(!c.length)return null;
  const [i,t]=sortBy(c,([i,t])=>[TYPE_RANK[ex[i].type]??3,-ex[i].muscles[m],-t.sessions,i])[0];
  return {id:i,status:t.status,pct_per_week:t.pct_per_week,sessions:t.sessions,first_e1rm_kg:t.points[0][1],last_e1rm_kg:t.points[t.points.length-1][1],first_date:t.points[0][0],last_date:t.points[t.points.length-1][0]}}
function notes(dt,PG,h,m,ex){const N=PG.notes,al=rules(dt).aliases,ok=i=>(((ex[resolve(i,al)]||{}).muscles||{})[m]||0)>=N.min_rating;
  const out=Object.keys(h.exNotes||{}).sort().map(i=>[i,h.exNotes[i]]).filter(([i,t])=>typeof t==='string'&&t.trim()&&ok(i)).map(([i,t])=>({kind:'always',exercise:i,text:t.trim()}));
  const ss={};for(const s of h.sessions||[])if(s.status==='completed')ss[s.id]=s;
  const ses=(h.entries||[]).filter(e=>e.sessionId in ss&&(e.notes||'').trim()&&ok(e.exerciseId)).map(e=>[tOf(ss[e.sessionId]),'order' in e?e.order:0,e]);
  ses.sort((a,b)=>cmpT([b[0],b[1]],[a[0],a[1]]));
  for(const [,,e] of ses)out.push({kind:'session',exercise:resolve(e.exerciseId,al),text:e.notes.trim(),session_id:e.sessionId,date:sday(ss[e.sessionId])});
  return out.slice(0,N.max_notes)}
const routineDaysOf=(routine,i)=>routine.filter(d=>d.tiles.some(t=>t.id===i)).map(d=>d.day);
function exposures(dt,flat,i){const L=rules(dt),out=[];for(const q of flat){if(q.s.deload)continue;let best=null;
    for(const x of q.sets)if(x.ex===i&&prOk(x,'e1rm',L)&&x.load_kg>EPS&&x.reps<=L.e1rm_max_reps){const v=e1rm(L,x.load_kg,x.reps);if(best===null||v>best[0]+EPS)best=[v,x.reps]}
    if(best)out.push([sday(q.s),best[0],best[1]])}return out}
const valid=(dt,a,b,level)=>{const x=PC._x.nonin(PC.check(dt,a,level)[0]),y=PC._x.nonin(PC.check(dt,b,level)[0]);for(const k of y)if(!x.has(k))return false;return true};
function stall(dt,PG,flat,routine,now,goal,level){const S=PG.refinement.stall,REV=dt.rules.review,out=[],inRt=new Set(routine.flatMap(d=>d.tiles.map(t=>t.id)));
  for(const i of [...inRt].sort()){const ex=exposures(dt,flat,i).filter(p=>p[0]<=now);if(ex.length<S.min_exposures||dn(ex[ex.length-1][0])-dn(ex[0][0])<S.min_span_days)continue;
    const rec=ex.slice(-S.recent_exposures),old=ex.slice(0,-S.recent_exposures),mxR=Math.max(...rec.map(p=>p[1])),mxO=Math.max(...old.map(p=>p[1]));
    if(mxR>mxO*(1+REV.flat_pct/100)+EPS)continue;
    const R_=WB.repRange(dt,i,goal),lo=R_.low,hi=R_.high,mid=Math.floor((lo+hi)/2),reps=rec.map(p=>p[2]).sort((a,b)=>a-b)[Math.floor(rec.length/2)];
    const rr=R_.unit!=='reps'?null:{from_reps_median:reps,suggest_range:reps<=mid?[mid,hi]:[lo,mid],rep_range:[lo,hi]};
    const elig=new Set(TP.eligible(dt,TP.ruleFor(dt,i),level)),cs=RANK.swaps(dt,i,40).map(c=>c.id).filter(c=>elig.has(c)&&!inRt.has(c)),
      same=cs.filter(c=>RANK.fam(dt.EX[c])===RANK.fam(dt.EX[i])),sw=(same.length?same:cs.length?cs:[null])[0];let edit=null;
    if(sw){const ops=[];for(const d of routineDaysOf(routine,i))for(const t of _day(routine,d).tiles)if(t.id===i)ops.push({op:'swap',day:d,from_id:i,to_id:sw,sets:t.sets});edit={to_id:sw,diff:ops}}
    out.push({type:'stall',exercise:i,exposures:ex.length,best_recent_kg:r4(mxR),best_before_kg:r4(mxO),actions:{rep_range_change:rr,swap_variation:edit}})}return out}
function plannedSessions(dt,h,i,now){const al=rules(dt).aliases,ent=h.entries||[],sets=h.sets||[],out=[];
  for(const s of sortBy((h.sessions||[]).filter(s=>s.status==='completed'&&sday(s)<=now),s=>[tOf(s),s.id])){const p=((s.snapshot||{}).exercises||[]).find(p=>resolve(p.exerciseId,al)===i);if(!p)continue;
    const live=ent.filter(e=>e.sessionId===s.id&&!e.added&&!e.skipped&&resolve(e.swappedFrom||e.exerciseId,al)===i),ids=new Set(live.map(e=>e.id));
    const n=sets.filter(x=>ids.has(x.entryId)&&(x.kind||'working')==='working'&&x.done).length;out.push({session_id:s.id,day_idx:s.dayIdx??null,planned:p.sets,done:Math.min(n,p.sets)})}return out}
function doneByDay(PG,h,now){const wks=new Set(completedWeeks(h,now,PG.adherence.weeks)),out={};
  for(const s of h.sessions||[])if(s.status==='completed'&&s.dayIdx!=null&&wks.has(wk(sday(s)))){const d=ORDER[s.dayIdx];out[d]=(out[d]||0)+1}return out}
function missedSets(dt,PG,h,routine,now,level){const S=PG.refinement.missed_sets,out=[],tot=d=>d.tiles.reduce((a,t)=>a+t.sets,0);
  for(const i of [...new Set(routine.flatMap(d=>d.tiles.map(t=>t.id)))].sort()){const ps=plannedSessions(dt,h,i,now).slice(-S.last_sessions),miss=ps.filter(p=>p.done<p.planned);
    if(ps.length<S.last_sessions||miss.length<S.min_missed)continue;const to=Math.max(2,pyR(ps.reduce((a,p)=>a+p.done,0)/ps.length)),done=doneByDay(PG,h,now),trims=[],moves=[];
    for(const d of routineDaysOf(routine,i)){const t=_day(routine,d).tiles.find(t=>t.id===i);if(to>=t.sets)continue;trims.push({op:'sets',day:d,id:i,from:t.sets,to});
      const others=sortBy(routine.filter(x=>x.tiles.length&&x.day!==d&&!x.tiles.some(y=>y.id===i)),x=>[-(done[x.day]||0),tot(x),ORDER.indexOf(x.day)]);
      if(others.length){const k=t.sets-to,ops=[trims[trims.length-1],{op:'add',day:others[0].day,id:i,sets:Math.max(2,k)}];if(valid(dt,routine,AN.applyOps(routine,ops),level))moves.push(ops)}}
    if(trims.length)out.push({type:'missed_sets',exercise:i,sessions:ps,missed:miss.length,actions:{trim_sets:trims,move_sets:moves.length?moves[0]:null}})}return out}
function reschedule(dt,routine,level,src){const sd=_day(routine,src),i0=ORDER.indexOf(src);
  const empty=sortBy([...routine.filter(d=>!d.tiles.length).map(d=>d.day),...ORDER.filter(d=>!routine.some(x=>x.day===d))],d=>[Math.abs(ORDER.indexOf(d)-i0),ORDER.indexOf(d)]);
  for(const to of empty){const base=routine.some(x=>x.day===to)?routine:routine.concat([{day:to,label:'',tiles:[]}]);
    const ops=[...sd.tiles.map(t=>({op:'remove',day:src,id:t.id,sets:t.sets})),...sd.tiles.map(t=>({op:'add',day:to,id:t.id,sets:t.sets}))];
    if(valid(dt,routine,AN.applyOps(base,ops),level))return {to_day:to,label:sd.label||'',diff:ops}}return null}
function underDelivered(dt,PG,h,flat,routine,now,level,missed){const U=PG.refinement.under_delivered,plan=planPerMuscle(dt,routine),wks=completedWeeks(h,now,U.weeks),al=rules(dt).aliases;
  if(wks.length<U.weeks)return [];const acts=wks.map(w=>completedAnalytics(dt,h,w,flat).hard_sets.per_muscle),out=[],skipped=new Map();
  for(const m of Object.keys(dt.targets.targets).filter(m=>(plan[m]||0)>=U.min_plan_sets)){if(!acts.every(a=>(a[m]||0)<plan[m]*(1-U.shortfall)-1e-9))continue;
    const linked=missed.filter(r=>(dt.EX[r.exercise].muscles[m]||0)>=0.5).map(r=>r.exercise);
    const sk=(h.sessions||[]).filter(s=>s.status==='skipped'&&wks.includes(wk(sday(s)))&&s.dayIdx!=null&&((s.snapshot||{}).exercises||[]).some(p=>(((dt.EX[resolve(p.exerciseId,al)]||{}).muscles||{})[m]||0)>=0.5));
    let cause,act;if(linked.length){cause='missed_sets';act={see:linked.map(i=>({type:'missed_sets',exercise:i}))}}
    else if(sk.length){const days=[...new Set(sk.map(s=>ORDER[s.dayIdx]))].sort((a,b)=>ORDER.indexOf(a)-ORDER.indexOf(b));cause='skipped_sessions';act={see:days.map(d=>({type:'skipped_day',day:d}))};
      for(const s of sk){const d=ORDER[s.dayIdx];if(!skipped.has(d))skipped.set(d,new Set());skipped.get(d).add(s.id)}}
    else{cause='swaps_or_logging';act=null}
    out.push({type:'under_delivered',muscle:m,plan:plan[m],actual:acts.map(a=>r4(a[m]||0)),weeks:wks.slice(),cause,action:act})}
  for(const d of [...skipped.keys()].sort((a,b)=>ORDER.indexOf(a)-ORDER.indexOf(b)))
    out.push({type:'skipped_day',day:d,skipped_sessions:[...skipped.get(d)].sort(),muscles:out.filter(r=>r.type==='under_delivered'&&r.cause==='skipped_sessions'&&r.action.see.some(x=>x.day===d)).map(r=>r.muscle),action:reschedule(dt,routine,level,d)});
  return out}
// progress(history, routine, now 'YYYY-MM-DD', level, goal)
function progress(dt,h,routine,now,level='intermediate',goal=null){const PG=dt.rules.progress,G=PG.guards,ex=exTable(dt,h),plan=planPerMuscle(dt,routine),flat=flatten(dt,h);now=String(now).slice(0,10);
  const comp=(h.sessions||[]).filter(s=>s.status==='completed'&&sday(s)<=now).map(sday).sort(),lw=new Set(comp.map(wk)).size;
  const guard={completed_sessions:comp.length,logged_weeks:lw,refinements_enabled:comp.length>=G.min_completed_sessions&&lw>=G.min_logged_weeks};
  const wks=completedWeeks(h,now,PG.trend.weeks),ca=wks.map(w=>completedAnalytics(dt,h,w,flat)),cur=completedAnalytics(dt,h,now,flat),trends=exerciseTrends(dt,flat,now),musc={};
  for(const m of Object.keys(dt.targets.targets)){const series=ca.map(a=>pyR(a.hard_sets.per_muscle[m]||0,4));if(!plan[m]&&!series.some(Boolean)&&!cur.hard_sets.per_muscle[m])continue;
    const aSum=series.reduce((a,b)=>a+b,0),pSum=(plan[m]||0)*ca.length;
    musc[m]={plan_sets:plan[m]||0,this_week_sets:r4(cur.hard_sets.per_muscle[m]||0),last_week_sets:series.length?series[series.length-1]:null,weeks:wks.slice(),weekly_sets:series,
      trend:trend(PG,series),adherence:pSum?r4(aSum/pSum):null,main_lift:mainLift(PG,trends,m,ex),notes:notes(dt,PG,h,m,ex)}}
  const sum=k=>ca.reduce((a,x)=>a+x.adherence[k],0),pl=sum('planned_sets'),dnn=sum('completed_planned_sets'),sc=sum('sessions_completed'),sk=sum('sessions_skipped');
  const adh={weeks:ca.length,planned_sets:pl,completed_planned_sets:dnn,sets_ratio:pl?r4(dnn/pl):null,sessions_completed:sc,sessions_skipped:sk,sessions_ratio:sc+sk?r4(sc/(sc+sk)):null};
  let ref=[];if(guard.refinements_enabled){const ms=missedSets(dt,PG,h,routine,now,level);ref=[...stall(dt,PG,flat,routine,now,goal,level),...ms,...underDelivered(dt,PG,h,flat,routine,now,level,ms)]}
  return {as_of:now,label:'From logged workouts; a model for spotting trends, not a measurement.',muscles:musc,adherence:adh,guards:guard,refinements:ref}}
const API={progress,flatten,completedAnalytics,exerciseTrends,planPerMuscle,localDate,weekStart:wk};
if(isNode)module.exports=API;else root.PROGRESS=API;
})(typeof window!=='undefined'?window:this);
