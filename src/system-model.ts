import * as api from './api';
import { canReceiveLinks, getSiteType, SiteType, SysEffects, sysEffects } from "./site-data";
import { ProjectRef } from "./types";

export const unknown = 'Unknown';

const sysMapCache: Record<string, SysMap> = {};

export const getSysMap = (systemName: string): SysMap | undefined => {
  // return what ever we have cached
  return sysMapCache[systemName];
}

export const fetchSysMap = async (systemName: string): Promise<SysMap> => {
  // return from cache if already present
  if (sysMapCache[systemName]) {
    return sysMapCache[systemName];
  }

  const projects = await api.project.findAllBySystem(systemName);
  const sysMap = buildSystemModel(projects);
  return sysMap;
}


export interface SysMap {
  systemName: string;
  architect?: string;
  primaryPort?: ProjectRef;
  bodies: Record<string, BodyMap>;
  allSites: SiteMap[];
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

export interface SiteMap extends ProjectRef {
  type: SiteType;
  links?: SiteLinks;
  parentLink?: SiteMap;
}

export interface SiteLinks {
  // /** A count of each Economy */
  // strong: Record<string, number>
  // /** A count of each Economy */
  // weak: Record<string, number>

  economies: Record<string, EconomyLink>
  strongSites: SiteMap[];
}

export interface EconomyLink {
  strong: number;
  weak: number;
}

export const buildSystemModel = (projects: ProjectRef[]): SysMap => {

  // Read:
  // https://forums.frontier.co.uk/threads/constructing-a-specific-economy.637363/

  // group sites by their bodies, extract system and architect names
  const sysMap = initializeSysMap(projects);

  // calc sum effects from all sites
  const sumEffects = sumSystemEffects(sysMap.allSites, false);

  // per body, calc strong/weak links
  const allBodies = Object.values(sysMap.bodies);
  for (const body of allBodies) {
    calcBodyLinks(allBodies, body);
  }

  const finalMap = {
    ...sysMap,
    ...sumEffects,
  };

  // store in the cache
  sysMapCache[finalMap.systemName] = finalMap;
  return finalMap
};

const initializeSysMap = (projects: ProjectRef[]) => {

  let systemName = projects[0].systemName;
  let architect = '';
  let primaryPort = undefined;
  let allSites: SiteMap[] = [];
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
    const site: SiteMap = { ...p, type: getSiteType(p.buildType) };
    allSites.push(site);
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

  // sort by body name but force Unknown to be first in the list
  const sortedKeys = Object.keys(bodyMap)
    .filter(n => n !== unknown)
    .sort();
  if (unknown in bodyMap) {
    sortedKeys.unshift(unknown);
  }
  const bodies: Record<string, BodyMap> = {};
  for (let key of sortedKeys) { bodies[key] = bodyMap[key]; }

  const countSites = projects.length;
  const sysMap = {
    systemName, architect, bodies, primaryPort, allSites, countActive, countSites,
  };
  return sysMap;
};

const sumSystemEffects = (allSites: SiteMap[], useIncomplete: boolean) => {

  const mapEconomies: Record<string, number> = {};
  const sumEffects: SysEffects = {};
  const tierPoints: [number, number] = [0, 0];

  for (const site of allSites!) {

    // calc total system economic influence
    if (site.type.inf !== 'none') {
      mapEconomies[site.type.inf] = (mapEconomies[site.type.inf] ?? 0) + 1;
    }

    // sum total system effects
    for (const key of sysEffects) {
      const effect = site.type.effects[key] ?? 0;
      if (effect > 0 && (site.complete || useIncomplete)) {
        sumEffects[key] = (sumEffects[key] ?? 0) + effect;
      }
    }

    // sum system tier points
    if (!site.isPrimaryPort && site.type.needs.count > 0 && site.type.needs.tier > 1) {
      tierPoints[site.type.needs.tier - 2] -= site.type.needs.count
    }
    if (site.type.gives.count > 0 && site.type.gives.tier > 1) {
      tierPoints[site.type.gives.tier - 2] += site.type.gives.count
    }
  }

  // sort by strong, then weak count
  const sorted = Object.keys(mapEconomies).sort((a, b) => mapEconomies[b] - mapEconomies[a]);
  const economies: Record<string, number> = {};
  sorted.forEach(key => economies[key] = mapEconomies[key]);

  const [tier2, tier3] = tierPoints;
  return {
    economies,
    sumEffects,
    tierPoints: { tier2, tier3 }
  };
}

const getBodyPrimaryPort = (sites: SiteMap[]): SiteMap | undefined => {

  // do we have any Tier 3's ?
  const t3s = sites.filter(s => s.type.tier === 3 && canReceiveLinks(s.type));
  if (t3s.length === 1) {
    return t3s[0];
  } else if (t3s.length > 1) {
    console.warn('TODO: use the oldest T3');
    return t3s[0];
  }

  // do we have any Tier 2's ?
  const t2s = sites.filter(s => s.type.tier === 2 && canReceiveLinks(s.type));
  if (t2s.length === 1) {
    return t2s[0];
  } else if (t2s.length > 1) {
    console.warn('TODO: use the oldest T2');
    return t2s[0];
  }

  // do we have any Tier 1's ?
  const t1s = sites.filter(s => s.type.tier === 1 && canReceiveLinks(s.type));
  if (t1s.length === 1) {
    return t1s[0];
  } else if (t1s.length > 1) {
    console.warn('TODO: use the oldest T1');
    return t1s[0];
  }

  // there is no primary to receive links on this body
  return undefined;
}

const calcBodyLinks = (allBodies: BodyMap[], body: BodyMap) => {

  // TODO: if we have a t3 on the surface - we need to funnel all surface links to that first
  body.surfacePrimary = getBodyPrimaryPort(body.surface);
  body.orbitalPrimary = getBodyPrimaryPort(!!body.surfacePrimary ? body.orbital : body.sites);

  // exit early if no primary port for this body
  if (!body.surfacePrimary && !body.orbitalPrimary) { return; }

  // TODO: if we have a t3 on the surface - we need to funnel all surface links to that first
  if (body.surfacePrimary && body.orbitalPrimary) {
    console.warn("TODO: figure out how links apply from surface primary into orbit");
  }

  if (body.orbitalPrimary) {
    calcSiteLinks(allBodies, body, body.orbitalPrimary);
  }
}

const calcSiteLinks = (allBodies: BodyMap[], body: BodyMap, primarySite: SiteMap) => {

  const map: Record<string, EconomyLink> = {};

  // strong links are everything else tied to the current body, alpha sort by name
  const strongSites = body.sites
    .filter(s => s !== primarySite)
    .sort((a, b) => a.buildName.localeCompare(b.buildName));

  for (const site of strongSites) {
    site.parentLink = primarySite;

    const econ = site.type.inf;
    if (econ === 'none') continue;
    if (!map[econ]) { map[econ] = { strong: 0, weak: 0 }; }
    map[econ].strong += 1;
  }

  // weak links are everything around any other body
  Object.values(allBodies)
    .filter(b => b !== body)
    .flatMap(b => b.sites)
    .map(s => s.type.inf)
    .filter(econ => econ !== 'none')
    .forEach(econ => {
      if (!map[econ]) { map[econ] = { strong: 0, weak: 0 }; }
      map[econ].weak += 1;
    });

  // sort by strong, then weak count
  const sorted = Object.keys(map).sort((ka, kb) => {
    const a = map[ka];
    const b = map[kb];
    if (a.strong === b.strong) {
      return b.weak - a.weak;
    } else {
      return b.strong - a.strong;
    }
  });
  const economies: Record<string, EconomyLink> = {};
  sorted.forEach(key => economies[key] = map[key]);

  primarySite.links = {
    economies,
    strongSites,
  };
}

