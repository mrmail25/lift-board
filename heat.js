let SESS={},GR={colors:{light:'#bfe6d6',solid:'#2f9e72',dark:'#11603f',amber:'#f0a830',red:'#d93b30'}};fetch('data/targets.json').then(r=>r.json()).then(t=>{SESS=(t.session||{}).muscles||{};if(t.gradient)GR=t.gradient;heat()});
const h2c=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
// stops: [[value,colorName],...]; linear RGB interpolation, clamps past the last stop
function grad(v,st){const C=GR.colors;if(st.length&&v<=st[0][0])return C[st[0][1]];for(let i=1;i<st.length;i++){if(v<=st[i][0]){const[a,ca]=st[i-1],[b,cb]=st[i],k=b>a?(v-a)/(b-a):1,A=h2c(C[ca]),B=h2c(C[cb]);return hex(A.map((c,j)=>c+(B[j]-c)*k))}}return C[st[st.length-1][1]]}
const wkStops=g=>{const T=tgt(g),mn=Math.max(.5,T.min),mx=Math.max(mn+.5,T.max);return[[0,'light'],[mn,'solid'],[mx,'dark'],[mx*1.1,'amber'],[mx*1.3,'red']]};
const dyStops=g=>{const s=SESS[g]||{solid:4,heavy:8};return[[0,'light'],[s.solid,'solid'],[s.heavy,'dark'],[s.heavy*1.2,'amber'],[s.heavy*1.6,'red']]};
function stWord(v,st,day){if(!v)return'untrained';const[,a,b,c,d]=st.map(x=>x[0]);if(v<a)return day?'light work':'under min, light';if(v<=b)return day?'solid':'in range';if(v<c)return(day?'past heavy':'over max')+', amber';if(v<d)return(day?'well past heavy':'over max')+', amber→red';return(day?'way past heavy':'way over max')+', red'}
const sm=pts=>{const n=pts.length;let d=`M${pts[0]}`;for(let i=0;i<n;i++){const p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n];
d+=`C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)},${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)},${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2}`}return d+'Z'};
const mir=pts=>pts.map(([x,y])=>[200-x,y]).reverse();
const Ln=segs=>`<g class="str">${segs.map(q=>{const o=x=>x.map(p=>p.join(',')).join(' ');return`<polyline points="${o(q)}"/><polyline points="${o(q.map(([x,y])=>[200-x,y]))}"/>`}).join('')}</g>`;
const C=228,mr=q=>q.map(([x,y])=>[2*C-x,y]).reverse();
const M=(m,pts)=>[pts,mr(pts)].map(q=>`<path class="m" data-m="${m}" d="${sm(q)}"/>`).join('');
const FIG=(n,w,body)=>`<mask id="mk-${n}"><image href="img/${n}-mask.png" width="${w}" height="1030" preserveAspectRatio="none"/></mask><image href="img/${n}.png" width="${w}" height="1030" preserveAspectRatio="none"/><g class="tint" mask="url(#mk-${n})">${body}</g>`;
const FRONT=FIG('front',465,M('traps',[[222,135],[205,150],[175,165],[150,180],[190,180],[215,170],[226,158]])
+M('abs',[[132,262],[125,300],[135,350],[150,400],[180,425],[196,395],[195,340],[192,294],[150,286]])+M('abs',[[226,290],[194,292],[192,340],[195,390],[205,420],[226,426]])
+M('chest',[[226,180],[180,175],[140,182],[127,200],[127,245],[132,264],[150,286],[195,293],[226,291]])
+M('side_delts',[[118,192],[90,198],[74,215],[70,250],[78,285],[98,284],[96,245],[100,210]])
+M('front_delts',[[134,184],[112,190],[100,210],[96,245],[100,282],[116,272],[128,245],[128,212]])
+M('biceps',[[98,282],[78,290],[70,318],[76,352],[94,370],[110,340],[118,300],[116,276]])
+M('forearms',[[78,355],[50,380],[32,420],[30,480],[50,500],[70,490],[85,440],[100,385],[96,362]])
+M('adductors',[[224,505],[202,482],[187,472],[196,520],[205,580],[222,548]])
+M('quads',[[150,412],[125,450],[114,520],[116,600],[130,640],[148,645],[160,640],[175,668],[192,660],[200,620],[198,560],[195,510],[185,460]])
+M('calves',[[124,712],[114,740],[112,780],[118,800],[126,775],[128,740]])+M('calves',[[172,712],[170,750],[175,795],[188,790],[196,760],[190,725]]));
const BACK=FIG('back',456,M('upper_back',[[226,175],[200,170],[170,175],[150,195],[118,225],[118,262],[150,270],[190,265],[226,292]])
+M('lats',[[122,265],[120,300],[130,340],[150,385],[175,400],[200,360],[200,320],[170,280],[150,272]])
+M('lower_back',[[226,332],[205,312],[200,370],[205,400],[226,404]])
+M('traps',[[226,90],[200,105],[155,170],[180,185],[205,240],[226,340]])
+M('triceps',[[118,225],[90,240],[70,265],[55,300],[60,340],[80,355],[100,335],[115,300],[122,265]])
+M('forearms',[[60,342],[40,370],[28,420],[26,480],[45,500],[65,490],[82,440],[95,380],[90,352]])
+M('side_delts',[[110,178],[85,182],[65,205],[58,235],[68,250],[88,232],[95,200]])
+M('rear_delts',[[150,190],[125,178],[100,190],[85,215],[90,240],[115,225],[140,212]])
+M('glutes',[[226,410],[200,402],[150,402],[140,430],[140,510],[160,535],[205,540],[226,520]])
+M('hamstrings',[[140,540],[118,560],[114,600],[122,650],[140,690],[160,705],[178,690],[200,640],[216,590],[220,545],[190,540]])
+M('calves',[[150,705],[128,730],[116,770],[122,810],[140,822],[155,800],[158,760]])+M('calves',[[158,715],[162,760],[160,805],[172,815],[183,790],[185,750],[178,720]])
+M('calves',[[120,812],[126,856],[160,858],[168,818],[156,826],[140,830]]));
const ST={red:[224,72,72],amber:[240,168,48],green:[60,179,113]},SH=['#ffffff','#c9b8f0','#9a7fe0','#6a46c8','#3b1d8f'];
const RNAME={chest_upper:'Upper chest',chest_lower:'Mid/lower chest',traps_upper:'Upper traps',traps_mid_lower:'Mid/lower traps',triceps_long:'Triceps long head',triceps_short:'Triceps lateral/medial heads',quads_rf:'Rectus femoris',quads_vasti:'Vasti (outer and inner quad)',calves_gastroc:'Gastrocnemius',calves_soleus:'Soleus'};
const rname=r=>RNAME[r]||cap(lab(r));
let DMODE=localStorage.getItem('liftboard.dayMode')||'tgt';const shade=x=>{x=Math.max(0,Math.min(1,x));const k=DMODE=="rel"?x:Math.pow(x,.6),a=[196,170,250],b=[52,18,150];return hex(a.map((c,i)=>c+(b[i]-c)*k))};let HSEL=null,OUTL=localStorage.getItem('liftboard.outlines')!=='0';
function rtot(day){const t={};(window.REG||[]).forEach(r=>t[r]=0);(day==null?state.days.flat():state.days[day]).forEach(it=>{const x=EX[it.id];if(!x||!x.heads)return;for(const r in x.heads){const v=x.heads[r];if(v>=RULE.min_rating_to_count)t[r]+=v*it.sets}});for(const r in t)t[r]=Math.round(t[r]/RULE.round_to)*RULE.round_to;return t}
const hex=c=>'#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const hasEst=()=>state.days.flat().some(it=>EX[it.id]&&EX[it.id].estimated)?'<span><i class="hatchsw"></i>Hatched = mostly from your custom (estimated) exercises</span>':'';
function heat(){const el=document.getElementById('heat');if(!el||!MUS.length||!window.REG)return;const d=window.HD;
const t=totals(d==null?null:d),rt=rtot(d==null?null:d);const MAXV=Math.max(1e-9,...Object.values(rt),...(MMJ?[].concat(...['front','back'].map(f=>MMJ[f].muscles.filter(m=>m.region&&m.region.startsWith('g:')).map(m=>t[m.region.slice(2)]||0))):[]));
const col=r=>{const grp=r.startsWith('g:'),g=grp?r.slice(2):RG[r],v=grp?t[g]:rt[r];if(!v)return'#ffffff';if(d==null)return grad(v,wkStops(g));if(DMODE!='rel')return grad(v,dyStops(g));
const s=SESS[g]||{light:2,solid:4,heavy:8};const x=DMODE=='rel'?v/MAXV:Math.min(1,v/s.heavy);return shade(x)};
const info=r=>{if(!r)return'Tap or hover a muscle.';const en=window.estShare&&estShare(r,d)>0?' Includes estimated ratings from custom exercises.':'';return info0(r)+en};const info0=r=>{const grp=r.startsWith('g:'),g=grp?r.slice(2):RG[r],nm=grp?cap(lab(g)):rname(r);if(grp)rt[r]=t[g];if(d==null){const T=tgt(g);return`${nm}: ${rt[r]} sets this week (${stWord(rt[r],wkStops(g))}). ${cap(lab(g))} group: ${t[g]} of ${T.min}–${T.max} (${sel.level} minimum).`}
const s=SESS[g]||{};if(DMODE=='rel')return`${nm}: ${rt[r]} effective sets on ${DAYS[d]}, ${Math.round(rt[r]/MAXV*100)}% of the day's most-hit muscle`;return`${nm}: ${rt[r]} sets on ${DAYS[d]}, ${stWord(rt[r],dyStops(g),1)} (${cap(lab(g))} anchors: light ${s.light}, solid ${s.solid}, heavy ${s.heavy})`};
const sw=c=>`<i style="background:${hex(c)}"></i>`;
const GB=(labs)=>{const C=GR.colors,P=[0,32,62,76,100];return`<div class="gleg"><div class="gbar" style="background:linear-gradient(90deg,${C.light} 0%,${C.solid} 32%,${C.dark} 62%,${C.amber} 76%,${C.red} 100%)"></div><div class="gtk">${labs.map((l,i)=>`<span style="left:${P[i]}%">${l}</span>`).join('')}</div></div>`};
const lg=d==null?`<span><i style="background:#8a8f98"></i>Untrained (no tint)</span>${GB(['light work','min','max','over','way over'])}<span style="flex-basis:100%;color:#99a">Green darkens from the level minimum up to the max; past max it turns amber (10% over), then red (30% over).</span>${hasEst()}`
:DMODE=='rel'?`<span><i style="background:#fff"></i>None</span><span style="display:inline-flex;align-items:center;gap:4px">Least<i style="width:90px;background:linear-gradient(90deg,${[0.02,.25,.5,.75,1].map(shade).join(',')})"></i>Most-hit muscle today</span>${hasEst()}`
:`<span><i style="background:#8a8f98"></i>Untrained (no tint)</span>${GB(['light work','solid','heavy','over','way over'])}${hasEst()}`;
el.innerHTML=`<div class="sel">${['Week',...DAYS].map((n,i)=>`<button data-i="${i-1}" class="${(d==null?-1:d)==i-1?'on':''}">${n}</button>`).join('')}</div>
<div class="figs">${['front','back'].map(f=>fig(f,col)).join('')}</div>
<label style="font-size:12px"><input type="checkbox" id="outl" ${OUTL?'checked':''}> Muscle outlines</label>
<div id="hinfo">${info(HSEL)}</div><div class="legend">${lg}</div><div class="note" style="color:#99a">Body map: <a href="https://github.com/Jsplice/MuscleMap" target="_blank">MuscleMap</a> (@musclemap/assets 1.1.0), MIT License, © 2026 Jsplice / MuscleMap contributors. Body photos are AI-generated. Two small hip paths (glute med, TFL) added by Lift Board. <a href="img/mm/LICENSE-MuscleMap.txt" target="_blank">License</a></div>${d==null?'':`<div class="sel" style="margin-top:6px"><button id="dm-t" class="${DMODE!='rel'?'on':''}">Vs its own target</button><button id="dm-r" class="${DMODE=='rel'?'on':''}">Compared to other muscles</button></div><div class="note">${DMODE=='rel'?'Each muscle is shaded against the most-hit muscle on '+DAYS[d]+', so the top muscle is darkest and the rest are proportional. This shows where the session\'s work went, not whether it\'s enough.':'Each muscle goes light to dark green up to its own per-session heavy anchor, then amber (20% past heavy) and red (60% past). Per-session load, not a weekly target check.'}</div>`}`;
if(d!=null){el.querySelector('#dm-t').onclick=()=>{DMODE='tgt';localStorage.setItem('liftboard.dayMode',DMODE);heat()};el.querySelector('#dm-r').onclick=()=>{DMODE='rel';localStorage.setItem('liftboard.dayMode',DMODE);heat()}}
el.querySelector('#outl').onchange=e=>{OUTL=e.target.checked;localStorage.setItem('liftboard.outlines',OUTL?'1':'0');heat()};
el.querySelectorAll('.mm').forEach(p=>{const r=p.dataset.r;p.onmouseenter=()=>el.querySelector('#hinfo').textContent=info(r);p.onclick=()=>{HSEL=r;heat()}});
el.querySelectorAll('.sel button').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;window.HD=i<0?null:i;render()})}

