import cargoTypes from './assets/cargo-types.json';
import { store } from './local-storage';
import { Cargo, mapCommodityNames, mapSourceEconomy, SortMode } from "./types";

/** Artificial delay so spinners doesn't flicker in and out */
export const delay = async (durationMS: number) => {
  await new Promise(resolve => setTimeout(resolve, durationMS));
};

export const getColorTable = (tokens: string[]): Record<string, string> => {
  const colors: Record<string, string> = {};
  tokens.forEach((k, n) => colors[k] = `qualitative.${n + 1}`);
  return colors;
};

export const getTypeForCargo = (cargo: string) => {

  const mapCargoType = cargoTypes as Record<string, string[]>;
  for (const type in mapCargoType) {
    if (mapCargoType[type].includes(mapCommodityNames[cargo]))
      return type;
  }

  console.warn(`Unexpected type for cargo: ${cargo}`);
  return '?';
};

export const iconForSort = (sort: SortMode) => {
  switch (sort) {
    default:
    case SortMode.alpha: return 'Sort';
    case SortMode.group: return 'GroupList';
    case SortMode.econ: return 'EMI';
  }
};

export const nextSort = (sort: SortMode) => {
  switch (sort) {
    default:
    case SortMode.alpha: return SortMode.group
    case SortMode.group: return SortMode.econ;
    case SortMode.econ: return SortMode.alpha;
  }
};

export const getGroupedCommodities = (cargoNames: string[], sort: SortMode): Record<string, string[]> => {

  const sorted = cargoNames
  sorted.sort();

  // just alpha sort
  if (sort === SortMode.alpha) {
    return { alpha: sorted };
  }

  // group by ...
  const dd = sorted.reduce((d, c) => {
    const t = sort === SortMode.econ
      ? mapSourceEconomy[c]
      : getTypeForCargo(c);
    if (!d[t]) d[t] = [];
    d[t].push(c);

    return d;
  }, {} as Record<string, string[]>);
  return dd;
};

export const flattenObj = (obj: Record<string, string[]>): string[] => {
  const list: string[] = [];
  const sortedKeys = Object.keys(obj);
  sortedKeys.sort();

  for (const key of sortedKeys) {
    list.push(key);
    list.push(...obj[key]);
  }

  return list;
};

export const delayFocus = (target: string, delay = 10): void => {
  setTimeout(() => document.getElementById(target)?.focus(), delay);
}

export const fcFullName = (name: string, displayName: string) => {
  if (name === displayName) {
    return name;
  } else {
    return `${displayName} (${name})`;
  }
};

export const sumCargo = (cargo: Record<string, number>): number => {
  const sum = Object.keys(cargo)
    .filter(k => k in mapCommodityNames)
    .reduce((s, k) => s += cargo[k], 0);
  return sum;
}

export const mergeCargo = (cargos: Cargo[]): Cargo => {

  let names = Array.from(new Set<string>(cargos.flatMap(c => Object.keys(c))));

  const merged = names.reduce((map, name) => {
    map[name] = cargos.reduce((sum, cargo) => sum += cargo[name] ?? 0, 0);
    return map;

  }, {} as Cargo);
  return merged;
}

export const getCargoCountOnHand = (cargoNeed: Cargo, cargoHave: Cargo) => {
  // Count the needs where we have a surplus, otherwise count what we have
  const countOnHand = Object.keys(mapCommodityNames)
    .reduce((count, key) => {
      const need = cargoNeed[key] ?? 0;
      const have = cargoHave[key] ?? 0;

      if (need > 0) {
        if (have >= need) {
          count += need;
        } else if (have) {
          count += have;
        }
      }
      return count;
    }, 0);

  return countOnHand;
};

export const openDiscordLink = (link: string | undefined) => {
  if (!link) return;

  // try using native Discord protocol to open the app ...
  if (store.useNativeDiscord && link.startsWith('https://discord.com/channels/')) {
    var parts = /channels\/(\d+)\/(\d+)/.exec(link);
    if (parts?.length === 3) {
      const newLink = `discord://-/channels/${parts[1]}/${parts[2]}`
      window.open(newLink, '_blank');
      return;
    }
  }

  // ... still here - open Discord in another browser tab
  window.open(link, '_blank');
};

export const isSurfaceSite = (buildType: string): boolean => {
  const orbitalBuildTypes = [
    "coriolis", "no_truss", "dual_truss", "quad_truss",
    "plutus", "vulcan", "dysnomia", "vesta", "prometheus", "nemesis",
    "hermes", "angelia", "eirene", "pistis", "soter", "aletheia", "demeter", "apate",
    "laverna", "euthenia", "phorcys", "enodia", "ichnaea", "coriolis",
    "asteroid", "vacuna", "alastor", "dicaeosyne", "poena", "eunomia", "nomos",
    "harmonia", "asclepius", "eupraxia", "astraeus", "coeus", "dodona", "dione",
    "hedone", "opora", "pasithea", "dionysus", "bacchus", "ocellus", "apollo", "artemis",
  ];
  return !orbitalBuildTypes.includes(buildType);
}

export const asPosNegTxt = (n: number): string => {
  if (n > 0)
    return `+${n}`;
  else
    return `${n}`
}