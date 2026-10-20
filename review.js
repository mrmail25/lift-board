// v29 D / D2 (Coach-confirmed 2026-10-19, v29-coach-spec.md Phase D2): finish summary "vs last time" (#8) and planned vs done + block
// comparison (#9). Pure functions of the logged history. Exact port of tests/v29d_ref.py, built only from Coach's tools/prs.py primitives.
// Rules: rules.json logger (e1rm_max_reps, set_tags pr_exclude, progress_signals.window_weeks, deload_signals.eligible) and review
// (on_plan_margin; flat_pct / block_min_prior_weeks when Coach adds them), targets.json counting (min_rating_to_count, round_to).
const rvR4=v=>v==null?null:pyRound(v,4);
const rvRB=(v,st)=>Math.round(v/st)*st;/* prs.py round_board = floor(x+half) = Math.round, as app.js totals() */
const rvRV=()=>(typeof RU!='undefined'&&RU&&RU.review)||{};
/* Builder fallbacks only while rules.json review has no key (reported to Coach): flat band in %, prior weeks with logs for the block */
const rvFlat=()=>rvRV().flat_pct??1,rvMinPrior=()=>rvRV().block_min_prior_weeks??2,rvMargin=()=>rvRV().on_plan_margin;
const rvTopOk=(x,R)=>prOk(x,'weight',R);/* drop / partial sets (never a weight PR) are left out of the top-set pick, kept in volume */
function rvStats(xs,R){const c=xs.map((x,i)=>[x,i]).filter(z=>rvTopOk(z[0],R)),top=c.length?c.sort((a,b)=>(b[0].load_kg-a[0].load_kg)||(b[0].reps-a[0].reps)||(a[1]-b[1]))[0][0]:null;
  const e1=top&&top.load_kg>PRS_EPS&&top.reps<=R.mx&&prOk(top,'e1rm',R)?prE1(top.load_kg,top.reps,R):null;
  return{top,volume_kg:prNsum(xs.map(x=>x.load_kg*x.reps)),e1rm_kg:e1,sets:xs.length}}
function finishSummary(h,sid,o={}){const R=prRules(),al=o.aliases,fl=prFlatten(h,al,R,o),i=fl.findIndex(q=>q.s.id==sid);if(i<0)return null;
  const P=(detectPrs(h,al,o)||{})[sid]||{},order=[],by={};
  fl[i].sets.forEach(x=>{if(!prSet(x))return;if(!by[x.ex]){order.push(x.ex);by[x.ex]=[]}by[x.ex].push(x)});
  return order.map(ex=>{const c=rvStats(by[ex],R),t=c.top;let prev=null,dl=null;
    for(let j=i-1;j>=0;j--){const ps=fl[j].sets.filter(x=>prSet(x)&&x.ex==ex);if(!ps.length)continue;
      if(fl[j].s.deload){if(!dl)dl=[fl[j].s.id,rvStats(ps,R),fl[j].s.unit||'lb'];continue}/* skip deload sessions; only a deload earlier -> use it, labelled */
      prev=[fl[j].s.id,rvStats(ps,R),fl[j].s.unit||'lb'];break}
    const isdl=!prev&&!!dl;prev=prev||dl;
    const row={exercise:ex,unit:fl[i].s.unit||'lb',top_added_kg:t?rvR4(t.added_kg):null,top_bw_kg:t?rvR4(t.bw_kg||0):null,top_load_kg:t?rvR4(t.load_kg):null,top_reps:t?t.reps:null,top_set_id:t?t.id:null,volume_kg:rvR4(c.volume_kg),e1rm_kg:rvR4(c.e1rm_kg),sets:c.sets,
      prs:PR_TYPES.filter(k=>(P[ex]||{})[k])};
    if(!prev)return Object.assign(row,{last_session:null,last_deload:false,status:'first'});
    const p=prev[1],pt=p.top;let basis,a,b;
    if(t&&pt){if(t.load_kg<=PRS_EPS&&pt.load_kg<=PRS_EPS){basis='reps';a=t.reps;b=pt.reps}
      else if(c.e1rm_kg!=null&&p.e1rm_kg!=null){basis='e1rm';a=c.e1rm_kg;b=p.e1rm_kg}/* top sets <= e1rm_max_reps on both sides */
      else{basis='set_volume';a=t.load_kg*t.reps;b=pt.load_kg*pt.reps}}else{basis='volume';a=c.volume_kg;b=p.volume_kg}
    const d=a-b,pct=b>PRS_EPS?d/b*100:null,st=pct!=null?(Math.abs(pct)<=rvFlat()+1e-9?'flat':pct>0?'up':'down'):(d>PRS_EPS?'up':d<-PRS_EPS?'down':'flat');
    const de=c.e1rm_kg==null||p.e1rm_kg==null?null:c.e1rm_kg-p.e1rm_kg;
    return Object.assign(row,{last_session:prev[0],last_unit:prev[2],last_top_added_kg:pt?rvR4(pt.added_kg):null,last_top_bw_kg:pt?rvR4(pt.bw_kg||0):null,last_deload:isdl,last_top_load_kg:pt?rvR4(pt.load_kg):null,last_top_reps:pt?pt.reps:null,last_volume_kg:rvR4(p.volume_kg),last_e1rm_kg:rvR4(p.e1rm_kg),
      d_load_kg:t&&pt?rvR4(t.load_kg-pt.load_kg):null,d_reps:t&&pt?t.reps-pt.reps:null,d_volume_kg:rvR4(c.volume_kg-p.volume_kg),d_e1rm_kg:rvR4(de),
      d_e1rm_pct:de==null||p.e1rm_kg<=PRS_EPS?null:rvR4(de/p.e1rm_kg*100),basis,d_basis_pct:rvR4(pct),status:st})})}
