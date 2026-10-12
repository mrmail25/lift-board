// Program check: JS port of tools/check_program.py using data/rules.json thresholds.
let RU=null,SESSM={},SLEN={warmup_min:10,work_sec_per_set:45,rest_min:{compound:2.5,isolation:1.5},compound_types:['primary','accessory']};
Promise.all([fetch('data/rules.json').then(r=>r.json()),fetch('data/targets.json').then(r=>r.json())]).then(([r,t])=>{RU=r;SESSM=(t.session||{}).muscles||{};if(t.analytics&&t.analytics.session_length)SLEN=t.analytics.session_length;pcheck()});
const RECOV_INFO_ABOVE=110;// rules.json gives no threshold; note only when clearly above the saved normal week
// Python-style round (ties to even) so messages match tools/check_program.py exactly
const pyR=(x,nd=1)=>{const e=Math.abs(x).toFixed(nd+40),i=e.indexOf('.')+nd+1;if(/^50*$/.test(e.slice(i))){const k=10**nd,f=Math.floor(x*k);return(f%2==0?f:f+1)/k}return +x.toFixed(nd)};
const ORD=['mon','tue','wed','thu','fri','sat','sun'];
function patOf(id){const x=EX[id],b=(x&&x.base)||id;for(const p in RU.patterns)if(RU.patterns[p].includes(b))return p;return null}
const baseId=id=>(EX[id]&&EX[id].base)||id;
function effc(tiles){const v={};for(const m in TG)v[m]=0;tiles.forEach(t=>{const x=EX[t.id];if(!x)return;for(const m in x.muscles){const r=x.muscles[m];if(r>=.25&&m in v)v[m]+=t.sets*r}});return v}
function stretchHits(x,m){if(!x)return false;if(x.custom)return !!x.stretch_biased&&(x.muscles[m]||0)>=.5;return(RU.stretch_biased[m]||[]).includes(x.id)}
function sessionMinutes(tiles){let m=SLEN.warmup_min;tiles.forEach(t=>{const x=EX[t.id];if(!x)return;const rest=SLEN.compound_types.includes(x.type)?SLEN.rest_min.compound:SLEN.rest_min.isolation;m+=t.sets*(SLEN.work_sec_per_set/60+rest)});return m}
// days: [{day:'mon',tiles:[{id,sets}],reason}], same shape as splits.json; returns flags like tools/check_program.py (rules v2)
function checkProgram(days,level){const R=RU,f=[],RL={};R.rules.forEach(r=>RL[r.id]=r);const T=TG;
const week={},freq={};for(const m in T){week[m]=0;freq[m]=0}let push=0,pull=0,spw=0;const byday={};days.forEach(d=>byday[d.day]=d);
const jv=RL.junk_volume_session.threshold,spx=RL.sets_per_exercise.threshold,lfr=RL.low_frequency,ms=RL.many_small_entries,hs=RL.session_hard_sets,sl=RL.session_length,spn=RL.spinal_load,rp=RL.redundant_pattern;
const H=new Set(R.heavy_hinges),Q=new Set(R.heavy_squats),HV=new Set([...H,...Q]);
days.forEach(d=>{const n=d.tiles.length,tot=d.tiles.reduce((a,t)=>a+t.sets,0);
if(n>ms.min_tiles&&tot/n<ms.max_avg_sets)f.push({sev:'info',id:'many_small_entries',day:d.day,n,avg:pyR(tot/n,2)});
const w=hs.warn_above[level];if(tot>w)f.push({sev:'warn',id:'session_hard_sets',day:d.day,sets:tot,max:w});else if(tot>w-hs.info_band)f.push({sev:'info',id:'session_hard_sets',day:d.day,sets:tot,max:w});
const mins=sessionMinutes(d.tiles);if(mins>=sl.warn_min)f.push({sev:'warn',id:'session_length',day:d.day,minutes:pyR(mins,0)});else if(mins>=sl.info_min)f.push({sev:'info',id:'session_length',day:d.day,minutes:pyR(mins,0)});
const sp=d.tiles.reduce((a,t)=>a+(HV.has(baseId(t.id))?t.sets:0),0);spw+=sp;if(sp>spn.session_warn_above[level])f.push({sev:'warn',id:'spinal_load_session',day:d.day,sets:sp,max:spn.session_warn_above[level]});
const pc=new Map();d.tiles.forEach(t=>{if(t.sets>spx)f.push({sev:'warn',id:'sets_per_exercise',day:d.day,exercise:t.id,sets:t.sets});const p=patOf(t.id);pc.set(p,(pc.get(p)||0)+1);
if(p&&R.push_patterns.includes(p))push+=t.sets;if(p&&R.pull_patterns.includes(p))pull+=t.sets});
pc.forEach((c,p)=>{if(c<2)return;const pv=effc(d.tiles.filter(t=>patOf(t.id)==p));const over=Object.keys(pv).find(m=>pv[m]>rp.threshold);if(over)f.push({sev:'warn',id:'redundant_pattern',day:d.day,pattern:p,n:c,muscle:over,sets:pyR(pv[over])})});
const v=effc(d.tiles);for(const m in v){week[m]+=v[m];if(v[m]>=(lfr.min_effective_to_count||2))freq[m]++;if(v[m]>jv)f.push({sev:'warn',id:'junk_volume_session',day:d.day,muscle:m,sets:pyR(v[m])})}
const ids=new Set(d.tiles.map(t=>baseId(t.id)));if(level=='beginner'&&[...ids].some(i=>Q.has(i))&&[...ids].some(i=>H.has(i)))f.push({sev:'warn',id:'beginner_squat_and_deadlift',day:d.day})});
for(let i=0;i<6;i++){const a=byday[ORD[i]],b=byday[ORD[i+1]];if(!a||!b)continue;
if(a.tiles.some(t=>H.has(baseId(t.id)))&&b.tiles.some(t=>Q.has(baseId(t.id))))f.push({sev:'warn',id:'hinge_before_squat',day1:ORD[i],day2:ORD[i+1]});
const va=effc(a.tiles),vb=effc(b.tiles);for(const m in T){const s=SESSM[m];if(s&&va[m]>=s.solid&&vb[m]>=s.solid)f.push({sev:'warn',id:'consecutive_high_volume',day1:ORD[i],day2:ORD[i+1],muscle:m})}}
if(spw>spn.week_warn_above[level])f.push({sev:'warn',id:'spinal_load_week',sets:spw,max:spn.week_warn_above[level]});
if(push){const r=pull/push,pp=RL.push_pull_imbalance;if(r<pp.min_ratio||r>pp.max_ratio)f.push({sev:'warn',id:'push_pull_imbalance',ratio:pyR(r,2)})}
const all=days.flatMap(d=>d.tiles.map(t=>EX[t.id]));
for(const m in R.stretch_biased)if(!all.some(x=>stretchHits(x,m)))f.push({sev:'info',id:'missing_stretch',muscle:m,examples:R.stretch_biased[m].slice(0,2)});
if(days.length>=2)R.frequency_muscles.forEach(m=>{if(freq[m]<2)f.push({sev:'info',id:'low_frequency',muscle:m,n:freq[m]})});
const LF=(typeof LMF!='undefined'&&LMF[level])||1;
for(const m in week){const x=week[m],a=Math.round(T[m].min*LF*2)/2,b=T[m].max;const ok=(a<=x&&x<=b)||(a-2<=x&&x<a)||(b<x&&x<=b*1.25);if(!ok)f.push({sev:'warn',id:'weekly_volume',muscle:m,sets:pyR(x),min:a,max:b})}
f.meta={week,push,pull};return f}
const DN={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
function fmsg(fl){const rid=fl.id.startsWith('spinal_load')?'spinal_load':fl.id,r=RU.rules.find(x=>x.id==rid);const nm=id=>(EX[id]||{name:id}).name;
const V={day:DN[fl.day],day1:DN[fl.day1],day2:DN[fl.day2],n:fl.n,muscle:fl.muscle&&cap(lab(fl.muscle)),sets:fl.sets,exercise:fl.exercise&&nm(fl.exercise),pattern:fl.pattern&&lab(fl.pattern),ratio:fl.ratio,min:fl.id=='session_length'?fl.minutes:fl.min,max:fl.max,pct:fl.pct,examples:fl.examples&&fl.examples.map(nm).join(' or ').toLowerCase()};
let msg=r.message;if(fl.id=='low_frequency'&&fl.n==0&&r.message_indirect_only)msg=r.message_indirect_only;else if(fl.id=='spinal_load_week')msg=r.message_week||msg;else if(fl.sev=='info'&&r.message_info)msg=r.message_info;
return msg.replace(/\{(\w+)\}/g,(_,k)=>V[k]!=null?V[k]:k)}
function boardDays(){return state.days.map((c,i)=>({day:ORD[i],tiles:c.filter(t=>EX[t.id]).map(t=>({id:t.id,sets:t.sets})),reason:(state.reasons||[])[i]||''})).filter(d=>d.tiles.length)}
function pcheck(){const el=document.getElementById('chk');if(!el||!RU||!MUS.length)return;const d=boardDays();
if(!d.length){el.innerHTML='<div class="ck-empty">Add exercises to the board to check the program.</div>';return}
let f=checkProgram(d,sel.level);const M=f.meta,P=x=>lab(x);
const un=Object.keys(M.week).filter(m=>M.week[m]<=0);const isUn=x=>x.muscle&&un.includes(x.muscle)&&['weekly_volume','missing_stretch','low_frequency'].includes(x.id);
f=f.filter(x=>!isUn(x)&&x.id!='push_pull_imbalance');const extra=[];
if(M.push>=1&&M.pull>=1){const r=M.pull/M.push,pp=RU.rules.find(x=>x.id=='push_pull_imbalance')||{};if(r<(pp.min_ratio||.75)||r>(pp.max_ratio||2))f.push({sev:'warn',id:'push_pull_imbalance',ratio:pyR(r,2)})}
else if(M.push>0&&!M.pull)extra.push({sev:'warn',txt:'No pulling yet this week. Add rows or pulldowns to balance your pressing.'});
else if(M.pull>0&&!M.push)extra.push({sev:'warn',txt:'No pushing yet this week. Add presses to balance your pulling.'});
const SS={'bro-split':0,'ppl':3,'pplu':0,'arnold':3},ss=state.sel||{};
if(state.applied&&state.applied==snap()&&ss.split in SS&&(!SS[ss.split]||ss.days==SS[ss.split])){const lf=f.filter(x=>x.id=='low_frequency');if(lf.length){f=f.filter(x=>x.id!='low_frequency');
const sp=SP.splits.find(x=>x.id==ss.split);extra.push({sev:'info',txt:`Trained once a week (expected for ${sp?sp.name:ss.split}): ${lf.map(x=>P(x.muscle)).join(', ')}.`})}}
if(typeof baseline=='function'&&typeof dayCost=='function'){const B=baseline();if(B&&B.cost){const wk=DAYS.reduce((a,_,i)=>a+dayCost(i),0)*modF(),pct=Math.round(wk/B.cost*100);if(pct>RECOV_INFO_ABOVE)f.push({sev:'info',id:'recovery_vs_baseline',pct})}}
if(un.length)extra.push({sev:'info',txt:'Not trained yet: '+un.map(P).join(', ')+'.'});
const all=[...f.map(x=>({sev:x.sev,txt:fmsg(x)})),...extra].sort((a,b)=>(a.sev=='warn'?0:1)-(b.sev=='warn'?0:1)),w=all.filter(x=>x.sev=='warn');
el.innerHTML=(w.length?'':`<div class="ck-ok">✓ All clear: no programming errors found for this ${sel.level} program.</div>`)+all.map(x=>`<div class="ck ${x.sev}"><b>${x.sev=='warn'?'⚠':'ℹ'}</b> ${x.txt}</div>`).join('')+(all.length>w.length&&!w.length?'<div class="ck-sub">Notes above are suggestions, not errors.</div>':'')}
