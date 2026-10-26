/* Progress from logged workouts (piece B, 2026-10-24): a line-for-line port of Coach's tools/progress.py report() (progress2:
   data/progress-rules.json as dt.PR2, data/progress-spec.md) and the parts of tools/prs.py (flatten, hard_credit,
   completed_analytics) and tools/deload.py (exercise_trends, deload_check) it calls. The round-1 progress() path is gone.
   Weeks start Monday, local time America/Los_Angeles. Strength and performance, modelled; not a measurement of muscle growth.
   Parity: node test/progress2.diff.js (vs data/progress-reference.json). Browser: window.PROGRESS; node: module.exports. */
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
// ---------- shared by report() ----------
const TYPE_RANK={primary:0,accessory:1,isolation:2};
const valid=(dt,a,b,level)=>{const x=PC._x.nonin(PC.check(dt,a,level)[0]),y=PC._x.nonin(PC.check(dt,b,level)[0]);for(const k of y)if(!x.has(k))return false;return true};
// =====================================================================================================================
// progress2 (piece B, 2026-10-24): port of tools/progress.py report() (data/progress-rules.json = dt.PR2, progress-spec.md).
// report(dt, history, asOf, routine, level, goal). Estimated 1RM on working sets of <= 12 reps (progress-rules e1rm.max_reps).
// Parity: node test/progress2.diff.js (vs data/progress-reference.json sample + edge_cases). Deload: deload.py deload_check port.
// =====================================================================================================================
const PRSm=()=>isNode?require('./prs.js'):root.PRS;
const fl=Math.floor,isoAdd=(s,k)=>ds(dn(s)+k),days=(a,b)=>dn(a)-dn(b);
const pyMax=(a,key)=>{let b=a[0],bk=key(b);for(const x of a.slice(1)){const k=key(x);if(cmpT(k,bk)>0){b=x;bk=k}}return b};
const pyMin=(a,key)=>{let b=a[0],bk=key(b);for(const x of a.slice(1)){const k=key(x);if(cmpT(k,bk)<0){b=x;bk=k}}return b};
function clampRir(v){if(v==null||typeof v==='boolean')return null;if(typeof v!=='number'&&typeof v!=='string')return null;if(typeof v==='string'&&!v.trim())return null;
  const f=Number(v);if(!isFinite(f))return null;return Math.trunc(Math.max(0,Math.min(4,fl(f+0.5))))}
function normalize(h){const c=JSON.parse(JSON.stringify(h||{}));for(const x of c.sets||[])if('rir' in x)x.rir=clampRir(x.rir);return c}
// ---------- deload.py deload_check ----------
function rirDrift(dt,flat,now){const R=dt.rules.logger.deload_signals.rir_drift,cut=isoAdd(now,-R.lookback_days),rows=[];
  for(const q of flat){if(q.s.deload)continue;const day=sday(q.s);if(day>now)continue;for(const x of q.sets)if(x.kind==='working'&&x.reps>0&&x.load_kg>EPS&&!x.tag)rows.push([day,x])}
  const ev={};rows.forEach(([day,x],i)=>{if(day<=cut||x.rir===null)return;const prev=rows.slice(0,i).filter(([d,y])=>d<day&&y.ex===x.ex&&y.rir!==null&&Math.abs(y.load_kg-x.load_kg)<=R.load_tolerance_pct/100*x.load_kg);
    if(!prev.length)return;const y=prev[prev.length-1][1];if(x.reps<=y.reps&&x.rir<y.rir)(ev[x.ex]=ev[x.ex]||[]).push(x.id)});return ev}
function weeksOver(dt,h,flat,now){const R=dt.rules.logger.deload_signals.hard_sets_over_target,TG=dt.targets.targets,ws=wk(now),res=[];
  for(let k=1;k<=R.weeks;k++){const w=isoAdd(ws,-7*k),hs=completedAnalytics(dt,h,w,flat).hard_sets.per_muscle;
    res.push({week_start:w,over:Object.keys(hs).filter(m=>m in TG&&hs[m]>TG[m].max+1e-9).sort()})}return res}
function deloadCheck(dt,h,now,lifts){const DS=dt.rules.logger.deload_signals,E=DS.eligible,flat=flatten(dt,h);
  const comp=(h.sessions||[]).filter(s=>s.status==='completed').map(sday).sort(),dl=sortBy((h.deloads||[]).map(x=>[String(x.start).slice(0,10),String(x.end).slice(0,10)]),t=>[t[1]]);
  const res={eligible:false,reason:null,score:0,suggest_score:DS.suggest_score,suggest:false,snoozed_until:null,signals:{}};
  if(!comp.length||days(now,comp[0])<7*E.min_logged_weeks||comp.length<E.min_sessions){res.reason='not enough logs yet (about 4 weeks and 8 sessions needed)';return res}
  const last=dl[dl.length-1];if(last&&last[0]<=now&&now<=last[1]){res.reason='deload in progress';return res}
  if(last&&days(now,last[1])<7*E.min_weeks_between_deloads){res.reason='last deload ended less than 4 weeks ago';return res}
  res.eligible=true;const sig=res.signals,since=last?last[1]:comp[0],w=days(now,since)/7;
  const pts=DS.weeks_since_deload.points.filter(([a])=>w>=a).map(([,p])=>p);sig.weeks_since_deload={weeks:pyR(w,2),points:pts.length?Math.max(...pts):0};
  const Pf=DS.performance;
  if(Pf.source==='progress-rules.json#deload')sig.performance=perfSignal(dt,h,now,lifts);   // one deload rule (progress3): Progress lift statuses
  else{const tr={};for(const [ex,t] of Object.entries(exerciseTrends(dt,flat,now)))if(t.status!=='insufficient')tr[ex]=t;
  const n=Object.keys(tr).length,drop=Object.values(tr).filter(t=>t.status==='dropping').length,stl=Object.values(tr).filter(t=>t.status==='stalled').length;let pp=0;
  if(n>=Pf.min_lifts){if(drop/n>=Pf.dropping_share-1e-9)pp=Pf.points_dropping;else if((drop+stl)/n>=Pf.stalled_or_dropping_share-1e-9)pp=Pf.points_stalled}
  const be={};for(const k of Object.keys(tr).sort())be[k]=tr[k].status;sig.performance={lifts:n,dropping:drop,stalled:stl,up:n-drop-stl,points:pp,by_exercise:be}}
  const ev=rirDrift(dt,flat,now);sig.rir_drift={exercises:Object.keys(ev).sort(),points:Object.keys(ev).length>=DS.rir_drift.min_exercises?DS.rir_drift.points:0};
  const wo=weeksOver(dt,h,flat,now),H=DS.hard_sets_over_target;sig.hard_sets_over_target={weeks:wo,points:wo.every(x=>x.over.length>=H.min_muscles)?H.points:0};
  const Rd=DS.readiness,rd=(h.readiness||[]).filter(r=>{const d=days(now,String(r.date).slice(0,10));return 0<=d&&d<Rd.days}).map(r=>r.score),mean=rd.length?rd.reduce((a,b)=>a+b,0)/rd.length:null;
  sig.readiness={entries:rd.length,mean:mean===null?null:pyR(mean,4),points:rd.length>=Rd.min_entries&&mean<=Rd.max_mean+1e-9?Rd.points:0};
  res.score=Object.values(sig).reduce((a,s)=>a+s.points,0);const snz=(h.deloadPrompt||{}).snoozedUntil;if(snz&&String(snz).slice(0,10)>now)res.snoozed_until=String(snz).slice(0,10);
  res.suggest=res.score>=DS.suggest_score&&res.snoozed_until===null;return res}
// ---------- progress2 helpers ----------
function P2(dt){if(!dt.PR2)throw new Error('dt.PR2 (progress-rules.json) missing');return dt.PR2}
const r_=(v,n=4)=>v==null?null:pyR(v,n),r05=v=>fl(v*2+0.5)/2;
function fmt(v){v=r05(v);return v===Math.trunc(v)?String(v):v.toFixed(1)}
function pct(p){const a=Math.abs(p),t=a>=0.95?fmt(a):pyR(a,1).toFixed(1);return t.endsWith('.0')?t.slice(0,-2):t}
const fmt1=(v,u)=>u==='lb'?String(Math.trunc(fl(v+0.5))):fmt(v);
const capz=s=>s?s[0].toUpperCase()+s.slice(1).toLowerCase():s;
const fmtS=(t,o)=>t.replace(/\{(\w+)\}/g,(m,k)=>k in o?String(o[k]):m);
function liftKind(dt,i,EX){const e=EX[i]||{};let unit='reps';try{unit=(WB.repRange(dt,i)||{}).unit||'reps'}catch(x){unit='reps'}
  if(((e.swap||{}).flags||[]).includes('static_hold')||unit==='seconds')return 'hold';if(unit==='meters')return 'distance';if((e.bodyweight_fraction||0)>0)return 'bodyweight';
  const ms=e.muscles||{},ks=Object.keys(ms);if(ks.length){const top=pyMax(ks,m=>[ms[m],-ks.indexOf(m)]);if(top==='abs'||top==='obliques')return 'core'}return 'e1rm'}
