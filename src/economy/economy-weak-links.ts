import { isDemeterSpaceFarm } from "./economy-link-sources";
import type { SiteMap2 } from "./system-model2";
import { BT } from "../types2";

const isTieredStation = (s: SiteMap2): boolean => {
  return (s.type.buildClass === 'starport' || s.type.buildClass === 'outpost')
    && s.type.tier >= 1 && s.type.tier <= 3;
};

const isHubWeakContributor = (s: SiteMap2): boolean =>
  s.type.buildClass === "hub" && s.type.inf !== "none";

/** Relay installations (enodia / ichnaea) weak-link ports system-wide without body subordination. */
export const isRelayInstallation = (s: SiteMap2): boolean =>
  s.buildType === "enodia" || s.buildType === "ichnaea";

const isRelayInstallationWeakContributor = (s: SiteMap2): boolean =>
  s.type.buildClass === "installation" && isRelayInstallation(s);

/** Medical hightech installations weak-link hightech as supporting facilities. */
export const isMedicalHightechInstallation = (s: SiteMap2): boolean =>
  s.type.buildClass === "installation" &&
  (s.buildType === "asclepius" || s.buildType === "eupraxia");

/**
 * Security installations (dicaeosyne / eunomia / nomos / poena) — Update 3 supporting
 * facilities; Mega Guide: non-port facilities weak-link all ports outside their local body.
 * Distinct from military hub installations (alastor / vacuna), which strong-link locally only.
 */
const SECURITY_INSTALLATION_BUILD_TYPES = new Set([
  "dicaeosyne",
  "eunomia",
  "nomos",
  "poena",
]);

export const isSecurityInstallation = (s: SiteMap2): boolean =>
  s.type.buildClass === "installation" &&
  SECURITY_INSTALLATION_BUILD_TYPES.has(s.buildType);

const isSecurityInstallationWeakContributor = (s: SiteMap2): boolean =>
  isSecurityInstallation(s);

/** Military hub installations — strong-link local ports; do not weak-link outward. */
const isMilitaryHubInstallation = (s: SiteMap2): boolean =>
  s.type.buildClass === "installation" &&
  (s.buildType === "alastor" || s.buildType === "vacuna");

/** Body-primary starport/outpost on the system star — does not emit non-agriculture weak links. */
export const isStarBodyPrimaryTieredPort = (s: SiteMap2): boolean =>
  (s === s.body?.orbitalPrimary || s === s.body?.surfacePrimary) &&
  (s.type.buildClass === "starport" || s.type.buildClass === "outpost") &&
  s.body?.type === BT.st;

/**
 * Relay weak links appear on all port link graphs. Economy +5% hightech applies on
 * outposts always, and on starports that already have hightech > 0 when the relay is
 * processed (name-sort order). Starports with no hightech row show the relay in UI only.
 */
export const relayWeakLinkAppliesEconomyTo = (
  source: SiteMap2,
  receiver: SiteMap2,
  receiverMap?: { hightech?: number },
  receiverHasHightechWeakAnchor?: boolean,
): boolean => {
  if (!isRelayInstallation(source)) {
    return true;
  }
  if (receiver.type.buildClass !== "starport") {
    return true;
  }
  return (receiverMap?.hightech ?? 0) > 0 || !!receiverHasHightechWeakAnchor;
};

/** Security installations weak-link all non-local ports (+5% military each), per Update 3 / Mega Guide. */
export const securityWeakLinkAppliesEconomyTo = (_source: SiteMap2, _receiver: SiteMap2): boolean => {
  return true;
};

/** True when `source` already contributes a strong link to `site` (direct or via a hub subordinate). */
export const siteAlreadyStrongLinkedTo = (source: SiteMap2, site: SiteMap2): boolean => {
  const strongSites = site.links?.strongSites ?? [];
  if (strongSites.includes(source)) {
    return true;
  }
  for (const hub of strongSites) {
    if (hub.links?.strongSites?.includes(source)) {
      return true;
    }
  }
  return false;
};

/** T1/T2/T3 ports only contribute weak links when subordinate; colony body primaries export agriculture only at apply time. */
export const siteContributesWeakLinks = (s: SiteMap2): boolean => {
  if (s.type.inf === 'none') { return false; }
  if (s.type.buildClass === 'installation') {
    if (s.type.inf === 'agriculture') {
      return isDemeterSpaceFarm(s);
    }
    if (isRelayInstallationWeakContributor(s) || isSecurityInstallationWeakContributor(s)) {
      return true;
    }
    if (isMedicalHightechInstallation(s)) {
      return true;
    }
    if (isMilitaryHubInstallation(s)) {
      return true;
    }
    return s.parentLink !== undefined;
  }

  if (isHubWeakContributor(s)) {
    return true;
  }

  if (
    isTieredStation(s) &&
    s.type.inf !== 'colony' &&
    (s === s.body?.orbitalPrimary || s === s.body?.surfacePrimary)
  ) {
    return false;
  }

  // Subordinate tiered ports only; body primaries weak-link agriculture outward.
  if (
    isTieredStation(s) &&
    s.parentLink === undefined &&
    s !== s.body?.orbitalPrimary &&
    s !== s.body?.surfacePrimary
  ) {
    return false;
  }
  return true;
};
