/* vol14 flags — ONE list, the single source of truth for the Plan (day + week flags), the Analysis summary count and every Analysis section.
   Text: Coach's rules.json flag_copy templates (plain English; what's wrong, why, the fix, with real numbers; no check titles).
   Sources: Payoff (logic/payoff.js) for payoff_past_efficient / payoff_negative; rules.json weekly_status for weekly_needs_sets / weekly_far_over
   (the same rule feeds the Summary and the Weekly volume header); PCHECK.check for the session / week rules; FREQNOTES, IMPACT overlaps and
   the checker's suggestions for the rest.
   SIGNIFICANT (flag_copy.ranking): score = template significance (payoff_past_efficient 60 + min(20, 10 x sets_past_peak), weekly_needs_sets
   90 + min(10, 2 x (min - sets)), others fixed). Plan shows the top 2 per day and the top 2 for the week among flags with plan_eligible true
   and score >= 50; payoff_past_efficient is plan-eligible only from 1 full set past the peak. Ties: higher score, warn before info, day
   mon..sun, muscle A-Z. Everything else stays in Analysis. sev (UI colour only): 3 = score >= 90, 2 = other significant, 1 = minor. */
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const PCm=()=>isNode?require('./progcheck.js'):root.PCHECK,POm=()=>isNode?require('./payoff.js'):root.PAYOFF;
const ORDER=['mon','tue','wed','thu','fri','sat','sun'],DAYL={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
const r1=x=>Math.floor(x*10+0.5+1e-7)/10,r2=x=>Math.floor(x*100+0.5+1e-7)/100,half=x=>Math.ceil(2*x-1e-9)/2;
const n1=x=>{const r=r1(+x);return String(r===0?0:r)};
const clone=d=>d.map(D=>({day:D.day,tiles:D.tiles.map(t=>Object.assign({},t))}));
const FC=dt=>(dt.rules&&dt.rules.flag_copy)||{templates:{},muscle_names:{}};
const RU=(dt,id)=>((dt.rules&&dt.rules.rules)||[]).find(r=>r.id===id)||{};
const hrs=h=>{const d=h/24;return d>=1.75?`${n1(Math.round(d*2)/2)} days`:d>=0.9?'1 day':`${Math.round(h)} hours`};
// fill a template: {Muscle}/{get}/{are}/{go}/{them} from muscle_names[m]; other keys from vals
function fill(dt,tid,m,vals){const T=FC(dt).templates[tid];if(!T)return null;const MN=(FC(dt).muscle_names||{})[m]||{};const nm=MN.name||String(m||'').replace(/_/g,' ');
  const V=Object.assign({Muscle:nm,muscle:nm.toLowerCase(),get:MN.get||'get',are:MN.are||'are',go:MN.go||'go',them:MN.pronoun||'them'},vals||{});
  let s=T.template.replace(/\{(\w+)\}/g,(a,k)=>V[k]!=null?String(V[k]):a).replace(/\b1 sets\b/g,"1 set");return s.charAt(0).toUpperCase()+s.slice(1)}
function scoreOf(dt,tid,v){const T=FC(dt).templates[tid]||{},s=T.significance;if(typeof s==='number')return s;
  if(tid==='payoff_past_efficient')return 60+Math.min(20,10*(v.sets_past_peak||0));if(tid==='weekly_needs_sets')return 90+Math.min(10,2*(v.short||0));return parseFloat(s)||0}
function mk(dt,tid,o){const T=FC(dt).templates[tid]||{},score=o.score!=null?o.score:scoreOf(dt,tid,o.sv||{});
  let plan=!!T.plan_eligible&&score>=50;if(tid==='payoff_past_efficient'&&!((o.sv||{}).sets_past_peak>=1))plan=false;if(o.optional)plan=false;
  const text=fill(dt,tid,o.muscle,o.vals);if(!text)return null;
  return Object.assign({id:o.id,kind:tid,tid,scope:T.scope||o.scope||'week',severity:o.optional?'info':(T.severity||'info'),score,plan,sev:plan?(score>=90?3:2):1,size:score,
    text,short:text.split('. ')[0].replace(/\.$/,'')+'.',why:T.why||'',what:T.what||'',fixText:o.fixText||'',fix:o.fix||null},o,{text,score,plan,sev:plan?(score>=90?3:2):1})}
// sets to cut on one day so the muscle is back at its Payoff peak (marginal >= 1); 1 set per tile minimum
function cutToPeak(dt,tiles,m){const PC=PCm(),PO=POm(),T=tiles.map(t=>Object.assign({},t)),cuts={};let o=PO.muscle(dt,T,m),k=0;
  for(let g=0;g<40&&o.past_peak;g++){const cand=T.map(t=>({t,c:PC.eff(dt,[{id:t.id,sets:1}])[m]||0})).filter(x=>x.c>0&&x.t.sets>1).sort((a,b)=>b.c-a.c||b.t.sets-a.t.sets)[0];if(!cand)break;
    cuts[cand.t.id]=cuts[cand.t.id]||{id:cand.t.id,from:cand.t.sets};cand.t.sets--;cuts[cand.t.id].to=cand.t.sets;k++;o=PO.muscle(dt,T,m)}
  return {cuts:Object.values(cuts),k,n:o.n,ok:!o.past_peak}}
// weekly_status (rules.json): one rule for the Summary check, the 'need sets' count and the Weekly volume header. x = r2(weekly ES, face value)
// CoS (b): compare against the DISPLAYED weekly value, rounded half-up to 0.1 (same as the session-limit check).
// CoS (a): with 2 training days, weekly-minimum misses are calm info (grey, not plan flags) with one line; per-preset field / wording read from
// data when Coach provides it (rules.weekly_status.two_day {days, line} or a preset's weekly_minimum_note), else the CoS default line.
const TWO_DAY_LINE="Two days can't cover every muscle. This plan prioritizes the big ones; add a day to fill the gaps.";
function weeklyStatus(dt,A,lv,opts){const TT=(dt.TG||dt.targets||{}),Z=(TT.volume_zones||{})[lv]||{},WS=(dt.rules&&dt.rules.weekly_status)||{},opt=new Set([].concat(WS.optional_muscles||[],((TT.optional_muscles||{}).muscles)||[],['abductors'])),out={};   // abductors optional (Coach vol14b: info only, no weekly-minimum flag)const out={};
  for(const [m,v] of Object.entries(A.muscles)){const z=Z[m]||v.zones||{};if(z.min==null)continue;const x=r1(r2(v.x!=null?v.x:(v.raw||0))),o=opt.has(m)||!!z.optional;
    const st=x<z.min-1e-9?'needs_sets':x<=z.diminishing+1e-9?'in_range':x<=z.diminishing*1.25+1e-9?'over':'far_over';out[m]={x,min:z.min,sweet:z.sweet,dim:z.diminishing,status:st,optional:o}}
  const need=Object.entries(out).filter(([,o])=>o.status==='needs_sets'&&!o.optional).map(([m])=>m),far=Object.entries(out).filter(([,o])=>o.status==='far_over').map(([m])=>m);
  const H=WS.header||{};const header=need.length===0?(H.none||'Every muscle has enough weekly sets'):need.length===1?(H.one||'1 muscle needs sets'):(H.some||'{n} muscles need sets').replace('{n}',need.length);
  // vol14c: 2 training days -> under-minimum muscles are below_by_design (info, grey), not needs_sets; shown once per board with one line
  const TD=(WS.two_day_rule||WS.two_day||{}),nd=opts&&opts.trainingDays,two=nd!=null&&nd===(TD.days_per_week||TD.days||2);
  for(const [m,o] of Object.entries(out)){if(o.status!=='needs_sets')continue;o.below=o.optional?'optional_low':two?'below_by_design':'needs_sets'}
  const need2=Object.entries(out).filter(([,o])=>o.below==='needs_sets').map(([m])=>m),byDesign=Object.entries(out).filter(([,o])=>o.below==='below_by_design').map(([m])=>m);
  const header2=need2.length===0?(H.none||'Every muscle has enough weekly sets'):need2.length===1?(H.one||'1 muscle needs sets'):(H.some||'{n} muscles need sets').replace('{n}',need2.length);
  const T2=((dt.rules&&dt.rules.flag_copy||{}).templates||{}).weekly_two_day_by_design,calm=byDesign.length>0,line=calm?((opts&&typeof opts.note==='string'&&opts.note)||(T2&&T2.template)||TD.line||TWO_DAY_LINE):null;
  return {muscles:out,need:need2,byDesign,far,pass:need2.length===0&&far.length===0,header:header2,needs_sets_count:need2.length,calm,line,severity:calm&&!need2.length?'info':need2.length?'warn':'ok'}}
function build(ctx){const {dt,days,lv,A}=ctx,PC=PCm(),PO=POm(),C=PO.CONSTS(dt),XN=ctx.exName,out=[],push=f=>{if(f)out.push(f)};
  const D=days.filter(d=>d.tiles&&d.tiles.length),DM={};for(const d of D)DM[d.day]=PO.day(dt,d.tiles,C);
  const WS=weeklyStatus(dt,A,lv,{trainingDays:D.length,note:ctx.presetNote}),wk=m=>(WS.muscles[m]||{}).x||0,mn=m=>(WS.muscles[m]||{}).min||0;
  // ---- day: Payoff (amber = past the peak, red = below 0)
  for(const d of D)for(const [m,o] of Object.entries(DM[d.day].muscles)){if(!o.gated||!o.past_peak)continue;const red=o.band==='red',extra=half(o.n-o.peak);
    let fix=null,fixT='';const others=D.filter(x=>x.day!==d.day).map(x=>({day:x.day,o:DM[x.day].muscles[m]})).map(x=>({day:x.day,n:x.o?x.o.n:0,room:x.o&&x.o.gated?Math.max(0,x.o.peak-x.o.n):4})).sort((a,b)=>b.room-a.room||a.n-b.n);
    const c=cutToPeak(dt,d.tiles,m),top=c.cuts.slice().sort((a,b)=>(b.from-b.to)-(a.from-a.to))[0],dest=others[0];
    if(top&&dest&&dest.room>=0.5){const k2=top.from-top.to,has=D.find(x=>x.day===dest.day).tiles.find(t=>t.id===top.id);
      fix={label:`Move ${k2} set${k2===1?'':'s'} to ${DAYL[dest.day]}`,ops:[{op:'sets',day:d.day,id:top.id,to:top.to},has?{op:'sets',day:dest.day,id:top.id,to:has.sets+k2}:{op:'add',day:dest.day,id:top.id,sets:k2}]};fixT=`Move ${k2} set${k2===1?'':'s'} of ${XN(top.id)} to ${DAYL[dest.day]}. The weekly total stays the same.`}
    else if(c.k&&wk(m)-(o.n-c.n)>=mn(m)-1e-9){const after=wk(m)-(o.n-c.n);fix={label:`Cut ${c.k} set${c.k===1?'':'s'} on ${DAYL[d.day]}`,ops:c.cuts.map(x=>({op:'sets',day:d.day,id:x.id,to:x.to}))};fixT=`Cut ${c.k} set${c.k===1?'':'s'} (${c.cuts.map(x=>`${XN(x.id)} ${x.from}→${x.to}`).join(', ')}). Your week stays at ${n1(after)} sets, at or above the ${n1(mn(m))} minimum.`}
    push(mk(dt,red?'payoff_negative':'payoff_past_efficient',{id:`payoff:${d.day}:${m}`,day:d.day,muscle:m,vals:{sets:n1(o.n),day:DAYL[d.day],peak:n1(o.peak),zero:n1(o.zero),extra:n1(extra)},sv:{sets_past_peak:o.sets_past_peak},fix,fixText:fixT,section:'daily',payoff:o}))}
  // ---- checker rules (session and week)
  let fl=[];try{fl=PC.check(dt,D.map(d=>({day:d.day,tiles:d.tiles})),lv)[0]}catch(e){}
  const SH=RU(dt,'session_hard_sets'),SL=RU(dt,'session_length'),SE=RU(dt,'session_efficiency'),SLv=(SL.by_level||{})[lv]||SL,SP=A.spinal||{};
  const nextDay=dy=>{const i=ORDER.indexOf(dy);for(let j=1;j<7;j++){const x=ORDER[(i+j)%7];if(D.some(d=>d.day===x))return x}return dy};
  for(const f of fl){const [sv,id]=f;
    if(id==='session_hard_sets'){const day=f[2];push(mk(dt,sv==='warn'?'session_hard_sets':'session_hard_sets_info',{id:`shs:${day}`,day,vals:{day:DAYL[day],sets:n1(f[3]),max:(SH.warn_above||{})[lv]},section:'daily'}))}
    else if(id==='session_length'){const day=f[2],dd=D.find(x=>x.day===day),mins=dd&&ctx.minutesOf?Math.round(ctx.minutesOf(dd)):f[3];push(mk(dt,sv==='warn'?'session_length':'session_length_info',{id:`len:${day}`,day,vals:{day:DAYL[day],min:mins,warn_min:SLv.warn_min},fixText:'',section:'daily'}))}
    else if(id==='spinal_load_session'){const day=f[2];push(mk(dt,'spinal_load',{id:`spine:${day}`,day,vals:{day:DAYL[day],sets:f[3],max:SP.session_max},section:'daily'}))}
    else if(id==='beginner_squat_and_deadlift'){const day=f[2];push(mk(dt,'beginner_squat_and_deadlift',{id:`bsd:${day}`,day,vals:{day:DAYL[day]},section:'daily'}))}
    else if(id==='sets_per_exercise'){const day=f[2],t=(D.find(x=>x.day===day)||{tiles:[]}).tiles.find(x=>x.id===f[3]);if(!t)continue;const lim=RU(dt,'sets_per_exercise').threshold||5;
      push(mk(dt,'sets_per_exercise',{id:`spe:${day}:${t.id}`,day,vals:{exercise:XN(t.id),day:DAYL[day],sets:t.sets},fix:{label:`Cut to ${Math.min(4,lim)} sets`,ops:[{op:'sets',day,id:t.id,to:Math.min(4,lim)}]},section:'daily'}))}
    else if(id==='redundant_pattern'){const day=f[2];push(mk(dt,'redundant_pattern',{id:`red:${day}:${f[3]}`,day,muscle:f[5],vals:{pattern:String(f[3]).replace(/_/g,' '),day:DAYL[day],muscle:((FC(dt).muscle_names||{})[f[5]]||{name:f[5]}).name.toLowerCase(),sets:n1(f[6])},section:'daily'}))}
    else if(id==='session_efficiency'){const day=f[2],m=f[3],lim=((SE.display_limits||{})[lv]||{})[m];if(lim==null||!(f[4]>lim))continue;push(mk(dt,'session_efficiency',{id:`se:${day}:${m}`,day,muscle:m,severity:'info',vals:{sets:n1(f[4]),day:DAYL[day],limit:lim},section:'daily'}))}
    else if(id==='many_small_entries'){const day=f[2];push(mk(dt,'many_small_entries',{id:`small:${day}`,day,vals:{day:DAYL[day],n:f[3]},section:'daily'}))}
    else if(id==='spinal_load_week'){push(mk(dt,'spinal_load_week',{id:'spinew',vals:{sets:f[2],max:SP.week_max},section:'recovery'}))}
    else if(id==='consecutive_high_volume'){const m=f[3],d1=f[2];push(mk(dt,'consecutive_high_volume',{id:`chv:${m}:${d1}`,muscle:m,vals:{day1:DAYL[d1],day2:DAYL[nextDay(d1)]},section:'frequency'}))}
    else if(id==='hinge_before_squat'){const d1=f[2];push(mk(dt,'hinge_before_squat',{id:`hbs:${d1}`,vals:{day1:DAYL[d1],day2:DAYL[nextDay(d1)]},section:'recovery'}))}
    else if(id==='recovery_overlap'){const m=f[2],d1=f[4],d2=f[5];push(mk(dt,f[3]==='streak'?'recovery_overlap_streak':'recovery_overlap',{id:`ovl:${m}:${d1}`,muscle:m,vals:{day1:DAYL[d1],day2:DAYL[d2],gap:hrs(f[6]),ready:hrs(f[7]),n:3},section:'recovery'}))}
    else if(id==='low_frequency'){const m=f[2];push(mk(dt,'low_frequency',{id:`lowf:${m}`,muscle:m,vals:{n:f[3]},section:'frequency'}))}
    else if(id==='recovery_gap_long'){const m=f[2];push(mk(dt,'recovery_gap_long',{id:`gap:${m}`,muscle:m,vals:{gap:hrs(f[5])},section:'frequency'}))}
    else if(id==='missing_stretch'){const m=f[2];if(typeof m!=='string')continue;push(mk(dt,'missing_stretch',{id:`str:${m}`,muscle:m,vals:{muscle:((FC(dt).muscle_names||{})[m]||{name:m}).name.toLowerCase(),examples:'an overhead or deep-stretch variation'},section:'balance'}))}}
  // ---- week: weekly_status (needs sets / far over)
  for(const [m,w] of Object.entries(WS.muscles)){
    if(w.status==='needs_sets'&&w.below!=='needs_sets')continue;   // vol14c: below_by_design (2-day, one grey line per board) and optional_low (abductors) get no per-muscle flag
    if(w.status==='needs_sets'){const grey=false;const short=w.min-w.x,p=ctx.pick&&ctx.pick(m),c=p?(PC.eff(dt,[{id:p.id,sets:1}])[m]||0):0,k=p&&c>0?Math.max(2,Math.min(4,Math.ceil(short/c))):0;
      push(mk(dt,'weekly_needs_sets',{id:`under:${m}`,muscle:m,optional:grey,calm:grey,vals:{sets:n1(w.x),min:n1(w.min),gap:n1(half(short)),exercise:p?XN(p.id):'an exercise for it',day:p?DAYL[p.day]:'another day'},sv:{short},
        fix:p&&k?{label:`Add ${XN(p.id)} on ${DAYL[p.day].slice(0,3)}`,ops:[{op:'add',day:p.day,id:p.id,sets:k}]}:null,fixText:p&&k?`Add ${XN(p.id)} on ${DAYL[p.day]}, ${k} sets.`:'',section:'volume'}))}
    else if(w.status==='far_over')push(mk(dt,'weekly_far_over',{id:`over:${m}`,muscle:m,vals:{sets:n1(w.x),max:n1(w.dim),extra:n1(half(w.x-w.dim))},section:'volume'}))}
  // ---- week: push/pull (ANL push_pull_ratio item), one-day muscles, suggestions with an Apply (stretch, lower-fatigue swap, pattern gap)
  const pp=ctx.pushPull;if(pp&&pp.attention){const pu=pp.pull_sets||0,ps=pp.push_sets||0;
    if(!pu&&ps)push(mk(dt,'push_pull_no_pull',{id:'pushpull',section:'balance'}));else if(pu&&!ps)push(mk(dt,'push_pull_no_push',{id:'pushpull',section:'balance'}));
    else{const R=RU(dt,'push_pull_imbalance'),lo=R.min_ratio||0.75,hi=R.max_ratio||2,low=pu<ps*lo,gap=low?half(ps*lo-pu):half(pu/hi-ps);push(mk(dt,'push_pull_imbalance',{id:'pushpull',vals:{pull:n1(pu),push:n1(ps),gap:n1(gap),side:low?'rows or pulldowns':'presses'},section:'balance'}))}}
  for(const nt of (ctx.freqNotes||[])){const m=(nt.muscles||[])[0]||(nt.link||{}).muscle;if(!m||nt.id!=='freq_one_day')continue;const on=D.find(d=>(PC.eff(dt,d.tiles)[m]||0)>0);
    push(mk(dt,'session_efficiency_single_day',{id:`oneday:${m}`,muscle:m,day:on&&on.day,scope:'day',vals:{sets:n1(wk(m)),day:on?DAYL[on.day]:''},section:'frequency'}))}
  for(const s of (ctx.sugs||[])){const t=s.target||{},m=t.muscle,f0=s.fixes&&s.fixes[0];if(!f0)continue;
    if(s.source==='pattern_gap'&&t.flag){const slot=String(t.flag[2]).replace(/_/g,' ');push(mk(dt,'pattern_gap',{id:`pg:${t.flag[2]}`,vals:{slot_lower:slot,examples:f0.preview.replace(/^Add /,'').replace(/\.$/,'')},fix:{label:'Apply',days:f0.days},fixText:f0.preview+'.',section:'balance'}))}
    else if(s.source==='stretch_share'&&m&&!out.some(f=>f.id===`str:${m}`)){push(mk(dt,'missing_stretch',{id:`str:${m}`,muscle:m,vals:{muscle:((FC(dt).muscle_names||{})[m]||{name:m}).name.toLowerCase(),examples:f0.preview.replace(/^Swap /,'').replace(/\.$/,'')},fix:{label:'Apply',days:f0.days},fixText:f0.preview+'.',section:'balance'}))}}
  const seen=new Set();return out.filter(f=>f&&(seen.has(f.id)?false:(seen.add(f.id),true)))}
// ranking (flag_copy.ranking): higher score, then warn before info, then day mon..sun, then muscle A-Z
const ord=(a,b)=>b.score-a.score||(a.severity==='warn'?0:1)-(b.severity==='warn'?0:1)||ORDER.indexOf(a.day||'mon')-ORDER.indexOf(b.day||'mon')||String(a.muscle||'').localeCompare(String(b.muscle||''));
function significant(F,scope,day,max=2){return F.filter(f=>f.plan&&f.scope===scope&&(day==null||f.day===day)).sort(ord).slice(0,max)}
// Make it more efficient (suggestion_buttons.make_more_efficient; Mr Dude: set counts only, never moves/adds/swaps; 1 set per exercise):
// red first, then larger sets_past_peak, then day, then muscle; cut 1 set at a time from the lowest-credit-per-fatigue tile, never letting
// ANY credited muscle drop below its weekly minimum.
function efficientOps(dt,days,lv,A){const PO=POm(),PC=PCm(),W=clone(days.filter(d=>d.tiles&&d.tiles.length)),ops=[],WS=weeklyStatus(dt,A,lv),wk={},MIN={};
  for(const [m,o] of Object.entries(WS.muscles)){wk[m]=o.x;MIN[m]=o.min}let blocked=0;
  for(let g=0;g<400;g++){const L=[];for(const d of W){const M=PO.day(dt,d.tiles).muscles;for(const [m,o] of Object.entries(M))if(o.gated&&o.past_peak)L.push({d,m,o})}
    L.sort((a,b)=>(b.o.band==='red')-(a.o.band==='red')||b.o.sets_past_peak-a.o.sets_past_peak||ORDER.indexOf(a.d.day)-ORDER.indexOf(b.d.day)||a.m.localeCompare(b.m));let did=false;
    for(const it of L){const F=PC.fatMus(dt,it.d.tiles);const cand=it.d.tiles.map(t=>{const E1=PC.eff(dt,[{id:t.id,sets:1,rir:t.rir}]),f1=PC.fatMus(dt,[{id:t.id,sets:1,rir:t.rir}]);return {t,E1,c:E1[it.m]||0,cf:(E1[it.m]||0)/((f1[it.m]||1e-9))}}).filter(x=>x.c>0&&x.t.sets>1)
        .filter(x=>Object.entries(x.E1).every(([mm,c])=>!(c>0)||MIN[mm]==null||r1(wk[mm]-c)>=MIN[mm]-1e-9)).sort((a,b)=>a.cf-b.cf||it.d.tiles.indexOf(b.t)-it.d.tiles.indexOf(a.t)||a.t.id.localeCompare(b.t.id))[0];
      if(!cand){blocked++;continue}cand.t.sets--;for(const [mm,c] of Object.entries(cand.E1))if(mm in wk)wk[mm]-=c;ops.push({op:'sets',day:it.d.day,id:cand.t.id,to:cand.t.sets});did=true;break}
    if(!did)break}
  const last={};ops.forEach(o=>last[o.day+'|'+o.id]=o);const L=Object.values(last);const removed=L.reduce((a,o)=>{const d0=days.find(x=>x.day===o.day).tiles.find(t=>t.id===o.id);return a+(d0.sets-o.to)},0);return {ops:L,removed}}
// Push for max growth (suggestion_buttons.push_for_max_growth): muscles under the top of their weekly sweet spot, largest gap first; add 1 set
// on the day with the lowest current effective sets for the muscle, to the tile with the highest credit, keeping r1(day ES) <= the per-workout cap
// (session_efficiency.display_limits) for every credited muscle, <= 5 sets per exercise, weekly <= sweet top + 0.5, and no new warn-level
// session_hard_sets / session_length / spinal flag. Never adds exercises or days.
function pushOps(dt,days,lv,A,maxSets=5){const PC=PCm(),W=clone(days.filter(d=>d.tiles&&d.tiles.length)),ops={},WS=weeklyStatus(dt,A,lv),wk={},top={};
  const CAP=(RU(dt,'session_efficiency').display_limits||{})[lv]||{};for(const [m,o] of Object.entries(WS.muscles)){wk[m]=o.x;top[m]=o.sweet?o.sweet[1]:o.dim}
  const warnSet=ds=>{try{return new Set(PC.check(dt,ds,lv)[0].filter(f=>f[0]==='warn'&&/session_hard_sets|session_length|spinal_load/.test(f[1])).map(f=>f[1]+':'+f[2]))}catch(e){return new Set()}};const base=warnSet(W);let added=0;
  for(let g=0;g<200;g++){const M=Object.keys(wk).filter(m=>top[m]!=null&&r2(wk[m])<top[m]-1e-9).sort((a,b)=>(top[b]-wk[b])-(top[a]-wk[a])||a.localeCompare(b));let did=false;
    for(const m of M){const cands=[];for(const d of W){const E=PC.eff(dt,d.tiles);for(const t of d.tiles){if(t.sets>=maxSets)continue;const E1=PC.eff(dt,[{id:t.id,sets:1,rir:t.rir}]);if(!((E1[m]||0)>0))continue;
          if(Object.entries(E1).some(([mm,c])=>c>0&&CAP[mm]!=null&&r1((E[mm]||0)+c)>CAP[mm]+1e-9))continue;if(r2(wk[m]+E1[m])>top[m]+0.5+1e-9)continue;
          const fps=(PC.fatMus(dt,[{id:t.id,sets:1}])[m]||0);cands.push({d,t,E1,dayN:E[m]||0,c:E1[m],fps,i:d.tiles.indexOf(t)})}}
      cands.sort((a,b)=>a.dayN-b.dayN||b.c-a.c||a.fps-b.fps||a.i-b.i||a.t.id.localeCompare(b.t.id));
      for(const x of cands){x.t.sets++;const nw=warnSet(W);if([...nw].some(k=>!base.has(k))){x.t.sets--;continue}
        for(const [mm,c] of Object.entries(x.E1))if(mm in wk)wk[mm]+=c;ops[x.d.day+'|'+x.t.id]={op:'sets',day:x.d.day,id:x.t.id,to:x.t.sets};added++;did=true;break}
      if(did)break}
    if(!did)break}
  return {ops:Object.values(ops),added}}
const API={build,significant,cutToPeak,efficientOps,pushOps,ord,weeklyStatus,fill};
if(isNode)module.exports=API;else root.FLAGS14=API})(typeof window!=='undefined'?window:globalThis);
