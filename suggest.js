// v22 quick-apply: exact port of tools/suggest.py (rules.json v4 `suggestions`). Builds on fixes.js.
const SGs=()=>RU.suggestions||{};
const sFat=i=>fatOf(EX[i]);
// mirrors CPython 3.12+ sum() of floats (Neumaier compensated) so ties round identically
const weekCost=days=>{let f=null,c=0;days.forEach(d=>d.tiles.forEach(t=>{const x=t.sets*sFat(t.id);if(f===null){f=0+x;return}const s=f+x;c+=Math.abs(f)>=Math.abs(x)?(f-s)+x:(x-s)+f;f=s}));if(f===null)return 0;return c&&isFinite(c)?f+c:f};
const mainMus=i=>{const m=EX[i].muscles;let b=null;for(const k in m)if(b==null||m[k]>m[b])b=k;return b};
const spf=(i,m)=>(EX[i].muscles[m]||0)/sFat(i);
const MINR=()=>(typeof RULE!='undefined'&&RULE.min_rating_to_count)||.25;
function stretchShare(days,m){let t=0,s=0;const L=RU.stretch_biased[m]||[];days.forEach(d=>d.tiles.forEach(x=>{const r=EX[x.id].muscles[m]||0;if(r<MINR())return;t+=r*x.sets;if(L.includes(x.id))s+=r*x.sets}));return[t?s/t:0,t]}
const FMIN=()=>ANC.analytics.frequency_min_effective;
const sFreq=(days,m)=>days.filter(d=>loadOf(d,m)>=FMIN()).length;
function bdiff(old,nw){const out=[];old.forEach(od=>{const nd=dayOf(nw,od.day),o=od.tiles,n=nd.tiles;
if(o.length==n.length){o.forEach((a,j)=>{const b=n[j];if(a.id!=b.id)out.push({op:'swap',day:od.day,from_id:a.id,to_id:b.id,sets:b.sets});else if(a.sets!=b.sets)out.push({op:'sets',day:od.day,id:a.id,from:a.sets,to:b.sets})});return}
const os=new Map(),ns=new Map();o.forEach(t=>os.set(t.id,t.sets));n.forEach(t=>ns.set(t.id,t.sets));
for(const [i,v] of os){if(!ns.has(i))out.push({op:'remove',day:od.day,id:i,sets:v});else if(ns.get(i)!=v)out.push({op:'sets',day:od.day,id:i,from:v,to:ns.get(i)})}
for(const [i,v] of ns)if(!os.has(i))out.push({op:'add',day:od.day,id:i,sets:v})});return out}
function sPreview(src,p){const DN=RU.day_names||{};p={...p};['day','to_day','from_day'].forEach(k=>{if(k in p)p[k+'_name']=DN[p[k]]||p[k]});const S=SGs()[src];['spf_from','spf_to'].forEach(k=>{if(typeof p[k]=='number'&&Number.isInteger(p[k]))p[k]=p[k]+'.0'});return fmtP(p.kind=='swap'&&src=='recovery_vs_baseline'?S.preview_swap:S.preview,p)}
const mkValid=(days,level)=>{const o=nonin(chk(days,level));return nw=>{for(const k of nonin(chk(nw,level)))if(!o.has(k))return false;return true}};
function pack(a,p,preview,nw,days,resolves,before,after){const pp={};for(const k in p)if(!k.endsWith('name'))pp[k]=p[k];return{action:a,params:pp,preview,resolves,metric:{before:pyR(before,3),after:pyR(after,3)},diff:bdiff(days,nw),days:nw}}
const uniq=a=>[...new Set(a)];const sortFx=fx=>fx.map((x,i)=>[x,i]).sort((a,b)=>(!a[0].resolves)-(!b[0].resolves)||a[1]-b[1]).map(x=>x[0]);
function lfCands(cur){const m=mainMus(cur),r=EX[cur].muscles[m],p=PATm(cur),out=[];
LIB().forEach(i=>{const e=EX[i];if(i==cur)return;if(p!=null&&PATm(i)!=p)return;const[sc,,cs]=swScore(cur,i);if(p==null&&cs<.6)return;if(EX[cur].type!='isolation'&&e.type=='isolation')return;
if((e.muscles[m]||0)<r-.1||spf(i,m)<=spf(cur,m)+1e-9)return;out.push([-pyR(spf(i,m),4),-sc,i])});return[out.sort(cmpT).map(x=>x[2]),m]}
function sLowerFatigue(days,level,valid){const res=[],DN=RU.day_names;
for(const cur of uniq(days.flatMap(d=>d.tiles.map(t=>t.id)))){if(EX[cur].custom)continue;const[cands,m]=lfCands(cur);if(!cands.length)continue;const fx=[];
for(const c of cands.slice(0,8)){const nw=dcopy(days),hit=[];nw.forEach(d=>{if(d.tiles.some(t=>t.id==c))return;d.tiles.forEach(t=>{if(t.id==cur){t.id=c;hit.push(d.day)}})});
if(!hit.length||!valid(nw))continue;const b=weekCost(days),a=weekCost(nw);if(a>=b)continue;
const p={target:cur,criteria:'lower_fatigue',days:hit,name:EX[cur].name,new_name:EX[c].name,day:hit[0],day_list:hit.map(x=>DN[x]).join(', '),spf_from:pyR(spf(cur,m),2),spf_to:pyR(spf(c,m),2),muscle:m.replace(/_/g,' ')};
fx.push(pack('swap_exercise',p,sPreview('lower_fatigue_swap',p),nw,days,true,b,a));break}
res.push({target:{exercise:cur,muscle:m},fixes:fx})}return res}
function sStretch(days,level,valid){const res=[],thr=ANC.analytics.stretch_share_flag_below;
for(const m in RU.stretch_biased){const[sh,tot]=stretchShare(days,m);if(tot<=0||sh>=thr)continue;const fx=[],L=RU.stretch_biased[m];
const tl=[];days.forEach(d=>d.tiles.forEach((t,i)=>{const r=EX[t.id].muscles[m]||0;if(r>=.5&&!L.includes(t.id))tl.push([-(t.sets*r),ORD.indexOf(d.day),i,d.day])}));tl.sort(cmpT);let best=null;
for(const [,,i,dn] of tl){const cur=dayOf(days,dn).tiles[i].id;for(const c of swaps(cur,null,LIB().length,1)){const ci=c.id;if(!L.includes(ci)||EX[ci].custom)continue;const[,sp,cs]=swScore(cur,ci);if(!(sp||cs>=.6))continue;
if(dayOf(days,dn).tiles.some(x=>x.id==ci))continue;const nw=dcopy(days);dayOf(nw,dn).tiles[i].id=ci;const a=stretchShare(nw,m)[0];if(a<=sh||!valid(nw))continue;
const p={target:cur,criteria:'stretch_biased',muscle:m,name:EX[cur].name,new_name:c.name,day:dn};const cand=pack('swap_exercise',p,sPreview('stretch_share',{...p,kind:'swap'}),nw,days,a>=thr,sh,a);
if(cand.resolves){best=cand;break}best=best||cand}if(best&&best.resolves)break}
if(best)fx.push(best);for(const[a_,p,nw] of gAddEx(days,m,true)){const a=stretchShare(nw,m)[0];if(a<=sh||!valid(nw))continue;fx.push(pack(a_,p,prev(a_,p),nw,days,a>=thr,sh,a));break}
res.push({target:{muscle:m,share:pyR(sh,3)},fixes:sortFx(fx)})}return res}
function sFrequency(days,level,valid){const res=[];if(days.length<2)return res;const th=FMIN();
for(const m of RU.frequency_muscles){const f0=sFreq(days,m);if(f0>=2)continue;let srcD=days[0];days.forEach(d=>{if(loadOf(d,m)>loadOf(srcD,m))srcD=d});const src=srcD.day;
const rank=n=>{const i=ORD.indexOf(n),nb=new Set([i-1,i+1].filter(j=>j>=0&&j<7).map(j=>ORD[j]));const adj=days.some(d=>nb.has(d.day)&&d.day!=n&&loadOf(d,m)>=th);const dd=dayOf(days,n);return[adj,loadOf(dd,m),dd.tiles.reduce((s,t)=>s+t.sets,0),ORD.indexOf(n)]};
const targets=sortBy(days.filter(d=>d.day!=src&&loadOf(d,m)<th).map(d=>d.day),rank);const fx=[],sd=srcD;
const tiles=sortBy(sd.tiles.map((_,i)=>i),i=>[-sd.tiles[i].sets*(EX[sd.tiles[i].id].muscles[m]||0)]);let done=false;
for(const i of tiles){const t=sd.tiles[i];if((EX[t.id].muscles[m]||0)<.5)continue;for(const to of targets){for(let k=2;k<t.sets-1;k++){const nw=dcopy(days);dayOf(nw,src).tiles[i].sets-=k;const tl=dayOf(nw,to).tiles,ex=tl.filter(x=>x.id==t.id);
if(ex.length){if(ex[0].sets+k>5)continue;ex[0].sets+=k}else tl.push({id:t.id,sets:k});const f1=sFreq(nw,m);if(f1<=f0||!valid(nw))continue;
const p={target:t.id,sets:k,day:src,to_day:to,muscle:m,name:EX[t.id].name};fx.push(pack('move_sets_to_day',p,prev('move_sets_to_day',p),nw,days,f1>=2,f0,f1));done=true;break}if(done)break}if(done)break}
for(const[a_,p,nw] of gAddEx(days,m,false,src)){const f1=sFreq(nw,m);if(f1<=f0||!valid(nw))continue;fx.push(pack(a_,p,prev(a_,p),nw,days,f1>=2,f0,f1));break}
res.push({target:{muscle:m,days:f0},fixes:sortFx(fx)})}return res}
function sRecovery(days,level,valid,baseline,modifier=1){if(!baseline)return[];const rr=RU.rules.find(r=>r.id=='recovery_vs_baseline'),goal=rr.info_above,pct=d=>weekCost(d)*modifier/baseline,p0=pct(days);if(p0<=goal)return[];
const fx=[],DN=RU.day_names;let nw=dcopy(days);const steps=new Map(),blocked=new Set();
while(pct(nw)>goal){const c=[];nw.forEach(d=>d.tiles.forEach((t,i)=>{if(t.sets>2&&!blocked.has(d.day+'|'+i))c.push([-(t.sets*sFat(t.id)),-sFat(t.id),ORD.indexOf(d.day),i,d.day])}));if(!c.length)break;c.sort(cmpT);
const[,,,i,dn]=c[0],tr=dcopy(nw);dayOf(tr,dn).tiles[i].sets-=1;if(!valid(tr)){blocked.add(dn+'|'+i);continue}nw=tr;const k=dn+'|'+i;steps.set(k,(steps.get(k)||0)+1)}
if(steps.size){const parts=[...steps.keys()].map(k=>{const[dn,i]=[k.split('|')[0],+k.split('|')[1]];return`${EX[dayOf(days,dn).tiles[i].id].name} on ${DN[dn]} ${dayOf(days,dn).tiles[i].sets}→${dayOf(nw,dn).tiles[i].sets}`});
const p={target:'highest_fatigue',sets:[...steps.values()].reduce((a,b)=>a+b,0),n:steps.size,parts:parts.join('; ')};fx.push(pack('reduce_sets',p,sPreview('recovery_vs_baseline',{...p,kind:'trim'}),nw,days,pct(nw)<=goal,p0,pct(nw)))}
nw=dcopy(days);const sw=[];const ids=uniq(days.flatMap(d=>d.tiles.map(t=>t.id))),tots=i=>days.reduce((s,d)=>s+d.tiles.filter(t=>t.id==i).reduce((a,t)=>a+t.sets,0),0);
for(const cur of sortBy(ids,i=>[-sFat(i),-tots(i),i])){if(pct(nw)<=goal)break;if(EX[cur].custom)continue;for(const c of lfCands(cur)[0].slice(0,8)){const tr=dcopy(nw);let hit=0;tr.forEach(d=>{if(d.tiles.some(t=>t.id==c))return;d.tiles.forEach(t=>{if(t.id==cur){t.id=c;hit++}})});
if(hit&&valid(tr)&&pct(tr)<pct(nw)){nw=tr;sw.push(`${EX[cur].name} → ${EX[c].name}`);break}}}
if(sw.length){const p={target:'lower_fatigue',n:sw.length,parts:sw.join('; ')};fx.push(pack('swap_exercise',p,sPreview('recovery_vs_baseline',{...p,kind:'swap'}),nw,days,pct(nw)<=goal,p0,pct(nw)))}
return[{target:{pct:pyR(p0*100,0)},fixes:sortFx(fx)}]}
const colR=(m,x,level)=>{const a=pyR(TG[m].min*LMF[level]*2,0)/2,b=TG[m].max;if(a<=x&&x<=b)return'G';if((a-2<=x&&x<a)||(b<x&&x<=b*1.25))return'A';return'R'};
function sBand(days,level,valid){const res=[],week=checkProgram(days,level).meta.week;
for(const m in week){const x=week[m],lo=Math.max(.5,pyR(TG[m].min*LMF[level]*2,0)/2),hi=TG[m].max;if((lo<=x&&x<=hi)||colR(m,x,level)=='R')continue;const under=x<lo,dist=v=>under?lo-v:v-hi;
const gs=under?[gAddSets(days,m),gAddEx(days,m)]:[gReduce(days,null,'highest_contributor',m)],fx=[];
for(const g of gs){let best=null,n_=0;for(const[a_,p,nw] of g){if(n_++>200)break;const v=effc(nw.flatMap(d=>d.tiles))[m];if(dist(v)>=dist(x)-1e-9||!valid(nw))continue;const c=pack(a_,p,prev(a_,p),nw,days,dist(v)<=0,x,v);if(c.resolves){best=c;break}best=best||c}if(best)fx.push(best)}
res.push({target:{muscle:m,sets:pyR(x,1),side:under?'under':'over'},fixes:sortFx(fx).slice(0,3)})}return res}
const RULE_OF={spinal_load_session:'spinal_load',spinal_load_week:'spinal_load'};
function suggestAll(days,level,baseline=null,sources=null,modifier=1){const out={},valid=mkValid(days,level);
for(const f of chk(days,level)){const rid=RULE_OF[f[1]]||f[1];if(sources&&!sources.includes(rid))continue;const fx=fixesFor(days,level,f).map(x=>({...x,diff:bdiff(days,x.days)}));(out[rid]=out[rid]||[]).push({target:{flag:f},fixes:fx})}
const AN_={lower_fatigue_swap:()=>sLowerFatigue(days,level,valid),stretch_share:()=>sStretch(days,level,valid),effective_frequency:()=>sFrequency(days,level,valid),recovery_vs_baseline:()=>sRecovery(days,level,valid,baseline,modifier),weekly_band:()=>sBand(days,level,valid)};
for(const sid in AN_){if(sources&&!sources.includes(sid))continue;const r=AN_[sid]();if(r.length)(out[sid]=out[sid]||[]).push(...r)}return out}
// ---------- UI ----------
let _sgCache={};function sgGet(sid){const d=boardDays(),B=typeof baseline=='function'?baseline():null,key=JSON.stringify([d,sel.level,B&&B.cost,typeof modF=='function'?modF():1,sid]);if(!(key in _sgCache)){if(Object.keys(_sgCache).length>40)_sgCache={};_sgCache[key]=d.length?(suggestAll(d,sel.level,B&&B.cost||null,[sid],typeof modF=='function'?modF():1)[sid]||[]):[]}return _sgCache[key]}
const fxH=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
function fxRows(fixes,none){if(!fixes.length)return none?`<div class="cf-hint">${none}</div>`:'';return'<div class="fx">'+fixes.slice(0,3).map((z,j)=>`<div class="fx-row"><span>${fxH(z.preview)}${z.resolves?'':`<em class="fx-part">${fxH(RU.partial_label||'Partial')}</em>`}</span><button class="fx-apply" data-fx="${j}">Apply</button></div>`).join('')+'</div>'}
function bindFx(root,fixes){root.querySelectorAll('.fx-apply').forEach(b=>b.onclick=e=>{e.stopPropagation();const mp=document.getElementById('mpop');if(mp)mp.remove();applyFix(fixes[+b.dataset.fx])})}

