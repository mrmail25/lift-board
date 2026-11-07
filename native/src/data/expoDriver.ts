import * as SQLite from 'expo-sqlite';
import {asStorageError} from './errors';
import type {SqlDriver, SqlParam} from './sql';

type Db = SQLite.SQLiteDatabase;

/** expo-sqlite adapter. Throws StorageError. withTransaction rolls back when fn throws. */
export function expoDriver(db: Db): SqlDriver {
  return {
    async exec(sql) {
      try { await db.execAsync(sql); } catch (e) { throw asStorageError(e); }
    },
    async run(sql, params: SqlParam[] = []) {
      try { await db.runAsync(sql, params); } catch (e) { throw asStorageError(e); }
    },
    async all<T>(sql: string, params: SqlParam[] = []) {
      try { return await db.getAllAsync<T>(sql, params); } catch (e) { throw asStorageError(e); }
    },
    async get<T>(sql: string, params: SqlParam[] = []) {
      try {
        const row = await db.getFirstAsync<T>(sql, params);
        return row ?? undefined;
      } catch (e) { throw asStorageError(e); }
    },
    async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
      let value: T | undefined;
      try {
        await db.withTransactionAsync(async () => { value = await fn(); });
      } catch (e) { throw asStorageError(e); }
      return value as T;
    },
  };
}

export async function openExpoDatabase(): Promise<SqlDriver> {
  const db = await SQLite.openDatabaseAsync('liftboard.db');
  await db.execAsync('PRAGMA foreign_keys = ON');
  return expoDriver(db);
}
