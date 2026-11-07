import {DatabaseSync} from 'node:sqlite';
import {asStorageError} from './errors';
import type {SqlDriver, SqlParam} from './sql';

/** Node's built-in SQLite, used by tests and any non-device run. Foreign keys stay on. */
export function openNode(path: string): {db: DatabaseSync; driver: SqlDriver} {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  const driver: SqlDriver = {
    async exec(sql) {
      try { db.exec(sql); } catch (e) { throw asStorageError(e); }
    },
    async run(sql, params: SqlParam[] = []) {
      try { db.prepare(sql).run(...params); } catch (e) { throw asStorageError(e); }
    },
    async all<T>(sql: string, params: SqlParam[] = []) {
      try { return db.prepare(sql).all(...params) as T[]; } catch (e) { throw asStorageError(e); }
    },
    async get<T>(sql: string, params: SqlParam[] = []) {
      try {
        const row = db.prepare(sql).get(...params);
        return row == null ? undefined : row as T;
      } catch (e) { throw asStorageError(e); }
    },
    async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
      db.exec('BEGIN IMMEDIATE');
      try {
        const v = await fn();
        db.exec('COMMIT');
        return v;
      } catch (e) {
        try { db.exec('ROLLBACK'); } catch { /* already closed */ }
        throw asStorageError(e);
      }
    },
  };
  return {db, driver};
}
