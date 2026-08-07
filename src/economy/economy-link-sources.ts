import type { BodyMap2, SiteMap2 } from "./system-model2";
import { BT, Bod } from "../types2";

/** Agriculture installations that can strong-link ports on sibling moons under the same gas giant. */
const GAS_GIANT_CLUSTER_AG_INSTALLATION_BUILD_TYPES = new Set(["demeter", "picumnus"]);

/** Nearest gas-giant body num along `body.parents`, if any. */
const getGasGiantParentNum = (body: Bod | undefined, allBodies: Bod[]): number | undefined => {
  if (!body?.parents?.length) {
    return undefined;
  }

  for (const parentNum of body.parents) {
    if (parentNum <= 0) {
      continue;
    }
    const parent = allBodies.find(b => b.num === parentNum);
    if (parent?.type === BT.gg) {
      return parent.num;
    }
  }

  return undefined;
};

/** True when two bodies orbit the same gas giant (sibling moons / cluster). */
export const bodiesShareGasGiantParent = (
  a: Bod | undefined,
  b: Bod | undefined,
  allBodies: Bod[],
): boolean => {
  if (!a || !b) {
    return false;
  }
  if (a.num === b.num) {
    return true;
  }

  const ggA = getGasGiantParentNum(a, allBodies);
  const ggB = getGasGiantParentNum(b, allBodies);
  return ggA !== undefined && ggA === ggB;
};

export const isGasGiantClusterAgricultureInstallation = (s: SiteMap2): boolean =>
  s.type.buildClass === "installation" &&
  s.type.inf === "agriculture" &&
  GAS_GIANT_CLUSTER_AG_INSTALLATION_BUILD_TYPES.has(s.buildType);

/** demeter space farm — strong-links local/cluster ports; weak-links other bodies when unanchored. */
export const isDemeterSpaceFarm = (s: SiteMap2): boolean =>
  s.type.buildClass === "installation" && s.buildType === "demeter";

/**
 * Farm anchored to a colony port on the same body (either direction) — strong local/cluster only,
 * no outward weak links.
 */
export const isAnchoredSpaceFarmInstallation = (s: SiteMap2, calcIds?: string[]): boolean => {
  if (!isDemeterSpaceFarm(s) || !s.body) {
    return false;
  }
  return s.body.sites.some(
    p =>
      p.id !== s.id &&
      (!calcIds || calcIds.includes(p.id)) &&
      (p.type.buildClass === "starport" || p.type.buildClass === "outpost") &&
      p.type.inf === "colony" &&
      (p.parentLink === s || s.parentLink === p),
  );
};

/**
 * Sibling-moon farm strong links attach to the body primary only (orbital primary when both exist).
 * Subordinate ports under a hub use the shared weak pool, not cluster farm strong links.
 */
export const bodyPrimaryReceivesGasGiantClusterAgStrongLinks = (
  body: BodyMap2,
  primarySite: SiteMap2,
): boolean => {
  if (primarySite !== body.orbitalPrimary && primarySite !== body.surfacePrimary) {
    return false;
  }
  if (body.orbitalPrimary) {
    return primarySite === body.orbitalPrimary;
  }
  return primarySite === body.surfacePrimary;
};

/**
 * demeter / picumnus on other moons under the same gas giant as `hostBody`.
 * Mirrors athena comms walking ancestor bodies — cluster agriculture for the body primary port.
 */
export const findGasGiantClusterAgricultureInstallations = (
  hostBody: BodyMap2,
  bodyMap: Record<string, BodyMap2>,
  allBodies: Bod[],
  calcIds: string[],
): SiteMap2[] => {
  if (getGasGiantParentNum(hostBody, allBodies) === undefined) {
    return [];
  }

  return Object.values(bodyMap)
    .filter(bm => bodiesShareGasGiantParent(hostBody, bm, allBodies))
    .flatMap(bm => bm.sites)
    .filter(s => {
      if (s.body === hostBody || !calcIds.includes(s.id)) {
        return false;
      }
      if (!isGasGiantClusterAgricultureInstallation(s)) {
        return false;
      }
      if (isAnchoredSpaceFarmInstallation(s, calcIds)) {
        return false;
      }
      return true;
    });
};

/**
 * Hub subordinates (settlements/installations) appear as top-level strong sources on the
 * body primary — matches in-game market link UI (hub row + each child economy).
 */
export const flattenHubGrandchildStrongSites = (strongSites: SiteMap2[]): SiteMap2[] => {
  const out: SiteMap2[] = [];
  const seen = new Set<string>();
  const add = (s: SiteMap2) => {
    if (seen.has(s.id)) {
      return;
    }
    seen.add(s.id);
    out.push(s);
  };
  for (const s of strongSites) {
    add(s);
    if (s.type.buildClass === "hub" && s.links?.strongSites?.length) {
      for (const child of s.links.strongSites) {
        if (child.parentLink === s) {
          add(child);
        }
      }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
};

/** Same-body subordinate ports/hubs that qualify as weak-link sources (not already direct strong children). */
export const findSameBodyWeakLinkCandidates = (
  siblingSites: SiteMap2[],
  primarySite: SiteMap2,
  calcIds: string[],
  siteContributesWeakLinks: (s: SiteMap2) => boolean,
): SiteMap2[] =>
  siblingSites.filter(
    s =>
      s !== primarySite &&
      calcIds.includes(s.id) &&
      siteContributesWeakLinks(s),
  );
