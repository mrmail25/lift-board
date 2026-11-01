/* vol13 (CoS #4 / override 6): the Nurd Sh!t (Learn) articles brought to the CURRENT model at render time, without editing Coach's
   education files (data/education is Coach's synced copy). LEARNFIX.page(id, json, dt) returns a patched deep copy:
   face-value weekly sets (no session discount), the anchored curve with the 60% minimum (rule of thumb), per-approach per-workout
   limits that are info only and strictly greater-than, per-muscle S:F, fatigue in fresh-set equivalents, recovery as ranges in days.
   Numbers are read from the data (volume-model.json curve.anchors_rule, rules.json session_efficiency); citations are the existing
   reference keys or the data's own .nurd objects (rendered as 'Source: ...'), never invented. */
(function(root){'use strict';
const clone=o=>JSON.parse(JSON.stringify(o));
const nf=x=>String(+(+x).toFixed(1));
function vals(dt){const VM=(dt&&dt.VM)||{},AR=((VM.curve||{}).anchors_rule||{}).used||{min:60,sweet_low:76,sweet_high:86,dim:89},R=((dt&&dt.rules&&dt.rules.rules)||[]).find(r=>r.id==='session_efficiency')||{},SC=R.size_class||{},G=R.limits_by_goal||{};
  const lim=(g,lv)=>['big','medium','small'].map(k=>{const L=(G[g]||{})[lv]||{};return L[(SC[k]||[])[0]]}).map(x=>x==null?'–':nf(x)).join(' / ');
  const DM=VM.day_metrics||{};return {AR,lim,nurdF:(DM.fatigue||{}).nurd,nurdSF:(((VM.visuals||{}).body_map||{}).efficiency||{}).nurd||(DM.sf_ratio||{}).nurd,nurdRec:(DM.recovery||{}).nurd,nurdSE:R.nurd,
    lab:{efficient:'Efficient',max_growth:'Max volume'}}}
const P=(text,o={})=>Object.assign({text,evidence:'modeled'},o);
const MODEL_SEC=v=>({id:'model-day',heading:'Fatigue, efficiency and recovery',body:['Each day on the Plan shows three modeled numbers. They are planning estimates for comparing plans, not measurements.'],
  points:[P('Fatigue is whole-body fatigue in fresh-set equivalents, counted once per set: 1 = one fresh hard set of machine chest press at 2 RIR. Heavy squats and hinges cost more, isolation less.',{nurd:v.nurdF}),
    P('S:F (stimulus per fatigue) is per muscle only: the stimulus on that muscle divided by the whole-set fatigue of the sets that trained it, then scored against its size class (big, medium or small reference; 1.00 = a heavy compound with the muscle as prime mover). Helper-only credit from heavy lifts scores low. It colours the Impact body map; there is no day-level or weekly S:F.',{nurd:v.nurdSF}),
    P('Recovery is a modeled range in days per muscle (for example 2–4 d), never exact hours. The week strip shows when each muscle is ready again.',{nurd:v.nurdRec})]});
function fixSetCrediting(j,v){const S=j.sections||[],s0=S.find(s=>s.id==='counting'),cv=S.find(s=>s.id==='curve'),w=S.find(s=>s.id==='warnings');
  if(s0){s0.body=s0.body.map(b=>b.replace(', and the total is rounded for display',', and totals are shown to one decimal'));
    if(s0.points[2])s0.points[2]=P('Weekly totals are shown to one decimal (7.3, 14.4), the same in every header and sheet.');
    if(s0.points[3])s0.points[3].text=s0.points[3].text.replace(/, which the board shows as [\d.]+\./,', which the board shows as 6.4.')}
  if(cv){cv.body=['The curve turns weekly effective sets into a relative stimulus score so you can see diminishing returns. It is a model for comparing plans, not a measurement of growth.','Every effective set counts at face value for the week; there is no per-session discount. How sets are spread over the week is handled by the per-workout limits (info only), not by the curve.'];
    const cit=(cv.points[0]||{}).citations||['schoenfeld2017dose','pelland2026'];
    cv.points=[P(`The curve is anchored per muscle and level: about ${nf(v.AR.min)}% of the modeled plateau at the weekly minimum, ${nf(v.AR.sweet_low)}–${nf(v.AR.sweet_high)}% across the sweet spot and ${nf(v.AR.dim)}% at diminishing returns.`,{citations:cit}),
      P(`The ${nf(v.AR.min)}% minimum is a rule of thumb, not a measured value; where a level's minimum sits only 2 sets below the sweet spot it is raised slightly so the curve keeps diminishing returns.`),
      P('Weekly effective sets are summed at face value: 5 + 5 sets on two days give the same weekly value as 10 in one day.'),
      cv.points[6]||P('The value of one more set is the rise of the curve at your current weekly total, shown as a percent of the plateau.')]}
  if(w){w.points=w.points.map(p=>/about 10 effective sets/.test(p.text)?P(`Each approach has a per-workout limit per muscle: ${v.lab.efficient} ${v.lim('efficient','intermediate')} and ${v.lab.max_growth} ${v.lim('max_growth','intermediate')} effective sets (big / medium / small muscles, intermediate). The app flags a muscle only when its sets are more than the limit. It is info only: every set still counts for the week.`,{nurd:v.nurdSE}):p)}
  return j}
function fixVolFreq(j,v){const S=j.sections||[],se=S.find(s=>s.id==='sessions');if(j.app_link&&j.app_link.features)j.app_link.features=j.app_link.features.map(f=>/session discount/.test(f)?'Stimulus curve (volume-model.json curve)':f);
  if(se){se.body=['Within one session, sets for the same muscle seem to give diminishing returns, and fatigue builds. The app shows this as per-workout limits that are info only; the weekly total always counts every set at face value.','These are rules of thumb. No study has set an exact per-session ceiling.'];
    se.points=[P(`Per-workout limits by approach: ${v.lab.efficient} ${v.lim('efficient','intermediate')}, ${v.lab.max_growth} ${v.lim('max_growth','intermediate')} effective sets (big / medium / small, intermediate). A muscle is flagged only when it is more than its limit.`,{nurd:v.nurdSE}),...se.points.slice(1)]}
  return j}
function fixStim(j,v){const S=j.sections||[],pt=S.find(s=>s.id==='putting-together');if(pt&&pt.points[2])pt.points[2]=P('Every effective set counts at face value for the week. Per-workout limits are info only: they suggest spreading or trimming sets, they never discount them.',{nurd:v.nurdSE});
  j.notes=(j.notes||[]).map(n=>n.replace('session discount','per-workout limits'));if(!S.some(s=>s.id==='model-day'))S.push(MODEL_SEC(v));return j}
function fixMuscle(j){const r=j.relationships;if(r&&typeof r.indirect_note==='string')r.indirect_note=r.indirect_note.replace(/, which the panel shows as [\d.]+ \(rounded to the nearest 0\.5\)/,', which the app shows to one decimal');return j}
const CACHE=new Map();
function page(id,j,dt){if(!j)return j;if(CACHE.has(j))return CACHE.get(j);const v=vals(dt);let o=clone(j);
  if(id==='set-crediting-targets')o=fixSetCrediting(o,v);else if(id==='volume-frequency')o=fixVolFreq(o,v);else if(id==='hypertrophy-stimulus')o=fixStim(o,v);else if(o.kind==='muscle'||o.relationships)o=fixMuscle(o);
  if(dt&&dt.rules)CACHE.set(j,o);return o}
// vol13 citation fixes (CoS, from volume-model.json vol13.citation_fixes + the sources block): applied wherever a .nurd source renders.
// Remmert = SportRxiv PREPRINT + MSSE 2026 conference ABSTRACT (first author Joachim), not peer-reviewed. Pelland = Sports Med 56(2):481-505 (2026; online Dec 2025).
// Krieger's per-session analysis is unpublished and unverified: never used for a claim here.
const RM_ABS='https://doi.org/10.1249/01.mss.0001259712.79343.1b';
function nurd(n){if(!n||typeof n!=='object')return n;const o=Object.assign({},n),sh=String(o.short||'');
  if(/srxiv\.537/.test(o.url||'')||/Remmert et al\.? 2025/.test(sh)){o.short=sh.replace(/Remmert et al\.? 2025,? SportRxiv( \(preprint\))?/,'Remmert et al. SportRxiv preprint (2025) + Joachim, Remmert et al. MSSE 58(10S) abstract (2026)');o.type='PREPRINT + ABSTRACT (not peer-reviewed)';
    o.links=[{href:o.url||'https://doi.org/10.51224/srxiv.537',text:'preprint'},{href:RM_ABS,text:'abstract, doi 10.1249/01.mss.0001259712.79343.1b'}];o.url=null}
  if(/Pelland et al\.? 2025, Sports Medicine/.test(sh))o.short=sh.replace(/Pelland et al\.? 2025, Sports Medicine/,'Pelland et al. 2026, Sports Medicine 56(2):481–505 (online Dec 2025)');
  if(/Krieger/.test(o.note||'')&&/unpublished/i.test(o.note||''))o.note=o.note+' (Krieger analysis: unpublished, unverified; not used for any claim.)';
  return o}
function srcHtml(n,cls){n=nurd(n);if(!n)return '';const L=(n.links||[]).map(l=>`<a href="${l.href}" target="_blank" rel="noopener">${l.text}</a>`).join(' · ');
  return `<p class="${cls||'ptsrc'}">Source: ${n.url?`<a href="${n.url}" target="_blank" rel="noopener">${n.short}</a>`:n.short}${n.type?` · ${n.type}`:''}${L?` (${L})`:''}${cls==='nsrc'?'.'+(n.note?` ${n.note}`:''):''}</p>`}
const API={page,vals,nurd,srcHtml};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.LEARNFIX=API})(typeof window!=='undefined'?window:globalThis);
