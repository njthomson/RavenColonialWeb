import * as api from './api';
import { calculateColonyEconomies } from './economy-model';
import { canReceiveLinks, Economy, getSiteType, mapName, SiteType, SysEffects, sysEffects } from "./site-data";
import { ProjectRef } from "./types";

export const unknown = 'Unknown';

const sysMapCache: Record<string, SysMap> = {};

/** Returns what ever cached value we have for the given system */
export const getSysMap = (systemName: string): SysMap | undefined => {
  // return what ever we have cached
  return sysMapCache[systemName];
}

/** Returns cached value, or requests + calculates, for the given system. Automatically includes incomplete sites. */
export const fetchSysMap = async (systemName: string): Promise<SysMap> => {
  // return from cache if already present
  if (sysMapCache[systemName]) {
    return sysMapCache[systemName];
  }

  const projects = await api.system.findAllBySystem(systemName);
  const sysMap = buildSystemModel(projects, true);
  return sysMap;
}


export interface SysMap {
  systemName: string;
  systemAddress: number;
  architect?: string;
  primaryPort?: ProjectRef;
  bodies: Record<string, BodyMap>;
  siteMaps: SiteMap[];
  countSites: number;
  countActive: number;
  tierPoints: TierPoints;
  economies: Record<string, number>;
  sumEffects: SysEffects;
}

export interface TierPoints {
  tier2: number;
  tier3: number;
}

export interface BodyMap {
  name: string;

  sites: SiteMap[];
  surface: SiteMap[];
  orbital: SiteMap[];

  surfacePrimary?: SiteMap;
  orbitalPrimary?: SiteMap;
}

interface AuditEconomy {
  inf: string;
  delta: number;
  reason: string;
  before: number;
  after: number;
}

export interface SiteMap extends ProjectRef {
  type: SiteType;
  links?: SiteLinks;
  /** Economies generated for Colony types */
  economies?: EconomyMap;
  economyAudit?: AuditEconomy[];
  /** Top generated economy generated for Colony types */
  primaryEconomy?: Economy;
  parentLink?: SiteMap;
  body?: BodyMap;
}

export type EconomyMap = Record<Exclude<Economy, 'colony' | 'none'>, number>;

export interface SiteLinks {
  economies: Record<string, EconomyLink>
  strongSites: SiteMap[];
  weakSites: SiteMap[];
}

export interface EconomyLink {
  strong: number;
  weak: number;
}

export const buildSystemModel = (projects: ProjectRef[], useIncomplete: boolean, noCache?: boolean): SysMap => {

  // Read:
  // https://forums.frontier.co.uk/threads/constructing-a-specific-economy.637363/

  // group sites by their bodies, extract system and architect names
  const sysMap = initializeSysMap(projects);

  // determine primary ports for each body
  const allBodies = Object.values(sysMap.bodies);
  for (const body of allBodies) {
    // TODO: if we have a t3 on the surface - we need to funnel all surface links to that first
    body.surfacePrimary = getBodyPrimaryPort(body.surface, useIncomplete);
    body.orbitalPrimary = getBodyPrimaryPort(!!body.surfacePrimary ? body.orbital : body.sites, useIncomplete);
  }

  // per body, calc strong/weak links
  for (const body of allBodies) {
    calcBodyLinks(allBodies, body, useIncomplete);
  }

  // calc sum effects from all sites
  const sumEffects = sumSystemEffects(sysMap.siteMaps, useIncomplete);

  const finalMap = {
    ...sysMap,
    ...sumEffects,
  };

  // store in the cache
  if (!noCache) {
    sysMapCache[finalMap.systemName] = finalMap;
  }
  return finalMap;
};

