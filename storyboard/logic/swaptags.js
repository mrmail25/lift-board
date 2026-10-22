/* Port of Coach's tools/swaptags.py diff_lines/diff_tags (rules.json swap_tags): the swap sheet's difference lines,
   priority order, at most swap_tags.compare.max_lines. Browser: window.SWAPDIFF; node: module.exports. */
(function(root){'use strict';
function diffLines(cur,alt,rules){const st=rules.swap_tags||rules,a=cur.swap,b=alt.swap;if(!a||!b)return [];const out=[];
  for(const t of st.vocabulary){const i=t.id;
    if(t.kind==='ordinal'){if(!(i in a)||!(i in b))continue; // a block written before this tag existed: no line for it
      if(b[i]>a[i])out.push([t.priority,i,t.label_higher]);else if(b[i]<a[i])out.push([t.priority,i,t.label_lower])}
    else{const fa=a.flags.includes(i),fb=b.flags.includes(i);if(fb&&!fa)out.push([t.priority,i,t.label]);else if(fa&&!fb)out.push([t.priority,i,t.label_lost])}}
  return out.sort((x,y)=>x[0]-y[0]||(x[1]<y[1]?-1:x[1]>y[1]?1:0)||(x[2]<y[2]?-1:1))}
function diffTags(cur,alt,rules){const st=rules.swap_tags||rules;return diffLines(cur,alt,rules).map(x=>x[2]).slice(0,st.compare.max_lines)}
/* Swap-sheet empty line (tools/swaptags.py display_lines): when no tag differs and BOTH exercises have swap blocks, show
   rules.json swap_tags.compare.empty_line once. NO_DIFF is only a fallback for rules data without that key.
   A custom exercise without a swap block gets no line at all. */
const NO_DIFF='No listed difference from your current exercise';
function emptyLine(rules){const c=((rules&&(rules.swap_tags||rules))||{}).compare||{};return typeof c.empty_line==='string'&&c.empty_line?c.empty_line:NO_DIFF}
// display_lines parity: the lines the sheet shows (diff tags, or [empty_line])
function displayLines(cur,alt,rules){const t=cur&&alt?diffTags(cur,alt,rules):[];if(t.length||!cur||!alt||!cur.swap||!alt.swap)return t;return [emptyLine(rules)]}
// What the sheet shows: {tags:[...], empty:null} or {tags:[], empty:'<empty_line>'} (empty stays null when a swap block is missing)
function display(cur,alt,rules){const t=cur&&alt?diffTags(cur,alt,rules):[];return {tags:t,empty:t.length||!(cur&&alt&&cur.swap&&alt.swap)?null:emptyLine(rules)}}
// tag_evidence parity: evidence level for a tag on an exercise (evidence_overrides first)
function tagEvidence(tagId,exId,rules){const st=rules.swap_tags||rules,t=st.vocabulary.find(v=>v.id===tagId);for(const o of t.evidence_overrides||[])if(o.exercises.includes(exId))return o.level;return t.evidence}
const API={diffLines,diffTags,display,displayLines,emptyLine,tagEvidence,NO_DIFF};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.SWAPDIFF=API;
})(typeof window!=='undefined'?window:this);
