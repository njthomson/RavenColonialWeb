export type CmdrShipMode = 'large' | 'medium';

const LS_KEY = 'cmdrShipModeByBuild';

type Store = Record<string, Record<string, CmdrShipMode>>;

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

export function readCmdrShipMode(buildId: string): Record<string, CmdrShipMode> {
  return { ...(readAll()[buildId] ?? {}) };
}

export function writeCmdrShipMode(buildId: string, map: Record<string, CmdrShipMode>) {
  const all = readAll();
  if (Object.keys(map).length === 0) {
    delete all[buildId];
  } else {
    all[buildId] = { ...map };
  }
  writeAll(all);
}

export function pruneCmdrShipMode(buildId: string, validCmdrs: string[]): Record<string, CmdrShipMode> {
  const raw = readCmdrShipMode(buildId);
  const set = new Set(validCmdrs);
  const next: Record<string, CmdrShipMode> = {};
  for (const k of Object.keys(raw)) {
    if (!set.has(k)) { continue; }
    next[k] = raw[k] === 'medium' ? 'medium' : 'large';
  }
  if (JSON.stringify(raw) !== JSON.stringify(next)) {
    writeCmdrShipMode(buildId, next);
  }
  return next;
}

