/* On-device store for the web app. Pure helpers are tested in node; the browser
   half uses IndexedDB database apechit-web and asks for persistent storage.
   Browser: window.APE. Node: module.exports. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.APE = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const KIND = 'apechit.backup';
  const VERSION = 1;
  const INCLUDES = ['log', 'session', 'plan', 'routines', 'settings', 'customExercises'];
  const EXCLUDES = [
    'video bytes (custom-exercise clips over the export limit, and any file that is not already a data URL)',
    'the bundled exercise catalog',
    'iCloud or any other cloud copy'
  ];
  const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const WDL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function emptyLog() {
    return { schema: 2, settings: { unit: 'lb' }, sessions: [], entries: [], sets: [], bodyweights: [], prs: [] };
  }
  function isSample(log) { return !!(log && log.meta && log.meta.kind === 'sample'); }
  function ymd(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function bad(code, message) { return { ok: false, code: code, message: message }; }

  function migrateWebLog(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('log is not an object');
    const d = clone(input);
    let v = typeof d.schema === 'number' ? d.schema : 0;
    if (!Number.isInteger(v) || v < 0 || v > 2) throw new Error('unsupported log schema ' + d.schema);
    d.sessions = Array.isArray(d.sessions) ? d.sessions : [];
    d.entries = Array.isArray(d.entries) ? d.entries : [];
    d.sets = Array.isArray(d.sets) ? d.sets : [];
    if (v === 0) {
      d.sessions.forEach(s => {
        if (!s || typeof s !== 'object') return;
        s.status = s.status || 'completed';
        s.unit = s.unit || 'lb';
        s.snapshot = s.snapshot || { exercises: [] };
        s.notes = s.notes || '';
      });
      d.entries.forEach(e => {
        if (!e || typeof e !== 'object') return;
        if (e.exercise && !e.exerciseId) { e.exerciseId = e.exercise; delete e.exercise; }
        e.nameSnapshot = e.nameSnapshot || e.exerciseId || '';
        e.notes = e.notes || '';
        e.skipped = !!e.skipped;
      });
      const em = {};
      d.entries.forEach(e => { if (e && e.id) em[e.id] = e; });
      d.sets.forEach(x => {
        if (!x || typeof x !== 'object') return;
        if ('weight' in x && !('load' in x)) { x.load = x.weight; delete x.weight; }
        x.kind = x.kind || 'working';
        if (!x.sessionId && em[x.entryId]) x.sessionId = em[x.entryId].sessionId;
        if (!('rir' in x)) x.rir = null;
      });
      d.prs = d.prs || [];
      v = 1;
    }
    if (v === 1) {
      d.entries.forEach(e => { if (e && typeof e.notes !== 'string') e.notes = ''; });
      v = 2;
    }
    d.schema = 2;
    if (!Array.isArray(d.bodyweights)) d.bodyweights = [];
    if (!Array.isArray(d.prs)) d.prs = [];
    if (!d.settings || typeof d.settings !== 'object') d.settings = { unit: 'lb' };
    return d;
  }

  function upsertSession(log, session, entries, sets) {
    const sid = session.id;
    const oldE = new Set(log.entries.filter(e => e.sessionId === sid).map(e => e.id));
    log.sessions = log.sessions.filter(s => s.id !== sid);
    log.entries = log.entries.filter(e => e.sessionId !== sid);
    log.sets = log.sets.filter(t => t.sessionId !== sid && !oldE.has(t.entryId));
    log.sessions.push(session);
    entries.forEach(e => log.entries.push(e));
    sets.forEach(t => log.sets.push(t));
  }

  function takeLog(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.logs && typeof raw.logs === 'object') return raw.logs;
    if (Array.isArray(raw.sessions)) return raw;
    return null;
  }

  /** Merge a Lift Board file into an existing storyboard log. Same ids are replaced, other rows stay. */
  function importLiftBoard(raw, existing) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('corrupt', 'This file is not a Lift Board backup.');
    if (raw.kind === KIND) return bad('not_liftboard', 'This is an ApeChit backup.');
    if (raw.app != null && raw.app !== 'lift-board') return bad('not_liftboard', 'This file is not a Lift Board backup.');
    if (raw.app === 'lift-board' && raw.version !== 2) return bad('unsupported_version', 'This Lift Board file is version ' + raw.version + '. This app reads version 2.');
    if ('days' in raw && raw.days != null && (!Array.isArray(raw.days) || raw.days.length !== 7)) return bad('corrupt', 'The week in this file does not have 7 days.');
    let src;
    try { src = migrateWebLog(takeLog(raw) || { schema: 2, sessions: [], entries: [], sets: [] }); }
    catch (e) { return bad('unsupported_version', e.message || 'This log version is not supported.'); }
    if (!Array.isArray(src.sessions) || !Array.isArray(src.entries) || !Array.isArray(src.sets)) return bad('corrupt', 'The workouts in this file are missing.');
    const seen = new Set();
    let active = 0;
    for (const s of src.sessions) {
      if (!s || typeof s.id !== 'string' || !s.id) return bad('corrupt', 'A workout has no id.');
      if (seen.has(s.id)) return bad('corrupt', 'Workout ' + s.id + ' is listed twice.');
      seen.add(s.id);
      if ((s.status || 'completed') === 'active') active++;
    }
    if (active > 1) return bad('corrupt', 'This file has two workouts in progress.');
    const entryIds = new Set();
    for (const e of src.entries) {
      if (!e || typeof e.id !== 'string') return bad('corrupt', 'A logged exercise has no id.');
      if (!seen.has(e.sessionId)) return bad('corrupt', 'A logged exercise points at a missing workout.');
      entryIds.add(e.id);
    }
    for (const t of src.sets) {
      if (!t || typeof t.id !== 'string') return bad('corrupt', 'A set has no id.');
      if (!entryIds.has(t.entryId)) return bad('corrupt', 'A set points at a missing exercise.');
    }
    const log = clone(existing && existing.schema === 2 ? existing : emptyLog());
    if (isSample(log)) { const fresh = emptyLog(); Object.keys(log).forEach(k => delete log[k]); Object.assign(log, fresh); }
    const localActive = (log.sessions || []).find(s => s.status === 'active');
    const incoming = src.sessions.find(s => (s.status || 'completed') === 'active');
    if (localActive && incoming && localActive.id !== incoming.id) return bad('active_conflict', 'Finish or discard the workout already in progress, then import again. Nothing was changed.');
    for (const s of src.sessions) {
      const sid = s.id;
      const ents = src.entries.filter(e => e.sessionId === sid);
      const sets = src.sets.filter(t => ents.some(e => e.id === t.entryId));
      upsertSession(log, Object.assign({}, s, { schema: 2, status: s.status || 'completed' }), ents, sets);
    }
    (src.prs || []).forEach(p => {
      if (!p) return;
      const id = p.id || ('pr:' + (p.setId || p.exerciseId || '') + ':' + (p.kind || 'pr'));
      log.prs = (log.prs || []).filter(x => (x.id || x.setId) !== id && x !== p);
      log.prs.push(Object.assign({ id: id }, p));
    });
    if (Array.isArray(src.bodyweights)) {
      src.bodyweights.forEach((b, i) => {
        if (!b || !(Number(b.value) > 0)) return;
        const id = b.id || ('bw:' + b.date + ':' + b.value + ':' + (b.unit || 'lb') + ':' + i);
        log.bodyweights = log.bodyweights.filter(x => x.id !== id);
        log.bodyweights.push(Object.assign({ id: id }, b));
      });
    }
    if (src.exNotes && typeof src.exNotes === 'object') log.exNotes = Object.assign({}, log.exNotes || {}, src.exNotes);
    if (src.settings && typeof src.settings === 'object') log.settings = Object.assign({}, log.settings, src.settings);
    ['deloads', 'deloadPrompt', 'readiness', 'decimalFix', 'routines'].forEach(k => { if (k in src) log[k] = src[k]; });
    if (raw.youtube && typeof raw.youtube === 'object') log.youtube = Object.assign({}, log.youtube || {}, raw.youtube);
    if (raw.analytics && typeof raw.analytics === 'object') log.analytics = raw.analytics;
    if (raw.coachNote != null) log.coachNote = raw.coachNote;
    log.preservedLiftBoard = clone(raw);
    return { ok: true, log: log, plan: planFromBoard(raw), routines: routinesFrom(raw), customExercises: Array.isArray(raw.customExercises) ? raw.customExercises.filter(c => c && c.id) : [] };
  }

  function planFromBoard(raw) {
    const days = raw && Array.isArray(raw.days) && raw.days.length === 7 ? raw.days : null;
    if (!days || !days.some(d => Array.isArray(d) && d.length)) return null;
    return {
      name: 'Imported week', level: 'intermediate', dirty: false, version: 1, edited: Date.now(), tpl: null,
      days: days.map((tiles, i) => ({
        day: WEEK[i], label: (raw.labels && raw.labels[i]) || '', rest: !(tiles && tiles.length),
        tiles: (tiles || []).filter(t => t && t.id).map((t, k) => ({ u: 'imp' + i + '_' + k, id: t.id, sets: +t.sets || 0 }))
      }))
    };
  }

  function splitToRoutine(m, prefix) {
    if (!m || typeof m.id !== 'string' || typeof m.name !== 'string' || !Array.isArray(m.days) || m.days.length !== 7) return null;
    const days = m.days.map((tiles, i) => ({
      n: (m.labels && m.labels[i]) || WDL[i], d: WDL[i], min: 0,
      ex: (tiles || []).filter(t => t && t.id).map(t => ({ id: t.id, s: +t.sets || 3, r: '' }))
    })).filter(d => d.ex.length);
    if (!days.length) return null;
    return { id: prefix + m.id, name: m.name, imported: true, meta: 'Imported', active: false, days: days };
  }

  function routinesFrom(raw) {
    const out = [];
    (Array.isArray(raw.mySplits) ? raw.mySplits : []).forEach(m => { const r = splitToRoutine(m, 'my:'); if (r) out.push(r); });
    const logs = raw.logs && typeof raw.logs === 'object' ? raw.logs : null;
    (logs && Array.isArray(logs.routines) ? logs.routines : []).forEach(m => { const r = splitToRoutine(m, 'pub:'); if (r) out.push(r); });
    return out;
  }

  /** localStorage + optional IndexedDB dump from the legacy root app, same origin. */
  function importLegacy(src, existing) {
    src = src || {};
    const ls = src.localStorage || {};
    const parse = k => { try { return ls[k] ? JSON.parse(ls[k]) : null; } catch (e) { return null; } };
    const idb = src.idb || null;
    const board = parse('liftboard.v1');
    const lsLog = parse('liftboard.logs');
    const active = parse('liftboard.logActive');
    const file = {
      app: 'lift-board', version: 2,
      days: board && board.days, labels: board && board.labels,
      mySplits: parse('liftboard.mysplits') || [],
      customExercises: parse('liftboard.customExercises') || parse('customExercises') || [],
      logs: Object.assign({
        schema: 2, sessions: [], entries: [], sets: [], prs: [],
        settings: parse('liftboard.logSettings') || {},
        routines: parse('liftboard.routines') || [],
        bodyweights: parse('liftboard.bodyweights') || [],
        exNotes: parse('liftboard.exNotes') || {},
        decimalFix: parse('liftboard.decimalFix') || undefined
      }, lsLog || {}, idb ? { sessions: idb.sessions || [], entries: idb.entries || [], sets: idb.sets || [], prs: idb.prs || [] } : {})
    };
    const deload = parse('liftboard.deload');
    if (deload && file.logs) {
      if (Array.isArray(deload.deloads)) file.logs.deloads = deload.deloads;
      if ('deloadPrompt' in deload) file.logs.deloadPrompt = deload.deloadPrompt;
      if (Array.isArray(deload.readiness)) file.logs.readiness = deload.readiness;
    }
    if (active && active.s && active.s.id) {
      const logs = file.logs;
      logs.sessions = (logs.sessions || []).filter(s => s.id !== active.s.id).concat([active.s]);
      logs.entries = (logs.entries || []).filter(e => e.sessionId !== active.s.id).concat(active.e || []);
      logs.sets = (logs.sets || []).filter(t => t.sessionId !== active.s.id).concat(active.t || []);
    }
    if (!(file.logs.sessions || []).length && !file.days && !(file.mySplits || []).length) return { ok: true, empty: true, log: existing || emptyLog(), plan: null, routines: [], customExercises: [] };
    return importLiftBoard(file, existing || emptyLog());
  }

  function buildBackup(state, now) {
    const data = {};
    INCLUDES.forEach(k => { data[k] = clone(state[k] == null ? (k === 'log' ? emptyLog() : null) : state[k]); });
    if (data.log && isSample(data.log)) data.log = emptyLog();
    return {
      kind: KIND, version: VERSION, exportedAt: (now || new Date()).toISOString(),
      includes: INCLUDES.slice(), excludes: EXCLUDES.slice(), data: data
    };
  }

  function validateBackup(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('corrupt', 'This file is not a backup.');
    if (raw.kind !== KIND) return bad('not_backup', 'This file is not an ApeChit backup.');
    if (raw.version !== VERSION) return bad('unsupported_version', 'This backup is version ' + raw.version + '. This app reads version ' + VERSION + '.');
    if (!raw.data || typeof raw.data !== 'object' || Array.isArray(raw.data)) return bad('corrupt', 'The backup is missing its data.');
    const data = {};
    for (const k of INCLUDES) {
      if (!(k in raw.data)) return bad('corrupt', 'The backup is missing ' + k + '.');
      data[k] = clone(raw.data[k]);
    }
    const log = data.log;
    if (!log || log.schema !== 2 || !Array.isArray(log.sessions) || !Array.isArray(log.entries) || !Array.isArray(log.sets)) return bad('corrupt', 'The workout log in this file is not valid.');
    if (isSample(log)) return bad('corrupt', 'This file is the sample history, not a backup.');
    const ids = new Set();
    for (const s of log.sessions) {
      if (!s || typeof s.id !== 'string') return bad('corrupt', 'A workout has no id.');
      if (ids.has(s.id)) return bad('corrupt', 'A workout id is repeated.');
      ids.add(s.id);
    }
    const eids = new Set();
    for (const e of log.entries) {
      if (!e || typeof e.id !== 'string' || !ids.has(e.sessionId)) return bad('corrupt', 'A logged exercise points at a missing workout.');
      eids.add(e.id);
    }
    for (const t of log.sets) {
      if (!t || typeof t.id !== 'string' || !eids.has(t.entryId)) return bad('corrupt', 'A set points at a missing exercise.');
    }
    return { ok: true, data: data };
  }

  function memoryKv() {
    const m = new Map();
    return {
      async get(k) { return m.has(k) ? clone(m.get(k)) : undefined; },
      async set(k, v) { m.set(k, clone(v)); },
      async dump() { const o = {}; for (const [k, v] of m) o[k] = clone(v); return o; }
    };
  }

  function createStore(kv) {
    const mem = {};
    async function put(key, value) { mem[key] = clone(value); await kv.set(key, value); }
    async function load() {
      const bag = {};
      for (const k of INCLUDES.concat(['meta'])) bag[k] = await kv.get(k);
      if (isSample(bag.log)) bag.log = null;
      Object.assign(mem, bag);
      return bag;
    }
    return {
      put: put, load: load, mem: mem, emptyLog: emptyLog, isSample: isSample, ymd: ymd,
      importLiftBoard: importLiftBoard, importLegacy: importLegacy, buildBackup: buildBackup, validateBackup: validateBackup,
      async exportFrom(now) {
        const state = {};
        for (const k of INCLUDES) state[k] = mem[k] !== undefined ? mem[k] : await kv.get(k);
        return buildBackup(state, now);
      },
      /** Writes a validated backup. On failure the previous values stay. */
      async restore(raw) {
        const v = validateBackup(raw);
        if (!v.ok) return v;
        const prev = {};
        for (const k of INCLUDES) prev[k] = await kv.get(k);
        try {
          for (const k of INCLUDES) await put(k, v.data[k]);
        } catch (e) {
          for (const k of INCLUDES) { try { await kv.set(k, prev[k]); mem[k] = prev[k]; } catch (x) {} }
          return bad('rolled_back', (e && e.message ? e.message : 'Restore failed.') + ' Nothing on this phone was changed.');
        }
        return { ok: true, data: v.data };
      }
    };
  }

  function idbKv() {
    const DB = 'apechit-web';
    let opened = null;
    function open() {
      if (opened) return opened;
      opened = new Promise((res, rej) => {
        if (typeof indexedDB === 'undefined') { rej(new Error('no IndexedDB')); return; }
        const q = indexedDB.open(DB, 1);
        q.onupgradeneeded = () => { const d = q.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); };
        q.onsuccess = () => res(q.result);
        q.onerror = () => rej(q.error);
      });
      return opened;
    }
    return {
      async get(k) {
        const db = await open();
        return new Promise((res, rej) => {
          const tx = db.transaction('kv', 'readonly');
          const r = tx.objectStore('kv').get(k);
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      },
      async set(k, v) {
        const db = await open();
        return new Promise((res, rej) => {
          const tx = db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(v, k);
          tx.oncomplete = () => res();
          tx.onerror = tx.onabort = () => rej(tx.error || new Error('IndexedDB write failed'));
        });
      }
    };
  }

  async function readLegacyIdb() {
    if (typeof indexedDB === 'undefined') return null;
    return new Promise(res => {
      let settled = false;
      const done = v => { if (!settled) { settled = true; res(v); } };
      let req;
      try { req = indexedDB.open('liftboard'); } catch (e) { return done(null); }
      req.onupgradeneeded = () => { try { req.transaction.abort(); } catch (e) {} done(null); };
      req.onerror = () => done(null);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('sessions')) { db.close(); return done(null); }
        const tx = db.transaction(['sessions', 'entries', 'sets', 'prs'], 'readonly');
        const grab = name => new Promise(r => { const q = tx.objectStore(name).getAll(); q.onsuccess = () => r(q.result || []); q.onerror = () => r([]); });
        Promise.all(['sessions', 'entries', 'sets', 'prs'].map(grab)).then(rows => {
          db.close();
          done({ sessions: rows[0], entries: rows[1], sets: rows[2], prs: rows[3] });
        }).catch(() => { db.close(); done(null); });
      };
    });
  }

  function readLegacyLocal() {
    const out = {};
    if (typeof localStorage === 'undefined') return out;
    ['liftboard.v1', 'liftboard.logs', 'liftboard.logSettings', 'liftboard.routines', 'liftboard.mysplits', 'liftboard.exNotes', 'liftboard.bodyweights', 'liftboard.deload', 'liftboard.decimalFix', 'liftboard.logActive', 'liftboard.customExercises'].forEach(k => {
      const v = localStorage.getItem(k);
      if (v != null) out[k] = v;
    });
    return out;
  }

  let store = null;
  function browserStore() {
    if (!store) store = createStore(idbKv());
    return store;
  }

  async function boot() {
    try { if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) {}
    const st = browserStore();
    let bag;
    try { bag = await st.load(); } catch (e) { bag = {}; }
    if (!bag.meta || !bag.meta.legacyImported) {
      try {
        const legacy = importLegacy({ localStorage: readLegacyLocal(), idb: await readLegacyIdb() }, bag.log || null);
        if (legacy.ok && !legacy.empty) {
          await st.put('log', legacy.log);
          if (!bag.plan && legacy.plan) await st.put('plan', legacy.plan);
          const prev = bag.routines && bag.routines.extra ? bag.routines.extra : [];
          const extra = prev.slice();
          (legacy.routines || []).forEach(r => { if (!extra.some(x => x.id === r.id)) extra.push(r); });
          if (extra.length) await st.put('routines', Object.assign({}, bag.routines || {}, { extra: extra }));
          if (legacy.customExercises && legacy.customExercises.length && !bag.customExercises) await st.put('customExercises', legacy.customExercises);
        }
      } catch (e) {}
      try { await st.put('meta', Object.assign({}, bag.meta || {}, { legacyImported: true })); } catch (e) {}
      try { bag = await st.load(); } catch (e) {}
    }
    if (!bag.log) {
      let ls = null;
      try { ls = JSON.parse(localStorage.getItem('apechit.sb.log.v2') || 'null'); } catch (e) { ls = null; }
      if (ls && ls.schema === 2 && !isSample(ls)) { bag.log = ls; try { await st.put('log', ls); } catch (e) {} }
    }
    if (bag.log && isSample(bag.log)) bag.log = null;
    return bag;
  }

  const timers = {};
  function schedule(key, value) {
    const st = browserStore();
    st.mem[key] = clone(value);
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => { st.put(key, value).catch(() => {}); }, 150);
  }
  function putNow(key, value) {
    clearTimeout(timers[key]);
    return browserStore().put(key, value);
  }

  return {
    KIND: KIND, VERSION: VERSION, INCLUDES: INCLUDES, EXCLUDES: EXCLUDES,
    emptyLog: emptyLog, isSample: isSample, ymd: ymd, migrateWebLog: migrateWebLog,
    importLiftBoard: importLiftBoard, importLegacy: importLegacy,
    buildBackup: buildBackup, validateBackup: validateBackup,
    memoryKv: memoryKv, createStore: createStore,
    boot: boot, schedule: schedule, put: putNow,
    exportNow: function (now) { return browserStore().exportFrom(now); },
    restoreNow: function (raw) { return browserStore().restore(raw); }
  };
});
