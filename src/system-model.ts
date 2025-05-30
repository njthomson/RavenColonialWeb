import * as api from './api';
import { canReceiveLinks, getSiteType, SiteType, SysEffects, sysEffects } from "./site-data";
import { BodyFeature, ProjectRef, SystemFeature } from "./types";

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

  const projects = await api.project.findAllBySystem(systemName);
  const sysMap = buildSystemModel(projects, true);
  return sysMap;
}


export interface SysMap {
  systemName: string;
  systemAddress: number;
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
  body?: BodyMap;
}

const colonyBuildTypes = [
  "no_truss", "dual_truss", "quad_truss", "coriolis", "no truss", // T2 starports
  "ocellus", "apollo", "artemis", // T3 starports
  "plutus", "vesta" // T1 outposts
];

interface EconomyMap {
  agriculture: number;
  extraction: number;
  hightech: number;
  industrial: number;
  military: number;
  refinery: number;
  terraforming: number;
  tourism: number;
}

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

  // calc sum effects from all sites
  const sumEffects = sumSystemEffects(sysMap.allSites, useIncomplete);

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

  // not quite ready yet
  if (Date.now() < 0) {
    sysMap.allSites
      .filter(s => colonyBuildTypes.includes(s.buildType))
      .forEach(s => calcColonyTypeEconomy(s, useIncomplete));
  }

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

  let systemName = projects.find(s => s.systemName?.length > 0)?.systemName!;
  let systemAddress = projects.find(s => s.systemAddress > 0)?.systemAddress ?? 0;

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
    const site: SiteMap = { ...p, type: getSiteType(p.buildType), body };
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
    systemName, systemAddress, architect, bodies, primaryPort, allSites, countActive, countSites,
  };
  return sysMap;
};

