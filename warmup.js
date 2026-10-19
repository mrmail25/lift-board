// v29 C: one-tap warm-up ramp (#5). Exact port of tools/warmup.py (rules.json v9 logger.warmup_ramp); loads round with loads.js
// nearestRealLoad (gym profile, ties lighter). Ramp sets are kind:'warmup', so prs.js / analytics / the decimal check already leave them out.
// Percentages and reps are coaching convention ([C]/[M]), read from rules.json; nothing here is a threshold.
const WU_BAR_EQ=['barbell','trap bar','smith machine','landmine'];/* warmup.py BAR_EQ: bar equipment -> floor >= bar_multiple x empty bar */
const WU_BW_REPS=5;/* warmup.py: bodyweight-only / one-step-more-assistance set x 5 (logger.warmup_ramp.bodyweight) */
const WU_PRIME=1.0;/* warmup.py prime(): muscles rated 1.0 */
const wuPrime=ex=>new Set(Object.entries((ex&&ex.muscles)||{}).filter(([,r])=>r>=WU_PRIME).map(([m])=>m));
// done_before = exercise ids with >= 1 done working set earlier in this session
function isWarm(id,doneBefore,T){T=T||EX;const p=wuPrime(T[id]||{});return doneBefore.some(i=>i!=id&&[...wuPrime(T[i]||{})].some(m=>p.has(m)))}
// -> [{kind:'warmup', load, reps, pct}] in the profile unit
function warmupSets(id,workingLoad,unit,profile,warm=false,T,rules){const LGR=rules||ldR(),R=LGR.warmup_ramp,ex=(T||EX)[id];
  if(!ex||workingLoad==null)return[];const prof=profile||LGR.gym_profile_default[unit],pu=prof.unit,w=ldConv(workingLoad,unit,pu),wkg=ldConv(workingLoad,unit,'kg'),eq=ex.equipment,t=ex.type;
  if((ex.bodyweight_fraction||0)>0){if(ex.bodyweight_assisted){const a=nextRealLoad(w,1,prof,eq,pu,id,LGR);return a!=null?[{kind:'warmup',load:a,reps:WU_BW_REPS,pct:null}]:[]}
    return w>LD_EPS?[{kind:'warmup',load:0,reps:WU_BW_REPS,pct:null}]:[]}
  if(t=='isolation')return[];
  if(t!='primary'){const am=R.accessory_min_load,mn=(am[eq]||am.default)[pu];if(!R.accessory_equipment.includes(eq)||w<mn-LD_EPS||warm)return[]}
  const loads=availableLoads(prof,eq,id),lightest=loads.length?loads[0]:0;let floor=R.floor[pu];
  if(WU_BAR_EQ.includes(eq)&&loads.length)floor=Math.max(floor,R.floor.bar_multiple*ldBase(prof,eq,id));
  if(w<floor-LD_EPS)return[];
  const SB=R.sets_by_working_load;let scheme=warm?R.warm_muscle.one:(wkg>=SB.three_from_kg-LD_EPS?SB.three:SB.two);
  if(t!='primary'&&scheme.length>R.accessory_max_sets)scheme=SB.two;
  const out=[];for(const[pct,reps]of scheme){const v=Math.max(nearestRealLoad(pct*w,prof,eq,pu,id,'nearest',LGR),lightest);
    if(v>=w-LD_EPS)continue;if(out.length&&v<=out[out.length-1].load+LD_EPS)out.pop();/* same load after rounding: keep the heavier-percentage set */
    out.push({kind:'warmup',load:v,reps,pct})}
  return out}
