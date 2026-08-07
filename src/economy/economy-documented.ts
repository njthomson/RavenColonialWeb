import { Economy, EconomyMap } from "../site-data";
import { applyAgricultureBodyBuffs, calculateAgricultureStrongLinkContribution } from "./economy-ag-modifiers";
import {
  getAgricultureStrongLinkSourceValue,
  getColonyAgricultureStrongLinkSourceValue,
  getForeignStarAgricultureWeakLinkRoot,
  getMaxAgricultureWeakLinkBudget,
  getMaxAgricultureWeakLinks,
  isAgPrimaryHabWorldColony,
  shouldApplyAgricultureWeakLink,
  shouldApplyForeignStarAgricultureWeakLink,
  WEAK_LINK_AGRICULTURE_DELTA,
} from "./economy-ag-heuristics";
import {
  USE_NEW_MODEL,
  adjust,
  matches,
  noteAgricultureStrongLinkApplied,
  noteSkippedWeakLink,
  stellarRemnants,
} from "./economy-core";
import type { EconomyModelOptions } from "./economy-core";
import {
  bodiesShareGasGiantParent,
  isGasGiantClusterAgricultureInstallation,
} from "./economy-link-sources";
import {
  isRelayInstallation,
  isStarBodyPrimaryTieredPort,
  relayWeakLinkAppliesEconomyTo,
  securityWeakLinkAppliesEconomyTo,
  siteAlreadyStrongLinkedTo,
  siteContributesWeakLinks,
} from "./economy-weak-links";
import type { SiteMap2 } from "./system-model2";
import { BodyFeature } from "../types";
import { BT } from "../types2";

const FIXED_PORT_BIO_POST_LINK_AGRICULTURE_THRESHOLD = 1.0;

export const applySpecializedPort = (map: EconomyMap, site: SiteMap2) => {
  if (!site.type.fixed || site.type.fixed === 'none' || site.type.fixed === 'colony') {
    console.warn(`Why are we in: applySpecializedPort?`);
    return;
  }

  if (site.type.orbital) {
    adjust(site.type.fixed, +1.0, 'Specialised orbital economy', map, site);
  } else {
    adjust(site.type.fixed, +0.5, 'Specialised surface economy', map, site);
  }

  if (USE_NEW_MODEL) {
    applyBuffs(map, site, false);
  }
};

export const applyFixedPortPostLinkBodyBuffs = (map: EconomyMap, site: SiteMap2) => {
  if (
    !site.type.fixed ||
    site.type.fixed === 'none' ||
    site.type.fixed === 'colony' ||
    site.type.fixed === 'agriculture'
  ) {
    return;
  }

  if (
    !matches([BodyFeature.bio], site.body?.features) ||
    map.agriculture < FIXED_PORT_BIO_POST_LINK_AGRICULTURE_THRESHOLD
  ) {
    return;
  }

  adjust('agriculture', +0.4, 'Buff: body has BIO', map, site, 'body');
  if (map.terraforming <= 0) {
    adjust('terraforming', +0.4, 'Buff: body has BIO', map, site, 'body');
  }
};

