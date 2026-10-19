// v29 B (rules.json v9 logger.bodyweight / logger.set_tags, prs.py v29): history.bodyweights -> effective load for exercises with
// exercises.json bodyweight_fraction; set.tag changes hard-set credit and PR eligibility. Without bodyweights and tags every result equals v8.
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
// local date of a session: ISO with a time -> device-local date; date-only -> that date (prs.py _local_date: naive = local)
const prDay=iso=>{const s=String(iso);return/T|\s\d/.test(s)?prLocalDate(s):s.slice(0,10)};
// history.bodyweights -> [[YYYY-MM-DD, kg]] sorted by date (stable); entries without a valid date/value are skipped (prs.py _bw_table)
function prBwTable(h,R){const out=[];(h.bodyweights||[]).forEach(b=>{if(!b||b.date==null||!('value' in b))return;const d=String(b.date).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||isNaN(Date.parse(d+'T00:00:00Z'))||new Date(d+'T00:00:00Z').toISOString().slice(0,10)!=d)return;
  const v=b.value;if(v!=null&&v!==''&&(typeof v=='boolean'||!isFinite(Number(v))))return;out.push([d,prKg(v,b.unit||'lb',R)])});
  return out.map((z,i)=>[z,i]).sort((a,b)=>prCmp(a[0][0],b[0][0])||a[1]-b[1]).map(z=>z[0])}
// most recent entry on/before day; none before -> earliest (backfilled); no entries -> [null,'missing']  (prs.py bodyweight_on)
function prBwOn(tb,day){if(!tb.length)return[null,'missing'];const prev=tb.filter(z=>z[0]<=day);return prev.length?[prev[prev.length-1][1],'logged']:[tb[0][1],'backfilled']}
const prExTable=(h,o)=>{const T={...((o&&o.exercises)||(typeof EX!='undefined'?EX:{}))};(h.customExercises||[]).forEach(c=>{if(c&&c.id&&c.muscles)T[c.id]=c});return T};
function prFlatten(h,al,R,o){const ent={};(h.entries||[]).forEach(e=>ent[e.id]=e);const byS={};const EXT=prExTable(h,o),bwt=prBwTable(h,R),ST=R.lg.set_tags||{};
  (h.sets||[]).forEach(x=>{const e=ent[x.entryId];if(!e)return;const sid=x.sessionId||e.sessionId;(byS[sid]=byS[sid]||[]).push([e,x])});
  const ss=(h.sessions||[]).filter(s=>s.status=='completed').map((s,i)=>[s,i]).sort((a,b)=>prCmp(prT(a[0]),prT(b[0]))||prCmp(a[0].id,b[0].id)||a[1]-b[1]).map(z=>z[0]);
  return ss.map(s=>{let day=null;const rows=(byS[s.id]||[]).map((p,i)=>[p,i]).sort((a,b)=>((a[0][0].order||0)-(b[0][0].order||0))||((a[0][1].idx||0)-(b[0][1].idx||0))||a[1]-b[1]).map(z=>z[0])
    .filter(([,x])=>x.done).map(([e,x])=>{const exid=prResolve(e.exerciseId,al),added=prKg(x.load,s.unit||'lb',R);let load=added,bwk=0,bws=null;
      const meta=EXT[exid]||{},f=meta.bodyweight_fraction||0;
      if(f>0){if(day==null)day=prDay(s.startedAt||s.date);const[bw,st]=prBwOn(bwt,day);bws=st;
        if(bw!=null){bwk=f*bw;load=meta.bodyweight_assisted?Math.max(0,bwk-added):bwk+added}else if(meta.bodyweight_assisted)load=0/* assistance is not load: reps-only */}
      const tag=x.tag||null;let rir=x.rir==null?null:x.rir;if(rir==null&&tag){const d=(ST[tag]||{}).default_rir;rir=d==null?null:d}
      return{id:x.id,entry:e,ex:exid,kind:x.kind||'working',load_kg:load,added_kg:added,bw_kg:bwk,bw:bws,tag,reps:Math.trunc(Number(x.reps||0)),rir,idx:x.idx||0}});
    return{s,sets:rows}})}