const FG={};
['front','back'].forEach(f=>{const a=new Image(),l=new Image();let n=0;const done=()=>{if(++n<2)return;const c=document.createElement('canvas');c.width=l.width;c.height=l.height;const x=c.getContext('2d');x.drawImage(l,0,0);
const d=x.getImageData(0,0,c.width,c.height).data,lab=new Uint8Array(c.width*c.height);for(let i=0;i<lab.length;i++)lab[i]=d[i*4];FG[f]={art:a,lab,w:c.width,h:c.height};heat()};
a.onload=done;l.onload=done;a.src='img/'+f+'.png';l.src='img/'+f+'-labels.png'});
function paint(cv,col,info,el){const g=FG[cv.dataset.f];if(!g)return;const S=2,W=g.w*S,H=g.h*S;cv.width=W;cv.height=H;const x=cv.getContext('2d');x.drawImage(g.art,0,0,W,H);
const t=document.createElement('canvas');t.width=W;t.height=H;const tx=t.getContext('2d'),id=tx.createImageData(W,H),cache={},DBG=location.hash.includes('debug'),sel=HSEL?REG.indexOf(HSEL)+1:-1;
const L=(X,Y)=>g.lab[Math.min(g.h-1,Math.max(0,Y>>1))*g.w+Math.min(g.w-1,Math.max(0,X>>1))];
for(let Y=0;Y<H;Y++)for(let X=0;X<W;X++){const k=L(X,Y),i=(Y*W+X)*4;
const edge=k!==L(X+1,Y)||k!==L(X,Y+1)||k!==L(X-1,Y)||k!==L(X,Y-1);
if(edge&&k&&(OUTL||DBG||k==sel)){const a=k==sel?255:150;id.data[i]=20;id.data[i+1]=20;id.data[i+2]=24;id.data[i+3]=a;continue}
if(!k)continue;let c=cache[k];if(!c){const h=col(REG[k-1]);c=cache[k]=[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}
id.data[i]=c[0];id.data[i+1]=c[1];id.data[i+2]=c[2];id.data[i+3]=200}
tx.putImageData(id,0,0);x.globalCompositeOperation='multiply';x.drawImage(t,0,0);x.globalCompositeOperation='source-over';
const pick=e=>{const r=cv.getBoundingClientRect(),px=Math.floor((e.clientX-r.left)/r.width*g.w),py=Math.floor((e.clientY-r.top)/r.height*g.h),k=g.lab[py*g.w+px];return k?REG[k-1]:null};
cv.onmousemove=e=>{const m=pick(e);el.querySelector('#hinfo').textContent=info(m);cv.style.cursor=m?'pointer':'default'};
cv.onclick=e=>{HSEL=pick(e);heat()}}
let MMJ=null;fetch('img/mm/musclemap.json').then(r=>r.json()).then(j=>{MMJ=j;heat()});
function fig(f,col){if(!MMJ)return'';const d=MMJ[f];
const ps=d.muscles.map(m=>{if(!m.region)return'';const c=col(m.region),z=c=='#ffffff',sel=HSEL==m.region;
const es=!z&&window.estShare&&estShare(m.region,window.HD)>.5,op=z?0:(window.HD==null?.8:.85)*(es?.6:1);
return`<path class="mm${sel?' sel':''}${es?' est':''}" data-r="${m.region}" d="${m.d}" fill="${z?'transparent':c}" fill-opacity="${op}" stroke="${OUTL||sel?'#111':'none'}" stroke-width="${sel?5:2.2}" stroke-opacity="${sel?1:.7}"/>${es?`<path d="${m.d}" fill="url(#hatch-${f})" pointer-events="none"/>`:''}`}).join('');
return`<svg viewBox="230 150 564 1300"><defs><pattern id="hatch-${f}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#fff" fill-opacity=".18"/><line x1="0" y1="0" x2="0" y2="14" stroke="#fff" stroke-width="5" stroke-opacity=".75"/></pattern></defs><clipPath id="cl-${f}">${d.outline.map(o=>`<path d="${o}"/>`).join('')}</clipPath><image clip-path="url(#cl-${f})" href="${d.img.replace('.webp','-grey.jpg')}" width="1024" height="1536"/>${ps}</svg>`}
