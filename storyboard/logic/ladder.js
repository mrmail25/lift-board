// Evolution ladder (evolution1, 2026-10-25): port of Coach's tools/evolution.py report(history, as_of) over data/evolution-rules.json
// (dt.EVO in the browser; read from data/ in node). Spec: data/evolution-spec.md. Parity: node test/evolution.diff.js (vs
// data/evolution-reference.json: sample + every edge case, 0 diffs expected). A strength game model, not a measurement.
// Thresholds come from tables.<men|women>.<lift>.ranks (never recomputed). Reuses the prs flatten (PROGRESS.flatten: aliases,
// completed sessions, done sets, kg) and session.deload === true. Local dates America/Los_Angeles. EPS 1e-9.
// Storyboard extras (not Coach's): rankName(i, R, hidden, labels) is the ONE name formatter (Coach's tier label_template, optional
// label overrides); settings.ladder.hidden (hide the whole ladder) is display only (Coach's display.ladder_hidden); report() ignores it.
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const PG=()=>isNode?require('./progress.js'):root.PROGRESS;
const EPS=1e-9;
let NODE_RULES=null;
function rulesOf(dt){if(dt&&dt.EVO)return dt.EVO;if(isNode){if(!NODE_RULES)NODE_RULES=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'../data/evolution-rules.json'),'utf8'));return NODE_RULES}
  throw new Error('dt.EVO (evolution-rules.json) missing')}
const r4=v=>Math.round(v*1e4)/1e4;
const dOf=s=>String(s).slice(0,10),days=(a,b)=>Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/864e5);
const stageIdx=(R,sid)=>R.stages.findIndex(s=>s.id===sid);
// ONE name formatter: '{stage}' / 'Chief {stage}' / 'Alpha {stage}' from Coach's tiers; labels (optional) override {ranks:{stage_id:[..3]}, stages:{id:label}}
function rankName(i,R,hidden,labels){R=R||rulesOf();if(i==null)return null;if(hidden)return R.hidden.label;const rk=R.ranks[i],st=R.stages[stageIdx(R,rk.stage)],L=labels||{};
  const o=L.ranks&&L.ranks[rk.stage];if(o&&o[rk.tier-1])return o[rk.tier-1];return R.tiers[rk.tier-1].label_template.replace('{stage}',(L.stages&&L.stages[rk.stage])||st.label)}
function rankIndex(R,a){if(!a||typeof a!=='object'||Array.isArray(a))return null;const si=stageIdx(R,a.stage);const t=parseInt(a.tier,10);if(si<0||!Number.isFinite(t)||String(t)!==String(a.tier).trim())return null;return 3*si+t-1}
const prof=h=>((h.settings||{}).profile)||{};
function lg(dt){const LG=dt.rules.logger;return {mx:LG.e1rm_max_reps,lb:LG.lbPerKg||2.20462,tags:LG.set_tags||{},formula:LG.e1rm_formula||'epley'}}
const toKg=(v,u,C)=>u==='lb'?+v/C.lb:+v,fromKg=(kg,u,C)=>u==='lb'?kg*C.lb:kg;
const e1=(C,w,r)=>C.formula==='brzycki'?w*36/(37-r):w*(1+r/30);
function profileBwKg(h,C){const b=prof(h).bodyweight;if(b&&typeof b==='object'&&b.value){const v=+b.value;return Number.isFinite(v)?toKg(v,b.unit||'lb',C):null}return null}
function bwTable(h,C){const out=[];for(const b of h.bodyweights||[]){if(!b||b.date==null||b.value==null)continue;out.push([dOf(b.date),toKg(b.value,b.unit||'lb',C)])}return out.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0)}
function bodyweightFor(t,day,pkg){const prev=t.filter(([d])=>d<=day);if(prev.length)return [prev[prev.length-1][1],'logged'];if(pkg)return [pkg,'profile'];return [null,'missing']}
const excluded=(C,x,k)=>!!(x.tag&&((C.tags[x.tag]||{}).pr_exclude||[]).includes(k));
function exTable(dt,h){const EX=Object.assign({},dt.EX);for(const c of h.customExercises||[])if(c.id&&c.muscles)EX[c.id]=c;return EX}
// swap2 (ladder v2): allometric S(BW) from rules.scaling (anchor_bw / clamp per table, in kg; exponent). No scaling block -> BW (flat multiples).
function scaleKg(R,table,bw){const Sc=R.scaling;if(!Sc||bw==null)return bw;const a=Sc.anchor_bw[table].kg,[lo,hi]=Sc.clamp[table].kg,b=Sc.exponent;
  if(bw<lo)return bw*Math.pow(lo/a,b-1);if(bw>hi)return a*Math.pow(hi/a,b);return a*Math.pow(bw/a,b)}
