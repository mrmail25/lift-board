// v23: loaded-split status (name + unsaved dot + Update). Board autosave is unchanged.
(function(){const nb=document.getElementById('bar');const st=document.createElement('span');st.id='sp-st';nb.insertBefore(st,document.getElementById('apply').nextSibling);
function ui(){const m=window.loadedSplit&&loadedSplit();if(!m){st.innerHTML='';st.hidden=true;return}const dirty=splitDirty(m);st.hidden=false;
st.innerHTML=`<span class="sp-name" title="Loaded split">${E(m.name)}</span>${dirty?'<i class="sp-dot" title="Unsaved changes" aria-label="Unsaved changes"></i>':''}${dirty?`<button id="sp-upd" class="pri">Update '${E(m.name)}'</button>`:''}`;
const b=st.querySelector('#sp-upd');if(b)b.onclick=()=>{writeSplit(m);state.applied=snap();save();ui();if(window.toast)toast(`Updated "${m.name}"`)}}
window.v23ui=ui;const r0=render;render=function(){const x=r0.apply(this,arguments);ui();return x};const b0=bar;bar=function(){const x=b0.apply(this,arguments);ui();return x};ui()})();
