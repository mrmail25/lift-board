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
function liftValues(dt,h,R){const C=lg(dt),P=PG(),bwt=bwTable(h,C),pkg=profileBwKg(h,C),EX=exTable(dt,h),ex2={};
  for(const [l,m] of Object.entries(R.lifts))for(const i of m.exercise_ids)ex2[i]=l;
  const out={};for(const l of Object.keys(R.lifts))out[l]={status:'not_trained',value:null,trained:false,unrated_sets:0};
  for(const q of P.flatten(dt,h)){const s=q.s;if(s.deload===true)continue;const day=P.localDate(s.startedAt||s.date);
    for(const x of q.sets){const l=ex2[x.ex];if(!l||x.kind!=='working'||x.reps<1)continue;const kind=R.lifts[l].kind,o=out[l],r=x.reps,added=x.added_kg;
      let v=null,conv=false;const [bw,bws]=bodyweightFor(bwt,day,pkg);
      if(kind==='multiple'){if(r>C.mx||excluded(C,x,'e1rm')||added<=EPS)continue;o.trained=true;if(bw==null){o.unrated_sets++;continue}v=e1(C,added,r)/bw}
      else{if(added<-EPS)continue;
        if(added<=EPS){if(excluded(C,x,'reps_at_load'))continue;o.trained=true;v=r}
        else{if(r>C.mx||excluded(C,x,'e1rm'))continue;o.trained=true;if(bw==null){o.unrated_sets++;continue}
          const f=(EX[x.ex]||{}).bodyweight_fraction||0.95;v=Math.floor(30*((f*bw+added)*(1+r/30)/(f*bw)-1)+1e-9);conv=true}}
      if(o.value==null||v>o.value+EPS)Object.assign(o,{status:'rated',value:v,set_id:x.id,date:day,converted:conv,bodyweight_kg:bw!=null?r4(bw):null,bodyweight_source:bw!=null?bws:null})}}
  for(const o of Object.values(out)){if(o.trained&&o.value==null)o.status='needs_bodyweight';if(o.value!=null)o.value=r4(o.value)}return out}
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
function plateBadges(dt,h,R){const C=lg(dt),P=PG(),PB=R.plate_badges;let unit=((h.settings||{}).unit)||'lb';unit=unit==='lb'||unit==='kg'?unit:'lb';const plates=PB[unit],ex2={},got={};
  for(const [l,m] of Object.entries(R.lifts))for(const i of m.exercise_ids)ex2[i]=l;
  for(const q of P.flatten(dt,h)){const s=q.s;if(s.deload===true)continue;const day=P.localDate(s.startedAt||s.date);
    for(const x of q.sets){const l=ex2[x.ex];if(!(l in PB.lifts)||x.kind!=='working'||x.reps<1||excluded(C,x,'weight'))continue;const ld=fromKg(x.added_kg,unit,C);
      plates.slice(0,PB.lifts[l]).forEach((p,k)=>{if(ld>=p-0.01&&!got[l+'|'+k])got[l+'|'+k]=[day,x.id]})}}
  const out=[];for(const [l,n] of Object.entries(PB.lifts))for(let k=0;k<n;k++){const g=got[l+'|'+k];
    out.push({id:`${l}.plates${k+1}`,lift:l,plates:k+1,load:plates[k],unit,label:`${PB.labels[String(k+1)]} (${plates[k]} ${unit}) ${R.lifts[l].label.toLowerCase()}`,earned:!!g,date:g?g[0]:null,set_id:g?g[1]:null})}
  return out}
