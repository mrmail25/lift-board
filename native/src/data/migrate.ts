import {StorageError} from './errors';
import {SQL_001, SQL_002} from './migrationSql';
import type {SqlDriver} from './sql';

export const MIGRATIONS: {version: number; name: string; sql: string}[] = [
  {version: 1, name: '001_init', sql: SQL_001},
  {version: 2, name: '002_rest', sql: SQL_002},
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/**
 * Applies pending migrations in order. Each migration is its own transaction.
 * A failure rolls that migration back and leaves user_version on the last one that committed.
 */
export async function migrate(db: SqlDriver): Promise<void> {
  const row = await db.get<{user_version: number}>('PRAGMA user_version');
  let v = Number(row?.user_version ?? 0);
  if (!Number.isInteger(v) || v < 0) throw new StorageError('migration', 'Bad user_version');
  for (const m of MIGRATIONS) {
    if (m.version <= v) continue;
    if (m.version !== v + 1) throw new StorageError('migration', `Missing migration ${v + 1} (have ${m.version})`);
    try {
      await db.withTransaction(async () => {
        await db.exec(m.sql);
        await db.exec(`PRAGMA user_version = ${m.version}`);
      });
    } catch (e) {
      if (e instanceof StorageError && e.code === 'migration') throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new StorageError('migration', `${m.name} failed: ${msg}`, {cause: e});
    }
    v = m.version;
  }
}
