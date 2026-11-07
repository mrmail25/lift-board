export function effortChip(mode: 'rir' | 'rpe', rir: number): string {
  if (mode === 'rpe') return String(10 - rir);
  return rir === 4 ? '4+' : String(rir);
}

export function effortTitle(mode: 'rir' | 'rpe'): string {
  return mode === 'rpe' ? 'RPE' : 'RIR';
}

/** 3:00, the primary-lift default on the approved workout screen. Per-type settings are not in this slice. */
export const REST_STEP_MS = 15000;
export const REST_DEFAULT_MS = 180000;

export function restLeft(endsAt: string | null, now: Date): number {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((Date.parse(endsAt) - now.getTime()) / 1000));
}

export function shiftRest(endsAt: string | null, deltaMs: number, now: Date): string | null {
  const base = endsAt ? Date.parse(endsAt) : now.getTime();
  const next = Math.max(now.getTime(), base + deltaMs);
  if (next <= now.getTime()) return null;
  return new Date(next).toISOString();
}
