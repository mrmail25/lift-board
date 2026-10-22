/* Port of Coach's tools/swaptags.py diff_lines/diff_tags (rules.json swap_tags): the swap sheet's difference lines,
   priority order, at most swap_tags.compare.max_lines. Browser: window.SWAPDIFF; node: module.exports. */
(function(root){'use strict';
function diffLines(cur,alt,rules){const st=rules.swap_tags||rules,a=cur.swap,b=alt.swap;if(!a||!b)return [];const out=[];
  for(const t of st.vocabulary){const i=t.id;
    if(t.kind==='ordinal'){if(b[i]>a[i])out.push([t.priority,i,t.label_higher]);else if(b[i]<a[i])out.push([t.priority,i,t.label_lower])}
    else{const fa=a.flags.includes(i),fb=b.flags.includes(i);if(fb&&!fa)out.push([t.priority,i,t.label]);else if(fa&&!fb)out.push([t.priority,i,t.label_lost])}}
  return out.sort((x,y)=>x[0]-y[0]||(x[1]<y[1]?-1:x[1]>y[1]?1:0)||(x[2]<y[2]?-1:1))}
function diffTags(cur,alt,rules){const st=rules.swap_tags||rules;return diffLines(cur,alt,rules).map(x=>x[2]).slice(0,st.compare.max_lines)}
/* Swap-sheet fallback when no swap_tags attribute differs (Python parity: diffTags still returns []).
   Single source for the wording; candidate rules.json key for Coach: swap_tags.compare.empty_line.
   A rules.json value wins once Coach adds it. */
const NO_DIFF='No listed difference from your current exercise';
function emptyLine(rules){const c=((rules&&(rules.swap_tags||rules))||{}).compare||{};return typeof c.empty_line==='string'&&c.empty_line?c.empty_line:NO_DIFF}
// What the sheet shows: {tags:[...], empty:null} or {tags:[], empty:'<fallback line>'}
function display(cur,alt,rules){const t=cur&&alt?diffTags(cur,alt,rules):[];return {tags:t,empty:t.length?null:emptyLine(rules)}}
const API={diffLines,diffTags,display,emptyLine,NO_DIFF};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.SWAPDIFF=API;
})(typeof window!=='undefined'?window:this);
