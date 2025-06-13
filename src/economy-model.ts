import { Economy } from "./site-data";
import { EconomyMap, SiteMap } from "./system-model";
import { BodyFeature, SystemFeature } from "./types";
import { asPosNegTxt2 } from "./util";

export const calculateColonyEconomies = (site: SiteMap, useIncomplete: boolean): Economy => {
  if (!site.economies || !site.primaryEconomy) {
    site.economyAudit = [];
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

    if (site.type.padSize === 'none') {
      // skip anything we cannot land at
      return 'none';
    }

    if (site.type.buildClass === 'settlement') {
      // Odyssey settlements have only 1 fixed economy
      adjust(site.type.inf, +1.0, 'Odyssey settlement fixed economy', map, site);
    } else {
      // calculate everything else
      applyBodyType(map, site);
      applyBodyFeatures(map, site);
      applyStrongLinks(map, site, useIncomplete);
      applyBuffs(map, site);
      applyWeakLinks(map, site, useIncomplete);
    }
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

    var mapTxt = Object.entries(map)
      .filter(([k, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k.padEnd(12)}: ${v.toFixed(2)}`)
      .join('\n');

    const auditTxt = site.economyAudit
      .sort((a, b) => a.inf.localeCompare(b.inf))
      .map(x => `${x.inf.padStart(12)}: ${x.before.toFixed(2)} ${asPosNegTxt2(x.delta).padEnd(4, '0')}  =>  ${x.after.toFixed(2)} \t ${x.reason}`)
      .join('\n');

    console.log(`*** ${site.buildName} (${site.buildType}) ***\n\n${auditTxt}\n\n${mapTxt}\n\n`);
    site.economyAudit
      .sort((a, b) => map[b.inf as keyof EconomyMap] - map[a.inf as keyof EconomyMap]);
  }

  return site.primaryEconomy;
};

const adjust = (inf: string, delta: number, reason: string, map: EconomyMap, site: SiteMap) => {
  const before = map[inf as keyof EconomyMap];
  map[inf as keyof EconomyMap] += delta;
  const after = map[inf as keyof EconomyMap];

  site.economyAudit?.push({ inf, delta, reason, before, after });
};

const applyBodyType = (map: EconomyMap, site: SiteMap) => {

  // While more research is necessary on this topic, specialized ports appear to be:
  //  - Assigned a baseline economic strength value of 0.5 (several planetary versions) or 1.0 (several orbital versions) for their applicable economy type
  if (site.type.fixed && site.type.fixed !== 'none' && site.type.fixed !== 'colony') {
    if (site.type.orbital) {
      adjust(site.type.fixed, +1.0, 'Specialised orbital economy', map, site);
    } else {
      adjust(site.type.fixed, +0.5, 'Specialised surface economy', map, site);
    }
    //  - NOT affected by the base inheritable economy of the local body
    return;
  }

  if (!site.bodyType) { return; }

  // Colony-type ports acquire their economy type(s) as follows:
  // - The “Base Inheritable Economy” type of the local body they are on or orbit is assessed
  switch (site.bodyType) {
    case 'remnant':
      adjust('hightech', +1, 'Body type: REMNANT', map, site);
      adjust('tourism', +1, 'Body type: REMNANT', map, site);
      break;
    case 'star':
      adjust('military', +1, 'Body type: STAR', map, site);
      break;
    case 'elw':
      adjust('agriculture', +1, 'Body type: ELW', map, site);
      adjust('hightech', +1, 'Body type: ELW', map, site);
      adjust('military', +1, 'Body type: ELW', map, site);
      adjust('tourism', +1, 'Body type: ELW', map, site);
      break;
    case 'ww':
      adjust('agriculture', +1, 'Body type: WW', map, site);
      adjust('tourism', +1, 'Body type: WW', map, site);
      break;
    case 'ammonia':
      adjust('hightech', +1, 'Body type: AMMONIA', map, site);
      adjust('tourism', +1, 'Body type: AMMONIA', map, site);
      break;
    case 'gg':
      adjust('hightech', +1, 'Body type: GG', map, site);
      adjust('industrial', +1, 'Body type: GG', map, site);
      break;
    case 'hmc':
      adjust('extraction', +1, 'Body type: HMC', map, site);
      break;
    case 'rockyice':
      adjust('industrial', +1, 'Body type: ROCKY-ICE', map, site);
      adjust('refinery', +1, 'Body type: ROCKY-ICE', map, site);
      break;
    case 'rocky':
      adjust('refinery', +1, 'Body type: ROCKY', map, site);
      break;
    case 'icy':
      adjust('industrial', +1, 'Body type: ICY', map, site);
      break;
  }
};

const applyBodyFeatures = (map: EconomyMap, site: SiteMap) => {
  if (!site.bodyFeatures) { return; }

  // If the Body has Rings or is an Asteroid Belt (+1.00) for Extraction - Asteroid Belt only counted if the Port is orbiting it
  if (site.bodyFeatures.includes(BodyFeature.rings)) {
    adjust('extraction', +1, 'Body has: RINGS', map, site);
    // TODO: asteroid belt around stars
  }
  // If the Body has Organics (also known as Biologicals) (+1.00) for Agriculture and Terraforming - the type of Organics doesn't matter
  if (site.bodyFeatures.includes(BodyFeature.bio)) {
    adjust('agriculture', +1, 'Body has: BIO', map, site);
    adjust('terraforming', +1, 'Body has: BIO', map, site);
  }
  // If the Body has Geologicals (+1.00) for Industrial and Extraction - the type of Geologicals doesn't matter
  if (site.bodyFeatures.includes(BodyFeature.geo)) {
    adjust('extraction', +1, 'Body has: GEO', map, site);
    adjust('industrial', +1, 'Body has: GEO', map, site);
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
        adjust(s.type.inf, +0.8, `Apply strong link from: ${s.buildName} (Tier 2)`, map, site);
      } else {
        console.warn(`Unknown economy '${s.type.inf}' for site ${s.buildName}`);
      }
    }

    // For Every Tier1 facility that effects a given Economy on/orbiting the same Body as the Port (+0.40 to that Economy) - These are Tier1 Strong Links​
    if (s.type.tier === 1) {
      if (s.type.inf in map) {
        adjust(s.type.inf, +0.4, `Apply strong link from: ${s.buildName} (Tier 1)`, map, site);
      } else {
        console.warn(`Unknown economy '${s.type.inf}' for site '${s.buildName}', generating for: ${site.buildName}`);
      }
    }
  }

  // Strong Links are subject to modifiers which affect them depending on specific characteristics of the local body
  for (const inf of Array.from(strongInf)) {
    applyStrongLinkBoost(inf, map, site);
  }
};

const applyStrongLinkBoost = (inf: Economy, map: EconomyMap, site: SiteMap) => {
  switch (inf) {
    default: return 0;

    case 'agriculture':
      if (matches(['elw', 'ww'], site.bodyType) || matches([BodyFeature.bio, BodyFeature.terraformable], site.bodyFeatures)) {
        return adjust(inf, +0.4, 'Strong link boost: Body is ELW or WW || Body has BIO or TERRAFORMABLE', map, site);
      }
      if (matches(['icy'], site.bodyType) || matches([BodyFeature.tidal], site.bodyFeatures)) {
        // TODO: Need to support: "On or orbiting a moon that is tidally locked to its planet and its subsequent parent planet(s) are tidally locked to the star"
        // Ideally ... just make those bodies have: BodyFeature.tidal
        return adjust(inf, -0.4, 'Strong link boost: Body is ICY || Body has TIDAL', map, site);
      }
      break;

    case 'extraction':
      if (matches(["major", "pristine"], site.reserveLevel) || matches([BodyFeature.volcanism], site.bodyFeatures)) {
        return adjust(inf, +0.4, 'Strong link boost: Body reserveLevel is MAJOR or PRISTINE || Body has VOLCANISM', map, site);
      }
      if (matches(["depleted", "low"], site.reserveLevel)) {
        return adjust(inf, -0.4, 'Strong link boost: Body reserveLevel is LOW or DEPLETED', map, site);
      }
      return;

    case 'hightech':
      if (matches(['ammonia', 'elw', 'ww'], site.bodyType) || matches([BodyFeature.bio, BodyFeature.geo], site.bodyFeatures)) {
        return adjust(inf, +0.4, 'Strong link boost: Body is AMMONIA or ELW or WW || Body has BIO or GEO', map, site);
      }
      return;

    case 'industrial':
    case 'refinery':
      if (matches(["major", "pristine"], site.reserveLevel)) {
        return adjust(inf, +0.4, 'Strong link boost: Body reserveLevel is MAJOR or PRISTINE', map, site);
      }
      if (matches(["depleted", "low"], site.reserveLevel)) {
        return adjust(inf, -0.4, 'Strong link boost: Body reserveLevel is LOW or DEPLETED', map, site);
      }
      return;

    case 'tourism':
      if (matches(['ammonia', 'elw', 'ww'], site.bodyType) || matches([BodyFeature.bio, BodyFeature.geo], site.bodyFeatures) || matches([SystemFeature.blackHole, SystemFeature.neutronStar, SystemFeature.whiteDwarf], site.systemFeatures)) {
        return adjust(inf, +0.4, 'Strong link boost: Body is AMMONIA or ELW or WW || Body has BIO or GEO || System has Black Hole or Neutron Star or White Dwarf', map, site);
      }
      return;
  }
}

const applyBuffs = (map: EconomyMap, site: SiteMap) => {

  // If the System has Major or Pristine Resources (+0.40) for Industrial, Extraction and Refinery
  if (site.reserveLevel === 'major' || site.reserveLevel === 'pristine') {
    if (map.industrial > 0) { adjust('industrial', +0.4, 'Buff: reserveLevel MAJOR or PRISTINE', map, site); }
    if (map.extraction > 0) { adjust('extraction', +0.4, 'Buff: reserveLevel MAJOR or PRISTINE', map, site); }
    if (map.refinery > 0) { adjust('refinery', +0.4, 'Buff: reserveLevel MAJOR or PRISTINE', map, site); }
  }

  // If the System has a Black Hole / Neutron Star / White Dwarf (+0.40*) for Tourism
  if (site.systemFeatures?.some(sf => [SystemFeature.blackHole, SystemFeature.neutronStar, SystemFeature.whiteDwarf].includes(sf))) {
    if (map.tourism > 0) { adjust('tourism', +0.4, 'Buff: system has Black Hole, Neutron Star or White Dwarf', map, site); }
  }

  // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
  if (site.bodyFeatures?.includes(BodyFeature.bio)) {
    if (map.hightech > 0) { adjust('hightech', +0.4, 'Buff: body has BIO', map, site); }
    if (map.tourism > 0) { adjust('tourism', +0.4, 'Buff: body has BIO', map, site); }
    if (map.agriculture > 0) { adjust('agriculture', +0.4, 'Buff: body has BIO', map, site); }
  }
  // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
  if (site.bodyFeatures?.includes(BodyFeature.geo)) {
    if (map.hightech > 0) { adjust('hightech', +0.4, 'Buff: body has GEO', map, site); }
    if (map.tourism > 0) { adjust('tourism', +0.4, 'Buff: body has GEO', map, site); }
  }
  // If the Body is Terraformable (+0.40) for Agriculture
  if (site.bodyFeatures?.includes(BodyFeature.terraformable)) {
    if (map.agriculture > 0) { adjust('agriculture', +0.4, 'Buff: body is TERRAFORMABLE', map, site); }
  }
  // If the Body has Volcanism (+0.40) for Extraction - the type of Volcanism doesn't matter
  if (site.bodyFeatures?.includes(BodyFeature.volcanism)) {
    if (map.extraction > 0) { adjust('extraction', +0.4, 'Buff: body has VOLCANISM', map, site); }
  }
  // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
  if (site.bodyType === 'elw') {
    if (map.hightech > 0) { adjust('hightech', +0.4, 'Buff: body is ELW', map, site); }
    if (map.tourism > 0) { adjust('tourism', +0.4, 'Buff: body is ELW', map, site); }
    if (map.agriculture > 0) { adjust('agriculture', +0.4, 'Buff: body is ELW', map, site); }
  }
  // If the Body is a Water World (+0.40) for Tourism and Agriculture
  if (site.bodyType === 'ww') {
    if (map.tourism > 0) { adjust('tourism', +0.4, 'Buff: body is WW', map, site); }
    if (map.agriculture > 0) { adjust('agriculture', +0.4, 'Buff: body is WW', map, site); }
  }
  // If the Body is an Ammonia World (+0.40) for High Tech and Tourism
  if (site.bodyType === 'ammonia') {
    if (map.hightech > 0) { adjust('hightech', +0.4, 'Buff: body is AMMONIA', map, site); }
    if (map.tourism > 0) { adjust('tourism', +0.4, 'Buff: body is AMMONIA', map, site); }
  }

  // If the System has Low or Depleted Resources (-0.40) for Industrial, Extraction and Refinery
  if (site.reserveLevel === 'low' || site.reserveLevel === 'depleted') {
    if (map.industrial > 0) { adjust('industrial', -0.4, 'Buff: reserveLevel LOW or DEPLETED', map, site); }
    if (map.extraction > 0) { adjust('extraction', -0.4, 'Buff: reserveLevel LOW or DEPLETED', map, site); }
    if (map.refinery > 0) { adjust('refinery', -0.4, 'Buff: reserveLevel LOW or DEPLETED', map, site); }
  }
  // If the Body is an Icy World (-0.40) for Agriculture - Icy World only, does not include Rocky Ice
  if (site.bodyType === 'icy') {
    if (map.agriculture > 0) { adjust('agriculture', -0.4, 'Buff: body is ICY', map, site); }
  }
  // If the Body is Tidally Locked (-0.40) for Agriculture
  if (site.bodyFeatures?.includes(BodyFeature.tidal)) {
    if (map.agriculture > 0) { adjust('agriculture', -0.4, 'Buff: body is TIDAL', map, site); }
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
      adjust(inf, +0.05, `Apply weak link from: ${s.buildName}`, map, site);
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