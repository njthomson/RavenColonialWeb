import { Economy } from "./site-data";
import { EconomyMap } from "./system-model";
import { SiteMap2 } from "./system-model2";
import { BodyFeature } from "./types";
import { asPosNegTxt2 } from "./util";

let showConsoleAudit = false;

export const calculateColonyEconomies2 = (site: SiteMap2, useIncomplete: boolean): Economy => {
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
      // but they get body buff's?
      applyBuffs(map, site);
    } else {
      // calculate everything else
      applyBodyType(map, site);
      if (!site.type.fixed) {
        // fixed economies do not get body buff's?
        // OR is it because Garvey Gateway is a strong-link to a bigger port?
        applyBodyFeatures(map, site);
      }
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

    if (showConsoleAudit) {
      var mapTxt = Object.entries(map)
        .filter(([k, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k.padEnd(12)}: ${v.toFixed(2)}`)
        .join('\n');

      const auditTxt = site.economyAudit
        .sort((a, b) => a.inf.localeCompare(b.inf))
        .map(x => `${x.inf.padStart(12)}: ${x.before.toFixed(2)} ${asPosNegTxt2(x.delta).padEnd(4, '0')}  =>  ${x.after.toFixed(2)} \t ${x.reason}`)
        .join('\n');

      console.log(`*** ${site.name} (${site.buildType}) ***\n\n${auditTxt}\n\n${mapTxt}\n\n`);
    }
    site.economyAudit
      .sort((a, b) => map[b.inf as keyof EconomyMap] - map[a.inf as keyof EconomyMap]);
  }

  return site.primaryEconomy;
};

const adjust = (inf: string, delta: number, reason: string, map: EconomyMap, site: SiteMap2) => {
  const before = map[inf as keyof EconomyMap];
  map[inf as keyof EconomyMap] += delta;
  const after = map[inf as keyof EconomyMap];

  if (inf === 'colony') {
    console.warn(`Why are we adjusting Colony for: ${site.name} ?`);
  }

  site.economyAudit?.push({ inf, delta, reason, before, after });
};

const applyBodyType = (map: EconomyMap, site: SiteMap2) => {

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

  // Colony-type ports acquire their economy type(s) as follows:
  // - The “Base Inheritable Economy” type of the local body they are on or orbit is assessed
  switch (site.body?.type) {
    default:
      console.warn(`Unexpected body type: "${site.body?.type}"`);
      return;

    case 'un':
      break;
    case 'bh':
    case 'ns':
    case 'wd':
      adjust('hightech', +1, 'Body type: REMNANT', map, site);
      adjust('tourism', +1, 'Body type: REMNANT', map, site);
      break;
    case 'st':
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
    case 'aw':
      adjust('hightech', +1, 'Body type: AMMONIA', map, site);
      adjust('tourism', +1, 'Body type: AMMONIA', map, site);
      break;
    case 'gg':
      adjust('hightech', +1, 'Body type: GG', map, site);
      adjust('industrial', +1, 'Body type: GG', map, site);
      break;
    case 'hmc':
    case 'mrb':
      adjust('extraction', +1, 'Body type: HMC', map, site);
      break;
    case 'ri':
      adjust('industrial', +1, 'Body type: ROCKY-ICE', map, site);
      adjust('refinery', +1, 'Body type: ROCKY-ICE', map, site);
      break;
    case 'rb':
      adjust('refinery', +1, 'Body type: ROCKY', map, site);
      break;
    case 'ib':
      adjust('industrial', +1, 'Body type: ICY', map, site);
      break;
  }
};

const applyBodyFeatures = (map: EconomyMap, site: SiteMap2) => {
  if (!site.body) { return; }

  // If the Body has Rings or is an Asteroid Belt (+1.00) for Extraction - Asteroid Belt only counted if the Port is orbiting it
  if (site.body.features.includes(BodyFeature.rings)) {
    adjust('extraction', +1, 'Body has: RINGS', map, site);
    // TODO: asteroid belt around stars
  }
  // If the Body has Organics (also known as Biologicals) (+1.00) for Agriculture and Terraforming - the type of Organics doesn't matter
  if (site.body.features.includes(BodyFeature.bio)) {
    adjust('agriculture', +1, 'Body has: BIO', map, site);
    adjust('terraforming', +1, 'Body has: BIO', map, site);
  }
  // If the Body has Geologicals (+1.00) for Industrial and Extraction - the type of Geologicals doesn't matter
  if (site.body.features.includes(BodyFeature.geo)) {
    adjust('extraction', +1, 'Body has: GEO', map, site);
    adjust('industrial', +1, 'Body has: GEO', map, site);
  }
};

const applyStrongLinks = (map: EconomyMap, site: SiteMap2, useIncomplete: boolean) => {
  if (!site.links?.strongSites) { return; }

  // const strongInf = new Set<keyof EconomyMap>(); // Apply strong links once per inf
  for (let s of site.links.strongSites) {
    // skip incomplete sites ?
    if (s.status !== 'complete' && !useIncomplete) { continue; }

    let inf = s.type.inf;
    if (inf === 'none') { continue; }
    if (inf === 'colony') {
      if (!s.primaryEconomy) {
        console.warn(`Why no primaryEconomy yet for '${s.name}' generating for: ${site.name} ?`);
        continue;
      } else {
        inf = s.primaryEconomy;
      }
    }

    /* Apply strong links once per inf
    // Track which economy types are providing a strong link (unless we have a fixed/specialized economy?)
    if (!site.type.fixed) {
      strongInf.add(inf as keyof EconomyMap);
    }
    */

    // For Every Tier2 facility that effects a given Economy on/orbiting the same Body as the Port (+0.80 to that Economy) - These are Tier2 Strong Links​
    if (s.type.tier === 2) {
      if (s.type.inf in map) {
        adjust(s.type.inf, +0.8, `Apply strong link from: ${s.name} (Tier 2)`, map, site);
        // boost every link? (if economy is not fixed?)
        if (!site.type.fixed) {
          applyStrongLinkBoost(inf, map, site);
        }
      } else {
        console.warn(`Unknown economy '${s.type.inf}' for site ${s.name}`);
      }
    }

    // For Every Tier1 facility that effects a given Economy on/orbiting the same Body as the Port (+0.40 to that Economy) - These are Tier1 Strong Links​
    if (s.type.tier === 1) {
      let inf = s.type.inf;
      // use generated primary economy if "colony"
      if (s.type.inf === 'colony' && s.primaryEconomy) {
        console.warn(`TODO: Is this right? Using generated economy '${s.primaryEconomy}' for for site '${s.name}', generating for: ${site.name}`);
        inf = s.primaryEconomy;
      }

      if (inf in map) {
        adjust(inf, +0.4, `Apply strong link from: ${s.name} (Tier 1)`, map, site);
        // boost? (if economy is not fixed?)
        if (!site.type.fixed) {
          applyStrongLinkBoost(inf, map, site);
        }
      } else {
        console.warn(`Unknown economy '${inf}' for site '${s.name}', generating for: ${site.name}`);
      }
    }
  }

  /* Apply strong links once per inf?
  // Strong Links are subject to modifiers which affect them depending on specific characteristics of the local body
  for (const inf of Array.from(strongInf)) {
    applyStrongLinkBoost(inf, map, site);
  }
  */
};

const applyStrongLinkBoost = (inf: Economy, map: EconomyMap, site: SiteMap2) => {

  // assume reserveLevel of PRISTINE if not set
  const reserveLevel = site.sys.reserveLevel ?? 'pristine';

  switch (inf) {
    default: return 0;

    case 'agriculture':
      if (matches(['elw', 'ww'], site.body?.type) || matches([BodyFeature.bio, BodyFeature.terraformable], site.body?.features)) {
        return adjust(inf, +0.4, '+ Boost: Body is ELW / WW or has BIO / TERRAFORMABLE', map, site);
      }
      if (matches(['icy'], site.body?.type) || matches([BodyFeature.tidal], site.body?.features)) {
        // TODO: Need to support: "On or orbiting a moon that is tidally locked to its planet and its subsequent parent planet(s) are tidally locked to the star"
        // Ideally ... just make those bodies have: BodyFeature.tidal
        return adjust(inf, -0.4, 'Strong link boost: Body is ICY or has TIDAL', map, site);
      }
      break;

    case 'extraction':
      if (matches(["major", "pristine"], reserveLevel) || matches([BodyFeature.volcanism], site.body?.features)) {
        return adjust(inf, +0.4, 'Strong link boost: Body reserveLevel is MAJOR / PRISTINE or has VOLCANISM', map, site);
      }
      if (matches(["depleted", "low"], reserveLevel)) {
        return adjust(inf, -0.4, 'Strong link boost: Body reserveLevel is LOW or DEPLETED', map, site);
      }
      return;

    case 'hightech':
      if (matches(['ammonia', 'elw', 'ww'], site.body?.type) || matches([BodyFeature.bio, BodyFeature.geo], site.body?.features)) {
        return adjust(inf, +0.4, 'Strong link boost: Body is AMMONIA or ELW / WW or has has BIO / GEO', map, site);
      }
      return;

    case 'industrial':
    case 'refinery':
      if (matches(["major", "pristine"], reserveLevel)) {
        return adjust(inf, +0.4, 'Strong link boost: Body reserveLevel is MAJOR or PRISTINE', map, site);
      }
      if (matches(["depleted", "low"], reserveLevel)) {
        return adjust(inf, -0.4, 'Strong link boost: Body reserveLevel is LOW or DEPLETED', map, site);
      }
      return;

    case 'tourism':
      if (matches(['ammonia', 'elw', 'ww'], site.body?.type) || matches([BodyFeature.bio, BodyFeature.geo], site.body?.features) || site.sys.bodies.some(b => ['bh', 'ns', 'wd'].includes(b.type))) {
        return adjust(inf, +0.4, 'Strong link boost: Body is AMMONIA / ELW / WW or has BIO / GEO or System has Black Hole / Neutron Star / White Dwarf', map, site);
      }
      return;
  }
}

const applyBuffs = (map: EconomyMap, site: SiteMap2) => {

  // assume reserveLevel of PRISTINE if not set
  const reserveLevel = site.sys.reserveLevel ?? 'pristine';

  // Buffs only apply once per any criteria, except: Reserve level. Hence we will do these first
  const reserveSensitiveEconomies = ['industrial', 'extraction', 'refinery'] as (keyof EconomyMap)[];
  for (const key of reserveSensitiveEconomies) {
    if (map[key] > 0) {
      if (reserveLevel === 'major' || reserveLevel === 'pristine') {
        // If the System has Major or Pristine Resources (+0.40) for Industrial, Extraction and Refinery
        adjust(key, +0.4, 'Buff: reserveLevel MAJOR or PRISTINE', map, site);
      } else if (reserveLevel === 'low' || reserveLevel === 'depleted') {
        // If the System has Low or Depleted Resources (-0.40) for Industrial, Extraction and Refinery
        adjust(key, -0.4, 'Buff: reserveLevel LOW or DEPLETED', map, site);
      }
    }
  }

  if (map.agriculture > 0) {
    if (site.body?.features?.includes(BodyFeature.bio)) {
      // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
      adjust('agriculture', +0.4, 'Buff: body has BIO', map, site);
    }
    else if (site.body?.features?.includes(BodyFeature.terraformable)) {
      adjust('agriculture', +0.4, 'Buff: body has TERRAFORMABLE', map, site);
    }
    // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
    else if (site.body?.type === 'elw') {
      adjust('agriculture', +0.4, 'Buff: body is ELW', map, site);
    }
    // If the Body is a Water World (+0.40) for Tourism and Agriculture
    else if (site.body?.type === 'ww') {
      adjust('agriculture', +0.4, 'Buff: body is WW', map, site);
    }

    if (site.body?.type === 'ib') {
      // If the Body is an Icy World (-0.40) for Agriculture - Icy World only, does not include Rocky Ice
      adjust('agriculture', -0.4, 'Buff: body is ICY', map, site);
    } else if (site.body?.features?.includes(BodyFeature.tidal)) {
      // If the Body is Tidally Locked (-0.40) for Agriculture
      adjust('agriculture', -0.4, 'Buff: body has TIDAL', map, site);
    }
  }

  if (map.hightech > 0) {
    if (site.body?.features?.includes(BodyFeature.bio)) {
      // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
      adjust('hightech', +0.4, 'Buff: body has BIO', map, site);
    } else if (site.body?.features?.includes(BodyFeature.geo)) {
      // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
      adjust('hightech', +0.4, 'Buff: body has GEO', map, site);
    } else if (site.body?.type === 'elw') {
      // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
      adjust('hightech', +0.4, 'Buff: body is ELW', map, site);
    } else if (site.body?.type === 'aw') {
      // If the Body is an Ammonia World (+0.40) for High Tech and Tourism
      adjust('hightech', +0.4, 'Buff: body is AMMONIA', map, site);
    }
  }

  if (map.extraction > 0) {
    if (site.body?.features?.includes(BodyFeature.volcanism)) {
      // If the Body has Volcanism (+0.40) for Extraction - the type of Volcanism doesn't matter
      adjust('extraction', +0.4, 'Buff: body has VOLCANISM', map, site);
    }
  }

  if (map.tourism > 0) {
    if (site.sys.bodies.some(b => ['bh', 'ns', 'wd'].includes(b.type))) {
      // If the System has a Black Hole / Neutron Star / White Dwarf (+0.40*) for Tourism
      adjust('tourism', +0.4, 'Buff: system has Black Hole, Neutron Star or White Dwarf', map, site);
    } else if (site.body?.features?.includes(BodyFeature.bio)) {
      // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
      adjust('tourism', +0.4, 'Buff: body has BIO', map, site);
    } else if (site.body?.features?.includes(BodyFeature.geo)) {
      // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
      adjust('tourism', +0.4, 'Buff: body has GEO', map, site);
    } else if (site.body?.type === 'elw') {
      // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
      adjust('tourism', +0.4, 'Buff: body is ELW', map, site);
    } else if (site.body?.type === 'ww') {
      // If the Body is a Water World (+0.40) for Tourism and Agriculture
      adjust('tourism', +0.4, 'Buff: body is WW', map, site);
    } else if (site.body?.type === 'aw') {
      // If the Body is an Ammonia World (+0.40) for High Tech and Tourism
      adjust('tourism', +0.4, 'Buff: body is AMMONIA', map, site);
    }
  }
};

const applyWeakLinks = (map: EconomyMap, site: SiteMap2, useIncomplete: boolean) => {
  if (!site.links?.weakSites) { return; }

  for (let s of site.links.weakSites) {
    // skip incomplete sites ?
    if (s.status !== 'complete' && !useIncomplete) { continue; }
    // skip primary port from the other body
    if (s === s.body?.orbitalPrimary) { continue; }

    let inf = s.type.inf;
    if (inf === 'none') { continue; }
    if (inf === 'colony') {
      if (!s.primaryEconomy) {
        console.warn(`Why no primaryEconomy yet for '${s.name}' generating for: ${site.name} ?`);
        continue;
      } else {
        inf = s.primaryEconomy;
      }
    }

    // For Every Facility that effects a given Economy within the System that hasn't already been counted above (+0.05) - These are Weak Links (the Tier does not matter)​
    if (inf in map) {
      adjust(inf, +0.05, `Apply weak link from: ${s.name}`, map, site);
    } else {
      console.warn(`Unknown economy '${s.type.inf}' for site '${s.name}', generating for: ${site.name}`);
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