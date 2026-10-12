// v15 analytics: model for comparing plans (targets.json curve/recovery/analytics)
let ANC={curve:{k:{beginner:6,intermediate:8,advanced:10},session_discount:{cap:10,factor:.5}},recovery:{modifiers:{sleep_under_6h:1.15,age_40_49:1.05,age_50_plus:1.1},note:'Rough estimate. Adjust to how you actually recover.'},analytics:{frequency_min_effective:2,stretch_share_flag_below:.25,session_length:{warmup_min:10,work_sec_per_set:45,rest_min:{compound:2.5,isolation:1.5},compound_types:['primary','accessory']},disclaimer:'Model for comparing plans, not a measurement of growth or recovery.'}};
const AKEY='liftboard.analytics';let AN={open:false,mus:null,sleep:false,age:'none',baselines:[],normal:null};try{Object.assign(AN,JSON.parse(localStorage.getItem(AKEY))||{})}catch{}window.AN=AN;
const anSave=()=>localStorage.setItem(AKEY,JSON.stringify(AN));
fetch('data/targets.json').then(r=>r.json()).then(t=>{for(const k of['curve','recovery','analytics'])if(t[k])ANC[k]=t[k];anUpdate()});
const A$=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const kLvl=m=>{const B=ANC.curve.k_by_muscle;return(m&&B&&B[m]&&B[m][sel.level])||ANC.curve.k[sel.level]||8},Sx=(x,k)=>1-Math.exp(-x/k);
const fat=x=>x?(x.fatigue||(x.base&&EX[x.base]&&EX[x.base].fatigue)||(x.type=='isolation'?.8:1.2)):1;
const dayEff=(i,m)=>state.days[i].reduce((a,it)=>{const x=EX[it.id];const r=x&&x.muscles[m]||0;return r>=RULE.min_rating_to_count?a+r*it.sets:a},0);
const disc=v=>{const d=ANC.curve.session_discount;return Math.min(v,d.cap)+Math.max(0,v-d.cap)*d.factor};
const weekX=m=>DAYS.reduce((a,_,i)=>a+disc(dayEff(i,m)),0);
const r1=v=>Math.round(v*10)/10,pc=v=>Math.round(v*100)+'%';
const dayCost=i=>state.days[i].reduce((a,it)=>a+it.sets*fat(EX[it.id]),0);
const modF=()=>{const M=ANC.recovery.modifiers;return(AN.sleep?M.sleep_under_6h:1)*(AN.age=='40'?M.age_40_49:AN.age=='50'?M.age_50_plus:1)};
const baseline=()=>AN.baselines.length?(AN.baselines.find(b=>b.id==AN.normal)||AN.baselines[0]):null;
function sessMin(i){const L=ANC.analytics.session_length,c=state.days[i];if(!c.length)return 0;return L.warmup_min+c.reduce((a,it)=>{const x=EX[it.id];if(!x)return a;const comp=L.compound_types.includes(x.type);return a+it.sets*(L.work_sec_per_set/60+(comp?L.rest_min.compound:L.rest_min.isolation))},0)}
function stretchHit(x,m){if(!x)return false;if(x.custom)return !!x.stretch_biased;return typeof RU!='undefined'&&RU&&(RU.stretch_biased[m]||[]).includes(x.id)}
function band(m,X,px,H,W){if(typeof weekColor!='function')return'';const st=[];for(let i=0;i<=120;i++){const v=i/120*X;st.push(`<stop offset="${(i/120*100).toFixed(2)}%" stop-color="${grad(v,wkStops(m))}"/>`)}
const raw=(typeof totals=='function'?totals(null)[m]:0)||0,mc=weekColor(m,raw),y=H-14,id='anb-'+m;
return`<defs><linearGradient id="${id}" x1="0" x2="1">${st.join('')}</linearGradient></defs><rect class="an-wband" x="${px(0)}" y="${y}" width="${px(X)-px(0)}" height="10" rx="2" fill="url(#${id})"/>
<text x="${px(0)}" y="${y-3}" class="an-bl2">week colour</text>${mc?`<path class="an-wmark" data-c="${mc}" d="M${px(Math.min(raw,X))-6},${y-7}h12l-6,7z" fill="${mc}" stroke="#fff" stroke-width="1.2"/><rect x="${px(Math.min(raw,X))-1.5}" y="${y}" width="3" height="10" fill="#fff"/>`:''}`}
function chart(m){const k=kLvl(m),x=weekX(m),T=tgt(m),X=Math.max(30,Math.ceil((Math.max(x,T.max)+4)/5)*5),W=300,H=168,px=v=>28+v/X*(W-36),py=v=>H-38-v*(H-50);
let d='';for(let i=0;i<=60;i++){const v=i/60*X;d+=(i?'L':'M')+px(v).toFixed(1)+','+py(Sx(v,k)).toFixed(1)}const nx=Sx(x+1,k)-Sx(x,k);
const ticks=[];for(let v=0;v<=X;v+=X>30?10:5)ticks.push(`<text x="${px(v)}" y="${H-24}" text-anchor="middle">${v}</text>`);
return`<svg class="an-chart" viewBox="0 0 ${W} ${H}"><rect x="${px(T.min)}" y="8" width="${px(T.max)-px(T.min)}" height="${H-28}" class="an-band"/>
${[0,.5,1].map(v=>`<line x1="28" x2="${W-8}" y1="${py(v)}" y2="${py(v)}" class="an-grid"/><text x="24" y="${py(v)+3}" text-anchor="end">${v*100}%</text>`).join('')}${ticks.join('')}
${band(m,X,px,H,W)}<path d="${d}" class="an-curve"/><circle cx="${px(x)}" cy="${py(Sx(x,k))}" r="5" class="an-dot"/><text x="${px(T.min)+3}" y="18" class="an-bl">target ${T.min}–${T.max}</text></svg>
<div class="an-read"><b>${cap(lab(m))}</b>: ${r1(x)} effective sets/week → ${pc(Sx(x,k))} of modeled max. <b>Next set ≈ +${(nx*100).toFixed(1)}% of max.</b></div>`}
function anUpdate(){const el=document.getElementById('anbody');document.querySelectorAll('.col').forEach((c,i)=>{const h=c.querySelector('h3');if(!h)return;let s=h.querySelector('.dmin');const mn=sessMin(i);if(!mn){if(s)s.remove();return}if(!s){s=document.createElement('span');s.className='dmin';h.appendChild(s)}s.textContent='~'+Math.round(mn/5)*5+' min'});
const tg=document.getElementById('antog');if(tg)tg.textContent=(AN.open?'▾':'▸')+' Analytics';if(!el||!MUS.length)return;el.style.display=AN.open?'block':'none';if(!AN.open)return;
const _H=typeof HSEL!="undefined"?HSEL:null;if(_H&&_H!==AN._hs){AN._hs=HSEL;AN.mus=HSEL.startsWith('g:')?HSEL.slice(2):RG[HSEL]}let k;const hs=_H?(HSEL.startsWith('g:')?HSEL.slice(2):RG[HSEL]):null,m=AN.mus||hs||'chest',A=ANC.analytics;k=kLvl(m);
// (a)
const rows=MUS.map(g=>{const x=weekX(g);const kg=kLvl(g);return[g,x,Sx(x,kg),Sx(x+1,kg)-Sx(x,kg)]});
// (b)
const costs=DAYS.map((_,i)=>dayCost(i)*modF()),wk=costs.reduce((a,b)=>a+b,0),B=baseline();
const rel=v=>B&&B.cost?pc(v/B.cost):r1(v)+' pts';
// (c)
const freq=MUS.map(g=>[g,DAYS.map((_,i)=>dayEff(i,g)>=A.frequency_min_effective)]);
const strM=typeof RU!='undefined'&&RU?Object.keys(RU.stretch_biased):[];
const str=strM.map(g=>{let t=0,s=0;state.days.flat().forEach(it=>{const x=EX[it.id];const r=x&&x.muscles[g]||0;if(r<RULE.min_rating_to_count)return;t+=r*it.sets;if(stretchHit(x,g))s+=r*it.sets});return[g,t,t?s/t:0]}).filter(r=>r[1]>0);
const swaps=[];new Set(state.days.flat().map(it=>it.id)).forEach(id=>{const x=EX[id];if(!x)return;const m2=Object.keys(x.muscles).sort((a,b)=>x.muscles[b]-x.muscles[a])[0],r=x.muscles[m2];if(!r)return;const sp=r/fat(x);let best=null;
const px=typeof patOf=='function'?patOf(id):null;Object.values(EX).forEach(y=>{if(y.id==id||y.custom||(px&&patOf(y.id)!=px))return;const ry=y.muscles[m2]||0;if(ry<r-.1)return;const s2=ry/fat(y);if(s2>sp+1e-9&&(!best||s2>best[1]))best=[y,s2]});if(best)swaps.push([x,best[0],m2,sp,best[1]])});
el.innerHTML=`<p class="an-disc">${A$(A.disclaimer)}</p>
<h4>Diminishing returns</h4><div class="an-chips" role="group" aria-label="Muscle">${MUS.map(g=>`<button type="button" class="an-chip${g==m?' on':''}" data-m="${g}" aria-pressed="${g==m}">${cap(lab(g))}</button>`).join('')}</div>${evChip(m)}${chart(m)}
<p class="an-note">S(x) = 1 − e<sup>−x/k</sup>, k = ${k} for ${lab(m)} at ${sel.level} (set so the level minimum sits at 60% of max). Sets past ${ANC.curve.session_discount.cap} for a muscle in one session count half. Shaded band = your weekly target.</p>${modelNote()}
<details class="an-tbl"><summary>All muscles</summary><table><tr><th>Muscle</th><th>Eff. sets</th><th>% of max</th><th>Next set</th></tr>${rows.map(([g,x,s,n])=>`<tr class="${g==m?'on':''}" data-m="${g}"><td>${cap(lab(g))}</td><td>${r1(x)}</td><td>${pc(s)}</td><td>+${(n*100).toFixed(1)}%</td></tr>`).join('')}</table></details>
<h4>Recovery cost</h4><div class="an-cost">${DAYS.map((d,i)=>costs[i]?`<span><b>${d}</b> ${rel(costs[i])}</span>`:'').join('')}</div>
<div class="an-wk">Week: <b>${rel(wk)}</b>${B?` of your normal week (“${A$(B.name)}”)`:''}</div><div id="sg-rec"></div>
${B?'':'<p class="an-note">These are raw points (sets × fatigue). Save a week you recover well from as your normal week to see costs as a percentage of it.</p>'}
<div class="cf-btns"><button id="an-base">Save as my normal week</button>${AN.baselines.length>1?`<select id="an-bsel">${AN.baselines.map(b=>`<option value="${b.id}" ${b.id==(B&&B.id)?'selected':''}>${A$(b.name)}</option>`).join('')}</select>`:''}</div>
<div class="an-mods"><label><input type="checkbox" id="an-sleep" ${AN.sleep?'checked':''}> Usually sleeping under 6 hours (+15%)</label>
<label>Age <select id="an-age"><option value="none" ${AN.age=='none'?'selected':''}>Not set</option><option value="40" ${AN.age=='40'?'selected':''}>40–49 (+5%)</option><option value="50" ${AN.age=='50'?'selected':''}>50+ (+10%)</option></select></label>
<p class="an-note">${A$(ANC.recovery.note)} Sleep affects recovery; these small adjustments are optional and never change your plan.</p></div>
<h4>Frequency</h4><div class="an-freq"><div class="an-fh"><span></span>${DAYS.map(d=>`<i>${d[0]}</i>`).join('')}</div>${freq.filter(([,f])=>f.some(Boolean)||1).map(([g,f])=>`<div><span>${cap(lab(g))}</span>${f.map(b=>`<i class="${b?'on':''}"></i>`).join('')}</div>`).join('')}</div>
<p class="an-note">Dot = at least ${A.frequency_min_effective} effective sets that day.</p><div id="sg-freq"></div>
<h4>Stretch-biased share</h4>${str.length?str.map(([g,t,s])=>`<div class="an-str ${s<A.stretch_share_flag_below?'low':''}"><span>${cap(lab(g))}</span><div class="bar"><i style="width:${Math.round(s*100)}%"></i></div><b>${pc(s)}</b></div>${s<A.stretch_share_flag_below?`<div class="an-sug">Suggestion: try ${RU.stretch_biased[g].slice(0,2).map(i=>EX[i]?EX[i].name:i).join(' or ')} for ${lab(g)}.</div><div class="sg-str" data-m="${g}"></div>`:''}`).join(''):'<p class="an-note">Add exercises to see this.</p>'}
<h4>Lower-fatigue swaps</h4><p class="an-note">Same movement pattern, at least as strong for the main muscle (within 0.1), less fatigue per unit of stimulus.</p><div id="sg-lf"></div>`;
sgWire(el);el.querySelectorAll('.an-chip').forEach(c=>c.onclick=()=>{AN.mus=c.dataset.m;anSave();anUpdate()});el.querySelectorAll('.an-tbl tr[data-m]').forEach(r=>r.onclick=()=>{AN.mus=r.dataset.m;anSave();anUpdate()});
el.querySelector('#an-sleep').onchange=e=>{AN.sleep=e.target.checked;anSave();anUpdate()};el.querySelector('#an-age').onchange=e=>{AN.age=e.target.value;anSave();anUpdate()};
const bs=el.querySelector('#an-bsel');if(bs)bs.onchange=()=>{AN.normal=bs.value;anSave();anUpdate()};
el.querySelector('#an-base').onclick=()=>{const raw=DAYS.reduce((a,_,i)=>a+dayCost(i),0);if(!raw){alert('Put a week on the board first.');return}const b={id:Date.now().toString(36),name:(state.labels||[]).filter(Boolean).slice(0,2).join(' / ')||'Week of '+new Date().toLocaleDateString(),date:new Date().toISOString(),cost:raw*modF()};
AN.baselines.push(b);AN.normal=b.id;anSave();anUpdate()}}
function importAN(d){if(d.analytics&&typeof d.analytics=='object'){const a=d.analytics;['sleep'].forEach(k=>{if(typeof a[k]=='boolean')AN[k]=a[k]});if(['none','40','50'].includes(a.age))AN.age=a.age;if(Array.isArray(a.baselines))AN.baselines=a.baselines.filter(b=>b&&b.id&&typeof b.cost=='number');if(a.normal)AN.normal=a.normal;anSave()}}
(function(){const vp=document.getElementById('chk').closest('.panel');vp.insertAdjacentHTML('afterend','<div class="panel" id="anp"><h2><button id="antog" class="ftog"></button></h2><div id="anbody"></div></div>');
document.getElementById('antog').onclick=()=>{AN.open=!AN.open;anSave();anUpdate()}})();

