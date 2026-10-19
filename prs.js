// v28: PR detection + completed-workout analytics. Exact port of tools/prs.py (rules.json v8 logger.prs / logger.completed_analytics).
// Pure functions of the logged history (L): PRs and analytics are always recomputed, never stored (recompute_on_edit).
const PRS_EPS=1e-6,PR_TYPES=['weight','set_volume','e1rm','reps_at_load'];
const prRules=()=>{const lg=(typeof RU!='undefined'&&RU&&RU.logger)||{};return{lg,hardRIR:lg.hardRIR,f:lg.e1rm_formula||'epley',mx:lg.e1rm_max_reps,lbPerKg:lg.lbPerKg??2.20462,
  mr:(typeof RULE!='undefined'?RULE.min_rating_to_count:.25),rt:(typeof RULE!='undefined'?RULE.round_to:.5)}};
const PRE1={epley:(w,r)=>w*(1+r/30),brzycki:(w,r)=>w*36/(37-r)};
const prE1=(w,r,R)=>(PRE1[R.f]||PRE1.epley)(w,r);
const prResolve=(i,al)=>{let n=0;while(al&&Object.prototype.hasOwnProperty.call(al,i)&&n<50){i=al[i];n++}return i};
const prKg=(v,u,R)=>v==null||v===''?0:u=='lb'?Number(v)/R.lbPerKg:Number(v);
const prT=s=>s.endedAt||s.date;
const prCmp=(a,b)=>a<b?-1:a>b?1:0;
const prNsum=a=>{let f=0,c=0;for(const x of a){const s=f+x;c+=Math.abs(f)>=Math.abs(x)?(f-s)+x:(x-s)+f;f=s}return c&&isFinite(c)?f+c:f};
const pyRound=(x,nd)=>typeof pyR=='function'?pyR(x,nd):+x.toFixed(nd);
// local calendar date (device timezone) as YYYY-MM-DD
const prLocalDate=iso=>{const d=new Date(iso);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const prAddDays=(ymd,n)=>{const [y,m,d]=ymd.split('-').map(Number),t=new Date(Date.UTC(y,m-1,d+n));return t.toISOString().slice(0,10)};
const prWeekStart=ymd=>{const [y,m,d]=ymd.slice(0,10).split('-').map(Number),wd=(new Date(Date.UTC(y,m-1,d)).getUTCDay()+6)%7;return prAddDays(ymd.slice(0,10),-wd)};
function prFlatten(h,al,R){const ent={};(h.entries||[]).forEach(e=>ent[e.id]=e);const byS={};
  (h.sets||[]).forEach(x=>{const e=ent[x.entryId];if(!e)return;const sid=x.sessionId||e.sessionId;(byS[sid]=byS[sid]||[]).push([e,x])});
  const ss=(h.sessions||[]).filter(s=>s.status=='completed').map((s,i)=>[s,i]).sort((a,b)=>prCmp(prT(a[0]),prT(b[0]))||prCmp(a[0].id,b[0].id)||a[1]-b[1]).map(z=>z[0]);
  return ss.map(s=>{const rows=(byS[s.id]||[]).map((p,i)=>[p,i]).sort((a,b)=>((a[0][0].order||0)-(b[0][0].order||0))||((a[0][1].idx||0)-(b[0][1].idx||0))||a[1]-b[1]).map(z=>z[0])
    .filter(([,x])=>x.done).map(([e,x])=>({id:x.id,entry:e,ex:prResolve(e.exerciseId,al),kind:x.kind||'working',load_kg:prKg(x.load,s.unit||'lb',R),reps:Math.trunc(Number(x.reps||0)),rir:x.rir==null?null:x.rir,idx:x.idx||0}));
    return{s,sets:rows}})}
const prSet=x=>x.kind=='working'&&x.reps>0;
function detectPrs(h,al){const R=prRules(),mx=R.mx,prior={},out={};
  for(const q of prFlatten(h,al,R)){const sid=q.s.id,cur={},order=[];q.sets.forEach(x=>{if(prSet(x)){if(!cur[x.ex]){cur[x.ex]=[];order.push(x.ex)}cur[x.ex].push(x)}});
    for(const ex of order){const xs=cur[ex],P=prior[ex];
      if(P&&P.length){const lp=P.filter(p=>p.load_kg>PRS_EPS);const mxOf=a=>a.length?Math.max(...a):0;
        const bw=mxOf(lp.map(p=>p.load_kg)),bv=mxOf(lp.map(p=>p.load_kg*p.reps)),be=mxOf(lp.filter(p=>p.reps<=mx).map(p=>prE1(p.load_kg,p.reps,R)));const hit={};
        xs.forEach(x=>{const L=x.load_kg,r=x.reps,c=[];if(L>PRS_EPS){if(L>bw+PRS_EPS)c.push(['weight',L]);if(L*r>bv+PRS_EPS)c.push(['set_volume',L*r]);if(r<=mx&&prE1(L,r,R)>be+PRS_EPS)c.push(['e1rm',prE1(L,r,R)])}
          const hv=P.filter(p=>p.load_kg>=L-PRS_EPS).map(p=>p.reps);if(hv.length&&r>Math.max(...hv))c.push(['reps_at_load',r]);c.forEach(([k,v])=>(hit[k]=hit[k]||[]).push([v,x]))});
        if(Object.keys(hit).length){const rec={};PR_TYPES.forEach(k=>{if(!hit[k])return;const[v,x]=hit[k].map((z,i)=>[z,i]).sort((a,b)=>(b[0][0]-a[0][0])||(b[0][1].load_kg-a[0][1].load_kg)||(a[0][1].idx-b[0][1].idx)||a[1]-b[1])[0][0];
          rec[k]={value:pyRound(v,6),set_id:x.id,load_kg:pyRound(x.load_kg,6),reps:x.reps,set_ids:hit[k].map(z=>z[1].id)}});(out[sid]=out[sid]||{})[ex]=rec}}
      (prior[ex]=prior[ex]||[]).push(...xs)}}
  return out}
function completedAnalytics(h,week,o={}){const R=prRules(),al=o.aliases,hr=o.hardRIR??R.hardRIR,mx=R.mx,ws=prWeekStart(String(week)),we=prAddDays(ws,7);
  const LIBX={...(o.exercises||EX)};(h.customExercises||[]).forEach(c=>{if(c&&c.id&&c.muscles)LIBX[c.id]=c});/* prs.py: customs count toward their muscles; only ids unknown after aliasing are archived */const mus=o.muscles||MUS,ld=s=>prLocalDate(s.startedAt||s.date),inwk=s=>{const d=ld(s);return ws<=d&&d<we};
  const flat=prFlatten(h,al,R),hard={},volM={},volS={};mus.forEach(m=>{hard[m]=0;volM[m]=0});let nHard=0,nNoeff=0,arch=0;
  flat.forEach(q=>{if(!inwk(q.s))return;const sid=q.s.id;volS[sid]=0;q.sets.forEach(x=>{if(x.kind!='working')return;const v=x.load_kg*x.reps;volS[sid]+=v;
    const isH=x.reps>0&&(x.rir==null||x.rir<=hr),e=LIBX[x.ex];if(!e){arch+=isH?1:0;return}if(isH){nHard++;nNoeff+=x.rir==null?1:0}
    for(const m in e.muscles){const r=e.muscles[m];if(r>=R.mr){if(isH)hard[m]=(hard[m]||0)+r;volM[m]=(volM[m]||0)+r*v}}})});
  const trend={};flat.forEach(q=>{if(ld(q.s)>=we)return;const best={},ord=[];q.sets.forEach(x=>{if(prSet(x)&&x.load_kg>PRS_EPS&&x.reps<=mx){const v=prE1(x.load_kg,x.reps,R);if(!(x.ex in best)){best[x.ex]=[v,x];ord.push(x.ex)}else if(v>best[x.ex][0]+PRS_EPS)best[x.ex]=[v,x]}});
    ord.forEach(ex=>{const[v,x]=best[ex];(trend[ex]=trend[ex]||[]).push({session_id:q.s.id,date:ld(q.s),e1rm_kg:pyRound(v,4),set_id:x.id})})});
  const ent=h.entries||[],sets=h.sets||[];let comp=0,skip=0,planned=0,donePl=0,skSets=0;
  (h.sessions||[]).forEach(s=>{if(!['completed','skipped'].includes(s.status)||!inwk(s))return;const plan=((s.snapshot||{}).exercises)||[];
    if(s.status=='skipped'){skip++;const n=plan.reduce((a,p)=>a+p.sets,0);planned+=n;skSets+=n;return}comp++;const es=ent.filter(e=>e.sessionId==s.id);
    plan.forEach(p=>{planned+=p.sets;const pid=prResolve(p.exerciseId,al);const g=es.filter(e=>!e.added&&prResolve(e.swappedFrom||e.exerciseId,al)==pid),live=g.filter(e=>!e.skipped);
      if(!live.length){skSets+=p.sets;return}const ids=new Set(live.map(e=>e.id));const n=sets.filter(x=>ids.has(x.entryId)&&(x.kind||'working')=='working'&&x.done).length;donePl+=Math.min(n,p.sets)})});
  const ps=o.plannedSessions??h.plannedSessionsPerWeek??(comp+skip),r4=v=>pyRound(v,4),rb=v=>Math.floor(v/R.rt+.5)*R.rt,map=(ob,f)=>Object.fromEntries(Object.entries(ob).map(([k,v])=>[k,f(v)]));
  return{week_start:ws,week_end_exclusive:we,unit:'kg',hardRIR:hr,label:'Logged totals, not estimates of muscle growth.',
    hard_sets:{per_muscle:map(hard,r4),per_muscle_board_rounded:map(hard,rb),set_count:nHard,effort_not_logged:nNoeff,archived_sets_not_counted:arch},
    volume:{per_session_kg:map(volS,r4),week_kg:r4(prNsum(Object.values(volS))),per_muscle_kg:map(volM,r4)},load_trend:trend,
    adherence:{planned_sets:planned,completed_planned_sets:donePl,skipped_sets:skSets,sets_ratio:planned?r4(donePl/planned):null,sessions_completed:comp,sessions_skipped:skip,
      sessions_planned:ps,sessions_not_started:Math.max(0,ps-comp-skip),sessions_ratio:ps?r4(comp/ps):null}}}
// v28.1: exact port of tools/prs.py suspect_decimal_sets(history, cutoff, aliases, rules, ignore_ids) — the v24..v28B keypad decimal bug
// (a typed "." was dropped, so 101.5 was saved as 1015). Thresholds come from rules.json logger.suspect_decimal (same values prs.py uses).
// Working, done, loaded sets in completed sessions; "pre" = session startedAt (else date, read as -07:00) before saved_before.
// Median of the OTHER loaded working sets on that alias-resolved exercise (kg); fewer than min_others others -> unjudged (manual check).
const prMedian=a=>{const v=a.slice().sort((x,y)=>x-y),n=v.length;return n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2};
function suspectDecimalSets(h,o={}){const R=prRules(),sd=o.rules||R.lg.suspect_decimal,co=Date.parse(o.cutoff||sd.saved_before),ign=new Set(o.ignore||[]);
  const rows=[];prFlatten(h,o.aliases,R).forEach(q=>{const st=q.s.startedAt||q.s.date,ts=Date.parse(String(st).includes('T')?st:st+'T00:00:00-07:00');
    q.sets.forEach(x=>{if(x.kind=='working'&&x.load_kg>PRS_EPS)rows.push([x,q.s,ts<co])})});
  const by={};rows.forEach(r=>(by[r[0].ex]=by[r[0].ex]||[]).push(r));const flagged=[],unjudged=[],r4=v=>pyRound(v,4);
  for(const ex in by){const rs=by[ex];for(const[x,s,pre]of rs){if(!pre||ign.has(x.id))continue;const others=rs.filter(y=>y[0].id!=x.id).map(y=>y[0].load_kg);
    if(others.length<sd.min_others){unjudged.push({set_id:x.id,session_id:s.id,exercise_id:ex,load_kg:r4(x.load_kg)});continue}const med=prMedian(others);
    if(x.load_kg>=sd.min_ratio*med&&Math.abs(x.load_kg/sd.divisor-med)<=sd.window*med)flagged.push({set_id:x.id,session_id:s.id,exercise_id:ex,load_kg:r4(x.load_kg),median_kg:r4(med),suggested_kg:r4(x.load_kg/sd.divisor)})}}
  const k=(a,b)=>prCmp(a.session_id,b.session_id)||prCmp(a.set_id,b.set_id);return{flagged:flagged.sort(k),unjudged:unjudged.sort(k)}}
