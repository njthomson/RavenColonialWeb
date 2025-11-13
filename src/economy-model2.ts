import { Economy } from "./site-data";
import { EconomyMap } from "./system-model";
import { SiteMap2, SysMap2 } from "./system-model2";
import { BodyFeature } from "./types";
import { Bod, BT } from "./types2";
import { asPosNegTxt2 } from "./util";

let showConsoleAudit = Date.now() < 0;

const useNewModel = true;

/** Black hole, Neutron star or White Dwarf */
export const stellarRemnants = [BT.bh, BT.ns, BT.wd];

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
      applyBuffs(map, site, true);
      return finishUp(map, site);

    case 'outpost':
    case 'starport':
    // keep going for these...
  }

  if (site.type.fixed) {
    // Specialized ports start with their own economy type
    applySpecializedPort(map, site);
  } else {
    // Colony ports start with an economy based on the parent body, but ...
    // apply unless: we are orbital and the surface primary IS Colony, or we are not the orbital primary
    if (!site.type.orbital || site.body?.surfacePrimary?.type.inf !== 'colony' || site !== site.body?.orbitalPrimary || useNewModel) {
      applyBodyType(map, site);
    }

    if (useNewModel) {
      applyBuffs(map, site, false);
    }
  }

  if (site.type.fixed && !useNewModel) {
    applyStrongLinkBoost(site.type.fixed, map, site, 'Self');
  }

  // these apply for fixed and economy ports
  if (site.links) {
    applyStrongLinks2(map, site.links!.strongSites, site, useIncomplete);

    if (!site.type.fixed) {
      if (!useNewModel) {
        applyBuffs(map, site, false);
      }
      // // identical to buffs?
      // for (const inf in map) {
      //   if (map[inf as keyof EconomyMap] < 1) continue;
      //   applyStrongLinkBoost(inf as keyof EconomyMap, map, site, 'Self2');
      // }
    }
    applyWeakLinks(map, site, useIncomplete);
  }

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

const adjust = (inf: Economy, delta: number, reason: string, map: EconomyMap, site: SiteMap2, source?: 'body' | 'sys') => {
  const before = map[inf as keyof EconomyMap];
  let newValue = map[inf as keyof EconomyMap] + delta;
  if (newValue <= 0) { newValue = 0.1; }
  // round values (why do we get values of "2.2499999999999996"?)
  map[inf as keyof EconomyMap] = Math.round(newValue * 100) / 100;
  const after = map[inf as keyof EconomyMap];

  if (inf === 'colony') {
    console.warn(`Why are we adjusting Colony for: ${site.name} ?`);
  }

  site.economyAudit?.push({ inf, delta, reason, before, after });

  if (source === 'body') {
    if (!site.bodyBuffed) { site.bodyBuffed = new Set<Economy>(); }
    site.bodyBuffed.add(inf);
  }
  if (source === 'sys') {
    if (!site.systemBuffed) { site.systemBuffed = new Set<Economy>(); }
    site.systemBuffed.add(inf);
  }
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
  if (useNewModel) {
    applyBuffs(map, site, false);
  }
};

