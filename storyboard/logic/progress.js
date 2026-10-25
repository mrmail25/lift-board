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
function deloadCheck(dt,h,now){const DS=dt.rules.logger.deload_signals,E=DS.eligible,flat=flatten(dt,h);
  const comp=(h.sessions||[]).filter(s=>s.status==='completed').map(sday).sort(),dl=sortBy((h.deloads||[]).map(x=>[String(x.start).slice(0,10),String(x.end).slice(0,10)]),t=>[t[1]]);
  const res={eligible:false,reason:null,score:0,suggest_score:DS.suggest_score,suggest:false,snoozed_until:null,signals:{}};
  if(!comp.length||days(now,comp[0])<7*E.min_logged_weeks||comp.length<E.min_sessions){res.reason='not enough logs yet (about 4 weeks and 8 sessions needed)';return res}
  const last=dl[dl.length-1];if(last&&last[0]<=now&&now<=last[1]){res.reason='deload in progress';return res}
  if(last&&days(now,last[1])<7*E.min_weeks_between_deloads){res.reason='last deload ended less than 4 weeks ago';return res}
  res.eligible=true;const sig=res.signals,since=last?last[1]:comp[0],w=days(now,since)/7;
  const pts=DS.weeks_since_deload.points.filter(([a])=>w>=a).map(([,p])=>p);sig.weeks_since_deload={weeks:pyR(w,2),points:pts.length?Math.max(...pts):0};
  const tr={};for(const [ex,t] of Object.entries(exerciseTrends(dt,flat,now)))if(t.status!=='insufficient')tr[ex]=t;
  const Pf=DS.performance,n=Object.keys(tr).length,drop=Object.values(tr).filter(t=>t.status==='dropping').length,stl=Object.values(tr).filter(t=>t.status==='stalled').length;let pp=0;
  if(n>=Pf.min_lifts){if(drop/n>=Pf.dropping_share-1e-9)pp=Pf.points_dropping;else if((drop+stl)/n>=Pf.stalled_or_dropping_share-1e-9)pp=Pf.points_stalled}
  const be={};for(const k of Object.keys(tr).sort())be[k]=tr[k].status;sig.performance={lifts:n,dropping:drop,stalled:stl,up:n-drop-stl,points:pp,by_exercise:be};
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
  for(const q of flat){const s=q.s,day=sday(s);if(day>asOf)continue;const by={},ord=[];
    for(const x of q.sets)if(x.kind==='working'&&x.reps>0){if(!by[x.ex]){by[x.ex]=[];ord.push(x.ex)}by[x.ex].push(x)}
    for(const i of ord){const xs=by[i],k=liftKind(dt,i,EX),u=s.unit||'lb',top=Math.max(...xs.map(x=>x.added_kg)),half=Math.max(...xs.map(x=>PR.stepKg(dt,x,u,C)))*C.sf;
      const at=xs.filter(x=>Math.abs(x.added_kg-top)<=half+EPS),e1=xs.filter(x=>prOk(x,'e1rm',L)&&x.load_kg>EPS&&x.reps<=E1MAX).map(x=>x.load_kg*(1+x.reps/30));
      (out[i]=out[i]||[]).push({date:day,sid:s.id,unit:u,deload:!!s.deload,kind:k,sets:xs,top_kg:top,half_kg:half,top_eff_kg:Math.max(...at.map(x=>x.load_kg)),
        best_reps:Math.max(...at.map(x=>x.reps)),n_at_top:at.length,tot_at_top:at.reduce((a,x)=>a+x.reps,0),e1rm_kg:e1.length?Math.max(...e1):null,hold_s:k==='hold'?Math.max(...xs.map(x=>x.reps)):null})}}
  const ws=isoAdd(asOf,-R2.trend.window_days);
  for(const xs of Object.values(out)){const loaded=xs.some(e=>e.top_kg>EPS);let m=metricName(xs[0].kind,loaded);
    let rec=xs.filter(e=>!e.deload&&e.date>ws);if(!rec.length)rec=xs.filter(e=>!e.deload);if(!rec.length)rec=xs;
    if(m==='e1rm'&&rec.filter(e=>e.e1rm_kg!==null).length*2<rec.length)m='load_index';for(const e of xs){e.metric=m;e.value=value(e,m)}}
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
  const dl=new Set(xs.filter(e=>e.deload).map(e=>wk(e.date))),out=[],m=xs.length?xs[0].metric:null;let best=null;
  for(const w of [...new Set([...Object.keys(W),...dl])].sort()){if(!(w in W)){out.push({week:w,value:null,display:null,pr_week:false,deload_week:true});continue}
    const v=W[w],pr=prBetter(K,v,best,m);out.push({week:w,value:r_(v),display:K.vdisp(v,m,u),pr_week:pr,deload_week:dl.has(w)});best=best===null?v:Math.max(best,v)}return out}
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
function stallState(K,xs0){const S=K.R2.lift_status,xs=xs0.filter(e=>!e.deload);let best=xs.length?xs[0]:null,trail=0;
  for(const e of xs.slice(1)){if(isGain(e,best)){best=e;trail=0}else trail++}const span=xs.length?days(xs[xs.length-1].date,xs[0].date):0;
  const stalled=xs.length>=S.stall_min_total&&span>=S.stall_min_span_days&&trail>=S.stall_min_exposures;let dropping=xs.length>=S.stall_min_total;
  if(dropping)for(let k=1;k<=S.dropping_consecutive;k++)if(!isDecline(xs[xs.length-k],xs[xs.length-k-1],K.FLAT)){dropping=false;break}
  return {trailing_no_gain:trail,best_date:best?best.date:null,stalled,dropping,exposures:xs.length,span_days:span}}
