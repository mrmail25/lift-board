/* Program check card priority (Round 3): a line-for-line port of Coach's tools/check_priority.py issues() / top(), with the
   weights from rules.json check_priority (data/check-priority-weights.json v2, merged as-is). score = severity x importance x
   fixability; importance = check weight x muscle weight; severity = band lo + (hi - lo) x distance. Card order (CoS call
   2026-10-23, weights v2 sort_order): state first (red, then amber), score only orders issues within a state; info-state issues
   and excluded sources (lower_fatigue_swap) never show (card_states / exclude_kinds); no minimum score; an issue with no
   validated fix has action 'see_analysis' and fix null (no Apply / Undo). Cap 3.
   STATE_FIRST is the one switch: false gives the v1 order (score first, then state) with v1's min_score, for comparison only.
   r3fu (2026-10-23): every issue carries a real analysis_item id plus analysis_item_muscle.
   Parity: node test/checkpriority.diff.js (vs data/check-priority-reference.json, 46 presets). Browser: window.CHECKPRIORITY. */
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const RANK=isNode?require('./rank.js'):root.RANK,PC=isNode?require('./progcheck.js'):root.PCHECK,AN=isNode?require('./analysis.js'):root.ANALYSIS;
const pyR=RANK.pyRound,ORDER=PC.ORDER,STATE_RANK={red:0,amber:1,info:2};
let STATE_FIRST=true;
const W=dt=>dt.rules.check_priority;
function cfg(dt){if(dt._cp)return dt._cp;const w=W(dt),CW=w.importance.check_weight,FAM={};for(const [f,v] of Object.entries(CW))for(const s of v.sources)FAM[s]=f;
  return dt._cp={w,CW,FAM,BAND:w.severity.state_band,FIX:w.fixability.rules,EXCL:new Set(Object.keys(w.excluded_sources||{})),MW:w.importance.muscle_weight,BOARD:w.importance.board_level_muscle_weight}}
const band=(dt,m,level)=>{const T=dt.targets.targets[m],LF=dt.targets.levelMinFactor;return [pyR(T.min*LF[level]*2)/2,T.max]};
function _muscle(src,tg){if(tg.muscle)return tg.muscle;const f=tg.flag;if(!f)return null;const r=f[1];
  if(['missing_stretch','low_frequency','weekly_volume'].includes(r))return f[2];if(r==='junk_volume_session'||r==='consecutive_high_volume')return f[3];if(r==='redundant_pattern')return f[5];return null}
function _distance(dt,src,tg,level){const f=tg.flag,r=f?f[1]:src,cl=x=>Math.max(0,Math.min(1,x)),RU={};dt.rules.rules.forEach(q=>RU[q.id]=q);
  if(src==='weekly_band'||r==='weekly_volume'){const m=_muscle(src,tg),x='sets' in tg?tg.sets:(f?f[3]:0),[lo,hi]=band(dt,m,level);return x<lo?cl((lo-x)/lo):cl((x-hi)/hi)}
  if(src==='stretch_share')return cl((0.25-tg.share)/0.25);if(r==='missing_stretch')return 1.0;
  if(src==='effective_frequency')return cl((2-tg.days)/2);if(r==='low_frequency')return cl((2-f[3])/2);
  if(r==='session_length'){const sl=RU.session_length;return f[0]==='info'?cl((f[3]-sl.info_min)/(sl.warn_min-sl.info_min)):cl((f[3]-sl.warn_min)/30)}
  if(r==='session_hard_sets'){const hs=RU.session_hard_sets,w=hs.warn_above[level];return f[0]==='info'?cl((f[3]-(w-hs.info_band))/hs.info_band):cl((f[3]-w)/w)}
  if(r==='junk_volume_session')return cl((f[4]-10)/10);if(r==='redundant_pattern')return cl((f[6]-10)/10);if(r==='pattern_gap')return cl((f[4]-f[3])/f[4]);
  if(r==='push_pull_imbalance'){const x=f[2];return cl((x<0.75?0.75-x:x-2.0)/0.75)}
  if(src==='recovery_vs_baseline')return cl(((tg.ratio!=null?tg.ratio:1.3)-1.15)/0.35);return 1.0}
function _state(C,src,sev){const fam=C.FAM[src];if(fam==='frequency'||fam==='lower_back')return 'info';if(src==='weekly_band'||src==='stretch_share')return 'amber';return ({warn:'red',info:'info'})[sev]||'amber'}
function _fix(C,fixes){if(!fixes.length)return [null,C.FIX[C.FIX.length-1]];
  const best=fixes.map((f,i)=>[f,i]).sort((a,b)=>(!a[0].resolves-!b[0].resolves)||(a[0].diff.length-b[0].diff.length)||a[1]-b[1])[0][0],n=best.diff.length;
  const rule=C.FIX[best.resolves&&n===1?0:best.resolves&&n===2?1:best.resolves?2:3];
  return [{ops:best.diff,preview:best.preview,resolves:best.resolves,undo:AN.invertOps(best.diff)},rule]}