export const applyBodyType = (map: EconomyMap, site: SiteMap2) => {
  if (site.type.inf !== 'colony') {
    console.warn(`Why are we in: applyBodyType?`);
    return;
  }
  const intrinsic = new Set<Economy>();

  // Colony-type ports acquire their economy type(s) as follows:
  // - The "Base Inheritable Economy" type of the local body they are on or orbit is assessed
  switch (site.body?.type) {
    default:
      console.warn(`Unexpected body type: "${site.body?.type}"`);
      return;

    case BT.un:
      break;
    case BT.bh:
    case BT.ns:
    case BT.wd:
      adjust('hightech', +1, 'Body type: BH/NS/WD', map, site); intrinsic.add('hightech');
      adjust('tourism', +1, 'Body type: BH/NS/WD', map, site); intrinsic.add('tourism');
      break;
    case BT.st:
      adjust('military', +1, 'Body type: STAR', map, site); intrinsic.add('military');
      break;
    case BT.elw:
      adjust('agriculture', +1, 'Body type: ELW', map, site); intrinsic.add('agriculture');
      adjust('hightech', +1, 'Body type: ELW', map, site); intrinsic.add('hightech');
      adjust('military', +1, 'Body type: ELW', map, site); intrinsic.add('military');
      adjust('tourism', +1, 'Body type: ELW', map, site); intrinsic.add('tourism');
      break;
    case BT.ww:
      adjust('agriculture', +1, 'Body type: WW', map, site); intrinsic.add('agriculture');
      adjust('tourism', +1, 'Body type: WW', map, site); intrinsic.add('tourism');
      break;
    case BT.aw:
      adjust('hightech', +1, 'Body type: AMMONIA', map, site); intrinsic.add('hightech');
      adjust('tourism', +1, 'Body type: AMMONIA', map, site); intrinsic.add('tourism');
      break;
    case BT.gg:
    case BT.wg:
      adjust('hightech', +1, 'Body type: GG/WG', map, site); intrinsic.add('hightech');
      adjust('industrial', +1, 'Body type: GG/WG', map, site); intrinsic.add('industrial');
      break;
    case BT.hmc:
    case BT.mrb:
      adjust('extraction', +1, 'Body type: HMC', map, site); intrinsic.add('extraction');
      break;
    case BT.ri:
      adjust('industrial', +1, 'Body type: ROCKY-ICE', map, site); intrinsic.add('industrial');
      adjust('refinery', +1, 'Body type: ROCKY-ICE', map, site); intrinsic.add('refinery');
      break;
    case BT.rb:
      adjust('refinery', +1, 'Body type: ROCKY', map, site); intrinsic.add('refinery');
      break;
    case BT.ib:
      adjust('industrial', +1, 'Body type: ICY', map, site); intrinsic.add('industrial');
      break;
    case BT.ac:
      // If the Body has Rings or is an Asteroid Belt (+1.00) for Extraction - Asteroid Belt only counted if the Port is orbiting it
      adjust('extraction', +1, 'Body type: ASTEROID', map, site); intrinsic.add('extraction');
      break;
  }

  // If the Body has Rings or is an Asteroid Belt (+1.00) for Extraction - Asteroid Belt only counted if the Port is orbiting it
  if (site.body.features.includes(BodyFeature.rings)) {
    if (![BT.hmc, BT.mrb].includes(site.body?.type)) { adjust('extraction', +1, 'Body has: RINGS', map, site, 'body'); intrinsic.add('extraction'); }
  }

  // If the Body has Organics (also known as Biologicals) (+1.00) for Agriculture and Terraforming - the type of Organics doesn't matter
  if (site.body.features.includes(BodyFeature.bio)) {
    if (![BT.elw, BT.ww].includes(site.body?.type)) { adjust('agriculture', +1, 'Body has: BIO', map, site, 'body'); intrinsic.add('agriculture'); }
    adjust('terraforming', +1, 'Body has: BIO', map, site, 'body'); intrinsic.add('terraforming');
  }

  // If the Body has Geologicals (+1.00) for Industrial and Extraction - the type of Geologicals doesn't matter
  if (site.body.features.includes(BodyFeature.geo)) {
    if (![BT.hmc, BT.mrb].includes(site.body?.type)) { adjust('extraction', +1, 'Body has: GEO', map, site, 'body'); intrinsic.add('extraction'); }
    if (![BT.gg, BT.wg, BT.ri, BT.ib].includes(site.body?.type)) { adjust('industrial', +1, 'Body has: GEO', map, site, 'body'); intrinsic.add('industrial'); }
  }

  site.intrinsic = Array.from(intrinsic);
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

export const applyStrongLinks2 = (map: EconomyMap, strongSites: SiteMap2[], site: SiteMap2, useIncomplete: boolean, subLink?: Economy | '*') => {
  // For Every Tier2 facility that effects a given Economy on/orbiting the same Body as the Port (+0.80 to that Economy) - These are Tier2 Strong Links​
  // For Every Tier1 facility that effects a given Economy on/orbiting the same Body as the Port (+0.40 to that Economy) - These are Tier1 Strong Links​
  for (let s of strongSites) {
    if (s.type.inf === 'none') { continue; }

    // skip incomplete sites ?
    if (s.status !== 'complete' && !useIncomplete) { continue; }

    // skip if we have a sub-link and this inf doesn't match it

    // size of impact varies by Tier: 0.4 / 0.8 / 1.2
    const infSize = s.type.tier === 1 ? 0.4 : (s.type.tier === 2 ? 0.8 : 1.2);
    const prefix = !!subLink ? 'sub-strong link' : 'Strong link';

    // apply single adjustment for non-colony types
    if (s.type.inf !== 'colony') {
      // apply single fixed economy influences
      if (s.type.inf in map) {
        adjust(s.type.inf, infSize, `Apply ${prefix} from: ${s.name} (T${s.type.tier})`, map, site);

        applyStrongLinkBoost(s.type.inf, map, site, prefix);
      } else {
        console.warn(`Unknown economy '${s.type.inf}' for site ${s.name} - ${s.type.displayName2} (${s.buildType})`);
      }

      // also apply sub-strong links from the emitting port
      if (useNewModel && s.links?.strongSites && !subLink) {
        applyStrongLinks2(map, s.links?.strongSites, site, useIncomplete, s.type.inf);
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
      const ee = e as keyof EconomyMap;
      const val = s.economies[ee];
      // only boost intrinsic economies from initial body influences (not from links)
      if (s.intrinsic?.includes(ee)) {
        if (useNewModel /* && s.type.tier === site.type.tier*/) {
          const infSize = s.type.tier === 1 ? 0.4 : (s.type.tier === 2 ? 0.8 : 1.2)
          adjust(ee, infSize, `Apply colony ${prefix} from: ${s.name} (T${s.type.tier})`, map, site);
        } else {
          // use the ACTUAL economy strength
          adjust(ee, val, `Apply colony ${prefix} from: ${s.name} (T${s.type.tier})`, map, site);
        }

        applyStrongLinkBoost(ee, map, site, `${prefix}s`);

        // Add a special case: terraforming can be boosted by colony-to-colony strong links.
        if (ee === 'terraforming' && !useNewModel) {
          adjust(ee, +0.4, `+ Colony ${prefix} boost (really?)`, map, site, 'body');
        }
      }
    }

    // also apply sub-strong links from the emitting port
    if (useNewModel && s.links?.strongSites && !subLink) {
      applyStrongLinks2(map, s.links?.strongSites, site, useIncomplete, "*");
    }
  }
};

export const applyStrongLinkBoost = (inf: Economy, map: EconomyMap, site: SiteMap2, reason: string) => {

  // assume reserveLevel of PRISTINE if not set
  const reserveLevel = site.sys.reserveLevel ?? 'pristine';

  switch (inf) {
    default: return 0;

    case 'agriculture':
      if (useNewModel && false) { // disable for now
        if (matches([BT.elw, BT.ww], site.body?.type)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body is ELW/WW`, map, site, 'body');
        }
        if (matches([BodyFeature.bio], site.body?.features)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body has BIO`, map, site, 'body');
        }
        if (matches([BodyFeature.terraformable], site.body?.features)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body has TERRAFORMABLE`, map, site, 'body');
        }
      } else {
        if (matches([BT.elw, BT.ww], site.body?.type) || matches([BodyFeature.bio, BodyFeature.terraformable], site.body?.features)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body is ELW/WW or has BIO/TERRAFORMABLE`, map, site, 'body');
        }
      }
      if (matches([BT.ib], site.body?.type) || bodyIsTidalToStar(site.sys, site.body)) {
        adjust(inf, -0.4, `- ${reason} boost: Body is ICY or has TIDAL`, map, site, 'body');
      }
      break;

    case 'extraction':
      if (matches(["major", "pristine"], reserveLevel)) {
        adjust(inf, +0.4, `+ ${reason} boost: System reserveLevel is MAJOR OR PRISTINE`, map, site, 'sys');
      }
      else if (matches(["depleted", "low"], reserveLevel)) {
        adjust(inf, -0.4, `- ${reason} boost: System reserveLevel is LOW or DEPLETED`, map, site, 'sys');
      }
      if (matches([BodyFeature.volcanism], site.body?.features)) {
        adjust(inf, +0.4, `+ ${reason} boost: Body has VOLCANISM`, map, site, 'body');
      }
      return;

    case 'hightech':
      if (useNewModel) { // unlike the others - enable this one
        if (matches([BT.aw, BT.elw, BT.ww], site.body?.type)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body is AW/ELW/WW`, map, site, 'body');
        }
        if (matches([BodyFeature.bio], site.body?.features)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body has BIO`, map, site, 'body');
        }
        if (matches([BodyFeature.geo], site.body?.features)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body has GEO`, map, site, 'body');
        }
      }
      else {
        if (matches([BT.aw, BT.elw, BT.ww], site.body?.type) || matches([BodyFeature.bio, BodyFeature.geo], site.body?.features)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body is AW/ELW/WW or has BIO/GEO`, map, site, 'body');
        }
      }
      return;

    case 'industrial':
    case 'refinery':
      if (matches(["major", "pristine"], reserveLevel)) {
        adjust(inf, +0.4, `+ ${reason} boost: System reserveLevel is MAJOR or PRISTINE`, map, site, 'sys');
      }
      else if (matches(["depleted", "low"], reserveLevel)) {
        adjust(inf, -0.4, `- ${reason} boost: System reserveLevel is LOW or DEPLETED`, map, site, 'sys');
      }
      return;

    case 'tourism':
      if (useNewModel) {
        if (matches([BT.aw, BT.elw, BT.ww], site.body?.type)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body is AW/ELW/WW`, map, site, 'body');
        }
        if (matches([BodyFeature.bio], site.body?.features)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body has BIO`, map, site, 'body');
        }
        if (matches([BodyFeature.geo], site.body?.features)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body has GEO`, map, site, 'body');
        }
        if (site.sys.bodies.some(b => b.type === BT.ns)) {
          adjust(inf, +0.4, `+ ${reason} boost: System has Neutron Star`, map, site, 'sys');
        }
        if (site.sys.bodies.some(b => b.type === BT.bh)) {
          adjust(inf, +0.4, `+ ${reason} boost: System has Black Hole`, map, site, 'sys');
        }
        if (site.sys.bodies.some(b => b.type === BT.wd)) {
          adjust(inf, +0.4, `+ ${reason} boost: System has White Dwarf`, map, site, 'sys');
        }
      } else {
        if (matches([BT.aw, BT.elw, BT.ww], site.body?.type) || matches([BodyFeature.bio, BodyFeature.geo], site.body?.features)) {
          adjust(inf, +0.4, `+ ${reason} boost: Body is AW/ELW/WW or has BIO/GEO`, map, site, 'body');
        }
        if (site.sys.bodies.some(b => stellarRemnants.includes(b.type))) {
          adjust(inf, +0.4, `+ ${reason} boost: System has BH/NS/WD`, map, site, 'sys');
        }
      }
      return;
  }
}

export const applyBuffs = (map: EconomyMap, site: SiteMap2, isSettlement: boolean) => {

  // Do not apply any negative buffs to Odyssey settlements

  // assume reserveLevel of PRISTINE if not set
  const reserveLevel = site.sys.reserveLevel ?? 'pristine';

  // Buffs only apply once per any criteria, except: Reserve level. Hence we will do these first
  const reserveSensitiveEconomies = ['industrial', 'extraction', 'refinery'] as (keyof EconomyMap)[];
  for (const key of reserveSensitiveEconomies) {
    if (map[key] > 0) {
      if (reserveLevel === 'major' || reserveLevel === 'pristine') {
        // this is a dirty hack to prevent refinery from over applying :(
        if (key === 'refinery' && site.body?.type !== BT.rb && site.type.inf === 'colony' && !useNewModel) {
          continue;
        }

        // If the System has Major or Pristine Resources (+0.40) for Industrial, Extraction and Refinery
        adjust(key, +0.4, 'Buff: reserveLevel MAJOR or PRISTINE', map, site, 'sys');
      } else if ((reserveLevel === 'low' || reserveLevel === 'depleted') && !isSettlement) {
        // If the System has Low or Depleted Resources (-0.40) for Industrial, Extraction and Refinery
        adjust(key, -0.4, 'Buff: reserveLevel LOW or DEPLETED', map, site, 'sys');
      }
    }
  }

  if (map.agriculture > 0) {
    let buffed = false;
    if (matches([BodyFeature.bio, BodyFeature.terraformable], site.body?.features)) {// && (!isSettlement || !debuff)) {
      // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
      adjust('agriculture', +0.4, 'Buff: body has BIO or TERRAFORMABLE', map, site, 'body');
      buffed = true;
    }

    // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
    // If the Body is a Water World (+0.40) for Tourism and Agriculture
    else if (matches([BT.elw, BT.ww], site.body?.type)) {
      adjust('agriculture', +0.4, 'Buff: body is ELW or WW', map, site, 'body');
    }

    if ((matches([BT.ib], site.body?.type) || bodyIsTidalToStar(site.sys, site.body)) && (!isSettlement || buffed)) {
      // If the Body is an Icy World (-0.40) for Agriculture - Icy World only, does not include Rocky Ice
      // If the Body is Tidally Locked (-0.40) for Agriculture
      adjust('agriculture', -0.4, 'Buff: body is ICY or has TIDAL', map, site, 'body');
    }
  }

  if (map.hightech > 0) {
    if (isSettlement && useNewModel) {
      // Allow high-tech body features to stack on Odyssey settlements
      if (matches([BodyFeature.bio], site.body?.features)) {
        // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
        // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
        adjust('hightech', +0.4, 'Buff: body has BIO', map, site, 'body');
      }
      if (matches([BodyFeature.geo], site.body?.features)) {
        // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
        // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
        adjust('hightech', +0.4, 'Buff: body has GEO', map, site, 'body');
      }
      if (matches([BT.elw, BT.aw], site.body?.type)) {
        // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
        // If the Body is an Ammonia World (+0.40) for High Tech and Tourism
        adjust('hightech', +0.4, 'Buff: body is ELW or AW', map, site, 'body');
      }
    } else {
      if (matches([BodyFeature.bio, BodyFeature.geo], site.body?.features)) {
        // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
        // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
        adjust('hightech', +0.4, 'Buff: body has BIO or GEO', map, site, 'body');
      } else if (matches([BT.elw, BT.aw], site.body?.type)) {
        // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
        // If the Body is an Ammonia World (+0.40) for High Tech and Tourism
        adjust('hightech', +0.4, 'Buff: body is ELW or AW', map, site, 'body');
      }
    }
  }

  if (map.extraction > 0) {
    if (matches([BodyFeature.volcanism], site.body?.features)) { // maybe ??? && (!isC2C || !site.bodyBuffed?.has('extraction')) // && !site.bodyBuffed?.has('extraction')
      // If the Body has Volcanism (+0.40) for Extraction - the type of Volcanism doesn't matter
      adjust('extraction', +0.4, 'Buff: body has VOLCANISM', map, site, 'body');
    }
  }

  if (map.tourism > 0) {
    if (!site.systemBuffed?.has('tourism') && site.sys.bodies.some(b => stellarRemnants.includes(b.type))) {
      // If the System has a Black Hole / Neutron Star / White Dwarf (+0.40*) for Tourism
      adjust('tourism', +0.4, 'Buff: system has Black Hole or Neutron Star or White Dwarf', map, site, 'sys');
    }
    if (!site.bodyBuffed?.has('tourism')) {
      if (matches([BodyFeature.bio, BodyFeature.geo], site.body?.features)) {
        // If the Body has Organics (also known as Biologicals) (+0.40) for High Tech, Tourism and Agriculture - the type of Organics doesn't matter
        // If the Body has Geologicals (+0.40) for High Tech and Tourism - the type of Geologicals doesn't matter
        adjust('tourism', +0.4, 'Buff: body has BIO or GEO', map, site, 'body');
      } else if (matches([BT.elw, BT.ww, BT.aw], site.body?.type)) {
        // If the Body is an Earth Like World (+0.40) for High Tech, Tourism and Agriculture
        // If the Body is a Water World (+0.40) for Tourism and Agriculture
        // If the Body is an Ammonia World (+0.40) for High Tech and Tourism
        adjust('tourism', +0.4, 'Buff: body is ELW or WW or AW', map, site, 'body');
      }
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
        // apply one weak link per intrinsic economy
        for (const instrinsicInf of s.intrinsic ?? []) {
          adjust(instrinsicInf, +0.05, `Apply weak link from: ${s.name} (intrinsic)`, map, site);
        }
        continue;
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

const matches = <T>(listRequired: T[], check: T | T[] | undefined, avoid?: T[]) => {
  if (check) {
    const listCheck = Array.isArray(check) ? check : [check];
    return listRequired.some(item => listCheck.includes(item) && avoid?.includes(item) !== true);
  }
  else {
    return false;
  }
}

const bodyIsTidalToStar = (sys: SysMap2, body: Bod | undefined, parents?: number[]): boolean => {

  if (!parents) {
    parents = [...body?.parents ?? []];
  }

  // stop if this body is not tidally locked (but bypass Barycenters)
  if (!body?.features?.includes(BodyFeature.tidal) && body?.type !== BT.bc) {
    return false;
  }

  // otherwise recurse up parents until we reach a star
  let parentNum = parents.shift();
  let parentBody = sys.bodies.find(b => b.num === parentNum);
  if (!parentBody) {
    if (parentNum === 0) {
      return false; // reached the system barycenter? no star found
    } else {
      console.error(`Why no parent bodyNum: #${parentNum} for: ${body.name}`);
      return false;
    }
  }

  // if body is a star - return TRUE say yes as we recursed here
  if (matches([...stellarRemnants, BT.st], parentBody.type)) {
    return true;
  }

  // if (parentBody.type === BT.bc) {
  //   /* TODO: Implement this ...
  //     - If **immediate** parent is a barycenter: apply penalty only if sibling is a star
  //       - If sibling is not a star: do not walk parent chain, do not apply penalty
  //     - If barycenter encountered in parent chain: apply no penalty
  //   */
  //   console.log(`TODO: fully implement barycenters: ${body.name}`);
  //   return false;
  // }

  return bodyIsTidalToStar(sys, parentBody, parents);
}