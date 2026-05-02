/**
 * Stable UUIDs per prep building *slot* (not column index), persisted with the slot list
 * so deliver adjustments follow the building when #2 / #3 reshuffle after removals.
 */

const LS_META = 'prepBuildSlotMetaByBuild';
const LS_SERVER_BASELINE = 'prepServerSlotBaselineByBuild';

export type PrepSlotMeta = { slots: string[]; ids: string[] };

function readJson<T>(key: string, fallback: T): T {
  try {
    const j = window.localStorage.getItem(key);
    if (!j) { return fallback; }
    return JSON.parse(j) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readPrepSlotMeta(buildId: string): PrepSlotMeta | undefined {
  const all = readJson<Record<string, PrepSlotMeta>>(LS_META, {});
  return all[buildId];
}

export function writePrepSlotMeta(buildId: string, slots: string[], ids: string[]) {
  const all = readJson<Record<string, PrepSlotMeta>>(LS_META, {});
  if (slots.length === 0) {
    delete all[buildId];
  } else {
    all[buildId] = { slots: [...slots], ids: [...ids] };
  }
  writeJson(LS_META, all);
}

/** Last server-accepted slot order + ids (for Undo without re-inferring removed duplicates). */
export function readServerBaseline(buildId: string): PrepSlotMeta {
  const all = readJson<Record<string, PrepSlotMeta>>(LS_SERVER_BASELINE, {});
  return all[buildId] ?? { slots: [], ids: [] };
}

export function writeServerBaseline(buildId: string, slots: string[], ids: string[]) {
  const all = readJson<Record<string, PrepSlotMeta>>(LS_SERVER_BASELINE, {});
  if (slots.length === 0) {
    delete all[buildId];
  } else {
    all[buildId] = { slots: [...slots], ids: [...ids] };
  }
  writeJson(LS_SERVER_BASELINE, all);
}

export function newSlotId(): string {
  return crypto.randomUUID();
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) { return false; }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) { return false; }
  }
  return true;
}

function tryDeleteOne(prevSlots: string[], prevIds: string[], newSlots: string[]): string[] | undefined {
  if (newSlots.length !== prevSlots.length - 1 || prevIds.length !== prevSlots.length) { return undefined; }
  for (let r = 0; r < prevSlots.length; r++) {
    const candidate = [...prevSlots.slice(0, r), ...prevSlots.slice(r + 1)];
    if (arraysEqual(candidate, newSlots)) {
      return [...prevIds.slice(0, r), ...prevIds.slice(r + 1)];
    }
  }
  return undefined;
}

function tryAppendEnd(prevSlots: string[], prevIds: string[], newSlots: string[]): string[] | undefined {
  if (newSlots.length !== prevSlots.length + 1 || prevIds.length !== prevSlots.length) { return undefined; }
  if (!arraysEqual(prevSlots, newSlots.slice(0, -1))) { return undefined; }
  return [...prevIds, newSlotId()];
}

/** Greedy multiset match (fallback): first unused prev row with the same build type. */
export function reconcilePrepSlotIdsGreedy(prevSlots: string[], prevIds: string[], newSlots: string[]): string[] {
  if (newSlots.length === 0) { return []; }
  if (prevSlots.length === 0 || prevIds.length !== prevSlots.length) {
    return newSlots.map(() => newSlotId());
  }
  const used = new Set<number>();
  const ids: string[] = [];
  for (let i = 0; i < newSlots.length; i++) {
    const bt = newSlots[i];
    let picked = -1;
    for (let j = 0; j < prevSlots.length; j++) {
      if (used.has(j)) { continue; }
      if (prevSlots[j] === bt) {
        picked = j;
        break;
      }
    }
    if (picked >= 0) {
      used.add(picked);
      ids.push(prevIds[picked]);
    } else {
      ids.push(newSlotId());
    }
  }
  return ids;
}

/**
 * Prefer index-stable delete / append-end; otherwise greedy multiset (reorder / ambiguous).
 */
export function nextPrepSlotIds(prevSlots: string[], prevIds: string[], newSlots: string[]): string[] {
  const del = tryDeleteOne(prevSlots, prevIds, newSlots);
  if (del) { return del; }
  const app = tryAppendEnd(prevSlots, prevIds, newSlots);
  if (app) { return app; }
  return reconcilePrepSlotIdsGreedy(prevSlots, prevIds, newSlots);
}