const initializeSysMap = (projects: ProjectRef[]) => {
  projects.forEach(p => {
    const m = p as SiteMap;
    // remove everything we're going to set below
    delete m.links;
    delete m.economies;
    delete m.primaryEconomy;
    delete m.parentLink;
    delete m.body;
  })

  let systemName = projects.find(s => s.systemName?.length > 0)?.systemName!;
  let systemAddress = projects.find(s => s.systemAddress > 0)?.systemAddress ?? 0;

  let architect = '';
  let primaryPort = undefined;
  let siteMaps: SiteMap[] = [];
  let countActive = 0;

  // first: group sites by their bodies
  const bodyMap = projects.reduce((map, p) => {
    let bodyName = p.bodyName || unknown;

    let body = map[bodyName];
    if (!body) {
      body = { name: bodyName, sites: [], surface: [], orbital: [] };
      map[bodyName] = body;
    }

    // create site entry and add to bodies surface/orbital collection
    const site: SiteMap = { ...p, type: getSiteType(p.buildType)!, body };
    siteMaps.push(site);
    body.sites.push(site);

    if (site.type.orbital) {
      body.orbital.push(site);
    } else {
      body.surface.push(site);
    }

    // assign if not known
    if (!architect && !!p.architectName) {
      architect = p.architectName;
    }
    if (p.isPrimaryPort) {
      primaryPort = p;
    }
    if (!p.complete) {
      countActive++;
    }

    return map;
  }, {} as Record<string, BodyMap>);

  // sort bodies name but force Unknown to be first in the list
  const sortedKeys = Object.keys(bodyMap)
    .filter(n => n !== unknown)
    .sort();
  if (unknown in bodyMap) {
    sortedKeys.unshift(unknown);
  }
  const bodies: Record<string, BodyMap> = {};
  for (let key of sortedKeys) { bodies[key] = bodyMap[key]; }

  // sort all sites and sites-per-body by timeCompleted, forcing unknown to be last
  siteMaps = siteMaps.sort((a, b) => (a.timeCompleted ?? '9000')?.localeCompare(b.timeCompleted ?? '9000'));
  for (let body of Object.values(bodies)) {
    body.sites = body.sites.sort((a, b) => (a.timeCompleted ?? '9000')?.localeCompare(b.timeCompleted ?? '9000'));
  }

  const countSites = projects.length;
  const sysMap = {
    systemName, systemAddress, architect, bodies, primaryPort, siteMaps, countActive, countSites,
  };
  return sysMap;
};

