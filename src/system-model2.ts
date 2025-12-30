import { SysSnapshot } from './api/v2-system';
import { calculateColonyEconomies2, stellarRemnants } from './economy-model2';
import { canReceiveLinks, ConcreteEconomy, Economy, getSiteType, mapName, SiteType, SysEffects, sysEffects } from "./site-data";
import { SiteMap, SysMap } from './system-model';
import { BodyFeature } from './types';
import { Bod, BT, Site, Sys } from './types2';

export const unknown = 'Unknown';

// const sysMapCache: Record<string, SysMap> = {};

// /** Returns what ever cached value we have for the given system */
// export const getSysMap = (systemName: string): SysMap | undefined => {
//   // return what ever we have cached
//   return sysMapCache[systemName];
// }

// /** Returns cached value, or requests + calculates, for the given system. Automatically includes incomplete sites. */
// export const fetchSysMap = async (systemName: string): Promise<SysMap> => {
//   // return from cache if already present
//   if (sysMapCache[systemName]) {
//     return sysMapCache[systemName];
//   }

//   const projects = await api.system.findAllBySystem(systemName);
//   const sysMap = buildSystemModel(projects, true);
//   return sysMap;
// }

export type SysUnlocks =
  | 'SettlementTourist'
  | 'InstallationTourist'
  | 'InstallationScientific'
  | 'InstallationMilitary'
  | 'HubCivilian'
  | 'HubMilitary'
  | 'HubExploration'
  | 'HubOutpost'
  | 'HubIndustrial'

  | 'ShipyardT1'
  | 'OutfittingNonMilOutpost'
  | 'OutfittingT1Surface'
  | 'VistaGenomics'
  | 'UniversalCartographics'
  | 'MarketOutposts'
  | 'CrewLounge'
  ;

export const mapSysUnlocks: Record<SysUnlocks, { icon: string, title: string, needTypes: string[], needs: string }> = {
  'SettlementTourist': {
    icon: 'Suitcase', title: 'Tourist Settlements', needTypes: ["hermes", "angelia", "eirene"], // a satellite
    needs: 'A satellite',
  },
  'InstallationTourist': {
    icon: 'Cocktails', title: 'Tourist Installations', needTypes: ["aergia", "comus", "gelos", "fufluns"], // a tourist settlement
    needs: 'A tourist settlement',
  },
  'InstallationScientific': {
    icon: 'NetworkTower', title: 'Scientific Installations', needTypes: ["pheobe", "asteria", "caerus", "chronos"], // a bio settlement
    needs: 'A bio settlement',
  },
  'InstallationMilitary': {
    icon: 'Shield', title: 'Military Installations', needTypes: ["ioke", "bellona", "enyo", "polemos", "minerva"], // a military settlement
    needs: 'A military settlement',
  },
  'HubMilitary': {
    icon: 'ReportHacked', title: 'Military Hub', needTypes: ["vacuna", "alastor"], // a military installation
    needs: 'A military installation',
  },
  'HubCivilian': {
    icon: 'Home', title: 'Civilian Hub', needTypes: ["consus", "picumnus", "annona", "ceres", "fornax"], // an agricultural settlement
    needs: 'An agricultural settlement',
  },
  'HubExploration': {
    icon: 'Camera', title: 'Exploration Hub', needTypes: ["pistis", "soter", "aletheia"], // comms
    needs: 'A comms installation',
  },
  'HubOutpost': {
    icon: 'HardDriveGroup', title: 'Outpost Hub', needTypes: ['demeter'], // a space farm
    needs: 'A space farm',
  },
  'HubIndustrial': {
    icon: 'Manufacturing', title: 'Industrial Hub', needTypes: ["euthenia", "phorcys"], // mining/industrial installation
    needs: 'A mining/industrial installation',
  },

  'ShipyardT1': {
    icon: 'Airplane', title: 'Shipyard at T1 surface ports', needTypes: [
      "eunostus", "molae", "tellus_i", // industrial hub
      "vacuna", "alastor",// military installation
    ], needs: 'An industrial hub or military installation',
  },
  'OutfittingNonMilOutpost': {
    icon: 'Dataflows', title: 'Outfitting at non-Military Outposts', needTypes: [
      "janus", // high-tech hub
      "vacuna", "alastor", // military installation
    ], needs: 'A high-tech hub or military installation',
  },
  'OutfittingT1Surface': {
    icon: 'FlowChart', title: 'Outfitting at non-Industrial T1 surface ports', needTypes: [
      "janus", // high-tech hub
      "vacuna", "alastor", // military installation
    ], needs: 'A high-tech hub or military installation',
  },
  'VistaGenomics': {
    icon: 'ClassroomLogo', title: 'Vista Genomics at T1 Surface or T2 orbital ports', needTypes: [
      "asclepius", "eupraxia", // a Medical Installation
      "athena", "caelus", // scientific hub
    ], needs: 'A scientific hub or medical installation',
  },
  'UniversalCartographics': {
    icon: 'HomeGroup', title: 'Universal Cartographics at T1 Surface or T2 orbital ports', needTypes: [
      "astraeus", "coeus", "dione", "dodona", // a Medical Installation
      "tellus_e", // exploration hub
    ], needs: 'An exploration hub or research installation',
  },
  'MarketOutposts': {
    icon: 'Shop', title: 'Commodities at Pirate, Scientific or Military Outposts', needTypes: [
      "bacchus", "dionysus", // space bar
      "hedone", "opora", "pasithea", // tourist installation
      "io", // outpost hub
    ], needs: 'An outpost hub, tourist installation or space bar',
  },
  'CrewLounge': {
    icon: 'People', title: 'Crew Lounge at non-Civilian T1 ports', needTypes: ["bacchus", "dionysus"], // space bar
    needs: 'A space bar',
  },
};

