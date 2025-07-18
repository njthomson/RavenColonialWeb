import { Economy } from "./site-data";
import { EconomyMap } from "./system-model";
import { SiteMap2, SysMap2 } from "./system-model2";
import { BodyFeature } from "./types";
import { Bod } from "./types2";
import { asPosNegTxt2 } from "./util";

let showConsoleAudit = Date.now() < 0;

export const calculateColonyEconomies2 = (site: SiteMap2, useIncomplete: boolean): Economy => {
  // use pre-computed data?
  if (site.economies && site.primaryEconomy) {
    return site.primaryEconomy;
  }

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

  switch (site.type.buildClass) {
    default:
      console.error(`Unexpected buildClass: ${site.type.buildClass}`);
      return 'none';

    case 'hub':
    case 'installation':
    case 'unknown':
      // these have no calculated economies
      console.warn('Why are we here?');
      return 'none';

    case 'settlement':
      // Odyssey settlements have 1 fixed economy + body buffs
      adjust(site.type.inf, +1.0, 'Odyssey settlement fixed economy', map, site);
      applyBuffs(map, site);
      return finishUp(map, site);

    case 'outpost':
    case 'starport':
    // keep going for these...
  }

  if (site.type.fixed) {
    // Specialized ports start with their own economy type
    applySpecializedPort(map, site);
  } else {
    // Colony ports start with an economy based on the parent body, but
    // only apply if we are the surface primary or we're an orbital and there is no surface primary or the surface primary is fixed economy type
    if (site.body?.surfacePrimary === site || (site.type.orbital && (!site.body?.surfacePrimary || site.body?.surfacePrimary?.type.inf !== 'colony'))) {
      applyBodyType(map, site);
    }
  }

  if (site.type.fixed) {
    applyStrongLinkBoost(site.type.fixed, map, site, 'Self');
  }

  // these apply for fixed and economy ports
  applyStrongLinks2(map, site, useIncomplete);
  if (!site.type.fixed) {
    applyBuffs(map, site);

    // // identical to buffs?
    // for (const inf in map) {
    //   if (map[inf as keyof EconomyMap] < 1) continue;
    //   applyStrongLinkBoost(inf as keyof EconomyMap, map, site, 'Self2');
    // }
  }
  applyWeakLinks(map, site, useIncomplete);

  return finishUp(map, site);
};

