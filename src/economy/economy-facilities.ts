import { Economy, EconomyMap } from "../site-data";
import { SiteMap2 } from "./system-model2";
import { applyBuffs } from "./economy-documented";
import { adjust, resetAgEconomyCalc } from "./economy-core";
import {
  resolveFacilityIntrinsicFromRegistry,
} from "./economy-facility-registry";

export {
  bodyHasOperationalCommsForAthena,
  getAthenaHightechIntrinsic,
  isPlayerMadeMarketId,
  OPERATIONAL_MARKET_ID_MIN,
} from "./economy-facility-registry";
export {
  assertFacilityRegistryComplete,
  describeFacilityRegistryEntry,
  FACILITY_ECONOMY_REGISTRY,
  getFacilityRegistryEntry,
} from "./economy-facility-registry";

export const getFacilityFixedIntrinsic = (site: SiteMap2, calcIds?: string[]): number => {
  if (site.type.inf === "none") {
    return 0;
  }
  return resolveFacilityIntrinsicFromRegistry(site, calcIds);
};

export const isFacilityWithEconomy = (site: SiteMap2): boolean =>
  (site.type.buildClass === "hub" || site.type.buildClass === "installation") &&
  site.type.inf !== "none";

export const calculateFacilityEconomies2 = (
  site: SiteMap2,
  calcIds: string[],
  options?: import("./economy-core").EconomyModelOptions,
): Economy => {
  site.economyAudit = [];
  site.bodyBuffed = undefined;
  site.systemBuffed = undefined;
  resetAgEconomyCalc(site);

  const map = {
    agriculture: 0,
    extraction: 0,
    hightech: 0,
    industrial: 0,
    military: 0,
    refinery: 0,
    terraforming: 0,
    tourism: 0,
    service: 0,
  } as EconomyMap;

  const intrinsic = getFacilityFixedIntrinsic(site, calcIds);
  if (intrinsic <= 0) {
    return "none";
  }

  adjust(site.type.inf, intrinsic, "Facility fixed economy", map, site);
  applyBuffs(map, site, false, {
    ...options,
    skipHightechBodyBuffs: true,
  });

  const primaryEconomy = Object.keys(map).sort(
    (a, b) => map[b as keyof EconomyMap] - map[a as keyof EconomyMap],
  )[0] as Economy;

  site.economies = map;
  site.primaryEconomy = primaryEconomy;
  return primaryEconomy;
};
