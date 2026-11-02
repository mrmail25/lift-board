/* vol14 PAYOFF model — Coach's rules.json rules[id=payoff] (spec §21). Tagged Modeled.
   ADAPTER SPOT: CONSTS(dt) reads rules.json rules[id=payoff] {constants, fatigue_classes, bands}; curve grid from
   volume-model.json vol14.payoff.curve_samples. Falls back to DRAFT only if those fields are missing (source 'draft').
   Per muscle per workout:
     n = r2(effective sets on the muscle that day, face value)            (day-metrics muscles[m].stimulus_hard_set_eq)
     F = r2(the muscle's OWN rating-weighted fatigue, fresh-set eq)         (day-metrics muscles[m].fatigue_fresh_set_eq, PCHECK.fatMus)
     gate: n >= 1 and F > 0, else no Payoff (no colour, no dot)
     k = sqrt(F/n); f = sqrt(n F) = k n
     stimulus% = r1(100 (1 - e^(-n/4)));  fatigue% = r1(6.39 f + 0.077 f^2);  payoff = r1(stim% - fat%)
     marginal = r2(25 e^(-n/4) / (k (6.39 + 0.154 f)))   (hidden next-set check; = 1 exactly at the Payoff peak)
     peak_n: marginal = 1 (bisection [0,40], 60 steps, r1); zero_n: payoff = 0 above the peak (bisection to 60, r1)
   Bands: green marginal >= 1 and payoff > 0 | amber marginal < 1 and payoff >= 0 | red payoff < 0 | none n < 1.
   'Past efficient' = past the Payoff peak (amber/red). Day gauges: n-weighted means over muscles with n >= 1. Weekly volume unchanged. */
(function(root){'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const PCm=()=>isNode?require('./progcheck.js'):root.PCHECK;
const r1=x=>Math.floor(x*10+0.5+1e-7)/10,r2=x=>Math.floor(x*100+0.5+1e-7)/100;   // half-up; 1e-7 absorbs float error (2.295*100 = 229.4999…)
const DRAFT={source:'draft',tau:4,a:6.39,b:0.077,gate:1,classes:[],grid:null};
function CONSTS(dt){const R=dt&&(dt.RULES||dt.rules),rl=R&&(R.rules||[]).find(x=>x.id==='payoff');const V=(dt&&dt.VM&&dt.VM.vol14||{}).payoff||{},V4d=(dt&&dt.VM&&dt.VM.vol14d)||{};
  if(!rl||!rl.constants)return DRAFT;const c=rl.constants,cs=V4d.curve_samples||V.curve_samples||{}   /* vol14d: 0–20 sets, no clamp */,g=Object.values(cs)[0];
  return {source:'coach',tau:+c.stim_tau,a:+c.fat_lin,b:+c.fat_quad,gate:+(c.gate_effective_sets||1),classes:rl.fatigue_classes||[],samples:cs,grid:g&&g.n||null,note:rl.note,label:rl.label||'Modeled'}}
const stimK=(C,n)=>100*(1-Math.exp(-n/C.tau)),fatK=(C,k,n)=>{const f=k*n;return C.a*f+C.b*f*f},payK=(C,k,n)=>stimK(C,n)-fatK(C,k,n);
const margK=(C,k,n)=>(100/C.tau)*Math.exp(-n/C.tau)/(k*(C.a+2*C.b*k*n));
function peakK(C,k){let lo=0,hi=40;for(let i=0;i<60;i++){const m=(lo+hi)/2;margK(C,k,m)>1?lo=m:hi=m}return (lo+hi)/2}
function zeroK(C,k){let lo=peakK(C,k),hi=60;for(let i=0;i<60;i++){const m=(lo+hi)/2;payK(C,k,m)>0?lo=m:hi=m}return (lo+hi)/2}
function band(n,pay,marg,gate){if(!(n>=(gate||1)))return null;if(pay<0)return 'red';if(marg>=1&&pay>0)return 'green';return 'amber'}
// core: one muscle-day from its two numbers (n = effective sets, F = own fatigue)
function calc(C,n0,F0){C=C||DRAFT;const n=r2(n0),F=r2(F0);if(!(n>=C.gate&&F>0))return {n,F,gated:false,band:null,tone:null};
  const k=Math.sqrt(F/n),f=Math.sqrt(n*F),s=r1(stimK(C,n)),fa=r1(C.a*f+C.b*f*f),p=r1(s-fa),mg=r2((100/C.tau)*Math.exp(-n/C.tau)/(k*(C.a+2*C.b*f))),pk=r1(peakK(C,k)),z=r1(zeroK(C,k)),b=band(n,p,mg,C.gate);
  return {n,F,gated:true,k:Math.round(k*1000)/1000,fatigue_n:r2(f),stimulus:s,fatigue:fa,payoff:p,marginal:mg,peak:pk,zero:z,peak_payoff:r1(payK(C,k,pk)),band:b,tone:b,
    past_peak:b==='amber'||b==='red',sets_past_peak:b==='amber'||b==='red'?r1(Math.max(0,n-pk)):0,next_set_pays:mg>=1,label:'Modeled',source:C.source}}
// live board: one muscle on one day (tiles [{id,sets,rir}])
function muscle(dt,tiles,m,C){C=C||CONSTS(dt);const PC=PCm(),E=PC.eff(dt,tiles),F=PC.fatMus(dt,tiles);
  const o=calc(C,E[m]||0,F[m]||0);o.muscle=m;o.parts=tiles.map(t=>({id:t.id,sets:t.sets,credit:(PC.eff(dt,[{id:t.id,sets:1,rir:t.rir}])[m]||0)})).filter(p=>p.credit>0);return o}
function day(dt,tiles,C){C=C||CONSTS(dt);const PC=PCm(),E=PC.eff(dt,tiles),F=PC.fatMus(dt,tiles),mus={},bands={};let W=0,S=0,Y=0;
  for(const [m,v] of Object.entries(E)){if(!(v>=0.5))continue;const o=calc(C,v,F[m]||0);o.muscle=m;o.parts=tiles.map(t=>({id:t.id,sets:t.sets,credit:(PC.eff(dt,[{id:t.id,sets:1,rir:t.rir}])[m]||0)})).filter(p=>p.credit>0);mus[m]=o;
    if(o.gated){W+=o.n;S+=o.n*o.stimulus;Y+=o.n*o.payoff;bands[o.band]=(bands[o.band]||0)+1}}
  const s=W?r1(S/W):0,p=W?r1(Y/W):0;
  return {muscles:mus,stimulus:s,payoff:p,fatigue:r1(s-p),muscles_counted:Object.values(mus).filter(o=>o.gated).length,bands,trained:W>0,label:'Modeled',source:C.source}}
// curve for the sheet: Coach's vol14d.curve_samples grid (n 0..20 step 0.5), evaluated at this muscle-day's own k
function curve(C,k,grid){const g=grid||C.grid||Array.from({length:33},(_,i)=>i/2);return g.map(n=>({n,s:stimK(C,n),f:fatK(C,k,n),p:payK(C,k,n)}))}
const API={CONSTS,DRAFT,calc,muscle,day,curve,band,stimK,fatK,payK,margK,peakK,zeroK,r1,r2};
if(isNode)module.exports=API;else root.PAYOFF=API})(typeof window!=='undefined'?window:globalThis);
