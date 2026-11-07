import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openApp, type createApp} from '../src/data/appDb';
import {openNode} from '../src/data/nodeDriver';
import type {SqlDriver} from '../src/data/sql';

export function tempDb(): string {
  return join(mkdtempSync(join(tmpdir(), 'apechit-')), 'liftboard.db');
}

export async function fresh(path = tempDb(), now = new Date(2026, 10, 7, 18, 30, 0)) {
  let n = 0;
  const {driver} = openNode(path);
  const app = await openApp(driver, {
    now: () => now,
    id: p => `${p}${++n}`,
  });
  return {path, driver, app, now};
}

export async function reopen(path: string, now = new Date(2026, 10, 7, 19, 0, 0)) {
  const {driver} = openNode(path);
  const app = await openApp(driver, {now: () => now, id: p => p + 'x'});
  return {driver, app};
}

export type App = ReturnType<typeof createApp>;
export type {SqlDriver};
