/* vol15: whole-workout fatigue level on each Plan day card (Coach: rules.json fatigue_level; presets day_summary.fatigue_level).
   value = day_summary.fatigue_fresh_set_eq: sum over the day of sets x fatigue_per_set x effort at planned RIR (whole body, once per set),
   computed live by IMPACT.liveDay. Shown as the level word only ("Fatigue: High"), never the number (display_policy_vol15). */
(function(){
const IMP=()=>typeof window!=='undefined'&&window.IMPACT||(typeof require==='function'?require('./impact.js'):null);
function cfg(dt){const F=(dt&&dt.rules||{}).fatigue_level||null;return F&&F.levels&&F.cutoff_values?{levels:F.levels,cut:F.cutoff_values,source:'coach'}:null}
function value(dt,tiles,lv){const I=IMP();if(!I||!tiles||!tiles.length)return null;const D=I.liveDay(dt,tiles,lv,'max_growth');return D&&D.day_summary?D.day_summary.fatigue_fresh_set_eq:null}
function levelOf(C,v){let i=0;while(i<C.cut.length&&v>=C.cut[i])i++;return C.levels[i]}
function level(dt,tiles,lv){const C=cfg(dt);if(!C)return null;const v=value(dt,tiles,lv);if(v==null)return null;const L=levelOf(C,v);return {id:L.toLowerCase(),label:L,source:C.source}}
const API={cfg,value,level,levelOf};if(typeof module!=='undefined')module.exports=API;if(typeof window!=='undefined')window.WFATIGUE=API;
})();
