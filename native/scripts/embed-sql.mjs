import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const a = readFileSync(join(root, 'src/data/migrations/001_init.sql'), 'utf8');
const b = readFileSync(join(root, 'src/data/migrations/002_rest.sql'), 'utf8');
const out = `/* Generated from src/data/migrations/*.sql by scripts/embed-sql.mjs. The .sql files stay the reviewable source. */\nexport const SQL_001: string = ${JSON.stringify(a)};\nexport const SQL_002: string = ${JSON.stringify(b)};\n`;
writeFileSync(join(root, 'src/data/migrationSql.ts'), out);
