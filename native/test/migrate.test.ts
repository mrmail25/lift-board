import {readFileSync} from 'node:fs';
import {SQL_001, SQL_002} from '../src/data/migrationSql';
import {openNode} from '../src/data/nodeDriver';
import {migrate, SCHEMA_VERSION} from '../src/data/migrate';
import {fresh} from './helpers';

test('embedded SQL matches the migration files', () => {
  expect(SQL_001).toBe(readFileSync('src/data/migrations/001_init.sql', 'utf8'));
  expect(SQL_002).toBe(readFileSync('src/data/migrations/002_rest.sql', 'utf8'));
});

test('a new database is empty and has no sample history', async () => {
  const {app} = await fresh();
  const c = await app.counts();
  expect(c).toEqual({sessions: 0, entries: 0, sets: 0, routines: 0, active: 0});
  expect(await app.listMonth(2026, 10)).toEqual([]);
  expect(await app.listMonth(2026, 11)).toEqual([]);
});

test('migrating twice does not duplicate schema', async () => {
  const {driver} = await fresh();
  await migrate(driver);
  const v = await driver.get<{user_version: number}>('PRAGMA user_version');
  expect(v?.user_version).toBe(SCHEMA_VERSION);
});

test('v1 data survives the v2 migration', async () => {
  const {driver} = openNode(require('node:os').tmpdir() + '/apechit-v1-' + Date.now() + '.db');
  await driver.exec(SQL_001);
  await driver.exec('PRAGMA user_version = 1');
  await driver.run(
    `INSERT INTO sessions(id, schema, status, date, started_at, unit, label, notes, paused_ms, adj_ms, empty, extras_json)
     VALUES('keep', 2, 'completed', '2026-11-01', '2026-11-01T15:00:00.000Z', 'lb', 'Keep me', '', 0, 0, 0, '{}')`,
  );
  await migrate(driver);
  const row = await driver.get<{label: string; rest_ends_at: string | null}>('SELECT label, rest_ends_at FROM sessions WHERE id = ?', ['keep']);
  expect(row?.label).toBe('Keep me');
  expect(row?.rest_ends_at).toBeNull();
  const cols = await driver.all<{name: string}>('PRAGMA table_info(sessions)');
  expect(cols.map(c => c.name)).toContain('rest_ends_at');
});

test('a failed migration does not advance user_version', async () => {
  const {driver} = openNode(require('node:os').tmpdir() + '/apechit-bad-' + Date.now() + '.db');
  const real = driver.exec.bind(driver);
  driver.exec = async sql => {
    if (sql.includes('rest_ends_at')) throw new Error('disk full');
    return real(sql);
  };
  await expect(migrate(driver)).rejects.toThrow(/002_rest/);
  const row = await driver.get<{user_version: number}>('PRAGMA user_version');
  expect(row?.user_version).toBe(1);
});
