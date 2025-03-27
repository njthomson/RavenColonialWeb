import cargoTypes from './assets/cargo-types.json';
import { mapCommodityNames } from "./types";

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

  console.error(`Unknown type for cargo: ${cargo}`);
  return '?';
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