const metricName=(k,loaded)=>({hold:'hold_s',distance:'load_index',bodyweight:'reps',e1rm:'e1rm'})[k]||(loaded?'load_index':'reps');
function value(e,m){if(m==='load_index')return Math.max(...e.sets.map(x=>x.load_kg*(1+x.reps/30)));return {hold_s:e.hold_s,reps:e.best_reps,e1rm:e.e1rm_kg}[m]}
function exposures2(dt,h,asOf,flat,ctxu){const PR=PRSm(),C=PR.ctx(dt),L=rules(dt),R2=P2(dt),E1MAX=R2.e1rm.max_reps,EX=exTable(dt,h),out={};
  for(const q of flat){const s=q.s,day=sday(s);if(day>asOf)continue;if(isDeloadSession(s))continue;const by={},ord=[];
    for(const x of q.sets)if(x.kind==='working'&&x.reps>0){if(!by[x.ex]){by[x.ex]=[];ord.push(x.ex)}by[x.ex].push(x)}
    for(const i of ord){const xs=by[i],k=liftKind(dt,i,EX),u=s.unit||'lb',top=Math.max(...xs.map(x=>x.added_kg)),half=Math.max(...xs.map(x=>PR.stepKg(dt,x,u,C)))*C.sf;
      const at=xs.filter(x=>Math.abs(x.added_kg-top)<=half+EPS),e1=xs.filter(x=>prOk(x,'e1rm',L)&&x.load_kg>EPS&&x.reps<=E1MAX).map(x=>x.load_kg*(1+x.reps/30));
      (out[i]=out[i]||[]).push({date:day,sid:s.id,unit:u,deload:false,kind:k,sets:xs,top_kg:top,half_kg:half,top_eff_kg:Math.max(...at.map(x=>x.load_kg)),
        best_reps:Math.max(...at.map(x=>x.reps)),n_at_top:at.length,tot_at_top:at.reduce((a,x)=>a+x.reps,0),e1rm_kg:e1.length?Math.max(...e1):null,hold_s:k==='hold'?Math.max(...xs.map(x=>x.reps)):null})}}
  const ws=isoAdd(asOf,-R2.dashboard.window_days);
  for(const xs of Object.values(out)){const loaded=xs.some(e=>e.top_kg>EPS);let m=metricName(xs[0].kind,loaded);
    let rec=xs.filter(e=>!e.deload&&e.date>ws);if(!rec.length)rec=xs.filter(e=>!e.deload);if(!rec.length)rec=xs;
    if(m==='e1rm'&&rec.some(e=>e.e1rm_kg===null))m='load_index';for(const e of xs){e.metric=m;e.value=value(e,m)}}
  return out}
function change(c,r){if(c.kind==='hold')return c.hold_s>r.hold_s?'hold_up':c.hold_s<r.hold_s?'hold_down':'same';const hh=Math.max(c.half_kg,r.half_kg);
  if(c.top_kg>r.top_kg+hh+EPS)return 'load_up';if(c.top_kg<r.top_kg-hh-EPS)return 'load_down';
  if(c.best_reps!==r.best_reps)return c.best_reps>r.best_reps?'reps_up':'reps_down';if(c.n_at_top===r.n_at_top&&c.tot_at_top!==r.tot_at_top)return c.tot_at_top>r.tot_at_top?'reps_up':'reps_down';return 'same'}
const isGain=(c,r)=>['load_up','reps_up','hold_up'].includes(change(c,r));
function isDecline(c,p,FLAT){if(isGain(c,p))return false;const a=c.value,b=p.value;if(a==null||b==null)return ['load_down','reps_down','hold_down'].includes(change(c,p));return a<b*(1-FLAT)-1e-12}
function mk(dt,h){const L=rules(dt),R2=P2(dt),lb=L.lbPerKg,toU=(kg,u)=>u==='lb'?kg*lb:kg,FLAT=R2.lift_status.flat_pct/100;
  const topTxt=(e,u)=>e.kind==='hold'?`${e.hold_s} s`:e.top_kg<=EPS?`${e.best_reps} reps`:`${fmt(toU(e.top_kg,u))} ${u} \u00d7 ${e.best_reps}`;
  const vdisp=(v,m,u)=>v==null?null:m==='e1rm'?`${fmt1(toU(v,u),u)} ${u}`:m==='load_index'?`${fmt1(toU(v,u),u)} (load-reps index)`:m==='hold_s'?`${v} s`:`${v} reps`;
  return {L,R2,toU,FLAT,topTxt,vdisp}}
function gainText(K,c0,r,u){const T=K.R2.comparable.texts,c=change(c0,r);let t;
  if(c==='load_up'||c==='load_down')t=fmtS(T[c],{d:fmt(Math.abs(K.toU(c0.top_kg-r.top_kg,u))),u});
  else if(c==='reps_up'||c==='reps_down'){const n=Math.abs(c0.best_reps-r.best_reps)||Math.abs(c0.tot_at_top-r.tot_at_top);t=fmtS(T[c],{n,s:n===1?'':'s'});
    if(c0.top_kg<=EPS&&(c0.kind==='bodyweight'||c0.kind==='core'))t=t.replace(' at same weight','')}
  else if(c==='hold_up'||c==='hold_down')t=fmtS(T[c],{n:Math.abs(c0.hold_s-r.hold_s)});else t=T.same;return [c,t]}
function gainVsLast(K,xs0,u){const xs=xs0.filter(e=>!e.deload);if(!xs.length)return null;const cur=xs[xs.length-1],T=K.R2.comparable.texts;
  if(xs.length<2)return {status:'first',text:T.first,date:cur.date,prev_date:null,detail:null,gain:false};const prev=xs[xs.length-2];
  if(days(cur.date,prev.date)>K.R2.comparable.max_gap_days)return {status:'none',text:T.none,date:cur.date,prev_date:null,detail:null,gain:false};
  const [c,t]=gainText(K,cur,prev,u),X=' \u00d7 ',ld=e=>{const s=K.topTxt(e,u);return s.includes(X)?s.slice(0,s.lastIndexOf(X)):s};
  let det=fmtS(K.R2.comparable.detail,{load:ld(cur),reps:cur.best_reps,pload:ld(prev),preps:prev.best_reps});
  if(cur.kind==='hold'||cur.top_kg<=EPS)det=`Top set ${K.topTxt(cur,u)} (was ${K.topTxt(prev,u)})`;
  return {status:c,text:t,gain:['load_up','reps_up','hold_up'].includes(c),date:cur.date,prev_date:prev.date,detail:det}}
const prBetter=(K,v,b,m)=>b==null?false:(m==='e1rm'||m==='load_index')?v>b*(1+K.FLAT)+1e-12:v>b;
function weeklyBest(K,xs,u){const W={};for(const e of xs){if(e.deload||e.value==null)continue;const w=wk(e.date);W[w]=w in W?Math.max(W[w],e.value):e.value}
  const out=[],m=xs.length?xs[0].metric:null;let best=null;
  for(const w of Object.keys(W).sort()){const v=W[w],pr=prBetter(K,v,best,m);out.push({week:w,value:r_(v),display:K.vdisp(v,m,u),pr_week:pr});best=best===null?v:Math.max(best,v)}return out}
function liftTrend(K,xs,asOf,u){const T=K.R2.trend,start=isoAdd(asOf,-T.window_days);let win=xs.filter(e=>!e.deload&&start<e.date&&e.date<=asOf&&e.value!=null);
  const lx=xs[xs.length-1];if(win.length&&lx.metric==='reps'&&lx.kind==='bodyweight'){const z=win[win.length-1];win=win.filter(e=>Math.abs(e.top_kg-z.top_kg)<=Math.max(e.half_kg,z.half_kg)+EPS)}
  const W={};for(const e of win){const w=wk(e.date);W[w]=Math.max(w in W?W[w]:e.value,e.value)}
  const res={exposures:win.length,weeks:Object.keys(W).length,status:'insufficient',pct_per_week:null,abs_per_week:null,words:T.words.insufficient};
  if(win.length<T.min_exposures||Object.keys(W).length<T.min_weeks||days(win[win.length-1].date,win[0].date)<T.min_span_days)return res;
  const ws=Object.keys(W).sort(),pts=ws.map(w=>[days(w,ws[0])/7,W[w]]),n=pts.length,mx=pts.reduce((a,p)=>a+p[0],0)/n,my=pts.reduce((a,p)=>a+p[1],0)/n;
  const den=pts.reduce((a,p)=>a+(p[0]-mx)**2,0),sl=den?pts.reduce((a,p)=>a+(p[0]-mx)*(p[1]-my),0)/den:0,p=my>0?sl/my*100:0;
  const st=p>T.up_pct_per_week?'up':p<T.down_pct_per_week?'down':'flat',m=lx.metric,av=(m==='e1rm'||m==='load_index')?K.toU(sl,u):sl;
  const ab=`${av>=0?'+':'\u2212'}${fmt(Math.abs(av))}`,absw=st!=='flat'?fmtS(T.abs_words[m],{v:ab,u}):'';
  return Object.assign(res,{status:st,pct_per_week:pyR(p,4),abs_per_week:pyR(av,4),words:fmtS(T.words[st],{p:pct(p),abs:absw})})}
// bodyweight lifts: stall / dropping compare only sessions at the latest session's added load (within half a step)
function sameLoadXs(xs){const nd=xs.filter(e=>!e.deload);if(!nd.length||nd[nd.length-1].kind!=='bodyweight')return xs;const L=nd[nd.length-1],t=L.top_kg;
  return xs.filter(e=>Math.abs(e.top_kg-t)<=Math.max(e.half_kg,L.half_kg)+EPS)}