const liftStatus=(tr,st)=>st.dropping?'dropping':st.stalled?'stalled':tr.status;
function tmin(dt,m,level){const T=dt.targets.targets[m];if(!T)return [null,null];return [fl(T.min*dt.targets.levelMinFactor[level]*2+0.5)/2,T.max]}
function creditedWeeks(dt,h,flat,asOf,n){const cur=wk(asOf),out=[];for(let k=1;k<=n;k++){const w=isoAdd(cur,-7*k);out.push([w,completedAnalytics(dt,h,w,flat).hard_sets.per_muscle])}return out}
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
function deloadRule(dt,K,h,asOf,lifts){const D=K.R2.deload,base=deloadCheck(dt,h,asOf),st={};for(const [i,L] of Object.entries(lifts))if(L.status!=='insufficient')st[i]=L.status;
  const recent=isoAdd(asOf,-D.several_lifts_dropping.within_days),drop=Object.keys(lifts).filter(i=>lifts[i].status==='dropping'&&lifts[i].last_date>recent).sort();
  const sev=drop.length>=D.several_lifts_dropping.min_lifts,n=Object.keys(st).length,sd=Object.values(st).filter(s=>s==='stalled'||s==='dropping').length;
  const pts=sev?D.several_lifts_dropping.points:(n>=D.mostly_stalled.min_lifts&&sd/n>=D.mostly_stalled.share-1e-9?D.mostly_stalled.points:0);
  const sig=Object.assign({},base.signals);sig.performance={source:'progress2',lifts:n,dropping:Object.keys(st).filter(i=>st[i]==='dropping').sort(),dropping_recent:drop,stalled:Object.keys(st).filter(i=>st[i]==='stalled').sort(),points:pts};
  const score=base.eligible?Object.values(sig).reduce((a,s)=>a+s.points,0):0,sug=!!(base.eligible&&score>=base.suggest_score&&base.snoozed_until===null);
  return {eligible:base.eligible,reason:base.reason,several_lifts_dropping:sev,score,suggest_score:base.suggest_score,suggest:sug,snoozed_until:base.snoozed_until,signals:sig,apply_edits_board:D.apply_edits_board}}
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
        here.push({kind:'e1rm_pr',value:r_(e.e1rm_kg),text:`${nm}: e1RM PR, about ${fmt1(K.toU(e.e1rm_kg,u),u)} ${u}`,gain_pct:r_((e.e1rm_kg/bestE1-1)*100,2)});
      if(e.top_kg>EPS&&e.top_kg>bestTop+e.half_kg+EPS)here.push({kind:'load_pr',value:r_(e.top_kg),text:`${nm}: heaviest yet, ${K.topTxt(e,u)}`,gain_pct:bestTop>EPS?r_((e.top_kg/bestTop-1)*100,2):null});
      let rp=null;for(const x of e.sets){const pr=prior.filter(y=>y.added_kg>=x.added_kg-e.half_kg-EPS).map(y=>y.reps);
        if(pr.length&&x.reps>Math.max(...pr)&&(rp===null||cmpT([x.added_kg,x.reps],[rp[0].added_kg,rp[0].reps])>0))rp=[x,Math.max(...pr)]}
      if(rp){const [x,b]=rp,at=x.added_kg>EPS?` at ${fmt(K.toU(x.added_kg,e.unit))} ${e.unit}`:'';here.push({kind:'rep_pr',value:x.reps,text:`${nm}: rep PR, ${x.reps} reps${at}`,gain_pct:r_((x.reps/b-1)*100,2)})}}
    for(const w of here)Object.assign(w,{exercise:i,date:d,session_id:e.sid});if(here.length)ev.push(pyMin(here,w=>[W.kinds[w.kind]]));
    if(e.e1rm_kg!=null)bestE1=bestE1==null?e.e1rm_kg:Math.max(bestE1,e.e1rm_kg);bestTop=Math.max(bestTop,e.top_kg);if(e.hold_s!=null)bestHold=Math.max(bestHold||0,e.hold_s);prior.push(...e.sets)}
  const e1=ev.filter(w=>w.kind==='e1rm_pr');if(e1.length){const w=e1[e1.length-1],allb=Math.max(...xs.map(e=>e.e1rm_kg||0));
    if(Math.abs(allb-w.value)<1e-3&&days(w.date,xs[0].date)>=28){w.kind='strongest_ever';w.text=`${nm}: strongest ever, estimated 1RM about ${fmt1(K.toU(w.value,u),u)} ${u}`}}
  return ev}
