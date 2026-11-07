import {REST_DEFAULT_MS} from '../logic/effort';
import {buildBackup, validateBackup, type BackupData, type BackupFile} from '../logic/backup';
import {calendarPrefix, localDate} from '../logic/clock';
import {sha256, stableStringify} from '../logic/hash';
import {planLiftBoard, type LiftPlan} from '../logic/liftboard';
import {StorageError} from './errors';
import {migrate, SCHEMA_VERSION} from './migrate';
import type {SqlDriver, SqlParam} from './sql';

export type Deps = {now: () => Date; id: (prefix: string) => string};

export type Result<T> = {ok: true; value: T} | {ok: false; code: string; message: string};

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export type SetRow = {
  id: string; entryId: string; idx: number; kind: string;
  load: number | null; reps: number | null; rir: number | null; done: boolean; note: string;
};
export type EntryRow = {id: string; exerciseId: string; name: string; notes: string; order: number; sets: SetRow[]};
export type SessionDetail = {
  id: string; status: string; date: string; startedAt: string; endedAt: string | null;
  unit: string; label: string; notes: string; routineId: string | null; dayIdx: number | null;
  pausedAt: string | null; pausedMs: number; adjMs: number; restEndsAt: string | null;
  entries: EntryRow[];
};
export type RoutineExercise = {id: string; exerciseId: string; sets: number; reps: string | null};
export type RoutineDay = {idx: number; weekday: string | null; label: string; exercises: RoutineExercise[]};
export type Routine = {id: string; name: string; active: boolean; nextDay: number; version: number; source: string; days: RoutineDay[]};
export type SessionSummary = {id: string; date: string; label: string; startedAt: string; endedAt: string | null; unit: string; sets: number; status: string};

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function createApp(driver: SqlDriver, deps: Deps) {
  const tx = <T>(fn: () => Promise<T>) => driver.withTransaction(fn);

  async function setting(key: string): Promise<unknown> {
    const row = await driver.get<{value_json: string}>('SELECT value_json FROM settings WHERE key = ?', [key]);
    if (!row) return undefined;
    try { return JSON.parse(row.value_json); } catch { throw new StorageError('corrupt', `Setting ${key} is not valid JSON`); }
  }

  async function putSetting(key: string, value: unknown): Promise<void> {
    await driver.run(
      'INSERT INTO settings(key, value_json) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json',
      [key, JSON.stringify(value)],
    );
  }

  async function counts() {
    const n = async (sql: string) => (await driver.get<{n: number}>(sql))?.n ?? 0;
    return {
      sessions: await n('SELECT COUNT(*) AS n FROM sessions'),
      entries: await n('SELECT COUNT(*) AS n FROM entries'),
      sets: await n('SELECT COUNT(*) AS n FROM sets'),
      routines: await n('SELECT COUNT(*) AS n FROM routines'),
      active: await n("SELECT COUNT(*) AS n FROM sessions WHERE status = 'active'"),
    };
  }

  async function loadSession(id: string): Promise<SessionDetail | null> {
    const s = await driver.get<any>('SELECT * FROM sessions WHERE id = ?', [id]);
    if (!s) return null;
    const entries = await driver.all<any>('SELECT * FROM entries WHERE session_id = ? ORDER BY order_idx', [id]);
    const sets = await driver.all<any>('SELECT * FROM sets WHERE session_id = ? ORDER BY idx', [id]);
    return {
      id: s.id, status: s.status, date: s.date, startedAt: s.started_at, endedAt: s.ended_at,
      unit: s.unit, label: s.label, notes: s.notes, routineId: s.routine_id, dayIdx: s.day_idx,
      pausedAt: s.paused_at, pausedMs: s.paused_ms, adjMs: s.adj_ms, restEndsAt: s.rest_ends_at,
      entries: entries.map(e => ({
        id: e.id, exerciseId: e.exercise_id, name: e.name_snapshot, notes: e.notes, order: e.order_idx,
        sets: sets.filter(x => x.entry_id === e.id).map(x => ({
          id: x.id, entryId: x.entry_id, idx: x.idx, kind: x.kind,
          load: num(x.load), reps: num(x.reps), rir: num(x.rir), done: !!x.done, note: x.note,
        })),
      })),
    };
  }

  async function getActive(): Promise<SessionDetail | null> {
    const row = await driver.get<{id: string}>("SELECT id FROM sessions WHERE status = 'active'");
    return row ? loadSession(row.id) : null;
  }

  async function unit(): Promise<'lb' | 'kg'> {
    const u = await setting('unit');
    return u === 'kg' ? 'kg' : 'lb';
  }

  async function insertSession(label: string, empty: boolean, routineId: string | null, dayIdx: number | null, exercises: {exerciseId: string; name: string; sets: number}[]): Promise<SessionDetail> {
    const existing = await driver.get<{id: string}>("SELECT id FROM sessions WHERE status = 'active'");
    if (existing) return (await loadSession(existing.id))!;
    const now = deps.now();
    const id = deps.id('s');
    const u = await unit();
    await driver.run(
      `INSERT INTO sessions(id, schema, status, date, started_at, ended_at, unit, label, notes, routine_id, day_idx, paused_ms, adj_ms, empty, extras_json, rest_ends_at)
       VALUES(?, 2, 'active', ?, ?, NULL, ?, ?, '', ?, ?, 0, 0, ?, '{}', NULL)`,
      [id, localDate(now), now.toISOString(), u, label, routineId, dayIdx, empty ? 1 : 0],
    );
    let order = 0;
    for (const ex of exercises) {
      const eid = deps.id('e');
      await driver.run(
        'INSERT INTO entries(id, session_id, order_idx, exercise_id, name_snapshot, skipped, notes, extras_json) VALUES(?, ?, ?, ?, ?, 0, \'\', \'{}\')',
        [eid, id, order++, ex.exerciseId, ex.name],
      );
      const n = Math.max(1, ex.sets || 1);
      for (let i = 0; i < n; i++) {
        await driver.run(
          'INSERT INTO sets(id, entry_id, session_id, idx, kind, done, note, extras_json) VALUES(?, ?, ?, ?, \'working\', 0, \'\', \'{}\')',
          [deps.id('t'), eid, id, i],
        );
      }
    }
    return (await loadSession(id))!;
  }

  async function listRoutines(): Promise<Routine[]> {
    const rs = await driver.all<any>('SELECT * FROM routines ORDER BY name');
    const days = await driver.all<any>('SELECT * FROM routine_days ORDER BY idx');
    const exs = await driver.all<any>('SELECT * FROM routine_exercises ORDER BY idx');
    return rs.map(r => ({
      id: r.id, name: r.name, active: !!r.active, nextDay: r.next_day, version: r.version, source: r.source,
      days: days.filter(d => d.routine_id === r.id).map(d => ({
        idx: d.idx, weekday: d.weekday, label: d.label,
        exercises: exs.filter(e => e.day_id === d.id).map(e => ({id: e.id, exerciseId: e.exercise_id, sets: e.sets, reps: e.reps})),
      })),
    }));
  }

  async function wipeUserTables(): Promise<void> {
    for (const sql of [
      'DELETE FROM sets', 'DELETE FROM entries', 'DELETE FROM sessions',
      'DELETE FROM routine_exercises', 'DELETE FROM routine_days', 'DELETE FROM routines',
      'DELETE FROM prs', 'DELETE FROM settings', 'DELETE FROM bodyweights', 'DELETE FROM notes',
      'DELETE FROM media_blobs', 'DELETE FROM media_refs', 'DELETE FROM custom_exercises', 'DELETE FROM preserved',
    ]) await driver.run(sql);
  }

  async function readBackupData(): Promise<BackupData> {
    const q = async (sql: string) => driver.all<Record<string, unknown>>(sql);
    return {
      routines: await q('SELECT * FROM routines ORDER BY id'),
      routineDays: await q('SELECT * FROM routine_days ORDER BY id'),
      routineExercises: await q('SELECT * FROM routine_exercises ORDER BY id'),
      sessions: await q('SELECT * FROM sessions ORDER BY id'),
      entries: await q('SELECT * FROM entries ORDER BY id'),
      sets: await q('SELECT * FROM sets ORDER BY id'),
      prs: await q('SELECT * FROM prs ORDER BY id'),
      settings: await q('SELECT * FROM settings ORDER BY key'),
      bodyweights: await q('SELECT * FROM bodyweights ORDER BY id'),
      notes: await q('SELECT * FROM notes ORDER BY exercise_id'),
      customExercises: await q('SELECT * FROM custom_exercises ORDER BY id'),
      mediaRefs: await q('SELECT * FROM media_refs ORDER BY id'),
      preserved: await q('SELECT * FROM preserved ORDER BY bucket'),
    };
  }

  function cols(row: Record<string, unknown>, keys: string[]): SqlParam[] {
    return keys.map(k => {
      const v = row[k];
      if (v == null) return null;
      if (typeof v === 'number' || typeof v === 'string') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      return JSON.stringify(v);
    });
  }

  async function insertBackup(file: BackupFile): Promise<void> {
    const d = file.data;
    const ins = async (sql: string, rows: Record<string, unknown>[], keys: string[]) => {
      for (const row of rows) await driver.run(sql, cols(row, keys));
    };
    await ins(`INSERT INTO routines(id, name, active, next_day, version, source, notes, created_at, updated_at, extras_json) VALUES(${q(10)})`, d.routines, ['id', 'name', 'active', 'next_day', 'version', 'source', 'notes', 'created_at', 'updated_at', 'extras_json']);
    await ins(`INSERT INTO routine_days(id, routine_id, idx, weekday, label) VALUES(${q(5)})`, d.routineDays, ['id', 'routine_id', 'idx', 'weekday', 'label']);
    await ins(`INSERT INTO routine_exercises(id, day_id, idx, exercise_id, sets, reps, extras_json) VALUES(${q(7)})`, d.routineExercises, ['id', 'day_id', 'idx', 'exercise_id', 'sets', 'reps', 'extras_json']);
    await ins(`INSERT INTO sessions(id, schema, status, date, started_at, ended_at, unit, label, notes, routine_id, routine_version, day_idx, paused_at, paused_ms, adj_ms, empty, extras_json, rest_ends_at) VALUES(${q(18)})`, d.sessions, ['id', 'schema', 'status', 'date', 'started_at', 'ended_at', 'unit', 'label', 'notes', 'routine_id', 'routine_version', 'day_idx', 'paused_at', 'paused_ms', 'adj_ms', 'empty', 'extras_json', 'rest_ends_at']);
    await ins(`INSERT INTO entries(id, session_id, order_idx, exercise_id, name_snapshot, skipped, notes, extras_json) VALUES(${q(8)})`, d.entries, ['id', 'session_id', 'order_idx', 'exercise_id', 'name_snapshot', 'skipped', 'notes', 'extras_json']);
    await ins(`INSERT INTO sets(id, entry_id, session_id, idx, kind, load, reps, rir, done, done_at, note, extras_json) VALUES(${q(12)})`, d.sets, ['id', 'entry_id', 'session_id', 'idx', 'kind', 'load', 'reps', 'rir', 'done', 'done_at', 'note', 'extras_json']);
    await ins(`INSERT INTO prs(id, session_id, set_id, exercise_id, kind, value, extras_json) VALUES(${q(7)})`, d.prs, ['id', 'session_id', 'set_id', 'exercise_id', 'kind', 'value', 'extras_json']);
    await ins('INSERT INTO settings(key, value_json) VALUES(?, ?)', d.settings, ['key', 'value_json']);
    await ins(`INSERT INTO bodyweights(id, date, value, unit, extras_json) VALUES(${q(5)})`, d.bodyweights, ['id', 'date', 'value', 'unit', 'extras_json']);
    await ins('INSERT INTO notes(exercise_id, text, extras_json) VALUES(?, ?, ?)', d.notes, ['exercise_id', 'text', 'extras_json']);
    await ins(`INSERT INTO custom_exercises(id, name, record_json, created_at, updated_at) VALUES(${q(5)})`, d.customExercises, ['id', 'name', 'record_json', 'created_at', 'updated_at']);
    await ins(`INSERT INTO media_refs(id, owner_type, owner_id, kind, local_uri, byte_size, mime, extras_json) VALUES(${q(8)})`, d.mediaRefs, ['id', 'owner_type', 'owner_id', 'kind', 'local_uri', 'byte_size', 'mime', 'extras_json']);
    await ins('INSERT INTO preserved(bucket, payload_json) VALUES(?, ?)', d.preserved, ['bucket', 'payload_json']);
  }

  async function applyLift(plan: LiftPlan): Promise<void> {
    for (const id of plan.sessions.map(s => String(s.id))) {
      await driver.run('DELETE FROM sets WHERE session_id = ?', [id]);
      await driver.run('DELETE FROM entries WHERE session_id = ?', [id]);
      await driver.run('DELETE FROM sessions WHERE id = ?', [id]);
    }
    for (const id of plan.routines.map(r => String(r.id))) {
      await driver.run('DELETE FROM routine_exercises WHERE day_id IN (SELECT id FROM routine_days WHERE routine_id = ?)', [id]);
      await driver.run('DELETE FROM routine_days WHERE routine_id = ?', [id]);
      await driver.run('DELETE FROM routines WHERE id = ?', [id]);
    }
    const ins = async (sql: string, rows: Record<string, unknown>[], keys: string[]) => {
      for (const row of rows) await driver.run(sql, cols(row, keys));
    };
    await ins(`INSERT INTO routines(id, name, active, next_day, version, source, notes, created_at, updated_at, extras_json) VALUES(${q(10)})`, plan.routines, ['id', 'name', 'active', 'next_day', 'version', 'source', 'notes', 'created_at', 'updated_at', 'extras_json']);
    await ins(`INSERT INTO routine_days(id, routine_id, idx, weekday, label) VALUES(${q(5)})`, plan.days, ['id', 'routine_id', 'idx', 'weekday', 'label']);
    await ins(`INSERT INTO routine_exercises(id, day_id, idx, exercise_id, sets, reps, extras_json) VALUES(${q(7)})`, plan.exercises, ['id', 'day_id', 'idx', 'exercise_id', 'sets', 'reps', 'extras_json']);
    await ins(`INSERT INTO sessions(id, schema, status, date, started_at, ended_at, unit, label, notes, routine_id, routine_version, day_idx, paused_at, paused_ms, adj_ms, empty, extras_json, rest_ends_at) VALUES(${q(18)})`, plan.sessions, ['id', 'schema', 'status', 'date', 'started_at', 'ended_at', 'unit', 'label', 'notes', 'routine_id', 'routine_version', 'day_idx', 'paused_at', 'paused_ms', 'adj_ms', 'empty', 'extras_json', 'rest_ends_at']);
    await ins(`INSERT INTO entries(id, session_id, order_idx, exercise_id, name_snapshot, skipped, notes, extras_json) VALUES(${q(8)})`, plan.entries, ['id', 'session_id', 'order_idx', 'exercise_id', 'name_snapshot', 'skipped', 'notes', 'extras_json']);
    await ins(`INSERT INTO sets(id, entry_id, session_id, idx, kind, load, reps, rir, done, done_at, note, extras_json) VALUES(${q(12)})`, plan.sets, ['id', 'entry_id', 'session_id', 'idx', 'kind', 'load', 'reps', 'rir', 'done', 'done_at', 'note', 'extras_json']);
    for (const p of plan.prs) await driver.run('DELETE FROM prs WHERE id = ?', [String(p.id)]);
    await ins(`INSERT INTO prs(id, session_id, set_id, exercise_id, kind, value, extras_json) VALUES(${q(7)})`, plan.prs, ['id', 'session_id', 'set_id', 'exercise_id', 'kind', 'value', 'extras_json']);
    for (const s of plan.settings) await putSetting(s.key, JSON.parse(s.value_json));
    for (const b of plan.bodyweights) {
      await driver.run('INSERT INTO bodyweights(id, date, value, unit, extras_json) VALUES(?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET date=excluded.date, value=excluded.value, unit=excluded.unit, extras_json=excluded.extras_json', cols(b, ['id', 'date', 'value', 'unit', 'extras_json']));
    }
    for (const n of plan.notes) {
      await driver.run('INSERT INTO notes(exercise_id, text, extras_json) VALUES(?, ?, ?) ON CONFLICT(exercise_id) DO UPDATE SET text=excluded.text, extras_json=excluded.extras_json', [n.exercise_id, n.text, n.extras_json]);
    }
    for (const c of plan.customs) {
      await driver.run('INSERT INTO custom_exercises(id, name, record_json, created_at, updated_at) VALUES(?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, record_json=excluded.record_json, updated_at=excluded.updated_at', [c.id, c.name, c.record_json, c.created_at, c.updated_at]);
    }
    for (const m of plan.media) {
      await driver.run('INSERT INTO media_refs(id, owner_type, owner_id, kind, local_uri, byte_size, mime, extras_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET byte_size=excluded.byte_size, mime=excluded.mime, extras_json=excluded.extras_json', cols(m.ref, ['id', 'owner_type', 'owner_id', 'kind', 'local_uri', 'byte_size', 'mime', 'extras_json']));
      if (m.blob) await driver.run('INSERT INTO media_blobs(id, media_ref_id, data) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', [String(m.ref.id) + ':blob', String(m.ref.id), m.blob]);
    }
    await driver.run('INSERT INTO preserved(bucket, payload_json) VALUES(?, ?) ON CONFLICT(bucket) DO UPDATE SET payload_json=excluded.payload_json', [plan.preserved.bucket, plan.preserved.payload_json]);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    counts,
    setting,
    putSetting,
    getActive,
    getSession: loadSession,
    listRoutines,
    unit,
    async listCustom() {
      return driver.all<{id: string; name: string}>('SELECT id, name FROM custom_exercises ORDER BY name');
    },
    async listMonth(year: number, month: number): Promise<SessionSummary[]> {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      const rows = await driver.all<any>(
        `SELECT s.*, (SELECT COUNT(*) FROM sets t WHERE t.session_id = s.id AND t.done = 1) AS done_sets
         FROM sessions s WHERE s.date LIKE ? AND s.status != 'active' ORDER BY s.started_at DESC`,
        [prefix + '%'],
      );
      return rows.map(s => ({id: s.id, date: s.date, label: s.label, startedAt: s.started_at, endedAt: s.ended_at, unit: s.unit, sets: s.done_sets, status: s.status}));
    },
    async startEmpty() {
      return tx(() => insertSession('Empty workout', true, null, null, []));
    },
    async startDay(routineId: string, dayIdx: number) {
      return tx(async () => {
        const routine = await driver.get<any>('SELECT * FROM routines WHERE id = ?', [routineId]);
        if (!routine) throw new StorageError('io', 'That routine is not on this phone.');
        const day = await driver.get<any>('SELECT * FROM routine_days WHERE routine_id = ? AND idx = ?', [routineId, dayIdx]);
        const exs = day ? await driver.all<any>('SELECT * FROM routine_exercises WHERE day_id = ? ORDER BY idx', [day.id]) : [];
        const label = day?.label || WEEKDAYS[dayIdx] || 'Workout';
        return insertSession(String(label), exs.length === 0, routineId, dayIdx, exs.map(e => ({exerciseId: e.exercise_id, name: e.exercise_id, sets: e.sets || 1})));
      });
    },
    async addExercise(sessionId: string, exerciseId: string, name: string) {
      return tx(async () => {
        const s = await driver.get<any>('SELECT status FROM sessions WHERE id = ?', [sessionId]);
        if (!s || s.status !== 'active') throw new StorageError('io', 'That workout is not in progress.');
        const order = (await driver.get<{n: number}>('SELECT COALESCE(MAX(order_idx), -1) + 1 AS n FROM entries WHERE session_id = ?', [sessionId]))!.n;
        const eid = deps.id('e');
        await driver.run('INSERT INTO entries(id, session_id, order_idx, exercise_id, name_snapshot, skipped, notes, extras_json) VALUES(?, ?, ?, ?, ?, 0, \'\', \'{}\')', [eid, sessionId, order, exerciseId, name]);
        await driver.run('INSERT INTO sets(id, entry_id, session_id, idx, kind, done, note, extras_json) VALUES(?, ?, ?, 0, \'working\', 0, \'\', \'{}\')', [deps.id('t'), eid, sessionId]);
        await driver.run('UPDATE sessions SET empty = 0 WHERE id = ?', [sessionId]);
        return loadSession(sessionId);
      });
    },
    async addSet(entryId: string) {
      return tx(async () => {
        const e = await driver.get<any>('SELECT * FROM entries WHERE id = ?', [entryId]);
        if (!e) throw new StorageError('io', 'That exercise is not in this workout.');
        const n = (await driver.get<{n: number}>('SELECT COALESCE(MAX(idx), -1) + 1 AS n FROM sets WHERE entry_id = ?', [entryId]))!.n;
        await driver.run('INSERT INTO sets(id, entry_id, session_id, idx, kind, done, note, extras_json) VALUES(?, ?, ?, ?, \'working\', 0, \'\', \'{}\')', [deps.id('t'), entryId, e.session_id, n]);
        return loadSession(e.session_id);
      });
    },
    async updateSet(setId: string, patch: {load?: number | null; reps?: number | null; rir?: number | null; done?: boolean}) {
      return tx(async () => {
        const row = await driver.get<any>('SELECT * FROM sets WHERE id = ?', [setId]);
        if (!row) throw new StorageError('io', 'That set is not in this workout.');
        const done = patch.done == null ? !!row.done : patch.done;
        await driver.run(
          'UPDATE sets SET load = ?, reps = ?, rir = ?, done = ?, done_at = ? WHERE id = ?',
          [
            patch.load === undefined ? num(row.load) : patch.load,
            patch.reps === undefined ? num(row.reps) : patch.reps,
            patch.rir === undefined ? num(row.rir) : patch.rir,
            done ? 1 : 0,
            done ? (row.done_at || deps.now().toISOString()) : null,
            setId,
          ],
        );
        if (patch.done === true) {
          const ends = new Date(deps.now().getTime() + REST_DEFAULT_MS).toISOString();
          await driver.run('UPDATE sessions SET rest_ends_at = ? WHERE id = ? AND status = \'active\'', [ends, row.session_id]);
        }
        return loadSession(row.session_id);
      });
    },
    async deleteSet(setId: string) {
      return tx(async () => {
        const row = await driver.get<any>('SELECT session_id FROM sets WHERE id = ?', [setId]);
        if (!row) return null;
        await driver.run('DELETE FROM sets WHERE id = ?', [setId]);
        return loadSession(row.session_id);
      });
    },
    async setRest(sessionId: string, endsAt: string | null) {
      await driver.run('UPDATE sessions SET rest_ends_at = ? WHERE id = ?', [endsAt, sessionId]);
      return loadSession(sessionId);
    },
    async setPaused(sessionId: string, paused: boolean) {
      return tx(async () => {
        const s = await driver.get<any>('SELECT * FROM sessions WHERE id = ?', [sessionId]);
        if (!s || s.status !== 'active') throw new StorageError('io', 'That workout is not in progress.');
        if (paused && !s.paused_at) await driver.run('UPDATE sessions SET paused_at = ? WHERE id = ?', [deps.now().toISOString(), sessionId]);
        if (!paused && s.paused_at) {
          const add = Math.max(0, deps.now().getTime() - Date.parse(s.paused_at));
          await driver.run('UPDATE sessions SET paused_at = NULL, paused_ms = ? WHERE id = ?', [s.paused_ms + add, sessionId]);
        }
        return loadSession(sessionId);
      });
    },
    async finish(sessionId: string) {
      return tx(async () => {
        const s = await driver.get<any>('SELECT * FROM sessions WHERE id = ?', [sessionId]);
        if (!s) throw new StorageError('io', 'That workout is not on this phone.');
        if (s.status === 'completed') return loadSession(sessionId);
        if (s.status !== 'active') throw new StorageError('io', 'That workout is already closed.');
        let paused = s.paused_ms || 0;
        if (s.paused_at) paused += Math.max(0, deps.now().getTime() - Date.parse(s.paused_at));
        await driver.run(
          'UPDATE sessions SET status = \'completed\', ended_at = ?, paused_at = NULL, paused_ms = ?, rest_ends_at = NULL WHERE id = ?',
          [deps.now().toISOString(), paused, sessionId],
        );
        if (s.routine_id != null && s.day_idx != null) {
          const days = await driver.all<{idx: number}>('SELECT d.idx AS idx FROM routine_days d JOIN routine_exercises e ON e.day_id = d.id WHERE d.routine_id = ? GROUP BY d.idx ORDER BY d.idx', [s.routine_id]);
          if (days.length) {
            const i = days.findIndex(d => d.idx === s.day_idx);
            const next = days[(i + 1 + days.length) % days.length].idx;
            await driver.run('UPDATE routines SET next_day = ? WHERE id = ?', [next, s.routine_id]);
          }
        }
        return loadSession(sessionId);
      });
    },
    async discard(sessionId: string) {
      await tx(async () => {
        await driver.run('DELETE FROM sets WHERE session_id = ?', [sessionId]);
        await driver.run('DELETE FROM entries WHERE session_id = ?', [sessionId]);
        await driver.run('DELETE FROM sessions WHERE id = ? AND status = \'active\'', [sessionId]);
      });
    },
    async deleteSession(sessionId: string) {
      await tx(async () => {
        await driver.run('DELETE FROM sets WHERE session_id = ?', [sessionId]);
        await driver.run('DELETE FROM entries WHERE session_id = ?', [sessionId]);
        await driver.run('DELETE FROM sessions WHERE id = ?', [sessionId]);
      });
    },
    async exportBackup() {
      const data = await readBackupData();
      const file = await buildBackup(data, deps.now());
      const text = JSON.stringify(file);
      return {text, hash: file.hash, sessions: data.sessions.length};
    },
    async restoreBackup(raw: unknown, replace: boolean): Promise<Result<{sessions: number; unchanged: boolean}>> {
      const parsed = validateBackup(raw);
      if (!parsed.ok) return parsed;
      const hash = await sha256(stableStringify(parsed.value.data));
      const before = await counts();
      const nonempty = before.sessions + before.routines > 0;
      if (!replace && nonempty) return {ok: false, code: 'has_data', message: 'This phone already has workouts or routines. Restore replaces them. Nothing was changed.'};
      const previousHash = await driver.get<{value: string}>("SELECT value FROM meta WHERE key = 'backup_hash'");
      try {
        await tx(async () => {
          await wipeUserTables();
          await insertBackup(parsed.value);
          await driver.run("INSERT INTO meta(key, value) VALUES('backup_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [hash]);
        });
      } catch (e) {
        const after = await counts();
        if (after.sessions !== before.sessions || after.routines !== before.routines) {
          throw new StorageError('io', 'Restore failed and the database may be incomplete.', {cause: e});
        }
        const msg = e instanceof Error ? e.message : 'Restore failed.';
        return {ok: false, code: 'rolled_back', message: msg + ' Nothing on this phone was changed.'};
      }
      return {ok: true, value: {sessions: parsed.value.data.sessions.length, unchanged: previousHash?.value === hash && !nonempty}};
    },
    async importLiftBoard(raw: unknown): Promise<Result<{sessions: number; entries: number; sets: number}>> {
      const plan = planLiftBoard(raw, deps.now().toISOString());
      if (!plan.ok) return plan;
      const localActive = await driver.get<{id: string}>("SELECT id FROM sessions WHERE status = 'active'");
      const incoming = plan.value.sessions.find(s => s.status === 'active');
      if (localActive && incoming && localActive.id !== incoming.id) {
        return {ok: false, code: 'active_conflict', message: 'Finish or discard the workout already in progress, then import again. Nothing was changed.'};
      }
      const before = await counts();
      try {
        await tx(() => applyLift(plan.value));
      } catch (e) {
        const after = await counts();
        if (after.sessions !== before.sessions) throw new StorageError('io', 'Import failed mid-write.', {cause: e});
        return {ok: false, code: 'rolled_back', message: (e instanceof Error ? e.message : 'Import failed.') + ' Nothing on this phone was changed.'};
      }
      const have = await driver.get<{n: number}>(
        `SELECT COUNT(*) AS n FROM sessions WHERE id IN (${plan.value.sessions.map(() => '?').join(',') || "''"})`,
        plan.value.sessions.map(s => String(s.id)),
      );
      if ((have?.n ?? 0) !== plan.value.counts.sessions) {
        throw new StorageError('io', 'Import counts do not match the file.');
      }
      return {ok: true, value: plan.value.counts};
    },
    async preserved(bucket: string) {
      const row = await driver.get<{payload_json: string}>('SELECT payload_json FROM preserved WHERE bucket = ?', [bucket]);
      return row ? JSON.parse(row.payload_json) : null;
    },
    async mediaBlob(refId: string) {
      return driver.get<{data: string}>('SELECT data FROM media_blobs WHERE media_ref_id = ?', [refId]);
    },
  };
}

function q(n: number): string {
  return Array(n).fill('?').join(', ');
}

export async function openApp(driver: SqlDriver, deps?: Partial<Deps>) {
  await migrate(driver);
  const full: Deps = {
    now: deps?.now ?? (() => new Date()),
    id: deps?.id ?? (p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),
  };
  return createApp(driver, full);
}

export {calendarPrefix};
