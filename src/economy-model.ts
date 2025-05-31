import { Economy } from "./site-data";
import { SiteMap } from "./system-model";
import { BodyFeature, SystemFeature } from "./types";

export interface EconomyMap {
  agriculture: number;
  extraction: number;
  hightech: number;
  industrial: number;
  military: number;
  refinery: number;
  terraforming: number;
  tourism: number;
}

export const calculateColonyEconomies = (site: SiteMap, useIncomplete: boolean) => {
  if (!site.economies || !site.primaryEconomy) {
    const map: EconomyMap = {
      agriculture: 0,
      extraction: 0,
      hightech: 0,
      industrial: 0,
      military: 0,
      refinery: 0,
      terraforming: 0,
      tourism: 0,
    };

    applyBodyType(map, site);
    applyBodyFeatures(map, site);
    applyStrongLinks(map, site, useIncomplete);
    applyBuffs(map, site);
    applyWeakLinks(map, site, useIncomplete);

    // sort to get the primary
    const primaryEconomy = Object.keys(map).sort((a, b) => {
      return map[b as keyof EconomyMap] - map[a as keyof EconomyMap];
    })[0] as Economy;

    // assign these to the given site
    site.economies = map;
    site.primaryEconomy = primaryEconomy;
  }

  return site.primaryEconomy;
};

