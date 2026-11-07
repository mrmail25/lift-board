export type StorageCode = 'quota' | 'busy' | 'constraint' | 'corrupt' | 'io' | 'migration';

/** A failed read or write. Callers should keep the previous screen data; a thrown StorageError means the transaction rolled back. */
export class StorageError extends Error {
  readonly code: StorageCode;
  constructor(code: StorageCode, message: string, options?: {cause?: unknown}) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    if (options && 'cause' in options) this.cause = options.cause;
  }
}

export function asStorageError(e: unknown): StorageError {
  if (e instanceof StorageError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  let code: StorageCode = 'io';
  if (/SQLITE_FULL|disk is full|database or disk is full|quota/i.test(msg)) code = 'quota';
  else if (/SQLITE_BUSY|database is locked/i.test(msg)) code = 'busy';
  else if (/SQLITE_CONSTRAINT/i.test(msg)) code = 'constraint';
  else if (/SQLITE_CORRUPT|malformed|not a database/i.test(msg)) code = 'corrupt';
  return new StorageError(code, msg, {cause: e});
}