function pcFixes(d,fl){if(!fl)return[];if(fl.id=='recovery_vs_baseline'){const r=sgGet('recovery_vs_baseline');return r[0]?r[0].fixes:[]}
if(fl.id=='low_frequency'){const t=sgGet('effective_frequency').find(x=>x.target.muscle==fl.muscle);return t?t.fixes:[]}return fixesFor(d,sel.level,tupOf(fl))}
function sgWire(el){const L=m=>cap(lab(m)),put=(box,html,fx)=>{if(!box)return;box.innerHTML=html;fx.forEach(([sel_,f])=>{const r=box.querySelector(sel_);if(r)bindFx(r,f)})};
const NONE='No one-tap change passes the checks for this one. Adjust it by hand.';
// recovery
const rec=sgGet('recovery_vs_baseline');put(el.querySelector('#sg-rec'),rec.map(t=>`<div class="sg-item" id="sgr0"><div>Week is at ${t.target.pct}% of your normal week. Recovery: trim first, swap second.</div>${fxRows(t.fixes,NONE)}</div>`).join(''),rec.map(t=>['#sgr0',t.fixes]));
// frequency
const fq=sgGet('effective_frequency');put(el.querySelector('#sg-freq'),fq.map((t,i)=>`<div class="sg-item" id="sgf${i}"><div><b>${L(t.target.muscle)}</b>: ${t.target.days} day${t.target.days==1?'':'s'} at the frequency threshold this week.</div>${fxRows(t.fixes,NONE)}</div>`).join(''),fq.map((t,i)=>['#sgf'+i,t.fixes]));
// stretch share
const st=sgGet('stretch_share');el.querySelectorAll('.sg-str').forEach(b=>{const t=st.find(x=>x.target.muscle==b.dataset.m);if(!t)return;b.innerHTML=fxRows(t.fixes,NONE);bindFx(b,t.fixes)});
// lower-fatigue swaps
const lf=sgGet('lower_fatigue_swap');put(el.querySelector('#sg-lf'),lf.length?lf.map((t,i)=>`<div class="sg-item an-swap" id="sgl${i}">${t.fixes.length?fxRows(t.fixes):`<div>${fxH(EX[t.target.exercise].name)}: a lower-fatigue option exists, but none passes the program checks.</div>`}</div>`).join(''):'<p class="an-note">No lower-fatigue swaps found for this board.</p>',lf.map((t,i)=>['#sgl'+i,t.fixes]))}
function bandSec(g){if(window.HD!=null&&false)return'';const t=sgGet('weekly_band').find(x=>x.target.muscle==g);if(!t)return'';return`<div class="mp-band"><h5>${t.target.side=='under'?'Under':'Over'} the weekly range (${t.target.sets} sets)</h5>${fxRows(t.fixes,'No one-tap change passes the checks. Adjust it by hand.')}</div>`}
window.bandFixes=g=>{const t=sgGet('weekly_band').find(x=>x.target.muscle==g);return t?t.fixes:[]};