function report(dt,h,asOf,opts){opts=opts||{};const R=rulesOf(dt),C=lg(dt),sex=prof(h).sex,table=sex==='male'||sex==='female'?R.table_choice[sex]:R.table_choice.unset,T=R.tables[table];
  let unit=((h.settings||{}).unit)||'lb';unit=unit==='lb'||unit==='kg'?unit:'lb';
  const V=liftValues(dt,h,R),core=R.core_lifts,base=core.map(l=>[l,V[l].value]),cands=[null];
  for(const s of R.substitution.stand_ins)if(s.sexes.includes(table)&&!V[s.for].trained&&V[s.stand_in].value!=null)cands.push(s);
  const evaluate=sub=>{const sv=base.map(([l,v])=>sub&&l===sub.for?[sub.stand_in,V[sub.stand_in].value]:[l,v]);return [sv,overallRank(R,sv,T)]};
  let best=null;for(const c of cands){const [sv,rk]=evaluate(c),ps=sv.map(([l,v])=>rk<20?liftProgress(v,T[l].ranks,rk):1),key=[rk,rk<20?third(R,ps):1];
    if(!best||key[0]>best[0][0]||(key[0]===best[0][0]&&key[1]>best[0][1]))best=[key,c,sv,rk]}
  const [,sub,slots,computed]=best,awarded=rankIndex(R,(h.evolution||{}).awarded),shown=Math.max(computed,awarded!=null?awarded:0),reach=Math.floor(shown/3);
  const hiddenStage=si=>!!R.stages[si].hidden_until_reached&&si>reach,nxt=shown<20?shown+1:null,[cbw,cbws]=currentBw(dt,h,asOf),step=R.targets.step[unit];
  const slotOut=[],ps=[];core.forEach((lc,i)=>{const [lu,v]=slots[i],th=T[lu].ranks;let p=nxt!=null?liftProgress(v,th,shown):1;if(V[lu].value==null)p=0;ps.push(p);let tgt=null;
    if(nxt!=null){const t=th[nxt],met=v!=null&&v>=t-EPS;tgt={threshold:t,met,kind:R.lifts[lu].kind};
      if(R.lifts[lu].kind==='multiple'){tgt.estimated_1rm=cbw?Math.ceil(fromKg(t*cbw,unit,C)/step-1e-9)*step:null;tgt.unit=cbw?unit:null}else tgt.reps=Math.ceil(t-1e-9)}
    slotOut.push({slot:lc,lift:lu,substituted:lu!==lc,value:V[lu].value,progress:r4(p),target:tgt})});
  const overall=nxt!=null?r4(third(R,ps)):null,lifts={};
  for(const [l,o] of Object.entries(V)){const th=T[l].ranks,k=liftRank(o.value,th),hid=k!=null&&hiddenStage(Math.floor(k/3));
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
    revealed:revealed.map(s=>R.hidden.reveal_label.replace('{stage}',R.stages[stageIdx(R,s)].label)),lean:lean.label??null,
    source_note:R.labels.source_note,model_note:R.labels.model_note,promotion_note:R.labels.promotion_note};
  const {badge,...leanOut}=lean;
  return {as_of:asOf,table,sex_set:sex==='male'||sex==='female',unit,
    rank:{index:shown,id:R.ranks[shown].id,stage:R.ranks[shown].stage,tier:R.ranks[shown].tier,label:rankName(shown,R,false,opts.labels),computed_index:computed,held:shown>computed},
    awarded_out:{stage:R.ranks[shown].stage,tier:R.ranks[shown].tier},
    next:nxt!=null?{index:nxt,id:R.ranks[nxt].id,label:nl,hidden:hiddenStage(Math.floor(nxt/3))}:null,
    progress:{overall,pct:overall!=null?Math.floor(overall*100+1e-9):null,basis:'3rd-highest of 5 slots',slots:slotOut},
    substitution:sub?{stand_in:sub.stand_in,for:sub.for}:null,lifts,ladder,newly_revealed:revealed,
    bodyweight_current:{kg:cbw?r4(cbw):null,source:cbws},badges:{plates:plateBadges(dt,h,R),lean_prime:badge},lean:leanOut,labels}}
// finish screen: the moment shows only when the shown rank went up
const rankUp=(b,a)=>!!(b&&a&&a.rank.index>b.rank.index);
// storyboard hint (one line on what to lift next): the slot below the next rank needing the smallest step from its current best, as a target
// estimated 1RM (Coach's target) or strict reps; null at the top rank
function nextHint(rep,dt,h){if(!rep.next)return null;const R=rulesOf(dt),C=lg(dt),u=rep.unit,cbw=rep.bodyweight_current.kg;let best=null;
  for(const s of rep.progress.slots){const t=s.target;if(!t||t.met)continue;const name=R.lifts[s.lift].label.toLowerCase();let gap,text;
    if(t.kind==='multiple'){if(t.estimated_1rm==null)continue;const cur=s.value!=null&&cbw?fromKg(s.value*cbw,u,C):0;const add=Math.max(R.targets.step[u],Math.ceil((t.estimated_1rm-cur)/R.targets.step[u]-1e-9)*R.targets.step[u]);
      gap=s.value!=null?(t.threshold-s.value)/t.threshold:1;text=s.value!=null?`+${add} ${u} ${name} (estimated 1RM ${t.estimated_1rm} ${u})`:`${name}: estimated 1RM ${t.estimated_1rm} ${u}`}
    else{const cur=s.value||0,add=Math.max(1,t.reps-cur);gap=t.reps?add/t.reps:1;text=`+${add} strict ${name} rep${add>1?'s':''} (${t.reps} total)`}
    if(!best||gap<best.gap-EPS)best={lift:s.lift,slot:s.slot,gap,text}}
  return best}
const API={EPS,rulesOf,rankName,rankIndex,report,rankUp,nextHint,liftValues,plateBadges,leanStatus,ageOf};
if(isNode)module.exports=API;else root.LADDER=API;
})(typeof window!=='undefined'?window:globalThis);