export const applyBodyType = (map: EconomyMap, site: SiteMap2) => {
  if (site.type.inf !== 'colony') {
    console.warn(`Why are we in: applyBodyType?`);
    return;
  }
  const intrinsic = new Set<Economy>();

  switch (site.body?.type) {
    default:
      console.warn(`Unexpected body type: "${site.body?.type}"`);
      return;

    case BT.un:
      break;
    case BT.bh:
    case BT.ns:
    case BT.wd:
      adjust('hightech', +1, 'Body type: BH/NS/WD', map, site); intrinsic.add('hightech');
      adjust('tourism', +1, 'Body type: BH/NS/WD', map, site); intrinsic.add('tourism');
      break;
    case BT.st:
      adjust('military', +1, 'Body type: STAR', map, site); intrinsic.add('military');
      break;
    case BT.elw:
      adjust('agriculture', +1, 'Body type: ELW', map, site); intrinsic.add('agriculture');
      adjust('hightech', +1, 'Body type: ELW', map, site); intrinsic.add('hightech');
      adjust('military', +1, 'Body type: ELW', map, site); intrinsic.add('military');
      adjust('tourism', +1, 'Body type: ELW', map, site); intrinsic.add('tourism');
      break;
    case BT.ww:
      adjust('agriculture', +1, 'Body type: WW', map, site); intrinsic.add('agriculture');
      adjust('tourism', +1, 'Body type: WW', map, site); intrinsic.add('tourism');
      break;
    case BT.aw:
      adjust('hightech', +1, 'Body type: AMMONIA', map, site); intrinsic.add('hightech');
      adjust('tourism', +1, 'Body type: AMMONIA', map, site); intrinsic.add('tourism');
      break;
    case BT.gg:
    case BT.wg:
      adjust('hightech', +1, 'Body type: GG/WG', map, site); intrinsic.add('hightech');
      adjust('industrial', +1, 'Body type: GG/WG', map, site); intrinsic.add('industrial');
      break;
    case BT.hmc:
    case BT.mrb:
      adjust('extraction', +1, 'Body type: HMC', map, site); intrinsic.add('extraction');
      break;
    case BT.ri:
      adjust('industrial', +1, 'Body type: ROCKY-ICE', map, site); intrinsic.add('industrial');
      adjust('refinery', +1, 'Body type: ROCKY-ICE', map, site); intrinsic.add('refinery');
      break;
    case BT.rb:
      adjust('refinery', +1, 'Body type: ROCKY', map, site); intrinsic.add('refinery');
      break;
    case BT.ib:
      adjust('industrial', +1, 'Body type: ICY', map, site); intrinsic.add('industrial');
      break;
    case BT.ac:
      adjust('extraction', +1, 'Body type: ASTEROID', map, site); intrinsic.add('extraction');
      break;
  }

  if (site.body?.name && [BT.st, ...stellarRemnants].includes(site.body?.type)) {
    const hasAsteroids = site.sys.bodies.some(b => b.type === BT.ac && b.name.startsWith(site.body!.name));
    if (hasAsteroids) {
      adjust('extraction', +1, 'Star has: ASTEROIDs', map, site); intrinsic.add('extraction');
    }
  }

  if (site.body.features.includes(BodyFeature.rings)) {
    if (![BT.hmc, BT.mrb].includes(site.body?.type)) {
      adjust('extraction', +1, 'Body has: RINGS', map, site, 'body'); intrinsic.add('extraction');
    }
  }

  if (site.body.features.includes(BodyFeature.bio)) {
    if (![BT.elw, BT.ww].includes(site.body?.type)) {
      adjust('agriculture', +1, 'Body has: BIO', map, site, 'body'); intrinsic.add('agriculture');
    }
    adjust('terraforming', +1, 'Body has: BIO', map, site, 'body'); intrinsic.add('terraforming');
  }

  if (site.body.features.includes(BodyFeature.geo)) {
    if (![BT.hmc, BT.mrb].includes(site.body?.type)) {
      adjust('extraction', +1, 'Body has: GEO', map, site, 'body'); intrinsic.add('extraction');
    }
    if (![BT.gg, BT.wg, BT.ri, BT.ib].includes(site.body?.type)) {
      adjust('industrial', +1, 'Body has: GEO', map, site, 'body'); intrinsic.add('industrial');
    }
  }

  site.intrinsic = Array.from(intrinsic);
};

export const getColonyEconomyBeforeWeakLinks = (site: SiteMap2, inf: keyof EconomyMap) => {
  return (site.economyAudit ?? [])
    .filter(entry => entry.inf === inf && !entry.reason.includes('weak link'))
    .reduce((sum, entry) => sum + entry.delta, 0);
};

/** Agriculture from body intrinsics / presets only — excludes body buff rows used for own docked %. */
export const getColonyIntrinsicAgricultureBeforeWeakLinks = (site: SiteMap2): number => {
  return (site.economyAudit ?? [])
    .filter(entry => {
      if (entry.inf !== 'agriculture' || entry.reason.includes('weak link')) {
        return false;
      }
      return !entry.reason.startsWith('Buff:') &&
        !entry.reason.startsWith('Floor:') &&
        !entry.reason.startsWith('Apply ');
    })
    .reduce((sum, entry) => sum + entry.delta, 0);
};

/** Weak links applied during the latest economy calc (from audit trail). */
export const getAppliedWeakLinkCount = (site: SiteMap2, inf: keyof EconomyMap) => {
  return (site.economyAudit ?? [])
    .filter(entry => entry.inf === inf && entry.reason.startsWith('Apply weak link'))
    .length;
};

