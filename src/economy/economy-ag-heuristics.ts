import { EconomyMap } from "../site-data";
import {
  adjust,
  matches,
} from "./economy-core";
import type { SiteMap2, SysMap2 } from "./system-model2";
import { BodyFeature } from "../types";
import { Bod, BT } from "../types2";

/** Heuristic agriculture rules - not in the community colonization sheet. */

/** Documented weak-link agriculture increment (community sheet). */
export const WEAK_LINK_AGRICULTURE_DELTA = 0.05;

/** Weak-link agriculture budgets expressed as economy strength (0.90 = 90%). */
export const AG_WEAK_LINK_BUDGET = {
  /** Colony port with no same-body agriculture strong link (rb / default bodies). */
  DEFAULT: 0.90,
  /** HMC/MRB surface outpost (atropos / nona). */
  HMC_OUTPOST: 0.30,
  /** HMC/MRB colony starport with no same-body agriculture strong link. */
  HMC_STARPORT: 1.60,
  /** Extra weak-link slice when a ceres/fornax on the same body provides a strong link. */
  SAME_BODY_SETTLEMENT: 1.10,
  /** Extra weak-link slice when a demeter/picumnus on the same body provides a strong link. */
  SAME_BODY_FACILITY: 0.15,
  /** ELW/WW ag-primary hab colony with T1 colony ag strong link. */
  HAB_WORLD_T1_COLONY: 0.55,
  /** Icy fixed non-ag port with organics or tidal penalty. */
  ICY_FIXED: 0.25,
  /** Same-body colony agriculture strong link on non-hab world. */
  NON_HAB_COLONY_STRONG: 0.05,
  /** Tidal hab-world ag colony. */
  TIDAL_HAB: 0.50,
} as const;

/**
 * Empirically fitted weak-link agriculture budgets by colony port buildType.
 * Orbital cluster types (plutus / vulcan / prometheus) use subordinate-count tiers instead.
 */
export const AG_WEAK_LINK_BUDGET_BY_BUILD_TYPE: Readonly<Record<string, number>> = {
  hestia: 1.60,
  poseidon: 1.60,
  apollo: 1.60,
  clotho: 1.25,
  chronos: 1.40,
  /** Civilian surface outpost near an agriculture cluster. */
  atropos: 1.40,
};

/** Small/medium agriculture settlements (fixed intrinsic 60%). */
export const TIER1_AGRICULTURE_SETTLEMENT_BUILD_TYPES = new Set(["picumnus", "annona", "consus"]);

export const getSettlementFixedEconomyValue = (site: SiteMap2): number => {
  return 1.0;
};

export const getAgricultureSettlementFloorValue = (site: SiteMap2): number =>
  getSettlementFixedEconomyValue(site);

/** plutus / vulcan / prometheus on orbital colony ports: budget scales with strong subordinate count. */
export const AG_WEAK_LINK_ORBITAL_CLUSTER_BUILD_TYPES = new Set(["plutus", "vulcan", "prometheus"]);

export const getOrbitalClusterAgWeakLinkBudget = (site: SiteMap2): number => {
  const subs = site.links?.strongSites?.length ?? 0;
  if (subs >= 3) {
    return 1.15;
  }
  if (subs >= 1) {
    return 1.40;
  }
  return AG_WEAK_LINK_BUDGET.DEFAULT;
};

const getTidalOrbitalClusterAgWeakLinkBudget = (site: SiteMap2): number | undefined => {
  if (
    !usesOrbitalClusterWeakLinkBudget(site) ||
    site.type.inf !== "colony" ||
    site.type.fixed ||
    !matches([BodyFeature.tidal], site.body?.features)
  ) {
    return undefined;
  }

  return site.agEconomyCalc?.sameBodyAgFacilityStrongLink || site.agEconomyCalc?.sameBodyAgSettlementStrongLink
    ? 0.55
    : 0.65;
};

const usesOrbitalClusterWeakLinkBudget = (site: SiteMap2) =>
  AG_WEAK_LINK_ORBITAL_CLUSTER_BUILD_TYPES.has(site.buildType) &&
  site.type.orbital;

