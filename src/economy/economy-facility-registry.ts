import { ConcreteEconomy, Economy, EconomyMap, getSiteType, siteTypes } from "../site-data";
import { SiteMap2 } from "./system-model2";
import { BT } from "../types2";

export const OPERATIONAL_MARKET_ID_MIN = 4_200_000_001;

const COMMS_BUILD_TYPES = new Set(["aletheia", "pistis", "soter"]);

/** Player-built station marketIds (includes pre-operational 395–397 journal IDs). */
export const isPlayerMadeMarketId = (marketId: number): boolean => {
  const s = String(marketId);
  return (
    s.startsWith("395") ||
    s.startsWith("396") ||
    s.startsWith("397") ||
    s.startsWith("42") ||
    s.startsWith("43")
  );
};

const commsSiteQualifiesForAthena = (s: SiteMap2, calcIds?: string[]): boolean => {
  if (!COMMS_BUILD_TYPES.has(s.buildType) || s.status === "demolish") {
    return false;
  }
  if (calcIds?.length && !calcIds.includes(s.id)) {
    return false;
  }
  if (s.status === "complete") {
    const mid = s.marketId ?? 0;
    return mid >= OPERATIONAL_MARKET_ID_MIN || isPlayerMadeMarketId(mid);
  }
  if (s.status === "plan" || s.status === "build") {
    return !!calcIds?.includes(s.id);
  }
  return false;
};

const allSiteMapsInSystem = (site: SiteMap2): SiteMap2[] => {
  if (site.sys.siteMaps?.length) {
    return site.sys.siteMaps;
  }
  if (site.sys.bodyMap) {
    return Object.values(site.sys.bodyMap).flatMap(b => b.sites);
  }
  return site.body?.sites ?? [];
};

/** Body nums to search: host plus ancestors from `body.parents` chains. */
const collectAthenaCommsSearchBodyNums = (site: SiteMap2): number[] => {
  const seen = new Set<number>();
  const out: number[] = [];
  const queue: number[] = [];

  if (site.body) {
    queue.push(site.body.num);
    if (site.body.parents?.length) {
      queue.push(...site.body.parents);
    }
  }

  while (queue.length > 0) {
    const num = queue.shift()!;
    if (seen.has(num)) {
      continue;
    }
    seen.add(num);
    out.push(num);
    const raw = site.sys.bodies.find(b => b.num === num);
    if (raw?.parents?.length) {
      queue.push(...raw.parents);
    }
  }

  return out;
};

/**
 * True when completed (or planned) comms exists on the athena host or an ancestor body.
 * Comms often uses 396* marketIds; moons inherit from parent gas giant / star bodies.
 */
export const bodyHasOperationalCommsForAthena = (site: SiteMap2, calcIds?: string[]): boolean => {
  const siteMaps = allSiteMapsInSystem(site);
  return collectAthenaCommsSearchBodyNums(site).some(bodyNum =>
    siteMaps
      .filter(s => s.bodyNum === bodyNum)
      .some(s => commsSiteQualifiesForAthena(s, calcIds)),
  );
};

/** 140% hightech when comms qualifies; star-primary HMC athena hosts stay 100%. */
export const getAthenaHightechIntrinsic = (site: SiteMap2, calcIds?: string[]): number => {
  if (!bodyHasOperationalCommsForAthena(site, calcIds)) {
    return 1.0;
  }
  const parentNum = site.body?.parents?.[0];
  const parent = parentNum != null ? site.sys.bodies.find(b => b.num === parentNum) : undefined;
  if (site.body?.type === BT.hmc && parent?.type === BT.st) {
    return 1.0;
  }
  return 1.4;
};

/** How a hub/installation intrinsic is determined (1.0 = 100% market strength). */
export type FacilityRegistryEntry =
  | {
      kind: "linkOnly";
      /** External snapshots usually report no economy object for these. */
      notes?: string;
    }
  | {
      kind: "fixed";
      intrinsic: number;
      /** RC `type.inf` this applies to */
      economy: ConcreteEconomy;
      notes?: string;
      /** Systems / sample counts used when calibrating (dev registry audit). */
      evidence?: { samples: number; spanshPercents: number[]; systems?: string[] };
    }
  | {
      kind: "athenaComms";
      economy: "hightech";
      withoutComms: number;
      withOperationalComms: number;
      notes?: string;
      evidence?: { samples: number; spanshPercents: number[]; systems?: string[] };
    };

