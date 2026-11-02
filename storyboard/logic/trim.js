/* vol10b 'Trim to efficient': port of rules.json rules[id=efficient_trim] (Coach, vol10b).
   Presets: the board uses Coach's own trimmed set counts (data/splits-efficient-diff.json presets["split/level/days"].changes)
   when it still matches an untouched preset. Custom boards: this port of the rule, with pool C (removing a 1-set exercise)
   turned off so every tile keeps at least 1 set (Mr Dude via CoS: only set counts change).
   Rule: checker with goal efficient -> session_efficiency flags ordered by day (mon..sun), larger excess, muscle A-Z. For the first
   flag with a feasible cut, cut 1 set from the first candidate: pool A = wasted-late-set tiles with >= 2 sets, B = any tile crediting
   the muscle with >= 2 sets, C = 1-set tiles (remove; late first, only if A and B have no feasible cut). Within a pool: lowest per-set
   stimulus:fatigue for the muscle (credit / (per-set fatigue x rating share), 0.01), then latest tile, then id A-Z. Constraints:
   every muscle the exercise credits stays >= its weekly zone minimum (0.01; a muscle already below may not be reduced), no new
   non-info flag other than session_efficiency, never empty a day. Repeat until no flag is left or all remaining are blocked.
   trim(dt, days, level, {goal, allowRemove}) -> {days, ops:[{day, i, id, from, to}], removed, residual:[{day, muscle}]} */
