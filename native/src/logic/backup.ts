import {sha256, stableStringify} from './hash';

/** What a backup file holds. Media bytes are a separate table and are not copied here. */
export const BACKUP_KIND = 'apechit.backup';
export const BACKUP_VERSION = 1;

export const BACKUP_INCLUDES = [
  'routines',
  'routineDays',
  'routineExercises',
  'sessions',
  'entries',
  'sets',
  'prs',
  'settings',
  'bodyweights',
  'notes',
  'customExercises',
  'mediaRefs',
  'preserved',
] as const;

export const BACKUP_EXCLUDES = [
  'media file bytes (photos and videos), including inline data URLs from an imported Lift Board file',
  'the bundled exercise catalog',
  'iCloud or any other cloud copy',
] as const;

export type BackupData = {
  routines: Row[];
  routineDays: Row[];
  routineExercises: Row[];
  sessions: Row[];
  entries: Row[];
  sets: Row[];
  prs: Row[];
  settings: Row[];
  bodyweights: Row[];
  notes: Row[];
  customExercises: Row[];
  mediaRefs: Row[];
  preserved: Row[];
};

type Row = Record<string, unknown>;

export type BackupFile = {
  kind: typeof BACKUP_KIND;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  includes: readonly string[];
  excludes: readonly string[];
  data: BackupData;
};

export type FileResult<T> = {ok: true; value: T} | {ok: false; code: string; message: string};

const TABLES: (keyof BackupData)[] = [...BACKUP_INCLUDES];

export async function buildBackup(data: BackupData, now: Date): Promise<BackupFile & {hash: string}> {
  const file: BackupFile = {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    includes: BACKUP_INCLUDES,
    excludes: BACKUP_EXCLUDES,
    data,
  };
  const hash = await sha256(stableStringify(file.data));
  return {...file, hash};
}

export function validateBackup(raw: unknown): FileResult<BackupFile> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('corrupt', 'This file is not a backup.');
  const o = raw as Record<string, unknown>;
  if (o.kind !== BACKUP_KIND) return bad('not_backup', 'This file is not an ApeChit backup.');
  if (o.version !== BACKUP_VERSION) {
    return bad('unsupported_version', `This backup is version ${String(o.version)}. This app reads version ${BACKUP_VERSION}.`);
  }
  if (!o.data || typeof o.data !== 'object' || Array.isArray(o.data)) return bad('corrupt', 'The backup is missing its data.');
  const data = o.data as Record<string, unknown>;
  const out = {} as BackupData;
  for (const t of TABLES) {
    const rows = data[t];
    if (!Array.isArray(rows)) return bad('corrupt', `The backup is missing ${t}.`);
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return bad('corrupt', `A ${t} row is not an object.`);
    }
    out[t] = rows as Row[];
  }
  const ids = new Map<string, Set<string>>();
  const needId = (table: keyof BackupData, key = 'id') => {
    const set = new Set<string>();
    for (const row of out[table]) {
      const id = row[key];
      if (typeof id !== 'string' || !id) return bad('corrupt', `${table} has a row without ${key}.`);
      if (set.has(id)) return bad('corrupt', `${table} repeats ${key} ${id}.`);
      set.add(id);
    }
    ids.set(table + ':' + key, set);
    return null;
  };
  for (const t of ['routines', 'routineDays', 'routineExercises', 'sessions', 'entries', 'sets', 'prs', 'customExercises', 'mediaRefs'] as const) {
    const err = needId(t);
    if (err) return err;
  }
  for (const row of out.settings) if (typeof row.key !== 'string' || !row.key) return bad('corrupt', 'A setting has no key.');
  for (const row of out.notes) if (typeof row.exercise_id !== 'string') return bad('corrupt', 'A note has no exercise.');
  for (const row of out.preserved) if (typeof row.bucket !== 'string') return bad('corrupt', 'A preserved bucket has no name.');
  for (const row of out.bodyweights) if (typeof row.id !== 'string') return bad('corrupt', 'A bodyweight row has no id.');
  const dayIds = ids.get('routineDays:id')!;
  const routineIds = ids.get('routines:id')!;
  const sessionIds = ids.get('sessions:id')!;
  const entryIds = ids.get('entries:id')!;
  for (const row of out.routineDays) if (!routineIds.has(String(row.routine_id))) return bad('corrupt', 'A routine day points at a missing routine.');
  for (const row of out.routineExercises) if (!dayIds.has(String(row.day_id))) return bad('corrupt', 'A plan exercise points at a missing day.');
  let active = 0;
  for (const row of out.sessions) {
    if (row.status === 'active') active++;
    if (!['active', 'completed', 'discarded', 'skipped'].includes(String(row.status))) return bad('corrupt', 'A workout has a status this app does not know.');
  }
  if (active > 1) return bad('corrupt', 'The backup has more than one workout in progress.');
  for (const row of out.entries) if (!sessionIds.has(String(row.session_id))) return bad('corrupt', 'A logged exercise points at a missing workout.');
  for (const row of out.sets) if (!entryIds.has(String(row.entry_id))) return bad('corrupt', 'A set points at a missing exercise.');
  return {ok: true, value: {kind: BACKUP_KIND, version: BACKUP_VERSION, exportedAt: String(o.exportedAt || ''), includes: BACKUP_INCLUDES, excludes: BACKUP_EXCLUDES, data: out}};
}

function bad(code: string, message: string): FileResult<never> {
  return {ok: false, code, message};
}