const sumSystemEffects = (allSites: SiteMap[], useIncomplete: boolean) => {

  const mapEconomies: Record<string, number> = {};
  const sumEffects: SysEffects = {};
  const tierPoints: TierPoints = { tier2: 0, tier3: 0 };

  const orderedByAge = allSites.sort((a, b) => (a.timeCompleted ?? '')?.localeCompare(b.timeCompleted ?? ''));

  let taxCount = -2;
  for (const site of orderedByAge) {
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
    if (site.type.inf !== 'none') {
      mapEconomies[site.type.inf] = (mapEconomies[site.type.inf] ?? 0) + 1;
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

  // sort: highest count first
  const sorted = Object.keys(mapEconomies).sort((a, b) => mapEconomies[b] - mapEconomies[a]);
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
  const orderedByAge = sites.sort((a, b) => (a.timeCompleted ?? '')?.localeCompare(b.timeCompleted ?? ''));

  // do we have any Tier 3's ?
  const t3s = orderedByAge.filter(s => s.type.tier === 3 && canReceiveLinks(s.type));
  if (t3s.length > 0) {
    return t3s[0];
  }

  // do we have any Tier 2's ?
  const t2s = orderedByAge.filter(s => s.type.tier === 2 && canReceiveLinks(s.type));
  if (t2s.length > 0) {
    return t2s[0];
  }

  // do we have any Tier 1's ?
  const t1s = orderedByAge.filter(s => s.type.tier === 1 && canReceiveLinks(s.type));
  if (t1s.length > 0) {
    return t1s[0];
  }

  // there is no primary to receive links on this body
  return undefined;
}

const calcBodyLinks = (allBodies: BodyMap[], body: BodyMap, useIncomplete: boolean) => {

  // exit early if no primary port for this body
  if (!body.surfacePrimary && !body.orbitalPrimary) { return; }

  // TODO: if we have a t3 on the surface - we need to funnel all surface links to that first
  if (body.surfacePrimary && body.orbitalPrimary) {
    console.warn("TODO: figure out how links apply from surface primary into orbit");
  }

  if (body.orbitalPrimary) {
    calcSiteLinks(allBodies, body, body.orbitalPrimary, useIncomplete);
  }
  if (body.surfacePrimary) {
    calcSiteLinks(allBodies, body, body.surfacePrimary, useIncomplete);
  }
}

const calcSiteLinks = (allBodies: BodyMap[], body: BodyMap, primarySite: SiteMap, useIncomplete: boolean) => {

  const map: Record<string, EconomyLink> = {};

  // strong links are everything else tied to the current body, alpha sort by name
  const strongSites = body.sites
    .filter(s => s !== primarySite && (s.complete || useIncomplete))
    .sort((a, b) => a.buildName.localeCompare(b.buildName));

  for (const site of strongSites) {
    site.parentLink = primarySite;

    const econ = site.type.inf;
    if (econ === 'none') continue;
    if (!map[econ]) { map[econ] = { strong: 0, weak: 0 }; }
    map[econ].strong += 1;
  }

  // weak links are everything around any other body, except the primary for that body?
  const weakSites = Object.values(allBodies)
    .filter(b => b !== body)
    .flatMap(b => b.sites)
    .filter(s => s.type.inf !== 'none' && (s !== s.body?.orbitalPrimary && s !== s.body?.surfacePrimary) && (s.complete || useIncomplete));

  for (const site of weakSites) {
    const inf = site.type.inf;
    if (!map[inf]) { map[inf] = { strong: 0, weak: 0 }; }
    map[inf].weak += 1;
  }

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
    weakSites,
  };
}

const calcColonyTypeEconomy = (site: SiteMap, useIncomplete: boolean): void => {
  if (!site.bodyType) { console.warn(`Site ${site.buildName} has no body type!`); return; }
  // TODO: finish this ...
  var foo = new ColonyEconomy(site, useIncomplete);
  console.log(`** ${site.buildName}:\n`, foo);
  console.log(`** ${site.buildName}:\n`, JSON.stringify(foo.getEconomies(), null, 2));
}

class ColonyEconomy {
  useIncomplete: boolean;
  site: SiteMap;

  constructor(site: SiteMap, useIncomplete: boolean) {
    this.site = site;
    this.useIncomplete = useIncomplete;
  }

  public getEconomies(): EconomyMap {
    const map = {
      agriculture: 0,
      extraction: 0,
      hightech: 0,
      industrial: 0,
      military: 0,
      refinery: 0,
      terraforming: 0,
      tourism: 0,
    };

    this.applyBodyType(map);
    this.applyBodyFeatures(map);
    this.applyStrongLinks(map);
    this.applyBuffs(map);
    this.applyWeakLinks(map);

    return map;
  }

  private applyBodyType(map: EconomyMap) {
    if (!this.site.bodyType) { return; }

    switch (this.site.bodyType) {
      case 'remnant':
        map.hightech += 1;
        map.tourism += 1;
        break;
      case 'star':
        map.military += 1;
        break;
      case 'elw':
        map.hightech += 1;
        map.tourism += 1;
        map.military += 1;
        map.agriculture += 1;
        break;
      case 'ww':
        map.tourism += 1;
        map.agriculture += 1;
        break;
      case 'ammonia':
        map.hightech += 1;
        map.tourism += 1;
        break;
      case 'gg':
        map.hightech += 1;
        map.industrial += 1;
        break;
      case 'hmc':
        map.extraction += 1;
        break;
      case 'rockyice':
        map.industrial += 1;
        map.refinery += 1;
        break;
      case 'rocky':
        map.refinery += 1;
        break;
      case 'icy':
        map.industrial += 1;
        break;
      // case 'asteroid':
      //   // TODO ...
      //   break;
    }
  }

  private applyBodyFeatures(map: EconomyMap) {
    if (!this.site.bodyFeatures) { return; }

    // If the Body has Organics (also known as Biologicals) (+1.00) for Agriculture and Terraforming - the type of Organics doesn't matter
    if (this.site.bodyFeatures.includes(BodyFeature.bio)) {
      map.agriculture += 1;
      map.terraforming += 1;
    }
    // If the Body has Geologicals (+1.00) for Industrial and Extraction - the type of Geologicals doesn't matter
    if (this.site.bodyFeatures.includes(BodyFeature.geo)) {
      map.industrial += 1;
      map.extraction += 1;
    }
    // If the Body has Rings or is an Asteroid Belt (+1.00) for Extraction - Asteroid Belt only counted if the Port is orbiting it
    if (this.site.bodyFeatures.includes(BodyFeature.rings)) {
      map.extraction += 1;
      // TODO: asteroid belt?
    }
  }

  private applyStrongLinks(map: EconomyMap) {
    if (!this.site.links?.strongSites) { return; }

    for (let site of this.site.links.strongSites) {
      // skip incomplete sites ?
      if (!site.complete && !this.useIncomplete) { continue; }
      const inf = site.type.inf;
      if (junkEconomies.includes(inf)) { continue; }

      // For Every Tier2 facility that effects a given Economy on/orbiting the same Body as the Port (+0.80 to that Economy) - These are Tier2 Strong Links​
      if (site.type.tier === 2) {
        if (site.type.inf in map) {
          map[site.type.inf as keyof EconomyMap] += 0.8;
        } else {
          console.warn(`Unknown economy '${site.type.inf}' for site ${site.buildName}`);
        }
      }

      // For Every Tier1 facility that effects a given Economy on/orbiting the same Body as the Port (+0.40 to that Economy) - These are Tier1 Strong Links​
      if (site.type.tier === 1) {
        if (site.type.inf in map) {
          map[site.type.inf as keyof EconomyMap] += 0.4;
        } else {
          console.warn(`Unknown economy '${site.type.inf}' for site ${site.buildName}`);
        }
      }
    }
  }

  private applyBuffs(map: EconomyMap) {

    // If the System has Major or Pristine Resources (+0.40) for Industrial, Extraction and Refinery
    if (this.site.reserveLevel === 'major' || this.site.reserveLevel === 'pristine') {
      if (map.industrial > 0) { map.industrial += 0.4; }
      if (map.extraction > 0) { map.extraction += 0.4; }
      if (map.refinery > 0) { map.refinery += 0.4; }
    }

    // If the System has a Black Hole / Neutron Star / White Dwarf (+0.40*) for Tourism
    if (this.site.systemFeatures?.some(sf => [SystemFeature.blackHole, SystemFeature.neutronStar, SystemFeature.whiteDwarf].includes(sf))) {
      if (map.tourism > 0) { map.tourism += 0.4; }
    }

    // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
    if (this.site.bodyFeatures?.includes(BodyFeature.bio)) {
      if (map.hightech > 0) { map.hightech += 0.4; }
      if (map.tourism > 0) { map.tourism += 0.4; }
      if (map.agriculture > 0) { map.agriculture += 0.4; }
    }
    // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
    if (this.site.bodyFeatures?.includes(BodyFeature.geo)) {
      if (map.hightech > 0) { map.hightech += 0.4; }
      if (map.tourism > 0) { map.tourism += 0.4; }
    }
    // If the Body is Terraformable (+0.40) for Agriculture
    if (this.site.bodyFeatures?.includes(BodyFeature.terraformable)) {
      if (map.agriculture > 0) { map.agriculture += 0.4; }
    }
    // If the Body has Volcanism (+0.40) for Extraction - the type of Volcanism doesn't matter
    if (this.site.bodyFeatures?.includes(BodyFeature.volcanism)) {
      if (map.extraction > 0) { map.extraction += 0.4; }
    }
    // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
    if (this.site.bodyType === 'elw') {
      if (map.hightech > 0) { map.hightech += 0.4; }
      if (map.tourism > 0) { map.tourism += 0.4; }
      if (map.agriculture > 0) { map.agriculture += 0.4; }
    }
    // If the Body is a Water World (+0.40) for Tourism and Agriculture
    if (this.site.bodyType === 'ww') {
      if (map.tourism > 0) { map.tourism += 0.4; }
      if (map.agriculture > 0) { map.agriculture += 0.4; }
    }
    // If the Body is an Ammonia World (+0.40) for High Tech and Tourism
    if (this.site.bodyType === 'ammonia') {
      if (map.hightech > 0) { map.hightech += 0.4; }
      if (map.tourism > 0) { map.tourism += 0.4; }
    }

    // If the System has Low or Depleted Resources (-0.40) for Industrial, Extraction and Refinery
    if (this.site.reserveLevel === 'low' || this.site.reserveLevel === 'depleted') {
      if (map.industrial > 0) { map.industrial -= 0.4; }
      if (map.extraction > 0) { map.extraction -= 0.4; }
    }
    // If the Body is an Icy World (-0.40) for Agriculture - Icy World only, does not include Rocky Ice
    if (this.site.bodyType === 'icy') {
      if (map.agriculture > 0) { map.agriculture -= 0.4; }
    }
    // If the Body is Tidally Locked (-0.40) for Agriculture
    if (this.site.bodyFeatures?.includes(BodyFeature.tidal)) {
      if (map.agriculture > 0) { map.agriculture -= 0.4; }
    }
  }

  private applyWeakLinks(map: EconomyMap) {
    if (!this.site.links?.weakSites) { return; }

    for (let site of this.site.links.weakSites) {
      // skip incomplete sites ?
      if (!site.complete && !this.useIncomplete) { continue; }
      // skip primary port from the other body
      if (site === site.body?.orbitalPrimary) { continue; }

      const inf = site.type.inf;
      if (junkEconomies.includes(inf)) { continue; }

      // For Every Facility that effects a given Economy within the System that hasn't already been counted above (+0.05) - These are Weak Links (the Tier does not matter)​
      if (site.type.inf in map) {
        map[site.type.inf as keyof EconomyMap] += 0.05;
      } else {
        console.warn(`Unknown economy '${site.type.inf}' for site ${site.buildName}`);
      }
    }
  }
}

const junkEconomies = ['none'];