const applyBodyType = (map: EconomyMap, site: SiteMap) => {
  if (!site.bodyType) { return; }

  switch (site.bodyType) {
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
};

const applyBodyFeatures = (map: EconomyMap, site: SiteMap) => {
  if (!site.bodyFeatures) { return; }

  // If the Body has Organics (also known as Biologicals) (+1.00) for Agriculture and Terraforming - the type of Organics doesn't matter
  if (site.bodyFeatures.includes(BodyFeature.bio)) {
    map.agriculture += 1;
    map.terraforming += 1;
  }
  // If the Body has Geologicals (+1.00) for Industrial and Extraction - the type of Geologicals doesn't matter
  if (site.bodyFeatures.includes(BodyFeature.geo)) {
    map.industrial += 1;
    map.extraction += 1;
  }
  // If the Body has Rings or is an Asteroid Belt (+1.00) for Extraction - Asteroid Belt only counted if the Port is orbiting it
  if (site.bodyFeatures.includes(BodyFeature.rings)) {
    map.extraction += 1;
    // TODO: asteroid belt?
  }
};

const applyStrongLinks = (map: EconomyMap, site: SiteMap, useIncomplete: boolean) => {
  if (!site.links?.strongSites) { return; }

  for (let s of site.links.strongSites) {
    // skip incomplete sites ?
    if (!s.complete && !useIncomplete) { continue; }

    let inf = s.type.inf;
    if (inf === 'none') { continue; }
    if (inf === 'colony') {
      if (!s.primaryEconomy) {
        console.warn(`Why no primaryEconomy yet for '${s.buildName}' generating for: ${site.buildName} ?`);
        continue;
      } else {
        inf = s.primaryEconomy;
      }
    }

    // For Every Tier2 facility that effects a given Economy on/orbiting the same Body as the Port (+0.80 to that Economy) - These are Tier2 Strong Links​
    if (s.type.tier === 2) {
      if (s.type.inf in map) {
        map[s.type.inf as keyof EconomyMap] += 0.8;
      } else {
        console.warn(`Unknown economy '${s.type.inf}' for site ${s.buildName}`);
      }
    }

    // For Every Tier1 facility that effects a given Economy on/orbiting the same Body as the Port (+0.40 to that Economy) - These are Tier1 Strong Links​
    if (s.type.tier === 1) {
      if (s.type.inf in map) {
        map[s.type.inf as keyof EconomyMap] += 0.4;
      } else {
        console.warn(`Unknown economy '${s.type.inf}' for site '${s.buildName}', generating for: ${site.buildName}`);
      }
    }
  }
};

const applyBuffs = (map: EconomyMap, site: SiteMap) => {

  // If the System has Major or Pristine Resources (+0.40) for Industrial, Extraction and Refinery
  if (site.reserveLevel === 'major' || site.reserveLevel === 'pristine') {
    if (map.industrial > 0) { map.industrial += 0.4; }
    if (map.extraction > 0) { map.extraction += 0.4; }
    if (map.refinery > 0) { map.refinery += 0.4; }
  }

  // If the System has a Black Hole / Neutron Star / White Dwarf (+0.40*) for Tourism
  if (site.systemFeatures?.some(sf => [SystemFeature.blackHole, SystemFeature.neutronStar, SystemFeature.whiteDwarf].includes(sf))) {
    if (map.tourism > 0) { map.tourism += 0.4; }
  }

  // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
  if (site.bodyFeatures?.includes(BodyFeature.bio)) {
    if (map.hightech > 0) { map.hightech += 0.4; }
    if (map.tourism > 0) { map.tourism += 0.4; }
    if (map.agriculture > 0) { map.agriculture += 0.4; }
  }
  // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
  if (site.bodyFeatures?.includes(BodyFeature.geo)) {
    if (map.hightech > 0) { map.hightech += 0.4; }
    if (map.tourism > 0) { map.tourism += 0.4; }
  }
  // If the Body is Terraformable (+0.40) for Agriculture
  if (site.bodyFeatures?.includes(BodyFeature.terraformable)) {
    if (map.agriculture > 0) { map.agriculture += 0.4; }
  }
  // If the Body has Volcanism (+0.40) for Extraction - the type of Volcanism doesn't matter
  if (site.bodyFeatures?.includes(BodyFeature.volcanism)) {
    if (map.extraction > 0) { map.extraction += 0.4; }
  }
  // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
  if (site.bodyType === 'elw') {
    if (map.hightech > 0) { map.hightech += 0.4; }
    if (map.tourism > 0) { map.tourism += 0.4; }
    if (map.agriculture > 0) { map.agriculture += 0.4; }
  }
  // If the Body is a Water World (+0.40) for Tourism and Agriculture
  if (site.bodyType === 'ww') {
    if (map.tourism > 0) { map.tourism += 0.4; }
    if (map.agriculture > 0) { map.agriculture += 0.4; }
  }
  // If the Body is an Ammonia World (+0.40) for High Tech and Tourism
  if (site.bodyType === 'ammonia') {
    if (map.hightech > 0) { map.hightech += 0.4; }
    if (map.tourism > 0) { map.tourism += 0.4; }
  }

  // If the System has Low or Depleted Resources (-0.40) for Industrial, Extraction and Refinery
  if (site.reserveLevel === 'low' || site.reserveLevel === 'depleted') {
    if (map.industrial > 0) { map.industrial -= 0.4; }
    if (map.extraction > 0) { map.extraction -= 0.4; }
  }
  // If the Body is an Icy World (-0.40) for Agriculture - Icy World only, does not include Rocky Ice
  if (site.bodyType === 'icy') {
    if (map.agriculture > 0) { map.agriculture -= 0.4; }
  }
  // If the Body is Tidally Locked (-0.40) for Agriculture
  if (site.bodyFeatures?.includes(BodyFeature.tidal)) {
    if (map.agriculture > 0) { map.agriculture -= 0.4; }
  }
};

const applyWeakLinks = (map: EconomyMap, site: SiteMap, useIncomplete: boolean) => {
  if (!site.links?.weakSites) { return; }

  for (let s of site.links.weakSites) {
    // skip incomplete sites ?
    if (!s.complete && !useIncomplete) { continue; }
    // skip primary port from the other body
    if (s === s.body?.orbitalPrimary) { continue; }

    let inf = s.type.inf;
    if (inf === 'none') { continue; }
    if (inf === 'colony') {
      if (!s.primaryEconomy) {
        console.warn(`Why no primaryEconomy yet for '${s.buildName}' generating for: ${site.buildName} ?`);
        continue;
      } else {
        inf = s.primaryEconomy;
      }
    }

    // For Every Facility that effects a given Economy within the System that hasn't already been counted above (+0.05) - These are Weak Links (the Tier does not matter)​
    if (inf in map) {
      map[inf as keyof EconomyMap] += 0.05;
    } else {
      console.warn(`Unknown economy '${s.type.inf}' for site '${s.buildName}', generating for: ${site.buildName}`);
    }
  }
};