export function weakLinkBudgetToMaxSources(budget: number): number {
  if (budget <= 0) {
    return 0;
  }
  return Math.floor(budget / WEAK_LINK_AGRICULTURE_DELTA + 1e-9);
}

export function maxSourcesToWeakLinkBudget(maxSources: number): number {
  return Math.round(maxSources * WEAK_LINK_AGRICULTURE_DELTA * 100) / 100;
}

export const getAgricultureStrongLinkSourceValue = (source: SiteMap2, tierCoefficient: number): number => {
  return tierCoefficient;
};

export const applyObservedPresetEconomies = (map: EconomyMap, site: SiteMap2) => {
  if (site.buildType !== 'atropos' || site.body?.type !== BT.ib || site.body?.features.includes(BodyFeature.bio)) {
    return;
  }

  // Preset targets subordinate icy atropos outposts, not body primaries.
  if (site === site.body?.orbitalPrimary || site === site.body?.surfacePrimary) {
    return;
  }

  adjust('extraction', +0.65, 'Observed preset economy: Civilian Surface Outpost (Atropos)', map, site);
  adjust('agriculture', +0.55, 'Observed preset economy: Civilian Surface Outpost (Atropos)', map, site);
  adjust('refinery', +0.35, 'Observed preset economy: Civilian Surface Outpost (Atropos)', map, site);
  adjust('military', +0.30, 'Observed preset economy: Civilian Surface Outpost (Atropos)', map, site);
  adjust('industrial', +0.25, 'Observed preset economy: Civilian Surface Outpost (Atropos)', map, site);
  adjust('hightech', +0.15, 'Observed preset economy: Civilian Surface Outpost (Atropos)', map, site);
};

export const getColonyAgricultureStrongLinkSourceValue = (
  source: SiteMap2,
  site: SiteMap2,
  tierCoefficient: number,
  getColonyAgricultureIntrinsic: (site: SiteMap2) => number,
) => {
  return tierCoefficient;
};

const isAgTourismColonyAgricultureWeakSource = (source: SiteMap2, site: SiteMap2) => {
  return source.type.inf === 'colony' &&
    source.primaryEconomy === 'agriculture' &&
    source.intrinsic?.includes('agriculture') &&
    source.intrinsic?.includes('tourism') &&
    source.body !== site.body &&
    site.type.orbital &&
    site.type.tier === 1 &&
    !site.type.fixed;
};

export const shouldApplyAgricultureWeakLink = (source: SiteMap2, site: SiteMap2) => {
  return !isAgTourismColonyAgricultureWeakSource(source, site);
};

const shouldLimitForeignStarAgricultureWeakLinks = (site: SiteMap2) => {
  return site.type.inf === 'colony' &&
    !site.type.fixed &&
    !site.type.orbital &&
    !site.intrinsic?.includes('agriculture');
};

const getBodyStarRoot = (sys: SysMap2, body: Bod | undefined) => {
  let current = body;

  while (current) {
    if (current.type === BT.st) {
      return current.num;
    }

    const parentNum = current.parents?.find(num => num > 0);
    if (parentNum === undefined) {
      return undefined;
    }

    current = sys.bodies.find(b => b.num === parentNum);
  }

  return undefined;
};

export const shouldApplyForeignStarAgricultureWeakLink = (
  source: SiteMap2,
  site: SiteMap2,
  homeStarRoot: number | undefined,
  foreignStarAgWeakLinksUsed: Set<number>,
) => {
  if (homeStarRoot === undefined || !shouldLimitForeignStarAgricultureWeakLinks(site)) {
    return true;
  }

  // Odyssey agriculture settlements stack weak links from their host star.
  if (source.type.buildClass === "settlement" && source.type.inf === "agriculture") {
    return true;
  }

  const sourceStarRoot = getBodyStarRoot(site.sys, source.body);
  if (sourceStarRoot === undefined || sourceStarRoot === homeStarRoot) {
    return true;
  }

  if (foreignStarAgWeakLinksUsed.has(sourceStarRoot)) {
    return false;
  }

  foreignStarAgWeakLinksUsed.add(sourceStarRoot);
  return true;
};