function stallState(K,xs0){const S=K.R2.lift_status,xs=sameLoadXs(xs0).filter(e=>!e.deload);let best=xs.length?xs[0]:null,trail=0;
  for(const e of xs.slice(1)){if(isGain(e,best)){best=e;trail=0}else trail++}const span=xs.length?days(xs[xs.length-1].date,xs[0].date):0;
  const stalled=xs.length>=S.stall_min_total&&span>=S.stall_min_span_days&&trail>=S.stall_min_exposures;let dropping=false;
  if(xs.length>=S.stall_min_total){const nd=S.dropping_consecutive,nref=S.dropping_ref_exposures,pool=xs.slice(Math.max(0,xs.length-nd-nref),xs.length-nd),vals=pool.filter(e=>e.value!=null);
    const ref=vals.length?pyMax(vals,e=>[e.value]):pool[pool.length-1];dropping=xs.slice(-nd).every(e=>isDecline(e,ref,K.FLAT))}   // recent best: best of the 3 exposures before the last 2
  return {trailing_no_gain:trail,best_date:best?best.date:null,stalled,dropping,exposures:xs.length,span_days:span}}
const liftStatus=(tr,st)=>st.dropping?'dropping':st.stalled?'stalled':tr.status;
function tmin(dt,m,level){const T=dt.targets.targets[m];if(!T)return [null,null];return [fl(T.min*dt.targets.levelMinFactor[level]*2+0.5)/2,T.max]}
function noDeload(h){const ds=new Set((h.sessions||[]).filter(isDeloadSession).map(s=>s.id));if(!ds.size)return h;const ent=new Set((h.entries||[]).filter(e=>ds.has(e.sessionId)).map(e=>e.id));
  return Object.assign({},h,{sessions:h.sessions.filter(s=>!ds.has(s.id)),entries:(h.entries||[]).filter(e=>!ent.has(e.id)),sets:(h.sets||[]).filter(x=>!ent.has(x.entryId))})}
// credited hard sets per muscle, last n full weeks before the as-of week; weeks with a deload session are skipped (next earlier week, up to 8 back) (progress5)
function creditedWeeks(dt,h,flat,asOf,n){const cur=wk(asOf),out=[],dlw=new Set((h.sessions||[]).filter(isDeloadSession).map(s=>wk(sday(s)))),hn=noDeload(h),fn=hn===h?flat:flatten(dt,hn);
  for(let k=1;k<n+9;k++){if(out.length===n)break;const w=isoAdd(cur,-7*k);if(dlw.has(w))continue;out.push([w,completedAnalytics(dt,hn,w,fn).hard_sets.per_muscle])}return out}
const daysWith=(rt,i)=>(rt||[]).filter(d=>d.tiles.some(t=>t.id===i)).map(d=>d.day);
function opsOk(dt,rt,ops,level){let nw;try{nw=AN.applyOps(rt,ops)}catch(e){return false}return valid(dt,rt,nw,level)}
function chooseFix(dt,K,m,i,lst,st,cx){const F=K.R2.fix,EX=cx.EX,rt=cx.routine,level=cx.level;
  if(cx.deload.suggest)return {kind:'deload',text:'Take a lighter week (about half the sets, RIR 3 to 4), then build back up',apply_edits_board:false,ops:null};
  const nm=EX[i].name,[lo,hi]=tmin(dt,m,level),W=cx.credited.slice(0,F.weeks_for_sets),mean=W.length?W.reduce((a,[,x])=>a+(x[m]||0),0)/W.length:null,dd=daysWith(rt,i),DN=dt.rules.day_names||{};
  if(mean!==null&&lo!==null&&dd.length){const t=_day(rt,dd[0]).tiles.find(t=>t.id===i);
    if(mean<lo-1e-9){const ops=[{op:'sets',day:dd[0],id:i,from:t.sets,to:t.sets+1}];
      if(opsOk(dt,rt,ops,level))return {kind:'sets_up',text:`Add 1 set of ${nm} on ${DN[dd[0]]||dd[0]} (${fmt(mean)} credited sets a week, below the ${fmt(lo)} minimum)`,apply_edits_board:true,ops,weekly_sets:r_(mean),target:[lo,hi]}}
    if(mean>hi+1e-9&&t.sets>F.sets_min){const ops=[{op:'sets',day:dd[0],id:i,from:t.sets,to:t.sets-1}];
      if(opsOk(dt,rt,ops,level))return {kind:'sets_down',text:`Drop 1 set of ${nm} (${fmt(mean)} credited sets a week, above the ${fmt(hi)} maximum)`,apply_edits_board:true,ops,weekly_sets:r_(mean),target:[lo,hi]}}}
  if(st.trailing_no_gain>=F.swap_after_exposures){let elig;try{elig=new Set(TP.eligible(dt,TP.ruleFor(dt,i),level))}catch(e){elig=new Set(Object.keys(dt.EX))}
    const inRt=new Set(rt.flatMap(d=>d.tiles.map(t=>t.id)));let cs=[];try{cs=RANK.swaps(dt,i,40).map(c=>c.id).filter(c=>elig.has(c)&&!inRt.has(c)&&dt.EX[c]&&RANK.fam(dt.EX[c])===RANK.fam(dt.EX[i]))}catch(e){cs=[]}
    for(const to of cs){const ops=[];for(const d of dd)for(const t of _day(rt,d).tiles)if(t.id===i)ops.push({op:'swap',day:d,from_id:i,to_id:to,sets:t.sets});
      if(ops.length&&!opsOk(dt,rt,ops,level))continue;
      return {kind:'swap',text:`Swap ${nm} for ${dt.EX[to].name} for a few weeks (a similar exercise for the same slot)`,apply_edits_board:!!ops.length,ops:ops.length?ops:null,to_id:to}}}
  const R_=WB.repRange(dt,i,cx.goal),lo_=R_.low,hi_=R_.high,mid=fl((lo_+hi_)/2),nd=cx.xs[i].filter(e=>!e.deload),rec=nd.slice(-Math.max(3,Math.min(st.trailing_no_gain,6)));
  const reps=rec.length?rec.map(e=>e.best_reps).sort((a,b)=>a-b)[fl(rec.length/2)]:lo_,rng=reps<=mid?[mid,hi_]:[lo_,mid],su={reps:' reps',seconds:' s',meters:' m'}[R_.unit]||' reps';
  return {kind:'rep_range',text:`Try ${rng[0]}\u2013${rng[1]}${su} on ${nm} for a while (top sets were ${reps}; range ${lo_}\u2013${hi_})`,apply_edits_board:false,ops:null,suggest_range:rng,rep_range:[lo_,hi_],from_reps_median:reps}}
// the one performance signal of the deload rule (rules.json logger.deload_signals.performance -> progress-rules.json#deload); lifts = report() lift table
function perfSignal(dt,h,asOf,lifts){const D=P2(dt).deload;if(!lifts)lifts=liftStatuses(dt,normalize(h),asOf);
  const st={};for(const i of Object.keys(lifts))if(lifts[i].status!=='insufficient')st[i]=lifts[i].status;
  const recent=isoAdd(asOf,-D.several_lifts_dropping.within_days),drop=Object.keys(lifts).filter(i=>lifts[i].status==='dropping'&&lifts[i].last_date>recent).sort();
  const sev=drop.length>=D.several_lifts_dropping.min_lifts,n=Object.keys(st).length,sd=Object.values(st).filter(s=>s==='stalled'||s==='dropping').length;
  const pts=sev?D.several_lifts_dropping.points:(n>=D.mostly_stalled.min_lifts&&sd/n>=D.mostly_stalled.share-1e-9?D.mostly_stalled.points:0),be={};for(const k of Object.keys(st).sort())be[k]=st[k];
  return {source:'progress2',lifts:n,dropping:Object.keys(st).filter(i=>st[i]==='dropping').sort(),dropping_recent:drop,stalled:Object.keys(st).filter(i=>st[i]==='stalled').sort(),several_lifts_dropping:sev,points:pts,by_exercise:be}}
function liftStatuses(dt,h,asOf){const K=mk(dt,h),u=((h.settings||{}).unit)||'lb',xsall=exposures2(dt,h,asOf,flatten(dt,h)),out={};
  for(const i of Object.keys(xsall).sort()){const xs=xsall[i],nd=xs.filter(e=>!e.deload);out[i]={status:liftStatus(liftTrend(K,xs,asOf,u),stallState(K,xs)),last_date:(nd.length?nd:xs)[(nd.length?nd:xs).length-1].date}}return out}
function deloadRule(dt,K,h,asOf,lifts){const D=K.R2.deload,base=deloadCheck(dt,h,asOf,lifts),sig=base.signals,sev=!!((sig.performance||{}).several_lifts_dropping);
  return {eligible:base.eligible,reason:base.reason,several_lifts_dropping:sev,score:base.score,suggest_score:base.suggest_score,suggest:base.suggest,snoozed_until:base.snoozed_until,signals:sig,apply_edits_board:D.apply_edits_board}}
