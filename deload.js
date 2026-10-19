// v29 E: progress signals + suggested deload (#12). Exact port of Coach tools/deload.py (rules.json logger.progress_signals / logger.deload_signals).
// exerciseTrends(h,now) / muscleProgress(h,now) / deloadCheck(h,now) / deloadVersion(days) / deloadLoad(last,profile,eq,unit,id) / applyChoice(h,choice,now)
// h = log history {sessions, entries, sets, bodyweights, customExercises?, deloads?, deloadPrompt?, readiness?}; now = 'YYYY-MM-DD' (local day).
// A model, not a measurement: the prompt carries rules.json deload_signals.evidence_note.
// Builder fallback (flagged to Coach): deload.py hardcodes the muscle rating cut 0.5; rules.json has no key yet -> progress_signals.muscle_min_rating
const DL_MUSCLE_RATING_FALLBACK=0.5;
const dlPS=()=>((RU&&RU.logger)||{}).progress_signals||{},dlDS=()=>((RU&&RU.logger)||{}).deload_signals||{};
const dlD=v=>String(v).slice(0,10);/* date.fromisoformat(str(v)[:10]) */
const dlDays=(a,b)=>Math.round((Date.parse(dlD(a)+'T00:00:00Z')-Date.parse(dlD(b)+'T00:00:00Z'))/864e5);/* (a - b).days */
const dlSday=s=>prDay(s.startedAt||s.date);
const dlOpt=o=>({aliases:o&&o.aliases,exercises:o&&o.exercises});
// [(day, ex, e1rm_kg)] best e1RM per exercise per completed non-deload session
function dlSessionBests(h,o){const R=prRules(),out=[];
  for(const q of prFlatten(h,o&&o.aliases,R,dlOpt(o))){if(q.s.deload)continue;const best={},ord=[];
    for(const x of q.sets)if(prOk(x,'e1rm',R)&&x.load_kg>PRS_EPS&&x.reps<=R.mx){const v=prE1(x.load_kg,x.reps,R);if(!(x.ex in best)){best[x.ex]=0;ord.push(x.ex)}best[x.ex]=Math.max(best[x.ex],v)}
    const day=dlSday(q.s);ord.forEach(ex=>out.push([day,ex,best[ex]]))}
  return out}
function dlSlopePct(pts){const n=pts.length,t0=pts[0][0],xs=pts.map(p=>dlDays(p[0],t0)),ys=pts.map(p=>p[1]);const mx=prNsum(xs)/n,my=prNsum(ys)/n;
  const den=prNsum(xs.map(x=>(x-mx)**2));if(den==0||my<=0)return 0;return prNsum(xs.map((x,i)=>(x-mx)*(ys[i]-my)))/den*7/my*100}
const dlStatus=p=>{const P=dlPS();return p==null?'insufficient':p>P.up_pct_per_week?'up':p<P.drop_pct_per_week?'dropping':'stalled'};
function exerciseTrends(h,now,o={}){const P=dlPS(),start=prAddDays(dlD(now),-7*(o.weeks||P.window_weeks)),by={},ord=[];now=dlD(now);
  for(const[day,ex,v]of dlSessionBests(h,o))if(start<day&&day<=now){if(!by[ex]){by[ex]=[];ord.push(ex)}by[ex].push([day,v])}
  const out={};for(const ex of ord){const pts=by[ex].map((p,i)=>[p,i]).sort((a,b)=>prCmp(a[0][0],b[0][0])||(a[0][1]-b[0][1])||a[1]-b[1]).map(z=>z[0]);
    const okd=pts.length>=P.min_sessions&&dlDays(pts[pts.length-1][0],pts[0][0])>=P.min_span_days,p=okd?dlSlopePct(pts):null;
    out[ex]={status:dlStatus(p),pct_per_week:p==null?null:pyRound(p,4),sessions:pts.length,points:pts.map(([d,v])=>[d,pyRound(v,4)])}}
  return out}
function muscleProgress(h,now,o={}){const tr=exerciseTrends(h,now,o),T=prExTable(h,dlOpt(o)),out={};
  for(const m of(o.muscles||MUS)){let num=0,den=0;const used=[];
    for(const ex in tr){const t=tr[ex],r=((T[ex]||{}).muscles||{})[m]||0;if(r>=(dlPS().muscle_min_rating??DL_MUSCLE_RATING_FALLBACK)&&t.pct_per_week!=null){const w=r*t.sessions;num+=w*t.pct_per_week;den+=w;used.push(ex)}}
    const p=den?num/den:null;out[m]={status:dlStatus(p),pct_per_week:p==null?null:pyRound(p,4),exercises:used.sort(prCmp)}}
  return out}
function dlRirDrift(h,now,o){const D=dlDS().rir_drift,R=prRules();now=dlD(now);const cut=prAddDays(now,-D.lookback_days),rows=[];
  for(const q of prFlatten(h,o&&o.aliases,R,dlOpt(o))){if(q.s.deload)continue;const day=dlSday(q.s);if(day>now)continue;
    for(const x of q.sets)if(x.kind=='working'&&x.reps>0&&x.load_kg>PRS_EPS&&!x.tag)rows.push([day,x])}
  const ev={},ord=[];rows.forEach(([day,x],i)=>{if(day<=cut||x.rir==null)return;
    const prev=rows.slice(0,i).filter(([d,y])=>d<day&&y.ex==x.ex&&y.rir!=null&&Math.abs(y.load_kg-x.load_kg)<=D.load_tolerance_pct/100*x.load_kg);if(!prev.length)return;
    const y=prev[prev.length-1][1];if(x.reps<=y.reps&&x.rir<y.rir){if(!ev[x.ex]){ev[x.ex]=[];ord.push(x.ex)}ev[x.ex].push(x.id)}});
  return ev}