export const isAgPrimaryHabWorldColony = (site: SiteMap2, map: EconomyMap) => {
  return !!(
    site.intrinsic?.includes('agriculture') &&
    matches([BT.elw, BT.ww], site.body?.type) &&
    map.agriculture >= 1.0 &&
    site.agEconomyCalc?.tier1ColonyAgStrongLink
  );
};

/** Minimum agriculture economy strength contributed via weak links (game-facing % / 100). */
export const getMaxAgricultureWeakLinkBudget = (site: SiteMap2, agPrimaryHabWorld: boolean): number => {
  const tidalOrbitalClusterBudget = getTidalOrbitalClusterAgWeakLinkBudget(site);
  if (tidalOrbitalClusterBudget !== undefined) {
    return tidalOrbitalClusterBudget;
  }

  return Number.POSITIVE_INFINITY;
};

/** Derived max weak-link source count from the tightest matching budget rule. */
export const getMaxAgricultureWeakLinks = (site: SiteMap2, agPrimaryHabWorld: boolean): number => {
  const budget = getMaxAgricultureWeakLinkBudget(site, agPrimaryHabWorld);
  if (!Number.isFinite(budget)) {
    return Number.POSITIVE_INFINITY;
  }
  return weakLinkBudgetToMaxSources(budget);
};

/**
 * Diagnostics: historical budget-rule matching is disabled for the live model.
 * The fitted rule table was useful for experiments, but it over-constrained
 * otherwise valid systems. Keep this hook so future local diagnostics can
 * restore rule explanations without wiring them into normal calculations.
 */
export const explainAgricultureWeakLinkBudget = (site: SiteMap2, agPrimaryHabWorld: boolean) => {
  const budget = getMaxAgricultureWeakLinkBudget(site, agPrimaryHabWorld);
  return {
    budget,
    maxSources: getMaxAgricultureWeakLinks(site, agPrimaryHabWorld),
    matchingRules: [] as { label: string; budget: number }[],
  };
};

/** Implied weak-link budget after strong links (diagnostics only). */
export const getImpliedAgricultureWeakLinkBudget = (spanshPct: number, agricultureBeforeWeakLinks: number): number => {
  const spansh = spanshPct / 100;
  return Math.max(0, Math.round((spansh - agricultureBeforeWeakLinks) * 100) / 100);
};

export const applyFixedSurfaceAgricultureFloor = (map: EconomyMap, site: SiteMap2) => {
  if (
    !site.type.fixed ||
    site.type.fixed !== 'industrial' ||
    site.type.orbital ||
    matches([BT.ib, BT.ri, BT.elw, BT.ww], site.body?.type) ||
    map.agriculture < 0.55 ||
    map.agriculture >= 1.0
  ) {
    return;
  }

  adjust(
    'agriculture',
    1.0 - map.agriculture,
    'Floor: surface specialised port agriculture minimum',
    map,
    site,
  );
};

export const applyOrbitalFixedNonAgAgricultureFloor = (map: EconomyMap, site: SiteMap2) => {
  if (
    !site.type.fixed ||
    site.type.fixed === 'agriculture' ||
    !site.type.orbital ||
    matches([BT.ib, BT.ri], site.body?.type) ||
    map.agriculture < 0.55 ||
    map.agriculture >= 0.65
  ) {
    return;
  }

  adjust(
    'agriculture',
    0.65 - map.agriculture,
    'Floor: orbital specialised port agriculture minimum',
    map,
    site,
  );
};

export const getForeignStarAgricultureWeakLinkRoot = (site: SiteMap2) => {
  return shouldLimitForeignStarAgricultureWeakLinks(site)
    ? getBodyStarRoot(site.sys, site.body)
    : undefined;
};

export const applyAgricultureSettlementFloor = (map: EconomyMap, site: SiteMap2) => {
  if (
    site.type.buildClass !== "settlement" ||
    site.type.inf !== "agriculture" ||
    !TIER1_AGRICULTURE_SETTLEMENT_BUILD_TYPES.has(site.buildType) ||
    map.agriculture <= 0
  ) {
    return;
  }

  const floor = getAgricultureSettlementFloorValue(site);
  if (map.agriculture >= floor) {
    return;
  }

  adjust(
    "agriculture",
    floor - map.agriculture,
    "Floor: agriculture settlement minimum",
    map,
    site,
  );
};