export interface SysMap2 extends Sys {
  bodyMap: Record<string, BodyMap2>;
  siteMaps: SiteMap2[];
  tierPoints: TierPoints;
  economies: Record<string, number>;
  sumEffects: SysEffects;
  systemScore: number;
  sysUnlocks: Record<SysUnlocks, boolean>,
  taxCount: number;
  /** The set of IDs to use for system/economy calculations */
  calcIds?: string[];
}

export interface TierPoints {
  tier2: number;
  tier3: number;
}

export interface BodyMap2 extends Bod {
  sites: SiteMap2[];
  surface: SiteMap2[];
  orbital: SiteMap2[];

  surfacePrimary?: SiteMap2;
  orbitalPrimary?: SiteMap2;
}

export interface AuditEconomy {
  inf: string;
  delta: number;
  reason: string;
  before: number;
  after: number;
}

export interface SiteMap2 extends Site {
  original: Site;
  sys: SysMap2;
  type: SiteType;
  links?: SiteLinks2;
  /** Economies generated for Colony types */
  economies?: EconomyMap;
  intrinsic?: Economy[];
  economyAudit?: AuditEconomy[];
  /** Top generated economy generated for Colony types */
  primaryEconomy?: Economy;
  parentLink?: SiteMap2;
  body?: BodyMap2;

  bodyBuffed?: Set<Economy>;
  systemBuffed?: Set<Economy>;

  /** Calculated points needed to start construction */
  calcNeeds?: { tier: number; count: number; }
}

export type EconomyMap = Record<Exclude<Economy, 'colony' | 'none'>, number>;

export interface SiteLinks2 {
  economies: Record<string, EconomyLink>
  strongSites: SiteMap2[];
  weakSites: SiteMap2[];
}

export interface EconomyLink {
  strong: number;
  weak: number;
}

