/* vol15: ONE body-map colour ramp for the Plan, Analysis and Log maps (Coach: volume-model.json visuals.body_map.ramp).
   Stops grey #C8CDD2 | light green #C7E9B4 | dark green #1E7B3A | yellow #F2C230 | red #D7263D, blended linearly in sRGB (round half up).
   x < grey_below: grey. light_green @ light_green .. dark_green @ dark_green[0]; dark green held up to the yellow breakpoint (no dark green -> yellow blend, no olive); then FLAT yellow up to the red breakpoint, then red (no orange).
   Zone = the band shown; inside a blend the nearer stop (t < 0.5 lower). Exact hex + zone match with Coach's vol15b precomputed values (test/ramp15.js).
   Weekly: x = displayed r1 weekly effective sets; breakpoints = ramp.weekly.breakpoints[level][muscle].
   Daily: x = that muscle's effective sets n (r2); k = sqrt(own fatigue / n); breakpoints from the payoff curve for that k (ramp.daily.live_formula):
   dark range = Payoff >= 0.975 x max, yellow = past the peak where Payoff = 0.75 x max, red = zero_n (each r1). Matches the precomputed presets
   (test/ramp15.js). 'Past the peak' is a colour shift only; red is the payoff_negative flag. */
(function(){
const DEF={grey:'#C8CDD2',light_green:'#C7E9B4',dark_green:'#1E7B3A',yellow:'#F2C230',red:'#D7263D'};
const RAMP=dt=>((((dt||{}).VM||{}).visuals||{}).body_map||{}).ramp||null;
const STOPS=dt=>Object.assign({},DEF,(RAMP(dt)||{}).stops_hex||{});
const hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),toH=c=>'#'+c.map(v=>Math.max(0,Math.min(255,Math.floor(v+0.5))).toString(16).padStart(2,'0')).join('').toUpperCase();
const mix=(a,b,t)=>{t=Math.max(0,Math.min(1,t));const A=hx(a),B=hx(b);return toH(A.map((v,i)=>v+(B[i]-v)*t))};
const r1=x=>Math.floor(x*10+0.5+1e-9)/10,r2=x=>Math.floor(x*100+0.5+1e-9)/100;
// one function for both modes: bp {grey_below, light_green, dark_green:[lo,hi], yellow, red}
function colour(dt,x,bp){const S=STOPS(dt);if(!bp||!(x>=bp.grey_below))return {hex:S.grey,zone:'grey'};const [lo,hi]=bp.dark_green;
  // vol15b (Coach §26): zone = the colour band shown; inside a blend the nearer stop (t < 0.5 lower stop, else upper)
  const bl=(a,b,za,zb,t)=>({hex:mix(S[a],S[b],t),zone:t<0.5?za:zb});
  if(x<lo)return bl('light_green','dark_green','light_green','dark_green',(x-bp.light_green)/(lo-bp.light_green));
  if(x<bp.yellow)return {hex:S.dark_green,zone:'dark_green'};   // CoS (post vol15b): no olive - dark green held up to the yellow breakpoint, then straight to flat yellow
  if(x<bp.red)return {hex:S.yellow,zone:'yellow'};   // yellow held FLAT up to the red breakpoint (no orange)
  return {hex:S.red,zone:'red'}}
function weeklyBp(dt,lv,m){const W=(RAMP(dt)||{}).weekly||{};return ((W.breakpoints||{})[lv]||{})[m]||null}
function weekly(dt,lv,m,x){return colour(dt,r1(+x||0),weeklyBp(dt,lv,m))}
// payoff curve for a given k (rules payoff constants)
function payC(dt){const R=(((dt||{}).rules||{}).rules||[]).find(r=>r.id==='payoff')||{},C=R.constants||{};return {tau:C.stim_tau||4,a:C.fat_lin||6.39,b:C.fat_quad||0.077}}
function dailyBp(dt,k){const C=payC(dt),P=n=>100*(1-Math.exp(-n/C.tau))-(C.a*k*n+C.b*k*k*n*n);
  let mx=-1e9,pk=0;for(let n=0;n<=40;n+=0.001){const v=P(n);if(v>mx){mx=v;pk=n}}
  const bis=(f,a,b)=>{for(let i=0;i<80;i++){const m=(a+b)/2;(f(a)>0)===(f(m)>0)?a=m:b=m}return (a+b)/2};
  const lo=bis(n=>P(n)-0.975*mx,0,pk),hi=bis(n=>P(n)-0.975*mx,pk,60),ye=bis(n=>P(n)-0.75*mx,pk,60),ze=bis(n=>P(n),pk,80);
  return {grey_below:1,light_green:1,dark_green:[r1(lo),r1(hi)],yellow:r1(ye),red:r1(ze),peak_n:r1(pk),max_payoff:r1(mx)}}
const BPC={};
function dayMuscle(dt,n,F,m,lv){n=r2(+n||0);F=r2(+F||0);if(!(n>=1)||!(F>0))return colour(dt,n,null);const k=Math.floor(Math.sqrt(F/n)*1000+0.5)/1000,key=k.toFixed(3);/* k to 3 decimals, as Coach's class table */const bp=BPC[key]||(BPC[key]=dailyBp(dt,k));
  const c=colour(dt,n,bp);return m?capZone(dt,c,n,m,lv):c}
// vol16b (Coach + CoS): day cells keep the frozen vol15c daily ramp (yellow = diminishing returns stays). One rule on top: a cell may be red
// ONLY where the one-workout warning fires (PCHECK count = check_program.eff per session_efficiency.counts, no decay, r1 > PCHECK.seLim = the
// Max growth cap); a red cell at or under the limit is capped at yellow.
function capZone(dt,c,n,m,lv){if(c.zone!=='red')return c;const PC=typeof window!=='undefined'&&window.PCHECK||(typeof require==='function'?require('./progcheck.js'):null);const L=PC&&PC.seLim?PC.seLim(dt,m,lv):null;if(L==null)return c;
  const over=PC.seOver?PC.seOver(n,L):Math.floor(n*10+0.5+1e-9)/10>L;if(over)return c;return {hex:STOPS(dt).yellow,zone:'yellow',capped:true}}
// one workout's tiles [{id,sets,rir}] -> {muscle:{hex,zone}}
function daily(dt,tiles,lv){const PC=typeof window!=='undefined'&&window.PCHECK||(typeof require==='function'?require('./progcheck.js'):null),o={};if(!PC||!tiles||!tiles.length)return o;
  const E=PC.eff(dt,tiles),F=PC.fatMus(dt,tiles);for(const [m,v] of Object.entries(E)){if(!(v>0))continue;o[m]=dayMuscle(dt,v,F[m]||0,m,lv)}return o}
const fills=o=>{const r={};for(const [m,c] of Object.entries(o||{}))if(c&&c.zone!=='grey')r[m]=c.hex;else if(c)r[m]=c.hex;return r};
const LABELS=['Under','Building','Best','Diminishing returns','No payoff'];   // vol16 (Coach/CoS): the ONE set of colour-bar labels
// vol16: the legend is a labelled gradient bar (grey | light -> dark green | flat yellow | red), the same stops as the map
const legend=mode=>{const S=STOPS(null);return `<div class="mrbar2" role="img" aria-label="Map colours: ${LABELS.join(', ')}"><i class="gb" style="background:linear-gradient(90deg,${S.grey} 0 16%,${S.light_green} 16%,${S.dark_green} 58%,${S.yellow} 58% 80%,${S.red} 80%)"></i><span class="lb">${LABELS.map(l=>`<span>${l}</span>`).join('')}</span></div>`};
// vol15b: per-muscle day wording (day-metrics-presets muscles[m].display): '<n> hard sets: <band>' or 'Under 1 hard set'
const DAYW={light_green:'building',dark_green:'around the best range',yellow:'past the best range',red:'too many for one workout'};   // fallback only; Coach's words: visuals.body_map.ramp.day_text.words
const dayText=(dt,n,zone)=>{const DT=(RAMP(dt)||{}).day_text||{},W=Object.assign({},DAYW,DT.words||{});n=r2(+n||0);return !(n>=1)||zone==='grey'||!zone?'Under 1 hard set':`${(Math.floor(n*10+0.5+1e-9)/10).toFixed(1)} hard sets: ${W[zone]||''}`};
const dayWords=(dt,tiles,lv)=>{const PC=typeof window!=='undefined'&&window.PCHECK||(typeof require==='function'?require('./progcheck.js'):null),o={};if(!PC||!tiles||!tiles.length)return o;
  const E=PC.eff(dt,tiles),F=PC.fatMus(dt,tiles);for(const [m,v] of Object.entries(E)){if(!(v>0))continue;o[m]=dayText(dt,v,dayMuscle(dt,v,F[m]||0,m,lv).zone)}return o};
const API={capZone,dayText,dayWords,DAYW,colour,weekly,weeklyBp,daily,dayMuscle,dailyBp,fills,legend,LABELS,STOPS,mix};if(typeof module!=='undefined')module.exports=API;if(typeof window!=='undefined')window.MAPRAMP=API;
})();
