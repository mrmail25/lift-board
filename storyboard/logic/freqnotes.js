/* Frequency one-liners (Round 3): a line-for-line port of Coach's tools/frequency_notes.py notes(): good and bad notes with
   the muscle(s) they name and a link {muscle, anchor: deepdive-<m>-frequency | -session}. Templates: data/frequency-notes.json
   (pass its templates). Order: negative first, muscle notes before board notes, by muscle weight (rules.json check_priority)
   then muscle id, then template id. Scheduling suggestions from a model, not measurements.
   Parity: node test/freqnotes.diff.js (vs data/frequency-notes.json presets). Browser: window.FREQNOTES. */
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const RANK=isNode?require('./rank.js'):root.RANK,PC=isNode?require('./progcheck.js'):root.PCHECK;
const DAYN={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
const label=m=>m.replace(/_/g,' ');const cap=s=>s?s[0].toUpperCase()+s.slice(1).toLowerCase():s;
function notes(dt,days,level,templates){const T={};templates.forEach(t=>T[t.id]=t);
  const N=(tid,muscles,anchor,kw={})=>{const t=T[tid],m0=muscles[0]||null;const txt=t.text.replace(/\{(\w+)\}/g,(_,k)=>k==='Muscle'?(m0?cap(label(m0)):''):String(kw[k]));
    return {id:tid,polarity:t.polarity,muscles,text:txt,link:{muscle:m0,anchor:m0?`deepdive-${m0}-`+(anchor||'frequency'):null}}};
  const [fl]=PC.check(dt,days,level),train=days.filter(d=>d.tiles.length);let out=[];if(!train.length)return out;
  const fmin=2,eff={};train.forEach(d=>eff[d.day]=PC.eff(dt,d.tiles));const FM=dt.rules.frequency_muscles,ORDER=PC.ORDER;
  for(const m of FM){const hit=train.filter(d=>eff[d.day][m]>=fmin).map(d=>d.day);
    if(train.length>=2&&hit.length===1)out.push(N('freq_one_day',[m],null,{day_name:DAYN[hit[0]]}));else if(!hit.length)out.push(N('freq_none',[m]));else if(hit.length>=2)out.push(N('freq_two_plus',[m],null,{n:hit.length}))}
  for(const f of fl){if(f[1]==='consecutive_high_volume'){const nx=ORDER[ORDER.indexOf(f[2])+1];out.push(N('back_to_back',[f[3]],null,{day1:DAYN[f[2]],day2:DAYN[nx]}))}
    if(f[1]==='junk_volume_session')out.push(N('crowded_session',[f[3]],'session',{sets:fmtPy1(f[4]),day_name:DAYN[f[2]]}))}
  if(train.length>=2&&FM.every(m=>Object.keys(eff).filter(d=>eff[d][m]>=fmin).length>=2)){out=out.filter(n=>n.id!=='freq_two_plus');out.push(N('freq_all_main_twice',[]))}
  if(!fl.some(f=>f[1]==='junk_volume_session'))out.push(N('session_cap_ok',[]));
  const imp=((dt.rules.check_priority||{}).importance||{}).muscle_weight||{};
  const key=n=>[n.polarity!=='negative'?1:0,n.muscles.length===0?1:0,n.muscles.length?-(imp[n.muscles[0]]||0):0,n.muscles[0]||'',n.id];
  const cmp=(a,b)=>{for(let k=0;k<a.length;k++){if(a[k]<b[k])return -1;if(a[k]>b[k])return 1}return 0};
  return out.map((n,i)=>[n,i]).sort((a,b)=>cmp(key(a[0]),key(b[0]))||a[1]-b[1]).map(x=>x[0])}
// Python str(round(x, 1)): 12.0 -> "12.0"
const fmtPy1=x=>{const v=RANK.pyRound(x,1);return Number.isInteger(v)?v.toFixed(1):String(v)};
const API={notes,DAYN};
if(isNode)module.exports=API;else root.FREQNOTES=API;
})(this);