export const buildSystemModel2 = (sys: Sys, useIncomplete: boolean, buffNerf?: boolean): SysMap2 => {
  // const orderIDs = sys.sites.map(s => s.id); // necessary?
  const idxLimit = sys.idxCalcLimit ?? sys.sites.length;

  // the primary port is always the first site
  sys.primaryPortId = sys.sites?.length > 0
    ? sys.sites[0].id
    : undefined;

  sys = { ...sys };

  // Read:
  // https://forums.frontier.co.uk/threads/constructing-a-specific-economy.637363/

  // group sites by their bodies, extract system and architect names
  const sysMap = initializeSysMap(sys, useIncomplete, idxLimit);

  // determine primary ports for each body
  const allBodies = Object.values(sysMap.bodyMap);
  for (const body of allBodies) {
    body.surfacePrimary = getBodyPrimaryPort(body.surface, sysMap.calcIds);
    const siblingSites = findSiblingSites(sys.bodies, sysMap.bodyMap, body, !!body.surfacePrimary);
    body.orbitalPrimary = getBodyPrimaryPort(siblingSites, sysMap.calcIds);
  }

  // per body, calc strong/weak links
  for (const body of allBodies) {
    calcBodyLinks(sysMap.bodyMap, body, sys, sysMap.calcIds);
  }

  // calc sum effects from all sites
  const { tierPoints, taxCount } = sumTierPoints(sysMap.siteMaps, sysMap.calcIds, !useIncomplete);
  const sumEffects = sumSystemEffects(sysMap.siteMaps, sysMap.calcIds, buffNerf);

  // calc system unlocks
  const sysUnlocks = {} as Record<SysUnlocks, boolean>;
  for (let key of Object.keys(mapSysUnlocks) as SysUnlocks[]) {
    const unlocked = sysMap.sites.some(s => (sysMap.calcIds.includes(s.id)) && mapSysUnlocks[key].needTypes.some(n => s.buildType?.startsWith(n)));
    sysUnlocks[key] = unlocked;
  }

  // re-sort bodies by their num value
  // sys.bodies.sort((a, b) => a.num - b.num);

  const finalMap = Object.assign(sys, {
    ...sysMap,
    ...sumEffects,
    tierPoints,
    taxCount,
    sysUnlocks,
  });

  // // store in the cache
  // if (!noCache) {
  //   sysMapCache[finalMap.systemName] = finalMap;
  // }
  return finalMap;
};

const starsAndClusters = [...stellarRemnants, BT.ac, BT.st];

const findSiblingSites = (bods: Bod[], bodyMap: Record<string, BodyMap2>, body: BodyMap2, onlyOrbitals: boolean) => {
  // skip logic below if body is not a star or an asteroid cluster
  if (!starsAndClusters.includes(body.type)) { return [...onlyOrbitals ? body.orbital : body.sites]; }

  // find parent, if we aren't it
  const parent = body.type !== BT.ac
    ? body
    : bods.find(b => b.num === body.parents[0]);
  if (!parent) {
    console.error(`Why no parent for: ${body.name}`);
    return [];
  }

  const bodies = [parent, ...bods.filter(b => b.type === BT.ac && parent.num === b.parents[0])];
  const siblingSites = bodies.flatMap(x => x.name in bodyMap ? onlyOrbitals ? bodyMap[x.name].orbital : bodyMap[x.name].sites : []);
  return siblingSites;
};

export const getUnknownBody = (): Bod => {
  return {
    name: 'Unknown',
    num: -1,
    distLS: -1,
    features: [BodyFeature.landable],
    parents: [],
    subType: 'Unknown',
    type: BT.un,
    radius: -1,
    temp: -1,
    gravity: -1,
  };
}

const initializeSysMap = (sys: Sys, useIncomplete: boolean, idxLimit: number) => {

  let siteMaps: SiteMap2[] = [];
  let systemScore = 0;

  const calcIds = useIncomplete
    ? sys.sites.filter((s, i) => i < idxLimit).map(s => s.id) // include up to idxLimit
    : sys.sites.filter(s => s.status === 'complete').map(s => s.id); // include only completed sites

  // first: group sites by their bodies
  if (!sys.sites) { sys.sites = []; }
  const bodyMap = sys.sites.reduce((map, s) => {
    let bodyNum = s.bodyNum ?? -1;
    const rawBody = sys.bodies.find(b => b.num === bodyNum) ?? getUnknownBody();

    let body = map[rawBody.name];
    if (!body) {
      body = {
        ...rawBody,
        sites: [], surface: [], orbital: [],
      };
      map[rawBody.name] = body;
    }

    // create site entry and add to bodies surface/orbital collection
    const site: SiteMap2 = {
      ...s,
      original: s,
      sys: sys as SysMap2,
      body: body as BodyMap2,
      type: getSiteType(s.buildType, true)!,
    };
    siteMaps.push(site);
    body.sites.push(site);

    if (site.type.orbital) {
      body.orbital.push(site);
    } else {
      body.surface.push(site);
    }

    if (calcIds.includes(site.id)) {
      systemScore += site.type.score ?? 0;
    }
    return map;
  }, {} as Record<string, BodyMap2>);

  // // sort bodies name but force Unknown to be first in the list
  // const sortedKeys = Object.keys(bodies)
  //   .filter(n => n !== unknown)
  //   .sort();
  // if (unknown in bodies) {
  //   sortedKeys.unshift(unknown);
  // }
  // const bodyMap: Record<string, BodyMap> = {};
  // for (let key of sortedKeys) { bodyMap[key] = bodyMap[key]; }

  // // sort all sites and sites-per-body by timeCompleted, forcing unknown to be last
  // allSites = allSites.sort((a, b) => (a.timeCompleted ?? '9000')?.localeCompare(b.timeCompleted ?? '9000'));
  // for (let body of Object.values(bodyMap)) {
  //   body.sites = body.sites.sort((a, b) => (a.timeCompleted ?? '9000')?.localeCompare(b.timeCompleted ?? '9000'));
  // }

  const countSites = sys.sites.length;
  const sysMap = {
    ...sys,
    siteMaps, bodyMap, countSites, systemScore, calcIds,
  };

  return sysMap;
};