function liftValues(dt,h,R,table,unit){table=table||'men';unit=unit||'lb';const CV=R.curve,SC=!!R.scaling,C=lg(dt),P=PG(),bwt=bwTable(h,C),pkg=profileBwKg(h,C),EX=exTable(dt,h),ex2={};
  for(const [l,m] of Object.entries(R.lifts))for(const i of m.exercise_ids)ex2[i]=l;
  const out={};for(const l of Object.keys(R.lifts))out[l]={status:'not_trained',value:null,trained:false,unrated_sets:0};
  for(const q of P.flatten(dt,h)){const s=q.s;if(s.deload===true)continue;const day=P.localDate(s.startedAt||s.date);
    for(const x of q.sets){const l=ex2[x.ex];if(!l||x.kind!=='working'||x.reps<1)continue;const kind=R.lifts[l].kind,o=out[l],r=x.reps,added=x.added_kg;
      let v=null,conv=false;const [bw,bws]=bodyweightFor(bwt,day,pkg);
      if(CV){let pos,xl,mult,e=null;
        if(kind==='load'){if(r>C.mx||excluded(C,x,'e1rm')||added<=EPS)continue;o.trained=true;if(bw==null){o.unrated_sets++;continue}
          e=e1(C,added,r);v=fromKg(e,unit,C);pos=SL.position(v,slBars(R,table,l,bw,unit,C.lb));xl=e*C.lb;mult=e/bw}
        else{if(added<-EPS)continue;if(added<=EPS){if(excluded(C,x,'reps_at_load'))continue;o.trained=true;v=r}
          else{if(r>C.mx||excluded(C,x,'e1rm'))continue;o.trained=true;if(bw==null){o.unrated_sets++;continue}const f=(EX[x.ex]||{}).bodyweight_fraction||0.95;v=Math.floor(30*((f*bw+added)*(1+r/30)/(f*bw)-1)+1e-9);conv=true}
          pos=SL.position(v,slBars(R,table,l,bw,unit,C.lb));xl=v;mult=null}
        if(o.value==null||pos>o.position+EPS||(Math.abs(pos-o.position)<=EPS&&v>o.value+EPS)){const bl=bw!=null?bw*C.lb:CV.anchor_bw_lb[table];
          Object.assign(o,{status:'rated',value:rnd(v,2),position:rnd(pos,6),set_id:x.id,date:day,converted:conv,multiple:mult!=null?r4(mult):null,e1rm_kg:kind==='load'?r4(e):null,
            bodyweight_kg:bw!=null?r4(bw):null,bodyweight_source:bw!=null?bws:null,_tiers:SL.tiersAt(CV,table,l,bl),_x:xl})}
        continue}
      if(kind==='multiple'){if(r>C.mx||excluded(C,x,'e1rm')||added<=EPS)continue;o.trained=true;if(bw==null){o.unrated_sets++;continue}v=e1(C,added,r)/(SC?scaleKg(R,table,bw):bw)}
      else{if(added<-EPS)continue;
        if(added<=EPS){if(excluded(C,x,'reps_at_load'))continue;o.trained=true;v=r;if(SC&&bw!=null)v=r4(v*bw/scaleKg(R,table,bw))}
        else{if(r>C.mx||excluded(C,x,'e1rm'))continue;o.trained=true;if(bw==null){o.unrated_sets++;continue}
          const f=(EX[x.ex]||{}).bodyweight_fraction||0.95;v=Math.floor(30*((f*bw+added)*(1+r/30)/(f*bw)-1)+1e-9);conv=true;if(SC)v=r4(v*bw/scaleKg(R,table,bw))}}
      if(o.value==null||v>o.value+EPS){if(SC)o.unscaled=kind==='multiple'?r4(e1(C,added,r)/bw):(bw!=null?r4(v*scaleKg(R,table,bw)/bw):v);Object.assign(o,{status:'rated',value:v,set_id:x.id,date:day,converted:conv,bodyweight_kg:bw!=null?r4(bw):null,bodyweight_source:bw!=null?bws:null})}}}
  for(const o of Object.values(out)){if(o.trained&&o.value==null)o.status='needs_bodyweight';if(o.value!=null)o.value=r4(o.value)}return out}
