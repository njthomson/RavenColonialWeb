
export type Economy =
  | 'agriculture'
  | 'service'
  | 'extraction'
  | 'hightech'
  | 'industrial'
  | 'military'
  | 'none'
  | 'tourism'
  | 'refinery'
  | 'colony'
  | 'terraforming'
  ;

export type BuildClass =
  | 'starport'
  | 'installation'
  | 'outpost'
  | 'settlement'
  | 'hub'
  | 'unknown'
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

  /** Display name for group in large grid */
  displayName2: string;

  /** Subtypes, eg: vulcan, coriolis, consus */
  subTypes: string[];

  /** Alternative Subtypes, to match old typo's, etc*/
  altTypes?: string[];

  /** Approx count of stuff to be hauled to build */
  haul: number;

  /** Classification, eg: outpost, installation, settlement, port */
  buildClass: BuildClass;

  /** What tier this is */
  tier: number;

  /** Largest pad size */
  padSize: PadSize;

  /** Specific pad sizes mapped to subTypes */
  padMap?: Record<string, PadSize>;

  /** Is an orbital or surface site */
  orbital: boolean;

  /** System ecomomic influence */
  inf: Economy;

  /** Fixed/specialized station economy */
  fixed?: Economy;

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
  effects: SysEffects;

  preReq?: 'satellite' | 'comms' | 'settlementAgr' | 'installationAgr' | 'installationMil' | 'outpostMining' | 'relay' | 'settlementBio' | 'settlementTourism';
}

export const mapName: Record<string, string> = {
  port: "Star port",
  planetary: 'Planetary port',

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
  contraband: 'Service',
  service: 'Service',
  extraction: 'Extraction',
  hightech: 'High Tech',
  industrial: 'Industrial',
  military: 'Military',
  none: 'None',
  tourism: 'Tourism',
  refinery: 'Refinery',
  'not/agri': 'Not Agriculture',
  'industrial/surface': 'Industrial (Surface)',
  'hightech/surface': 'High Tech (Surface)',
  'refinery/surface': 'Refinery (Surface)',
  terraforming: 'Terraforming',
  'near/akhenaten': 'High Tech or Industrial near Akhenaten',
  colony: 'Colony',

  // pre-req explanations
  satellite: 'a satellite installation',
  comms: 'a communications installation',
  settlementAgr: 'an agricultural settlement',
  installationAgr: 'a space farm',
  installationMil: 'a military installation',
  outpostMining: 'a mining outpost installation',
  relay: 'a relay installation',
  settlementBio: 'a bio research settlement',
  settlementTourism: 'a tourism settlement',

  // body and system feature names
  bio: 'Bio signals',
  geo: 'Geo signals',
  rings: 'Rings',
  volcanism: 'Volcanism',
  terraformable: 'Terraformable',
  tidal: 'Tidally locked',

  blackHole: 'Black Hole',
  whiteDwarf: 'White Dwarf',
  neutronStar: 'Neutron Star',
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
  agriculture: 'rgb(128,255,0)',
  contraband: 'rgb(0,69,255)',
  service: 'rgb(0,69,255)',
  extraction: 'rgb(255,0,0)',
  hightech: 'rgb(0,255,255)',
  industrial: 'rgb(255, 255, 0)',
  military: 'rgb(229,0,229)',
  tourism: 'rgb(102, 0, 229)',
  refinery: 'rgb(255,128,0)',

  terraforming: 'rgb(0, 153, 0)',
  // colony: 'rgb(51, 128, 255)', // TODO: change this to something more obvious?
  colony: 'rgb(150, 150, 150)', // TODO: change this to something more obvious?
  none: 'rgb(102, 102, 102)',
}


export const isOrbital = (buildType: string | undefined): boolean => {
  if (!buildType) return true;
  return !!getSiteType(buildType)?.orbital;
};

export const getSiteType = (buildType: string, noThrow?: boolean): SiteType | undefined => {
  if (noThrow && !buildType) { buildType = '' };
  const match = siteTypes.find(st => st.subTypes.includes(buildType) || st.altTypes?.includes(buildType) || buildType === st.subTypes[0] + '?');
  if (!match) {
    console.error(`No SiteType match found for: '${buildType}'`);
    if (noThrow) return undefined!;
    throw new Error(`No SiteType match found for: '${buildType}'`)
  }
  return match;
};