/** log a diagnostic audit for the system score - completed sites only */
export const getSysScoreDiagnostic = (sys: Sys, siteMaps: SiteMap2[]) => {

  const lines: string[][] = [];
  lines.push(['score', 'type', 'sub-type', 'site name', 'body name']);

  let score = 0;
  Array.from(siteMaps)
    .filter(site => site.status === 'complete')
    .sort((a, b) => a.type.displayName2.localeCompare(b.type.displayName2) || a.buildType?.localeCompare(b.buildType))
    .forEach(site => {
      score += site.type.score ?? 0;
      lines.push([
        `  +${site.type.score ?? '■'}`,
        site.type.displayName2,
        site.buildType,
        site.name,
        site.body?.name || sys.name,
      ]);
    });

  const cw = lines.reduce((m, l) => {
    for (let n = 0; n < 5; n++) {
      m[n] = Math.max(m[n], l[n]?.length ?? 0);
    }
    return m;
  }, [0, 0, 0, 0, 0])

  lines.splice(1, 0, cw.map(n => '-'.repeat(n)));
  lines.push(cw.map(n => '-'.repeat(n)));

  let scoreTxt = lines.map(l => {
    return l.map((c, i) => (c ?? '?').padEnd(cw[i])).join(' | ');
  })
    .join(`\n`);

  scoreTxt += `\n` + `= ${score}`.padEnd(cw[0]) + ` | ${sys.name}\n\n`;
  // console.log(`\n${scoreTxt}\n`);
  return scoreTxt;
};

export const sumTierPoints = (siteMaps: SiteMap2[], calcIds: string[], incBuildStarted?: boolean) => {

  const tierPoints: TierPoints = { tier2: 0, tier3: 0 };
  const primaryPortId = siteMaps && siteMaps[0]?.id;

  let taxCount = -2;
  for (const site of siteMaps) {
    // skip mock sites, unless ...
    if (incBuildStarted) {
      // allow status:build or complete even though they may not be in calcIds
      if (site.status === 'plan') { continue; }
    } else if (!calcIds.includes(site.id)) { continue; }

    // sum system tier points needed - these are already spent for projects in-progress
    if (site.id !== primaryPortId && site.type.needs.count > 0 && site.type.needs.tier > 1) {
      let needCount = site.type.needs.count;
      if (site.type.buildClass === 'starport' && site.type.tier > 1) {
        taxCount++;
        needCount = applyTax(site.type.tier, needCount, taxCount);
      }

      const tierName = site.type.needs.tier === 2 ? 'tier2' : 'tier3';
      tierPoints[tierName] -= needCount;
      // store this on the site itself, so we can display these adjusted costs
      site.calcNeeds = { tier: site.type.needs.tier, count: needCount };
    }

    // skip incomplete sites, unless ...
    if (!calcIds.includes(site.id)) { continue; }

    // sum system tier points given
    if (site.type.gives.count > 0 && site.type.gives.tier > 1) {
      const tierName = site.type.gives.tier === 2 ? 'tier2' : 'tier3';
      tierPoints[tierName] += site.type.gives.count;
    }
  }

  return { tierPoints, taxCount };
}

export const applyTax = (tier: number, cost: number, taxCount: number) => {
  if (taxCount > 0) {
    if (tier === 3) {
      const delta = cost * taxCount; // cost * 100%
      cost += delta;
    } else {
      const delta = Math.trunc((cost * 0.75) * taxCount); // cost * 75%, but removing any fractional amount
      cost += delta;
    }
  }
  return cost;
};

