// v18: validated one-tap fixes + swap suggestions. Exact port of tools/check_program.py (fixes) and tools/swap.py.
let SWJ=null;fetch('data/swap.json').then(r=>r.json()).then(j=>{SWJ=j;FAMOF=null}).catch(()=>{});
let FAMOF=null;const famMap=()=>{if(!FAMOF){FAMOF={};const F=(SWJ&&SWJ.families)||{machine:['machine','plate-loaded machine','smith machine'],free:['barbell','dumbbell','kettlebell','trap bar','landmine'],bodyweight:['bodyweight','rings','suspension'],cable:['cable']};for(const k in F)F[k].forEach(e=>FAMOF[e]=k)}return FAMOF};
const famOf=e=>famMap()[e.equipment]||'other';
const LIB=()=>Object.keys(EX).filter(i=>!EX[i].custom);const POOL=()=>[...LIB(),...Object.keys(EX).filter(i=>EX[i].custom)];
const PATm=id=>{const p=patOf(id);return p==null?null:p};
const PATs=id=>{const e=EX[id];if(e&&e.custom)return e.pattern||null;return PATm(id)};
const fatOf=e=>e.fatigue!=null?e.fatigue:(e.base&&EX[e.base]&&EX[e.base].fatigue)||1;
const vecOf=e=>MUS.map(m=>e.muscles[m]||0);
function cosv(a,b){const na=Math.sqrt(a.reduce((s,x)=>s+x*x,0)),nb=Math.sqrt(b.reduce((s,x)=>s+x*x,0));return(!na||!nb)?0:a.reduce((s,x,i)=>s+x*b[i],0)/(na*nb)}
function primaryMuscle(e){let b=MUS[0];MUS.forEach(m=>{if((e.muscles[m]||0)>(e.muscles[b]||0))b=m});return b}
function swScore(cur,cand){const c=EX[cur],k=EX[cand],sp=PATs(cur)!=null&&PATs(cur)===PATs(cand),cs=cosv(vecOf(c),vecOf(k));let big=MUS.filter(m=>(c.muscles[m]||0)>=.5);if(!big.length)big=[primaryMuscle(c)];
const mad=big.reduce((s,m)=>s+Math.abs((c.muscles[m]||0)-(k.muscles[m]||0)),0)/big.length;
const s=40*sp+25*cs+15*(1-mad)+10*(c.type==k.type)+5*(c.equipment==k.equipment)+5*(famOf(c)==famOf(k));return[pyR(s,2),sp,cs]}
function swTags(cur,cand){const c=EX[cur],k=EX[cand],pm=primaryMuscle(c),t=[],ST=RU.stretch_biased[pm]||[];
if(ST.includes(cand)&&!ST.includes(cur))t.push('more stretch');if(fatOf(k)<=fatOf(c)-.2)t.push('less fatigue');else if(fatOf(k)>=fatOf(c)+.2)t.push('more fatigue');
if(k.type=='primary'&&c.type!='primary')t.push('easier to load');
if(famOf(k)!=famOf(c)){const f=famOf(k);if(f=='machine')t.push('machine');else if(f=='free')t.push('free weight');else if(f=='bodyweight')t.push('bodyweight')}else if(k.equipment==c.equipment)t.push('same equipment');
const diffs=MUS.map(m=>[(k.muscles[m]||0)-(c.muscles[m]||0),m]).filter(([d,m])=>Math.abs(d)>=.25&&((c.muscles[m]||0)>=.5||(k.muscles[m]||0)>=.75));diffs.sort((a,b)=>Math.abs(b[0])-Math.abs(a[0]));
diffs.forEach(([d,m])=>t.push((d>0?'more ':'less ')+m.replace(/_/g,' ')));return t.slice(0,2)}
function swaps(cur,families,n=6,lib){const out=[];(lib?LIB():POOL()).forEach(cand=>{if(cand==cur)return;if(families&&families.length&&!families.includes(famOf(EX[cand])))return;const[s,sp,cs]=swScore(cur,cand);if(cs<.6&&!sp)return;out.push([s,cand])});
out.sort((a,b)=>b[0]-a[0]||(a[1]<b[1]?-1:a[1]>b[1]?1:0));return out.slice(0,n).map(([s,c])=>{const r={id:c,name:EX[c].name,score:s,tags:swTags(cur,c)};if(EX[c].custom)r.badge='est.';return r})}
// ---------- fixes ----------
const cmpT=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){let x=a[i],y=b[i];if(typeof x=='boolean')x=+x;if(typeof y=='boolean')y=+y;if(x<y)return -1;if(x>y)return 1}return 0};
const sortBy=(arr,key)=>arr.map((v,i)=>[key(v),i,v]).sort((a,b)=>cmpT(a[0],b[0])||a[1]-b[1]).map(x=>x[2]);
const TUP={many_small_entries:x=>[x.day,x.n,x.avg],session_hard_sets:x=>[x.day,x.sets],session_length:x=>[x.day,x.minutes],spinal_load_session:x=>[x.day,x.sets],sets_per_exercise:x=>[x.day,x.exercise],redundant_pattern:x=>[x.day,x.pattern,x.n,x.muscle,x.sets],junk_volume_session:x=>[x.day,x.muscle,x.sets],beginner_squat_and_deadlift:x=>[x.day],hinge_before_squat:x=>[x.day1],consecutive_high_volume:x=>[x.day1,x.muscle],spinal_load_week:x=>[x.sets],push_pull_imbalance:x=>[x.ratio],missing_stretch:x=>[x.muscle],low_frequency:x=>[x.muscle,x.n],weekly_volume:x=>[x.muscle,x.sets],pattern_gap:x=>[x.slot,x.n,x.min]};
const tupOf=x=>[x.sev,x.id,...(TUP[x.id]?TUP[x.id](x):[])];
const fkey=t=>[t[1],...t.slice(2).filter(v=>typeof v=='string')].join('\u0001');
const nonin=fl=>new Set(fl.filter(x=>x[0]!='info').map(fkey));
const chk=(days,level)=>checkProgram(days,level).map(tupOf);
const dcopy=d=>JSON.parse(JSON.stringify(d));const dayOf=(days,n)=>days.find(d=>d.day==n);
const nmE=i=>EX[i].name;const mus=(i,m)=>(EX[i].muscles[m]||0);
const fmtP=(tpl,p)=>tpl.replace(/\{(\w+)\}/g,(_,k)=>p[k]==null?'None':String(p[k]));
function prev(a,p){const FA=RU.fix_actions,DN=RU.day_names||{};p={...p};if('slot' in p)p.slot_lower=PJ.slots[p.slot].name.toLowerCase();['day','to_day','from_day'].forEach(k=>{if(k in p)p[k+'_name']=DN[p[k]]||p[k]});if(a=='reduce_sets'&&p.from==='')return fmtP(FA[a].preview_multi,p);return fmtP(FA[a].preview,p)}
const FXORD={primary:0,accessory:1,isolation:2};
const ordIdx=d=>sortBy(d.tiles.map((_,i)=>i),i=>[FXORD[EX[d.tiles[i].id].type],i]);
const loadOf=(d,m)=>effc(d.tiles)[m]||0;
const HEAVYS=()=>new Set([...RU.heavy_squats,...RU.heavy_hinges]);
function daysByLoad(days,m,exclude){const names=days.filter(d=>d.day!=exclude).map(d=>d.day);
const adj=n=>{const i=ORD.indexOf(n);return[i-1,i+1].filter(j=>j>=0&&j<7).map(j=>ORD[j]).reduce((s,x)=>s+days.filter(d=>d.day==x&&loadOf(d,m)>=SESSM[m].solid).length,0)};
return sortBy(names,n=>[adj(n),loadOf(dayOf(days,n),m),dayOf(days,n).tiles.reduce((s,t)=>s+t.sets,0)])}
function*gReduce(days,day,target,muscle=null,need=null,minSets=2){const ds=day?[dayOf(days,day)]:days;const c=[];
ds.forEach(d=>d.tiles.forEach((t,i)=>{if(t.sets<=minSets)return;let key;if(target=='highest_contributor'){const r=muscle?mus(t.id,muscle):0;key=-(r>=.25?t.sets*r:0)}else{if(EX[t.id].type!='isolation')return;key=-i}
if(key==0&&target=='highest_contributor')return;c.push([key,d.day,i])}));
for(const [,dn,i] of c.sort(cmpT)){const t=dayOf(days,dn).tiles[i];for(let by=1;by<=t.sets-minSets;by++){const n=dcopy(days);dayOf(n,dn).tiles[i].sets-=by;
yield['reduce_sets',{target,muscle,by,min_sets:minSets,name:nmE(t.id),day:dn,from:t.sets,to:t.sets-by},n]}}}
function*gTrim(days,day,need){const n=dcopy(days),d=dayOf(n,day);let left=need;const parts=[];
for(let i=d.tiles.length-1;i>=0;i--){const t=d.tiles[i];if(EX[t.id].type!='isolation'||t.sets<=2)continue;const k=Math.min(left,t.sets-2);parts.push(`${nmE(t.id)} ${t.sets}→${t.sets-k}`);t.sets-=k;left-=k;if(left<=0)break}
if(parts.length)yield['reduce_sets',{target:'lowest_priority_isolation',by:need-Math.max(left,0),min_sets:2,name:parts.join(', '),day,from:'',to:''},n]}
function*gRemove(days,day){const d=dayOf(days,day);for(const i of sortBy(d.tiles.map((_,i)=>i),i=>[EX[d.tiles[i].id].type!='isolation',d.tiles[i].sets,-i])){const n=dcopy(days);const t=dayOf(n,day).tiles.splice(i,1)[0];
yield['remove_tile',{target:t.id,name:nmE(t.id),day},n]}}
function*gMoveTile(days,day,ids=null){const d=dayOf(days,day);const order=ordIdx(d).reverse().filter(i=>ids==null||ids.includes(d.tiles[i].id));
for(const i of order){const t=d.tiles[i];for(const to of daysByLoad(days,primaryMuscle(EX[t.id]),day)){if(dayOf(days,to).tiles.some(x=>x.id==t.id))continue;
const n=dcopy(days);const tt=dayOf(n,day).tiles.splice(i,1)[0];dayOf(n,to).tiles.push(tt);yield['move_tile',{target:t.id,to_day:to,name:nmE(t.id),day},n]}}}
function*gMoveSets(days,day,muscle=null,ids=null,need=1){const d=dayOf(days,day);
for(const i of sortBy(d.tiles.map((_,i)=>i),i=>[muscle?-(d.tiles[i].sets*mus(d.tiles[i].id,muscle)):0])){const t=d.tiles[i];if(ids&&ids.length&&!ids.includes(t.id))continue;if(muscle&&mus(t.id,muscle)<.25)continue;
for(let k=Math.max(1,need);k<t.sets-1;k++){for(const to of daysByLoad(days,primaryMuscle(EX[t.id]),day)){const n=dcopy(days),nd=dayOf(n,day).tiles;nd[i].sets-=k;if(nd[i].sets<2)continue;
const tl=dayOf(n,to).tiles,ex=tl.filter(x=>x.id==t.id);if(ex.length){if(ex[0].sets+k>5)continue;ex[0].sets+=k}else{if(k<2)continue;tl.push({id:t.id,sets:k})}
yield['move_sets_to_day',{target:t.id,sets:k,to_day:to,name:nmE(t.id),day},n]}}}}
function*gSwap(days,day,criteria,ids=null,muscle=null){const ds=day?[dayOf(days,day)]:days;const H=HEAVYS();
for(const d of ds){for(let i=0;i<d.tiles.length;i++){const t=d.tiles[i];if(ids!=null&&!ids.has(t.id))continue;if(muscle&&mus(t.id,muscle)<.5)continue;
for(const c of swaps(t.id,null,LIB().length,1)){const k=EX[c.id];if(criteria=='stretch_biased'&&!(RU.stretch_biased[muscle||primaryMuscle(EX[t.id])]||[]).includes(c.id))continue;
if(criteria=='lower_fatigue'&&fatOf(k)>=fatOf(EX[t.id]))continue;if(criteria=='lower_spinal'&&(H.has(c.id)||(k.muscles.lower_back||0)>=(EX[t.id].muscles.lower_back||0)))continue;
if(criteria=='same_pattern'&&PATm(c.id)!==PATm(t.id))continue;if(d.tiles.some(x=>x.id==c.id))continue;const n=dcopy(days);dayOf(n,d.day).tiles[i].id=c.id;
yield['swap_exercise',{target:t.id,criteria,name:nmE(t.id),new_name:c.name,day:d.day},n]}}}}
let USEC=null;const useC=()=>{if(!USEC){USEC={};SP.splits.forEach(s=>Object.values(s.levels).forEach(dc=>Object.values(dc).forEach(dd=>dd.forEach(x=>x.tiles.forEach(t=>USEC[t.id]=(USEC[t.id]||0)+1)))))}return USEC};
const RARE=new Set(['rings','suspension','medicine ball','stability ball']);
function bestFor(days,muscle,stretch=false,patterns=null){const used=new Set(days.flatMap(d=>d.tiles.map(t=>EX[t.id].equipment)));let ref=[0,null];
days.forEach(d=>d.tiles.forEach(t=>{const v=[t.sets*(EX[t.id].muscles[muscle]||0),t.id];if(cmpT(v,ref)>0)ref=v}));
const ok=i=>{const e=EX[i];return(e.muscles[muscle]||0)>=.75&&['isolation','accessory'].includes(e.type)&&PATm(i)!='plyometric'&&(!RARE.has(e.equipment)||used.has(e.equipment))&&(!stretch||(RU.stretch_biased[muscle]||[]).includes(i))&&(!patterns||patterns.includes(PATm(i)))};
let c=(RU.staples||[]).filter(i=>EX[i]&&!EX[i].custom&&ok(i));if(!c.length)c=LIB().filter(ok);
const sc=i=>ref[0]>0?swScore(ref[1],i)[0]+20*EX[i].muscles[muscle]:100*EX[i].muscles[muscle]-10*fatOf(EX[i]);const U=useC();
const po=i=>patterns?patterns.indexOf(PATm(i)):0;return sortBy(c,i=>[po(i),-pyR(sc(i),1),-(U[i]||0),i])}
function*gAddEx(days,muscle,stretch=false,exclude=null,patterns=null){for(const c of bestFor(days,muscle,stretch,patterns).slice(0,6)){
for(const to of sortBy(days.filter(d=>d.day!=exclude).map(d=>d.day),n=>[dayOf(days,n).tiles.reduce((s,t)=>s+t.sets,0)])){if(dayOf(days,to).tiles.some(x=>x.id==c))continue;
const n=dcopy(days);dayOf(n,to).tiles.push({id:c,sets:2});yield['add_exercise',{muscle,sets:2,to_day:to,name:nmE(c)},n]}}}
function*gAddSets(days,muscle,day=null,pats=null){const c=[];days.forEach(d=>{if(day&&d.day!=day)return;d.tiles.forEach((t,i)=>{const r=mus(t.id,muscle);if(r>=.5&&(!pats||pats.includes(PATm(t.id))))c.push([r,d.day,i])})});c.sort((a,b)=>-cmpT(a,b));
for(const [,dn,i] of c){const t=dayOf(days,dn).tiles[i];for(let by=1;by<6-t.sets;by++){const n=dcopy(days);dayOf(n,dn).tiles[i].sets+=by;yield['add_sets',{muscle,by,max_sets:5,name:nmE(t.id),day:dn,from:t.sets,to:t.sets+by},n]}}}
function*gSplit(days,day,pattern=null,tile=null){const d=dayOf(days,day);const ts=[];d.tiles.forEach((t,i)=>{if((tile&&t.id==tile)||(pattern&&PATm(t.id)==pattern))ts.push([t.sets,i])});ts.sort((a,b)=>-cmpT(a,b));
for(const [,i] of ts){const t=d.tiles[i],mv=Math.floor(t.sets/2);if(mv<2)continue;for(const c of swaps(t.id,null,LIB().length,1)){if(PATm(c.id)!==PATm(t.id)||d.tiles.some(x=>x.id==c.id))continue;
const n=dcopy(days),tl=dayOf(n,day).tiles;tl[i].sets-=mv;tl.splice(i+1,0,{id:c.id,sets:mv});yield['split_pattern',{target:t.id,move_sets:mv,name:nmE(t.id),new_name:c.name,day,from:t.sets,keep:t.sets-mv,moved:mv},n]}}}
function*gMerge(days,day){const d=dayOf(days,day);for(const i of sortBy(d.tiles.map((_,i)=>i),i=>[d.tiles[i].sets])){const t=d.tiles[i];for(let j=0;j<d.tiles.length;j++){const u=d.tiles[j];if(j==i||PATm(u.id)!==PATm(t.id)||u.sets+t.sets>5)continue;
const n=dcopy(days),tl=dayOf(n,day).tiles;tl[j].sets+=t.sets;tl.splice(i,1);yield['merge_tiles',{target:t.id,into:u.id,name:nmE(t.id),into_name:nmE(u.id),day,into_from:u.sets,into_to:u.sets+t.sets},n]}}}
function gens(days,f,level){const rid=f[1],RL={};RU.rules.forEach(r=>RL[r.id]=r);const H=HEAVYS();
if(rid=='junk_volume_session'){const[d,m]=[f[2],f[3]];return[gReduce(days,d,'highest_contributor',m),gMoveSets(days,d,m),gMoveTile(days,d,dayOf(days,d).tiles.filter(t=>mus(t.id,m)>=.25).map(t=>t.id))]}
if(rid=='session_hard_sets'||rid=='session_length'){const d=f[2],tot=dayOf(days,d).tiles.reduce((s,t)=>s+t.sets,0),hs=RL.session_hard_sets,sl=RL.session_length,mins=sessionMinutes(dayOf(days,d).tiles);
let need=rid=='session_hard_sets'?tot-hs.warn_above[level]:Math.ceil((mins-sl.warn_min+.01)/2.25);if(f[0]=='info')need=rid=='session_hard_sets'?tot-hs.warn_above[level]+hs.info_band:Math.ceil((mins-sl.info_min+.01)/2.25);
return[gTrim(days,d,Math.max(1,need)),gReduce(days,d,'lowest_priority_isolation'),gMoveTile(days,d),gRemove(days,d)]}
if(rid=='spinal_load_session'){const d=f[2];return[gSwap(days,d,'lower_spinal',H),gMoveTile(days,d,[...H]),gReduce(days,d,'highest_contributor','lower_back')]}
if(rid=='spinal_load_week')return[gSwap(days,null,'lower_spinal',H),gReduce(days,null,'highest_contributor','lower_back')];
if(rid=='sets_per_exercise'){const[d,i]=[f[2],f[3]];return[gSplit(days,d,null,i),gMoveSets(days,d,null,[i]),gReduce(days,d,'highest_contributor',primaryMuscle(EX[i]),null,5)]}
if(rid=='redundant_pattern'){const[d,p,m]=[f[2],f[3],f[5]];return[gReduce(days,d,'highest_contributor',m),gMoveSets(days,d,m,RU.patterns[p]),gMoveTile(days,d,RU.patterns[p])]}
if(rid=='weekly_volume'){const[m,x]=[f[2],f[3]];if(x>TG[m].max)return[gReduce(days,null,'highest_contributor',m)];return[gAddSets(days,m),gAddEx(days,m)]}
if(rid=='push_pull_imbalance'){const lag=f[2]<1?'pull':'push',ms=lag=='pull'?['upper_back','lats']:['chest','front_delts'],lead=lag=='pull'?['chest']:['lats'];
const sumP=L=>days.reduce((s,d)=>s+d.tiles.filter(t=>L.includes(PATm(t.id))).reduce((a,t)=>a+t.sets,0),0),pulls=sumP(RU.pull_patterns),pushs=sumP(RU.push_patterns);
if(pulls==0){const pp=['horizontal_row','vertical_pull'];return[gAddEx(days,'upper_back',false,null,pp),gAddEx(days,'lats',false,null,pp),gAddSets(days,'upper_back',null,RU.pull_patterns)]}
if(pushs==0){const pp=['horizontal_press','incline_press','vertical_press'];return[gAddEx(days,'chest',false,null,pp),gAddEx(days,'front_delts',false,null,pp),gAddSets(days,'chest',null,RU.push_patterns)]}
return[gAddSets(days,ms[0]),gAddEx(days,ms[0]),gAddEx(days,ms[1]),gReduce(days,null,'highest_contributor',lead[0])]}
if(rid=='missing_stretch'){const m=f[2];return[gSwap(days,null,'stretch_biased',null,m),gAddEx(days,m,true)]}
if(rid=='low_frequency'){const m=f[2];let hv=days[0];days.forEach(d=>{if(loadOf(d,m)>loadOf(hv,m))hv=d});return[gMoveSets(days,hv.day,m),gAddEx(days,m,false,hv.day)]}
if(rid=='hinge_before_squat'){const d=f[2],nx=ORD[ORD.indexOf(d)+1];return[gMoveTile(days,d,RU.heavy_hinges),gMoveTile(days,nx,RU.heavy_squats),gSwap(days,nx,'lower_spinal',new Set(RU.heavy_squats))]}
if(rid=='beginner_squat_and_deadlift'){const d=f[2];return[gMoveTile(days,d,RU.heavy_hinges),gMoveTile(days,d,RU.heavy_squats),gSwap(days,d,'lower_spinal',H)]}
if(rid=='consecutive_high_volume'){const[d,m]=[f[2],f[3]],nx=ORD[ORD.indexOf(d)+1];return[gMoveSets(days,nx,m),gMoveSets(days,d,m),gReduce(days,nx,'highest_contributor',m)]}
if(rid=='many_small_entries'){const d=f[2];return[gMerge(days,d),gRemove(days,d)]}
if(rid=='pattern_gap')return[gFillSlot(days,f[2],level)];return[]}
function fdist(f,level){if(f[1]=='weekly_volume'){const[m,x]=[f[2],f[3]],a=Math.round(TG[m].min*LMF[level]*2)/2;return x<a?a-x:x-TG[m].max}
if(f[1]=='push_pull_imbalance')return f[2]<.75?.75-f[2]:f[2]-2;if(f[1]=='low_frequency')return 2-f[3];if(f[1]=='pattern_gap')return f[4]-f[3];const nums=f.slice(2).filter(x=>typeof x=='number');return nums.length?nums[nums.length-1]:0}
function evalFix(oldNI,nw,level,f){const nf=chk(nw,level),nn=nonin(nf);for(const k of nn)if(!oldNI.has(k))return null;const k=fkey(f);const same=nf.filter(x=>fkey(x)==k&&(f[0]=='info'||x[0]!='info'));
if(!same.length)return'resolves';return fdist(same[0],level)<fdist(f,level)-1e-9?'improves':null}
function fixesFor(days,level,f,maxn=3,budget=400){const out=[],oldNI=nonin(chk(days,level));
for(const g of gens(days,f,level)){let best=null,tried=0;for(const [a,p,n] of g){if(tried++>=budget)break;const r=evalFix(oldNI,n,level,f);if(r=='resolves'){best=[r,a,p,n];break}if(r=='improves'&&!best)best=[r,a,p,n]}
if(best&&out.some(o=>o.preview==prev(best[1],best[2])))best=null;
if(best){const[r,a,p,n]=best,pp={};for(const k in p)if(!['name','new_name','into_name'].includes(k))pp[k]=p[k];out.push({action:a,params:pp,preview:prev(a,p),resolves:r=='resolves',days:n})}if(out.length>=maxn)break}
return out.map((x,i)=>[x,i]).sort((a,b)=>(!a[0].resolves)-(!b[0].resolves)||a[1]-b[1]).map(x=>x[0])}
// ---------- UI glue ----------
function applyFix(fx){const prior=JSON.stringify(state);const nd=DAYS.map(()=>[]);fx.days.forEach(d=>{nd[ORD.indexOf(d.day)]=d.tiles.map(t=>({id:t.id,sets:t.sets}))});
state.days=state.days.map((c,i)=>fx.days.some(d=>d.day==ORD[i])?nd[i]:c);upd();toast('Applied: '+fx.preview,()=>{state=JSON.parse(prior);upd()})}
function toast(msg,undo){let t=document.getElementById('toast');if(t)t.remove();t=document.createElement('div');t.id='toast';t.innerHTML=`<span>${msg.replace(/</g,'&lt;')}</span><button id="t-undo">Undo</button><button id="t-x" aria-label="Close">✕</button>`;document.body.appendChild(t);
const kill=()=>{t.remove()};t.querySelector('#t-undo').onclick=()=>{undo();kill()};t.querySelector('#t-x').onclick=kill;clearTimeout(window._toastT);window._toastT=setTimeout(kill,10000)}
function swapBubble(dayIdx,item,anchor){closeSwap();const cur=item.id;if(!EX[cur])return;let fams=[];const b=document.createElement('div');b.id='swpop';document.body.appendChild(b);
const FAMS=['machine','free','bodyweight','cable','other'],LBL={machine:'Machine',free:'Free weight',bodyweight:'Bodyweight',cable:'Cable',other:'Other'};
const draw=()=>{const list=swaps(cur,fams.length&&fams.length<FAMS.length?fams:null,6);b.innerHTML=`<button class="mp-x" aria-label="Close">✕</button><b>Swap ${EX[cur].name.replace(/</g,'&lt;')}</b><div class="sw-fam">${FAMS.map(f=>`<button class="chip ${fams.includes(f)?'on':''}" data-f="${f}">${LBL[f]}</button>`).join('')}</div>
${list.length?list.map(c=>`<button class="sw-opt" data-id="${c.id}"><span>${c.name.replace(/</g,'&lt;')}${c.badge?' <em class="est">est.</em>':''}</span><small>${c.tags.join(' · ')}</small></button>`).join(''):'<div class="cf-hint">No close alternatives in these families.</div>'}<div class="cf-hint">Keeps your ${item.sets} sets.</div>`;
b.querySelector('.mp-x').onclick=closeSwap;b.querySelectorAll('.sw-fam .chip').forEach(c=>c.onclick=()=>{const f=c.dataset.f,i=fams.indexOf(f);i<0?fams.push(f):fams.splice(i,1);draw()});
b.querySelectorAll('.sw-opt').forEach(o=>o.onclick=()=>{const prior=JSON.stringify(state);item.id=o.dataset.id;closeSwap();upd();toast(`Swapped to ${EX[item.id].name}`,()=>{state=JSON.parse(prior);upd()})});
const r=anchor.getBoundingClientRect(),W=Math.min(320,innerWidth-16);b.style.width=W+'px';b.style.left=Math.max(8,Math.min(innerWidth-W-8,r.left))+'px';const h=b.offsetHeight;let top=r.bottom+6;if(top+h>innerHeight-8)top=Math.max(8,r.top-h-6);b.style.top=top+'px'};draw()}
function closeSwap(){const b=document.getElementById('swpop');if(b)b.remove()}
document.addEventListener('pointerdown',e=>{const b=document.getElementById('swpop');if(b&&!b.contains(e.target)&&!e.target.closest('.swp'))closeSwap()});