const prSet=x=>x.kind=='working'&&x.reps>0;
// PR type k allowed for this set? logger.set_tags[tag].pr_exclude (prs.py _pr_ok)
const prOk=(x,k,R)=>{if(!prSet(x))return false;const t=x.tag;return!(t&&(((R.lg.set_tags||{})[t]||{}).pr_exclude||[]).includes(k))};
function detectPrs(h,al,o){const R=prRules(),mx=R.mx,prior={},out={},ok=(x,k)=>prOk(x,k,R);
  for(const q of prFlatten(h,al,R,o)){const sid=q.s.id,cur={},order=[];q.sets.forEach(x=>{if(PR_TYPES.some(k=>ok(x,k))){if(!cur[x.ex]){cur[x.ex]=[];order.push(x.ex)}cur[x.ex].push(x)}});
    for(const ex of order){const xs=cur[ex],P=prior[ex];
      if(P&&P.length){const lp=k=>P.filter(p=>p.load_kg>PRS_EPS&&ok(p,k));const mxOf=a=>a.length?Math.max(...a):0;
        const bw=mxOf(lp('weight').map(p=>p.load_kg)),bv=mxOf(lp('set_volume').map(p=>p.load_kg*p.reps)),be=mxOf(lp('e1rm').filter(p=>p.reps<=mx).map(p=>prE1(p.load_kg,p.reps,R)));const hit={};
        xs.forEach(x=>{const L=x.load_kg,r=x.reps,c=[];if(L>PRS_EPS){if(ok(x,'weight')&&L>bw+PRS_EPS)c.push(['weight',L]);if(ok(x,'set_volume')&&L*r>bv+PRS_EPS)c.push(['set_volume',L*r]);if(ok(x,'e1rm')&&r<=mx&&prE1(L,r,R)>be+PRS_EPS)c.push(['e1rm',prE1(L,r,R)])}
          if(ok(x,'reps_at_load')){const hv=P.filter(p=>ok(p,'reps_at_load')&&p.load_kg>=L-PRS_EPS).map(p=>p.reps);if(hv.length&&r>Math.max(...hv))c.push(['reps_at_load',r])}c.forEach(([k,v])=>(hit[k]=hit[k]||[]).push([v,x]))});
        if(Object.keys(hit).length){const rec={};PR_TYPES.forEach(k=>{if(!hit[k])return;const[v,x]=hit[k].map((z,i)=>[z,i]).sort((a,b)=>(b[0][0]-a[0][0])||(b[0][1].load_kg-a[0][1].load_kg)||(a[0][1].idx-b[0][1].idx)||a[1]-b[1])[0][0];
          rec[k]={value:pyRound(v,6),set_id:x.id,load_kg:pyRound(x.load_kg,6),reps:x.reps,set_ids:hit[k].map(z=>z[1].id)};
          if(x.bw=='logged'||x.bw=='backfilled')Object.assign(rec[k],{added_kg:pyRound(x.added_kg,6),bodyweight_kg:pyRound(x.bw_kg,6),bodyweight:x.bw})});(out[sid]=out[sid]||{})[ex]=rec}}
      (prior[ex]=prior[ex]||[]).push(...xs)}}
  return out}
// per-set hard-set credit for the working sets of ONE entry, in order (prs.py hard_credit; logger.set_tags.*.hard_credit, drop_set.cap_per_top_set)
function prHardCredit(sets,hr,R){const st=R.lg.set_tags||{},out=[];let run=0;
  for(const x of sets){const isH=x.kind=='working'&&x.reps>0&&(x.rir==null||x.rir<=hr),t=x.tag,cfg=st[t]||{};if(t!='drop_set')run=0;if(!isH){out.push(0);continue}
    let c=Number(cfg.hard_credit??1);if(t=='drop_set'){const cap=Number(cfg.cap_per_top_set??1);c=Math.max(0,Math.min(c,cap-run));run+=c}out.push(c)}
  return out}
