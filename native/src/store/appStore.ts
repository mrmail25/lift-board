import {create} from 'zustand';
import type {createApp} from '../data/appDb';
import type {Routine, SessionDetail, SessionSummary} from '../data/appDb';
import {shiftRest, REST_STEP_MS} from '../logic/effort';

export type AppApi = ReturnType<typeof createApp>;

type S = {
  api: AppApi | null;
  ready: boolean;
  error: string | null;
  unit: 'lb' | 'kg';
  theme: 'system' | 'light' | 'dark';
  effort: 'rir' | 'rpe';
  routines: Routine[];
  active: SessionDetail | null;
  boot: (api: AppApi) => Promise<void>;
  refresh: () => Promise<void>;
  setUnit: (u: 'lb' | 'kg') => Promise<void>;
  setTheme: (t: 'system' | 'light' | 'dark') => Promise<void>;
  setEffort: (e: 'rir' | 'rpe') => Promise<void>;
  startEmpty: () => Promise<string | null>;
  startDay: (routineId: string, dayIdx: number) => Promise<string | null>;
  reload: (id: string) => Promise<SessionDetail | null>;
  addExercise: (sessionId: string, exerciseId: string, name: string) => Promise<void>;
  addSet: (entryId: string) => Promise<void>;
  updateSet: (setId: string, patch: {load?: number | null; reps?: number | null; rir?: number | null; done?: boolean}) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  nudgeRest: (sessionId: string, dir: -1 | 1 | 0) => Promise<void>;
  togglePause: (sessionId: string) => Promise<void>;
  finish: (sessionId: string) => Promise<void>;
  discard: (sessionId: string) => Promise<void>;
  month: (year: number, month: number) => Promise<SessionSummary[]>;
  fail: (e: unknown) => void;
};

function message(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e && (e as {code: string}).code === 'quota') return 'This phone is out of space. Nothing else was saved.';
  return e instanceof Error ? e.message : 'Could not save. Nothing else was changed.';
}

export const useApp = create<S>((set, get) => ({
  api: null,
  ready: false,
  error: null,
  unit: 'lb',
  theme: 'system',
  effort: 'rir',
  routines: [],
  active: null,
  fail: (e) => set({error: message(e)}),
  async boot(api) {
    set({api, error: null});
    await get().refresh();
    set({ready: true});
  },
  async refresh() {
    const api = get().api;
    if (!api) return;
    const [unit, theme, effort, routines, active] = await Promise.all([
      api.unit(),
      api.setting('theme'),
      api.setting('effort'),
      api.listRoutines(),
      api.getActive(),
    ]);
    set({
      unit,
      theme: theme === 'light' || theme === 'dark' ? theme : 'system',
      effort: effort === 'rpe' ? 'rpe' : 'rir',
      routines,
      active,
    });
  },
  async setUnit(u) {
    await get().api!.putSetting('unit', u);
    set({unit: u});
  },
  async setTheme(t) {
    await get().api!.putSetting('theme', t);
    set({theme: t});
  },
  async setEffort(e) {
    await get().api!.putSetting('effort', e);
    set({effort: e});
  },
  async startEmpty() {
    const s = await get().api!.startEmpty();
    set({active: s});
    return s.id;
  },
  async startDay(routineId, dayIdx) {
    const s = await get().api!.startDay(routineId, dayIdx);
    set({active: s});
    return s.id;
  },
  async reload(id) {
    const s = await get().api!.getSession(id);
    if (s?.status === 'active') set({active: s});
    return s;
  },
  async addExercise(sessionId, exerciseId, name) {
    const s = await get().api!.addExercise(sessionId, exerciseId, name);
    set({active: s});
  },
  async addSet(entryId) {
    const s = await get().api!.addSet(entryId);
    set({active: s});
  },
  async updateSet(setId, patch) {
    const s = await get().api!.updateSet(setId, patch);
    set({active: s});
  },
  async deleteSet(setId) {
    const s = await get().api!.deleteSet(setId);
    if (s) set({active: s});
  },
  async nudgeRest(sessionId, dir) {
    const cur = get().active;
    if (!cur) return;
    const ends = dir === 0 ? null : shiftRest(cur.restEndsAt, dir * REST_STEP_MS, new Date());
    const s = await get().api!.setRest(sessionId, ends);
    if (s) set({active: s});
  },
  async togglePause(sessionId) {
    const cur = get().active;
    if (!cur) return;
    const s = await get().api!.setPaused(sessionId, !cur.pausedAt);
    if (s) set({active: s});
  },
  async finish(sessionId) {
    await get().api!.finish(sessionId);
    set({active: null});
    await get().refresh();
  },
  async discard(sessionId) {
    await get().api!.discard(sessionId);
    set({active: null});
  },
  month: (year, month) => get().api!.listMonth(year, month),
}));
