import { getSiteType } from "./site-data";
import { Cargo } from "./types";
import rawHaulCosts from './assets/haul-costs.json';
import { HaulCostsJson } from "./types2";

const haulCosts = rawHaulCosts as any as HaulCostsJson;

export const getAverageHauls = (type: string): number => {
  const total = Object.values(getAvgHaulCosts(type)).reduce((sum, val) => sum += val, 0);
  return total;
}

export const getAvgHaulCosts = (type: string): Cargo => {
  type = type?.replace('?', '');
  if (!type) return {};

  const matchKey = Object.keys(haulCosts.typeMap).find(k => Object.values(haulCosts.typeMap[k]).includes(type));
  if (matchKey) {
    return haulCosts.buildCosts[matchKey];
  }

  let costs = haulCosts.buildCosts[type];
  if (!costs) {
    const groupType = getSiteType(type)!;
    if (groupType) {
      costs = haulCosts.buildCosts[groupType.displayName2];
    }
  }

  if (!costs && type.endsWith(' (primary)')) {
    return getAvgHaulCosts(type.replace(' (primary)', ''));
  }

  if (!costs) {
    throw new Error(`No costs for: ${type}`);
  }
  return costs;
}
