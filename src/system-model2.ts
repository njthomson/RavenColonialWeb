import { SysSnapshot } from './api/v2-system';
import { calculateColonyEconomies2 } from './economy-model2';
import { canReceiveLinks, Economy, getSiteType, mapName, SiteType, SysEffects, sysEffects } from "./site-data";
import { SysMap } from './system-model';
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


export interface SysMap2 extends Sys {
  bodyMap: Record<string, BodyMap2>;
  siteMaps: SiteMap2[];
  tierPoints: TierPoints;
  economies: Record<string, number>;
  sumEffects: SysEffects;
  systemScore: number;
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

export const buildSystemModel2 = (sys: Sys, useIncomplete: boolean, noCache?: boolean): SysMap2 => {
  // const orderIDs = sys.sites.map(s => s.id); // necessary?

  // the primary port is always the first site
  sys.primaryPortId = sys.sites?.length > 0
    ? sys.sites[0].id
    : undefined;

  sys = { ...sys };

  // Read:
  // https://forums.frontier.co.uk/threads/constructing-a-specific-economy.637363/

  // group sites by their bodies, extract system and architect names
  const sysMap = initializeSysMap(sys, useIncomplete);

  // determine primary ports for each body
  const allBodies = Object.values(sysMap.bodyMap);
  for (const body of allBodies) {
    // TODO: if we have a t3 on the surface - we need to funnel all surface links to that first
    body.surfacePrimary = getBodyPrimaryPort(body.surface, useIncomplete);
    body.orbitalPrimary = getBodyPrimaryPort(!!body.surfacePrimary ? body.orbital : body.sites, useIncomplete);
  }

  // per body, calc strong/weak links
  for (const body of allBodies) {
    calcBodyLinks(allBodies, body, sys, useIncomplete);
  }

  // calc sum effects from all sites
  const tierPoints = sumTierPoints(sysMap.siteMaps, useIncomplete);
  const sumEffects = sumSystemEffects(sysMap.siteMaps, useIncomplete);

  // re-sort bodies by their num value
  // sys.bodies.sort((a, b) => a.num - b.num);

  const finalMap = Object.assign(sys, {
    ...sysMap,
    ...sumEffects,
    tierPoints,
  });

  // // store in the cache
  // if (!noCache) {
  //   sysMapCache[finalMap.systemName] = finalMap;
  // }
  return finalMap;
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
  };
}

const initializeSysMap = (sys: Sys, useIncomplete: boolean) => {

  let siteMaps: SiteMap2[] = [];
  let systemScore = 0;

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

    if (site.status === 'complete' || useIncomplete) {
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
    siteMaps, bodyMap, countSites, systemScore,
    // systemName, systemAddress, architect, bodies, primaryPort, allSites, countActive, countSites,
  };
  let scoreTxt = `\n\nSystem score:\n`
    + `score | site name | type | sub-type | body name\n`
    + `------|-----------|------|----------|----------\n`;

  scoreTxt += Array.from(siteMaps)
    .sort((a, b) => a.buildType?.localeCompare(b.buildType))
    .map(site => ` +${site.type.score ?? '■'} | ${site.name} | ${site.type.displayName2} | ${site.buildType} | ${site.body?.name.replace(sys.name, '').replaceAll(' ', '') || sys.name}`)
    .join(`\n`);
  scoreTxt += `\n= ${systemScore} | ${sys.name}\n\n`;
  console.log(scoreTxt);

  return sysMap;
};