// swap3 (Strength Level curve, rules.curve): port of Coach's tools/evolution_sl.py (pure math over the rules) + the curve branches of
// evolution.py (sl_bars, lift_values, overall_rank_pos, pos_progress, percentile, migration_floor_sl). EPS 1e-6 on positions.
const SL={
 tiersAt(C,table,lift,bw){const T=C.tables[table][lift],rows=T.rows,[lo,hi]=T.bounds_lb;if(bw>=hi)return rows[rows.length-1].slice(1);
  if(bw<=lo){const f=T.kind==='load'?bw/lo:1;return rows[0].slice(1).map(v=>v*f)}
  const i=Math.min(Math.floor((bw-lo)/10),rows.length-2),a=rows[i],b=rows[i+1],f=(bw-a[0])/(b[0]-a[0]);return a.slice(1).map((x,k)=>x+(b[k+1]-x)*f)},
 atPct(t,p){const P=[5,20,50,80,95];if(p>=P[4])return t[4]+(p-P[4])*(t[4]-t[3])/(P[4]-P[3]);for(let k=0;k<4;k++)if(p<=P[k+1])return t[k]+(p-P[k])*(t[k+1]-t[k])/(P[k+1]-P[k])},
 entries(C,table,lift,bw){const t=SL.tiersAt(C,table,lift,bw),T=C.tables[table][lift],kd=T.kind==='load'?T.kd_fraction*t[0]:0;return [kd,...C.stage_order.map(s=>SL.atPct(t,C.stage_pct[s])),SL.atPct(t,C.ceiling_pct)]},
 raw(C,table,lift,bw){const e=SL.entries(C,table,lift,bw),o=[];for(let k=0;k<7;k++)for(let j=0;j<3;j++)o.push(e[k]+(e[k+1]-e[k])*j/3);o.push(e[7]);return o},
 shown(C,table,lift,bw,unit,lbk){const raw=SL.raw(C,table,lift,bw),o=[];
  if(C.tables[table][lift].kind==='reps'){for(const x of raw){let b=Math.ceil(x-1e-9);if(o.length&&b<o[o.length-1])b=o[o.length-1];o.push(b)}return o}
  const st=C.rounding[unit];for(const x of raw){const v=unit==='lb'?x:x/lbk;let b=st*Math.floor(v/st+0.5+1e-4);if(o.length&&b<=o[o.length-1]+1e-9)b=o[o.length-1]+st;o.push(Math.round(b*1e6)/1e6)}return o},
 position(x,b,eps=1e-6){if(x<b[0]-eps)return b[1]>b[0]?(x-b[0])/(b[1]-b[0]):-1;let i=0;for(let k=0;k<21;k++)if(x>=b[k]-eps)i=k;if(b[i+1]-b[i]<=eps)return i+1;return i+Math.max(0,Math.min((x-b[i])/(b[i+1]-b[i]),1))},
 pctFromPos(C,pos,t,x){const pts=[...C.stage_order.map((s,k)=>[3*(k+1),C.stage_pct[s]]),[21,C.ceiling_pct]];
  if(pos>=pts[0][0]){for(let k=0;k<pts.length-1;k++){const [a,pa]=pts[k],[b,pb]=pts[k+1];if(pos<=b)return pa+(pb-pa)*(pos-a)/(b-a)}return C.ceiling_pct}
  if(t==null||x==null||x<t[0]-1e-9)return null;const p=t[1]>t[0]?5+15*(x-t[0])/(t[1]-t[0]):5;return Math.min(p,C.stage_pct[C.stage_order[0]]-0.1)}};
const SBC=new Map();
function slBars(R,table,lift,bwKg,unit,lbk){const C=R.curve,bl=bwKg!=null?bwKg*lbk:C.anchor_bw_lb[table],k=[table,lift,Math.round(bl*1e9)/1e9,unit].join('|');
  if(SBC.get('C')!==C){SBC.clear();SBC.set('C',C)}if(!SBC.has(k))SBC.set(k,SL.shown(C,table,lift,bl,unit,lbk));return SBC.get(k)}
// Python round(v, n): half to even on exact ties (e.g. 56.25 -> 56.2)
const rnd=(v,n)=>{const f=Math.pow(10,n),x=v*f,t=Math.floor(x);let r=Math.round(x);if(x-t===0.5)r=t%2===0?t:t+1;return r/f};
function overallRankPos(R,sp){const n=R.promotion.min_lifts;let best=0;for(let i=0;i<21;i++)if(sp.filter(([,v])=>v!=null&&v>=i-EPS).length>=n)best=i;return best}
function posProgress(pos,cur){if(pos==null)return 0;if(cur>=20)return 1;return Math.max(0,Math.min(1,pos-cur))}
function pctEntry(R,o){const C=R.curve,pos=o.position;if(pos==null)return null;const p=SL.pctFromPos(C,pos,o._tiers,o._x),topPos=3*C.stage_order.length,top=100-C.stage_pct[C.stage_order[C.stage_order.length-1]];
  const band=p==null?'under_5':pos>=topPos-EPS?'top':'estimate';return {band,pct:p!=null?rnd(p,1):null,display:p==null?null:band==='top'?`top ${top}%`:String(Math.floor(p+1e-9))}}