const sumSystemEffects = (siteMaps: SiteMap2[], calcIds: string[], buffNerf?: boolean) => {

  const mapEconomies: Record<string, number> = {};
  const sumEffects: SysEffects = {};

  let first = true;
  for (const site of siteMaps) {

    // skip incomplete sites, unless ...
    if (!calcIds.includes(site.id)) continue;

    // calc total system economic influence
    if (['settlement', 'outpost', 'starport'].includes(site.type.buildClass)) {
      calculateColonyEconomies2(site, calcIds);
    }
    const inf = site.primaryEconomy ?? site.type.inf;

    if (inf !== 'none') {
      mapEconomies[inf] = (mapEconomies[inf] ?? 0) + 1;
    }

    // sum total system effects
    for (const key of sysEffects) {
      let effect = site.type.effects[key] ?? 0;
      if (effect === 0) continue;
      if (buffNerf) {
        effect = adjustAfflictedStarPortSumEffect(key, effect, first);
      }
      sumEffects[key] = (sumEffects[key] ?? 0) + effect;
    }

    first = false;
  }

  // sort: highest count first, or alpha if equal
  const sorted = Object.keys(mapEconomies).sort((a, b) => {
    if (mapEconomies[b] === mapEconomies[a]) {
      return b.localeCompare(a);
    } else {
      return mapEconomies[b] - mapEconomies[a];
    }
  });
  const economies: Record<string, number> = {};
  sorted.forEach(key => economies[key] = mapEconomies[key]);

  // work-around JS floating point nonense
  for (const k in sumEffects) {
    const v = sumEffects[k as keyof SysEffects]!;
    sumEffects[k as keyof SysEffects] = parseFloat((v * 1000).toFixed()) / 1000;
  }

  return {
    economies,
    sumEffects,
  };
}

const adjustAfflictedStarPortSumEffect = (key: keyof SysEffects, effect: number, isInitial: boolean) => {
  switch (key) {
    case 'pop':
    case 'mpop':
      // no impact
      return effect;

    case 'dev': return isInitial ? effect + effect * 0.4 : effect - effect * 0.1; // +40% or -10%
    case 'sec': return isInitial ? effect + effect * 0.4 : effect - effect * 0.1; // +40% or -10%
    case 'sol': return isInitial ? effect + effect * 0.4 : effect - effect * 0.2; // +40% or -20%
    case 'tech': return isInitial ? effect + effect * 0.2 : effect - effect * 0.25; // +20% or -25%
    case 'wealth': return isInitial ? effect + effect * 0.4 : effect - effect * 0.25; // +40% or -25%
  }
}

const getBodyPrimaryPort = (sites: SiteMap2[], calcIds: string[]): SiteMap2 | undefined => {
  if (sites.length === 0) return undefined;

  // skip incomplete sites?
  if (calcIds.length) {
    sites = sites.filter(s => calcIds.includes(s.id));
  }

  // do we have any Tier 3's ?
  const t3s = sites.filter(s => s.type.tier === 3 && canReceiveLinks(s.type));
  if (t3s.length > 0) {
    return t3s[0];
  }

  // do we have any Tier 2's ?
  const t2s = sites.filter(s => s.type.tier === 2 && canReceiveLinks(s.type));
  if (t2s.length > 0) {
    return t2s[0];
  }

  // do we have any Tier 1's ?
  const t1s = sites.filter(s => s.type.tier === 1 && canReceiveLinks(s.type));
  if (t1s.length > 0) {
    return t1s[0];
  }

  // there is no primary to receive links on this body
  return undefined;
}

const calcBodyLinks = (bodyMap: Record<string, BodyMap2>, body: BodyMap2, sys: Sys, calcIds: string[]) => {

  // exit early if no primary port for this body
  if (!body.surfacePrimary && !body.orbitalPrimary) { return; }

  // calc strong/weaks links, for surface sites, then orbital
  if (body.surfacePrimary) {
    calcSiteLinks(sys.bodies, bodyMap, body, body.surfacePrimary, calcIds);
  }
  if (body.orbitalPrimary) {
    calcSiteLinks(sys.bodies, bodyMap, body, body.orbitalPrimary, calcIds);
  }

  // // order by surface, then tier
  // const sortedSites = [...body.sites].sort((a, b) => {
  //   let val = (a.type.orbital ? 1 : 0) - (b.type.orbital ? 1 : 0);
  //   if (val === 0) {
  //     val = b.type.tier - a.type.tier;
  //   }
  //   if (val === 0) {
  //     val = b.buildName.localeCompare(a.buildName);
  //   }
  //   return val;
  // });

  // then calculate the economies after that
  for (const site of body.sites) {
    calcSiteEconomies(site, calcIds);
  }
}

