import {readFileSync} from 'node:fs';
import {BACKUP_EXCLUDES, validateBackup} from '../src/logic/backup';
import {fresh} from './helpers';

const sample = () => JSON.parse(readFileSync('test/fixtures/lift-board-v2.json', 'utf8'));

test('backup round trip replaces data and rejects a bad version without touching rows', async () => {
  const {app} = await fresh();
  const s = await app.startEmpty();
  await app.addExercise(s.id, 'back-squat', 'Back Squat');
  await app.finish(s.id);
  const exported = await app.exportBackup();
  const parsed = JSON.parse(exported.text);
  expect(parsed.kind).toBe('apechit.backup');
  expect(parsed.version).toBe(1);
  expect(parsed.excludes).toEqual([...BACKUP_EXCLUDES]);
  expect(exported.text).not.toContain('data:image');
  expect(validateBackup(parsed).ok).toBe(true);

  await app.startEmpty();
  expect((await app.counts()).active).toBe(1);
  const refused = await app.restoreBackup({...parsed, version: 99}, true);
  expect(refused.ok).toBe(false);
  if (!refused.ok) expect(refused.code).toBe('unsupported_version');
  expect((await app.counts()).sessions).toBe(2);

  const corrupt = await app.restoreBackup({kind: 'apechit.backup', version: 1}, true);
  expect(corrupt.ok).toBe(false);
  expect((await app.counts()).sessions).toBe(2);

  const replaced = await app.restoreBackup(parsed, true);
  expect(replaced.ok).toBe(true);
  const c = await app.counts();
  expect(c.sessions).toBe(1);
  expect(c.active).toBe(0);
  const month = await app.listMonth(2026, 11);
  expect(month[0].label).toBe('Empty workout');
});

test('restore refuses to replace when asked not to, and rolls back a mid-write failure', async () => {
  const {app, driver} = await fresh();
  await app.startEmpty();
  const exported = JSON.parse((await app.exportBackup()).text);
  const blocked = await app.restoreBackup(exported, false);
  expect(blocked.ok).toBe(false);
  if (!blocked.ok) expect(blocked.code).toBe('has_data');

  const orig = driver.run.bind(driver);
  let inserts = 0;
  driver.run = async (sql, params) => {
    if (sql.startsWith('INSERT INTO sessions')) {
      inserts++;
      if (inserts > 0) throw new Error('disk full');
    }
    return orig(sql, params);
  };
  const failed = await app.restoreBackup(exported, true);
  expect(failed.ok).toBe(false);
  if (!failed.ok) expect(failed.code).toBe('rolled_back');
  expect((await app.counts()).sessions).toBe(1);
});

test('lift board v2 import keeps ids, unknown fields, and local workouts', async () => {
  const {app} = await fresh();
  const local = await app.startEmpty();
  await app.finish(local.id);
  const first = await app.importLiftBoard(sample());
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(first.value).toEqual({sessions: 2, entries: 2, sets: 3});
  const imported = await app.getSession('s-web');
  expect(imported?.label).toBe('Upper A');
  expect(imported?.entries[0].sets[0]).toMatchObject({load: 185, reps: 5, done: true});
  expect(imported?.entries[0].sets[0].note).toBe('');
  const extras = await app.getSession('s-old');
  expect(extras?.label).toBe('Old day');
  const preserved = await app.preserved('liftboard.file');
  expect(preserved.coachNote).toBe('keep this');
  expect(preserved.logs.sessions.find((s: {id: string}) => s.id === 's-web').coachOnly).toBe('field stays');
  expect(JSON.stringify(preserved)).not.toContain('data:image');
  const routines = await app.listRoutines();
  expect(routines.map(r => r.name).sort()).toEqual(['Imported week', 'My upper lower', 'Published']);
  const custom = await app.listCustom();
  expect(custom[0].name).toBe('My press');
  const blob = await app.mediaBlob('media:liftboard_file:file:0');
  expect(blob?.data.startsWith('data:image/png')).toBe(true);
  const text = (await app.exportBackup()).text;
  expect(text).not.toContain('data:image');
  expect(text).toContain('My press');

  const second = await app.importLiftBoard(sample());
  expect(second.ok).toBe(true);
  const sessions = (await app.counts()).sessions;
  expect(sessions).toBe(3);
  expect(await app.listMonth(2026, 11)).toHaveLength(2);
  expect(await app.listMonth(2020, 1)).toHaveLength(1);
});

test('a schema 0 log renames weight and exercise without dropping the set', async () => {
  const {app} = await fresh();
  const res = await app.importLiftBoard({
    schema: 0,
    sessions: [{id: 'old', date: '2019-05-01T10:00:00.000Z', label: 'Then'}],
    entries: [{id: 'e', sessionId: 'old', exercise: 'pull-up'}],
    sets: [{id: 't', entryId: 'e', weight: 25, reps: 8}],
  });
  expect(res.ok).toBe(true);
  const s = await app.getSession('old');
  expect(s?.entries[0].exerciseId).toBe('pull-up');
  expect(s?.entries[0].sets[0].load).toBe(25);
  expect(s?.date).toBe('2019-05-01');
});

test('unsupported and broken lift board files change nothing', async () => {
  const {app} = await fresh();
  await app.startEmpty();
  const badVer = await app.importLiftBoard({app: 'lift-board', version: 9, days: [[], [], [], [], [], [], []], logs: {schema: 2, sessions: [], entries: [], sets: []}});
  expect(badVer.ok).toBe(false);
  if (!badVer.ok) expect(badVer.code).toBe('unsupported_version');
  const broken = await app.importLiftBoard({app: 'lift-board', version: 2, days: [[], [], [], [], [], [], []], logs: {schema: 2, sessions: [{id: 'a', status: 'completed', startedAt: '2026-01-01T00:00:00Z', label: 'A'}], entries: [], sets: [{id: 't', entryId: 'missing'}]}});
  expect(broken.ok).toBe(false);
  expect((await app.counts()).sessions).toBe(1);
});

test('a second in-progress workout in the file is refused', async () => {
  const {app} = await fresh();
  await app.startEmpty();
  const file = sample();
  file.logs.sessions.push({id: 's-live', schema: 2, status: 'active', startedAt: '2026-11-07T12:00:00.000Z', unit: 'lb', label: 'Live', notes: '', snapshot: {exercises: []}});
  const res = await app.importLiftBoard(file);
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.code).toBe('active_conflict');
  expect((await app.counts()).sessions).toBe(1);
});