// v21 evidence (targets.json v10: targets[m].evidence, curve.modeling_choices)
const EVDEF={direct:['Direct','Studies measured this muscle\'s growth at different weekly set volumes.'],pooled:['Pooled','No muscle-specific volume study; target comes from pooled whole-body volume data.'],extrapolated:['Extrapolated','Coaching inference from pooled data plus indirect work; weakest evidence.']};
const evDefs=()=>{const c=ANC.curve&&ANC.curve.evidence_tags;const o={};for(const k in EVDEF){const d=c&&c[k];o[k]=d?[d.label||EVDEF[k][0],d.description||d.text||EVDEF[k][1]]:EVDEF[k]}return o};
const evOf=m=>{const t=(typeof TG!='undefined'&&TG[m])||null;return t&&t.evidence&&t.evidence.tag?t.evidence:null};window.evOf=evOf;window.evDefs=evDefs;
function evChip(m){const e=evOf(m);if(!e)return'';const D=evDefs(),d=D[e.tag]||[e.tag,''];
return`<div class="an-ev"><span class="ev-chip ev-${A$(e.tag)}" title="${A$(d[1])}">Evidence: ${A$(d[0])}</span><details class="ev-leg"><summary>What do the tags mean?</summary>${Object.keys(D).map(k=>`<div><span class="ev-chip ev-${k}">${A$(D[k][0])}</span> ${A$(D[k][1])}</div>`).join('')}</details></div>`}
function modelNote(){const L=(ANC.curve&&ANC.curve.modeling_choices)||[];if(!L.length)return'';return`<details class="an-model"><summary>Modeling choices (model assumptions, not data)</summary><ul>${L.map(x=>`<li><b>${A$(x.item)}</b>: ${A$(x.rationale)}</li>`).join('')}</ul></details>`}
