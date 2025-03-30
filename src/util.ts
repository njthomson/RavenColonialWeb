import cargoTypes from './assets/cargo-types.json';
import { mapCommodityNames, SortMode } from "./types";

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

export const getGroupedCommodities = (cargoNames: string[], sort: SortMode): Record<string, string[]> => {

  const sorted = cargoNames
  sorted.sort();

  // just alpha sort
  if (sort === SortMode.alpha) {
    return { alpha: sorted };
  }

  const dd = sorted.reduce((d, c) => {
    const t = getTypeForCargo(c);
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
  const sum = Object.values(cargo).reduce((s, v) => s += v, 0);
  return sum;
}
