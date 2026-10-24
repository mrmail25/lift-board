/* Custom-exercise media (2026-10-24): YouTube link parsing + oEmbed check, trim-window math, size rule, and the IndexedDB store.
   UMD: browser global CXMEDIA, node module.exports (the pure parts are tested in node; the IndexedDB part needs a browser).
   Decisions (ARCHITECTURE-web-storyboard.md "Custom exercise media"):
   - Video is stored as the original file + trim {start, end}; playback loops only the trim window. No in-browser re-encode:
     MediaRecorder is missing in the WebKit test build and canvas capture is real-time and drops frames on phones.
   - Photos and videos live in IndexedDB keyed by exercise id; photos that were in localStorage are migrated once. */
(function(root,f){const M=f();if(typeof module==='object'&&module.exports)module.exports=M;else root.CXMEDIA=M})(typeof self!=='undefined'?self:this,function(){
const MAX_TRIM=10,MIN_TRIM=0.5,WARN_BYTES=20*1024*1024,EXPORT_VIDEO_MAX=8*1024*1024;
// ---- time: "90", "90s", "1:30", "1m30s", "1h2m3s" -> seconds (integer); '' -> 0; anything else -> null
function parseTime(t){t=String(t==null?'':t).trim().toLowerCase();if(!t)return 0;
  if(/^\d+(\.\d+)?s?$/.test(t))return Math.floor(parseFloat(t));
  if(/^\d+(:\d{1,2}){1,2}$/.test(t)){const p=t.split(':').map(Number);if(p.slice(1).some(x=>x>59))return null;return p.reduce((a,x)=>a*60+x,0)}
  const m=t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);if(m&&(m[1]||m[2]||m[3]))return (+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0);return null}
const fmtTime=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`:`${m}:${String(x).padStart(2,'0')}`};
const ID=/^[A-Za-z0-9_-]{11}$/;
// ---- YouTube URL -> {video_id, start_s, kind, url} or {error}. Accepts youtube.com/watch, youtu.be, youtube.com/shorts (www., m., music. too).
function parseYouTube(raw,startField){let s=String(raw||'').trim();if(!s)return {error:'empty'};
  if(!/^[a-z]+:\/\//i.test(s))s='https://'+s;let u;try{u=new URL(s)}catch(e){return {error:'not_url'}}
  if(!/^https?:$/.test(u.protocol))return {error:'not_youtube'};
  const h=u.hostname.toLowerCase().replace(/^(www|m|music)\./,'');let id=null,kind=null;
  if(h==='youtube.com'||h==='youtube-nocookie.com'){
    if(u.pathname==='/watch'){id=u.searchParams.get('v');kind='watch'}
    else{const m=u.pathname.match(/^\/shorts\/([^/?#]+)/);if(m){id=m[1];kind='shorts'}}}
  else if(h==='youtu.be'){id=u.pathname.slice(1).split('/')[0];kind='youtu.be'}
  else return {error:'not_youtube'};
  if(!kind)return {error:'not_video'};if(!id||!ID.test(id))return {error:'bad_id'};
  let st=0;const sf=String(startField==null?'':startField).trim();
  if(sf){st=parseTime(sf);if(st==null)return {error:'bad_start'}}
  else{const t=u.searchParams.get('t')||u.searchParams.get('start')||((u.hash.match(/t=([^&]+)/)||[])[1]);if(t){const v=parseTime(t);if(v!=null)st=v}}
  return {video_id:id,start_s:st,kind,url:canonical(id,st)}}
const canonical=(id,st)=>`https://www.youtube.com/watch?v=${id}${st?`&t=${st}s`:''}`;
const oembedUrl=url=>`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
// ---- oEmbed check. YouTube's oEmbed answers CORS (Access-Control-Allow-Origin echoes the page origin; checked 2026-10-24), so a plain
// browser fetch works. 200 + JSON = found and embeddable; 401/403 = embedding disabled; 400/404 = not found / private / removed;
// a network error = could not check (offline or blocked): the link may still be saved, marked unchecked.
async function checkYouTube(parsed,fetchFn){const F=fetchFn||(typeof fetch!=='undefined'?fetch:null);if(!parsed||parsed.error)return {ok:false,state:'invalid'};
  let r;try{r=await F(oembedUrl(`https://www.youtube.com/watch?v=${parsed.video_id}`),{mode:'cors',credentials:'omit',cache:'no-store'})}catch(e){return {ok:false,state:'unchecked'}}
  if(r.status===200){let j=null;try{j=await r.json()}catch(e){}if(j&&(j.type==='video'||j.html))return {ok:true,state:'ok',author:j.author_name||'',title:j.title||''};return {ok:false,state:'unchecked'}}
  if(r.status===401||r.status===403)return {ok:false,state:'not_embeddable',status:r.status};
  if(r.status===400||r.status===404)return {ok:false,state:'not_found',status:r.status};
  return {ok:false,state:'unchecked',status:r.status}}