function prEvents(K,xs0,u,asOf,EX,i){const W=K.R2.wins,xs=xs0.filter(e=>!e.deload),ev=[];if(!xs.length)return ev;
  const nm=EX[i].name,k=xs[0].kind,m=xs[0].metric;let bestE1=xs[0].e1rm_kg,bestTop=xs[0].top_kg,bestHold=xs[0].hold_s;const prior=xs[0].sets.slice();
  const ML=Object.keys(W.milestone.lifts).filter(key=>W.milestone.lifts[key].includes(i)),hit=new Set(),plates=un=>un==='lb'?W.milestone.plates_lb:W.milestone.plates_kg;
  for(const x of xs[0].sets)for(const p of plates(xs[0].unit))if(ML.length&&K.toU(x.added_kg,xs[0].unit)>=p-1e-6)hit.add(xs[0].unit+'|'+p);
  for(const e of xs.slice(1)){const d=e.date,here=[];
    if(ML.length)for(const p of plates(e.unit)){if(hit.has(e.unit+'|'+p))continue;
      if(e.sets.some(x=>K.toU(x.added_kg,e.unit)>=p-1e-6)){hit.add(e.unit+'|'+p);const lab=e.unit==='lb'?(W.milestone.labels[String(p)]||''):'';
        here.push({kind:'milestone',value:p,text:`${nm}: first ${p} ${e.unit} set`+(lab?` (${lab})`:''),gain_pct:null})}}
    if(k==='hold'){if(e.hold_s>bestHold)here.push({kind:'hold_pr',value:e.hold_s,text:`${nm}: longest hold, ${e.hold_s} s`,gain_pct:r_((e.hold_s/bestHold-1)*100,2)})}
    else{if(m==='e1rm'&&e.e1rm_kg!=null&&bestE1!=null&&e.e1rm_kg>bestE1*(1+K.FLAT)+1e-12)
        here.push({kind:'e1rm_pr',value:r_(e.e1rm_kg),text:`${nm}: estimated 1RM PR, about ${fmt1(K.toU(e.e1rm_kg,u),u)} ${u}`,gain_pct:r_((e.e1rm_kg/bestE1-1)*100,2)});
      if(e.top_kg>EPS&&e.top_kg>bestTop+e.half_kg+EPS)here.push({kind:'load_pr',value:r_(e.top_kg),text:`${nm}: heaviest yet, ${K.topTxt(e,u)}`,gain_pct:bestTop>EPS?r_((e.top_kg/bestTop-1)*100,2):null});
      let rp=null;for(const x of e.sets){const pr=prior.filter(y=>y.added_kg>=x.added_kg-e.half_kg-EPS).map(y=>y.reps);
        if(pr.length&&x.reps>Math.max(...pr)&&(rp===null||cmpT([x.added_kg,x.reps],[rp[0].added_kg,rp[0].reps])>0))rp=[x,Math.max(...pr)]}
      if(rp){const [x,b]=rp,at=x.added_kg>EPS?` at ${fmt(K.toU(x.added_kg,e.unit))} ${e.unit}`:'';here.push({kind:'rep_pr',value:x.reps,text:`${nm}: rep PR, ${x.reps} reps${at}`,gain_pct:r_((x.reps/b-1)*100,2)})}}
    for(const w of here)Object.assign(w,{exercise:i,date:d,session_id:e.sid});if(here.length)ev.push(pyMin(here,w=>[W.kinds[w.kind]]));
    if(e.e1rm_kg!=null)bestE1=bestE1==null?e.e1rm_kg:Math.max(bestE1,e.e1rm_kg);bestTop=Math.max(bestTop,e.top_kg);if(e.hold_s!=null)bestHold=Math.max(bestHold||0,e.hold_s);prior.push(...e.sets)}
  const e1=ev.filter(w=>w.kind==='e1rm_pr');if(e1.length){const w=e1[e1.length-1],allb=Math.max(...xs.map(e=>e.e1rm_kg||0));
    if(Math.abs(allb-w.value)<1e-3&&days(w.date,xs[0].date)>=28){w.kind='strongest_ever';w.text=`${nm}: strongest ever, estimated 1RM about ${fmt1(K.toU(w.value,u),u)} ${u}`}}
  return ev}
function wins(K,xsall,asOf,u,EX,mains,chg){const W=K.R2.wins,V=W.vs_3_months,ids=Object.keys(xsall).sort();let allev=[];const v3={};
  for(const i of ids)allev=allev.concat(prEvents(K,xsall[i],u,asOf,EX,i));
  for(const i of Object.keys(chg||{}).sort()){const c=chg[i];if(c.status!=='ok')continue;
    v3[i]={metric:c.metric,now:c.late.value,then:c.early.value,pct:c.pct,now_display:c.late.display,then_display:c.early.display,
      text:`${EX[i].name}: ${c.pct_display} vs 3 months ago (${c.early.display} \u2192 ${c.late.display})`}}
  const recent=allev.filter(w=>{const d=days(asOf,w.date);return 0<=d&&d<W.window_days});
  const key=w=>[W.kinds[w.kind],mains.has(w.exercise)?0:1,TYPE_RANK[(EX[w.exercise]||{}).type]??3,-dn(w.date),-(w.gain_pct||0),w.exercise],best={};
  for(const w of sortBy(recent,key))if(!(w.exercise in best))best[w.exercise]=w;
  const extra=sortBy(Object.keys(v3).filter(i=>v3[i].pct>=V.min_gain_pct&&!(i in best)).map(i=>({kind:'vs_3_months',exercise:i,date:asOf,session_id:null,value:v3[i].pct,gain_pct:v3[i].pct,text:v3[i].text})),w=>[-w.gain_pct,w.exercise]).slice(0,V.max_shown);
  const lst=sortBy(sortBy(Object.values(best),key).concat(extra),key);
  const res={shown:lst.slice(0,W.max_shown),more:Math.max(0,lst.length-W.max_shown),all_events:allev,vs_3_months:v3};
  Object.defineProperty(res,'list',{value:lst,enumerable:false});return res} // list: every win in order (the "+N more" view); not part of the parity payload
const effortDisplay=(avg,mode)=>avg==null?'Not enough RIR logged':mode==='rpe'?`Average RPE about ${fmt(10-avg)}`:`Average RIR about ${fmt(avg)}`;
// progress7 main-lift rule (progress-rules muscle.main_lift_choice; tools/progress.py choose_main_lifts): candidates = lifts crediting the muscle
// >= 0.25 with a non-deload session in the 42-day window. 1) overrides / pins win; 2) specific, all muscles first: ratio >= 0.75 and the muscle is
// the lift's primary muscle (its highest ratio, ties allowed); 3) the rest in muscle order: rated >= 0.5 (none: >= 0.25), an unshared lift before
// one that is already another muscle's main lift. Ties: most sessions, higher ratio, more credited sets, type, id. -> {m: {id, selection}}
function primaryMuscles(e){const ms=Object.entries(((e||{}).muscles)||{}).filter(([,v])=>v),top=Math.max(0,...ms.map(([,v])=>v));return new Set(top?ms.filter(([,v])=>v>=top-1e-12).map(([m])=>m):[])}
function chooseMainLifts(K,xsall,asOf,EX,pins){const MC=K.R2.muscle.main_lift_choice,L=K.L,start=isoAdd(asOf,-K.R2.trend.window_days),hard=x=>x.rir===null||x.rir<=L.hardRIR,C={};
  for(const m of L.muscles){const sess={},wts={};
    for(const [i,xs] of Object.entries(xsall)){const r=((EX[i]||{}).muscles||{})[m]||0;if(r<L.min_rating)continue;
      for(const e of xs)if(start<e.date&&e.date<=asOf){sess[i]=(sess[i]||0)+1;wts[i]=(wts[i]||0)+r*e.sets.filter(hard).length}}
    if(Object.keys(sess).length)C[m]=[sess,wts]}
  const key=(m,i)=>[-C[m][0][i],-EX[i].muscles[m],-(C[m][1][i]||0),TYPE_RANK[EX[i].type]??3,i],out={};
  for(const [m,i] of Object.entries(pins))out[m]={id:i,selection:'override'};
  for(const m of L.muscles){if(m in out||!C[m])continue;const sp=Object.keys(C[m][0]).filter(i=>EX[i].muscles[m]>=MC.specific_min_ratio-1e-12&&primaryMuscles(EX[i]).has(m));
    if(sp.length)out[m]={id:sortBy(sp,i=>key(m,i))[0],selection:'specific'}}
  for(const m of L.muscles){if(m in out||!C[m])continue;let cand=Object.keys(C[m][0]).filter(i=>EX[i].muscles[m]>=K.R2.muscle.main_lift_min_rating-1e-12);if(!cand.length)cand=Object.keys(C[m][0]);
    const used=new Set(Object.entries(out).filter(([k])=>k!==m).map(([,v])=>v.id)),i=sortBy(cand,i=>[used.has(i)?1:0,...key(m,i)])[0];out[m]={id:i,selection:used.has(i)?'shared':'unshared'}}
  return out}