function _where(dt,days,level,tg,m,FD){const f=tg.flag;if(f){const k=JSON.stringify(f);for(const x of FD())if(JSON.stringify(x.flag)===k)return [x.days,x.exercises]}
  if(m){const mr=((dt.targets.counting||{}).min_rating_to_count??0.25),hit=[];days.forEach(d=>d.tiles.forEach(t=>{if((dt.EX[t.id].muscles[m]||0)>=mr)hit.push([d.day,t.id])}));
    return [[...new Set(hit.map(h=>h[0]))].sort((a,b)=>ORDER.indexOf(a)-ORDER.indexOf(b)),[...new Set(hit.map(h=>h[1]))].sort()]}
  return [[],[]]}
// r3fu: analysis_item is always a real rules.json analysis_metrics item id (weights analysis_item block): missing_stretch ->
// stretch_<m> for a stretch_check.checked muscle, else stretch_coverage; stretch_share / session_hard_sets / session_length ->
// analysis_item.item_by_source; any other source -> check_weight[family].item. analysis_item_muscle = the row to highlight (null = board).
function _item(C,src,fam,m,chk){if(src==='missing_stretch'||(C.FAM[src]==='stretch'&&src!=='stretch_share'))return m in chk?`stretch_${m}`:'stretch_coverage';
  const IB=((C.w.analysis_item||{}).item_by_source)||{};return IB[src]||C.CW[fam].item}
const cmp=(a,b)=>{for(let k=0;k<a.length;k++){if(a[k]<b[k])return -1;if(a[k]>b[k])return 1}return 0};
function sortKey(i){const s=STATE_RANK[i.state];return STATE_FIRST?[s,-i.score,-i.distance,-i.importance.muscle_weight,i.id]:[-i.score,s,-i.distance,-i.importance.muscle_weight,i.id]}
// every candidate issue, scored and deduped (one per family + muscle / day), in card order. sheet: pass the caller's ANALYSIS.sheet() to reuse it
function issues(dt,days,level,baseline=null,sheet=null){const C=cfg(dt),out=new Map();let fd=null;const FD=()=>fd||(fd=AN.flagDetails(dt,days,level,null));
  const chk=(dt.rules.stretch_check||{}).checked||{};
  for(const e of sheet||AN.sheet(dt,days,level,baseline)){const src=e.source;if(C.EXCL.has(src)||!(src in C.FAM))continue;
    const fam=C.FAM[src],tg=e.target||{},f=tg.flag,m=_muscle(src,tg),st=_state(C,src,e.severity),[lo,hi]=C.BAND[st],d=pyR(_distance(dt,src,tg,level),4);
    const sev=pyR(lo+(hi-lo)*d,4),mw=m?(m in C.MW?C.MW[m]:C.BOARD):C.BOARD,cw=C.CW[fam].weight,[fix,fr]=_fix(C,e.fixes);
    const key=m||(f&&f.length>2&&typeof f[2]==='string'?f[2]:'board'),[dd,ex]=_where(dt,days,level,tg,m,FD);
    const it={id:`${fam}:${key}`,family:fam,source:src,analysis_item:_item(C,src,fam,m,chk),analysis_item_muscle:m||null,state:st,muscle:m,days:dd,exercises:ex,target:tg,distance:d,
      severity:sev,importance:{check_weight:cw,muscle_weight:mw,value:pyR(cw*mw,4)},fixability:{rule:fr.id,value:fr.value},score:pyR(sev*cw*mw*fr.value,4),
      action:fix?'apply':((C.w.no_fix_action||{}).action||'see_analysis'),fix};
    const o=out.get(it.id);if(!o||it.score>o.score)out.set(it.id,it)}
  return [...out.values()].sort((a,b)=>cmp(sortKey(a),sortKey(b)))}
// the Program check card: card_states only (red, amber), card order, cap. v1 mode (STATE_FIRST false) keeps info and applies min_score.
function top(dt,days,level,baseline=null,cap=null,sheet=null){const w=cfg(dt).w,L=issues(dt,days,level,baseline,sheet);
  const keep=STATE_FIRST?L.filter(i=>(w.card_states||['red','amber']).includes(i.state)):L.filter(i=>i.score>=(w.min_score??0.08));return keep.slice(0,cap||w.cap)}
const API={issues,top,sortKey,setStateFirst:v=>{STATE_FIRST=!!v},get STATE_FIRST(){return STATE_FIRST},_x:{_distance,_state,_muscle,_fix,band}};
if(isNode)module.exports=API;else root.CHECKPRIORITY=API;
})(this);
