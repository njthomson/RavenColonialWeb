import { Economy } from "./site-data";
import { EconomyMap, SiteMap } from "./system-model";
import { BodyFeature, SystemFeature } from "./types";
import { asPosNegTxt } from "./util";

export const calculateColonyEconomies = (site: SiteMap, useIncomplete: boolean) => {
  if (!site.economies || !site.primaryEconomy) {
    const map = {
      agriculture: 0,
      extraction: 0,
      hightech: 0,
      industrial: 0,
      military: 0,
      refinery: 0,
      terraforming: 0,
      tourism: 0,
      service: 0,
    } as EconomyMap;

    applyBodyType(map, site);
    applyBodyFeatures(map, site);
    applyStrongLinks(map, site, useIncomplete);
    applyBuffs(map, site);
    applyWeakLinks(map, site, useIncomplete);

    // sort to get the primary
    const primaryEconomy = Object.keys(map).sort((a, b) => {
      return map[b as keyof EconomyMap] - map[a as keyof EconomyMap];
    })[0] as Economy;

    // round values (why do we get values of "2.2499999999999996"?)
    for (const key in map) {
      map[key as keyof EconomyMap] = Math.round(map[key as keyof EconomyMap] * 100) / 100;
    }

    // assign these to the given site
    site.economies = map;
    site.primaryEconomy = primaryEconomy;

    // console.warn(`*** ${site.buildName} (${site.buildType}) ***\n${JSON.stringify(map, null, 2)}`)
  }

  return site.primaryEconomy;
};

const applyBodyType = (map: EconomyMap, site: SiteMap) => {
  if (!site.bodyType) { return; }

  // While more research is necessary on this topic, specialized ports appear to be:
  //  - Assigned a baseline economic strength value of 0.5 (several planetary versions) or 1.0 (several orbital versions) for their applicable economy type
  if (site.type.fixed && site.type.fixed !== 'none' && site.type.fixed !== 'colony') {
    if (site.type.orbital) {
      map[site.type.fixed] += 1.0;
    } else {
      map[site.type.fixed] += 0.5;
    }
    //  - NOT affected by the base inheritable economy of the local body
    return;
  }

  // Colony-type ports acquire their economy type(s) as follows:
  // - The “Base Inheritable Economy” type of the local body they are on or orbit is assessed
  switch (site.bodyType) {
    case 'remnant':
      map.hightech += 1;
      map.tourism += 1;
      break;
    case 'star':
      map.military += 1;
      break;
    case 'elw':
      map.agriculture += 1;
      map.hightech += 1;
      map.military += 1;
      map.tourism += 1;
      break;
    case 'ww':
      map.agriculture += 1;
      map.tourism += 1;
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
  }
};

const applyBodyFeatures = (map: EconomyMap, site: SiteMap) => {
  if (!site.bodyFeatures) { return; }

  // If the Body has Rings or is an Asteroid Belt (+1.00) for Extraction - Asteroid Belt only counted if the Port is orbiting it
  if (site.bodyFeatures.includes(BodyFeature.rings)) {
    map.extraction += 1;
    // TODO: asteroid belt around stars
  }
  // If the Body has Organics (also known as Biologicals) (+1.00) for Agriculture and Terraforming - the type of Organics doesn't matter
  if (site.bodyFeatures.includes(BodyFeature.bio)) {
    map.agriculture += 1;
    map.terraforming += 1;
  }
  // If the Body has Geologicals (+1.00) for Industrial and Extraction - the type of Geologicals doesn't matter
  if (site.bodyFeatures.includes(BodyFeature.geo)) {
    map.extraction += 1;
    map.industrial += 1;
  }
};

const applyStrongLinks = (map: EconomyMap, site: SiteMap, useIncomplete: boolean) => {
  if (!site.links?.strongSites) { return; }

  const strongInf = new Set<keyof EconomyMap>();
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

    // Track which economy types are providing a strong link (unless we have a fixed/specialized economy?)
    if (!site.type.fixed) {
      strongInf.add(inf as keyof EconomyMap);
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

  // Strong Links are subject to modifiers which affect them depending on specific characteristics of the local body
  for (const inf of Array.from(strongInf)) {
    const linkBoost = getStrongLinkBoost(inf, site);
    map[inf] += linkBoost;
    console.log(`*** ${site.buildName} *** linkBoost: ${inf} => ${asPosNegTxt(linkBoost)}\n${JSON.stringify(map)}`)
  }
};

const getStrongLinkBoost = (inf: Economy, site: SiteMap) => {
  switch (inf) {
    default: return 0;

    case 'agriculture':
      if (matches(['elw', 'ww'], site.bodyType) || matches([BodyFeature.bio, BodyFeature.terraformable], site.bodyFeatures)) { return +0.4; }
      if (matches(['icy'], site.bodyType) || matches([BodyFeature.tidal], site.bodyFeatures)) {
        // TODO: Need to support: "On or orbiting a moon that is tidally locked to its planet and its subsequent parent planet(s) are tidally locked to the star"
        // Ideally ... just make those bodies have: BodyFeature.tidal
        return -0.4;
      }
      return 0;

    case 'extraction':
      if (matches(["major", "pristine"], site.reserveLevel) || matches([BodyFeature.volcanism], site.bodyFeatures)) { return +0.4; }
      if (matches(["depleted", "low"], site.reserveLevel)) { return -0.4; }
      return 0;

    case 'hightech':
      if (matches(['aw', 'elw', 'ww'], site.bodyType) || matches([BodyFeature.bio, BodyFeature.geo], site.bodyFeatures)) { return +0.4; }
      return 0;

    case 'industrial':
    case 'refinery':
      if (matches(["major", "pristine"], site.reserveLevel)) { return +0.4; }
      if (matches(["depleted", "low"], site.reserveLevel)) { return -0.4; }
      return 0;

    case 'tourism':
      if (matches(['aw', 'elw', 'ww'], site.bodyType) || matches([BodyFeature.bio, BodyFeature.geo], site.bodyFeatures) || matches([SystemFeature.blackHole, SystemFeature.neutronStar, SystemFeature.whiteDwarf], site.systemFeatures)) { return +0.4; }
      return 0;
  }
}

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

const matches = <T>(listRequired: T[], check: T | T[] | undefined) => {
  if (check) {
    const listCheck = Array.isArray(check) ? check : [check];
    return listRequired.some(item => listCheck.includes(item));
  }
  else {
    return false;
  }
}