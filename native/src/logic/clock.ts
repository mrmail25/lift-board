/** Local calendar date for the phone clock. Not UTC, so a workout started in the evening stays on that day. */
export function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function localStamp(d: Date): string {
  return localDate(d);
}

/** Elapsed workout time. Pause gaps and an imported manual adjustment (adjMs) are included. */
export function elapsedMs(s: {startedAt: string; endedAt?: string | null; pausedMs: number; pausedAt?: string | null; adjMs?: number}, now: Date): number {
  const end = s.endedAt ? Date.parse(s.endedAt) : now.getTime();
  const start = Date.parse(s.startedAt);
  if (!Number.isFinite(end) || !Number.isFinite(start)) return 0;
  const livePause = s.pausedAt && !s.endedAt ? end - Date.parse(s.pausedAt) : 0;
  return Math.max(0, end - start - (s.pausedMs || 0) - (Number.isFinite(livePause) ? livePause : 0) + (s.adjMs || 0));
}

export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(x).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** The YYYY-MM-DD prefix of a stored timestamp, so an imported log keeps the day it was written with. */
export function calendarPrefix(iso: string | undefined | null, fallback: string): string {
  if (iso && /^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  return fallback;
}