const calcSiteLinks = (bods: Bod[], bodyMap: Record<string, BodyMap2>, body: BodyMap2, primarySite: SiteMap2, calcIds: string[]) => {

  // start with sites directly on the body
  const siblingSites = findSiblingSites(bods, bodyMap, body, false);

  // strong links are everything else tied to the current body, alpha sort by name
  const strongSites = siblingSites
    .filter(s => {
      if (s.parentLink || s.type.inf === 'none' || s === primarySite || (!calcIds.includes(s.id))) {
        // skip anything already strong-linked, things without influence, ourself or incompletes
        return false;
      }

      if (!primarySite.type.orbital && s.type.orbital && (s.type.buildClass === 'outpost' || s.type.buildClass === 'starport')) {
        // surface sites cannot claim orbital ports
        return false;
      }

      if (s.type.orbital && !primarySite.type.orbital && !!body.orbitalPrimary) {
        // surface sites cannot claim orbital facilities if there's an orbital port
        return false;
      }

      // set the link to the primary
      s.parentLink = primarySite;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));


  // weak links are everything around any other body (and not a sibling), except primary ports
  const weakSites = Object.values(bodyMap)
    .filter(b => b !== body)
    .flatMap(b => b.sites)
    .filter(s => !siblingSites.includes(s) && s.type.inf !== 'none' && (s !== s.body?.orbitalPrimary && s !== s.body?.surfacePrimary) && (calcIds.includes(s.id)));

  if (!primarySite.links && (strongSites.length > 0 || weakSites.length > 0)) {
    primarySite.links = {
      economies: {}, // we need to calculate strong/weak links across all sites before we can populate this
      strongSites,
      weakSites,
    };
  }
}

const calcSiteEconomies = (site: SiteMap2, calcIds: string[]) => {
  if (!site.links) return;

  const map: Record<ConcreteEconomy, EconomyLink> = {
    'agriculture': { strong: 0, weak: 0 },
    'extraction': { strong: 0, weak: 0 },
    'industrial': { strong: 0, weak: 0 },
    'hightech': { strong: 0, weak: 0 },
    'tourism': { strong: 0, weak: 0 },
    'military': { strong: 0, weak: 0 },
    'service': { strong: 0, weak: 0 },
    'refinery': { strong: 0, weak: 0 },
    'terraforming': { strong: 0, weak: 0 },
  };
  for (const s of site.links.strongSites) {
    const inf = s.type.inf;
    if (inf === 'none') continue;
    // each supporting facility can provide up to one strong link of each economy type,
    // this mimicks the in-game UI behavior
    const curSiteLinks: Set<ConcreteEconomy> = new Set();
    if (inf === 'colony') {
      // we need to calculate what the economy actually is for these
      calculateColonyEconomies2(s, calcIds);
      // console.log(`** ${s.buildName}: ${inf}\n`, JSON.stringify(s.economies, null, 2)); // TMP!
      // tally strong links from intrinsic economies
      for (const intrinsicInf of s.intrinsic ?? []) {
        if (intrinsicInf === 'none' || intrinsicInf === 'colony') continue;
        curSiteLinks.add(intrinsicInf);
      }
    } else {
      curSiteLinks.add(inf);
    }

    // if the linked site has its own strong links, we treat those as sub-strong links
    for (const strongLink of s.links?.strongSites ?? []) {
      const linkInf = strongLink.type.inf;
      if (linkInf === 'none' || linkInf === 'colony') continue;
      curSiteLinks.add(linkInf);
    }

    for (const link of curSiteLinks) {
      map[link].strong++;
    }
  }

  for (const s of site.links.weakSites) {
    const inf = s.type.inf;
    if (inf === 'none') continue;
    if (inf === 'colony') {
      // we need to calculate what the economy actually is for these
      calculateColonyEconomies2(s, calcIds);
      // console.log(`** ${s.buildName}: ${inf}\n`, JSON.stringify(s.economies, null, 2)); // TMP!
      // tally weak links from intrinsic economies
      for (const intrinsicInf of s.intrinsic ?? []) {
        if (intrinsicInf === 'none' || intrinsicInf === 'colony') continue;
        map[intrinsicInf].weak++;
      }
    } else {
      if (!map[inf]) { map[inf] = { strong: 0, weak: 0 }; }
      map[inf].weak++;
    }
  }

  // sort by strong, then weak count, or alpha sort if all equal
  const sorted = (Object.keys(map) as Array<ConcreteEconomy>).sort((ka, kb) => {
    const a = map[ka];
    const b = map[kb];
    if (a.strong !== b.strong) {
      return b.strong - a.strong;
    } else if (a.weak !== b.weak) {
      return b.weak - a.weak;
    } else {
      return kb.localeCompare(ka);
    }
  });
  for (const key of sorted) {
    if (map[key].strong === 0 && map[key].weak === 0) { continue; }
    site.links.economies[key] = map[key];
  }
};