function percentile(R,V,slots){const C=R.curve,lifts={};for(const l of Object.keys(V))lifts[l]=pctEntry(R,V[l]);const have=slots.filter(([,v])=>v!=null).map(([l,v])=>[v,l]),n=R.promotion.min_lifts;let overall=null;
  if(have.length>=n){const [pos,l]=have.slice().sort((a,b)=>b[0]-a[0])[n-1];overall=Object.assign({},lifts[l],{lift:l,position:rnd(pos,6)})}
  const top=100-C.stage_pct[C.stage_order[C.stage_order.length-1]];let line=null;
  if(overall&&overall.band==='top')line=R.labels.percentile_line_top.replace('{top}',String(top));else if(overall&&overall.band==='estimate')line=R.labels.percentile_line.replace('{pct}',overall.display);
  return {lifts,overall,basis:C.percentile_basis,line}}
// migration (mig3): t = 3 of 5 (one stand-in), p = same step, q = all 5 (previous floor); floor = max; hidden cap below a hidden stage t does not reach
const MIG_SUBS=[['row','pullups'],['dips','bench']];
const hiddenStarts=R=>R.stages.map((s,k)=>s.hidden_until_reached?3*k:null).filter(x=>x!=null);
function migOk(C,table,OT,l,old,bl,tol,lbk){const T=C.tables[table][l],b=T.kind==='reps'?SL.shown(C,table,l,bl,'lb',lbk):SL.raw(C,table,l,bl),lim=OT[l][old]*(T.kind==='reps'?1:bl)*tol;return b.slice(0,21).map(x=>x<=lim+EPS)}
function migrationFloorSlAll5(C,table,OT,core,old,bl,tol,lbk){const ok={};for(const l of core)ok[l]=migOk(C,table,OT,l,old,bl,tol,lbk);let f=0;for(let i=0;i<21;i++)if(core.every(l=>ok[l][i]))f=i;return f}
function migrationFloorSl3of5(C,table,OT,core,old,bl,tol,lbk,subs=MIG_SUBS){const ok={};for(const l of [...core,...subs.map(s=>s[0])])if(l in OT&&l in C.tables[table])ok[l]=migOk(C,table,OT,l,old,bl,tol,lbk);let f=0;
  for(let i=0;i<21;i++){let n=core.filter(l=>ok[l][i]).length;if(n<3&&subs.some(([s,c])=>(s in ok)&&!ok[c][i]&&ok[s][i]))n++;if(n>=3)f=i}return f}
function migrationPartsSl(C,table,OT,core,old,bl,tol,lbk,hs=[]){const t=migrationFloorSl3of5(C,table,OT,core,old,bl,tol,lbk),q=migrationFloorSlAll5(C,table,OT,core,old,bl,tol,lbk),p=old;let f=Math.max(t,p,q),cap=false;
  for(const h of hs.slice().sort((a,b)=>a-b))if(f>=h&&t<h){f=h-1;cap=true;break}return {three_of_five:t,same_step:p,previous:q,floor:f,hidden_cap:cap}}
const migrationFloorSl=(...a)=>migrationPartsSl(...a).floor;
function liftRank(v,th){if(v==null)return null;let k=0;th.forEach((t,i)=>{if(v>=t-EPS)k=i});return k}
function liftProgress(v,th,cur){if(v==null||cur+1>=th.length)return v==null?0:1;const a=th[cur],b=th[cur+1];if(b-a<=EPS)return v>=b-EPS?1:0;return Math.max(0,Math.min(1,(v-a)/(b-a)))}
function overallRank(R,sv,T){const n=R.promotion.min_lifts;let best=0;for(let i=0;i<21;i++)if(sv.filter(([l,v])=>v!=null&&v>=T[l].ranks[i]-EPS).length>=n)best=i;return best}
const third=(R,ps)=>ps.slice().sort((a,b)=>b-a)[R.promotion.min_lifts-1];
function currentBw(dt,h,asOf){const C=lg(dt),t=bwTable(h,C).filter(([d])=>d<=asOf);if(t.length)return [t[t.length-1][1],'logged'];const p=profileBwKg(h,C);return p?[p,'profile']:[null,'missing']}
function ageOf(h,asOf){const b=prof(h).birthDate;if(!b||!/^\d{4}-\d{2}-\d{2}/.test(String(b)))return null;const [by,bm,bd]=String(b).slice(0,10).split('-').map(Number),[ay,am,ad]=asOf.split('-').map(Number);
  if(!by||!bm||!bd)return null;return ay-by-((am<bm||(am===bm&&ad<bd))?1:0)}
