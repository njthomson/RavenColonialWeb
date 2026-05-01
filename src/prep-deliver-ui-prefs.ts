import type { Project } from './types';

const LS_KEY = 'prepDeliverUiPrefsByBuild';

export type PrepDeliverUiPrefs = {
  commander: string;
  fromKey: string;
};

function readAll(): Record<string, PrepDeliverUiPrefs> {
  try {
    const j = window.localStorage.getItem(LS_KEY);
    if (!j) { return {}; }
    return JSON.parse(j) as Record<string, PrepDeliverUiPrefs>;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, PrepDeliverUiPrefs>) {
  window.localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export function readPrepDeliverUiPrefs(buildId: string): PrepDeliverUiPrefs | undefined {
  const v = readAll()[buildId];
  if (!v || typeof v.fromKey !== 'string') { return undefined; }
  return {
    commander: typeof v.commander === 'string' ? v.commander : '',
    fromKey: v.fromKey,
  };
}

export function writePrepDeliverUiPrefs(buildId: string, prefs: PrepDeliverUiPrefs) {
  const all = readAll();
  all[buildId] = { commander: prefs.commander, fromKey: prefs.fromKey };
  writeAll(all);
}

/** Defaults for commander / From: when opening the deliver callout. */
export function resolvePrepDeliverUiPrefs(
  buildId: string,
  proj: Pick<Project, 'commanders' | 'linkedFC'>,
): { commander: string; fromKey: string } {
  const stored = readPrepDeliverUiPrefs(buildId);
  const cmdrNames = proj.commanders ? Object.keys(proj.commanders).sort((a, b) => a.localeCompare(b)) : [];
  const fcIds = new Set(proj.linkedFC.map(fc => String(fc.marketId)));

  let commander = '';
  if (cmdrNames.length > 0) {
    commander = stored?.commander && cmdrNames.includes(stored.commander)
      ? stored.commander
      : cmdrNames[0];
  }

  let fromKey = 'ship';
  if (stored?.fromKey && (stored.fromKey === 'ship' || fcIds.has(stored.fromKey))) {
    fromKey = stored.fromKey;
  }

  return { commander, fromKey };
}