function dlWeeksOver(h,now,o){const H=dlDS().hard_sets_over_target;now=dlD(now);const ws=prWeekStart(now),TGT=o&&o.targets||(typeof TG!='undefined'?TG:{}),res=[];
  for(let k=1;k<=H.weeks;k++){const w=prAddDays(ws,-7*k),hs=completedAnalytics(h,w,{aliases:o&&o.aliases,exercises:o&&o.exercises}).hard_sets.per_muscle;
    res.push({week_start:w,over:Object.keys(hs).filter(m=>m in TGT&&hs[m]>TGT[m].max+1e-9).sort(prCmp)})}
  return res}
function deloadCheck(h,now,o={}){now=dlD(now);const DS=dlDS(),E=DS.eligible;
  const comp=(h.sessions||[]).filter(s=>s.status=='completed').map(dlSday).sort(prCmp);
  const dl=(h.deloads||[]).map((x,i)=>[dlD(x.start),dlD(x.end),i]).sort((a,b)=>prCmp(a[1],b[1])||a[2]-b[2]);
  const res={eligible:false,reason:null,score:0,suggest_score:DS.suggest_score,suggest:false,snoozed_until:null,signals:{}};
  if(!comp.length||dlDays(now,comp[0])<7*E.min_logged_weeks||comp.length<E.min_sessions){res.reason='not enough logs yet (about 4 weeks and 8 sessions needed)';return res}
  const last=dl[dl.length-1];if(last&&last[0]<=now&&now<=last[1]){res.reason='deload in progress';return res}
  if(last&&dlDays(now,last[1])<7*E.min_weeks_between_deloads){res.reason='last deload ended less than 4 weeks ago';return res}
  res.eligible=true;const sig=res.signals,since=last?last[1]:comp[0],wk=dlDays(now,since)/7;
  const pts=Math.max(0,...DS.weeks_since_deload.points.filter(([w])=>wk>=w).map(([,p])=>p));sig.weeks_since_deload={weeks:pyRound(wk,2),points:pts};
  const all=exerciseTrends(h,now,o),tr={};Object.keys(all).forEach(ex=>{if(all[ex].status!='insufficient')tr[ex]=all[ex]});
  const Pf=DS.performance,ks=Object.keys(tr),n=ks.length,drop=ks.filter(k=>tr[k].status=='dropping').length,stall=ks.filter(k=>tr[k].status=='stalled').length;let pp=0;
  if(n>=Pf.min_lifts){if(drop/n>=Pf.dropping_share-1e-9)pp=Pf.points_dropping;else if((drop+stall)/n>=Pf.stalled_or_dropping_share-1e-9)pp=Pf.points_stalled}
  const be={};ks.slice().sort(prCmp).forEach(k=>be[k]=tr[k].status);sig.performance={lifts:n,dropping:drop,stalled:stall,up:n-drop-stall,points:pp,by_exercise:be};
  const ev=dlRirDrift(h,now,o);sig.rir_drift={exercises:Object.keys(ev).sort(prCmp),points:Object.keys(ev).length>=DS.rir_drift.min_exercises?DS.rir_drift.points:0};
  const wo=dlWeeksOver(h,now,o),Hh=DS.hard_sets_over_target;sig.hard_sets_over_target={weeks:wo,points:wo.every(w=>w.over.length>=Hh.min_muscles)?Hh.points:0};
  const Rd=DS.readiness,rd=(h.readiness||[]).filter(r=>{const d=dlDays(now,r.date);return 0<=d&&d<Rd.days}).map(r=>r.score),mean=rd.length?prNsum(rd)/rd.length:null;
  sig.readiness={entries:rd.length,mean:mean==null?null:pyRound(mean,4),points:rd.length>=Rd.min_entries&&mean<=Rd.max_mean+1e-9?Rd.points:0};
  res.score=Object.values(sig).reduce((a,s)=>a+s.points,0);
  const snz=(h.deloadPrompt||{}).snoozedUntil;if(snz&&dlD(snz)>now)res.snoozed_until=dlD(snz);
  res.suggest=res.score>=DS.suggest_score&&res.snoozed_until==null;return res}
// routine days [[{id, sets, ...tile}]] -> same shape with deload sets / RIR target
function deloadVersion(days){const V=dlDS().deload_version;return days.map(d=>d.map(t=>({...t,sets:Math.max(1,Math.ceil((t.sets??1)*V.sets_factor-1e-9)),rir_target:[...V.rir_target],deload:true})))}
// last working (added) load x load_factor, rounded DOWN to a real load; result in profile unit
function deloadLoad(last,profile,eq,unit,id){const pu=(profile||{}).unit||unit;if(!last)return 0;
  return nearestRealLoad(dlDS().deload_version.load_factor*ldConv(last,unit,pu),profile||{unit:pu},eq,pu,id,'down')}
function applyChoice(h,choice,now){now=dlD(now);const g=JSON.parse(JSON.stringify(h)),DS=dlDS(),C=DS.prompt;
  if(choice=='use'){(g.deloads=g.deloads||[]).push({start:now,end:prAddDays(now,DS.deload_version.days_length-1),source:'suggested'});g.deloadPrompt={snoozedUntil:null}}
  else if(choice=='delay')g.deloadPrompt={snoozedUntil:prAddDays(now,C.delay_days)};else if(choice=='later')g.deloadPrompt={snoozedUntil:prAddDays(now,C.later_days)};else throw new Error(choice);
  return g}