function completedAnalytics(h,week,o={}){const R=prRules(),al=o.aliases,hr=o.hardRIR??R.hardRIR,mx=R.mx,ws=prWeekStart(String(week)),we=prAddDays(ws,7);
  const LIBX=prExTable(h,o);/* prs.py: customs count toward their muscles; only ids unknown after aliasing are archived */const mus=o.muscles||MUS,ld=s=>prLocalDate(s.startedAt||s.date),inwk=s=>{const d=ld(s);return ws<=d&&d<we};
  const flat=prFlatten(h,al,R,o),hard={},volM={},volS={};mus.forEach(m=>{hard[m]=0;volM[m]=0});let nHard=0,nNoeff=0,arch=0,credit=0,bwVol=0,bwMiss=0,bwBack=0;const byTag={};
  flat.forEach(q=>{if(!inwk(q.s))return;const sid=q.s.id;volS[sid]=0;const ents=new Map(),cr={};q.sets.forEach(x=>{if(x.kind=='working'){if(!ents.has(x.entry.id))ents.set(x.entry.id,[]);ents.get(x.entry.id).push(x)}});
    ents.forEach(xs=>{const c=prHardCredit(xs,hr,R);xs.forEach((x,i)=>cr[x.id]=c[i])});
    q.sets.forEach(x=>{if(x.kind!='working')return;const v=x.load_kg*x.reps;volS[sid]+=v;bwVol+=x.bw_kg*x.reps;bwMiss+=x.bw=='missing'?1:0;bwBack+=x.bw=='backfilled'?1:0;
    const isH=x.reps>0&&(x.rir==null||x.rir<=hr),c=cr[x.id]??0,e=LIBX[x.ex];if(!e){arch+=isH?1:0;return}if(isH){nHard++;nNoeff+=x.rir==null?1:0;credit+=c;if(x.tag)byTag[x.tag]=(byTag[x.tag]||0)+c}
    for(const m in e.muscles){const r=e.muscles[m];if(r>=R.mr){if(isH)hard[m]=(hard[m]||0)+r*c;volM[m]=(volM[m]||0)+r*v}}})});
  const trend={};flat.forEach(q=>{if(ld(q.s)>=we)return;const best={},ord=[];q.sets.forEach(x=>{if(prOk(x,'e1rm',R)&&x.load_kg>PRS_EPS&&x.reps<=mx){const v=prE1(x.load_kg,x.reps,R);if(!(x.ex in best)){best[x.ex]=[v,x];ord.push(x.ex)}else if(v>best[x.ex][0]+PRS_EPS)best[x.ex]=[v,x]}});
    ord.forEach(ex=>{const[v,x]=best[ex];(trend[ex]=trend[ex]||[]).push({session_id:q.s.id,date:ld(q.s),e1rm_kg:pyRound(v,4),set_id:x.id})})});
  const ent=h.entries||[],sets=h.sets||[];let comp=0,skip=0,planned=0,donePl=0,skSets=0;
  (h.sessions||[]).forEach(s=>{if(!['completed','skipped'].includes(s.status)||!inwk(s))return;const plan=((s.snapshot||{}).exercises)||[];
    if(s.status=='skipped'){skip++;const n=plan.reduce((a,p)=>a+p.sets,0);planned+=n;skSets+=n;return}comp++;const es=ent.filter(e=>e.sessionId==s.id);
    plan.forEach(p=>{planned+=p.sets;const pid=prResolve(p.exerciseId,al);const g=es.filter(e=>!e.added&&prResolve(e.swappedFrom||e.exerciseId,al)==pid),live=g.filter(e=>!e.skipped);
      if(!live.length){skSets+=p.sets;return}const ids=new Set(live.map(e=>e.id));const n=sets.filter(x=>ids.has(x.entryId)&&(x.kind||'working')=='working'&&x.done).length;donePl+=Math.min(n,p.sets)})});
  const ps=o.plannedSessions??h.plannedSessionsPerWeek??(comp+skip),r4=v=>pyRound(v,4),rb=v=>Math.floor(v/R.rt+.5)*R.rt,map=(ob,f)=>Object.fromEntries(Object.entries(ob).map(([k,v])=>[k,f(v)]));
  return{week_start:ws,week_end_exclusive:we,unit:'kg',hardRIR:hr,label:'Logged totals, not estimates of muscle growth.',
    hard_sets:{per_muscle:map(hard,r4),per_muscle_board_rounded:map(hard,rb),set_count:nHard,credited_sets:r4(credit),credit_by_tag:Object.fromEntries(Object.keys(byTag).sort().map(k=>[k,r4(byTag[k])])),effort_not_logged:nNoeff,archived_sets_not_counted:arch},
    volume:{per_session_kg:map(volS,r4),week_kg:r4(prNsum(Object.values(volS))),per_muscle_kg:map(volM,r4),bodyweight_part_kg:r4(bwVol),external_kg:r4(prNsum(Object.values(volS))-bwVol)},
    bodyweight:{sets_without_bodyweight:bwMiss,sets_backfilled:bwBack},load_trend:trend,
    adherence:{planned_sets:planned,completed_planned_sets:donePl,skipped_sets:skSets,sets_ratio:planned?r4(donePl/planned):null,sessions_completed:comp,sessions_skipped:skip,
      sessions_planned:ps,sessions_not_started:Math.max(0,ps-comp-skip),sessions_ratio:ps?r4(comp/ps):null}}}