function wins(K,xsall,asOf,u,EX,mains){const W=K.R2.wins,V=W.vs_3_months,ids=Object.keys(xsall).sort();let allev=[];const v3={};
  for(const i of ids)allev=allev.concat(prEvents(K,xsall[i],u,asOf,EX,i));
  for(const i of ids){const nd=xsall[i].filter(e=>!e.deload&&e.value!=null),now=nd.filter(e=>{const d=days(asOf,e.date);return 0<=d&&d<V.now_days}).map(e=>e.value),
      then=nd.filter(e=>{const d=days(asOf,e.date);return V.then_to_days<=d&&d<=V.then_from_days}).map(e=>e.value);
    if(now.length&&then.length&&Math.max(...then)>0){const mn=Math.max(...now),mt=Math.max(...then),p=(mn/mt-1)*100,m=nd[0].metric;
      v3[i]={metric:m,now:r_(mn),then:r_(mt),pct:r_(p,2),now_display:K.vdisp(mn,m,u),then_display:K.vdisp(mt,m,u),
        text:`${EX[i].name}: ${p>=0?'+':'\u2212'}${fmt(Math.abs(p))}% vs 3 months ago (${K.vdisp(mt,m,u)} \u2192 ${K.vdisp(mn,m,u)})`}}}
  const recent=allev.filter(w=>{const d=days(asOf,w.date);return 0<=d&&d<W.window_days});
  const key=w=>[W.kinds[w.kind],mains.has(w.exercise)?0:1,TYPE_RANK[(EX[w.exercise]||{}).type]??3,-dn(w.date),-(w.gain_pct||0),w.exercise],best={};
  for(const w of sortBy(recent,key))if(!(w.exercise in best))best[w.exercise]=w;
  const extra=sortBy(Object.keys(v3).filter(i=>v3[i].pct>=V.min_gain_pct&&!(i in best)).map(i=>({kind:'vs_3_months',exercise:i,date:asOf,session_id:null,value:v3[i].pct,gain_pct:v3[i].pct,text:v3[i].text})),w=>[-w.gain_pct,w.exercise]).slice(0,2);
  const lst=sortBy(sortBy(Object.values(best),key).concat(extra),key);
  const res={shown:lst.slice(0,W.max_shown),more:Math.max(0,lst.length-W.max_shown),all_events:allev,vs_3_months:v3};
  Object.defineProperty(res,'list',{value:lst,enumerable:false});return res} // list: every win in order (the "+N more" view); not part of the parity payload
