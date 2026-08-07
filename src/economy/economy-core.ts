import { Economy, EconomyMap } from "../site-data";
import type { SiteMap2, SysMap2 } from "./system-model2";
import { BodyFeature } from "../types";
import { Bod, BT } from "../types2";

export interface EconomyModelOptions {
  enableTerraformableAgricultureBonus?: boolean;
}

/** Black hole, Neutron star or White Dwarf */
export const stellarRemnants = [BT.bh, BT.ns, BT.wd];

export const USE_NEW_MODEL = true;
export const STRONG_LINK_CONTRIBUTION_FLOOR = 0.1;

/** Set during calculateColonyEconomies2; drives agriculture weak-link cap rules. */
export interface AgEconomyCalcFlags {
  tier1ColonyAgStrongLink: boolean;
  sameBodyAgFacilityStrongLink: boolean;
  sameBodyAgSettlementStrongLink: boolean;
  sameBodyColonyAgStrongLink: boolean;
}

export function resetAgEconomyCalc(site: SiteMap2): AgEconomyCalcFlags {
  site.agEconomyCalc = {
    tier1ColonyAgStrongLink: false,
    sameBodyAgFacilityStrongLink: false,
    sameBodyAgSettlementStrongLink: false,
    sameBodyColonyAgStrongLink: false,
  };
  return site.agEconomyCalc;
}

export function noteAgricultureStrongLinkApplied(site: SiteMap2, source: SiteMap2, prefix: string): void {
  const flags = site.agEconomyCalc;
  if (!flags) { return; }

  if (source.type.inf === 'agriculture' && source.body === site.body) {
    if (['ceres', 'fornax'].includes(source.buildType)) {
      flags.sameBodyAgSettlementStrongLink = true;
    } else {
      flags.sameBodyAgFacilityStrongLink = true;
    }
  }
  if (source.type.inf === 'colony' && source.body === site.body) {
    flags.sameBodyColonyAgStrongLink = true;
  }
  if (source.type.inf === 'colony' && source.type.tier === 1 && prefix.includes('Strong link')) {
    flags.tier1ColonyAgStrongLink = true;
  }
}

export const adjust = (
  inf: Economy,
  delta: number,
  reason: string,
  map: EconomyMap,
  site: SiteMap2,
  source?: 'body' | 'sys',
) => {
  const before = map[inf as keyof EconomyMap];
  let newValue = map[inf as keyof EconomyMap] + delta;
  if (newValue < 0) { newValue = 0; }
  map[inf as keyof EconomyMap] = Math.round(newValue * 100) / 100;
  const after = map[inf as keyof EconomyMap];

  if (inf === 'colony') {
    console.warn(`Why are we adjusting Colony for: ${site.name} ?`);
  }

  site.economyAudit?.push({ inf, delta, reason, before, after });

  if (source === 'body') {
    if (!site.bodyBuffed) { site.bodyBuffed = new Set<Economy>(); }
    site.bodyBuffed.add(inf);
  }
  if (source === 'sys') {
    if (!site.systemBuffed) { site.systemBuffed = new Set<Economy>(); }
    site.systemBuffed.add(inf);
  }
};

/** Audit-only: candidate weak link that does not change the economy (cap reached). */
export const noteSkippedWeakLink = (
  inf: Economy,
  reason: string,
  map: EconomyMap,
  site: SiteMap2,
) => {
  const value = map[inf as keyof EconomyMap];
  site.economyAudit?.push({ inf, delta: 0, reason, before: value, after: value });
};

export const matches = <T>(listRequired: T[], check: T | T[] | undefined, avoid?: T[]) => {
  if (check) {
    const listCheck = Array.isArray(check) ? check : [check];
    return listRequired.some(item => listCheck.includes(item) && avoid?.includes(item) !== true);
  }
  return false;
};

export const bodyIsTidalToStar = (sys: SysMap2, body: Bod | undefined, parents?: number[]): boolean => {
  if (!parents) {
    parents = [...body?.parents ?? []];
  }

  if (!body?.features?.includes(BodyFeature.tidal) && body?.type !== BT.bc) {
    return false;
  }

  let parentNum = parents.shift();
  let parentBody = sys.bodies.find(b => b.num === parentNum);
  if (!parentBody) {
    if (parentNum === 0) {
      return false;
    }
    console.error(`Why no parent bodyNum: #${parentNum} for: ${body.name}`);
    return false;
  }

  if (matches([...stellarRemnants, BT.st], parentBody.type)) {
    return true;
  }

  if (parentBody.type === BT.bc) {
    const children = sys.bodies.filter(b => parentBody && b.parents[0] === parentBody.num);
    if (children.length > 1) {
      const idx = children.findIndex(b => b.name === body.name);
      if (idx < 2) {
        const other = idx === 0 ? children[1] : children[0];
        if (matches([...stellarRemnants, BT.st], other.type)) {
          return true;
        }
        const skipParentNum = parents[0];
        const skipParentBody = sys.bodies.find(b => b.num === skipParentNum);
        if (skipParentBody?.type === BT.st) {
          return true;
        }
      }
      if (idx > 1 && matches([...stellarRemnants, BT.st], children[0].type) && matches([...stellarRemnants, BT.st], children[1].type)) {
        return true;
      }
      return false;
    }
  }

  return bodyIsTidalToStar(sys, parentBody, parents);
};