function heightCm(h){const x=prof(h).height;if(!x||typeof x!=='object'||!x.value)return null;return +x.value*(x.unit==='in'?2.54:1)}
function leanStatus(h,asOf,table,shown,R){const L=R.lean,st=((h.settings||{}).bodyComp)||{},age=ageOf(h,asOf);
  const res={status:null,method:null,value:null,threshold:null,age_allowance:0,reading_date:null,badge:{id:L.badge.id,label:L.badge.label,unlocked:false,greyed:false,visible:false}};
  const done=s=>{res.status=s;res.label=L.labels[s]??null;const prime=stageIdx(R,L.badge.requires_stage)*3;
    if((s==='pass'||s==='stale')&&shown>=prime)Object.assign(res.badge,{unlocked:s==='pass',greyed:s==='stale',visible:true});
    if(s==='hidden'||s==='unavailable'){res.badge=null;res.label=null}return res};
  if(st.hidden===true)return done('hidden');if(age!=null&&age<18)return done('unavailable');if(st.optIn!==true)return done('not_tracked');if(age==null)return done('needs_age');
  let allow={whtr:0,bf_pct:0};for(const b of L.age_allowance.bands)if(age>=b.min_age&&(b.max_age==null||age<=b.max_age))allow={whtr:b.whtr,bf_pct:b.bf_pct};
  const hc=heightCm(h),win=L.window_days,rows=(h.bodyComp||[]).filter(e=>e&&e.date&&dOf(e.date)<=asOf);
  const waist=e=>{const w=e.waist;if(!w||typeof w!=='object'||!w.value)return null;return +w.value*(w.unit==='in'?2.54:1)};
  const W=rows.filter(e=>hc&&waist(e)).map(e=>[dOf(e.date),waist(e)/hc]),B=rows.filter(e=>e.bfPct!=null&&L.fallback.accepted_methods.includes(e.bfMethod)).map(e=>[dOf(e.date),+e.bfPct]);
  const best=xs=>xs.reduce((m,t)=>!m||t[1]<m[1]||(t[1]===m[1]&&t[0]<m[0])?t:m,null);
  for(const [mid,xs,lim,al] of [['whtr',W,L.primary.max[table],allow.whtr],['bf_pct',B,L.fallback.max[table],allow.bf_pct]]){if(!xs.length)continue;
    const rec=xs.filter(([d])=>days(asOf,d)<win),thr=r4(lim+al);Object.assign(res,{method:mid,threshold:thr,age_allowance:al});
    if(rec.length){const [d,v]=best(rec);Object.assign(res,{value:r4(v),reading_date:d});return done(v<=thr+EPS?'pass':'not_yet')}
    const [d,v]=best(xs);Object.assign(res,{value:r4(v),reading_date:d});if(mid==='whtr'||!W.length)return done(v<=thr+EPS?'stale':'needs_entry')}
  return done('needs_entry')}
// Plate badges, read per lift from Coach's rules (plate_badges): settings.unit picks the lb or kg list (a lb user is judged on the lb list, so
// 220 kg logged ~ 485 lb does not earn 495), lifts[lift] = how many entries that lift has. Entries from hidden_from_plates on (the 5-plate
// badges) carry a hidden key: hidden:true + hidden_label until a qualifying set exists, then hidden:false + the normal label. Others have none.
function plateEntries(PB,unit,lift){const list=PB[unit]||[],n=Math.min(PB.lifts[lift]|0,list.length),hf=PB.hidden_from_plates;
  return Array.from({length:n},(_,i)=>({plates:i+1,load:+list[i],label:(PB.labels||{})[String(i+1)]||`${i+1} plates`,hiddenType:hf!=null&&i+1>=hf}))}
function plateBadges(dt,h,R){const C=lg(dt),P=PG(),PB=R.plate_badges;let unit=((h.settings||{}).unit)||'lb';unit=unit==='lb'||unit==='kg'?unit:'lb';const ex2={},got={},E={};
  for(const l of Object.keys(PB.lifts))E[l]=plateEntries(PB,unit,l);
  for(const [l,m] of Object.entries(R.lifts))for(const i of m.exercise_ids)ex2[i]=l;
  for(const q of P.flatten(dt,h)){const s=q.s;if(s.deload===true)continue;const day=P.localDate(s.startedAt||s.date);
    for(const x of q.sets){const l=ex2[x.ex];if(!(l in PB.lifts)||x.kind!=='working'||x.reps<1||excluded(C,x,'weight'))continue;const ld=fromKg(x.added_kg,unit,C);
      E[l].forEach(p=>{if(ld>=p.load-0.01&&!got[l+'|'+p.plates])got[l+'|'+p.plates]=[day,x.id]})}}
  const out=[];for(const l of Object.keys(PB.lifts))for(const p of E[l]){const g=got[l+'|'+p.plates],hid=p.hiddenType&&!g;
    const b={id:`${l}.plates${p.plates}`,lift:l,plates:p.plates,load:p.load,unit,label:hid?(PB.hidden_label||'Hidden badge'):`${p.label} (${p.load} ${unit}) ${R.lifts[l].label.toLowerCase()}`,earned:!!g,date:g?g[0]:null,set_id:g?g[1]:null};
    if(p.hiddenType)b.hidden=hid;out.push(b)}
  return out}