function muscles2(dt,K,xsall,lifts,h,asOf,EX,cx){const M=K.R2.muscle,T=K.R2.trend,start=isoAdd(asOf,-T.window_days),pins=Object.fromEntries(Object.entries(cx.overrides.applied).map(([m,v])=>[m,v.id])),E=K.R2.effort,est=isoAdd(asOf,-E.summary_window_days),out={},L=K.L,hard=x=>x.rir===null||x.rir<=L.hardRIR,MAINS=chooseMainLifts(K,xsall,asOf,EX,pins);cx.mains=MAINS;
  for(const m of L.muscles){const wts={},weeks=new Set(),sess={};let rs=0,rw=0,rn=0;
    for(const [i,xs] of Object.entries(xsall)){const r=((EX[i]||{}).muscles||{})[m]||0;if(r<L.min_rating)continue;
      for(const e of xs){if(e.deload)continue;if(start<e.date&&e.date<=asOf){const hs=e.sets.filter(hard).length;if(hs){wts[i]=(wts[i]||0)+r*hs;weeks.add(wk(e.date))}sess[i]=(sess[i]||0)+1}
        if(est<e.date&&e.date<=asOf)for(const x of e.sets)if(x.rir!=null){rs+=r*x.rir;rw+=r;rn++}}}
    if(!Object.keys(wts).length&&!Object.keys(sess).length&&!(m in pins))continue;
    const tl={};for(const i of Object.keys(wts))if(lifts[i].trend.pct_per_week!=null)tl[i]=lifts[i].trend.pct_per_week;
    const den=Object.keys(tl).reduce((a,i)=>a+wts[i],0),ok=Object.keys(tl).length>0&&weeks.size>=T.min_weeks,p=ok&&den?Object.keys(tl).reduce((a,i)=>a+wts[i]*tl[i],0)/den:null;
    const tst=p===null?'insufficient':p>T.up_pct_per_week?'up':p<T.down_pct_per_week?'down':'flat',pin=pins[m],pinned=!!pin,main=(MAINS[m]||{}).id||null;
    const Lm=main?lifts[main]:null,tw=Object.values(wts).reduce((a,b)=>a+b,0),sw=Object.keys(wts).filter(i=>['stalled','dropping'].includes(lifts[i].status)).reduce((a,i)=>a+wts[i],0),share=tw?sw/tw:0;
    const stuck=!!((tst==='flat'||tst==='down')&&Lm&&['stalled','dropping'].includes(Lm.status)&&share>=M.stuck_share-1e-9),avg=rw?rs/rw:null,effOk=rn>=E.summary_min_sets;
    const wbl={};for(const i of Object.keys(wts).sort())wbl[i]=r_(wts[i]);
    out[m]={trend:{status:tst,pct_per_week:r_(p),words:fmtS(T.words[tst],{p:p!==null?pct(p):'',abs:''}),weeks_with_sets:weeks.size,lifts:Object.keys(tl).sort()},
      main_lift:{id:main,name:main?EX[main].name:null,pinned,override_source:pinned?cx.overrides.applied[m].source:null,selection:(MAINS[m]||{}).selection??null,sessions_in_window:main?(sess[main]||0):0,status:Lm?Lm.status:null},
      latest_gain:Lm?Lm.gain_vs_last:null,weight_by_lift:wbl,stalled_or_dropping_share:r_(share),stuck,
      effort:{avg_rir:effOk?r_(avg,2):null,sets_with_rir:rn,display:effortDisplay(effOk?avg:null,cx.mode),far_from_failure:!!(effOk&&avg>=E.far_from_failure_avg_rir-1e-9)}}}
  return out}
function footnote(dt,K,h,asOf){const F=K.R2.footnote,st=isoAdd(asOf,-F.days),al=K.L.aliases,ent=h.entries||[],sets=h.sets||[];let pl=0,dd=0;
  for(const s of h.sessions||[]){const d=sday(s);if(!(st<d&&d<=asOf)||!['completed','skipped'].includes(s.status))continue;
    for(const p of (s.snapshot||{}).exercises||[]){pl+=p.sets;if(s.status!=='completed')continue;
      const ids=new Set(ent.filter(e=>e.sessionId===s.id&&!e.added&&!e.skipped&&resolve(e.swappedFrom||e.exerciseId,al)===resolve(p.exerciseId,al)).map(e=>e.id));
      dd+=Math.min(p.sets,sets.filter(x=>ids.has(x.entryId)&&(x.kind||'working')==='working'&&x.done).length)}}
  return {planned_sets:pl,done_sets:dd,days:F.days,text:pl?fmtS(F.text,{done:dd,planned:pl}):null}}
// ---------------- deload sessions (progress5, progress-rules deload_sessions: rule "exclude", deload_flag) ----------------
// isDeloadSession(session): the ONE switch (tools/progress.py _is_deload). A session is a deload only when session.deload === true
// (missing / null / 'yes' / anything else = false; no detection from volume or intensity). Deload sessions are dropped once, at the
// source, in exposures2(), so no series, dot, trend, stall / dropping / minimum-data count, KPI, change, vs 3 months or PR sees them.
// Kept as they were: avg RIR, planned vs done, the deload signal (deload.py reads the history directly).
function isDeloadSession(s){return !!s&&s.deload===true}
// ---------------- dashboard (progress3): Coach's tools/progress.py dashboard() ----------------
function dashMetric(xs){const k=xs[0].kind,m=xs[0].metric;if(k==='hold')return 'hold_s';if(k==='bodyweight'||m==='reps')return 'best_reps';return m}
function dashValue(e,dm){if(dm==='hold_s')return e.hold_s;
  if(dm==='best_reps'){if(e.kind!=='bodyweight')return e.sets.length?Math.max(...e.sets.map(x=>x.reps)):null;const r=e.sets.filter(x=>Math.abs(x.added_kg)<=e.half_kg+EPS).map(x=>x.reps);return r.length?Math.max(...r):null}
  return e.value}
const dvdisp=(K,v,dm,u)=>v==null?null:dm==='best_reps'?`${v} reps`:K.vdisp(v,dm,u);
const pctd=p=>p==null?null:(p>=0?'+':'\u2212')+pct(p)+'%';
function band(K,rate){const B=K.R2.dashboard.band;if(rate==null)return 'insufficient';if(rate>B.up_strong_pct_per_week+1e-12)return 'up_strong';if(rate>B.up_pct_per_week+1e-12)return 'up';if(rate<B.down_pct_per_week-1e-12)return 'down';return 'flat'}
function dashChange(K,xs,asOf,u){const DB=K.R2.dashboard,C=DB.change,dm=dashMetric(xs),ws=isoAdd(asOf,-(DB.window_days-1));
  const nd=xs.filter(e=>!e.deload&&ws<=e.date&&e.date<=asOf),pv=nd.map(e=>[e.date,dashValue(e,dm)]).filter(([,v])=>v!=null);
  const out={metric:dm,label:DB.metric.labels[dm],status:'insufficient',reason:null,sessions:pv.length,early:null,late:null,pct:null,pct_display:null,weeks:null,pct_per_week:null,band:'insufficient'};
  if(nd.length&&!pv.length){out.reason='weighted sets only';return out}
  if(pv.length<C.min_sessions){out.reason=`fewer than ${C.min_sessions} sessions in 3 months`;return out}
  const s0=pv[0][0];if(days(asOf,s0)<C.min_first_days_ago){out.reason='less than 8 weeks of data';return out}
  const eTo=isoAdd(s0,C.early_days-1),lFrom=isoAdd(asOf,-(C.late_days-1)),ev=pv.filter(([d])=>d<=eTo),lv=pv.filter(([d])=>d>=lFrom);
  if(!lv.length){out.reason='no session in the last 2 weeks';return out}
  const eb=pyMax(ev,t=>[t[1],t[0]]),lb=pyMax(lv,t=>[t[1],t[0]]);if(eb[1]<=0){out.reason='no starting value';return out}
  const p=(lb[1]/eb[1]-1)*100,w=days(lFrom,s0)/7,rate=p/w;
  Object.assign(out,{status:'ok',early:{from:s0,to:eTo,date:eb[0],value:r_(eb[1]),display:dvdisp(K,eb[1],dm,u)},late:{from:lFrom,to:asOf,date:lb[0],value:r_(lb[1]),display:dvdisp(K,lb[1],dm,u)},
    pct:r_(p,2),pct_display:pctd(p),weeks:r_(w,4),pct_per_week:r_(rate,4),band:band(K,rate)});return out}
function dashWeekly(K,xs,asOf,u,n){const dm=dashMetric(xs),w1=wk(asOf),out=[];
  for(let k=n-1;k>=0;k--){const w=isoAdd(w1,-7*k),es=xs.filter(e=>wk(e.date)===w&&e.date<=asOf),vals=es.filter(e=>!e.deload).map(e=>dashValue(e,dm)).filter(v=>v!=null),v=vals.length?Math.max(...vals):null;
    out.push({week:w,value:r_(v),display:dvdisp(K,v,dm,u)})}return out}
function dashDots(K,xs,asOf,u,prs){const dm=dashMetric(xs),out=[];for(const e of xs){if(e.date>asOf)continue;const v=dashValue(e,dm);if(v==null)continue;
  out.push({date:e.date,session_id:e.sid,value:r_(v),display:dvdisp(K,v,dm,u),pr:prs.has(e.sid),best:false,days_ago:days(asOf,e.date)})}
  let top=null;for(const d of out){d.best=!!(top!==null&&d.value>top+1e-9);top=top===null?d.value:Math.max(top,d.value)}   // dot.best (progress4): above every earlier dot (all history); first + deload dots false
  return out}