export const getBuildTypeDisplayName = (buildType: string | undefined) => {
  if (!buildType) return '?';

  const type = getSiteType(buildType)!;
  let txt = type.buildClass === 'starport'
    ? `${type.displayName}`
    : `${type.displayName} ${type.buildClass}`;

  if (type.buildClass === 'settlement') {
    txt = txt.replace('Small ', '')
      .replace('Medium ', '')
      .replace('Large ', '');
  }

  return txt + ` (${buildType})`;
}

export const canReceiveLinks = (type: SiteType): boolean => {

  // star ports and orbital outposts can receive links (but not Asteroid bases?)
  if (type.buildClass === 'starport') {
    return true;
  } else if (type.buildClass === 'outpost') {
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
    "displayName": "Unknown",
    "displayName2": "Unknown",
    "subTypes": [''],
    "haul": 0,
    "buildClass": "unknown",
    "tier": 1,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 0, count: 0 },
    "inf": "none",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 0, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Coriolis",
    "displayName2": "Coriolis Starport",
    "subTypes": ["no_truss", "dual_truss", "quad_truss"],
    "altTypes": ["no truss", "coriolis"],
    "haul": 63001,
    "buildClass": "starport",
    "tier": 2,
    "padSize": "large",
    "orbital": true,
    "needs": { tier: 2, count: 3 },
    "gives": { tier: 3, count: 1 },
    "inf": "colony",
    "effects": { pop: 1, mpop: 1, sec: -2, wealth: 3, tech: 2, sol: 3, dev: 3 }
  },
  {
    "displayName": "Asteroid base",
    "displayName2": "Asteroid Starport",
    "subTypes": ["asteroid"],
    "haul": 53546,
    "buildClass": "starport",
    "tier": 2,
    "padSize": "large",
    "orbital": true,
    "needs": { tier: 2, count: 3 },
    "gives": { tier: 3, count: 1 },
    "inf": "extraction",
    "fixed": "extraction",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 5, tech: 3, sol: -4, dev: 7 }
  },
  {
    "displayName": "Ocellus",
    "displayName2": "Ocellus Starport",
    "subTypes": ["ocellus"],
    "haul": 219135,
    "buildClass": "starport",
    "tier": 3,
    "padSize": "large",
    "orbital": true,
    "needs": { tier: 3, count: 6 },
    "gives": { tier: 0, count: 0 },
    "inf": "colony",
    "effects": { pop: 5, mpop: 1, sec: -3, wealth: 8, tech: 7, sol: 5, dev: 9 }
  },
  {
    "displayName": "Orbis",
    "displayName2": "Orbis Starport",
    "subTypes": ["apollo", "artemis"],
    "altTypes": ["orbis"],
    "haul": 214878,
    "buildClass": "starport",
    "tier": 3,
    "padSize": "large",
    "orbital": true,
    "needs": { tier: 3, count: 6 },
    "gives": { tier: 0, count: 0 },
    "inf": "colony",
    "effects": { pop: 5, mpop: 1, sec: -3, wealth: 8, tech: 7, sol: 5, dev: 9 }
  },
  {
    "displayName": "Commercial",
    "displayName2": "Commercial Outpost",
    "subTypes": ["plutus"],
    "haul": 20480,
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "colony",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 3, tech: 0, sol: 5, dev: 0 }
  },
  {
    "displayName": "Industrial",
    "displayName2": "Industrial Outpost",
    "subTypes": ["vulcan"],
    "haul": 21181,
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "industrial",
    "fixed": "industrial",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 3, sol: 0, dev: 3 }
  },
  {
    "displayName": "Pirate",
    "displayName2": "Pirate Outpost",
    "subTypes": ["dysnomia"],
    "haul": 21797,
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "service",
    "fixed": "service",
    "effects": { pop: 1, mpop: 1, sec: -2, wealth: 3, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Civilian",
    "displayName2": "Civilian Outpost",
    "subTypes": ["vesta"],
    "haul": 21624,
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "colony",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 1, tech: 0, sol: 2, dev: 1 }
  },
  {
    "displayName": "Scientific",
    "displayName2": "Scientific Outpost",
    "subTypes": ["prometheus"],
    "haul": 20827,
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "hightech",
    "fixed": "hightech",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 3, sol: 0, dev: 0 }
  },
  {
    "displayName": "Military",
    "displayName2": "Military Outpost",
    "subTypes": ["nemesis"],
    "haul": 20952,
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "medium",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "military",
    "fixed": "military",
    "effects": { pop: 1, mpop: 1, sec: 2, wealth: 0, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Satellite",
    "displayName2": "Satellite Installation",
    "subTypes": ["angelia", "eirene", "hermes"],
    "haul": 7274,
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
    "displayName2": "Communication Installation",
    "subTypes": ["aletheia", "pistis", "soter"],
    "haul": 6695,
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
    "displayName": "Space Farm",
    "displayName2": "Space Farm",
    "subTypes": ["demeter"],
    "haul": 6709,
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
    "displayName2": "Pirate Base Installation",
    "subTypes": ["apate", "laverna"],
    "haul": 14088,
    "buildClass": "installation",
    "tier": 1,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "service",
    "effects": { pop: 0, mpop: 0, sec: -4, wealth: 4, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Mining",
    "displayName2": "Mining/Industrial Installation",
    "subTypes": ["euthenia", "phorcys"],
    "haul": 11352,
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
    "displayName2": "Relay Installation",
    "subTypes": ["enodia", "ichnaea"],
    "haul": 6855,
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
    "displayName2": "Military Installation",
    "subTypes": ["alastor", "vacuna"],
    "haul": 10130,
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
    "displayName2": "Security Installation",
    "subTypes": ["dicaeosyne", "eunomia", "nomos", "poena"],
    "haul": 10089,
    "buildClass": "installation",
    "tier": 2,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "military",
    "effects": { pop: 0, mpop: 0, sec: 9, wealth: 0, tech: 0, sol: 3, dev: 3 },
    "preReq": 'relay'
  },
  {
    "displayName": "Government",
    "displayName2": "Government Installation",
    "subTypes": ["harmonia"],
    "haul": 10035,
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
    "displayName2": "Medical Installation",
    "subTypes": ["asclepius", "eupraxia"],
    "haul": 10081,
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
    "displayName2": "Research Installation",
    "subTypes": ["astraeus", "coeus", "dione", "dodona"],
    "haul": 10010,
    "buildClass": "installation",
    "tier": 2,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "hightech",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 0, tech: 8, sol: 0, dev: 3 },
    "preReq": 'settlementBio'
  },
  {
    "displayName": "Tourist",
    "displayName2": "Tourist Installation",
    "subTypes": ["hedone", "opora", "pasithea"],
    "haul": 10100,
    "buildClass": "installation",
    "tier": 2,
    "padSize": "none",
    "orbital": true,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "tourism",
    "effects": { pop: 0, mpop: 0, sec: -3, wealth: 6, tech: 0, sol: 0, dev: 3 },
    "preReq": 'settlementTourism'
  },
  {
    "displayName": "Bar",
    "displayName2": "Space Bar Installation",
    "subTypes": ["bacchus", "dionysus"],
    "haul": 10092,
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
    "displayName2": "Civilian Surface Outpost",
    "subTypes": ["atropos", "clotho", "decima", "hestia", "lachesis", "nona"],
    "haul": 35950,
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "colony",
    "effects": { pop: 2, mpop: 1, sec: -2, wealth: 0, tech: 0, sol: 3, dev: 0 }
  },
  {
    "displayName": "Industrial",
    "displayName2": "Industrial Surface Outpost",
    "subTypes": ["bia", "hephaestus", "mefitis", "opis", "ponos", "tethys"],
    "haul": 36443,
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "industrial",
    "fixed": "industrial",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 3, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Scientific",
    "displayName2": "Scientific Surface Outpost",
    "subTypes": ["ananke", "antevorta", "fauna", "necessitas", "porrima", "providentia"],
    "haul": 36902,
    "buildClass": "outpost",
    "tier": 1,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "hightech",
    "fixed": "hightech",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 0, tech: 5, sol: 0, dev: 1 }
  },
  {
    "displayName": "Planetary port",
    "displayName2": "Large Planetary Port",
    "subTypes": ["aphrodite", "hera", "poseidon", "zeus"],
    "haul": 215597,
    "buildClass": "starport",
    "tier": 3,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 3, count: 6 },
    "gives": { tier: 0, count: 0 },
    "inf": "colony",
    "effects": { pop: 10, mpop: 10, sec: -3, wealth: 5, tech: 5, sol: 7, dev: 10 }
  },
  {
    "displayName": "Small Agriculture",
    "displayName2": "Agriculture Settlement: Small",
    "subTypes": ["consus"],
    "haul": 2834,
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
    "displayName2": "Agriculture Settlement: Medium",
    "subTypes": ["annona", "picumnus"],
    "haul": 5697,
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "large",
    "padMap": { picumnus: 'large', annona: 'small' },
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "agriculture",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 0, sol: 7, dev: 0 }
  },
  {
    "displayName": "Large Agriculture",
    "displayName2": "Agriculture Settlement: Large",
    "subTypes": ["ceres", "fornax"],
    "haul": 8517,
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
    "displayName2": "Mining Settlement: Small",
    "subTypes": ["ourea"],
    "haul": 2837,
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "small",
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "extraction",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 3, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Medium Mining",
    "displayName2": "Mining Settlement: Medium",
    "subTypes": ["mantus", "orcus"],
    "haul": 5638,
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "large",
    "padMap": { mantus: 'medium', orcus: 'large' },
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "extraction",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 5, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Large Mining",
    "displayName2": "Mining Settlement: Large",
    "subTypes": ["aerecura", "erebus"],
    "haul": 8760,
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
    "displayName2": "Industrial Settlement: Small",
    "subTypes": ["fontus"],
    "haul": 2828,
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
    "displayName2": "Industrial Settlement: Medium",
    "subTypes": ["meteope", "minthe", "palici"],
    "haul": 5656,
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "large",
    "padMap": { meteope: 'large', palici: 'medium', minthe: 'large' },
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "industrial",
    "effects": { pop: 1, mpop: 1, sec: 0, wealth: 0, tech: 0, sol: 0, dev: 6 }
  },
  {
    "displayName": "Large Industrial",
    "displayName2": "Industrial Settlement: Large",
    "subTypes": ["gaea"],
    "haul": 8481,
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
    "displayName2": "Military Settlement: Small",
    "subTypes": ["ioke"],
    "haul": 3553,
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
    "displayName2": "Military Settlement: Medium",
    "subTypes": ["bellona", "enyo", "polemos"],
    "haul": 5629,
    "buildClass": "settlement",
    "tier": 1,
    "padSize": "medium",
    "padMap": { bellona: 'small', enyo: 'medium', polemos: 'medium' },
    "orbital": false,
    "needs": { tier: 0, count: 0 },
    "gives": { tier: 2, count: 1 },
    "inf": "military",
    "effects": { pop: 1, mpop: 1, sec: 4, wealth: 0, tech: 0, sol: 0, dev: 0 }
  },
  {
    "displayName": "Large Military",
    "displayName2": "Military Settlement: Large",
    "subTypes": ["minerva"],
    "haul": 8554,
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
    "displayName2": "Bio Settlement: Small",
    "subTypes": ["pheobe"],
    "haul": 2897,
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
    "displayName2": "Bio Settlement: Medium",
    "subTypes": ["asteria", "caerus"],
    "haul": 5681,
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
    "displayName2": "Bio Settlement: Large",
    "subTypes": ["chronos"],
    "haul": 8537,
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
    "displayName2": "Tourist Settlement: Small",
    "subTypes": ["aergia"],
    "haul": 2895,
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "medium",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "tourism",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 1, tech: 0, sol: 0, dev: 0 },
    "preReq": 'satellite'
  },
  {
    "displayName": "Medium Tourist",
    "displayName2": "Tourist Settlement: Medium",
    "subTypes": ["comus", "gelos"],
    "altTypes": ["comos"],
    "haul": 5671,
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "tourism",
    "effects": { pop: 1, mpop: 1, sec: -1, wealth: 3, tech: 0, sol: 0, dev: 0 },
    "preReq": 'satellite'
  },
  {
    "displayName": "Large Tourist",
    "displayName2": "Tourist Settlement: Large",
    "subTypes": ["fufluns"],
    "haul": 8568,
    "buildClass": "settlement",
    "tier": 2,
    "padSize": "large",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 2 },
    "inf": "tourism",
    "effects": { pop: 1, mpop: 1, sec: -2, wealth: 5, tech: 0, sol: 0, dev: 0 },
    "preReq": 'satellite'
  },
  {
    "displayName": "Extraction",
    "displayName2": "Extraction Hub",
    "subTypes": ["tartarus"],
    "haul": 9996,
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
    "displayName2": "Civilian Hub",
    "subTypes": ["aegle"],
    "haul": 9890,
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "none",
    "effects": { pop: 0, mpop: 0, sec: -3, wealth: 0, tech: 0, sol: 3, dev: 3 },
    "preReq": 'settlementAgr'
  },
  {
    "displayName": "Exploration",
    "displayName2": "Exploration Hub",
    "subTypes": ["tellus_e"],
    "haul": 9960,
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "tourism",
    "effects": { pop: 0, mpop: 0, sec: -1, wealth: 0, tech: 7, sol: 0, dev: 3 },
    "preReq": 'comms'
  },
  {
    "displayName": "Outpost",
    "displayName2": "Outpost Hub",
    "subTypes": ["io"],
    "haul": 9945,
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "none",
    "effects": { pop: 0, mpop: 0, sec: -2, wealth: 0, tech: 0, sol: 3, dev: 3 },
    "preReq": 'installationAgr'
  },
  {
    "displayName": "Scientific",
    "displayName2": "Scientific Hub",
    "subTypes": ["athena", "caelus"],
    "haul": 9958,
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
    "displayName2": "Military Hub",
    "subTypes": ["alala", "ares"],
    "haul": 10089,
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "military",
    "effects": { pop: 0, mpop: 0, sec: 10, wealth: 0, tech: 0, sol: 0, dev: 0 },
    "preReq": 'installationMil'
  },
  {
    "displayName": "Refinery",
    "displayName2": "Refinery Hub",
    "subTypes": ["silenus"],
    "haul": 9957,
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
    "displayName2": "High Tech Hub",
    "subTypes": ["janus"],
    "haul": 9881,
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
    "displayName2": "Industrial Hub",
    "subTypes": ["eunostus", "molae", "tellus_i",],
    "altTypes": ["tellus"],
    "haul": 9950,
    "buildClass": "hub",
    "tier": 2,
    "padSize": "none",
    "orbital": false,
    "needs": { tier: 2, count: 1 },
    "gives": { tier: 3, count: 1 },
    "inf": "industrial",
    "effects": { pop: 0, mpop: 0, sec: 0, wealth: 5, tech: 3, sol: -4, dev: 3 },
    "preReq": 'outpostMining'
  }
];

