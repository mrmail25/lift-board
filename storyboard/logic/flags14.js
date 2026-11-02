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
// fill a template part: {Muscle}/{muscle}/{get}/{are}/{go}/{them} from flag_copy.muscle_names[m]; every other field from vals (keys = the
// template's fields; callers format them per fields[name].units / rounding, e.g. ss() for "set"/"sets").
function fillStr(dt,str,m,vals){if(!str)return '';const MN=(FC(dt).muscle_names||{})[m]||{};const nm=MN.name||String(m||'').replace(/_/g,' ');
  const V=Object.assign({Muscle:nm,muscle:nm.toLowerCase(),get:MN.get||'get',are:MN.are||'are',go:MN.go||'go',them:MN.pronoun||'them'},vals||{});
  const s=str.replace(/\{(\w+)\}/g,(a,k)=>V[k]!=null?String(V[k]):a);return s.charAt(0).toUpperCase()+s.slice(1)}
function fill(dt,tid,m,vals){const T=FC(dt).templates[tid];return T?fillStr(dt,T.template,m,vals):null}
const ss=x=>{const v=r1(x);return `${n1(v)} set${v===1?'':'s'}`};
function scoreOf(dt,tid,v){const T=FC(dt).templates[tid]||{},s=T.significance;if(typeof s==='number')return s;
  if(tid==='payoff_past_efficient')return 60+Math.min(20,10*(v.sets_past_peak||0));if(tid==='weekly_needs_sets')return 90+Math.min(10,2*(v.short||0));return parseFloat(s)||0}
// vol14e: the one short line a Plan day card shows per flag ('<Muscle>: <n> sets, <reason>'), derived from the template id and its fields.
// short_text is used when it fits one card line (<= CARD_MAX chars); otherwise the line is built here. Full what/why/fix stays everywhere else.
const CARD_MAX=48;
// vol15: Coach's short_line, except where it says 'payoff' (no Payoff wording on screen): a plain-English line instead
const PLAIN={};   // vol15b: Coach's short_line now says it ('{Muscle}: {sets} sets, too many for one workout ›'); override dropped
function cardLine(dt,tid,o,shortT){const v=o.vals||{},M=o.muscle?fillStr(dt,'{Muscle}',o.muscle,{}):'',S=x=>{const n=parseFloat(x);return `${x} set${n===1?'':'s'}`};
  const T=((FC(dt).templates||{})[tid])||{},CL=PLAIN[tid]||T.card_line||T.short_line;if(CL)return fillStr(dt,CL,o.muscle,o.vals).replace(/\s*›\s*$/,'');   // vol15 adapter: Coach's short flag line wins when the template has one
  if(shortT&&shortT.length<=CARD_MAX)return shortT;
  const L={payoff_past_efficient:()=>`${M}: ${S(v.sets)}, past the peak`,
    payoff_negative:()=>`${M}: ${S(v.sets)}, too many for one workout`,
    session_hard_sets:()=>`${v.day}: ${v.day_sets} hard sets, over the ${v.cap}-set cap`,
    session_hard_sets_info:()=>`${v.day}: ${v.day_sets} hard sets, near the ${v.cap}-set cap`,
    session_length:()=>`${v.day}: about ${v.minutes} min, over the ${v.warn_min}-min limit`,
    session_length_info:()=>`${v.day}: about ${v.minutes} min, a long session`,
    spinal_load:()=>`${v.day}: ${v.sets} heavy squat/deadlift sets, max ${v.max}`,
    beginner_squat_and_deadlift:()=>`${v.day}: heavy squats and heavy deadlifts`,
    sets_per_exercise:()=>`${v.exercise}: ${S(v.sets)} in one exercise, max ${v.max}`,
    redundant_pattern:()=>`${M}: ${S(v.sets)} of one movement, over the ${v.cap}-set limit`,
    session_efficiency:()=>`${M}: ${S(v.sets)}, over the ${v.limit}-set workout limit`,
    session_efficiency_single_day:()=>`${M}: all ${v.week_sets} weekly sets on one day`,
    many_small_entries:()=>`${v.day}: ${v.n} exercises, about ${v.avg} sets each`,
    weekly_needs_sets:()=>`${M}: ${v.sets} sets/wk, below the ${v.min}-set minimum`,
    weekly_optional_low:()=>`${M}: ${v.sets} sets/wk, optional muscle`,
    weekly_far_over:()=>`${M}: ${v.sets} sets/wk, past the ${v.max}-set max`,
    spinal_load_week:()=>`This week: ${v.sets} heavy squat/deadlift sets, max ${v.max}`,
    consecutive_high_volume:()=>`${M}: hard sessions ${v.day1} and ${v.day2}`,
    recovery_overlap:()=>`${M}: ${v.gap_h} h rest, needs about ${v.ready_h} h`,
    recovery_overlap_streak:()=>`${M}: ${v.n} hard days in a row`,
    low_frequency:()=>`${M}: trained only ${v.n_days} a week`,
    recovery_gap_long:()=>`${M}: ${v.gap_days} days between hard sessions`,
    missing_stretch:()=>`${M}: no stretched-position work`}[tid];
  return L?L():null}
