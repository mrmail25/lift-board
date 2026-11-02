/* vol15: ONE body-map colour ramp for the Plan, Analysis and Log maps (Coach: volume-model.json visuals.body_map.ramp).
   Stops grey #C8CDD2 | light green #C7E9B4 | dark green #1E7B3A | yellow #F2C230 | red #D7263D, blended linearly in sRGB (round half up).
   x < grey_below: grey. light_green @ light_green .. dark_green @ dark_green[0]; dark green held to dark_green[1]; then -> yellow @ yellow, held FLAT yellow up to the red threshold, then red (CoS vol15: no orange blend;
   Coach's precomputed hexes still blend yellow->red, so test/ramp15.js compares zones + greens by hex and counts the flat-yellow-only differences).
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
function colour(dt,x,bp,o){const S=STOPS(dt);if(!bp||!(x>=bp.grey_below))return {hex:S.grey,zone:'grey'};const [lo,hi]=bp.dark_green;
  if(x<lo)return {hex:mix(S.light_green,S.dark_green,(x-bp.light_green)/(lo-bp.light_green)),zone:'light_green'};
  if(x<=hi)return {hex:S.dark_green,zone:'dark_green'};
  if(x<bp.yellow)return {hex:mix(S.dark_green,S.yellow,(x-hi)/(bp.yellow-hi)),zone:'yellow'};
  if(x<bp.red)return {hex:o&&o.blend?mix(S.yellow,S.red,(x-bp.yellow)/(bp.red-bp.yellow)):S.yellow,zone:'yellow'};   /* CoS vol15: yellow held FLAT from the yellow point to the red threshold (no orange); {blend:1} = Coach's precomputed blend, tests only */
  return {hex:S.red,zone:'red'}}
function weeklyBp(dt,lv,m){const W=(RAMP(dt)||{}).weekly||{};return ((W.breakpoints||{})[lv]||{})[m]||null}
function weekly(dt,lv,m,x,o){return colour(dt,r1(+x||0),weeklyBp(dt,lv,m),o)}
// payoff curve for a given k (rules payoff constants)
function payC(dt){const R=(((dt||{}).rules||{}).rules||[]).find(r=>r.id==='payoff')||{},C=R.constants||{};return {tau:C.stim_tau||4,a:C.fat_lin||6.39,b:C.fat_quad||0.077}}
function dailyBp(dt,k){const C=payC(dt),P=n=>100*(1-Math.exp(-n/C.tau))-(C.a*k*n+C.b*k*k*n*n);
  let mx=-1e9,pk=0;for(let n=0;n<=40;n+=0.001){const v=P(n);if(v>mx){mx=v;pk=n}}
  const bis=(f,a,b)=>{for(let i=0;i<80;i++){const m=(a+b)/2;(f(a)>0)===(f(m)>0)?a=m:b=m}return (a+b)/2};
  const lo=bis(n=>P(n)-0.975*mx,0,pk),hi=bis(n=>P(n)-0.975*mx,pk,60),ye=bis(n=>P(n)-0.75*mx,pk,60),ze=bis(n=>P(n),pk,80);
  return {grey_below:1,light_green:1,dark_green:[r1(lo),r1(hi)],yellow:r1(ye),red:r1(ze),peak_n:r1(pk),max_payoff:r1(mx)}}
const BPC={};
function dayMuscle(dt,n,F,op){n=r2(+n||0);F=r2(+F||0);if(!(n>=1)||!(F>0))return colour(dt,n,null);const k=Math.floor(Math.sqrt(F/n)*1000+0.5)/1000,key=k.toFixed(3);/* k to 3 decimals, as Coach's class table */const bp=BPC[key]||(BPC[key]=dailyBp(dt,k));return colour(dt,n,bp,op)}
// one workout's tiles [{id,sets,rir}] -> {muscle:{hex,zone}}
function daily(dt,tiles,op){const PC=typeof window!=='undefined'&&window.PCHECK||(typeof require==='function'?require('./progcheck.js'):null),o={};if(!PC||!tiles||!tiles.length)return o;
  const E=PC.eff(dt,tiles),F=PC.fatMus(dt,tiles);for(const [m,v] of Object.entries(E)){if(!(v>0))continue;o[m]=dayMuscle(dt,v,F[m]||0,op)}return o}
const fills=o=>{const r={};for(const [m,c] of Object.entries(o||{}))if(c&&c.zone!=='grey')r[m]=c.hex;else if(c)r[m]=c.hex;return r};
const legend=mode=>{const S=STOPS(null);return `<span class="mleg mrleg" aria-label="Map colours"><span class="lg1"><i style="background:${S.grey}" aria-hidden="true"></i>Under 1 set</span><span class="lg1"><i class="mrbar" style="background:linear-gradient(90deg,${S.light_green},${S.dark_green})" aria-hidden="true"></i>${mode==='day'?'Toward the peak':'Toward the sweet spot'}</span><span class="lg1"><i style="background:${S.yellow}" aria-hidden="true"></i>${mode==='day'?'Past the peak':'Past the sweet spot'}</span><span class="lg1"><i style="background:${S.red}" aria-hidden="true"></i>Too much</span></span>`};
const API={colour,weekly,weeklyBp,daily,dayMuscle,dailyBp,fills,legend,STOPS,mix};if(typeof module!=='undefined')module.exports=API;if(typeof window!=='undefined')window.MAPRAMP=API;
})();