const effortDisplay=(avg,mode)=>avg==null?'Not enough RIR logged':mode==='rpe'?`Average RPE about ${fmt(10-avg)}`:`Average RIR about ${fmt(avg)}`;
function muscles2(dt,K,xsall,lifts,h,asOf,EX,cx){const M=K.R2.muscle,T=K.R2.trend,start=isoAdd(asOf,-T.window_days),pins=((h.settings||{}).mainLiftPins)||{},E=K.R2.effort,est=isoAdd(asOf,-E.summary_window_days),out={},L=K.L,hard=x=>x.rir===null||x.rir<=L.hardRIR;
  for(const m of L.muscles){const wts={},weeks=new Set(),sess={};let rs=0,rw=0,rn=0;
    for(const [i,xs] of Object.entries(xsall)){const r=((EX[i]||{}).muscles||{})[m]||0;if(r<L.min_rating)continue;
      for(const e of xs){if(e.deload)continue;if(start<e.date&&e.date<=asOf){const hs=e.sets.filter(hard).length;if(hs){wts[i]=(wts[i]||0)+r*hs;weeks.add(wk(e.date))}sess[i]=(sess[i]||0)+1}
        if(est<e.date&&e.date<=asOf)for(const x of e.sets)if(x.rir!=null){rs+=r*x.rir;rw+=r;rn++}}}
    if(!Object.keys(wts).length&&!Object.keys(sess).length&&!(m in pins))continue;
    const tl={};for(const i of Object.keys(wts))if(lifts[i].trend.pct_per_week!=null)tl[i]=lifts[i].trend.pct_per_week;
    const den=Object.keys(tl).reduce((a,i)=>a+wts[i],0),ok=Object.keys(tl).length>0&&weeks.size>=T.min_weeks,p=ok&&den?Object.keys(tl).reduce((a,i)=>a+wts[i]*tl[i],0)/den:null;
    const tst=p===null?'insufficient':p>T.up_pct_per_week?'up':p<T.down_pct_per_week?'down':'flat',pin=pins[m],pinned=!!(pin&&(((EX[pin]||{}).muscles||{})[m]||0)>=L.min_rating);let main;
    if(pinned)main=pin;else{let cand=Object.keys(sess).filter(i=>EX[i].muscles[m]>=M.main_lift_min_rating);if(!cand.length)cand=Object.keys(sess);
      cand=sortBy(cand,i=>[-sess[i],-EX[i].muscles[m],-(wts[i]||0),TYPE_RANK[EX[i].type]??3,i]);main=cand.length?cand[0]:null}
    const Lm=main?lifts[main]:null,tw=Object.values(wts).reduce((a,b)=>a+b,0),sw=Object.keys(wts).filter(i=>['stalled','dropping'].includes(lifts[i].status)).reduce((a,i)=>a+wts[i],0),share=tw?sw/tw:0;
    const stuck=!!((tst==='flat'||tst==='down')&&Lm&&['stalled','dropping'].includes(Lm.status)&&share>=M.stuck_share-1e-9),avg=rw?rs/rw:null,effOk=rn>=E.summary_min_sets;
    const wbl={};for(const i of Object.keys(wts).sort())wbl[i]=r_(wts[i]);
    out[m]={trend:{status:tst,pct_per_week:r_(p),words:fmtS(T.words[tst],{p:p!==null?pct(p):'',abs:''}),weeks_with_sets:weeks.size,lifts:Object.keys(tl).sort()},
      main_lift:{id:main,name:main?EX[main].name:null,pinned,sessions_in_window:main?(sess[main]||0):0,status:Lm?Lm.status:null},
      latest_gain:Lm?Lm.gain_vs_last:null,weight_by_lift:wbl,stalled_or_dropping_share:r_(share),stuck,
      effort:{avg_rir:effOk?r_(avg,2):null,sets_with_rir:rn,display:effortDisplay(effOk?avg:null,cx.mode),far_from_failure:!!(effOk&&avg>=E.far_from_failure_avg_rir-1e-9)}}}
  return out}