const finishUp = (map: EconomyMap, site: SiteMap2) => {

  // sort to get the primary
  const primaryEconomy = Object.keys(map).sort((a, b) => {
    return map[b as keyof EconomyMap] - map[a as keyof EconomyMap];
  })[0] as Economy;

  // assign these to the given site
  site.economies = map;
  site.primaryEconomy = primaryEconomy;

  const sorted = site.economyAudit!.sort((a, b) => a.inf.localeCompare(b.inf));
  if (showConsoleAudit) {
    const auditTxt = sorted
      .map((x, i) => {
        let t = `${x.inf.padStart(12)}: \t${asPosNegTxt2(x.delta).padEnd(4, '0')} \t ${x.reason}`;
        if (sorted[i + 1]?.inf !== x.inf) {
          t += `\n${x.inf.padStart(12)}: \t= ${x.after.toFixed(2)}\n`;
        }
        return t;
      })
      .join('\n');

    var finalTally = Object.entries(map)
      .filter(([k, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `\t${k.padEnd(12)}: ${v.toFixed(2)}`)
      .join('\n');

    console.log(`*** ${site.name} (${site.buildType}) ***\n\n${auditTxt}\n\nFinal tally:\n${finalTally}\n\n`);
  }

  site.economyAudit!
    .sort((a, b) => map[b.inf as keyof EconomyMap] - map[a.inf as keyof EconomyMap]);

  return site.primaryEconomy!;
}

const adjust = (inf: string, delta: number, reason: string, map: EconomyMap, site: SiteMap2) => {
  const before = map[inf as keyof EconomyMap];
  map[inf as keyof EconomyMap] += delta;
  // round values (why do we get values of "2.2499999999999996"?)
  map[inf as keyof EconomyMap] = Math.round(map[inf as keyof EconomyMap] * 100) / 100;
  const after = map[inf as keyof EconomyMap];

  if (inf === 'colony') {
    console.warn(`Why are we adjusting Colony for: ${site.name} ?`);
  }

  site.economyAudit?.push({ inf, delta, reason, before, after });
};

const applySpecializedPort = (map: EconomyMap, site: SiteMap2) => {
  if (!site.type.fixed || site.type.fixed === 'none' || site.type.fixed === 'colony') {
    console.warn(`Why are we in: applySpecializedPort?`);
    return;
  }

  // While more research is necessary on this topic, specialized ports appear to be:
  //  - Assigned a baseline economic strength value of 0.5 (several planetary versions) or 1.0 (several orbital versions) for their applicable economy type
  if (site.type.orbital) {
    adjust(site.type.fixed, +1.0, 'Specialised orbital economy', map, site);
  } else {
    adjust(site.type.fixed, +0.5, 'Specialised surface economy', map, site);
  }

  // apply boost as if it were a strong link
  // applyStrongLinkBoost(site.type.fixed, map, site, 'Specialized port');
  // applyBuffs(map, site);
};

const applyBodyType = (map: EconomyMap, site: SiteMap2) => {
  if (site.type.inf !== 'colony') {
    console.warn(`Why are we in: applyBodyType?`);
    return;
  }

  // Colony-type ports acquire their economy type(s) as follows:
  // - The "Base Inheritable Economy" type of the local body they are on or orbit is assessed
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
    case 'ac':
      // If the Body has Rings or is an Asteroid Belt (+1.00) for Extraction - Asteroid Belt only counted if the Port is orbiting it
      adjust('extraction', +1, 'Body type: HMC', map, site);
      break;
  }

  // If the Body has Rings or is an Asteroid Belt (+1.00) for Extraction - Asteroid Belt only counted if the Port is orbiting it
  if (site.body.features.includes(BodyFeature.rings)) {
    if (!['hmc', 'mrb'].includes(site.body?.type)) { adjust('extraction', +1, 'Body has: RINGS', map, site); }
  }

  // If the Body has Organics (also known as Biologicals) (+1.00) for Agriculture and Terraforming - the type of Organics doesn't matter
  if (site.body.features.includes(BodyFeature.bio)) {
    if (!['elw', 'ww'].includes(site.body?.type)) { adjust('agriculture', +1, 'Body has: BIO', map, site); }
    adjust('terraforming', +1, 'Body has: BIO', map, site);
  }

  // If the Body has Geologicals (+1.00) for Industrial and Extraction - the type of Geologicals doesn't matter
  if (site.body.features.includes(BodyFeature.geo)) {
    if (!['hmc', 'mrb'].includes(site.body?.type)) { adjust('extraction', +1, 'Body has: GEO', map, site); }
    if (!['gg', 'ri', 'ib'].includes(site.body?.type)) { adjust('industrial', +1, 'Body has: GEO', map, site); }
  }
};

/*
export const applyStrongLinks0 = (map: EconomyMap, site: SiteMap2, useIncomplete: boolean) => {
  // OLD - remove next time
  if (!site.links?.strongSites) { return; }

  const strongInf = new Set<keyof EconomyMap>(); // Apply strong links once per inf
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

    // Track which economy types are providing a strong link (unless we have a fixed/specialized economy and it matches)
    if (!site.type.fixed || inf === site.type.fixed) {
      strongInf.add(inf as keyof EconomyMap);
    }

    // For Every Tier2 facility that effects a given Economy on/orbiting the same Body as the Port (+0.80 to that Economy) - These are Tier2 Strong Links​
    if (s.type.tier === 2) {
      if (s.type.inf in map) {
        adjust(s.type.inf, +0.8, `Apply strong link from: ${s.name} (Tier 2)`, map, site);
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
      } else {
        console.warn(`Unknown economy '${inf}' for site '${s.name}', generating for: ${site.name}`);
      }
    }
  }

  console.log(`${site.name}:`, Array.from(strongInf));
  // Strong Links are subject to modifiers which affect them depending on specific characteristics of the local body
  for (const inf of Array.from(strongInf)) {
    applyStrongLinkBoost(inf, map, site, 'Strong link0');
  }
};
*/

export const applyStrongLinks2 = (map: EconomyMap, site: SiteMap2, useIncomplete: boolean) => {
  if (!site.links?.strongSites) { return; }

  // For Every Tier2 facility that effects a given Economy on/orbiting the same Body as the Port (+0.80 to that Economy) - These are Tier2 Strong Links​
  // For Every Tier1 facility that effects a given Economy on/orbiting the same Body as the Port (+0.40 to that Economy) - These are Tier1 Strong Links​

  for (let s of site.links.strongSites) {
    if (s.type.inf === 'none') { continue; }

    // skip incomplete sites ?
    if (s.status !== 'complete' && !useIncomplete) { continue; }

    // size of impact varies by Tier: 0.4 / 0.8 / 1.2
    const infSize = s.type.tier === 1 ? 0.4 : (s.type.tier === 2 ? 0.8 : 1.2)

    // apply single adjustment for non-colony types
    if (s.type.inf !== 'colony') {
      // apply single fixed economy influences
      if (s.type.inf in map) {
        adjust(s.type.inf, infSize, `Apply strong link from: ${s.name} (T${s.type.tier})`, map, site);

        applyStrongLinkBoost(s.type.inf, map, site, 'Strong link');
      } else {
        console.warn(`Unknown economy '${s.type.inf}' for site ${s.name} - ${s.type.displayName2} (${s.buildType})`);
      }
      continue;
    }

    if (!s.primaryEconomy) {
      // This means we did not attempt to calculate their economy yet ... why is that?
      console.warn(`Why no primaryEconomy yet for '${s.name}' generating for: ${site.name} ?`);
      continue;
    }

    // boost each economy >= 100%
    for (var e in s.economies) {
      const val = s.economies[e as keyof EconomyMap];
      if (val >= 1) {
        // use the ACTUAL economy strength
        adjust(e, val, `Apply colony strong link from: ${s.name} (T${s.type.tier})`, map, site);
        applyStrongLinkBoost(e as Economy, map, site, 'Strong link');
      }
    }
  }
};

const applyStrongLinkBoost = (inf: Economy, map: EconomyMap, site: SiteMap2, reason: string) => {

  // assume reserveLevel of PRISTINE if not set
  const reserveLevel = site.sys.reserveLevel ?? 'pristine';

  switch (inf) {
    default: return 0;

    case 'agriculture':
      if (matches(['elw', 'ww'], site.body?.type) || matches([BodyFeature.bio, BodyFeature.terraformable], site.body?.features)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body is ELW/WW or has BIO/TERRAFORMABLE`, map, site);
      }
      if (matches(['icy'], site.body?.type) || bodyIsTidalToStar(site.sys, site.body)) {
        adjust(inf, -0.4, `- ${reason} boost: Body is ICY or has TIDAL`, map, site);
      }
      break;

    case 'extraction':
      if (matches(["major", "pristine"], reserveLevel)) {
        adjust(inf, +0.4, `+ ${reason} boost: System reserveLevel is MAJOR OR PRISTINE`, map, site);
      }
      if (matches([BodyFeature.volcanism], site.body?.features)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body has VOLCANISM`, map, site);
      }
      if (matches(["depleted", "low"], reserveLevel)) {
        adjust(inf, -0.4, `- ${reason} boost: System reserveLevel is LOW or DEPLETED`, map, site);
      }
      return;

    case 'hightech':
      if (matches(['ammonia', 'elw', 'ww'], site.body?.type) || matches([BodyFeature.bio, BodyFeature.geo], site.body?.features)) {
        return adjust(inf, +0.4, `+ ${reason} boost: Body is AMMONIA/ELW/WW or has has BIO/GEO`, map, site);
      }
      return;

    case 'industrial':
    case 'refinery':
      if (matches(["major", "pristine"], reserveLevel)) {
        adjust(inf, +0.4, `+ ${reason} boost: System reserveLevel is MAJOR or PRISTINE`, map, site);
      }
      if (matches(["depleted", "low"], reserveLevel)) {
        adjust(inf, -0.4, `- ${reason} boost: System reserveLevel is LOW or DEPLETED`, map, site);
      }
      return;

    case 'tourism':
      if (matches(['ammonia', 'elw', 'ww'], site.body?.type) || matches([BodyFeature.bio, BodyFeature.geo], site.body?.features)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body is AMMONIA/ELW/WW or has BIO/GEO`, map, site);
      }
      if (site.sys.bodies.some(b => ['bh', 'ns', 'wd'].includes(b.type))) {
        adjust(inf, +0.4, `+ ${reason} boost: System has System has Black Hole/Neutron Star/White Dwarf`, map, site);
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
        // this is a dirty hack to prevent refinery from over applying :(
        if (key === 'refinery' && site.body?.type !== 'rb' && site.type.inf === 'colony') {
          continue;
        }

        // If the System has Major or Pristine Resources (+0.40) for Industrial, Extraction and Refinery
        adjust(key, +0.4, 'Buff: reserveLevel MAJOR or PRISTINE', map, site);
      } else if (reserveLevel === 'low' || reserveLevel === 'depleted') {
        // If the System has Low or Depleted Resources (-0.40) for Industrial, Extraction and Refinery
        adjust(key, -0.4, 'Buff: reserveLevel LOW or DEPLETED', map, site);
      }
    }
  }

  if (map.agriculture > 0) {
    if (matches([BodyFeature.bio, BodyFeature.terraformable], site.body?.features)) {
      // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
      adjust('agriculture', +0.4, 'Buff: body has BIO or TERRAFORMABLE', map, site);
    }
    // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
    // If the Body is a Water World (+0.40) for Tourism and Agriculture
    else if (matches(['elw', 'ww'], site.body?.type)) {
      adjust('agriculture', +0.4, 'Buff: body is ELW or WW', map, site);
    }

    if (matches(['ib'], site.body?.type) || bodyIsTidalToStar(site.sys, site.body)) {
      // If the Body is an Icy World (-0.40) for Agriculture - Icy World only, does not include Rocky Ice
      // If the Body is Tidally Locked (-0.40) for Agriculture
      adjust('agriculture', -0.4, 'Buff: body is ICY or has TIDAL', map, site);
    }
  }

  if (map.hightech > 0) {
    if (matches([BodyFeature.bio, BodyFeature.geo], site.body?.features)) {
      // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
      // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
      adjust('hightech', +0.4, 'Buff: body has BIO or GEO', map, site);
    } else if (matches(['elw', 'aw'], site.body?.type)) {
      // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
      // If the Body is an Ammonia World (+0.40) for High Tech and Tourism
      adjust('hightech', +0.4, 'Buff: body is ELW or AMMONIA', map, site);
    }
  }

  if (map.extraction > 0) {
    if (matches([BodyFeature.volcanism], site.body?.features)) {
      // If the Body has Volcanism (+0.40) for Extraction - the type of Volcanism doesn't matter
      adjust('extraction', +0.4, 'Buff: body has VOLCANISM', map, site);
    }
  }

  if (map.tourism > 0) {
    if (site.sys.bodies.some(b => ['bh', 'ns', 'wd'].includes(b.type))) {
      // If the System has a Black Hole / Neutron Star / White Dwarf (+0.40*) for Tourism
      adjust('tourism', +0.4, 'Buff: system has Black Hole or Neutron Star or White Dwarf', map, site);
    } /* else if (matches([BodyFeature.bio, BodyFeature.geo], site.body?.features)) {
      // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
      // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
      adjust('tourism', +0.4, 'Buff: body has BIO or GEO', map, site);
    } else if (matches(['elw', 'ww', 'aw'], site.body?.type)) {
      // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
      // If the Body is a Water World (+0.40) for Tourism and Agriculture
      // If the Body is an Ammonia World (+0.40) for High Tech and Tourism
      adjust('tourism', +0.4, 'Buff: body is ELW or WW or AMMONIA', map, site);
    } */
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

const bodyIsTidalToStar = (sys: SysMap2, body: Bod | undefined): boolean => {

  // stop if this body is not tidally locked
  if (!body?.features.includes(BodyFeature.tidal)) {
    return false;
  }

  // otherwise recurse up parents until we reach a star
  let parentNum = body.parents[0];
  let parentBody = sys.bodies.find(b => b.num === parentNum);
  if (!parentBody) { throw new Error(`Why no parent from: ${body.name}`); }

  // if body is a star - return TRUE say yes as we recursed here
  if (matches(['bh', 'hs', 'wd', 'st'], parentBody.type)) {
    return true;
  }

  if (parentBody.type === 'bc') {
    /* TODO: Implement this ...
      - If **immediate** parent is a barycenter: apply penalty only if sibling is a star
        - If sibling is not a star: do not walk parent chain, do not apply penalty
      - If barycenter encountered in parent chain: apply no penalty
    */
    console.log(`TODO: fully implement barycenters: ${body.name}`);
    return false;
  }

  return bodyIsTidalToStar(sys, parentBody);
}