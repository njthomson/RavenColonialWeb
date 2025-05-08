
export type Economy =
  | 'agriculture'
  | 'contraband'
  | 'extraction'
  | 'hightech'
  | 'industrial'
  | 'military'
  | 'none'
  | 'tourism'
  | 'refinery'
  ;

export type BuildClass =
  | 'port'
  | 'installation'
  | 'outpost'
  | 'settlement'
  | 'hub'
  ;

export type PadSize =
  | 'none'
  | 'small'
  | 'medium'
  | 'large'
  ;

export interface SiteType {
  /** Display name for group */
  displayName: string;

  /** Subtypes, eg: vulcan, coriolis, consus */
  subTypes: string[];

  /** Classification, eg: outpost, installation, settlement, port */
  buildClass: BuildClass;

  /** What tier this is */
  tier: number;

  /** Largest pad size */
  padSize: PadSize;

  /** Is an orbital or surface site */
  orbital: Boolean;

  /** System influence */
  inf: Economy;

  /** Needed to start construction */
  needs: {
    tier: number;
    count: number;
  }

  /** Provided once construction completes */
  gives: {
    tier: number;
    count: number;
  }

  /** Effects upon the system */
  effects: SysEffects,
}

export const mapName: Record<string, string> = {
  // Effect key names
  pop: "Population",
  mpop: "Max population",
  sec: "Security",
  wealth: "Wealth",
  tech: "Tech level",
  dev: "Development level",
  sol: "Standard of living",

  // Economies
  agriculture: 'Agriculture',
  contraband: 'Contrabandx',
  extraction: 'Extraction',
  hightech: 'High Tech',
  industrial: 'Industrial',
  military: 'Military',
  none: 'None',
  tourism: 'Tourism',
  refinery: 'Refinery',
};

export interface SysEffects {
  pop?: number;
  mpop?: number;
  sec?: number;
  tech?: number;
  wealth?: number;
  sol?: number;
  dev?: number;
}

export const sysEffects: (keyof SysEffects)[] = [
  'pop',
  'mpop',
  'sec',
  'tech',
  'wealth',
  'sol',
  'dev',
];

export const economyColors: Record<string, string> = {
  agriculture: 'rgb(104,204,0)',
  contraband: 'rgb(255,000,000)', // TODO
  extraction: 'rgb(207,1,0)',
  hightech: 'rgb(4,205,204)',
  industrial: 'rgb(207, 205, 0)',
  military: 'rgb(183,0,183)',
  tourism: 'rgb(000,255,000)', // TODO
  refinery: 'rgb(208,103,9)',
}


export const getSiteType = (buildType: string): SiteType => {
  const match = siteTypes.find(st => st.subTypes.includes(buildType));
  if (!match) {
    console.error(`No SiteType match found for: '${buildType}'`);
    throw new Error(`No SiteType match found for: '${buildType}'`)
  }
  return match;
};

export const canReceiveLinks = (type: SiteType): boolean => {

  // star ports and orbital outposts can receive links
  if (type.buildClass === 'port') {
    return true;
  } else if (type.buildClass === 'outpost' && type.orbital) {
    return true;
  }
  return false;
};

export const sumEconomies = (economies: string[]): Record<string, number> => {

  const map = economies.reduce((map, econ) => {
    if (econ !== 'none') {
      map[econ] = (map[econ] ?? 0) + 1;
    }
    return map;
  }, {} as Record<string, number>)

  return map;
}