export const FACILITY_BUILD_TYPES: string[] = siteTypes
  .filter(t => t.buildClass === "hub" || t.buildClass === "installation")
  .flatMap(t => [...t.subTypes, ...(t.altTypes ?? [])]);

const entryForBuildType = (buildType: string): FacilityRegistryEntry | undefined => {
  const type = getSiteType(buildType, true);
  if (!type || (type.buildClass !== "hub" && type.buildClass !== "installation")) {
    return undefined;
  }
  return FACILITY_ECONOMY_REGISTRY[buildType];
};

/**
 * Facility economy registry — fixed intrinsics, link-only hubs, and athena comms rules.
 * Harvest maintenance: see local/docs/facility-economy-registry.md (not in git).
 */
export const FACILITY_ECONOMY_REGISTRY: Record<string, FacilityRegistryEntry> = {
  // --- Installations: link-only (inf none) ---
  angelia: { kind: "linkOnly", notes: "Satellite; unlocks only" },
  eirene: { kind: "linkOnly", notes: "Satellite" },
  hermes: { kind: "linkOnly", notes: "Satellite" },
  aletheia: { kind: "linkOnly", notes: "Comms; unlocks athena 140% / UC" },
  pistis: { kind: "linkOnly", notes: "Comms variant" },
  soter: { kind: "linkOnly", notes: "Comms variant" },
  harmonia: { kind: "linkOnly", notes: "Government" },

  // --- Hubs: link-only ---
  aegle: {
    kind: "linkOnly",
    notes: "RC inf none; observed markets once showed refinery 140% (verify buildType match)",
  },
  io: {
    kind: "linkOnly",
    notes: "RC inf none; observed markets once showed military 100%",
  },

  // --- Installations: fixed intrinsics (default 100% until evidence overrides) ---
  demeter: {
    kind: "fixed",
    economy: "agriculture",
    intrinsic: 1.0,
    notes: "Space farm; strong-link source for ports",
  },
  apate: { kind: "fixed", economy: "service", intrinsic: 1.0 },
  laverna: { kind: "fixed", economy: "service", intrinsic: 1.0 },
  euthenia: { kind: "fixed", economy: "extraction", intrinsic: 1.0 },
  phorcys: { kind: "fixed", economy: "extraction", intrinsic: 1.0 },
  enodia: { kind: "fixed", economy: "hightech", intrinsic: 1.0 },
  ichnaea: { kind: "fixed", economy: "hightech", intrinsic: 1.0 },
  alastor: { kind: "fixed", economy: "military", intrinsic: 1.0 },
  vacuna: { kind: "fixed", economy: "military", intrinsic: 1.0 },
  dicaeosyne: { kind: "fixed", economy: "military", intrinsic: 1.0 },
  eunomia: { kind: "fixed", economy: "military", intrinsic: 1.0 },
  nomos: { kind: "fixed", economy: "military", intrinsic: 1.0 },
  poena: { kind: "fixed", economy: "military", intrinsic: 1.0 },
  asclepius: { kind: "fixed", economy: "hightech", intrinsic: 1.0 },
  eupraxia: { kind: "fixed", economy: "hightech", intrinsic: 1.0 },
  astraeus: { kind: "fixed", economy: "hightech", intrinsic: 1.0 },
  coeus: { kind: "fixed", economy: "hightech", intrinsic: 1.0 },
  dione: { kind: "fixed", economy: "hightech", intrinsic: 1.0 },
  dodona: { kind: "fixed", economy: "hightech", intrinsic: 1.0 },
  hedone: { kind: "fixed", economy: "tourism", intrinsic: 1.0 },
  opora: { kind: "fixed", economy: "tourism", intrinsic: 1.0 },
  pasithea: { kind: "fixed", economy: "tourism", intrinsic: 1.0 },
  bacchus: { kind: "fixed", economy: "tourism", intrinsic: 1.0 },
  dionysus: { kind: "fixed", economy: "tourism", intrinsic: 1.0 },

  // --- Hubs: fixed / conditional ---
  athena: {
    kind: "athenaComms",
    economy: "hightech",
    withoutComms: 1.0,
    withOperationalComms: 1.4,
    notes: "Scientific hub; 140% when operational comms qualifies. Undockable — external compare often stale.",
    evidence: {
      samples: 36,
      spanshPercents: [100, 140],
    },
  },
  caelus: {
    kind: "fixed",
    economy: "hightech",
    intrinsic: 1.0,
    evidence: { samples: 1, spanshPercents: [100] },
  },
  tartarus: { kind: "fixed", economy: "extraction", intrinsic: 1.0 },
  tellus_e: { kind: "fixed", economy: "tourism", intrinsic: 1.0 },
  alala: { kind: "fixed", economy: "military", intrinsic: 1.0 },
  ares: { kind: "fixed", economy: "military", intrinsic: 1.0 },
  janus: { kind: "fixed", economy: "hightech", intrinsic: 1.0 },
  eunostus: {
    kind: "fixed",
    economy: "industrial",
    intrinsic: 1.4,
    evidence: { samples: 1, spanshPercents: [140] },
  },
  molae: { kind: "fixed", economy: "industrial", intrinsic: 1.0 },
  tellus_i: { kind: "fixed", economy: "industrial", intrinsic: 1.0 },
  tellus: { kind: "fixed", economy: "industrial", intrinsic: 1.0 },
  silenus: {
    kind: "fixed",
    economy: "refinery",
    intrinsic: 1.0,
    notes: "Observed samples had empty economy payloads; default 100% until confirmed",
  },
};