function mk(dt,tid,o){const T=FC(dt).templates[tid]||{};if(T.shown===false)return null;/* vol15: retired templates (payoff_past_efficient, wasted_late_sets, recovery_vs_baseline) */
  const score=o.score!=null?o.score:scoreOf(dt,tid,o.sv||{});
  let plan=!!T.plan_eligible&&score>=50;if(tid==='payoff_past_efficient'&&!((o.sv||{}).sets_past_peak>=1))plan=false;if(o.optional)plan=false;
  const text=fill(dt,tid,o.muscle,o.vals);if(!text)return null;const P=k=>fillStr(dt,T[k],o.muscle,o.vals);
  const grey=T.display==='grey'||!!o.optional,sev=plan&&!grey?(score>=90?3:2):1;
  return Object.assign({id:o.id,kind:tid,tid,scope:T.scope||o.scope||'week',fixText:'',fix:null},o,{text,what:P('what'),whyT:P('why'),fixT:P('fix'),short_text:T.short_text?P('short_text'):null,
    short:P('what')||text,card:cardLine(dt,tid,o,T.short_text?P('short_text'):null),why:P('why'),severity:grey?'info':(T.severity||'info'),grey,score,plan,sev,size:score})}
// sets to cut on one day so the muscle is back at its Payoff peak (marginal >= 1); 1 set per tile minimum
function cutToPeak(dt,tiles,m){const PC=PCm(),PO=POm(),T=tiles.map(t=>Object.assign({},t)),cuts={};let o=PO.muscle(dt,T,m),k=0;
  for(let g=0;g<40&&o.past_peak;g++){const cand=T.map(t=>({t,c:PC.eff(dt,[{id:t.id,sets:1}])[m]||0})).filter(x=>x.c>0&&x.t.sets>1).sort((a,b)=>b.c-a.c||b.t.sets-a.t.sets)[0];if(!cand)break;
    cuts[cand.t.id]=cuts[cand.t.id]||{id:cand.t.id,from:cand.t.sets};cand.t.sets--;cuts[cand.t.id].to=cand.t.sets;k++;o=PO.muscle(dt,T,m)}
  return {cuts:Object.values(cuts),k,n:o.n,ok:!o.past_peak}}
