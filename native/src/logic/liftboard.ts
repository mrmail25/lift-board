import {calendarPrefix} from './clock';
import {migrateWebLog} from './webMigrate';

export type FileResult<T> = {ok: true; value: T} | {ok: false; code: string; message: string};

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const STATUSES = new Set(['active', 'completed', 'discarded', 'skipped']);

export type LiftPlan = {
  routines: Record<string, unknown>[];
  days: Record<string, unknown>[];
  exercises: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  entries: Record<string, unknown>[];
  sets: Record<string, unknown>[];
  prs: Record<string, unknown>[];
  settings: {key: string; value_json: string}[];
  bodyweights: Record<string, unknown>[];
  notes: {exercise_id: string; text: string; extras_json: string}[];
  customs: {id: string; name: string; record_json: string; created_at: string; updated_at: string}[];
  media: {ref: Record<string, unknown>; blob: string | null}[];
  preserved: {bucket: string; payload_json: string};
  counts: {sessions: number; entries: number; sets: number};
};

type BlobHit = {mime: string; data: string; bytes: number; ownerType: string; ownerId: string};

/** Removes inline data URLs so a later backup cannot pretend those bytes were included. Bytes are returned separately. */
export function stripDataUrls(value: unknown, hits: BlobHit[], ownerType: string, ownerId: string): unknown {
  if (typeof value === 'string') {
    const m = /^data:([^;,]+);base64,/.exec(value);
    if (!m) return value;
    const b64 = value.slice(m[0].length);
    hits.push({mime: m[1] || 'application/octet-stream', data: value, bytes: Math.floor(b64.length * 3 / 4), ownerType, ownerId});
    return null;
  }
  if (Array.isArray(value)) return value.map(v => stripDataUrls(v, hits, ownerType, ownerId));
  if (value && typeof value === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) o[k] = stripDataUrls(v, hits, ownerType, ownerId);
    return o;
  }
  return value;
}

function bad(code: string, message: string): FileResult<never> {
  return {ok: false, code, message};
}

function extras(obj: Record<string, unknown>, keep: string[]): string {
  const drop = new Set(keep);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (!drop.has(k)) out[k] = v;
  return JSON.stringify(out);
}

function tilesOf(days: unknown, routineId: string, labels: unknown): {days: Record<string, unknown>[]; exercises: Record<string, unknown>[]} | null {
  if (!Array.isArray(days)) return null;
  const labs = Array.isArray(labels) ? labels : [];
  const dayRows: Record<string, unknown>[] = [];
  const exRows: Record<string, unknown>[] = [];
  days.forEach((tiles, idx) => {
    const dayId = `${routineId}:d${idx}`;
    dayRows.push({
      id: dayId,
      routine_id: routineId,
      idx,
      weekday: WEEKDAYS[idx] || null,
      label: typeof labs[idx] === 'string' ? labs[idx] : '',
    });
    const list = Array.isArray(tiles) ? tiles : [];
    list.forEach((t, i) => {
      if (!t || typeof t !== 'object') return;
      const tile = t as Record<string, unknown>;
      const exerciseId = typeof tile.id === 'string' ? tile.id : typeof tile.exerciseId === 'string' ? tile.exerciseId : '';
      if (!exerciseId) return;
      const sets = Number(tile.sets);
      exRows.push({
        id: `${dayId}:e${i}`,
        day_id: dayId,
        idx: i,
        exercise_id: exerciseId,
        sets: Number.isFinite(sets) && sets >= 0 ? Math.round(sets) : 0,
        reps: tile.reps == null ? null : String(tile.reps),
        extras_json: extras(tile, ['id', 'exerciseId', 'sets', 'reps']),
      });
    });
  });
  return {days: dayRows, exercises: exRows};
}

/**
 * Maps a Lift Board backup (the file the web Backup button writes, or a bare schema-2 log)
 * onto rows. Unknown fields stay on the row or inside the preserved copy of the file.
 * Inline data URLs are pulled out into media blobs and replaced with null in JSON that can be exported.
 */