export interface SiteTypeValidity {
  isValid: boolean;
  msg?: string;
  unlocks?: string[];
}

export const isTypeValid2 = (sysMap: SysMap2 | SysMap | undefined, type: SiteType | undefined, priorType: SiteType | undefined): SiteTypeValidity => {
  if (!type) { return { isValid: true }; }

  if (sysMap) {
    // give credit for points already spent for priorType
    let neededT2 = sysMap.tierPoints.tier2;
    let neededT3 = sysMap.tierPoints.tier3;
    if (priorType) {
      if (priorType.needs.tier === 2) { neededT2 += priorType.needs.count; }
      if (priorType.needs.tier === 3) { neededT3 += priorType.needs.count; }
    }

    if (type.needs.tier === 2 && neededT2 < type.needs.count) {
      return {
        isValid: false,
        msg: 'Not enough Tier 2 points',
        unlocks: type.unlocks,
      };
    }

    if (type.needs.tier === 3 && neededT3 < type.needs.count) {
      return {
        isValid: false,
        msg: 'Not enough Tier 3 points',
        unlocks: type.unlocks,
      };
    }
  }

  if (type.preReq) {
    const isValid = hasPreReq2(sysMap?.siteMaps, type);
    return {
      isValid: isValid,
      msg: 'Requires ' + mapName[type.preReq],
      unlocks: type.unlocks,
    };
  }

  if (type.unlocks) {
    return {
      isValid: true,
      unlocks: type.unlocks,
    };
  }

  return { isValid: true };
}

export const getPreReqNeeded = (type: SiteType): string[] => {

  switch (type.preReq) {
    case 'satellite': return ["hermes", "angelia", "eirene"];
    case 'comms': return ["pistis", "soter", "aletheia"];
    case 'settlementAgr': return ["consus", "picumnus", "annona", "ceres", "fornax"];
    case 'installationAgr': return ["demeter"];
    case 'installationMil': return ["vacuna", "alastor"];
    case 'outpostMining': return ["euthenia", "phorcys"];
    case 'relay': return ["enodia", "ichnaea"];
    case 'settlementBio': return ["pheobe", "asteria", "caerus", "chronos"];
    case 'settlementTourist': return ["aergia", "comus", "gelos", "fufluns"];
    case 'settlementMilitary': return ["ioke", "bellona", "enyo", "polemos", "minerva"];
    default:
      console.error(`Unexpected preReq: ${type.preReq}`)
      return [];
  }
}

export const hasPreReq2 = (siteMaps: SiteMap2[] | SiteMap[] | undefined, type: SiteType) => {
  if (!siteMaps) { return true; }

  const neededBuildTypes = getPreReqNeeded(type);
  return siteMaps.some(s => neededBuildTypes.some(n => s.buildType?.startsWith(n)));
}

export const getSnapshot = (newSys: Sys, isFav: boolean | undefined) => {
  // prepare a snapshot without using incomplete sites
  const snapshotFull = buildSystemModel2(newSys, false, true);
  const snapshot: SysSnapshot = {
    architect: newSys.architect,
    id64: newSys.id64,
    v: newSys.v,
    name: newSys.name,
    pos: newSys.pos,
    tierPoints: snapshotFull.tierPoints,
    sumEffects: snapshotFull.sumEffects,
    sites: newSys.sites,
    pop: newSys.pop,
    stale: false,
    score: snapshotFull.systemScore ?? -1,
    fav: isFav,
  };
  return snapshot;
};
