/**
 * Prep "Deliver" popup: per-slot/commodity delivery log + optional FC column consumption (localStorage).
 */

const LS_HIST = 'prepDeliverHistByBuild';
const LS_FC_ADJ = 'prepDeliverFcAdjustByBuild';

export type PrepDeliverHistoryEntry = {
  id: string;
  amount: number;
  commander: string;
  fromKey: string;
  /** Snapshot label ("Ship Only" or carrier display name). */
  fromLabel: string;
  /**
   * Signed delta applied to prepSlotDeliverSubs when this line was added (positive = more subtracted from template).
   * Omit for legacy delivery lines; then `amount` is used when removing the line.
   */
  slotSubDelta?: number;
};

export type PrepDeliverHistMap = Record<string, PrepDeliverHistoryEntry[]>;
export type PrepFcAdjustMap = Record<string, number>;

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

export function histKey(slotId: string, commodity: string): string {
  return `${slotId}::${commodity}`;
}

export function fcAdjustKey(marketId: string, commodity: string): string {
  return `${marketId}::${commodity}`;
}

export function readPrepDeliverHistAll(): Record<string, PrepDeliverHistMap> {
  return readJson<Record<string, PrepDeliverHistMap>>(LS_HIST, {});
}

export function readPrepDeliverHist(buildId: string): PrepDeliverHistMap {
  return { ...(readPrepDeliverHistAll()[buildId] ?? {}) };
}

export function writePrepDeliverHist(buildId: string, map: PrepDeliverHistMap) {
  const all = readPrepDeliverHistAll();
  if (Object.keys(map).length === 0) {
    delete all[buildId];
  } else {
    all[buildId] = map;
  }
  writeJson(LS_HIST, all);
}

export function readPrepFcAdjustAll(): Record<string, PrepFcAdjustMap> {
  return readJson<Record<string, PrepFcAdjustMap>>(LS_FC_ADJ, {});
}

export function readPrepFcAdjust(buildId: string): PrepFcAdjustMap {
  return { ...(readPrepFcAdjustAll()[buildId] ?? {}) };
}

export function writePrepFcAdjust(buildId: string, map: PrepFcAdjustMap) {
  const all = readPrepFcAdjustAll();
  if (Object.keys(map).length === 0) {
    delete all[buildId];
  } else {
    all[buildId] = map;
  }
  writeJson(LS_FC_ADJ, all);
}

function parseHistSlotId(key: string): string | undefined {
  const sep = key.indexOf('::');
  if (sep < 1) { return undefined; }
  return key.slice(0, sep);
}

/** Remove history for unknown slot ids and roll back their FC adjustments. */
export function prunePrepDeliverData(buildId: string, validSlotIds: Set<string>): { history: PrepDeliverHistMap; fcAdjust: PrepFcAdjustMap } {
  if (validSlotIds.size === 0) {
    return { history: readPrepDeliverHist(buildId), fcAdjust: readPrepFcAdjust(buildId) };
  }
  let history = readPrepDeliverHist(buildId);
  let fcAdjust = readPrepFcAdjust(buildId);

  for (const key of Object.keys(history)) {
    const sid = parseHistSlotId(key);
    if (!sid || validSlotIds.has(sid)) { continue; }
    const entries = history[key] ?? [];
    const comm = key.slice(key.indexOf('::') + 2);
    for (const e of entries) {
      if (e.fromKey && e.fromKey !== 'ship' && e.fromKey !== 'editor') {
        const fk = fcAdjustKey(e.fromKey, comm);
        const nextV = (fcAdjust[fk] ?? 0) - e.amount;
        if (nextV <= 0) { delete fcAdjust[fk]; }
        else { fcAdjust[fk] = nextV; }
      }
    }
    delete history[key];
  }

  for (const fk of Object.keys(fcAdjust)) {
    if (fcAdjust[fk] <= 0) { delete fcAdjust[fk]; }
  }

  writePrepDeliverHist(buildId, history);
  writePrepFcAdjust(buildId, fcAdjust);
  return { history, fcAdjust };
}