// plates earned by `after` that `before` did not have (ids, highest plate first per lift); used by the finish-screen celebration
function newPlates(before,after){const had=new Set(((before&&before.badges&&before.badges.plates)||[]).filter(b=>b.earned).map(b=>b.id));
  return ((after&&after.badges&&after.badges.plates)||[]).filter(b=>b.earned&&!had.has(b.id)).sort((a,b)=>b.plates-a.plates||a.lift.localeCompare(b.lift))}
function report(dt,h,asOf,opts){opts=opts||{};const R=rulesOf(dt),C=lg(dt),sex=prof(h).sex,table=sex==='male'||sex==='female'?R.table_choice[sex]:R.table_choice.unset,T=R.tables[table];
  let unit=((h.settings||{}).unit)||'lb';unit=unit==='lb'||unit==='kg'?unit:'lb';
  const CV=R.curve,V=CV?liftValues(dt,h,R,table,unit):liftValues(dt,h,R,table),PV=l=>CV?(V[l].position??null):V[l].value,core=R.core_lifts,base=core.map(l=>[l,PV(l)]),cands=[null];
  for(const s of R.substitution.stand_ins)if(s.sexes.includes(table)&&!V[s.for].trained&&V[s.stand_in].value!=null)cands.push(s);
  const evaluate=sub=>{const sv=base.map(([l,v])=>sub&&l===sub.for?[sub.stand_in,PV(sub.stand_in)]:[l,v]);return [sv,CV?overallRankPos(R,sv):overallRank(R,sv,T)]};
  let best=null;for(const c of cands){const [sv,rk]=evaluate(c),ps=sv.map(([l,v])=>rk<20?(CV?posProgress(v,rk):liftProgress(v,T[l].ranks,rk)):1),key=[rk,rk<20?third(R,ps):1];
    if(!best||key[0]>best[0][0]||(key[0]===best[0][0]&&key[1]>best[0][1]))best=[key,c,sv,rk]}
  const [,sub,slots,computed]=best,[awarded,migrated]=awardedOf(dt,R,h,table,asOf),shown=Math.max(computed,awarded!=null?awarded:0),reach=Math.floor(shown/3);
  const hiddenStage=si=>!!R.stages[si].hidden_until_reached&&si>reach,nxt=shown<20?shown+1:null,[cbw,cbws]=currentBw(dt,h,asOf),step=R.targets.step[unit];
  const slotOut=[],ps=[];core.forEach((lc,i)=>{const [lu,v]=slots[i];
    if(CV){let p=nxt!=null?posProgress(v,shown):1;if(V[lu].value==null)p=0;ps.push(p);let tgt=null;
      if(nxt!=null){const kd=CV.tables[table][lu].kind,bars=(cbw||kd==='reps')?slBars(R,table,lu,cbw,unit,C.lb):null,t=bars?bars[nxt]:null;tgt={threshold:t,met:v!=null&&v>=nxt-EPS,kind:kd};
        if(kd==='load'){tgt.estimated_1rm=t;tgt.unit=bars?unit:null}else tgt.reps=Math.trunc(t)}
      slotOut.push({slot:lc,lift:lu,substituted:lu!==lc,value:V[lu].value,position:V[lu].position??null,progress:r4(p),target:tgt});return}
    const th=T[lu].ranks;let p=nxt!=null?liftProgress(v,th,shown):1;if(V[lu].value==null)p=0;ps.push(p);let tgt=null;
    if(nxt!=null){const t=th[nxt],met=v!=null&&v>=t-EPS;tgt={threshold:t,met,kind:R.lifts[lu].kind};
      if(R.lifts[lu].kind==='multiple'){tgt.estimated_1rm=cbw?Math.ceil(fromKg(t*scaleKg(R,table,cbw),unit,C)/step-1e-9)*step:null;tgt.unit=cbw?unit:null}else tgt.reps=Math.ceil((R.scaling&&cbw?t*scaleKg(R,table,cbw)/cbw:t)-1e-9)}
    slotOut.push({slot:lc,lift:lu,substituted:lu!==lc,value:V[lu].value,progress:r4(p),target:tgt})});
  const overall=nxt!=null?r4(third(R,ps)):null,lifts={},pct=CV?percentile(R,V,slots):null;for(const o of Object.values(V)){delete o._tiers;delete o._x}
  for(const [l,o] of Object.entries(V)){const k=CV?(o.position!=null?Math.min(20,Math.max(0,Math.floor(o.position+EPS))):null):liftRank(o.value,T[l].ranks),hid=k!=null&&hiddenStage(Math.floor(k/3));
    lifts[l]=Object.assign({},o,{core:R.lifts[l].core,kind:R.lifts[l].kind,rank_index:k,rank_id:k!=null?R.ranks[k].id:null,rank_label:k!=null?rankName(k,R,hid,opts.labels):null,rank_hidden:hid,
      label:o.status==='not_trained'?R.labels.not_trained:o.status==='needs_bodyweight'?R.labels.needs_bodyweight:null})}
  const ladder=R.stages.map((s,i)=>({stage:s.id,label:hiddenStage(i)?R.hidden.label:((opts.labels&&opts.labels.stages&&opts.labels.stages[s.id])||s.label),hidden:hiddenStage(i),reached:i<=reach}));
  const prev=awarded!=null?Math.floor(awarded/3):0,revealed=[];for(let i=prev+1;i<=reach;i++)if(R.stages[i].hidden_until_reached)revealed.push(R.stages[i].id);
  const lean=leanStatus(h,asOf,table,shown,R),nl=nxt!=null?rankName(nxt,R,hiddenStage(Math.floor(nxt/3)),opts.labels):null,needBw=Object.keys(V).filter(l=>V[l].status==='needs_bodyweight');
  const labels={rank:rankName(shown,R,false,opts.labels),next:nl,progress:nxt!=null?R.labels.progress_label.replace('{next}',nl):R.labels.top_rank,
    table:sex==='male'||sex==='female'?null:R.table_choice.unset_label,
    substitution:sub?R.substitution.label.replace('{stand_in}',R.lifts[sub.stand_in].label).replace('{lift}',R.lifts[sub.for].label.toLowerCase()):null,
    held:shown>computed?R.labels.held_note:null,weighted:Object.keys(V).some(l=>V[l].value!=null&&V[l].converted)?R.labels.weighted_note:null,
    bodyweight:needBw.length?R.bodyweight.missing_label.replace('{lifts}',needBw.map(l=>R.lifts[l].label.toLowerCase()).join(', ')):null,
    revealed:revealed.map(s=>R.hidden.reveal_label.replace('{stage}',R.stages[stageIdx(R,s)].label)),...(R.scaling?{scaled:R.labels.scaled_note}:{}),...(CV?{bars:R.labels.bars_note,percentile:pct.line}:{}),lean:lean.label??null,
    source_note:R.labels.source_note,model_note:R.labels.model_note,promotion_note:R.labels.promotion_note};
  const {badge,...leanOut}=lean;
  return {as_of:asOf,table,sex_set:sex==='male'||sex==='female',unit,
    rank:{index:shown,id:R.ranks[shown].id,stage:R.ranks[shown].stage,tier:R.ranks[shown].tier,label:rankName(shown,R,false,opts.labels),computed_index:computed,held:shown>computed},
    awarded_out:Object.assign({stage:R.ranks[shown].stage,tier:R.ranks[shown].tier},R.ladder_version?{ladder_version:R.ladder_version}:{}),...(R.migration?{awarded_migration:migrated}:{}),
    next:nxt!=null?{index:nxt,id:R.ranks[nxt].id,label:nl,hidden:hiddenStage(Math.floor(nxt/3))}:null,
    progress:{overall,pct:overall!=null?Math.floor(overall*100+1e-9):null,basis:'3rd-highest of 5 slots',slots:slotOut},
    substitution:sub?{stand_in:sub.stand_in,for:sub.for}:null,...(CV?{percentile:pct}:{}),lifts,ladder,newly_revealed:revealed,
    bodyweight_current:{kg:cbw?r4(cbw):null,source:cbws},badges:{plates:plateBadges(dt,h,R),lean_prime:badge},lean:leanOut,labels}}
