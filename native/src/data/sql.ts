export type SqlParam = string | number | null;

export interface SqlDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<void>;
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  get<T>(sql: string, params?: SqlParam[]): Promise<T | undefined>;
  /** Runs fn in one transaction. A throw rolls the transaction back and rethrows. */
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
}