export interface FacilityRegistryTableRow {
  buildType: string;
  buildClass: string;
  inf: string;
  rule: string;
  modelRange: string;
  samples: number | null;
  spanshObserved: string;
  notes: string;
}

export const buildFacilityRegistryTable = (): FacilityRegistryTableRow[] => {
  const rows: FacilityRegistryTableRow[] = [];

  for (const buildType of FACILITY_BUILD_TYPES) {
    const type = getSiteType(buildType, true);
    if (!type) continue;

    const entry = FACILITY_ECONOMY_REGISTRY[buildType];
    let rule = "—";
    let modelRange = "—";
    let samples: number | null = null;
    let spanshObserved = "—";
    let notes = "";

    if (entry) {
      notes = entry.notes ?? "";
      if ("evidence" in entry && entry.evidence) {
        samples = entry.evidence.samples;
        const p = entry.evidence.spanshPercents;
        spanshObserved = p?.length ? `${Math.min(...p)}–${Math.max(...p)}%` : "—";
      }
      switch (entry.kind) {
        case "linkOnly":
          rule = "linkOnly";
          modelRange = "(no economy %)";
          break;
        case "fixed":
          rule = "fixed";
          modelRange = `${Math.round(entry.intrinsic * 100)}% ${entry.economy}`;
          break;
        case "athenaComms":
          rule = "athenaComms";
          modelRange = `${Math.round(entry.withoutComms * 100)}% / ${Math.round(entry.withOperationalComms * 100)}% ${entry.economy}`;
          break;
      }
    } else {
      rule = "MISSING";
    }

    rows.push({
      buildType,
      buildClass: type.buildClass,
      inf: type.inf,
      rule,
      modelRange,
      samples,
      spanshObserved,
      notes,
    });
  }

  return rows.sort((a, b) => a.buildClass.localeCompare(b.buildClass) || a.buildType.localeCompare(b.buildType));
};

/** Ensure every hub/installation subtype has a registry row. */
export const assertFacilityRegistryComplete = (): string[] => {
  const missing: string[] = [];
  for (const bt of FACILITY_BUILD_TYPES) {
    if (!FACILITY_ECONOMY_REGISTRY[bt]) {
      missing.push(bt);
    }
  }
  return missing;
};

export const getFacilityRegistryEntry = (buildType: string): FacilityRegistryEntry | undefined =>
  entryForBuildType(buildType);