const WEAK_LINK_SOURCE_RE = /Apply weak link from: (.+?)(?: \(|$)/;

/** Source site names for applied weak links (market link UI). */
export const getAppliedWeakLinkSources = (site: SiteMap2, inf: keyof EconomyMap): string[] => {
  return (site.economyAudit ?? [])
    .filter(entry => entry.inf === inf && entry.reason.startsWith('Apply weak link'))
    .map(entry => {
      const m = entry.reason.match(WEAK_LINK_SOURCE_RE);
      return m ? m[1] : entry.reason;
    });
};

const applyStrongAgricultureContribution = (
  map: EconomyMap,
  site: SiteMap2,
  sourceValue: number,
  prefix: string,
  sourceSite: SiteMap2,
  options?: EconomyModelOptions,
) => {
  const contribution = calculateAgricultureStrongLinkContribution(sourceValue, site, options, sourceSite);
  if (contribution.score <= 0) {
    return;
  }

  adjust(
    'agriculture',
    contribution.score,
    `Apply ${prefix} from: ${sourceSite.name} (T${sourceSite.type.tier}): ${contribution.formula}`,
    map,
    site,
  );
  noteAgricultureStrongLinkApplied(site, sourceSite, prefix);
};

/** Sibling-moon demeter/picumnus: agriculture strong link only, no nested sub-strong tree. */
const isGasGiantClusterAgStrongSourceOnly = (source: SiteMap2, target: SiteMap2): boolean =>
  isGasGiantClusterAgricultureInstallation(source) &&
  source.body !== target.body &&
  !!source.body &&
  !!target.body &&
  bodiesShareGasGiantParent(source.body, target.body, source.sys.bodies);

/** Top-level uses the source inf; nested sub-strong uses the parent link economy (`subLink`). */
const resolveStrongLinkEconomy = (subLink: Economy | '*' | undefined, sourceInf: Economy): Economy =>
  subLink !== undefined && subLink !== '*' ? subLink : sourceInf;

const shouldApplyStrongLinkEconomy = (
  subLink: Economy | '*' | undefined,
  economy: Economy,
): boolean => subLink === undefined || subLink === '*' || economy === subLink;

/**
 * Hub subordinates contribute sub-strong to other receivers on the body (orbital primary).
 * A subordinate port receives the same tier-sized sub-strong from its parent hub once the
 * linked economy exists on the port map.
 */
export const applyParentHubSubStrongLink = (
  map: EconomyMap,
  site: SiteMap2,
  calcIds: string[],
  strongBoostApplied?: Set<Economy>,
) => {
  // Disabled for live parity: Spansh rows do not show parent-hub sub-strong links
  // on subordinate or converted ports in the current observed data set.
  void map;
  void site;
  void calcIds;
  void strongBoostApplied;
};

export const applyStrongLinks2 = (
  map: EconomyMap,
  strongSites: SiteMap2[],
  site: SiteMap2,
  calcIds: string[],
  subLink?: Economy | '*',
  options?: EconomyModelOptions,
  strongBoostApplied?: Set<Economy>,
) => {
  const isSubStrongPass = subLink !== undefined;

  for (let s of strongSites) {
    if (s.type.inf === 'none') { continue; }
    if (!calcIds.includes(s.id)) { continue; }
    if (isSubStrongPass && s === site) { continue; }

    const infSize =
      s.type.buildClass === "installation" && s.type.inf === "agriculture"
        ? 0.4
        : s.type.tier === 1
          ? 0.4
          : s.type.tier === 2
            ? 0.8
            : 1.2;
    const prefix = isSubStrongPass ? 'sub-strong link' : 'Strong link';

    if (s.type.inf !== 'colony') {
      if (isGasGiantClusterAgStrongSourceOnly(s, site) && isSubStrongPass) {
        continue;
      }
      const infToApply = resolveStrongLinkEconomy(subLink, s.type.inf);
      if (!shouldApplyStrongLinkEconomy(subLink, infToApply)) {
        continue;
      }
      if (infToApply in map) {
        if (infToApply === 'agriculture') {
          applyStrongAgricultureContribution(
            map,
            site,
            getAgricultureStrongLinkSourceValue(s, infSize),
            prefix,
            s,
            options,
          );
        } else {
          adjust(infToApply, infSize, `Apply ${prefix} from: ${s.name} (T${s.type.tier})`, map, site);
          applyStrongLinkBoost(infToApply, map, site, prefix, strongBoostApplied);
        }
      } else if (!isSubStrongPass) {
        console.warn(`Unknown economy '${s.type.inf}' for site ${s.name} - ${s.type.displayName2} (${s.buildType})`);
      }

      if (s.links?.strongSites && !subLink && !isGasGiantClusterAgStrongSourceOnly(s, site)) {
        const hubChildren = s.links.strongSites.filter(
          c => c.parentLink === s && !strongSites.includes(c),
        );
        if (hubChildren.length) {
          const nestedSubLink = s.type.buildClass === "hub" ? "*" : s.type.inf;
          applyStrongLinks2(map, hubChildren, site, calcIds, nestedSubLink, options, strongBoostApplied);
        }
      }
      continue;
    }

    if (!s.primaryEconomy) {
      if (s.economyCalcState === 'calculating' || s.economyCalcState === 'pending') {
        continue;
      }
      console.warn(`Why no primaryEconomy yet for '${s.name}' generating for: ${site.name} ?`);
      continue;
    }

    for (var e in s.economies) {
      const ee = e as keyof EconomyMap;
      if (s.intrinsic?.includes(ee)) {
        if (!shouldApplyStrongLinkEconomy(subLink, ee)) {
          continue;
        }
        if (site.type.fixed && ee !== site.type.fixed) {
          if (!(ee === 'agriculture' && canInheritGroundOrbitColonyAgriculture(s, site))) {
            continue;
          }
        }

        const colonyInfSize = s.type.tier === 1 ? 0.4 : (s.type.tier === 2 ? 0.8 : 1.2);
        if (ee === 'agriculture') {
          applyStrongAgricultureContribution(
            map,
            site,
            getColonyAgricultureStrongLinkSourceValue(s, site, colonyInfSize, getColonyIntrinsicAgricultureBeforeWeakLinks),
            `colony ${prefix}`,
            s,
            options,
          );
        } else {
          adjust(ee, colonyInfSize, `Apply colony ${prefix} from: ${s.name} (T${s.type.tier})`, map, site);
          applyStrongLinkBoost(ee, map, site, `${prefix}s`, strongBoostApplied);
        }
      }
    }

    if (
      !subLink &&
      !site.type.fixed &&
      isGroundOrbitColonyPair(s, site) &&
      !s.intrinsic?.includes('agriculture')
    ) {
      const sourceAg = getColonyIntrinsicAgricultureBeforeWeakLinks(s);
      if (sourceAg > 0) {
        applyStrongAgricultureContribution(map, site, infSize, `colony ${prefix} ground-orbit`, s, options);
      }
    }

    if (s.links?.strongSites && !subLink && !isGasGiantClusterAgStrongSourceOnly(s, site)) {
      applyStrongLinks2(map, s.links?.strongSites, site, calcIds, "*", options, strongBoostApplied);
    }
  }
};

export const isSameBodySurfaceToOrbitalPair = (source: SiteMap2, target: SiteMap2) => {
  return source.type.inf === 'colony' &&
    !source.type.orbital &&
    !!target.type.orbital &&
    source.body === target.body;
};

export const isGroundOrbitColonyPair = (source: SiteMap2, target: SiteMap2) => {
  return isSameBodySurfaceToOrbitalPair(source, target) && target.type.inf === 'colony';
};

export const canInheritGroundOrbitColonyAgriculture = (source: SiteMap2, target: SiteMap2) => {
  if (!isSameBodySurfaceToOrbitalPair(source, target)) {
    return false;
  }

  if (!source.intrinsic?.includes('agriculture')) {
    return false;
  }

  if (target.type.fixed && source.primaryEconomy === target.type.fixed) {
    return false;
  }

  return true;
};

/** Strong-link boosts stack per contribution in the live-site-compatible model. */
const STRONG_LINK_BOOST_ONCE_PER_CALC = new Set<Economy>();

export const applyStrongLinkBoost = (
  inf: Economy,
  map: EconomyMap,
  site: SiteMap2,
  reason: string,
  appliedOnce?: Set<Economy>,
) => {
  if (STRONG_LINK_BOOST_ONCE_PER_CALC.has(inf)) {
    if (appliedOnce?.has(inf)) {
      return 0;
    }
    appliedOnce?.add(inf);
  }

  const reserveLevel = site.sys.reserveLevel ?? 'pristine';

  switch (inf) {
    default: return 0;

    case 'extraction':
      if (matches(["major", "pristine"], reserveLevel)) {
        adjust(inf, +0.4, `+ ${reason} boost: System reserveLevel is MAJOR or PRISTINE`, map, site, 'sys');
      }
      else if (matches(["depleted", "low"], reserveLevel)) {
        adjust(inf, -0.4, `- ${reason} boost: System reserveLevel is LOW or DEPLETED`, map, site, 'sys');
      }
      if (matches([BodyFeature.volcanism], site.body?.features)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body has VOLCANISM`, map, site, 'body');
      }
      return;

    case 'hightech':
      if (matches([BT.aw, BT.elw, BT.ww], site.body?.type)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body is AW/ELW/WW`, map, site, 'body');
      }
      if (matches([BodyFeature.bio], site.body?.features)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body has BIO`, map, site, 'body');
      }
      if (matches([BodyFeature.geo], site.body?.features)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body has GEO`, map, site, 'body');
      }
      return;

    case 'industrial':
    case 'refinery':
      if (matches(["major", "pristine"], reserveLevel)) {
        adjust(inf, +0.4, `+ ${reason} boost: System reserveLevel is MAJOR or PRISTINE`, map, site, 'sys');
      }
      else if (matches(["depleted", "low"], reserveLevel)) {
        adjust(inf, -0.4, `- ${reason} boost: System reserveLevel is LOW or DEPLETED`, map, site, 'sys');
      }
      return;

    case 'tourism':
      if (matches([BT.aw, BT.elw, BT.ww], site.body?.type)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body is AW/ELW/WW`, map, site, 'body');
      }
      if (matches([BodyFeature.bio], site.body?.features)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body has BIO`, map, site, 'body');
      }
      if (matches([BodyFeature.geo], site.body?.features)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body has GEO`, map, site, 'body');
      }
      if (site.sys.bodies.some(b => b.type === BT.ns)) {
        adjust(inf, +0.4, `+ ${reason} boost: System has Neutron Star`, map, site, 'sys');
      }
      if (site.sys.bodies.some(b => b.type === BT.bh)) {
        adjust(inf, +0.4, `+ ${reason} boost: System has Black Hole`, map, site, 'sys');
      }
      if (site.sys.bodies.some(b => b.type === BT.wd)) {
        adjust(inf, +0.4, `+ ${reason} boost: System has White Dwarf`, map, site, 'sys');
      }
      return;
  }
};

export type ApplyBuffsOptions = EconomyModelOptions & {
  /** Scientific/medical hubs: skip BIO/GEO hightech body buffs on own row */
  skipHightechBodyBuffs?: boolean;
};

export const applyBuffs = (map: EconomyMap, site: SiteMap2, isSettlement: boolean, options?: ApplyBuffsOptions) => {
  const reserveLevel = site.sys.reserveLevel ?? 'pristine';

  const reserveSensitiveEconomies = ['industrial', 'extraction', 'refinery'] as (keyof EconomyMap)[];
  for (const key of reserveSensitiveEconomies) {
    if (map[key] > 0) {
      if (reserveLevel === 'major' || reserveLevel === 'pristine') {
        adjust(key, +0.4, 'Buff: reserveLevel MAJOR or PRISTINE', map, site, 'sys');
      } else if ((reserveLevel === 'low' || reserveLevel === 'depleted') && !isSettlement) {
        adjust(key, -0.4, 'Buff: reserveLevel LOW or DEPLETED', map, site, 'sys');
      }
    }
  }

  applyAgricultureBodyBuffs(map, site, adjust, { ...options, isSettlement });

  if (map.hightech > 0 && !options?.skipHightechBodyBuffs) {
    if (isSettlement && USE_NEW_MODEL) {
      if (matches([BodyFeature.bio], site.body?.features)) {
        adjust('hightech', +0.4, 'Buff: body has BIO', map, site, 'body');
      }
      if (matches([BodyFeature.geo], site.body?.features)) {
        adjust('hightech', +0.4, 'Buff: body has GEO', map, site, 'body');
      }
      if (matches([BT.elw, BT.aw], site.body?.type)) {
        adjust('hightech', +0.4, 'Buff: body is ELW or AW', map, site, 'body');
      }
    } else {
      let hightechBodyBuffApplied = false;
      if (matches([BodyFeature.bio], site.body?.features)) {
        adjust('hightech', +0.4, 'Buff: body has BIO', map, site, 'body');
        hightechBodyBuffApplied = true;
      }
      if (matches([BodyFeature.geo], site.body?.features)) {
        adjust('hightech', +0.4, 'Buff: body has GEO', map, site, 'body');
        hightechBodyBuffApplied = true;
      }
      if (!hightechBodyBuffApplied && matches([BT.elw, BT.aw], site.body?.type)) {
        adjust('hightech', +0.4, 'Buff: body is ELW or AW', map, site, 'body');
      }
    }
  }

  if (map.extraction > 0) {
    if (matches([BodyFeature.volcanism], site.body?.features)) {
      adjust('extraction', +0.4, 'Buff: body has VOLCANISM', map, site, 'body');
    }
  }

  if (map.tourism > 0) {
    if (site.sys.bodies.some(b => b.type === BT.bh)) {
      adjust('tourism', +0.4, 'Buff: system has a Black Hole', map, site, 'sys');
    }
    if (site.sys.bodies.some(b => b.type === BT.ns)) {
      adjust('tourism', +0.4, 'Buff: system has a Neutron Star', map, site, 'sys');
    }
    if (site.sys.bodies.some(b => b.type === BT.wd)) {
      adjust('tourism', +0.4, 'Buff: system has a White Dwarf', map, site, 'sys');
    }
    if (!site.bodyBuffed?.has('tourism')) {
      if (matches([BodyFeature.bio, BodyFeature.geo], site.body?.features)) {
        adjust('tourism', +0.4, 'Buff: body has BIO or GEO', map, site, 'body');
      } else if (matches([BT.elw, BT.ww, BT.aw], site.body?.type)) {
        adjust('tourism', +0.4, 'Buff: body is ELW or WW or AW', map, site, 'body');
      }
    }
  }
};

const applyWeakLinksFromSources = (
  map: EconomyMap,
  site: SiteMap2,
  calcIds: string[],
  sources: SiteMap2[],
  agricultureOnly: boolean,
  ctx: WeakLinkApplyCtx,
) => {
  const {
    agricultureWeakLinksApplied,
    maxAgricultureWeakLinks,
    maxAgricultureWeakLinkBudget,
    homeStarRoot,
    foreignStarAgWeakLinksUsed,
  } = ctx;
  const orderedWeakSites = [...sources].sort((a, b) => a.name.localeCompare(b.name));
  const agricultureBudgetLabel = Number.isFinite(maxAgricultureWeakLinkBudget)
    ? `budget ${Math.round(maxAgricultureWeakLinkBudget * 100)}%`
    : 'uncapped';
  const hasHightechWeakAnchor = orderedWeakSites.some(s => {
    if (!calcIds.includes(s.id)) { return false; }
    if (!siteContributesWeakLinks(s)) { return false; }
    if (siteAlreadyStrongLinkedTo(s, site)) { return false; }
    if (isRelayInstallation(s)) { return false; }
    if (s.type.inf === 'hightech') {
      return !isStarBodyPrimaryTieredPort(s);
    }
    if (s.type.inf !== 'colony') {
      return false;
    }
    if (!s.primaryEconomy || s.primaryEconomy !== 'hightech') {
      return false;
    }
    const isBodyPrimary = s === s.body?.orbitalPrimary || s === s.body?.surfacePrimary;
    return !isBodyPrimary && !isStarBodyPrimaryTieredPort(s);
  });

  for (let s of orderedWeakSites) {
    if (!calcIds.includes(s.id)) { continue; }
    if (!siteContributesWeakLinks(s)) { continue; }
    if (siteAlreadyStrongLinkedTo(s, site)) { continue; }
    if (!relayWeakLinkAppliesEconomyTo(s, site, map, hasHightechWeakAnchor)) { continue; }
    if (!securityWeakLinkAppliesEconomyTo(s, site)) { continue; }

    let inf = s.type.inf;
    if (inf === 'none') { continue; }

    const skipAgricultureIfCapped = (sourceName: string, intrinsicSourceOnly = false) => {
      if (agricultureWeakLinksApplied.count < maxAgricultureWeakLinks) {
        return false;
      }
      const sourceLabel = intrinsicSourceOnly ? 'intrinsic source only, ' : '';
      noteSkippedWeakLink(
        'agriculture',
        `Skipped weak link from: ${sourceName} (${sourceLabel}cap reached, ${agricultureBudgetLabel})`,
        map,
        site,
      );
      return true;
    };

    if (inf === 'colony') {
      if (!s.primaryEconomy) {
        if (s.economyCalcState === 'calculating' || s.economyCalcState === 'pending') {
          continue;
        }
        console.warn(`Why no primaryEconomy yet for '${s.name}' generating for: ${site.name} ?`);
        continue;
      }
      const isBodyPrimary =
        s === s.body?.orbitalPrimary || s === s.body?.surfacePrimary;

      for (const weakInf of s.intrinsic ?? []) {
        if (weakInf === 'none' || weakInf === 'colony') { continue; }
        if (agricultureOnly && weakInf !== 'agriculture') { continue; }
        if (isBodyPrimary && !agricultureOnly && weakInf !== 'agriculture') { continue; }
      if (weakInf === 'agriculture') {
          if (!shouldApplyAgricultureWeakLink(s, site)) { continue; }
          if (!shouldApplyForeignStarAgricultureWeakLink(s, site, homeStarRoot, foreignStarAgWeakLinksUsed)) { continue; }
          if (skipAgricultureIfCapped(s.name, true)) { continue; }
          adjust(
            weakInf,
            WEAK_LINK_AGRICULTURE_DELTA,
            `Apply weak link from: ${s.name} (intrinsic source only, ${agricultureBudgetLabel})`,
            map,
            site,
          );
          agricultureWeakLinksApplied.count++;
        } else if (!agricultureOnly && weakInf in map) {
          if (isStarBodyPrimaryTieredPort(s)) { continue; }
          adjust(weakInf, WEAK_LINK_AGRICULTURE_DELTA, `Apply weak link from: ${s.name} (intrinsic)`, map, site);
        }
      }
      continue;
    }

    if (inf in map) {
      if (inf === 'agriculture') {
        if (!shouldApplyAgricultureWeakLink(s, site)) { continue; }
        if (!shouldApplyForeignStarAgricultureWeakLink(s, site, homeStarRoot, foreignStarAgWeakLinksUsed)) { continue; }
        if (skipAgricultureIfCapped(s.name)) { continue; }
        adjust(
          inf,
          WEAK_LINK_AGRICULTURE_DELTA,
          `Apply weak link from: ${s.name} (source only, ${agricultureBudgetLabel})`,
          map,
          site,
        );
        agricultureWeakLinksApplied.count++;
      } else if (!agricultureOnly) {
        if (isStarBodyPrimaryTieredPort(s)) { continue; }
        adjust(inf, WEAK_LINK_AGRICULTURE_DELTA, `Apply weak link from: ${s.name}`, map, site);
      }
    } else if (!agricultureOnly) {
      console.warn(`Unknown economy '${s.type.inf}' for site '${s.name}', generating for: ${site.name}`);
    }
  }
};

type WeakLinkApplyCtx = {
  agricultureWeakLinksApplied: { count: number };
  maxAgricultureWeakLinks: number;
  maxAgricultureWeakLinkBudget: number;
  homeStarRoot: ReturnType<typeof getForeignStarAgricultureWeakLinkRoot>;
  foreignStarAgWeakLinksUsed: Set<number>;
};

export const applyWeakLinks = (map: EconomyMap, site: SiteMap2, calcIds: string[]) => {
  if (!site.links?.weakSites?.length && !site.links?.sameBodyWeakSites?.length) { return; }

  const ctx: WeakLinkApplyCtx = {
    agricultureWeakLinksApplied: { count: 0 },
    maxAgricultureWeakLinks: getMaxAgricultureWeakLinks(site, isAgPrimaryHabWorldColony(site, map)),
    maxAgricultureWeakLinkBudget: getMaxAgricultureWeakLinkBudget(site, isAgPrimaryHabWorldColony(site, map)),
    homeStarRoot: getForeignStarAgricultureWeakLinkRoot(site),
    foreignStarAgWeakLinksUsed: new Set<number>(),
  };

  if (site.links.sameBodyWeakSites?.length) {
    applyWeakLinksFromSources(map, site, calcIds, site.links.sameBodyWeakSites, true, ctx);
  }

  if (site.links.weakSites?.length) {
    applyWeakLinksFromSources(map, site, calcIds, site.links.weakSites, false, ctx);
  }
};