// weekly_status (rules.json): one rule for the Summary check, the 'need sets' count and the Weekly volume header. x = r2(weekly ES, face value)
// weekly_status (rules.json, vol14d): ONE rule for the Summary check, the 'need sets' count and the Weekly volume header.
// Minimum: miss iff r1(x) < min (the displayed value, half-up to 0.1). 2 training days -> weekly_status.two_day_rule (below_by_design, grey,
// once per board, not a fail). weekly_status.optional_muscles -> optional_low (grey, not a fail).
function weeklyStatus(dt,A,lv,opts){const TT=(dt.TG||dt.targets||{}),Z=(TT.volume_zones||{})[lv]||{},WS=(dt.rules&&dt.rules.weekly_status)||{},OM=WS.optional_muscles||{},TD=WS.two_day_rule||null;
  const opt=new Set(OM.muscles||[]),out={};
  for(const [m,v] of Object.entries(A.muscles)){const z=Z[m]||v.zones||{};if(z.min==null)continue;const ex=r2(v.x!=null?v.x:(v.raw||0)),x=r1(ex),o=opt.has(m);
    const st=x<z.min-1e-9?'needs_sets':ex<=z.diminishing+1e-9?'in_range':ex<=z.diminishing*1.25+1e-9?'over':'far_over';out[m]={x,min:z.min,sweet:z.sweet,dim:z.diminishing,status:st,optional:o}}
  const nd=opts&&opts.trainingDays,two=!!TD&&nd===2;
  for(const o of Object.values(out))if(o.status==='needs_sets')o.below=o.optional?(OM.status||'optional_low'):two?(TD.status||'below_by_design'):'needs_sets';
  const need=Object.entries(out).filter(([,o])=>o.below==='needs_sets').map(([m])=>m),byDesign=Object.entries(out).filter(([,o])=>o.below==='below_by_design').map(([m])=>m),
    optLow=Object.entries(out).filter(([,o])=>o.below==='optional_low').map(([m])=>m),far=Object.entries(out).filter(([,o])=>o.status==='far_over').map(([m])=>m);
  const H=WS.header||{},header=need.length===0?H.none:need.length===1?H.one:String(H.some).replace('{n}',need.length);
  const T2=((dt.rules&&dt.rules.flag_copy||{}).templates||{})[(TD||{}).flag_copy||'weekly_two_day_by_design'],calm=byDesign.length>0,line=calm?(T2&&T2.template||TD.line):null;
  return {muscles:out,need,byDesign,optLow,far,pass:need.length===0&&far.length===0,header,needs_sets_count:need.length,calm,line,severity:need.length?'warn':calm?(TD.severity||'info'):null}}
// first Push-for-max-growth add candidate for m (existing tile; pushOps order: day with the lowest current ES for m, then highest credit,
// lowest fatigue, board order), else the first rules staple that trains m as a main mover; the day = that tile's day / the lowest-ES training day.
// vol15 adapters (Coach's data pending): staples per muscle and slot_recommendations.
// staples: {muscle:[ids]} (new) -> staples[m][0]; a flat list (current) -> first id with credit >= 0.75 for m.
function stapleFor(dt,m){const S=(dt.rules||{}).staples||((dt.VM||{}).vol15||{}).staples;if(!S)return null;if(!Array.isArray(S)){const L=S[m]||(S.by_muscle||{})[m];return L&&L.length?(typeof L[0]==='string'?L[0]:L[0].id):null}
  return S.find(id=>((dt.EX[id]||{}).muscles||{})[m]>=0.75)||null}
// slot_recommendations: {slot:[ids] | {examples:[ids]}} -> the first two short names; '' until Coach's data lands.
function slotRecs(dt,sl,XS,lv){const R0=(dt.rules||{}).slot_recommendations||((dt.VM||{}).vol15||{}).slot_recommendations,R=R0&&(R0.by_slot||R0);let L=R&&R[sl];if(L&&!Array.isArray(L)&&lv&&L[lv])L=L[lv];const ids=Array.isArray(L)?L:L&&(L.examples||L.exercises)||[];return ids.slice(0,2).map(x=>XS(typeof x==='string'?x:x.id)).filter(Boolean).join(' or ')}
function addCand(dt,D,lv,m){const PC=PCm();const CAP=(RU(dt,'session_efficiency').display_limits||{})[lv]||{},c=[];
  for(const d of D){const E=PC.eff(dt,d.tiles);d.tiles.forEach((t,i)=>{if(t.sets>=5)return;const E1=PC.eff(dt,[{id:t.id,sets:1,rir:t.rir}]);if(!((E1[m]||0)>0))return;
    if(Object.entries(E1).some(([mm,v])=>v>0&&CAP[mm]!=null&&r1((E[mm]||0)+v)>CAP[mm]+1e-9))return;c.push({id:t.id,day:d.day,dayN:E[m]||0,c:E1[m],f:(PC.fatMus(dt,[{id:t.id,sets:1}])[m]||0),i})})}
  c.sort((a,b)=>(b.c>=0.75)-(a.c>=0.75)||a.dayN-b.dayN||b.c-a.c||a.f-b.f||a.i-b.i||a.id.localeCompare(b.id));if(c[0])return Object.assign(c[0],{src:'push'});
  const st=stapleFor(dt,m);if(!st)return null;
  const day=D.map(d=>({day:d.day,n:PC.eff(dt,d.tiles)[m]||0})).sort((a,b)=>a.n-b.n)[0];return day?{id:st,day:day.day,src:'staple'}:null}