/** buildType: [ small, medium, large ] */
export const mapSitePads: Record<string, [s: number, m: number, l: number,]> = {

  // T2/T3  space ports
  no_truss: [8, 11, 5], // Coriolis Starport
  dual_truss: [8, 11, 5], // Coriolis Starport
  quad_truss: [8, 11, 5], // Coriolis Starport
  asteroid: [8, 11, 5], // Asteroid Starport
  ocellus: [8, 11, 5], // Ocellus Starport
  apollo: [8, 11, 5], // Orbis Starport
  artemis: [8, 11, 5], // Orbis Starport

  // T1 outposts
  plutus: [3, 1, 0], // Commercial Outpost
  vulcan: [2, 1, 0], // Industrial Outpost
  dysnomia: [0, 1, 0], // Pirate Outpost
  vesta: [4, 1, 0], // Civilian Outpost
  prometheus: [2, 1, 0], // Scientific Outpost
  nemesis: [2, 1, 0], // Military Outpost

  // T2 surface hubs
  hestia: [4, 4, 4], // Civilian Surface Outpost
  decima: [4, 4, 4], // Civilian Surface Outpost
  atropos: [4, 4, 4], // Civilian Surface Outpost
  nona: [4, 4, 4], // Civilian Surface Outpost
  lachesis: [4, 4, 4], // Civilian Surface Outpost
  clotho: [4, 4, 2], // Civilian Surface Outpost
  hephaestus: [4, 4, 4], // Industrial Surface Outpost
  opis: [4, 4, 4], // Industrial Surface Outpost <-- confirm
  ponos: [4, 2, 2], // Industrial Surface Outpost
  tethys: [4, 4, 4], // Industrial Surface Outpost
  bia: [4, 2, 2], // Industrial Surface Outpost
  mefitis: [4, 4, 2], // Industrial Surface Outpost
  necessitas: [4, 4, 4], // Scientific Surface Outpost
  ananke: [4, 4, 2], // Scientific Surface Outpost
  fauna: [4, 4, 2], // Scientific Surface Outpost
  providentia: [4, 4, 4], // Scientific Surface Outpost
  antevorta: [4, 2, 2], // Scientific Surface Outpost <-- confirm
  porrima: [4, 4, 2], // Scientific Surface Outpost

  // T3 surface star ports
  zeus: [4, 4, 8], // Large Planetary Port
  hera: [4, 4, 8], // Large Planetary Port
  poseidon: [4, 4, 8], // Large Planetary Port
  aphrodite: [4, 4, 8], // Large Planetary Port

  // Odyssey Settlements
  consus: [1, 0, 0], // Agriculture Settlement: Small
  picumnus: [1, 0, 1], // Agriculture Settlement: Medium
  annona: [1, 0, 0], // Agriculture Settlement: Medium
  ceres: [1, 0, 1], // Agriculture Settlement: Large
  fornax: [2, 0, 1], // Agriculture Settlement: Large
  ourea: [1, 0, 0], // Mining Settlement: Small
  mantus: [0, 1, 0], // Mining Settlement: Medium
  orcus: [1, 0, 1], // Mining Settlement: Medium
  erebus: [1, 0, 1], // Mining Settlement: Large
  aerecura: [0, 0, 1], // Mining Settlement: Large
  fontus: [1, 0, 0], // Industrial Settlement: Small
  minthe: [0, 1, 0], // Industrial Settlement: Medium
  palici: [0, 0, 1], // Industrial Settlement: Medium
  meteope: [1, 0, 1], // Industrial Settlement: Medium
  gaea: [0, 0, 1], // Industrial Settlement: Large
  ioke: [0, 1, 0], // Military Settlement: Small
  bellona: [1, 0, 0], // Military Settlement: Medium
  enyo: [1, 1, 0], // Military Settlement: Medium
  polemos: [1, 1, 0], // Military Settlement: Medium
  minerva: [2, 0, 1], // Military Settlement: Large
  pheobe: [1, 0, 0], // Bio Settlement: Small
  asteria: [1, 0, 0], // Bio Settlement: Medium
  caerus: [3, 0, 0], // Bio Settlement: Medium
  chronos: [1, 0, 1], // Bio Settlement: Large
  aergia: [0, 1, 0], // Tourist Settlement: Small
  comus: [2, 0, 1], // Tourist Settlement: Medium
  gelos: [1, 0, 1], // Tourist Settlement: Medium
  fufluns: [2, 0, 2], // Tourist Settlement: Large
};

