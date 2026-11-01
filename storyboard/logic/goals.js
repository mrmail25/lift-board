/* vol10 analysis goal ('Efficient' / 'Max growth'), wired per volume-model.json vol10.builder_paths:
   options + labels = rules.json goals; weekly targets = rules[id=weekly_volume].targets_by_goal[goal][level][muscle] (PC.goalTarget);
   session limits = rules[id=session_efficiency].limits_by_goal[goal][level][muscle] (PC.seLim; limits_by_level = the vol9 fallback
   when no goal is set). Zones are the same for both goals. The goal lives in PCHECK (setGoal) so every check, warning and day metric
   follows it live; sync() is called from the board's RD().
   Initial goal = rules.json goals.default (vol10b builder_paths.default_goal; currently 'efficient'); a pick is saved on this device.
   QUIET: display tone per goal. Under Efficient the session_efficiency warning is shown as info (never red, never fails a header);
   the checker data stays 'warn' (Coach parity; node references run with no tone). */
(function(){
const KEY='apechit.sb.goalMode';
// vol10b: the initial goal comes from the data: rules.json goals.default (= rules[id=session_efficiency].default_goal), not a constant
const DEFAULT_GOAL=()=>{const c=cfg();if(c&&c.default)return c.default;const d=dt(),r=d&&d.rules&&(d.rules.rules||[]).find(x=>x.id==='session_efficiency');return r&&r.default_goal||null};
const dt=()=>window.SBX&&window.SBX.RD,cfg=()=>{const d=dt();return d&&d.rules&&d.rules.goals||null};
const options=()=>{const c=cfg();return c?(c.options||[]).map(id=>({id,label:(c.labels||{})[id]||(c[id]||{}).label||id})):[]};
let MODE;const valid=g=>g===null||options().some(o=>o.id===g);
function mode(){if(MODE===undefined){let v=null;try{v=localStorage.getItem(KEY)}catch(e){}MODE=v&&valid(v)?v:(DEFAULT_GOAL()&&valid(DEFAULT_GOAL())?DEFAULT_GOAL():null);if(!cfg())MODE=undefined}return MODE===undefined?null:MODE}
const QUIET={efficient:{session_efficiency:'info'}};
function sync(){const P=window.PCHECK;if(P&&P.setGoal){const g=cfg()?mode():null;P.setGoal(g);P.setTone&&P.setTone(QUIET[g]||null)}}
const quiet=()=>!!QUIET[mode()];
function set(g){if(!valid(g))return;MODE=g;try{g?localStorage.setItem(KEY,g):localStorage.removeItem(KEY)}catch(e){}sync()}
function withGoal(g,fn){const P=window.PCHECK,o=P.getGoal();P.setGoal(g);try{return fn()}finally{P.setGoal(o)}}
const label=g=>(options().find(o=>o.id===g)||{}).label||g;
const other=g=>{g=g===undefined?mode():g;const o=options();return g?((o.find(x=>x.id!==g)||{}).id||null):null};
const nurd=g=>{const c=cfg();return c&&c[g]&&c[g].nurd||null};
window.GOALS={get DEFAULT_GOAL(){return DEFAULT_GOAL()},QUIET,quiet,get mode(){return mode()},options,set,sync,withGoal,label,other,nurd,cfg};
})();