// v29.2 (Coach rule, CoS): "vs last time" across units. When the earlier session was logged in the other unit, its top set's logged load is first snapped to
// the nearest real load in this session's unit (same snap as v29.1 last-time loads: saved gym if in that unit, else logger.gym_profile_default[unit],
// else load_step), then subtracted. Within the PR tie rule (|change| <= logger.prs.tie.step_fraction x smallest real step, prs.js prStepKg) the load
// change is ±0 and the arrow comes from reps (as the D.1 tie); otherwise the change and the arrow use the snapped load. Same unit -> null (unchanged).
// r = finishSummary row; prof = saved gym profile or null. Values in the session unit.
function vsCrossUnit(r,prof,o={}){if(!r||r.status=='first'||!r.last_unit||r.last_unit==r.unit||r.top_load_kg==null||r.last_top_load_kg==null)return null;
  if(r.top_load_kg<=PRS_EPS&&r.last_top_load_kg<=PRS_EPS)return null;
  const R=prRules(),u=r.unit,T=(o&&o.exercises)||(typeof EX!='undefined'?EX:{}),m=T[r.exercise],eq=(m&&!m.custom&&m.equipment)||'default',asst=!!(m&&m.bodyweight_assisted),ku=v=>u=='lb'?v*R.lbPerKg:v;
  const sp=prof&&prof.unit==u?prof:JSON.parse(JSON.stringify(((R.lg.gym_profile_default||{})[u])||{unit:u}));
  const added=nearestRealLoad(ku(r.last_top_added_kg),sp,eq,u,r.exercise),bw=ku(r.last_top_bw_kg||0),last=asst?(r.last_top_bw_kg>PRS_EPS?Math.max(0,bw-added):0):bw+added/* prs.py flatten: assisted without a bodyweight = reps only */,top=ku(r.top_load_kg);
  const d=top-last,step=ku(prStepKg({ex:r.exercise,added_kg:r.top_load_kg},u,R,prof,{exercises:T})),tie=Math.abs(d)<=R.sf*step+ku(PRS_EPS);let pct;
  if(tie){if(r.basis=='e1rm'){const a=prE1(r.top_load_kg,r.top_reps,R),b=prE1(r.top_load_kg,r.last_top_reps,R);pct=b>PRS_EPS?(a-b)/b*100:null}
    else if(r.basis=='set_volume'||r.basis=='reps')pct=r.last_top_reps>0?(r.top_reps-r.last_top_reps)/r.last_top_reps*100:null;else pct=r.d_basis_pct}
  else if(r.basis=='e1rm'){const a=prE1(top,r.top_reps,R),b=prE1(last,r.last_top_reps,R);pct=b>1e-9?(a-b)/b*100:null}
  else if(r.basis=='set_volume'){const a=top*r.top_reps,b=last*r.last_top_reps;pct=b>1e-9?(a-b)/b*100:null}else pct=r.d_basis_pct;
  const st=pct==null?(tie?'flat':d>1e-9?'up':d<-1e-9?'down':'flat'):Math.abs(pct)<=rvFlat()+1e-9?'flat':pct>0?'up':'down';
  return{unit:u,last_unit:r.last_unit,last_top_shown:rvR4(last),d_load:tie?0:rvR4(d),tie,pct:rvR4(pct),status:st}}
// planned weekly sets per muscle for days of tiles {id, sets}, counted like the board (rating x sets, rating >= min_rating_to_count)
function plannedSets(days,h,o={}){const R=prRules(),T=prExTable(h||{},o),mus=o.muscles||MUS,t={};mus.forEach(m=>t[m]=[]);
  days.flat().forEach(it=>{const e=T[it.id];if(!e)return;for(const m in e.muscles){const r=e.muscles[m];if(r>=R.mr&&m in t)t[m].push(r*it.sets)}});
  const s={};mus.forEach(m=>s[m]=t[m].reduce((a,v)=>a+v,0));
  return{per_muscle:Object.fromEntries(mus.map(m=>[m,rvR4(s[m])])),rounded:Object.fromEntries(mus.map(m=>[m,rvRB(s[m],R.rt)]))}}
