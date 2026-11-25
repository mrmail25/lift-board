const {test} = require('node:test');
const assert = require('node:assert/strict');
const APE = require('../logic/store.js');

function mem() { return APE.createStore(APE.memoryKv()); }

test('a new log is empty and a sample log is recognized', () => {
  const log = APE.emptyLog();
  assert.equal(log.sessions.length, 0);
  assert.equal(APE.isSample({ meta: { kind: 'sample' }, sessions: [{}] }), true);
  assert.equal(APE.isSample(log), false);
});

test('backup round trip and a bad version leaves the store as it was', async () => {
  const st = mem();
  const log = APE.emptyLog();
  log.sessions.push({ id: 's1', schema: 2, status: 'completed', startedAt: '2026-11-07T18:00:00.000Z', unit: 'lb', label: 'Upper', notes: '' });
  log.entries.push({ id: 'e1', sessionId: 's1', order: 0, exerciseId: 'back-squat', nameSnapshot: 'Back Squat', notes: '', skipped: false });
  log.sets.push({ id: 't1', entryId: 'e1', sessionId: 's1', idx: 0, kind: 'working', load: 225, reps: 5, rir: 2, done: true });
  await st.put('log', log);
  await st.put('plan', { name: 'Upper / Lower', days: [{ day: 'mon', tiles: [{ u: 'a', id: 'back-squat', sets: 4 }] }] });
  await st.put('session', { title: 'Upper A', ex: [{ id: 'back-squat', sets: [{ wv: '225', rv: '5', done: true }] }] });
  const file = await st.exportFrom(new Date('2026-11-25T00:00:00.000Z'));
  assert.equal(file.kind, 'apechit.backup');
  assert.equal(file.version, 1);
  assert.ok(file.excludes.some(x => /video bytes/.test(x)));
  assert.equal(JSON.stringify(file).includes('data:image'), false);

  await st.put('log', Object.assign(APE.emptyLog(), { sessions: [{ id: 'keep', schema: 2, status: 'completed', startedAt: '2026-11-08T12:00:00.000Z', unit: 'lb', label: 'Keep', notes: '' }], entries: [], sets: [] }));
  const refused = await st.restore(Object.assign({}, file, { version: 9 }));
  assert.equal(refused.ok, false);
  assert.equal(refused.code, 'unsupported_version');
  assert.equal((await st.load()).log.sessions[0].id, 'keep');

  const corrupt = await st.restore({ kind: 'apechit.backup', version: 1, data: { log: { schema: 2, sessions: [], entries: [{ id: 'e', sessionId: 'missing' }], sets: [] } } });
  assert.equal(corrupt.ok, false);
  assert.equal((await st.load()).log.sessions[0].id, 'keep');

  const ok = await st.restore(file);
  assert.equal(ok.ok, true);
  const again = await st.load();
  assert.equal(again.log.sessions.length, 1);
  assert.equal(again.log.sessions[0].id, 's1');
  assert.equal(again.log.sets[0].load, 225);
  assert.equal(again.plan.name, 'Upper / Lower');
  assert.equal(again.session.title, 'Upper A');
});

test('a restore that throws mid-write puts the previous log back', async () => {
  const kv = APE.memoryKv();
  let boom = false;
  const wrapped = {
    get: k => kv.get(k),
    set: async (k, v) => { if (boom && k === 'plan') throw new Error('disk full'); await kv.set(k, v); }
  };
  const st = APE.createStore(wrapped);
  await st.put('log', Object.assign(APE.emptyLog(), { sessions: [{ id: 'keep', schema: 2, status: 'completed', startedAt: '2026-11-01T00:00:00.000Z', unit: 'lb', label: 'Keep', notes: '' }], entries: [], sets: [] }));
  const file = await st.exportFrom(new Date());
  file.data.log = APE.emptyLog();
  file.data.plan = { name: 'x', days: [] };
  boom = true;
  const res = await st.restore(file);
  assert.equal(res.ok, false);
  assert.equal(res.code, 'rolled_back');
  assert.equal((await st.load()).log.sessions[0].id, 'keep');
});