export const resolveFacilityIntrinsicFromRegistry = (
  site: SiteMap2,
  calcIds?: string[],
): number => {
  const entry = getFacilityRegistryEntry(site.buildType);
  const inf = site.type.inf;

  if (inf === "none" || !entry) {
    return 0;
  }

  switch (entry.kind) {
    case "linkOnly":
      return 0;
    case "fixed":
      if (entry.economy !== inf) {
        return entry.intrinsic;
      }
      return entry.intrinsic;
    case "athenaComms":
      return getAthenaHightechIntrinsic(site, calcIds);
    default:
      return 1.0;
  }
};

export type EconomicInfSummary = {
  percentLabel: string;
  note?: string;
};

const noteForAthenaComms = (site: SiteMap2, percent: number): string | undefined => {
  if (percent >= 140) {
    return "Operational comms on this body or a parent body";
  }
  if (bodyHasOperationalCommsForAthena(site)) {
    return "Comms present; this hub body type stays at 100% High Tech";
  }
  return "Operational comms (aletheia, pistis, or soter) on this body or a parent raises High Tech to 140%";
};

/** UI copy for BuildEffects “Economic inf” row (hubs, installations, fixed ports). */
export const summarizeEconomicInfForBuild = (
  buildType: string,
  inf: Economy,
  site?: SiteMap2,
  fixed?: Economy,
): EconomicInfSummary => {
  if (inf === "none" || inf === "colony") {
    return { percentLabel: "" };
  }

  const fromCalculated = (): EconomicInfSummary | undefined => {
    if (!site?.economies) {
      return undefined;
    }
    const raw = site.economies[inf as keyof EconomyMap];
    if (!(raw > 0)) {
      return undefined;
    }
    const percent = Math.round(raw * 100);
    const entry = getFacilityRegistryEntry(buildType);
    let note: string | undefined;
    if (entry?.kind === "athenaComms") {
      note = noteForAthenaComms(site, percent);
    } else if (entry?.kind === "fixed" && entry.notes) {
      note = entry.notes;
    } else if (fixed === inf) {
      note = "Fixed specialized port economy";
    }
    return { percentLabel: `${percent}%`, note };
  };

  const calculated = fromCalculated();
  if (calculated) {
    return calculated;
  }

  const entry = getFacilityRegistryEntry(buildType);
  if (entry?.kind === "fixed" && entry.economy === inf) {
    const intrinsic = site ? resolveFacilityIntrinsicFromRegistry(site) : entry.intrinsic;
    const percent = Math.round(intrinsic * 100);
    return { percentLabel: `${percent}%`, note: entry.notes };
  }
  if (entry?.kind === "athenaComms" && inf === "hightech") {
    if (site) {
      const percent = Math.round(resolveFacilityIntrinsicFromRegistry(site) * 100);
      return { percentLabel: `${percent}%`, note: noteForAthenaComms(site, percent) };
    }
    return {
      percentLabel: `${Math.round(entry.withoutComms * 100)}–${Math.round(entry.withOperationalComms * 100)}%`,
      note: entry.notes ?? "140% when operational comms on this body or a parent body",
    };
  }

  if (fixed === inf) {
    return { percentLabel: "100%", note: "Fixed specialized port economy" };
  }

  return { percentLabel: "" };
};

export const describeFacilityRegistryEntry = (buildType: string): string => {
  const entry = getFacilityRegistryEntry(buildType);
  const type = getSiteType(buildType, true);
  if (!entry) {
    return `${buildType}: (no registry row)`;
  }
  if (!type) {
    return `${buildType}: unknown type`;
  }
  switch (entry.kind) {
    case "linkOnly":
      return `${buildType}: link-only (${type.displayName})`;
    case "fixed":
      return `${buildType}: ${Math.round(entry.intrinsic * 100)}% ${entry.economy}`;
    case "athenaComms":
      return `${buildType}: ${Math.round(entry.withoutComms * 100)}–${Math.round(entry.withOperationalComms * 100)}% ${entry.economy}`;
    default:
      return buildType;
  }
};