const rvWd=ymd=>{const[y,m,d]=ymd.slice(0,10).split('-').map(Number);return(new Date(Date.UTC(y,m-1,d)).getUTCDay()+6)%7};
// plan for a week: current week = days Mon..today (plan to date); a finished week = latest planned-sets snapshot taken before it ended, else the current plan
function weekPlan(days,week,today,snaps,h,o={}){const R=prRules(),mus=o.muscles||MUS,ws=prWeekStart(String(week)),we=prAddDays(ws,7),td=String(today).slice(0,10);
  if(ws==prWeekStart(td))return Object.assign(plannedSets(days.slice(0,rvWd(td)+1),h,o),{source:'to_date'});
  const sn=(snaps||[]).map((s,i)=>[s,i]).filter(z=>prDay(z[0].at)<we);
  if(sn.length){const s=sn.sort((a,b)=>prCmp(a[0].at,b[0].at)||a[1]-b[1])[sn.length-1][0],pm={};mus.forEach(m=>pm[m]=Number((s.per_muscle||{})[m]||0));
    return{per_muscle:Object.fromEntries(mus.map(m=>[m,rvR4(pm[m])])),rounded:Object.fromEntries(mus.map(m=>[m,rvRB(pm[m],R.rt)])),source:'snapshot',at:s.at}}
  return Object.assign(plannedSets(days,h,o),{source:'current'})}
// block = logger.progress_signals.window_weeks weeks ending with `week` vs the same span before; shown only past the Phase E gate
// (deload_signals.eligible: min_logged_weeks since the first completed session and min_sessions) with >= block_min_prior_weeks logged weeks in the earlier window
// v29.1 (Coach review.block_exclude_deload): true -> weeks with a completed deload session are skipped and each window reaches back past them to keep
// window_weeks training weeks (this window first, then the earlier one); false/missing -> contiguous weeks (v29 D). Skipped weeks are returned for the note.
const rvExDl=()=>rvRV().block_exclude_deload===true;
// v29.2 (CoS): the week containing `today` is still in progress (partly logged), so it is not a training week of the block either: skipped like a deload
// week, windows reach back. Builder fallback true until Coach adds review.block_exclude_current_week (flagged).
const rvExCur=()=>rvRV().block_exclude_current_week??true;
function blockCompare(h,week,today,o={}){const n=((RU.logger||{}).progress_signals||{}).window_weeks,E=((RU.logger||{}).deload_signals||{}).eligible||{},ws=prWeekStart(String(week)),mus=o.muscles||MUS;
  const dlw=new Set(rvExDl()?(h.sessions||[]).filter(s=>s.status=='completed'&&s.deload).map(s=>prWeekStart(prDay(s.startedAt||s.date))):[]);
  const cw=rvExCur()?prWeekStart(String(today).slice(0,10)):null,Tw=[],Lw=[],skip=[];let curSk=null;for(let w=ws;Lw.length<n;w=prAddDays(w,-7)){if(dlw.has(w))skip.push(w);else if(w==cw)curSk=w;else(Tw.length<n?Tw:Lw).push(w)}
  const A={};[ws,...Tw,...Lw].forEach(w=>{if(!(w in A))A[w]=(o.weekA?o.weekA(w):completedAnalytics(h,w,o)).hard_sets.per_muscle});
  const S=ws_=>Object.fromEntries(mus.map(m=>[m,rvR4(prNsum(ws_.map(w=>A[w][m])))]));
  const comp=(h.sessions||[]).filter(s=>s.status=='completed').map(s=>prDay(s.startedAt||s.date)).sort(),td=String(today).slice(0,10),dd=(a,b)=>Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/864e5);
  const gate=comp.length>0&&dd(td,comp[0])>=7*E.min_logged_weeks&&comp.length>=E.min_sessions,prior=Lw.filter(w=>comp.some(d=>w<=d&&d<prAddDays(w,7))).length;
  return{weeks:n,this_start:Tw[n-1],this_end_exclusive:prAddDays(ws,7),last_start:Lw[n-1],this:S(Tw),last:S(Lw),week:Object.fromEntries(mus.map(m=>[m,rvR4(A[ws][m])])),
    gate,prior_weeks_logged:prior,shown:gate&&prior>=rvMinPrior(),deload_weeks_skipped:skip,current_week_skipped:curSk,this_weeks:Tw,last_weeks:Lw}}
// dashboard: M = muscles with planned > 0; on plan = credited done >= planned - review.on_plan_margin; furthest behind = lowest done/planned, ties larger gap, then muscle order
function planDash(pl,done,o={}){const R=prRules(),mg=rvMargin(),mus=(o.muscles||MUS).filter(m=>pl.per_muscle[m]>PRS_EPS),dn=m=>done[m]||0;
  const on=mus.filter(m=>dn(m)>=pl.per_muscle[m]-mg-PRS_EPS);let gap=null;
  mus.forEach(m=>{if(on.includes(m))return;const q=[dn(m)/pl.per_muscle[m],pl.per_muscle[m]-dn(m)];if(!gap||q[0]<gap[1][0]-PRS_EPS||(Math.abs(q[0]-gap[1][0])<=PRS_EPS&&q[1]>gap[1][1]+PRS_EPS))gap=[m,q]});
  return{muscles:mus.length,on_plan:on.length,behind:gap?{muscle:gap[0],done:rvRB(dn(gap[0]),R.rt),planned:pl.rounded[gap[0]]}:null}}