// kpis.avg_rir (progress4): plain mean of logged RIR (4+ = 4) over done working sets in the last 28 days, deload sessions left out, each set once
function kpiAvgRir(K,xsall,asOf,mode){const A=K.R2.dashboard.kpis.avg_rir,E=K.R2.effort,est=isoAdd(asOf,-E.summary_window_days),el=[];
  for(const xs of Object.values(xsall))for(const e of xs)if(!e.deload&&e.date>est&&e.date<=asOf)for(const x of e.sets)el.push(x);
  const lg=el.filter(x=>x.rir!=null).map(x=>Math.min(x.rir,4)),n=lg.length,tot=el.length,share=tot?n/tot:null,ok=n>=E.summary_min_sets,v=ok?Math.round((lg.reduce((a,x)=>a+x,0)/n+1e-9)*10)/10:null;
  const disp=v==null?null:mode==='rpe'?A.display_rpe.replace('{v}',(10-v).toFixed(1)):A.display_rir.replace('{v}',v.toFixed(1));
  const note=ok&&share!=null&&share<A.partial_share-1e-12?A.partial_note.replace('{n}',n).replace('{total}',tot):null;
  return {value:v,status:ok?'ok':'insufficient',reason:ok?null:A.reason_insufficient,logged_sets:n,eligible_sets:tot,share_logged:r_(share,4),min_sets:E.summary_min_sets,display:ok?disp:A.reason_display,note,label:A.label}}
const median=v=>{v=v.slice().sort((a,b)=>a-b);const n=v.length;return !n?null:n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2};
function dashboard(K,xsall,lifts,mus,W,chg,asOf,u,mode,OV){const DB=K.R2.dashboard,KP=DB.kpis,prs={};
  for(const w of W.all_events)(prs[w.exercise]=prs[w.exercise]||new Set()).add(w.session_id);
  const L={};for(const i of Object.keys(xsall).sort())L[i]={name:lifts[i].name,metric:chg[i].metric,label:chg[i].label,change:chg[i],dots:dashDots(K,xsall[i],asOf,u,prs[i]||new Set())};
  const M={},mains=[];
  for(const m of K.L.muscles){const v=mus[m],i=v?v.main_lift.id:null;
    if(!i){M[m]={trained:false,band:'not_trained',colour_role:DB.band.colour_roles.not_trained,bucket:null,stalled:false,main_lift:null,change:null,sparkline:null,avg_rir:null};continue}
    const ws=isoAdd(asOf,-(DB.window_days-1)),recent=(xsall[i]||[]).some(e=>ws<=e.date&&e.date<=asOf);
    const c=recent?chg[i]:{metric:chg[i]?chg[i].metric:null,label:chg[i]?chg[i].label:null,status:'insufficient',reason:K.R2.muscle.overrides.reasons.not_recent,sessions:0,weeks:null,pct:null,pct_display:null,pct_per_week:null,early:null,late:null,band:'insufficient'},bd=c.band,st=!!v.stuck;let bucket=bd==='insufficient'&&!st?null:(st||bd==='down'?'stalled_or_dropping':(bd==='up'||bd==='up_strong')?'progressing':'flat');
    if(bd==='insufficient'&&st)bucket='stalled_or_dropping';const ch={};for(const k of ['status','reason','pct','pct_display','pct_per_week','early','late'])ch[k]=c[k];
    M[m]={trained:true,band:bd,colour_role:DB.band.colour_roles[bd],bucket,stalled:st,main_lift:{id:i,name:v.main_lift.name,pinned:v.main_lift.pinned,override_source:v.main_lift.override_source,selection:v.main_lift.selection,metric:c.metric,label:c.label},
      change:ch,sparkline:xsall[i]?dashWeekly(K,xsall[i],asOf,u,DB.sparkline.weeks):Array.from({length:DB.sparkline.weeks},(_,k)=>({week:isoAdd(wk(asOf),-7*(DB.sparkline.weeks-1-k)),value:null,display:null})),avg_rir:v.effort.avg_rir,avg_rir_display:v.effort.display};
    if(!mains.includes(i))mains.push(i)}
  const SC=KP.strength_change,used=mains.slice().sort().filter(i=>chg[i]&&chg[i].status==='ok'&&(chg[i].metric==='e1rm'||chg[i].metric==='load_index')),med=used.length>=SC.min_lifts?median(used.map(i=>chg[i].pct)):null;
  const kc={};for(const b of KP.muscle_counts.buckets)kc[b]=Object.keys(M).filter(m=>M[m].bucket===b).sort();
  const ins=Object.keys(M).filter(m=>M[m].trained&&M[m].bucket===null).sort(),d30=KP.prs_30d.days,pr30=W.all_events.filter(w=>{const d=days(asOf,w.date);return 0<=d&&d<d30}),byk={};
  for(const w of pr30)byk[w.kind]=(byk[w.kind]||0)+1;const bykS={};for(const k of Object.keys(byk).sort())bykS[k]=byk[k];
  const mc={};for(const b of Object.keys(kc))mc[b]=kc[b].length;mc.insufficient=ins.length;mc.muscles=Object.assign({},kc,{insufficient:ins});mc.labels=KP.muscle_counts.labels;
  const ev=sortBy(pr30,w=>[w.date,w.exercise]).reverse().map(w=>({exercise:w.exercise,date:w.date,kind:w.kind,text:w.text,session_id:w.session_id}));
  return {window:{days:DB.window_days,from:isoAdd(asOf,-(DB.window_days-1)),to:asOf,sparkline_weeks:Array.from({length:DB.sparkline.weeks},(_,k)=>isoAdd(wk(asOf),-7*(DB.sparkline.weeks-1-k)))},
    label:K.R2.label,
    kpis:{strength_change:{method:SC.method,pct:r_(med,2),display:pctd(med),status:med!=null?'ok':'insufficient',lifts:used.map(i=>({id:i,pct:chg[i].pct})),n_lifts:used.length,min_lifts:SC.min_lifts,label:SC.label,sublabel:SC.sublabel},
      muscle_counts:mc,prs_30d:{count:pr30.length,by_kind:bykS,events:ev,label:KP.prs_30d.label},avg_rir:kpiAvgRir(K,xsall,asOf,mode)},
    muscles:M,lifts:L,main_lift_overrides:Object.fromEntries(Object.entries((OV||{}).applied||{}).map(([m,v])=>[m,v.id])),overrides_ignored:(OV||{}).ignored||[]}}
// report(dt, history, asOf 'YYYY-MM-DD', routine (days[] or null -> history.routine.days), level, goal)
// main-lift overrides (progress5, tools/progress.py resolve_overrides): settings.mainLiftPins first, then opts.main_lift_overrides on top (the
// argument wins for the same muscle); aliases resolved. Applied only for a known muscle and a known exercise that credits it >= min_ratio (0.25);
// anything else goes to overrides_ignored [{muscle, exercise, source, reason, ratio}] (a valid stored pin for that muscle still applies).
function resolveOverrides(K,h,ov,EX){const O=K.R2.muscle.overrides,al=K.L.aliases,applied={},ignored=[];
  const src=[...Object.keys(((h.settings||{}).mainLiftPins)||{}).sort().map(m=>[m,h.settings.mainLiftPins[m],'settings.mainLiftPins']),...Object.keys(ov||{}).sort().map(m=>[m,ov[m],'main_lift_overrides'])];
  for(const [m,i,sc] of src){const r=typeof i==='string'?resolve(i,al):i;let why;
    if(!K.L.muscles.includes(m))why=O.reasons.unknown_muscle;else if(typeof r!=='string'||!EX[r])why=O.reasons.unknown_exercise;
    else if(((EX[r].muscles||{})[m]||0)<O.min_ratio-1e-12)why=O.reasons.low_ratio;else{applied[m]={id:r,source:sc};continue}
    ignored.push({muscle:m,exercise:i,source:sc,reason:why,ratio:typeof r==='string'?((EX[r]||{}).muscles||{})[m]||0:0})}
  const ap={};for(const m of Object.keys(applied).sort())ap[m]=applied[m];return {applied:ap,ignored}}
// ---------------- headline, overlay, table rows (progress7, progress-spec §15; tools/progress.py strength_score / prs_month / weekly_streak / muscle_mix / overlay / table_rows) ----------------
function uniqueMains(K,D){const out=[];for(const m of K.L.muscles){const x=D.muscles[m];if(x.trained&&x.main_lift&&!out.includes(x.main_lift.id))out.push(x.main_lift.id)}return out}
// Strength Index: 100 x geometric mean of late / early (the dashboard change values) over unique main lifts on the estimated-1RM scale; >= 3 lifts
function strengthScore(K,D,lifts){const S=K.R2.headline.strength_score,mains=uniqueMains(K,D),used=mains.filter(i=>D.lifts[i]&&D.lifts[i].change.status==='ok'&&S.metrics.includes(D.lifts[i].metric));
  const ratios={};for(const i of used)ratios[i]=D.lifts[i].change.late.value/D.lifts[i].change.early.value;const ok=used.length>=S.min_lifts;
  const val=ok?100*Math.exp(used.reduce((a,i)=>a+Math.log(ratios[i]),0)/used.length):null,tl=used.map(i=>lifts[i].trend.pct_per_week).filter(v=>v!=null);
  const slope=ok&&tl.length>=S.arrow_min_lifts?tl.reduce((a,b)=>a+b,0)/tl.length:null,T=K.R2.trend,arrow=slope===null?null:slope>T.up_pct_per_week?'up':slope<T.down_pct_per_week?'down':'flat',iv=ok?Math.floor(val+0.5):null;
  return {value:iv,raw:r_(val,4),status:ok?'ok':'insufficient',reason:ok?null:S.reason_insufficient,baseline:100,lifts:used.map(i=>({id:i,ratio:r_(ratios[i],4)})),n_lifts:used.length,
    arrow,arrow_pct_per_week:r_(slope,4),arrow_lifts:tl.length,display:ok?String(iv):S.reason_display,label:S.label,sublabel:S.sublabel,variants:{dots:{status:'not_available',reason:S.variants.dots.reason}}}}