// Python int() for a saved tier/index (str of digits, float truncates, bool 0/1); throws like ValueError/TypeError
function pyInt(x){if(typeof x==='boolean')return +x;if(typeof x==='number'){if(!Number.isFinite(x))throw 0;return Math.trunc(x)}
  if(typeof x==='string'&&/^\s*[+-]?\d+\s*$/.test(x))return parseInt(x,10);throw 0}
// saved award -> [floor index|null, migration|null]. No rules.migration (ladder v1): plain {stage, tier}. With it (ladder v2), an award without
// ladder_version >= migration.to_ladder_version is a v1 award ({stage,tier}, {index} or a bare int) and maps by threshold: the highest v2 rank
// whose core thresholds are all <= the v1 rank's x k x (1 + migration.tolerance), k = BW / S(BW) at as_of when scaled. Tolerance: migration only.
function awardedOf(dt,R,h,table,asOf){const a=(h.evolution||{}).awarded,M=R.migration;if(!M)return [rankIndex(R,a),null];
  const isObj=a&&typeof a==='object'&&!Array.isArray(a);
  if(isObj&&((a.ladder_version||1)>=M.to_ladder_version))return [rankIndex(R,a),null];
  if(typeof a==='boolean'||a==null)return [null,null];let old=null;
  if(typeof a==='number'&&Number.isInteger(a))old=a;
  else if(isObj&&typeof a.index==='number'&&Number.isInteger(a.index)&&!('stage' in a))old=a.index;
  else if(isObj){try{const si=M.old_stage_order.indexOf(a.stage);if(si<0)throw 0;old=3*si+pyInt(a.tier)-1}catch(e){old=null}}
  if(old==null||old<0||old>20)return [null,null];
  if(isObj&&'tier' in a){const t=pyInt(a.tier);if(t<1||t>3)return [null,null]}
  const OT=M.old_tables[table],mig=f=>[f,{from:`${M.old_stage_order[Math.floor(old/3)]}.${old%3+1}`,from_index:old,to:R.ranks[f].id,to_index:f}];
  if(R.curve){const C=R.curve,LC=lg(dt),tol=1+(M.tolerance||0),cbw=asOf?currentBw(dt,h,asOf)[0]:null,bl=cbw?cbw*LC.lb:C.anchor_bw_lb[table];
    return mig(migrationFloorSl(C,table,OT,R.core_lifts,old,bl,tol,LC.lb,hiddenStarts(R)))}
  const T=R.tables[table];let floor=0,k=1;
  if(R.scaling){const cbw=asOf?currentBw(dt,h,asOf)[0]:null;if(cbw)k=cbw/scaleKg(R,table,cbw)}
  const tol=1+(M.tolerance||0);
  for(let i=0;i<21;i++)if(R.core_lifts.every(l=>T[l].ranks[i]<=OT[l][old]*k*tol+EPS))floor=i;
  return [floor,{from:`${M.old_stage_order[Math.floor(old/3)]}.${old%3+1}`,from_index:old,to:R.ranks[floor].id,to_index:floor}]}
