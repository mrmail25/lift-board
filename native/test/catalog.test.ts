import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {CATALOG} from '../src/data/exercises.slim';

test('the bundled catalog matches data/exercises.json', () => {
  const src = JSON.parse(readFileSync('../data/exercises.json', 'utf8'));
  expect(CATALOG.map(e => e.id)).toEqual(src.exercises.map((e: {id: string}) => e.id));
});

test('screens do not hard-code colours', () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk('app');
  walk('src/ui');
  walk('src/store');
  for (const p of files) {
    if (p.endsWith('tokens.ts')) continue;
    expect(readFileSync(p, 'utf8')).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  }
});