// PRs this month: unique main lifts whose best dot in the last 30 days beats their best before (e1RM scale >= 1%, reps / seconds: more); one per lift
function prsMonth(K,D,asOf){const S=K.R2.headline.prs_this_month,mains=uniqueMains(K,D),ev=[];let nbs=0;
  for(const i of mains){const L=D.lifts[i];if(!L||!L.dots.length)continue;const pre=L.dots.filter(d=>d.days_ago>=S.days).map(d=>d.value),win=L.dots.filter(d=>d.days_ago<S.days);
    nbs+=win.filter(d=>d.best).length;if(!pre.length||!win.length)continue;const top=Math.max(...win.map(d=>d.value)),p0=Math.max(...pre);
    if(p0<=0||(top/p0-1)*100<S.min_gain_pct[L.metric]-1e-9||top<=p0)continue;const d=win.find(d=>d.value>=top-1e-9);
    ev.push({lift:i,date:d.date,session_id:d.session_id,value:d.value,display:d.display,previous_best:p0,gain_pct:r_((top/p0-1)*100,2)})}
  ev.sort((a,b)=>a.date!==b.date?(a.date<b.date?1:-1):(a.lift<b.lift?1:a.lift>b.lift?-1:0));
  return {count:ev.length,days:S.days,from:isoAdd(asOf,-(S.days-1)),to:asOf,main_lifts:mains.length,new_best_sessions:nbs,events:ev,label:S.label,sublabel:S.sublabel}}
// Weekly streak: Monday weeks with completed non-deload sessions >= the routine's training days (no plan: 2); deload weeks with a session hold it
function weeklyStreak(K,h,routine,asOf){const S=K.R2.headline.streak,days=(routine||[]).filter(d=>d.tiles&&d.tiles.length),target=days.length?days.length:S.no_plan_min,cur=wk(asOf),tsrc=days.length?'routine':'no_plan_default';
  const ses=(h.sessions||[]).filter(s=>s.status==='completed'&&sday(s)<=asOf);if(!ses.length)return {current:0,best:0,target,target_source:tsrc,weeks:[],label:S.label};
  const nd={},dl={};for(const x of ses){const o=isDeloadSession(x)?dl:nd,w=wk(sday(x));o[w]=(o[w]||0)+1}
  const ov=new Set(),okD=v=>/^\d{4}-\d\d-\d\d$/.test(v);for(const d of h.deloads||[]){if(!d||!d.start)continue;const a=String(d.start).slice(0,10),b=String(d.end||d.start).slice(0,10);if(!okD(a)||!okD(b))continue;
    for(let w=wk(a);w<=b;w=isoAdd(w,7))ov.add(w)}
  let w=ses.map(x=>wk(sday(x))).sort()[0],run=0,best=0;const out=[];
  for(;w<=cur;w=isoAdd(w,7)){const n=nd[w]||0,k=dl[w]||0,dw=k>0||ov.has(w);let st;
    if(n>=target){st='met';run++}else if(dw&&n+k>=1)st='deload_kept';else if(w===cur)st='in_progress';else{st='missed';run=0}
    best=Math.max(best,run);out.push({week:w,sessions:n,deload_sessions:k,deload_week:dw,status:st,streak:run})}
  return {current:run,best,target,target_source:tsrc,weeks:out,label:S.label,display:fmtS(S.display,{n:run})}}
function muscleMix(K,D){const S=K.R2.headline.muscle_mix,c={},ins=[],nt=[];for(const k of S.buckets)c[k]=[];
  for(const m of K.L.muscles){const b=D.muscles[m].band;if(b==='not_trained')nt.push(m);else if(b==='insufficient')ins.push(m);else c[S.from_band[b]].push(m)}
  const o={};for(const k of S.buckets)o[k]=c[k].length;return {...o,insufficient:ins.length,not_trained:nt.length,muscles:{...c,insufficient:ins,not_trained:nt},stalled_marker:K.L.muscles.filter(m=>D.muscles[m].stalled),labels:S.labels}}
// % overlay: per unique main lift, (dot value / baseline - 1) x 100 over the 91-day window; baseline = change.early (best of the first 14 days)
function overlay(K,D,asOf){const OVL=K.R2.overlay,ws=isoAdd(asOf,-(K.R2.dashboard.window_days-1)),out=[];
  for(const i of uniqueMains(K,D)){const L=D.lifts[i]||null,muscles=K.L.muscles.filter(m=>D.muscles[m].main_lift&&D.muscles[m].main_lift.id===i),c=D.muscles[muscles[0]].change||{};
    const row={lift:i,name:L?L.name:null,muscles,metric:L?L.metric:null,unit_flag:L?(OVL.unit_flags[L.metric]??null):null,status:c.status||'insufficient',reason:c.reason??null,baseline:null,points:[],last_pct:null};
    if(L&&c.status==='ok'){const b=c.early.value;row.baseline={value:b,date:c.early.date,display:c.early.display,from:c.early.from,to:c.early.to};
      row.points=L.dots.filter(d=>d.date>=ws).map(d=>({date:d.date,pct:r_((d.value/b-1)*100,2),value:d.value,best:d.best}));row.last_pct=c.pct}
    out.push(row)}
  return {lifts:out,window:{from:ws,to:asOf},note:OVL.note}}
// table rows: one per unique main lift; a shared lift lists every muscle it covers ("Deadlift — traps, forearms, lower back")
function tableRows(K,D){const rows=[];
  for(const i of uniqueMains(K,D)){const ms=K.L.muscles.filter(m=>D.muscles[m].trained&&D.muscles[m].main_lift.id===i),x=D.muscles[ms[0]],rr=ms.map(m=>D.muscles[m].avg_rir).filter(v=>v!=null),nm=x.main_lift.name;
    rows.push({lift:i,name:nm,muscles:ms,label:ms.length===1?nm:`${nm} \u2014 ${ms.map(m=>m.replace(/_/g,' ')).join(', ')}`,shared:ms.length>1,metric:x.main_lift.metric,band:x.band,colour_role:x.colour_role,
      change:x.change,sparkline:x.sparkline,stalled:ms.some(m=>D.muscles[m].stalled),avg_rir:rr.length?r_(rr.reduce((a,b)=>a+b,0)/rr.length,2):null,
      avg_rir_by_muscle:Object.fromEntries(ms.map(m=>[m,D.muscles[m].avg_rir])),selection:Object.fromEntries(ms.map(m=>[m,D.muscles[m].main_lift.selection??null]))})}
  return rows}
function progress7(K,D,lifts,h,routine,asOf){D.table_rows=tableRows(K,D);
  D.headline={strength_score:strengthScore(K,D,lifts),prs_this_month:prsMonth(K,D,asOf),streak:weeklyStreak(K,h,routine,asOf),muscle_mix:muscleMix(K,D)};D.overlay=overlay(K,D,asOf);return D}

// ---------------- muscle order + chart default (order1, progress-spec §16; tools/progress.py priority_muscles / muscle_order / chart_default / order1) ----------------
// prefs.bias_muscles -> priority muscles in stated order; cleaning = rank _bias (valid muscle / region ids, dedupe, first ranking.bias.max); a region counts as its parent
function priorityMuscles(dt,K,prefs){const raw=Array.from(((prefs||{}).bias_muscles)||[]),mus=K.L.muscles,RG=(dt.exl&&dt.exl.regionGroup)||{},ok=new Set([...mus,...Object.keys(RG)]);
  const cap=(((dt.rules||{}).ranking||{}).bias||{}).max??3,valid=[...new Set(raw.filter(x=>typeof x==='string'&&ok.has(x)))],kept=valid.slice(0,cap);
  const ignored=[...new Set(raw.filter(x=>!(typeof x==='string'&&kept.includes(x))))],pr=[],src={};
  for(const b of kept){const m=mus.includes(b)?b:RG[b];if(!mus.includes(m))continue;if(!pr.includes(m))pr.push(m);(src[m]=src[m]||[]).push(b)}
  return {pr,src,ignored,cap}}
function muscleOrder(dt,K,D,prefs){const {pr,src,ignored,cap}=priorityMuscles(dt,K,prefs),mus=K.L.muscles,rest=mus.filter(m=>!pr.includes(m));
  const order=[...pr,...rest.filter(m=>D.muscles[m].trained),...rest.filter(m=>!D.muscles[m].trained)];
  return [order.map(m=>({muscle:m,priority:pr.includes(m),priority_rank:pr.includes(m)?pr.indexOf(m)+1:null,trained:D.muscles[m].trained,bias_ids:src[m]||[]})),{priority:pr,ignored,cap}]}
