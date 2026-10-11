// Program check: JS port of tools/check_program.py using data/rules.json thresholds.
let RU=null,SESSM={};
Promise.all([fetch('data/rules.json').then(r=>r.json()),fetch('data/targets.json').then(r=>r.json())]).then(([r,t])=>{RU=r;SESSM=(t.session||{}).muscles||{};pcheck()});
const ORD=['mon','tue','wed','thu','fri','sat','sun'];
function patOf(id){const x=EX[id],b=(x&&x.base)||id;for(const p in RU.patterns)if(RU.patterns[p].includes(b))return p;return null}
const baseId=id=>(EX[id]&&EX[id].base)||id;
function effc(tiles){const v={};for(const m in TG)v[m]=0;tiles.forEach(t=>{const x=EX[t.id];if(!x)return;for(const m in x.muscles){const r=x.muscles[m];if(r>=.25&&m in v)v[m]+=t.sets*r}});return v}
function stretchHits(x,m){if(!x)return false;if(x.custom)return !!x.stretch_biased&&(x.muscles[m]||0)>=.5;return(RU.stretch_biased[m]||[]).includes(x.id)}
// days: [{day:'mon',tiles:[{id,sets}],reason}], same shape as splits.json; returns flags like the Python checker
function checkProgram(days,level){const R=RU,f=[],rule=id=>R.rules.find(r=>r.id==id)||{};const T=TG;
const week={},freq={};for(const m in T){week[m]=0;freq[m]=0}let push=0,pull=0;const byday={};days.forEach(d=>byday[d.day]=d);
const tmx=rule('too_many_exercises'),jv=rule('junk_volume_session').threshold||10,spx=rule('sets_per_exercise').threshold||5,rp=rule('redundant_pattern').threshold||2,lfr=rule('low_frequency');
const H=new Set(R.heavy_hinges),Q=new Set(R.heavy_squats);
days.forEach(d=>{const n=d.tiles.length;if(n>(tmx.threshold||7)&&!(n<=(tmx.hard_max||8)&&d.reason))f.push({sev:'warn',id:'too_many_exercises',day:d.day,n});
const pc={};d.tiles.forEach(t=>{if(t.sets>spx)f.push({sev:'warn',id:'sets_per_exercise',day:d.day,exercise:t.id,sets:t.sets});const p=patOf(t.id);if(p){pc[p]=(pc[p]||0)+1;
if(R.push_patterns.includes(p))push+=t.sets;if(R.pull_patterns.includes(p))pull+=t.sets}});
for(const p in pc)if(pc[p]>rp)f.push({sev:'warn',id:'redundant_pattern',day:d.day,pattern:p,n:pc[p]});
const v=effc(d.tiles);for(const m in v){week[m]+=v[m];if(v[m]>=(lfr.min_effective_to_count||2))freq[m]++;if(v[m]>jv)f.push({sev:'warn',id:'junk_volume_session',day:d.day,muscle:m,sets:Math.round(v[m]*10)/10})}
const ids=new Set(d.tiles.map(t=>baseId(t.id)));if(level=='beginner'&&[...ids].some(i=>Q.has(i))&&[...ids].some(i=>H.has(i)))f.push({sev:'warn',id:'beginner_squat_and_deadlift',day:d.day})});
for(let i=0;i<6;i++){const a=byday[ORD[i]],b=byday[ORD[i+1]];if(!a||!b)continue;
if(a.tiles.some(t=>H.has(baseId(t.id)))&&b.tiles.some(t=>Q.has(baseId(t.id))))f.push({sev:'warn',id:'hinge_before_squat',day1:ORD[i],day2:ORD[i+1]});
const va=effc(a.tiles),vb=effc(b.tiles);for(const m in T){const s=SESSM[m];if(s&&va[m]>=s.solid&&vb[m]>=s.solid)f.push({sev:'warn',id:'consecutive_high_volume',day1:ORD[i],day2:ORD[i+1],muscle:m})}}
if(push){const r=pull/push,pp=rule('push_pull_imbalance');if(r<(pp.min_ratio||.75)||r>(pp.max_ratio||2))f.push({sev:'warn',id:'push_pull_imbalance',ratio:Math.round(r*100)/100})}
const all=days.flatMap(d=>d.tiles.map(t=>EX[t.id]));
for(const m in R.stretch_biased)if(!all.some(x=>stretchHits(x,m)))f.push({sev:'info',id:'missing_stretch',muscle:m,examples:R.stretch_biased[m].slice(0,2)});
if(days.length>=2)R.frequency_muscles.forEach(m=>{if(freq[m]<2)f.push({sev:'info',id:'low_frequency',muscle:m,n:freq[m]})});
const LF=(typeof LMF!='undefined'&&LMF[level])||1;
for(const m in week){const x=week[m],a=Math.round(T[m].min*LF*2)/2,b=T[m].max;const ok=(a<=x&&x<=b)||(a-2<=x&&x<a)||(b<x&&x<=b*1.25);if(!ok)f.push({sev:'warn',id:'weekly_volume',muscle:m,sets:Math.round(x*10)/10,min:a,max:b})}
f.meta={week,push,pull};return f}
const DN={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
function fmsg(fl){const r=RU.rules.find(x=>x.id==fl.id);const nm=id=>(EX[id]||{name:id}).name;
const V={day:DN[fl.day],day1:DN[fl.day1],day2:DN[fl.day2],n:fl.n,muscle:fl.muscle&&cap(lab(fl.muscle)),sets:fl.sets,exercise:fl.exercise&&nm(fl.exercise),pattern:fl.pattern&&lab(fl.pattern),ratio:fl.ratio,min:fl.min,max:fl.max,examples:fl.examples&&fl.examples.map(nm).join(' or ').toLowerCase()};
return ((fl.id=='low_frequency'&&fl.n==0&&r.message_indirect_only)?r.message_indirect_only:r.message).replace(/\{(\w+)\}/g,(_,k)=>V[k]!=null?V[k]:k)}
function boardDays(){return state.days.map((c,i)=>({day:ORD[i],tiles:c.filter(t=>EX[t.id]).map(t=>({id:t.id,sets:t.sets})),reason:(state.reasons||[])[i]||''})).filter(d=>d.tiles.length)}
function pcheck(){const el=document.getElementById('chk');if(!el||!RU||!MUS.length)return;const d=boardDays();
if(!d.length){el.innerHTML='<div class="ck-empty">Add exercises to the board to check the program.</div>';return}
let f=checkProgram(d,sel.level);const M=f.meta,P=x=>lab(x);
const un=Object.keys(M.week).filter(m=>M.week[m]<=0);const isUn=x=>x.muscle&&un.includes(x.muscle)&&['weekly_volume','missing_stretch','low_frequency'].includes(x.id);
f=f.filter(x=>!isUn(x)&&x.id!='push_pull_imbalance');const extra=[];
if(M.push>=1&&M.pull>=1){const r=M.pull/M.push,pp=RU.rules.find(x=>x.id=='push_pull_imbalance')||{};if(r<(pp.min_ratio||.75)||r>(pp.max_ratio||2))f.push({sev:'warn',id:'push_pull_imbalance',ratio:Math.round(r*100)/100})}
else if(M.push>0&&!M.pull)extra.push({sev:'warn',txt:'No pulling yet this week. Add rows or pulldowns to balance your pressing.'});
else if(M.pull>0&&!M.push)extra.push({sev:'warn',txt:'No pushing yet this week. Add presses to balance your pulling.'});
const SS={'bro-split':0,'ppl':3,'pplu':0,'arnold':3},ss=state.sel||{};
if(state.applied&&state.applied==snap()&&ss.split in SS&&(!SS[ss.split]||ss.days==SS[ss.split])){const lf=f.filter(x=>x.id=='low_frequency');if(lf.length){f=f.filter(x=>x.id!='low_frequency');
const sp=SP.splits.find(x=>x.id==ss.split);extra.push({sev:'info',txt:`Trained once a week (expected for ${sp?sp.name:ss.split}): ${lf.map(x=>P(x.muscle)).join(', ')}.`})}}
if(un.length)extra.push({sev:'info',txt:'Not trained yet: '+un.map(P).join(', ')+'.'});
const all=[...f.map(x=>({sev:x.sev,txt:fmsg(x)})),...extra].sort((a,b)=>(a.sev=='warn'?0:1)-(b.sev=='warn'?0:1)),w=all.filter(x=>x.sev=='warn');
el.innerHTML=(w.length?'':`<div class="ck-ok">✓ All clear: no programming errors found for this ${sel.level} program.</div>`)+all.map(x=>`<div class="ck ${x.sev}"><b>${x.sev=='warn'?'⚠':'ℹ'}</b> ${x.txt}</div>`).join('')+(all.length>w.length&&!w.length?'<div class="ck-sub">Notes above are suggestions, not errors.</div>':'')}