function footnote(dt,K,h,asOf){const F=K.R2.footnote,st=isoAdd(asOf,-F.days),al=K.L.aliases,ent=h.entries||[],sets=h.sets||[];let pl=0,dd=0;
  for(const s of h.sessions||[]){const d=sday(s);if(!(st<d&&d<=asOf)||!['completed','skipped'].includes(s.status))continue;
    for(const p of (s.snapshot||{}).exercises||[]){pl+=p.sets;if(s.status!=='completed')continue;
      const ids=new Set(ent.filter(e=>e.sessionId===s.id&&!e.added&&!e.skipped&&resolve(e.swappedFrom||e.exerciseId,al)===resolve(p.exerciseId,al)).map(e=>e.id));
      dd+=Math.min(p.sets,sets.filter(x=>ids.has(x.entryId)&&(x.kind||'working')==='working'&&x.done).length)}}
  return {planned_sets:pl,done_sets:dd,days:F.days,text:pl?fmtS(F.text,{done:dd,planned:pl}):null}}
// report(dt, history, asOf 'YYYY-MM-DD', routine (days[] or null -> history.routine.days), level, goal)
function report(dt,history,asOf,routine=null,level='intermediate',goal=null){asOf=String(asOf).slice(0,10);const h=normalize(history),K=mk(dt,h),u=((h.settings||{}).unit)||'lb',EX=exTable(dt,h);
  if(routine==null)routine=(h.routine||{}).days||null;const mode=((h.settings||{}).effort)||'rir',flat=flatten(dt,h),xsall=exposures2(dt,h,asOf,flat);
  const comp=(h.sessions||[]).filter(s=>s.status==='completed'&&sday(s)<=asOf).map(sday).sort(),lifts={},need=K.R2.trend.min_exposures;
  for(const i of Object.keys(xsall).sort()){const xs=xsall[i],tr=liftTrend(K,xs,asOf,u),st=stallState(K,xs),nd=xs.filter(e=>!e.deload);
    lifts[i]={name:EX[i].name,kind:xs[0].kind,metric:xs[0].metric,exposures:nd.length,last_date:(nd.length?nd:xs)[(nd.length?nd:xs).length-1].date,
      gain_vs_last:gainVsLast(K,xs,u),trend:tr,stall:st,status:liftStatus(tr,st),insufficient_label:tr.status==='insufficient'?fmtS(K.R2.min_data.labels.insufficient_lift,{have:tr.exposures,need}):null,
      weekly_best:weeklyBest(K,xs,u)}}
  const dl=deloadRule(dt,K,h,asOf,lifts),cx={EX,routine:routine||[],level,goal,unit:u,deload:dl,credited:creditedWeeks(dt,h,flat,asOf,K.R2.fix.weeks_for_sets),xs:xsall,mode};
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
      na.push({kind:'lift_dropping',muscle:m,muscles:[m],lift:i,lifts:[i],text:`${L.name} is dropping: down 2 sessions in a row (${L.gain_vs_last.text} last time)`,fix:chooseFix(dt,K,m,i,'dropping',L.stall,cx),notes:[]})}}
  const W=wins(K,xsall,asOf,u,EX,new Set(Object.values(mus).map(v=>v.main_lift.id).filter(Boolean))),eff={};for(const [m,v] of Object.entries(mus))eff[m]=v.effort;
  return {as_of:asOf,label:K.R2.label,model_note:K.R2.model_note,unit:u,effort_mode:mode,data:{completed_sessions:comp.length,logged_weeks:new Set(comp.map(wk)).size,first_date:comp.length?comp[0]:null},
    lifts,muscles:mus,stall_flags:{muscles:stuck,lifts_stalled:Object.keys(lifts).filter(i=>lifts[i].status==='stalled').sort(),lifts_dropping:Object.keys(lifts).filter(i=>lifts[i].status==='dropping').sort()},
    needs_attention:na,deload:dl,wins:W,effort:eff,footnote:{planned_vs_done:footnote(dt,K,h,asOf)}}}
const API={report,deloadCheck,clampRir,normalize,flatten,completedAnalytics,exerciseTrends,localDate,weekStart:wk};
if(isNode)module.exports=API;else root.PROGRESS=API;
})(typeof window!=='undefined'?window:this);