export const sumTierPoints = (siteMaps: SiteMap2[], useIncomplete: boolean) => {

  const tierPoints: TierPoints = { tier2: 0, tier3: 0 };
  const primaryPortId = siteMaps && siteMaps[0]?.id;

  let taxCount = -2;
  for (const site of siteMaps) {
    // skip mock sites, unless ...
    if (site.status === 'plan' && !useIncomplete) continue;

    // sum system tier points needed - these are already spent for projects in-progress
    if (site.id !== primaryPortId && site.type.needs.count > 0 && site.type.needs.tier > 1) {
      let needCount = site.type.needs.count;
      if (site.type.buildClass === 'starport' && site.type.tier > 1) {
        taxCount++;
        if (taxCount > 0) {
          if (site.type.tier === 3) {
            needCount *= taxCount + 1;
          } else {
            needCount += 2 * taxCount;
          }
        }
      }

      const tierName = site.type.needs.tier === 2 ? 'tier2' : 'tier3';
      tierPoints[tierName] -= needCount;
      // store this on the site itself, so we can display these adjusted costs
      site.calcNeeds = { tier: site.type.needs.tier, count: needCount };
    }

    // skip incomplete sites, unless ...
    if (site.status !== 'complete' && !useIncomplete) continue;

    // sum system tier points given
    if (site.type.gives.count > 0 && site.type.gives.tier > 1) {
      const tierName = site.type.gives.tier === 2 ? 'tier2' : 'tier3';
      tierPoints[tierName] += site.type.gives.count;
    }
  }

  return tierPoints;
}