const YT_MSG={empty:'',not_url:'That doesn’t look like a link',not_youtube:'Use a YouTube link: youtube.com/watch, youtu.be or youtube.com/shorts',not_video:'Use a link to one video (watch, youtu.be or Shorts)',
  bad_id:'That YouTube link is missing its video id',bad_start:'Start time: use seconds, 1:30 or 1m30s',not_found:'YouTube can’t find that video. It may be private or removed.',
  not_embeddable:'This video’s owner doesn’t allow it to play in other apps. Pick another video.',unchecked:'Couldn’t reach YouTube to check this link. It will be saved and checked next time you edit.',checking:'Checking with YouTube…'};
// ---- trim window: default = first <= 10 s; clamp keeps 0 <= start < end <= dur, MIN_TRIM <= length <= MAX_TRIM.
// which = 'start' | 'end' | 'move': the handle being dragged wins; the other handle is pushed to keep the limits.
const r2=x=>Math.round(x*100)/100;
function defaultTrim(dur){dur=+dur||0;return {start:0,end:r2(Math.min(dur,MAX_TRIM))}}
function clampTrim(dur,start,end,which='end',max=MAX_TRIM,min=MIN_TRIM){dur=Math.max(0,+dur||0);min=Math.min(min,dur);let s=Math.max(0,Math.min(+start||0,dur)),e=Math.max(0,Math.min(+end||0,dur));
  if(which==='move'){const L=Math.max(min,Math.min(max,e-s));s=Math.max(0,Math.min(s,dur-L));e=s+L}
  else if(which==='start'){s=Math.min(s,dur-min);if(e-s<min)e=s+min;if(e-s>max)e=s+max}
  else{e=Math.max(e,min);if(e-s<min)s=e-min;if(e-s>max)s=e-max}
  s=Math.max(0,s);e=Math.min(dur,e);return {start:r2(s),end:r2(e)}}
const trimOk=(t,dur)=>!!t&&t.start>=0&&t.end<=dur+0.01&&t.end-t.start<=MAX_TRIM+0.01&&t.end-t.start>=Math.min(MIN_TRIM,dur)-0.01;
const mb=b=>(b/1048576).toFixed(b<10485760?1:0);
const sizeWarn=b=>b>WARN_BYTES?`This video is ${mb(b)} MB. Videos over ${WARN_BYTES/1048576} MB fill browser storage quickly, and the browser can clear it when space runs low. A shorter or lower-resolution recording is safer.`:'';
// ---- IndexedDB: one row per exercise id {id, photo: JPEG data URL | null, video: Blob | null, vtype, vsize, vdur, trim:{start,end} | null}
const DB='apechit-sb-media',ST='media';let dbp=null;
function db(){if(dbp)return dbp;dbp=new Promise((res,rej)=>{if(typeof indexedDB==='undefined')return rej(new Error('no IndexedDB'));const q=indexedDB.open(DB,1);
  q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains(ST))d.createObjectStore(ST,{keyPath:'id'})};q.onsuccess=()=>res(q.result);q.onerror=()=>{dbp=null;rej(q.error)}});return dbp}
const tx=(mode,fn)=>db().then(d=>new Promise((res,rej)=>{const t=d.transaction(ST,mode),s=t.objectStore(ST);let out;const r=fn(s);if(r)r.onsuccess=()=>{out=r.result};t.oncomplete=()=>res(out);t.onerror=t.onabort=()=>rej(t.error||new Error('IndexedDB transaction failed'))}));
// Some WebKit builds (and Safari private browsing) refuse Blobs in IndexedDB: try the Blob, else store the bytes as an ArrayBuffer
// (vbuf) and rebuild the Blob on read. Callers always see row.video as a Blob.
const fromRow=r=>{if(r&&r.vbuf&&!r.video){const o=Object.assign({},r,{video:new Blob([r.vbuf],{type:r.vtype||''})});delete o.vbuf;return o}return r};
const idbGet=id=>tx('readonly',s=>s.get(id)).then(fromRow);
const idbAll=()=>tx('readonly',s=>s.getAll()).then(a=>(a||[]).map(fromRow));
const putRaw=row=>tx('readwrite',s=>s.put(row));
async function idbPut(row){const r=Object.assign({},row);delete r.vbuf;try{return await putRaw(r)}catch(e){if(!(r.video instanceof Blob))throw e;
  const buf=await r.video.arrayBuffer();const r2=Object.assign({},r,{video:null,vbuf:buf});return putRaw(r2)}}
const idbDel=id=>tx('readwrite',s=>s.delete(id));
const blobToDataURL=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(b)});
async function dataURLToBlob(u){const r=await fetch(u);return r.blob()}
return {MAX_TRIM,MIN_TRIM,WARN_BYTES,EXPORT_VIDEO_MAX,parseTime,fmtTime,parseYouTube,canonical,oembedUrl,checkYouTube,YT_MSG,defaultTrim,clampTrim,trimOk,sizeWarn,mb,
  idbGet,idbAll,idbPut,idbDel,blobToDataURL,dataURLToBlob,DB,ST}});
