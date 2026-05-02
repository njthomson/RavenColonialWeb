/**
 * Local nicknames for prep building slots (keyed by stable slot UUID from prep-slot-ids).
 */

const LS_KEY = 'prepBuildNicknamesByBuild';

type Store = Record<string, Record<string, string>>;

function readAll(): Store {
  try {
    const s = window.localStorage.getItem(LS_KEY);
    if (!s) return {};
    return JSON.parse(s) as Store;
  } catch {
    return {};
  }
}

function writeAll(store: Store) {
  window.localStorage.setItem(LS_KEY, JSON.stringify(store));
}

/** Nicknames for a build (may include stale slot ids until pruned). */
export function readPrepBuildNicknames(buildId: string): Record<string, string> {
  return { ...(readAll()[buildId] ?? {}) };
}

function writeForBuild(buildId: string, map: Record<string, string>) {
  const all = readAll();
  if (Object.keys(map).length === 0) {
    delete all[buildId];
  } else {
    all[buildId] = { ...map };
  }
  writeAll(all);
}

/**
 * Keep only nicknames for the given slot ids; persist when storage changes.
 * Returns the map to put in React state.
 */
export function prunePrepBuildNicknames(buildId: string, slotIds: string[]): Record<string, string> {
  const raw = readPrepBuildNicknames(buildId);
  const next: Record<string, string> = {};
  for (const id of slotIds) {
    const v = raw[id]?.trim();
    if (v) next[id] = v;
  }
  if (JSON.stringify(raw) !== JSON.stringify(next)) {
    writeForBuild(buildId, next);
  }
  return next;
}

/** Set or clear nickname for one slot; `value` empty/whitespace removes. Returns pruned map for current slots. */
export function setPrepBuildNicknameForSlot(
  buildId: string,
  slotIds: string[],
  slotId: string,
  value: string,
): Record<string, string> {
  const raw = readPrepBuildNicknames(buildId);
  const next = { ...raw };
  const t = value.trim();
  if (!t) {
    delete next[slotId];
  } else {
    next[slotId] = t;
  }
  const pruned: Record<string, string> = {};
  for (const id of slotIds) {
    const v = next[id]?.trim();
    if (v) pruned[id] = v;
  }
  writeForBuild(buildId, pruned);
  return pruned;
}