export const siteTypes: SiteType[] = [
  {
    "displayName": "Coriolis",
    "subTypes": ["no truss", "dual_truss", "quad_truss", "coriolis", "no_truss"],
    "buildClass": "port",
    "tier": 2,
    "padSize": "large",
    "orbital": true,
    "needs": { tier: 2, count: 3 },
    "gives": { tier: 3, count: 1 },
    "inf": "none",
    "effects": { pop: 1, mpop: 1, sec: -2, wealth: 3, tech: 2, sol: 3, dev: 3 }
  },
  {
    "displayName": "Asteroid",
    "subTypes": ["asteroid"],
    "buildClass": "port",
    "tier": 2,
    "padSize": "large",
    "orbital": true,
    "needs": { tier: 2, count: 3 },
    "gives": { tier: 3, count: 1 },
    "inf": "extraction",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 5, tech: 3, sol: -4, dev: 7 }
  },
  {
    "displayName": "Ocellus",
    "subTypes": ["ocellus"],
    "buildClass": "port",
    "tier": 3,
    "padSize": "large",
    "orbital": true,
    "needs": { tier: 3, count: 6 },
    "gives": { tier: 0, count: 0 },
    "inf": "none",
    "effects": { pop: 5, mpop: 1, sec: -3, wealth: 8, tech: 6, sol: 5, dev: 9 }
  },
  {
    "displayName": "Orbis",
    "subTypes": ["apollo", "artemis"],
    "buildClass": "port",
    "tier": 3,
    "padSize": "large",
    "orbital": true,
    "needs": { tier: 3, count: 6 },
    "gives": { tier: 0, count: 0 },
    "inf": "none",
    "effects": { pop: 5, mpop: 1, sec: -3, wealth: 8, tech: 7, sol: 5, dev: 9 }
  },
  {
    "displayName": "Commercial",
    "subTypes": ["plutus"],
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "none",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 3, tech: 0, sol: 5, dev: 0 }
  },
  {
    "displayName": "Industrial",
    "subTypes": ["vulcan"],
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "industrial",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 3, sol: 0, dev: 3 }
  },
  {
    "displayName": "Pirate",
    "subTypes": ["dysnomia"],
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "contraband",
    "effects": { pop: 1, mpop: 1, sec: -2, wealth: 3, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Civilian",
    "subTypes": ["vesta"],
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "none",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 1, tech: 0, sol: 2, dev: 1 }
  },
  {
    "displayName": "Scientific",
    "subTypes": ["prometheus"],
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "hightech",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 3, sol: 0, dev: 0 }
  },
  {
    "displayName": "Military",
    "subTypes": ["nemesis"],
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "military",
    "effects": { pop: 1, mpop: 1, sec: 2, wealth: 0, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Satellite",
    "subTypes": ["hermes", "angelia", "eirene"],
    "buildClass": "installation",
    "tier": 1,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "none",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 1, tech: 0, sol: 2, dev: 1 }
  },
  {
    "displayName": "Communication",
    "subTypes": ["pistis", "soter", "aletheia"],
    "buildClass": "installation",
    "tier": 1,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "none",
    "effects": { pop: 0, mpop: 0, sec: 1, wealth: 0, tech: 3, sol: 0, dev: 0 }
  },
  {
    "displayName": "Agricultural",
    "subTypes": ["demeter"],
    "buildClass": "installation",
    "tier": 1,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "agriculture",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 0, tech: 0, sol: 5, dev: 1 }
  },
  {
    "displayName": "Pirate Base",
    "subTypes": ["apate", "laverna"],
    "buildClass": "installation",
    "tier": 1,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "contraband",
    "effects": { pop: 0, mpop: 0, sec: -4, wealth: 4, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Mining/Industrial",
    "subTypes": ["euthenia", "phorcys"],
    "buildClass": "installation",
    "tier": 1,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "extraction",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 4, tech: 0, sol: -2, dev: 0 }
  },
  {
    "displayName": "Relay",
    "subTypes": ["enodia", "ichnaea"],
    "buildClass": "installation",
    "tier": 1,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "hightech",
    "effects": { pop: 0, mpop: 0, sec: 1, wealth: 0, tech: 0, sol: 0, dev: 1 }
  },
  {
    "displayName": "Military",
    "subTypes": ["vacuna", "alastor"],
    "buildClass": "installation",
    "tier": 2,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "military",
    "effects": { pop: 0, mpop: 0, sec: 7, wealth: 0, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Security",
    "subTypes": ["dicaeosyne", "poena", "eunomia", "nomos"],
    "buildClass": "installation",
    "tier": 2,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "military",
    "effects": { pop: 0, mpop: 0, sec: 9, wealth: 0, tech: 0, sol: 3, dev: 3 }
  },
  {
    "displayName": "Government",
    "subTypes": ["harmonia"],
    "buildClass": "installation",
    "tier": 2,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "none",
    "effects": { pop: 0, mpop: 0, sec: 2, wealth: 0, tech: 0, sol: 7, dev: 3 }
  },
  {
    "displayName": "Medical",
    "subTypes": ["asclepius", "eupraxia"],
    "buildClass": "installation",
    "tier": 2,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "hightech",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 0, tech: 3, sol: 5, dev: 0 }
  },
  {
    "displayName": "Research",
    "subTypes": ["astraeus", "coeus", "dodona", "dione"],
    "buildClass": "installation",
    "tier": 2,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "hightech",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 0, tech: 8, sol: 0, dev: 3 }
  },
  {
    "displayName": "Tourist",
    "subTypes": ["hedone", "opora", "pasithea"],
    "buildClass": "installation",
    "tier": 2,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "tourism",
    "effects": { pop: 0, mpop: 0, sec: -3, wealth: 6, tech: 0, sol: 0, dev: 3 }
  },
  {
    "displayName": "Bar",
    "subTypes": ["dionysus", "bacchus"],
    "buildClass": "installation",
    "tier": 2,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "tourism",
    "effects": { pop: 0, mpop: 0, sec: -2, wealth: 3, tech: 0, sol: 3, dev: 0 }
  },
  {
    "displayName": "Civilian",
    "subTypes": ["hestia", "decima", "atropos", "nona", "lachesis", "clotho"],
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "none",
    "effects": { pop: 2, mpop: 1, sec: -2, wealth: 0, tech: 0, sol: 3, dev: 0 }
  },
  {
    "displayName": "Industrial",
    "subTypes": ["hephaestus", "opis", "ponos", "tethys", "bia", "mefitis"],
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "industrial",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 3, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Scientific",
    "subTypes": ["necessitas", "ananke", "fauna", "providentia", "antevorta", "porrima"],
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "hightech",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 0, tech: 5, sol: 0, dev: 1 }
  },
  {
    "displayName": "Large",
    "subTypes": ["zeus", "hera", "poseidon", "aphrodite"],
    "buildClass": "port",
    "tier": 3,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 3, count: 6 },
    "gives": { tier: 0, count: 0 },
    "inf": "none",
    "effects": { pop: 10, mpop: 10, sec: -3, wealth: 5, tech: 5, sol: 7, dev: 10 }
  },
  {
    "displayName": "Small Agriculture",
    "subTypes": ["consus"],
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "small",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "agriculture",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 0, sol: 3, dev: 0 }
  },
  {
    "displayName": "Medium Agriculture",
    "subTypes": ["picumnus", "annona"],
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "agriculture",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 0, sol: 7, dev: 0 }
  },
  {
    "displayName": "Large Agriculture",
    "subTypes": ["ceres", "fornax"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 2 },
    "inf": "agriculture",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 0, sol: 10, dev: 0 }
  },
  {
    "displayName": "Small Mining",
    "subTypes": ["ourea"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "small",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "extraction",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 3, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Medium Mining",
    "subTypes": ["mantus", "orcus"],
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "medium",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "extraction",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 5, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Large Mining",
    "subTypes": ["erebus", "aerecura"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 2 },
    "inf": "extraction",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 8, tech: 2, sol: -2, dev: 0 }
  },
  {
    "displayName": "Small Industrial",
    "subTypes": ["fontus"],
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "small",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "industrial",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 0, sol: 0, dev: 3 }
  },
  {
    "displayName": "Medium Industrial",
    "subTypes": ["metope", "palici", "minthe"],
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "industrial",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 0, sol: 0, dev: 6 }
  },
  {
    "displayName": "Large Industrial",
    "subTypes": ["gaea"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 2 },
    "inf": "industrial",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 3, tech: 0, sol: 0, dev: 9 }
  },
  {
    "displayName": "Small Military",
    "subTypes": ["ioke"],
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "medium",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "military",
    "effects": { pop: 1, mpop: 1, sec: 2, wealth: 0, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Medium Military",
    "subTypes": ["bellona", "enyo", "polemos"],
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "small",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "military",
    "effects": { pop: 1, mpop: 1, sec: 4, wealth: 0, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Large Military",
    "subTypes": ["minerva"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 2 },
    "inf": "military",
    "effects": { pop: 1, mpop: 1, sec: 7, wealth: 0, tech: 0, sol: 0, dev: 3 }
  },
  {
    "displayName": "Small Bio",
    "subTypes": ["pheobe"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "small",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "hightech",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 3, sol: 0, dev: 1 }
  },
  {
    "displayName": "Medium Bio",
    "subTypes": ["asteria", "caerus"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "small",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "hightech",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 7, sol: 0, dev: 1 }
  },
  {
    "displayName": "Large Bio",
    "subTypes": ["chronos"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 2 },
    "inf": "hightech",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 10, sol: 0, dev: 3 }
  },
  {
    "displayName": "Small Tourist",
    "subTypes": ["aergia"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "medium",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "tourism",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 1, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Medium Tourist",
    "subTypes": ["comus", "gelos"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "tourism",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 3, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Large Tourist",
    "subTypes": ["fufluns"],
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 2 },
    "inf": "tourism",
    "effects": { pop: 1, mpop: 1, sec: -2, wealth: 5, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Extraction",
    "subTypes": ["tartarus"],
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "extraction",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 10, tech: 0, sol: -4, dev: 3 }
  },
  {
    "displayName": "Civilian",
    "subTypes": ["aegle"],
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "none",
    "effects": { pop: 0, mpop: 0, sec: -3, wealth: 0, tech: 0, sol: 3, dev: 3 }
  },
  {
    "displayName": "Exploration",
    "subTypes": ["tellus_e"],
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "tourism",
    "effects": { pop: 0, mpop: 0, sec: -1, wealth: 0, tech: 7, sol: 0, dev: 3 }
  },
  {
    "displayName": "Outpost",
    "subTypes": ["io"],
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "none",
    "effects": { pop: 0, mpop: 0, sec: -2, wealth: 0, tech: 0, sol: 3, dev: 3 }
  },
  {
    "displayName": "Scientific",
    "subTypes": ["athena", "caelus"],
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "hightech",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 0, tech: 10, sol: 0, dev: 0 }
  },
  {
    "displayName": "Military",
    "subTypes": ["alala", "ares"],
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "military",
    "effects": { pop: 0, mpop: 0, sec: 10, wealth: 0, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Refinery",
    "subTypes": ["silenus"],
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "refinery",
    "effects": { pop: 0, mpop: 0, sec: -1, wealth: 5, tech: 3, sol: -2, dev: 7 }
  },
  {
    "displayName": "High Tech",
    "subTypes": ["janus"],
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "hightech",
    "effects": { pop: 0, mpop: 0, sec: -2, wealth: 3, tech: 10, sol: 0, dev: 0 }
  },
  {
    "displayName": "Industrial",
    "subTypes": ["molae", "tellus_i", "eunostus"],
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "industrial",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 5, tech: 3, sol: -4, dev: 3 }
  }
];