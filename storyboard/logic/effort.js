// Effort per set (Coach's ruling, 2026-10-24, overrides logging-spec.md §3): store only `rir` per set, an integer 0-4 where 4 = "4+",
// null when skipped. RPE is a display/input toggle only: RPE = 10 - RIR, chips 10, 9, 8, 7, <=6 (<=6 stores as 4), no half points.
// Legacy values are clamped on read: 5 or more -> 4, fractions round to the nearest whole number. UMD: window.EFFORT / module.exports.
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.EFFORT=m})(this,function(){
  const MAX=4;
  // read/clamp: null/''/NaN -> null; round half up; < 0 -> 0; >= 4 -> 4
  function clampRir(v){if(v==null||v===''||typeof v==='boolean')return null;const n=+v;if(!isFinite(n))return null;const r=Math.floor(n+0.5);return Math.max(0,Math.min(MAX,r))}
  const RIR_CHIPS=[0,1,2,3,4].map(r=>({rir:r,label:r===MAX?'4+':String(r)}));
  const RPE_CHIPS=[0,1,2,3,4].map(r=>({rir:r,label:r===MAX?'≤6':String(10-r)}));
  // RPE value or chip label -> stored rir ('≤6', '<=6' or any RPE <= 6 -> 4)
  function fromRpe(x){if(x==null||x==='')return null;const s=String(x).trim();if(/^(≤|<=)\s*6$/.test(s))return MAX;const n=+s;if(!isFinite(n))return null;return clampRir(10-n)}
  const toRpe=r=>{r=clampRir(r);return r==null?null:10-r};
  const chips=mode=>mode==='rpe'?RPE_CHIPS:RIR_CHIPS;
  const short=(r,mode)=>{r=clampRir(r);if(r==null)return '';return mode==='rpe'?(r===MAX?'≤6':String(10-r)):(r===MAX?'4+':String(r))};
  const label=(r,mode)=>{const s=short(r,mode);return s?(mode==='rpe'?`RPE ${s}`:`RIR ${s}`):''};
  return {MAX,clampRir,fromRpe,toRpe,chips,short,label,RIR_CHIPS,RPE_CHIPS}});
