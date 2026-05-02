/** Local per-build prep slot "delivered" amounts (subtract from template #n column). Keyed by buildId → `${slotId}::${commodity}` → units subtracted (slotId is a stable UUID per physical slot). */

const LS_KEY = 'prepSlotDeliverSubsByBuild';

export type PrepSlotDeliverByBuild = Record<string, Record<string, number>>;

export function prepSlotDeliverKey(slotId: string, commodity: string): string {
  return `${slotId}::${commodity}`;
}

export function parseSlotIdFromDeliverKey(key: string): string | undefined {
  const sep = key.indexOf('::');
  if (sep < 1) { return undefined; }
  return key.slice(0, sep);
}

/** Legacy keys used column index: `${0|1|2...}::${commodity}`. */
export function isLegacyIndexDeliverKey(key: string): boolean {
  const sep = key.indexOf('::');
  if (sep < 1) { return false; }
  return /^\d+$/.test(key.slice(0, sep));
}

export function readPrepSlotDeliverAll(): PrepSlotDeliverByBuild {
  try {
    const j = window.localStorage.getItem(LS_KEY);
    if (!j) { return {}; }
    return JSON.parse(j) as PrepSlotDeliverByBuild;
  } catch {
    return {};
  }
}

function writePrepSlotDeliverAll(data: PrepSlotDeliverByBuild) {
  window.localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function getPrepSlotDeliverMap(buildId: string): Record<string, number> {
  return { ...(readPrepSlotDeliverAll()[buildId] ?? {}) };
}

export function setPrepSlotDeliverMap(buildId: string, map: Record<string, number>) {
  const all = readPrepSlotDeliverAll();
  if (Object.keys(map).length === 0) {
    delete all[buildId];
  } else {
    all[buildId] = map;
  }
  writePrepSlotDeliverAll(all);
}

/** Drop entries whose slot id is not in the current slot set. */
export function prunePrepSlotDeliverMap(map: Record<string, number>, validSlotIds: Set<string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    if (typeof v !== 'number' || v <= 0) { continue; }
    const sid = parseSlotIdFromDeliverKey(k);
    if (!sid || !validSlotIds.has(sid)) { continue; }
    out[k] = Math.floor(v);
  }
  return out;
}

/** Map old index-based keys onto the current ordered slot ids (same index = same column before migration). */
export function migrateLegacyDeliverMap(map: Record<string, number>, orderedSlotIds: string[]): Record<string, number> {
  if (orderedSlotIds.length === 0) { return {}; }
  const out: Record<string, number> = { ...map };
  for (const k of Object.keys(out)) {
    if (!isLegacyIndexDeliverKey(k)) { continue; }
    const sep = k.indexOf('::');
    const idx = parseInt(k.slice(0, sep), 10);
    const comm = k.slice(sep + 2);
    if (Number.isNaN(idx) || idx < 0 || idx >= orderedSlotIds.length) {
      delete out[k];
      continue;
    }
    const nk = prepSlotDeliverKey(orderedSlotIds[idx], comm);
    const v = out[k]!;
    delete out[k];
    out[nk] = (out[nk] ?? 0) + v;
  }
  return out;
}

export function normalizeDeliverMap(map: Record<string, number>, slotIds: string[]): Record<string, number> {
  const m = migrateLegacyDeliverMap(map, slotIds);
  return prunePrepSlotDeliverMap(m, new Set(slotIds));
}