/** generated from analyzing build data */
export const averageHauls: Record<string, number> = {
  "Agriculture Settlement: Large": 8310,
  "Agriculture Settlement: Medium": 5681,
  "Agriculture Settlement: Small": 2826,
  "Asteroid Starport": 56602,
  "Bio Settlement: Large": 8544,
  "Bio Settlement: Medium": 5684,
  "Bio Settlement: Small": 2844,
  "Civilian Outpost": 21510,
  "Civilian Surface Outpost": 33312,
  "Commercial Outpost": 20832,
  "Communication Installation": 6732,
  "Coriolis Starport": 54419,
  "Exploration Hub": 9955,
  "Extraction Hub": 9994,
  "Government Installation": 10080,
  "High Tech Hub": 9889,
  "Industrial Hub": 22182,
  "Industrial Outpost": 20649,
  "Industrial Settlement: Large": 8501,
  "Industrial Settlement: Medium": 5776,
  "Industrial Settlement: Small": 2846,
  "Industrial Surface Outpost": 36010,
  "Large Planetary Port": 215678,
  "Medical Installation": 10046,
  "Military Hub": 9974,
  "Military Installation": 10124,
  "Military Outpost": 20676,
  "Military Settlement: Large": 8534,
  "Military Settlement: Medium": 5679,
  "Military Settlement: Small": 3358,
  "Mining Settlement: Large": 8488,
  "Mining Settlement: Medium": 5676,
  "Mining Settlement: Small": 3570,
  "Mining/Industrial Installation": 6834,
  "Ocellus Starport": 217789,
  "Orbis Starport": 219546,
  "Outpost Hub": 9853,
  "Pirate Base Installation": 12506,
  "Pirate Outpost": 21184,
  "Refinery Hub": 10008,
  "Relay Installation": 6751,
  "Research Installation": 10073,
  "Satellite Installation": 6704,
  "Scientific Hub": 9975,
  "Scientific Outpost": 20978,
  "Scientific Surface Outpost": 36373,
  "Security Installation": 10074,
  "Space Bar Installation": 10055,
  "Space Farm": 6712,
  "Tourist Installation": 10146,
  "Tourist Settlement: Large": 8521,
  "Tourist Settlement: Medium": 5661,
  "Tourist Settlement: Small": 2844,
};