function overlayRow(K,D,i,muscles,c,ws){const OVL=K.R2.overlay,L=D.lifts[i]||null;c=c||{};
  const row={lift:i,name:L?L.name:null,muscles,metric:L?L.metric:null,unit_flag:L?(OVL.unit_flags[L.metric]??null):null,status:c.status||'insufficient',reason:c.reason??null,baseline:null,points:[],last_pct:null};
  if(L&&c.status==='ok'){const b=c.early.value;row.baseline={value:b,date:c.early.date,display:c.early.display,from:c.early.from,to:c.early.to};
    row.points=L.dots.filter(d=>d.date>=ws).map(d=>({date:d.date,pct:r_((d.value/b-1)*100,2),value:d.value,best:d.best}));row.last_pct=c.pct}
  return row}
function chartDefault(K,D,mo,asOf){const CD=K.R2.dashboard.chart_default,ws=isoAdd(asOf,-(K.R2.dashboard.window_days-1)),ov={};for(const r of D.overlay.lifts)ov[r.lift]=r;
  const has=i=>Object.prototype.hasOwnProperty.call(D.lifts,i),eligible=i=>ov[i]?ov[i].status==='ok':(has(i)&&!!D.lifts[i]&&D.lifts[i].change.status==='ok');
  const cand=[],skipped=[];
  for(const r of mo){if(!r.priority)continue;const m=r.muscle,ml=D.muscles[m].main_lift;if(!ml){skipped.push({lift:null,muscle:m,slot:null,reason:'no_main_lift'});continue}cand.push([ml.id,'priority',m,null,false])}
  for(const [slot,core,alt] of CD.ladder_core){if(has(core))cand.push([core,'ladder',null,slot,false]);else if(alt&&has(alt))cand.push([alt,'ladder',null,slot,true])}
  const pick=[],seen={};
  for(const [i,sx,m,slot,sti] of cand){if(seen[i]){if(m&&!seen[i].muscles.includes(m))seen[i].muscles.push(m);if(slot&&seen[i].slot==null){seen[i].slot=slot;seen[i].stand_in=sti}continue}
    if(!eligible(i)){if(!skipped.some(x=>x.lift===i))skipped.push({lift:i,muscle:m,slot,reason:'insufficient'});continue}
    seen[i]={lift:i,source:sx,muscles:m?[m]:[],slot,stand_in:sti};pick.push(seen[i])}
  const lifts=pick.slice(0,CD.cap),chosen=new Set(lifts.map(x=>x.lift)),more=pick.slice(CD.cap).map(x=>x.lift);
  for(const r of D.table_rows)if(!chosen.has(r.lift)&&!more.includes(r.lift)&&eligible(r.lift))more.push(r.lift);
  const extra=[...lifts.map(x=>x.lift),...more].filter(i=>!ov[i]).map(i=>overlayRow(K,D,i,[],D.lifts[i].change,ws));
  return {lifts,more,skipped,cap:CD.cap,extra_series:extra}}
function order1(dt,K,D,prefs,asOf){const [mo,meta]=muscleOrder(dt,K,D,prefs),pos={},pr=new Set(meta.priority);mo.forEach((r,k)=>pos[r.muscle]=k);
  for(const r of D.table_rows){const ms=r.muscles.slice().sort((a,b)=>pos[a]-pos[b]);
    if(ms.some((m,k)=>m!==r.muscles[k])){r.muscles=ms;if(r.shared)r.label=`${r.name} \u2014 ${ms.map(m=>m.replace(/_/g,' ')).join(', ')}`}
    r.priority=ms.some(m=>pr.has(m))}
  D.table_rows.sort((a,b)=>pos[a.muscles[0]]-pos[b.muscles[0]]);D.muscle_order=mo;D.muscle_order_meta=meta;D.chart_default=chartDefault(K,D,mo,asOf);return D}

function report(dt,history,asOf,routine=null,level='intermediate',goal=null,opts=null,prefs=undefined){if(prefs===undefined)prefs=(opts&&opts.prefs)||null;asOf=String(asOf).slice(0,10);const h=normalize(history),K=mk(dt,h),u=((h.settings||{}).unit)||'lb',EX=exTable(dt,h);
  const OV=resolveOverrides(K,h,opts&&opts.main_lift_overrides,EX);
  if(routine==null)routine=(h.routine||{}).days||null;const mode=((h.settings||{}).effort)||'rir',flat=flatten(dt,h),xsall=exposures2(dt,h,asOf,flat);
  const comp=(h.sessions||[]).filter(s=>s.status==='completed'&&sday(s)<=asOf&&!isDeloadSession(s)).map(sday).sort(),lifts={},need=K.R2.trend.min_exposures;
  for(const i of Object.keys(xsall).sort()){const xs=xsall[i],tr=liftTrend(K,xs,asOf,u),st=stallState(K,xs),nd=xs.filter(e=>!e.deload);
    lifts[i]={name:EX[i].name,kind:xs[0].kind,metric:xs[0].metric,exposures:nd.length,last_date:(nd.length?nd:xs)[(nd.length?nd:xs).length-1].date,
      gain_vs_last:gainVsLast(K,xs,u),trend:tr,stall:st,status:liftStatus(tr,st),insufficient_label:tr.status==='insufficient'?fmtS(K.R2.min_data.labels.insufficient_lift,{have:tr.exposures,need}):null,
      weekly_best:weeklyBest(K,xs,u)}}
  const dl=deloadRule(dt,K,h,asOf,lifts),cx={EX,routine:routine||[],level,goal,unit:u,deload:dl,credited:creditedWeeks(dt,h,flat,asOf,K.R2.fix.weeks_for_sets),xs:xsall,mode,overrides:OV};
  const mus=muscles2(dt,K,xsall,lifts,h,asOf,EX,cx),na=[],MU=K.L.muscles;
  const stuck=sortBy(Object.keys(mus).filter(m=>mus[m].stuck),m=>[-lifts[mus[m].main_lift.id].stall.trailing_no_gain,MU.indexOf(m)]);
  const dropping=sortBy(Object.keys(lifts).filter(i=>lifts[i].status==='dropping'),i=>[lifts[i].last_date,i]).reverse(),nm=ms=>capz(ms.map(m=>m.replace(/_/g,' ')).join(' and '));
  if(dl.suggest)na.push({kind:'deload',muscle:null,muscles:stuck,lift:null,lifts:dropping,text:'Signs point to a lighter week',fix:chooseFix(dt,K,null,null,'dropping',null,cx),notes:[]});
  else{const groups=new Map();for(const m of stuck){const id=mus[m].main_lift.id;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(m)}
    for(const [i,ms] of groups){const L=lifts[i],notes=[],ff=ms.filter(m=>mus[m].effort.far_from_failure);
      if(ff.length)notes.push(fmtS(K.R2.effort.far_from_failure_note,{avg:fmt(mus[ff[0]].effort.avg_rir)}));
      const word=L.status==='dropping'?'is dropping':`has had no rep or load gain in the last ${L.stall.trailing_no_gain} sessions`;
      na.push({kind:'muscle_stall',muscle:ms[0],muscles:ms,lift:i,lifts:[i],text:`${nm(ms)}: stuck. ${L.name} ${word}`,fix:chooseFix(dt,K,ms[0],i,L.status,L.stall,cx),notes})}
    const shown=new Set(na.map(x=>x.lift));
    for(const i of dropping.filter(i=>!shown.has(i))){const L=lifts[i],m=dt.EX[i]?RANK.primaryMuscle(dt.EX[i],dt.exl.muscles):pyMax(Object.keys(EX[i].muscles),k=>[EX[i].muscles[k]]);
      na.push({kind:'lift_dropping',muscle:m,muscles:[m],lift:i,lifts:[i],text:`${L.name} is dropping: below its recent best 2 sessions in a row (${L.gain_vs_last.text} last time)`,fix:chooseFix(dt,K,m,i,'dropping',L.stall,cx),notes:[]})}}
  const chg={};for(const i of Object.keys(xsall).sort())chg[i]=dashChange(K,xsall[i],asOf,u);
  const W=wins(K,xsall,asOf,u,EX,new Set(Object.values(mus).map(v=>v.main_lift.id).filter(Boolean)),chg),eff={};for(const [m,v] of Object.entries(mus))eff[m]=v.effort;
  return {as_of:asOf,label:K.R2.label,model_note:K.R2.model_note,unit:u,effort_mode:mode,data:{completed_sessions:comp.length,logged_weeks:new Set(comp.map(wk)).size,first_date:comp.length?comp[0]:null,deload_sessions_excluded:(h.sessions||[]).filter(s=>s.status==='completed'&&sday(s)<=asOf&&isDeloadSession(s)).length},
    lifts,muscles:mus,stall_flags:{muscles:stuck,lifts_stalled:Object.keys(lifts).filter(i=>lifts[i].status==='stalled').sort(),lifts_dropping:Object.keys(lifts).filter(i=>lifts[i].status==='dropping').sort()},
    needs_attention:na,deload:dl,wins:W,effort:eff,footnote:{planned_vs_done:footnote(dt,K,h,asOf)},main_lift_overrides:Object.fromEntries(Object.entries(OV.applied).map(([m,v])=>[m,v.id])),overrides_ignored:OV.ignored,
    dashboard:order1(dt,K,progress7(K,dashboard(K,xsall,lifts,mus,W,chg,asOf,u,mode,OV),lifts,h,routine,asOf),prefs,asOf)}}
const API={report,isDeloadSession,perfSignal,deloadCheck,clampRir,normalize,flatten,completedAnalytics,exerciseTrends,localDate,weekStart:wk};
if(isNode)module.exports=API;else root.PROGRESS=API;
})(typeof window!=='undefined'?window:this);