const sumSystemEffects = (allSites: SiteMap[], useIncomplete: boolean) => {

  const mapEconomies: Record<string, number> = {};
  const sumEffects: SysEffects = {};
  const tierPoints: TierPoints = { tier2: 0, tier3: 0 };

  let taxCount = -2;
  for (const site of allSites) {
    // skip mock sites, unless ...
    if (site.isMock && !useIncomplete) continue;

    // sum system tier points needed - these are already spent for projects in-progress
    if (!site.isPrimaryPort && site.type.needs.count > 0 && site.type.needs.tier > 1) {
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
    }

    // skip incomplete sites, unless ...
    if (!site.complete && !useIncomplete) continue;

    // calc total system economic influence
    calculateColonyEconomies(site, useIncomplete);
    const inf = site.type.inf === 'colony' && site.primaryEconomy
      ? site.primaryEconomy
      : site.type.inf;

    if (inf !== 'none') {
      mapEconomies[inf] = (mapEconomies[inf] ?? 0) + 1;
    }

    // sum total system effects
    for (const key of sysEffects) {
      const effect = site.type.effects[key] ?? 0;
      if (effect === 0) continue;
      sumEffects[key] = (sumEffects[key] ?? 0) + effect;
    }

    // sum system tier points given
    if (site.type.gives.count > 0 && site.type.gives.tier > 1) {
      const tierName = site.type.gives.tier === 2 ? 'tier2' : 'tier3';
      tierPoints[tierName] += site.type.gives.count;
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
    tierPoints,
  };
}

const getBodyPrimaryPort = (sites: SiteMap[], useIncomplete: boolean): SiteMap | undefined => {
  // skip incomplete sites?
  if (!useIncomplete) {
    sites = sites.filter(s => s.complete);
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

const calcBodyLinks = (allBodies: BodyMap[], body: BodyMap, useIncomplete: boolean) => {

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
    calcSiteEconomies(site, useIncomplete);
  }
}

const calcSiteLinks = (allBodies: BodyMap[], body: BodyMap, primarySite: SiteMap, useIncomplete: boolean) => {

  // strong links are everything else tied to the current body, alpha sort by name
  const strongSites = body.sites
    .filter(s => {
      if (s.parentLink || s.type.inf === 'none' || s === primarySite || (!s.complete && !useIncomplete)) {
        // skip anything already strong-linked, things without influence, ourself or incompletes
        return false;
      }

      if (!primarySite.type.orbital && s.type.orbital && (s.type.buildClass === 'outpost' || s.type.buildClass === 'starport')) {
        // surface sites cannot claim orbital ports
        return false
      }

      // TODO: something about tier's ... or pre-sort so higher tier's go first?

      // set the link to the primary
      s.parentLink = primarySite;
      return true;
    })
    .sort((a, b) => a.buildName.localeCompare(b.buildName));


  // weak links are everything around any other body, except primary ports
  const weakSites = Object.values(allBodies)
    .filter(b => b !== body)
    .flatMap(b => b.sites)
    .filter(s => s.type.inf !== 'none' && (s !== s.body?.orbitalPrimary && s !== s.body?.surfacePrimary) && (s.complete || useIncomplete));

  if (strongSites.length > 0 || weakSites.length > 0) {
    primarySite.links = {
      economies: {}, // we need to calculate strong/weak links across all sites before we can populate this
      strongSites,
      weakSites,
    };
  }
}

const calcSiteEconomies = (site: SiteMap, useIncomplete: boolean) => {
  if (!site.links) return;

  const map: Record<string, EconomyLink> = {};
  for (const s of site.links.strongSites) {
    let inf = s.type.inf;
    if (inf === 'colony') {
      // we need to calculate what the economy actually is for these
      inf = calculateColonyEconomies(s, useIncomplete);
      // console.log(`** ${s.buildName}: ${inf}\n`, JSON.stringify(s.economies, null, 2)); // TMP!
    }

    if (!map[inf]) { map[inf] = { strong: 0, weak: 0 }; }
    map[inf].strong += 1;
  }

  for (const s of site.links.weakSites) {
    let inf = s.type.inf;
    if (inf === 'colony') {
      // we need to calculate what the economy actually is for these
      inf = calculateColonyEconomies(s, useIncomplete);
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

export const isTypeValid = (sysMap?: SysMap, type?: SiteType) => {
  if (!sysMap || !type) { return { isValid: true }; }

  // unless we don't have enough tier points?
  if (type.needs.tier === 2 && sysMap.tierPoints.tier2 < type.needs.count) {
    return { isValid: false, msg: 'Not enough Tier 2 points' };
  }

  if (type.needs.tier === 3 && sysMap.tierPoints.tier3 < type.needs.count) {
    return { isValid: false, msg: 'Not enough Tier 3 points' };
  }

  if (type.preReq) {
    const isValid = hasPreReq(sysMap, type);
    return {
      isValid: isValid,
      msg: 'Requires ' + mapName[type.preReq],
    };
  }

  return { isValid: true };
}

export const hasPreReq = (sysMap: SysMap, type: SiteType) => {
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
      return sysMap.siteMaps.some(s => ["phoebe", "asteria", "caerus", "chronos"].some(n => s.buildType?.startsWith(n)));

    case 'settlementTourism':
      return sysMap.siteMaps.some(s => ["aergia", "comus", "gelos", "fufluns"].some(n => s.buildType?.startsWith(n)));

    default:
      console.error(`Unexpected preReq: ${type.preReq}`)
      return false;
  }
}