test('Lift Board version 2 import is idempotent and keeps unknown fields', () => {
  const file = {
    app: 'lift-board', version: 2, coachNote: 'keep this',
    days: [[{ id: 'barbell-bench-press', sets: 4 }], [], [], [], [], [], []],
    labels: ['Push', '', '', '', '', '', ''],
    mySplits: [{ id: 'sp1', name: 'My split', days: [[{ id: 'back-squat', sets: 3 }], [], [], [], [], [], []], labels: ['Legs'] }],
    customExercises: [{ id: 'custom-press', name: 'My press' }],
    logs: {
      schema: 0,
      sessions: [{ id: 's-old', date: '2019-05-01T10:00:00.000Z', label: 'Then' }],
      entries: [{ id: 'e', sessionId: 's-old', exercise: 'pull-up' }],
      sets: [{ id: 't', entryId: 'e', weight: 25, reps: 8 }],
      exNotes: { 'pull-up': 'pause' }
    }
  };
  const first = APE.importLiftBoard(file, APE.emptyLog());
  assert.equal(first.ok, true);
  assert.equal(first.log.sessions[0].label, 'Then');
  assert.equal(first.log.entries[0].exerciseId, 'pull-up');
  assert.equal(first.log.sets[0].load, 25);
  assert.equal(first.log.exNotes['pull-up'], 'pause');
  assert.equal(first.log.coachNote, 'keep this');
  assert.equal(first.plan.days[0].tiles[0].id, 'barbell-bench-press');
  assert.equal(first.routines[0].name, 'My split');
  const local = APE.emptyLog();
  local.sessions.push({ id: 'mine', schema: 2, status: 'completed', startedAt: '2026-11-07T12:00:00.000Z', unit: 'lb', label: 'Mine', notes: '' });
  const merged = APE.importLiftBoard(file, local);
  const twice = APE.importLiftBoard(file, merged.log);
  assert.equal(twice.log.sessions.length, 2);
  assert.ok(twice.log.sessions.some(s => s.id === 'mine'));
  assert.equal(twice.log.sets.filter(t => t.id === 't').length, 1);
});

test('legacy localStorage migrates once worth of rows and does not duplicate', () => {
  const src = {
    localStorage: {
      'liftboard.v1': JSON.stringify({ days: [[{ id: 'back-squat', sets: 5 }], [], [], [], [], [], []], labels: ['Legs'] }),
      'liftboard.logs': JSON.stringify({
        schema: 2,
        sessions: [{ id: 'web1', status: 'completed', startedAt: '2026-11-02T15:00:00.000Z', unit: 'lb', label: 'Lower', notes: 'solid' }],
        entries: [{ id: 'e1', sessionId: 'web1', order: 0, exerciseId: 'back-squat', nameSnapshot: 'Back Squat', notes: '' }],
        sets: [{ id: 't1', entryId: 'e1', sessionId: 'web1', idx: 0, kind: 'working', load: 315, reps: 3, done: true }]
      }),
      'liftboard.mysplits': JSON.stringify([{ id: 'a', name: 'Saved', days: [[{ id: 'deadlift', sets: 1 }], [], [], [], [], [], []], labels: ['Pull'] }]),
      'liftboard.exNotes': JSON.stringify({ deadlift: 'belt' })
    }
  };
  const once = APE.importLegacy(src, APE.emptyLog());
  assert.equal(once.ok, true);
  assert.equal(once.log.sessions[0].id, 'web1');
  assert.equal(once.log.sets[0].load, 315);
  assert.equal(once.log.exNotes.deadlift, 'belt');
  assert.equal(once.plan.days[0].tiles[0].sets, 5);
  assert.equal(once.routines[0].id, 'my:a');
  const again = APE.importLegacy(src, once.log);
  assert.equal(again.log.sessions.length, 1);
  assert.equal(again.log.sets.length, 1);
});

test('an unsupported Lift Board version changes nothing', () => {
  const existing = APE.emptyLog();
  existing.sessions.push({ id: 'keep', schema: 2, status: 'completed', startedAt: '2026-01-01T00:00:00.000Z', unit: 'lb', label: 'Keep', notes: '' });
  const res = APE.importLiftBoard({ app: 'lift-board', version: 9, days: [[], [], [], [], [], [], []], logs: { schema: 2, sessions: [], entries: [], sets: [] } }, existing);
  assert.equal(res.ok, false);
  assert.equal(res.code, 'unsupported_version');
  assert.equal(existing.sessions.length, 1);
});