// v28.1: exact port of tools/prs.py suspect_decimal_sets(history, cutoff, aliases, rules, ignore_ids) — the v24..v28B keypad decimal bug
// (a typed "." was dropped, so 101.5 was saved as 1015). Thresholds come from rules.json logger.suspect_decimal (same values prs.py uses).
// Working, done, loaded sets in completed sessions; "pre" = session startedAt (else date, read as -07:00) before saved_before.
// Median of the OTHER loaded working sets on that alias-resolved exercise (kg); fewer than min_others others -> unjudged (manual check).
const prMedian=a=>{const v=a.slice().sort((x,y)=>x-y),n=v.length;return n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2};
function suspectDecimalSets(h,o={}){const R=prRules(),sd=o.rules||R.lg.suspect_decimal,co=Date.parse(o.cutoff||sd.saved_before),ign=new Set(o.ignore||[]);
  const rows=[];prFlatten(h,o.aliases,R).forEach(q=>{const st=q.s.startedAt||q.s.date,ts=Date.parse(String(st).includes('T')?st:st+'T00:00:00-07:00');
    q.sets.forEach(x=>{if(x.kind=='working'&&x.added_kg>PRS_EPS)rows.push([x,q.s,ts<co])})});/* v29: the logged keypad value, not effective load */
  const by={};rows.forEach(r=>(by[r[0].ex]=by[r[0].ex]||[]).push(r));const flagged=[],unjudged=[],r4=v=>pyRound(v,4);
  for(const ex in by){const rs=by[ex];for(const[x,s,pre]of rs){if(!pre||ign.has(x.id))continue;const others=rs.filter(y=>y[0].id!=x.id).map(y=>y[0].added_kg);
    if(others.length<sd.min_others){unjudged.push({set_id:x.id,session_id:s.id,exercise_id:ex,load_kg:r4(x.added_kg)});continue}const med=prMedian(others);
    {const L=x.added_kg;if(L>=sd.min_ratio*med&&Math.abs(L/sd.divisor-med)<=sd.window*med)flagged.push({set_id:x.id,session_id:s.id,exercise_id:ex,load_kg:r4(L),median_kg:r4(med),suggested_kg:r4(L/sd.divisor)})}}}
  const k=(a,b)=>prCmp(a.session_id,b.session_id)||prCmp(a.set_id,b.set_id);return{flagged:flagged.sort(k),unjudged:unjudged.sort(k)}}
