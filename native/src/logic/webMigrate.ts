/**
 * Port of the web logger's migrate() (logger.js MIG). Schema 0 and 1 logs become schema 2
 * without dropping fields the old shape used under different names.
 */
export function migrateWebLog(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('log is not an object');
  const d = JSON.parse(JSON.stringify(input)) as Record<string, any>;
  let v = typeof d.schema === 'number' ? d.schema : 0;
  if (v < 0 || v > 2 || !Number.isInteger(v)) throw new Error('unsupported log schema ' + d.schema);
  if (v === 0) {
    for (const s of d.sessions || []) {
      if (!s || typeof s !== 'object') continue;
      s.status = s.status || 'completed';
      s.unit = s.unit || 'lb';
      s.snapshot = s.snapshot || {exercises: []};
      s.notes = s.notes || '';
    }
    for (const e of d.entries || []) {
      if (!e || typeof e !== 'object') continue;
      if (e.exercise && !e.exerciseId) { e.exerciseId = e.exercise; delete e.exercise; }
      e.nameSnapshot = e.nameSnapshot || e.exerciseId || '';
      e.notes = e.notes || '';
      e.skipped = !!e.skipped;
    }
    const em: Record<string, any> = {};
    for (const e of d.entries || []) if (e && e.id) em[e.id] = e;
    for (const x of d.sets || []) {
      if (!x || typeof x !== 'object') continue;
      if ('weight' in x && !('load' in x)) { x.load = x.weight; delete x.weight; }
      x.kind = x.kind || 'working';
      if (!x.sessionId && em[x.entryId]) x.sessionId = em[x.entryId].sessionId;
      if (!('rir' in x)) x.rir = null;
    }
    d.prs = d.prs || [];
    v = 1;
  }
  if (v === 1) {
    for (const e of d.entries || []) if (e && typeof e.notes !== 'string') e.notes = '';
    v = 2;
  }
  d.schema = 2;
  return d;
}
