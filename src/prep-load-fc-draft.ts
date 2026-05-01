import type { Cargo } from './types';

const LS_KEY = 'loadFcDraftByBuild';

export type LoadFcDraftPersistedV1 = {
  v: 1;
  nextDelivery: Cargo;
  deliverMarketId: string;
  /** Prep Load FC: `-1` = ALL buildings; else `0..n-1` slot index. */
  deliverReferenceSlotIndex: number;
  loadFcReuseLastClosedDraft: boolean;
};

function readAll(): Record<string, LoadFcDraftPersistedV1> {
  try {
    const j = window.localStorage.getItem(LS_KEY);
    if (!j) { return {}; }
    return JSON.parse(j) as Record<string, LoadFcDraftPersistedV1>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, LoadFcDraftPersistedV1>) {
  window.localStorage.setItem(LS_KEY, JSON.stringify(data));
}

/** Drop draft keys not present on the project commodity map. */
export function pruneLoadFcDraftForProject(commodityKeys: string[], draft: Cargo): Cargo {
  const allowed = new Set(commodityKeys);
  const out = { ...draft };
  for (const k of Object.keys(out)) {
    if (!allowed.has(k)) {
      delete out[k];
    }
  }
  return out;
}

export function readLoadFcDraft(buildId: string): LoadFcDraftPersistedV1 | undefined {
  const raw = readAll()[buildId];
  if (!raw || raw.v !== 1 || typeof raw.nextDelivery !== 'object' || raw.nextDelivery === null) {
    return undefined;
  }
  if (typeof raw.deliverMarketId !== 'string') { return undefined; }
  if (typeof raw.deliverReferenceSlotIndex !== 'number' || !Number.isFinite(raw.deliverReferenceSlotIndex)) {
    return undefined;
  }
  const ir = Math.floor(raw.deliverReferenceSlotIndex);
  const deliverReferenceSlotIndex = ir === -1 ? -1 : Math.max(0, ir);
  return {
    v: 1,
    nextDelivery: raw.nextDelivery,
    deliverMarketId: raw.deliverMarketId,
    deliverReferenceSlotIndex,
    loadFcReuseLastClosedDraft: !!raw.loadFcReuseLastClosedDraft,
  };
}

export function writeLoadFcDraft(buildId: string, draft: LoadFcDraftPersistedV1): void {
  const all = readAll();
  all[buildId] = draft;
  writeAll(all);
}

export function clearLoadFcDraft(buildId: string): void {
  const all = readAll();
  delete all[buildId];
  writeAll(all);
}
