import { Cargo } from './types';

const LS_KEY = 'prepLoadHistoryByBuild';

export type PrepLoadHistoryEntry = {
  id: string;
  at: number;
  commander: string;
  marketId: string;
  marketLabel: string;
  total: number;
  items: Cargo;
  /** Signed per-commodity delta applied to FC cargo by the API call (`after - before`). */
  deltas?: Cargo;
};

type Store = Record<string, PrepLoadHistoryEntry[]>;

function readAll(): Store {
  try {
    const s = window.localStorage.getItem(LS_KEY);
    if (!s) { return {}; }
    return JSON.parse(s) as Store;
  } catch {
    return {};
  }
}

function writeAll(store: Store) {
  window.localStorage.setItem(LS_KEY, JSON.stringify(store));
}

export function readPrepLoadHistory(buildId: string): PrepLoadHistoryEntry[] {
  return [...(readAll()[buildId] ?? [])];
}

export function writePrepLoadHistory(buildId: string, entries: PrepLoadHistoryEntry[]) {
  const all = readAll();
  if (entries.length === 0) {
    delete all[buildId];
  } else {
    all[buildId] = [...entries];
  }
  writeAll(all);
}