// finish screen: the moment shows only when the shown rank went up
const rankUp=(b,a)=>!!(b&&a&&a.rank.index>b.rank.index);
// storyboard hint (one line on what to lift next): the slot below the next rank needing the smallest step from its current best, as a target
// estimated 1RM (Coach's target) or strict reps; null at the top rank
function nextHint(rep,dt,h){if(!rep.next)return null;const R=rulesOf(dt),C=lg(dt),u=rep.unit,cbw=rep.bodyweight_current.kg,sbw=cbw?scaleKg(R,rep.table,cbw):cbw;let best=null;
  for(const s of rep.progress.slots){const t=s.target;if(!t||t.met)continue;const name=R.lifts[s.lift].label.toLowerCase();let gap,text;
    if(t.kind==='load'){if(t.estimated_1rm==null)continue;const cur=s.value!=null?s.value:0,st=R.targets.step[u],add=Math.max(st,Math.ceil((t.estimated_1rm-cur)/st-1e-9)*st);
      gap=s.value!=null?(t.threshold-s.value)/t.threshold:1;text=s.value!=null?`+${add} ${u} ${name} (estimated 1RM ${t.estimated_1rm} ${u})`:`${name}: estimated 1RM ${t.estimated_1rm} ${u}`}
    else if(t.kind==='multiple'){if(t.estimated_1rm==null)continue;const cur=s.value!=null&&cbw?fromKg(s.value*sbw,u,C):0;const add=Math.max(R.targets.step[u],Math.ceil((t.estimated_1rm-cur)/R.targets.step[u]-1e-9)*R.targets.step[u]);
      gap=s.value!=null?(t.threshold-s.value)/t.threshold:1;text=s.value!=null?`+${add} ${u} ${name} (estimated 1RM ${t.estimated_1rm} ${u})`:`${name}: estimated 1RM ${t.estimated_1rm} ${u}`}
    else{const cur=s.value||0,add=Math.max(1,t.reps-cur);gap=t.reps?add/t.reps:1;text=`+${add} strict ${name} rep${add>1?'s':''} (${t.reps} total)`}
    if(!best||gap<best.gap-EPS)best={lift:s.lift,slot:s.slot,gap,text}}
  return best}
const API={EPS,SL,slBars,percentile,hiddenStarts,migrationPartsSl,migrationFloorSl,migrationFloorSl3of5,migrationFloorSlAll5,scaleKg,awardedOf,rulesOf,rankName,rankIndex,report,rankUp,nextHint,liftValues,plateBadges,plateEntries,newPlates,leanStatus,ageOf};
if(isNode)module.exports=API;else root.LADDER=API;
})(typeof window!=='undefined'?window:globalThis);
