/* Port of Coach's tools/swaptags.py diff_lines/diff_tags (rules.json swap_tags): the swap sheet's difference lines,
   priority order, at most swap_tags.compare.max_lines. Browser: window.SWAPDIFF; node: module.exports. */
(function(root){'use strict';
function diffLines(cur,alt,rules){const st=rules.swap_tags||rules,a=cur.swap,b=alt.swap;if(!a||!b)return [];const out=[];
  for(const t of st.vocabulary){const i=t.id;
    if(t.kind==='ordinal'){if(b[i]>a[i])out.push([t.priority,i,t.label_higher]);else if(b[i]<a[i])out.push([t.priority,i,t.label_lower])}
    else{const fa=a.flags.includes(i),fb=b.flags.includes(i);if(fb&&!fa)out.push([t.priority,i,t.label]);else if(fa&&!fb)out.push([t.priority,i,t.label_lost])}}
  return out.sort((x,y)=>x[0]-y[0]||(x[1]<y[1]?-1:x[1]>y[1]?1:0)||(x[2]<y[2]?-1:1))}
function diffTags(cur,alt,rules){const st=rules.swap_tags||rules;return diffLines(cur,alt,rules).map(x=>x[2]).slice(0,st.compare.max_lines)}
const API={diffLines,diffTags};if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.SWAPDIFF=API;
})(typeof window!=='undefined'?window:this);