(function(root){
const isNode=typeof module!=='undefined'&&module.exports,PCm=()=>isNode?require('./progcheck.js'):root.PCHECK,DMm=()=>isNode?require('./daymetrics.js'):root.DAYMX;
const DO=['mon','tue','wed','thu','fri','sat','sun'],r2=x=>Math.round(x*100)/100;
const clone=days=>days.map(d=>({day:d.day,tiles:d.tiles.map(t=>Object.assign({},t))}));
function weekly(PC,dt,days){const W={};for(const d of days){const e=PC.eff(dt,d.tiles);for(const m in e)W[m]=(W[m]||0)+e[m]}return W}
const keyF=f=>JSON.stringify(f);
// vol11b: rules.json rules[id=efficient_trim].algorithm (Coach), step for step; returns a trace like the reference case
function trim(dt,days0,lv,o={}){const PC=PCm(),goal=o.goal===undefined?'efficient':o.goal,allowRemove=!!o.allowRemove,g0=PC.getGoal();const r2=PC.r2u;
  PC.setGoal(goal);if(PC.setTone)PC.setTone(null);if(PC.setTrimMode)PC.setTrimMode(true);   // vol16a(3): trim against limits_by_goal
  const trace=[],blocked=new Map();
  try{let days=clone(days0).filter(d=>d.tiles.length);const base=()=>PC.check(dt,days,lv)[0];
    for(let guard=0;guard<500;guard++){const F=base(),se=F.filter(f=>f[1]==='session_efficiency'&&!blocked.has(f[2]+'|'+f[3])).map(f=>{const D=days.find(d=>d.day===f[2]),lim=PC.seLim(dt,f[3],lv),x=PC.eff(dt,D.tiles)[f[3]]||0;return {day:f[2],m:f[3],lim,x,ex:Math.round((x-lim)*10)/10}})
        .sort((a,b)=>DO.indexOf(a.day)-DO.indexOf(b.day)||b.ex-a.ex||(a.m<b.m?-1:a.m>b.m?1:0));
      if(!se.length)break;const {day,m,lim,x,ex}=se[0],NI=new Set(F.filter(f=>f[0]!=='info'&&f[1]!=='session_efficiency').map(keyF));
      const D=days.find(d=>d.day===day),wasted=new Set(PC.lateSets(dt,D.tiles,m,lim).map(z=>z[0]));
      const cand=D.tiles.map((t,i)=>{const e=dt.EX[t.id],r=(e.muscles||{})[m]||0;if(!(r>=0.25))return null;const rir=t.rir!=null?t.rir:PC.plannedRir?PC.plannedRir(dt,e):null;const c=PC.credit(dt,e,m,r,t.rir);if(!(c>0))return null;
        const f=PC.fatSet(dt,e,m,r,t.rir!=null?t.rir:(dt.VM.credit.planned_rir_default[e.type]!=null?dt.VM.credit.planned_rir_default[e.type]:2),t.id);return {t,i,sf:f>0?r2(c/f):0,w:wasted.has(t.id)}}).filter(Boolean);
      const key=(a,b)=>a.sf-b.sf||b.i-a.i||(a.t.id<b.t.id?-1:a.t.id>b.t.id?1:0);
      const A=cand.filter(c=>c.w&&c.t.sets>=2).sort(key),Bp=cand.filter(c=>c.t.sets>=2).sort(key),C=allowRemove&&D.tiles.length>=2?cand.filter(c=>c.t.sets===1).sort((a,b)=>(a.w?0:1)-(b.w?0:1)||key(a,b)):[];
      const rejected=[];const tryCut=c=>{const n=clone(days),Dn=n.find(d=>d.day===day);if(c.t.sets===1)Dn.tiles.splice(c.i,1);else Dn.tiles[c.i].sets--;
        const W1=weekly(PC,dt,n),e=dt.EX[c.t.id];const low=[];for(const [mm,rr] of Object.entries(e.muscles||{})){if(!(rr>=0.25)||!(PC.credit(dt,e,mm,rr,c.t.rir)>0))continue;const mn=PC.zones(dt,mm,lv).min;if(mn!=null&&r2(W1[mm]||0)<mn)low.push(mm)}
        if(low.length){rejected.push(`${c.t.id}: would put ${low.join(', ')} below the weekly minimum`);return null}
        const nf=PC.check(dt,n,lv)[0].filter(f=>f[0]!=='info'&&f[1]!=='session_efficiency'&&!NI.has(keyF(f)));if(nf.length){rejected.push(`${c.t.id}: would add ${nf[0][1]}`);return null}return n};
      let res=null,cut=null;for(const [pn,P] of [['A',A],['B',Bp],['C',C]]){for(const c of P){const n=tryCut(c);if(n){res=n;cut={id:c.t.id,tile_index:c.i,sets_from:c.t.sets,sets_to:c.t.sets-1,pool:pn};break}}if(res)break}
      const seen=[...new Set(rejected)];trace.push({flag:{day,muscle:m,effective_sets:Math.round(x*10)/10,excess:ex,limit:lim},rejected:seen,cut});
      if(res)days=res;else blocked.set(day+'|'+m,seen)}
    const R=base().filter(f=>f[1]==='session_efficiency').map(f=>({day:f[2],muscle:f[3]}));
    // ops against the original board (tile order per day is kept; a removed tile shows as to: 0)
    const ops=[];let removed=0;for(const d0 of days0){if(!d0.tiles.length)continue;const dn=days.find(d=>d.day===d0.day);let j=0;
      d0.tiles.forEach((t,i)=>{const u=dn.tiles[j];if(u&&u.id===t.id){if(u.sets!==t.sets){ops.push({day:d0.day,i,id:t.id,from:t.sets,to:u.sets});removed+=t.sets-u.sets}j++}else{ops.push({day:d0.day,i,id:t.id,from:t.sets,to:0});removed+=t.sets}})}
    const full=days0.map(d=>d.tiles.length?days.find(x=>x.day===d.day):{day:d.day,tiles:[]});
    return {days:full,ops,removed,residual:R,trace,blocked:[...blocked].map(([k,why])=>({day:k.split('|')[0],muscle:k.split('|')[1],why}))}}
  finally{PC.setGoal(g0);if(PC.setTrimMode)PC.setTrimMode(false)}}
const API={trim};if(isNode)module.exports=API;else root.TRIM=API;
})(typeof window!=='undefined'?window:globalThis);
