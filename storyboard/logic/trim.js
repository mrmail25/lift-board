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
function trim(dt,days0,lv,o={}){const PC=PCm(),DM=DMm(),goal=o.goal===undefined?'efficient':o.goal,allowRemove=!!o.allowRemove,g0=PC.getGoal(),t0=PC.getTone?null:null;
  PC.setGoal(goal);if(PC.setTone)PC.setTone(null);
  try{let days=clone(days0).filter(d=>d.tiles.length);const base=()=>PC.check(dt,days,lv)[0];
    for(let guard=0;guard<400;guard++){const F=base(),se=F.filter(f=>f[1]==='session_efficiency').map(f=>({f,day:f[2],m:f[3],ex:PC.eff(dt,days.find(d=>d.day===f[2]).tiles)[f[3]]-PC.seLim(dt,f[3],lv)}))
        .sort((a,b)=>DO.indexOf(a.day)-DO.indexOf(b.day)||b.ex-a.ex||(a.m<b.m?-1:a.m>b.m?1:0));
      if(!se.length)break;const NI=new Set(F.filter(f=>f[0]!=='info'&&f[1]!=='session_efficiency').map(keyF)),W0=weekly(PC,dt,days);let done=false;
      for(const {day,m} of se){const D=days.find(d=>d.day===day),lim=PC.seLim(dt,m,lv),late=new Set(PC.lateSets(dt,D.tiles,m,lim).map(z=>z[0]));
        const cand=D.tiles.map((t,i)=>{const e=dt.EX[t.id],r=(e.muscles||{})[m]||0;if(!(r>=0.25))return null;const c=PC.credit(dt,e,m,r,t.rir),fp=PC.loadPoints(dt,[{id:t.id,sets:1,rir:t.rir}])*DM.rshare(e,m);return {t,i,sfr:fp>0?r2(c/fp):0,late:late.has(t.id)}}).filter(Boolean);
        const ord=L=>L.sort((a,b)=>a.sfr-b.sfr||b.i-a.i||(a.t.id<b.t.id?-1:a.t.id>b.t.id?1:0));
        const A=ord(cand.filter(x=>x.late&&x.t.sets>=2)),Bp=ord(cand.filter(x=>x.t.sets>=2)),C=allowRemove?[...ord(cand.filter(x=>x.t.sets===1&&x.late)),...ord(cand.filter(x=>x.t.sets===1&&!x.late))]:[];
        const ok=x=>{if(x.t.sets===1&&D.tiles.length<=1)return false;const n=clone(days),Dn=n.find(d=>d.day===day);if(x.t.sets===1)Dn.tiles.splice(x.i,1);else Dn.tiles[x.i].sets--;
          const W1=weekly(PC,dt,n),e=dt.EX[x.t.id];for(const mm of Object.keys(e.muscles)){const rr=e.muscles[mm];if(!(rr>=0.25)||!(PC.credit(dt,e,mm,rr,x.t.rir)>0))continue;const mn=PC.zones(dt,mm,lv).min;if(mn==null)continue;if(r2(W0[mm]||0)<mn)return false;if(r2(W1[mm]||0)<mn)return false}
          const F1=PC.check(dt,n,lv)[0];if(F1.some(f=>f[0]!=='info'&&f[1]!=='session_efficiency'&&!NI.has(keyF(f))))return false;return n};
        let res=null;for(const P of [A,Bp,C]){for(const x of P){const n=ok(x);if(n){res=n;break}}if(res)break}
        if(res){days=res;done=true;break}}
      if(!done)break}
    const R=base().filter(f=>f[1]==='session_efficiency').map(f=>({day:f[2],muscle:f[3]}));
    // ops against the original board (tile order per day is kept; a removed tile shows as to: 0)
    const ops=[];let removed=0;for(const d0 of days0){if(!d0.tiles.length)continue;const dn=days.find(d=>d.day===d0.day);let j=0;
      d0.tiles.forEach((t,i)=>{const u=dn.tiles[j];if(u&&u.id===t.id){if(u.sets!==t.sets){ops.push({day:d0.day,i,id:t.id,from:t.sets,to:u.sets});removed+=t.sets-u.sets}j++}else{ops.push({day:d0.day,i,id:t.id,from:t.sets,to:0});removed+=t.sets}})}
    const full=days0.map(d=>d.tiles.length?days.find(x=>x.day===d.day):{day:d.day,tiles:[]});
    return {days:full,ops,removed,residual:R}}
  finally{PC.setGoal(g0)}}
const API={trim};if(isNode)module.exports=API;else root.TRIM=API;
})(typeof window!=='undefined'?window:globalThis);