const sumSystemEffects = (siteMaps: SiteMap2[], useIncomplete: boolean) => {

  const mapEconomies: Record<string, number> = {};
  const sumEffects: SysEffects = {};

  for (const site of siteMaps) {

    // skip incomplete sites, unless ...
    if (site.status !== 'complete' && !useIncomplete) continue;

    // calc total system economic influence
    if (['settlement', 'outpost', 'starport'].includes(site.type.buildClass)) {
      calculateColonyEconomies2(site, useIncomplete);
    }
    const inf = site.primaryEconomy ?? site.type.inf;

    if (inf !== 'none') {
      mapEconomies[inf] = (mapEconomies[inf] ?? 0) + 1;
    }

    // sum total system effects
    for (const key of sysEffects) {
      const effect = site.type.effects[key] ?? 0;
      if (effect === 0) continue;
      sumEffects[key] = (sumEffects[key] ?? 0) + effect;
    }
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

  return {
    economies,
    sumEffects,
  };
}

const getBodyPrimaryPort = (sites: SiteMap2[], useIncomplete: boolean): SiteMap2 | undefined => {
  if (sites.length === 0) return undefined;

  // skip incomplete sites?
  if (!useIncomplete) {
    sites = sites.filter(s => s.status === 'complete');
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

const calcBodyLinks = (allBodies: BodyMap2[], body: BodyMap2, sys: Sys, useIncomplete: boolean) => {

  // exit early if no primary port for this body
  if (!body.surfacePrimary && !body.orbitalPrimary) { return; }

  // calc strong/weaks links, for surface sites, then orbital
  if (body.surfacePrimary) {
    calcSiteLinks(allBodies, body, body.surfacePrimary, useIncomplete);
  }
  if (body.orbitalPrimary) {
    calcSiteLinks(allBodies, body, body.orbitalPrimary, useIncomplete);
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
    calcSiteEconomies(site, sys, useIncomplete);
  }
}

const calcSiteLinks = (allBodies: BodyMap2[], body: BodyMap2, primarySite: SiteMap2, useIncomplete: boolean) => {

  // start with sites directly on the body
  const siblingSites = body.sites;
  // and if it's an asteroid cluster: include sites directly around the parent star
  const sys = primarySite.sys;
  if (body.type === BT.ac && sys.bodyMap) {
    const parentStar = sys.bodies.find(b => b.num === body.parents[0]);
    if (!parentStar) { throw new Error(`No parent star found for asteroid cluster ${body.name}`); }
    const moreSites = sys.bodyMap[parentStar.name]?.sites;
    if (moreSites) {
      siblingSites.push(...moreSites);
    }
  }

  // strong links are everything else tied to the current body, alpha sort by name
  const strongSites = siblingSites
    .filter(s => {
      if (s.parentLink || s.type.inf === 'none' || s === primarySite || (s.status !== 'complete' && !useIncomplete)) {
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


  // weak links are everything around any other body, except primary ports
  const weakSites = Object.values(allBodies)
    .filter(b => b !== body)
    .flatMap(b => b.sites)
    .filter(s => s.type.inf !== 'none' && (s !== s.body?.orbitalPrimary && s !== s.body?.surfacePrimary) && (s.status === 'complete' || useIncomplete));

  if (strongSites.length > 0 || weakSites.length > 0) {
    primarySite.links = {
      economies: {}, // we need to calculate strong/weak links across all sites before we can populate this
      strongSites,
      weakSites,
    };
  }
}

const calcSiteEconomies = (site: SiteMap2, sys: Sys, useIncomplete: boolean) => {
  if (!site.links) return;

  const map: Record<string, EconomyLink> = {};
  for (const s of site.links.strongSites) {
    let inf = s.type.inf;
    if (inf === 'colony') {
      // we need to calculate what the economy actually is for these
      inf = calculateColonyEconomies2(s, useIncomplete);
      // console.log(`** ${s.buildName}: ${inf}\n`, JSON.stringify(s.economies, null, 2)); // TMP!
    }

    if (!map[inf]) { map[inf] = { strong: 0, weak: 0 }; }
    map[inf].strong += 1;
  }

  for (const s of site.links.weakSites) {
    let inf = s.type.inf;
    if (inf === 'colony') {
      // we need to calculate what the economy actually is for these
      inf = calculateColonyEconomies2(s, useIncomplete);
      // console.log(`** ${s.buildName}: ${inf}\n`, JSON.stringify(s.economies, null, 2)); // TMP!
    }
    if (!map[inf]) { map[inf] = { strong: 0, weak: 0 }; }
    map[inf].weak += 1;
  }

  // sort by strong, then weak count, or alpha sort if all equal
  const sorted = Object.keys(map).sort((ka, kb) => {
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
    site.links.economies[key] = map[key];
  }
};

export const isTypeValid2 = (sysMap: SysMap2 | SysMap | undefined, type: SiteType | undefined, priorType: SiteType | undefined) => {
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
    const isValid = hasPreReq2(sysMap, type);
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

export const hasPreReq2 = (sysMap: SysMap2 | SysMap | undefined, type: SiteType) => {
  if (!sysMap) { return true; }

  switch (type.preReq) {
    case 'satellite':
      return sysMap.siteMaps.some(s => ["hermes", "angelia", "eirene"].some(n => s.buildType?.startsWith(n)));

    case 'comms':
      return sysMap.siteMaps.some(s => ["pistis", "soter", "aletheia"].some(n => s.buildType?.startsWith(n)));

    case 'settlementAgr':
      return sysMap.siteMaps.some(s => ["consus", "picumnus", "annona", "ceres", "fornax"].some(n => s.buildType?.startsWith(n)));

    case 'installationAgr':
      return sysMap.siteMaps.some(s => ["demeter"].some(n => s.buildType?.startsWith(n)));

    case 'installationMil':
      return sysMap.siteMaps.some(s => ["vacuna", "alastor"].some(n => s.buildType?.startsWith(n)));

    case 'outpostMining':
      return sysMap.siteMaps.some(s => ["euthenia", "phorcys"].some(n => s.buildType?.startsWith(n)));

    case 'relay':
      return sysMap.siteMaps.some(s => ["enodia", "ichnaea"].some(n => s.buildType?.startsWith(n)));

    case 'settlementBio':
      return sysMap.siteMaps.some(s => ["pheobe", "asteria", "caerus", "chronos"].some(n => s.buildType?.startsWith(n)));

    case 'settlementTourism':
      return sysMap.siteMaps.some(s => ["aergia", "comus", "gelos", "fufluns"].some(n => s.buildType?.startsWith(n)));

    case 'settlementMilitary':
      return sysMap.siteMaps.some(s => ["ioke", "bellona", "enyo", "polemos", "minerva"].some(n => s.buildType?.startsWith(n)));

    default:
      console.error(`Unexpected preReq: ${type.preReq}`)
      return false;
  }
}

export const getSnapshot = (newSys: Sys) => {
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
  };
  return snapshot;
};
