// Lift Board service worker (v24): network-first with cache fallback, so updates arrive online and the app works offline.
const C='liftboard-v29',SHELL=['./','index.html','style.css','logger.css','app.js','heat.js','check.js','fixes.js','patterns.js','suggest.js','custom.js','v14.js','analytics.js','v23.js','prs.js','loads.js','logger.js','log.js',
'data/exercises.json','data/targets.json','data/rules.json','data/splits.json','data/swap.json','data/id-aliases.json','data/custom-rules.json','data/exercise-images.json','img/mm/musclemap.json','img/mm/male-front-grey.jpg','img/mm/male-back-grey.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))))});