function build(ctx){const {dt,days,lv,A}=ctx,PC=PCm(),PO=POm(),C=PO.CONSTS(dt),out=[],push=f=>{if(f)out.push(f)};
  const DN=Object.assign({},DAYL,(dt.rules||{}).day_names||{}),XS=id=>{const e=dt.EX[id]||{};return e.short_name||e.name||ctx.exName(id)};
  const D=days.filter(d=>d.tiles&&d.tiles.length),DM={};for(const d of D)DM[d.day]=PO.day(dt,d.tiles,C);
  const WS=weeklyStatus(dt,A,lv,{trainingDays:D.length}),wk=m=>(WS.muscles[m]||{}).x||0,mn=m=>(WS.muscles[m]||{}).min||0;
  const nextDay=dy=>ORDER[(ORDER.indexOf(dy)+1)%7];
  // ---- day: Payoff (amber = past the peak, red = below 0)
  for(const d of D)for(const [m,o] of Object.entries(DM[d.day].muscles)){if(!o.gated||!o.past_peak)continue;const red=o.band==='red',excess=Math.max(0.5,half(o.n-o.peak));
    let fix=null,fixT='';const others=D.filter(x=>x.day!==d.day).map(x=>({day:x.day,o:DM[x.day].muscles[m]})).map(x=>({day:x.day,n:x.o?x.o.n:0,room:x.o&&x.o.gated?Math.max(0,x.o.peak-x.o.n):4})).sort((a,b)=>b.room-a.room||a.n-b.n);
    const c=cutToPeak(dt,d.tiles,m),top=c.cuts.slice().sort((a,b)=>(b.from-b.to)-(a.from-a.to))[0],dest=others[0];
    if(top&&dest&&dest.room>=0.5){const k2=top.from-top.to,has=D.find(x=>x.day===dest.day).tiles.find(t=>t.id===top.id);
      fix={label:`Move ${k2} set${k2===1?'':'s'} to ${DN[dest.day]}`,ops:[{op:'sets',day:d.day,id:top.id,to:top.to},has?{op:'sets',day:dest.day,id:top.id,to:has.sets+k2}:{op:'add',day:dest.day,id:top.id,sets:k2}]};fixT=`Move ${k2} set${k2===1?'':'s'} of ${XS(top.id)} to ${DN[dest.day]}. The weekly total stays the same.`}
    else if(c.k&&r1(wk(m)-(o.n-c.n))>=mn(m)-1e-9){const after=wk(m)-(o.n-c.n);fix={label:`Cut ${c.k} set${c.k===1?'':'s'} on ${DN[d.day]}`,ops:c.cuts.map(x=>({op:'sets',day:d.day,id:x.id,to:x.to}))};fixT=`Cut ${c.k} set${c.k===1?'':'s'} (${c.cuts.map(x=>`${XS(x.id)} ${x.from}→${x.to}`).join(', ')}). Your week stays at ${n1(after)} sets, at or above the ${n1(mn(m))} minimum.`}
    if(red)push(mk(dt,'payoff_negative',{id:`payoff:${d.day}:${m}`,day:d.day,muscle:m,vals:{sets:n1(o.n),day:DN[d.day],peak:n1(o.peak),zero:n1(o.zero),excess:ss(excess)},sv:{sets_past_peak:o.sets_past_peak},fix,fixText:fixT,section:'daily',payoff:o}))}
  // ---- checker rules (fields from the check_program flag tuples, per flag_copy fields[].source)
  let fl=[];try{fl=PC.check(dt,D.map(d=>({day:d.day,tiles:d.tiles})),lv)[0]}catch(e){}
  const SH=RU(dt,'session_hard_sets'),SL=RU(dt,'session_length'),SLv=(SL.by_level||{})[lv]||SL,SPR=RU(dt,'spinal_load'),SE=RU(dt,'session_efficiency'),SPE=RU(dt,'sets_per_exercise').threshold||5,RP=RU(dt,'redundant_pattern'),MPL=((dt.rules||{}).movement_patterns||{}).labels||{};
  const SB=(dt.rules||{}).stretch_biased||{},SLOT=((dt.PAT||dt.patterns||{}).slots)||{};
  for(const f of fl){const [sv,id]=f;
    if(id==='session_hard_sets'){const day=f[2],cap=(SH.warn_above||{})[lv];push(mk(dt,sv==='warn'?'session_hard_sets':'session_hard_sets_info',{id:`shs:${day}`,day,vals:{day:DN[day],day_sets:f[3],cap,over:f[3]-cap},section:'daily'}))}
    else if(id==='session_length'){const day=f[2],mins=Math.round(f[3]),wm=SLv.warn_min;push(mk(dt,sv==='warn'?'session_length':'session_length_info',{id:`len:${day}`,day,vals:{day:DN[day],minutes:mins,warn_min:wm,cut_sets:Math.ceil((mins-wm+0.01)/2.25)},section:'daily'}))}
    else if(id==='spinal_load_session'){const day=f[2],mx=(SPR.session_warn_above||{})[lv];push(mk(dt,'spinal_load',{id:`spine:${day}`,day,vals:{day:DN[day],sets:f[3],max:mx,over:`${f[3]-mx} set${f[3]-mx===1?'':'s'}`},section:'daily'}))}
    else if(id==='beginner_squat_and_deadlift'){const day=f[2];push(mk(dt,'beginner_squat_and_deadlift',{id:`bsd:${day}`,day,vals:{day:DN[day]},section:'daily'}))}
    else if(id==='sets_per_exercise'){const day=f[2],t=(D.find(x=>x.day===day)||{tiles:[]}).tiles.find(x=>x.id===f[3]);if(!t)continue;
      push(mk(dt,'sets_per_exercise',{id:`spe:${day}:${t.id}`,day,vals:{exercise:XS(t.id),day:DN[day],sets:t.sets,max:SPE},fix:{label:`Cut to 4 sets`,ops:[{op:'sets',day,id:t.id,to:4}]},section:'daily'}))}
    else if(id==='redundant_pattern'){const day=f[2];push(mk(dt,'redundant_pattern',{id:`red:${day}:${f[3]}`,day,muscle:f[5],vals:{pattern:(MPL[f[3]]||String(f[3]).replace(/_/g,' ')).toLowerCase(),day:DN[day],sets:n1(f[6]),cap:RP.threshold},section:'daily'}))}
    else if(id==='session_efficiency'){const day=f[2],m=f[3],lim=((SE.display_limits||{})[lv]||{})[m];if(lim==null||!(r1(f[4])>lim))continue;push(mk(dt,'session_efficiency',{id:`se:${day}:${m}`,day,muscle:m,vals:{sets:n1(f[4]),day:DN[day],limit:lim,excess:ss(half(f[4]-lim))},section:'daily'}))}
    else if(id==='session_efficiency_single_day'){const day=f[2],m=f[3];push(mk(dt,'session_efficiency_single_day',{id:`oneday:${m}`,day,muscle:m,vals:{week_sets:n1(f[5]),day:DN[day]},section:'frequency'}))}
    else if(id==='many_small_entries'){const day=f[2];push(mk(dt,'many_small_entries',{id:`small:${day}`,day,vals:{day:DN[day],n:f[3],avg:n1(f[4])},section:'daily'}))}
    else if(id==='spinal_load_week'){const mx=(SPR.week_warn_above||{})[lv];push(mk(dt,'spinal_load_week',{id:'spinew',vals:{sets:f[2],max:mx,over:`${f[2]-mx} set${f[2]-mx===1?'':'s'}`},section:'recovery'}))}
    else if(id==='consecutive_high_volume'){const m=f[3],d1=f[2];push(mk(dt,'consecutive_high_volume',{id:`chv:${m}:${d1}`,muscle:m,vals:{day1:DN[d1],day2:DN[nextDay(d1)]},section:'frequency'}))}
    else if(id==='hinge_before_squat'){const d1=f[2];push(mk(dt,'hinge_before_squat',{id:`hbs:${d1}`,vals:{day1:DN[d1],day2:DN[nextDay(d1)]},section:'recovery'}))}
    else if(id==='recovery_overlap'){const m=f[2],d1=f[4],d2=f[5];if(f[3]==='streak')push(mk(dt,'recovery_overlap_streak',{id:`ovl:${m}:${d1}`,muscle:m,vals:{n:f[6],day1:DN[d1],day2:DN[d2]},section:'recovery'}));
      else push(mk(dt,'recovery_overlap',{id:`ovl:${m}:${d1}`,muscle:m,vals:{day1:DN[d1],day2:DN[d2],gap_h:Math.round(f[6]),ready_h:Math.round(f[7])},section:'recovery'}))}
    else if(id==='low_frequency'){const m=f[2];push(mk(dt,'low_frequency',{id:`lowf:${m}`,muscle:m,vals:{n_days:`${f[3]} day${f[3]===1?'':'s'}`},section:'frequency'}))}
    else if(id==='recovery_gap_long'){const m=f[2];push(mk(dt,'recovery_gap_long',{id:`gap:${m}`,muscle:m,vals:{gap_days:Math.round(f[5]/24)},section:'frequency'}))}
    else if(id==='missing_stretch'){const m=f[2];if(typeof m!=='string')continue;push(mk(dt,'missing_stretch',{id:`str:${m}`,muscle:m,vals:{examples:(SB[m]||[]).slice(0,2).map(XS).join(' or ')},section:'balance'}))}
    else if(id==='pattern_gap'&&f[0]==='warn'){const sl=f[2];push(mk(dt,'pattern_gap',{id:`pg:${sl}`,vals:{slot_lower:String((SLOT[sl]||{}).name||sl.replace(/_/g,' ')).toLowerCase(),examples:slotRecs(dt,sl,XS,lv)},section:'balance'}))}}
  // ---- week: weekly_status (needs sets / optional low / 2-day by design / far over)
  for(const [m,w] of Object.entries(WS.muscles)){
    if(w.below==='needs_sets'){const short=w.min-w.x,p=addCand(dt,D,lv,m),c=p?(PC.eff(dt,[{id:p.id,sets:1}])[m]||0):0,k=p&&c>0?Math.max(1,Math.min(4,Math.ceil(short/c))):0,inB=p&&D.find(d=>d.day===p.day).tiles.find(t=>t.id===p.id);
      push(mk(dt,'weekly_needs_sets',{id:`under:${m}`,muscle:m,vals:{sets:n1(w.x),min:n1(w.min),gap:ss(half(short)),exercise:p?XS(p.id):'',day:p?DN[p.day]:''},sv:{short},
        fix:p&&k?{label:inB?`+${k} ${XS(p.id)} on ${DN[p.day].slice(0,3)}`:`Add ${XS(p.id)} on ${DN[p.day].slice(0,3)}`,ops:[inB?{op:'sets',day:p.day,id:p.id,to:inB.sets+k}:{op:'add',day:p.day,id:p.id,sets:Math.max(2,k)}]}:null,fixText:'',section:'volume',cand:p}))}
    else if(w.below==='optional_low')push(mk(dt,(WS&&((dt.rules.weekly_status||{}).optional_muscles||{}).flag_copy)||'weekly_optional_low',{id:`opt:${m}`,muscle:m,optional:true,vals:{sets:n1(w.x)},section:'volume'}));
    else if(w.status==='far_over')push(mk(dt,'weekly_far_over',{id:`over:${m}`,muscle:m,vals:{sets:n1(w.x),max:n1(w.dim),extra:ss(half(w.x-w.dim))},section:'volume'}))}
  if(WS.calm){const TD=(dt.rules.weekly_status||{}).two_day_rule||{};push(mk(dt,TD.flag_copy||'weekly_two_day_by_design',{id:TD.flag_id||'weekly_min_two_day',optional:true,vals:{},section:'volume',muscles:WS.byDesign}))}
  // ---- week: push/pull (ANL push_pull_ratio item; pull/push = tile sets by pattern), suggestions with an Apply (stretch, pattern gap)
  const pp=ctx.pushPull;if(pp&&pp.attention){const pu=pp.pull_sets||0,ps=pp.push_sets||0;
    if(!pu&&ps)push(mk(dt,'push_pull_no_pull',{id:'pushpull',section:'balance'}));else if(pu&&!ps)push(mk(dt,'push_pull_no_push',{id:'pushpull',section:'balance'}));
    else{const R=RU(dt,'push_pull_imbalance'),lo=R.min_ratio||0.75,hi=R.max_ratio||2,low=pu<ps*lo,gap=low?Math.ceil(ps*lo-pu-1e-9):Math.ceil(pu/hi-ps-1e-9);push(mk(dt,'push_pull_imbalance',{id:'pushpull',vals:{pull:pu,push:ps,gap,side:low?'rows or pulldowns':'presses'},section:'balance'}))}}
  const exOf=f=>{const m=/^(?:Add|Swap in|Swap to|Swap \S.*? for) (.+?)(?: on | to | \(|$)/.exec(f.preview||'');return m?m[1].replace(/\.$/,''):null};
  for(const s of (ctx.sugs||[])){const t=s.target||{},m=t.muscle,F=(s.fixes||[]),f0=F[0];if(!f0)continue;
    if(s.source==='pattern_gap'&&t.flag){const sl=t.flag[2],ex=slotRecs(dt,sl,XS,lv)||F.slice(0,2).map(exOf).filter(Boolean).join(' or ');const old=out.find(x=>x.id===`pg:${sl}`);const o={id:`pg:${sl}`,vals:{slot_lower:String((SLOT[sl]||{}).name||String(sl).replace(/_/g,' ')).toLowerCase(),examples:ex},fix:{label:'Apply',days:f0.days},fixText:f0.preview+'.',section:'balance'};
      if(old)out.splice(out.indexOf(old),1);push(mk(dt,'pattern_gap',o))}
    else if(s.source==='stretch_share'&&m){const old=out.find(x=>x.id===`str:${m}`);if(old){old.fix={label:'Apply',days:f0.days};old.fixText=f0.preview+'.'}}}
  const seen=new Set();return out.filter(f=>f&&(seen.has(f.id)?false:(seen.add(f.id),true)))}
// ranking (flag_copy.ranking): higher score, then warn before info, then day mon..sun, then muscle A-Z
const ord=(a,b)=>b.score-a.score||(a.severity==='warn'?0:1)-(b.severity==='warn'?0:1)||ORDER.indexOf(a.day||'mon')-ORDER.indexOf(b.day||'mon')||String(a.muscle||'').localeCompare(String(b.muscle||''));
function significant(F,scope,day,max=2){return F.filter(f=>f.plan&&f.scope===scope&&(day==null||f.day===day)).sort(ord).slice(0,max)}
// Make it more efficient (suggestion_buttons.make_more_efficient; Mr Dude: set counts only, never moves/adds/swaps; 1 set per exercise):
// red first, then larger sets_past_peak, then day, then muscle; cut 1 set at a time from the lowest-credit-per-fatigue tile, never letting
// ANY credited muscle drop below its weekly minimum.
function efficientOps(dt,days,lv,A){const PO=POm(),PC=PCm(),W=clone(days.filter(d=>d.tiles&&d.tiles.length)),ops=[],WS=weeklyStatus(dt,A,lv,{trainingDays:W.length}),wk={},MIN={};
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
function pushOps(dt,days,lv,A,maxSets=5){const PC=PCm(),W=clone(days.filter(d=>d.tiles&&d.tiles.length)),ops={},WS=weeklyStatus(dt,A,lv,{trainingDays:W.length}),wk={},top={};
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
const API={build,significant,cutToPeak,efficientOps,pushOps,ord,weeklyStatus,fill,fillStr,addCand,cardLine,stapleFor,slotRecs};
if(isNode)module.exports=API;else root.FLAGS14=API})(typeof window!=='undefined'?window:globalThis);
