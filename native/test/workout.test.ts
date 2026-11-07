import {elapsedMs, localDate} from '../src/logic/clock';
import {fresh, reopen} from './helpers';

test('local date follows the phone calendar, not UTC', () => {
  const d = new Date(2026, 10, 7, 23, 30, 0);
  expect(localDate(d)).toBe('2026-11-07');
});

test('start, log, finish, close, and reopen keeps the workout', async () => {
  const {app, path, now} = await fresh();
  const started = await app.startEmpty();
  expect(started.date).toBe('2026-11-07');
  expect(started.status).toBe('active');
  const again = await app.startEmpty();
  expect(again.id).toBe(started.id);
  const withEx = await app.addExercise(started.id, 'barbell-bench-press', 'Barbell Bench Press');
  const entry = withEx!.entries[0];
  const setId = entry.sets[0].id;
  await app.updateSet(setId, {load: 185, reps: 5, done: true});
  await app.updateSet(setId, {rir: 2});
  const done = await app.finish(started.id);
  expect(done!.status).toBe('completed');
  expect(done!.entries[0].sets[0]).toMatchObject({load: 185, reps: 5, rir: 2, done: true});
  expect(await app.getActive()).toBeNull();

  const {app: app2} = await reopen(path, now);
  const loaded = await app2.getSession(started.id);
  expect(loaded?.status).toBe('completed');
  expect(loaded?.entries[0].name).toBe('Barbell Bench Press');
  expect(loaded?.entries[0].sets[0].load).toBe(185);
  const month = await app2.listMonth(2026, 11);
  expect(month.map(m => m.id)).toContain(started.id);
  expect(await app2.counts()).toMatchObject({sessions: 1, entries: 1, sets: 1, active: 0});
});

test('an in-progress workout is still there after the database is reopened', async () => {
  const {app, path} = await fresh();
  const s = await app.startEmpty();
  await app.addExercise(s.id, 'back-squat', 'Back Squat');
  const {app: app2} = await reopen(path);
  const active = await app2.getActive();
  expect(active?.id).toBe(s.id);
  expect(active?.entries[0].exerciseId).toBe('back-squat');
});

test('discard deletes the in-progress workout', async () => {
  const {app} = await fresh();
  const s = await app.startEmpty();
  await app.addExercise(s.id, 'back-squat', 'Back Squat');
  await app.discard(s.id);
  expect(await app.getActive()).toBeNull();
  expect(await app.counts()).toMatchObject({sessions: 0, sets: 0});
});

test('pause does not count toward elapsed time', () => {
  const start = new Date('2026-11-07T18:00:00.000Z');
  const ms = elapsedMs({startedAt: start.toISOString(), pausedMs: 60_000, pausedAt: null, adjMs: 0}, new Date(start.getTime() + 180_000));
  expect(ms).toBe(120_000);
});