export function planLiftBoard(raw: unknown, nowIso: string): FileResult<LiftPlan> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('corrupt', 'This file is not a Lift Board backup.');
  const root = raw as Record<string, unknown>;
  if (root.kind === 'apechit.backup') return bad('not_liftboard', 'This is an ApeChit backup. Use Restore, which replaces what is on this phone.');
  if (root.app != null && root.app !== 'lift-board') return bad('not_liftboard', 'This file is not a Lift Board backup.');
  if (root.app === 'lift-board' && root.version !== 2) {
    return bad('unsupported_version', `This Lift Board file is version ${String(root.version)}. This app reads version 2.`);
  }
  if ('days' in root && root.days != null && (!Array.isArray(root.days) || root.days.length !== 7)) {
    return bad('corrupt', 'The week in this file does not have 7 days.');
  }

  const hits: BlobHit[] = [];
  const file = stripDataUrls(JSON.parse(JSON.stringify(root)), hits, 'liftboard_file', 'file') as Record<string, any>;

  let logSource: unknown = file.logs;
  if (logSource == null && Array.isArray(file.sessions)) logSource = file;
  if (logSource == null) logSource = {schema: 2, sessions: [], entries: [], sets: []};
  let log: Record<string, any>;
  try { log = migrateWebLog(logSource) as Record<string, any>; }
  catch (e) { return bad('unsupported_version', e instanceof Error ? e.message : 'This log version is not supported.'); }

  if (!Array.isArray(log.sessions) || !Array.isArray(log.entries) || !Array.isArray(log.sets)) {
    return bad('corrupt', 'The workouts in this file are missing.');
  }

  const sessions: Record<string, unknown>[] = [];
  const sessionIds = new Set<string>();
  let activeId: string | null = null;
  for (const s of log.sessions) {
    if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !s.id) return bad('corrupt', 'A workout has no id.');
    if (sessionIds.has(s.id)) return bad('corrupt', `Workout ${s.id} is listed twice.`);
    sessionIds.add(s.id);
    const status = String(s.status || 'completed');
    if (!STATUSES.has(status)) return bad('corrupt', `Workout ${s.id} has a status this app does not know.`);
    if (status === 'active') {
      if (activeId) return bad('corrupt', 'This file has two workouts in progress.');
      activeId = s.id;
    }
    const started = typeof s.startedAt === 'string' ? s.startedAt : typeof s.date === 'string' ? s.date : nowIso;
    sessions.push({
      id: s.id,
      schema: 2,
      status,
      date: calendarPrefix(started, nowIso.slice(0, 10)),
      started_at: started,
      ended_at: typeof s.endedAt === 'string' ? s.endedAt : null,
      unit: s.unit === 'kg' ? 'kg' : 'lb',
      label: typeof s.label === 'string' && s.label ? s.label : 'Workout',
      notes: typeof s.notes === 'string' ? s.notes : '',
      routine_id: typeof s.routineId === 'string' ? s.routineId : null,
      routine_version: typeof s.routineVersion === 'number' ? s.routineVersion : null,
      day_idx: typeof s.dayIdx === 'number' ? s.dayIdx : null,
      paused_at: typeof s.pausedAt === 'string' ? s.pausedAt : null,
      paused_ms: Number(s.pausedMs) || 0,
      adj_ms: Number(s.adjMs) || 0,
      empty: s.empty ? 1 : 0,
      extras_json: extras(s, ['id', 'schema', 'status', 'date', 'startedAt', 'endedAt', 'unit', 'label', 'notes', 'routineId', 'routineVersion', 'dayIdx', 'pausedAt', 'pausedMs', 'adjMs', 'empty']),
      rest_ends_at: null,
    });
  }

  const entries: Record<string, unknown>[] = [];
  const entryIds = new Set<string>();
  const entrySession = new Map<string, string>();
  for (const e of log.entries) {
    if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !e.id) return bad('corrupt', 'A logged exercise has no id.');
    if (entryIds.has(e.id)) return bad('corrupt', `Logged exercise ${e.id} is listed twice.`);
    const sid = typeof e.sessionId === 'string' ? e.sessionId : '';
    if (!sessionIds.has(sid)) return bad('corrupt', `Logged exercise ${e.id} points at a missing workout.`);
    entryIds.add(e.id);
    entrySession.set(e.id, sid);
    entries.push({
      id: e.id,
      session_id: sid,
      order_idx: Number.isFinite(+e.order) ? +e.order : entries.length,
      exercise_id: typeof e.exerciseId === 'string' ? e.exerciseId : '',
      name_snapshot: typeof e.nameSnapshot === 'string' ? e.nameSnapshot : String(e.exerciseId || ''),
      skipped: e.skipped ? 1 : 0,
      notes: typeof e.notes === 'string' ? e.notes : '',
      extras_json: extras(e, ['id', 'sessionId', 'order', 'exerciseId', 'nameSnapshot', 'skipped', 'notes']),
    });
  }

  const sets: Record<string, unknown>[] = [];
  const setIds = new Set<string>();
  for (const x of log.sets) {
    if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id) return bad('corrupt', 'A set has no id.');
    if (setIds.has(x.id)) return bad('corrupt', `Set ${x.id} is listed twice.`);
    const eid = typeof x.entryId === 'string' ? x.entryId : '';
    if (!entryIds.has(eid)) return bad('corrupt', `Set ${x.id} points at a missing exercise.`);
    setIds.add(x.id);
    const sid = typeof x.sessionId === 'string' && sessionIds.has(x.sessionId) ? x.sessionId : entrySession.get(eid)!;
    sets.push({
      id: x.id,
      entry_id: eid,
      session_id: sid,
      idx: Number.isFinite(+x.idx) ? +x.idx : 0,
      kind: typeof x.kind === 'string' ? x.kind : 'working',
      load: x.load == null || x.load === '' ? null : Number(x.load),
      reps: x.reps == null || x.reps === '' ? null : Number(x.reps),
      rir: x.rir == null || x.rir === '' ? null : Number(x.rir),
      done: x.done ? 1 : 0,
      done_at: typeof x.doneAt === 'string' ? x.doneAt : null,
      note: typeof x.note === 'string' ? x.note : '',
      extras_json: extras(x, ['id', 'entryId', 'sessionId', 'idx', 'kind', 'load', 'reps', 'rir', 'done', 'doneAt', 'note', 'weight']),
    });
  }

  const prs: Record<string, unknown>[] = [];
  const prSeen = new Set<string>();
  (Array.isArray(log.prs) ? log.prs : []).forEach((p: any, i: number) => {
    if (!p || typeof p !== 'object') return;
    const id = typeof p.id === 'string' && p.id ? p.id : `pr:${p.setId || p.exerciseId || i}:${p.kind || 'pr'}:${i}`;
    if (prSeen.has(id)) return;
    prSeen.add(id);
    prs.push({
      id,
      session_id: typeof p.sessionId === 'string' ? p.sessionId : null,
      set_id: typeof p.setId === 'string' ? p.setId : null,
      exercise_id: typeof p.exerciseId === 'string' ? p.exerciseId : '',
      kind: typeof p.kind === 'string' ? p.kind : 'pr',
      value: p.value == null ? null : Number(p.value),
      extras_json: extras(p, ['id', 'sessionId', 'setId', 'exerciseId', 'kind', 'value']),
    });
  });

  const routines: Record<string, unknown>[] = [];
  const days: Record<string, unknown>[] = [];
  const exercises: Record<string, unknown>[] = [];
  const addRoutine = (id: string, name: string, version: number, source: string, dayList: unknown, labels: unknown, extra: unknown, created: string) => {
    const built = tilesOf(dayList, id, labels);
    if (!built) return;
    routines.push({
      id, name, active: 0, next_day: 0, version, source, notes: '',
      created_at: created, updated_at: created, extras_json: JSON.stringify(extra ?? {}),
    });
    days.push(...built.days);
    exercises.push(...built.exercises);
  };

  if (Array.isArray(log.routines)) {
    const byId = new Map<string, any[]>();
    for (const r of log.routines) {
      if (!r || typeof r.id !== 'string') continue;
      const list = byId.get(r.id) || [];
      list.push(r);
      byId.set(r.id, list);
    }
    for (const [id, vers] of byId) {
      vers.sort((a, b) => (a.version || 0) - (b.version || 0));
      const last = vers[vers.length - 1];
      addRoutine(id, String(last.name || 'Routine'), Number(last.version) || vers.length, String(last.source || 'import'), last.days, last.labels, {versions: vers}, typeof last.publishedAt === 'string' ? last.publishedAt : nowIso);
    }
  }

  if (Array.isArray(file.mySplits)) {
    for (const m of file.mySplits as any[]) {
      if (!m || typeof m.id !== 'string' || typeof m.name !== 'string' || !Array.isArray(m.days) || m.days.length !== 7) continue;
      addRoutine('mysplit:' + m.id, m.name, 1, 'mysplit', m.days, m.labels, {split: m}, typeof m.saved === 'string' ? m.saved : nowIso);
    }
  }

  if (Array.isArray(file.days) && file.days.some((d: unknown) => Array.isArray(d) && d.length)) {
    addRoutine('liftboard-week', 'Imported week', 1, 'board', file.days, file.labels, {loaded: file.loaded ?? null}, nowIso);
  }

  const settings: {key: string; value_json: string}[] = [];
  if (log.settings && typeof log.settings === 'object') {
    for (const [k, v] of Object.entries(log.settings)) settings.push({key: k, value_json: JSON.stringify(v)});
  }
  if (log.settings && typeof (log.settings as any).activeRoutine === 'string') {
    const id = (log.settings as any).activeRoutine as string;
    const hit = routines.find(r => r.id === id);
    if (hit) hit.active = 1;
  }

  const bodyweights: Record<string, unknown>[] = [];
  (Array.isArray(log.bodyweights) ? log.bodyweights : []).forEach((b: any, i: number) => {
    if (!b || typeof b !== 'object' || !(Number(b.value) > 0)) return;
    const date = calendarPrefix(String(b.date || ''), nowIso.slice(0, 10));
    const unit = b.unit === 'kg' ? 'kg' : 'lb';
    bodyweights.push({id: `bw:${date}:${b.value}:${unit}:${i}`, date, value: Number(b.value), unit, extras_json: extras(b, ['date', 'value', 'unit'])});
  });

  const notes: LiftPlan['notes'] = [];
  if (log.exNotes && typeof log.exNotes === 'object') {
    for (const [id, text] of Object.entries(log.exNotes)) {
      if (typeof text === 'string') notes.push({exercise_id: id, text, extras_json: '{}'});
    }
  }

  const customs: LiftPlan['customs'] = [];
  if (Array.isArray(file.customExercises)) {
    for (const c of file.customExercises as any[]) {
      if (!c || typeof c.id !== 'string' || !c.id) continue;
      customs.push({
        id: c.id,
        name: typeof c.name === 'string' && c.name ? c.name : c.id,
        record_json: JSON.stringify(c),
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
  }

  const media = hits.map((h, i) => ({
    ref: {
      id: `media:${h.ownerType}:${h.ownerId}:${i}`,
      owner_type: h.ownerType,
      owner_id: h.ownerId,
      kind: h.mime.startsWith('video') ? 'video' : 'photo',
      local_uri: null,
      byte_size: h.bytes,
      mime: h.mime,
      extras_json: JSON.stringify({stored: 'inline-import', includedInBackup: false}),
    },
    blob: h.data,
  }));

  return {
    ok: true,
    value: {
      routines, days, exercises, sessions, entries, sets, prs, settings, bodyweights, notes, customs, media,
      preserved: {bucket: 'liftboard.file', payload_json: JSON.stringify(file)},
      counts: {sessions: sessions.length, entries: entries.length, sets: sets.length},
    },
  };
}
