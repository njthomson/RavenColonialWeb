
export const autoUpdateFrequency = 30 * 1000; // 30 seconds
export const autoUpdateStopDuration = 60 * 60 * 1000; // 60 minutes

export enum TopPivot {
  home = 'home',
  find = 'find',
  build = 'build',
  buildAll = 'buildAll',
  cmdr = 'cmdr',
  about = 'about',
  vis = 'vis',
  sys = 'sys',
  /** Big Site Table */
  table = 'bst',
}

export class RequestError extends Error {
  constructor(
    public statusCode: number,
    public statusText: string,
    bodyText?: string
  ) {
    super(`${statusCode}: ${statusText}` + (bodyText ? ` - ${bodyText}` : ''));
    this.name = 'RequestError';
    //console.error(`${statusCode}: ${statusText}` + (bodyText ? `\n\n${bodyText}` : ''));
  }
}

/** A dictionary of string cargo name to a count numeric value */
export type Cargo = Record<string, number>;

export interface ProjectRefLite {
  buildId: string;
  buildName: string;
  buildType: string
  systemName: string;
  isPrimaryPort: boolean;
  isMock?: boolean;
  complete: boolean;
}

export interface ProjectRefComplete extends ProjectRefLite {
  marketId: number;
}

export interface ProjectRef extends ProjectRefComplete {
  systemAddress: number;
  starPos: number[];

  bodyNum?: number;
  bodyName?: string;

  architectName?: string;
  factionName?: string;
  discordLink?: string;
  timeDue?: string;
  timeCompleted?: string;
  maxNeed: number;
  notes?: string;

  /** @deprecated */
  bodyType?: BodyType;
  /** @deprecated */
  bodyFeatures?: BodyFeature[];
  /** @deprecated */
  systemFeatures?: SystemFeature[];
  /** @deprecated */
  reserveLevel?: ReserveLevel;
}

export type ReserveLevel = 'depleted' | 'low' | 'common' | 'major' | 'pristine';

export enum BodyFeature {
  bio = 'bio',
  geo = 'geo',
  volcanism = 'volcanism',
  rings = 'rings',
  terraformable = 'terraformable',
  tidal = 'tidal',
  landable = 'landable',
  atmos = 'atmos',
}

export const mapBodyFeature = {
  bio: 'Bio signals',
  geo: 'Geo signals',
  volcanism: 'Volcanism',
  rings: 'Rings',
  terraformable: 'Terraformable',
  tidal: 'Tidally locked',
  landable: 'Landable',
  atmos: 'Atmosphere',
}

export enum SystemFeature {
  blackHole = 'blackHole',
  whiteDwarf = 'whiteDwarf',
  neutronStar = 'neutronStar',
}

export type BodyType =
  | 'remnant'
  | 'star'
  | 'elw'
  | 'ww'
  | 'ammonia'
  | 'gg'
  | 'hmc' // 'High Metal Content' OR 'Metal Rich'
  | 'rockyice'
  | 'rocky'
  | 'icy'
  // | 'asteroid'
  ;

export const mapBodyTypeNames: Record<BodyType, string> = {
  'remnant': 'Black hole, white dwarf or neutron star',
  'star': 'Any other star type',
  'elw': 'Earth-Like World',
  'ww': 'Water World',
  'ammonia': 'Ammonia World',
  'gg': 'Gas Giant',
  'hmc': 'High Metal Content or Metal-rich body',
  'rockyice': 'Rocky Ice World',
  'rocky': 'Rocky body',
  'icy': 'Icy body',
  // 'asteroid': 'Asteroid Belt',
};

export const mapReserveLevel: Record<string, string> = {
  'depleted': 'Depleted',
  'low': 'Low',
  'common': 'Common',
  'major': 'Major',
  'pristine': 'Pristine',
};

export interface CreateProject extends ProjectRef {
  commodities: Record<string, number>;
  commanders?: Record<string, string[]>;
}

export interface Project extends ProjectRef {
  timestamp: string;
  sumNeed: number;
  commanders: Record<string, string[]>;
  commodities: Record<string, number>;
  ready: string[];
  linkedFC: ProjectFC[];
}

export interface ProjectFC {
  marketId: number;
  name: string;
  displayName: string;
  assign: string[];
}

export interface SupplyStatsSummary {
  buildId: string;
  totalCargo: number;
  totalDeliveries: number;
  start: string;
  end: string;
  cmdrs: Record<string, number>;
  stats: SupplyStats[],
}

export interface SupplyStats {
  time: string;
  countCargo: number;
  countDeliveries: number;
  cmdrs: Record<string, number>;
}

export interface CmdrView {
  displayName: string;
}

export interface CmdrPatch {
  displayName: string;
}

export interface CmdrSummary {
  primaryId?: string;
  projects: Project[];
}

export interface GlobalStats {
  timeStamp: string;
  activeProjects: number;
  completeProjects: number;
  commanders: number;
  fleetCarriers: number;
  countDeliveriesEver: number;
  totalDeliveredEver: number;
  countDeliveries7d: number;
  totalDelivered7d: number;
  topContributors7d: Record<string, number>;
  topHelpers7d: Record<string, number>;
}

export interface QueryProject {
  systemName: string
};

export interface TopState {
  pivot: TopPivot;
  query?: QueryProject | undefined;
  buildId?: string | undefined;
  proj?: Project | undefined;
}

export interface AppProps {
  ts: TopState;
  setTS: React.Dispatch<React.SetStateAction<TopState>>;
}

export interface FindMarketsOptions {
  refSystem?: string;
  shipSize: string;
  maxDistance: number;
  maxArrival: number;
  noSurface: boolean;
  noFC: boolean;
  requireNeed: boolean;
  hasShipyard: boolean;
}

export interface FoundMarkets {
  preparedAt: string;
  buildId: string;
  systemName: string;
  markets: MarketSummary[];
}

export interface MarketSummary {
  marketId: number;
  stationName: string;
  type: string;
  economy: string;
  economies: Record<string, number>;
  updatedAt: string;
  supplies: Record<string, number>;
  surface: boolean;
  padSize: string;

  bodyName: string;
  systemName: string;
  distance: number;
  distanceToArrival: number;
  starPos: number[];
}

export interface ResponseEdsmStations {
  id: number;
  id64: number;
  name: string;
  url: string;
  stations: StationEDSM[];
}

export interface StationEDSM {
  id: number;
  marketId: string;
  name: string;
  type: string;
  distanceToArrival: number;
  economy: string;
  secondEconomy: string;
  haveMarket: boolean;
  haveOutfitting: boolean;
  haveShipyard: boolean;

  body?: {
    id: number;
    name: string;
  }

  controllingFaction: {
    id: number;
    name: string;
  }
}

export interface ResponseEdsmSystem {
  name: string;
  coords: {
    x: number;
    y: number;
    z: number;
  }
}

export interface ResponseEdsmSystemBodies {
  id: number;
  id64: number;
  name: string;
  url: string;
  bodyCount: number;
  bodies: ResponseEdsmSystemBody[];
}

export interface ResponseEdsmSystemBody {
  id: number;
  id64: number;
  bodyId: number;
  name: string;
  type?: string;
  subType?: string;
  distanceToArrival: number;
  isLandable: boolean;

  // TODO: add more fields?
}

export interface ResponseEdsmTypeAhead {
  id: number;
  value: string;
  communityName?: string;
  coordinatesLocked: boolean;
  coords: {
    x: number;
    y: number;
    z: number;
  },
  haveDuplicate: boolean;
}

export interface ResponseEdsmSystemFactions {
  id: number;
  id64: number;
  name: string;
  url: string;

  // TODO: factions[] ..?
}

export enum SortMode {
  alpha = 'Alpha sort',
  group = 'By type',
  econ = 'By Economy',
}

export interface QuickSearchStation {
  market_id: number;
  name: string;
  carrier_name?: string;
  system_id64: number;
  system_x: number;
  system_y: number;
  system_z: number;
}

export interface KnownFC {
  marketId: number;
  name: string;
  displayName: string;
  cargo: Record<string, number>;
}

export const mapCommodityIcon: Record<string, string> = {
  Chemicals: 'TestBeaker',
  ConsumerItems: 'ShoppingCart',
  'Consumer Items': 'ShoppingCart',
  'Legal Drugs': 'Wines',
  Foods: 'EatDrink',
  Industrial: 'CubeShape',
  'Industrial Materials': 'CubeShape',
  Machinery: 'ProductVariant', // 'CubeShape',
  Medicines: 'Health', //'Medical',
  Metals: 'WebAppBuilderModule', //'ViewInAR',
  Minerals: 'Diamond',
  Textiles: 'Shirt',
  Salvage: 'Quantity',
  Technology: 'Robot',
  Waste: 'RecycleBin',
  Weapons: 'GripperTool', // IncidentTriangle
}

/** Prior mistakes and corrections in the cargo names:
 * 
 *  From > To
 * 
 *  microbialfurnaces > heliostaticfurnaces
 *  landenrichmentsystems > terrainenrichmentsystems
 *  muonimager > mutomimager
 *  combatstabilizers > combatstabilisers
 * 
 **/

/** A map of Colonization relevant cargo item names to display names */
export const mapCommodityNames: Record<string, string> = {
  "advancedcatalysers": "Advanced Catalysers",
  "agriculturalmedicines": "Agri-Medicines",
  "aluminium": "Aluminium",
  "animalmeat": "Animal Meat",
  "basicmedicines": "Basic Medicines",
  "battleweapons": "Battle Weapons",
  "beer": "Beer",
  "bioreducinglichen": "Bioreducing Lichen",
  "biowaste": "Biowaste",
  "buildingfabricators": "Building Fabricators",
  "ceramiccomposites": "Ceramic Composites",
  "cmmcomposite": "CMM Composite",
  "coffee": "Coffee",
  "combatstabilisers": "Combat Stabilisers",
  "computercomponents": "Computer Components",
  "copper": "Copper",
  "cropharvesters": "Crop Harvesters",
  "emergencypowercells": "Emergency Power Cells",
  "evacuationshelter": "Evacuation Shelter",
  "fish": "Fish",
  "foodcartridges": "Food Cartridges",
  "fruitandvegetables": "Fruit and Vegetables",
  "geologicalequipment": "Geological Equipment",
  "grain": "Grain",
  "hazardousenvironmentsuits": "H.E. Suits",
  "heliostaticfurnaces": "Microbial Furnaces",
  "insulatingmembrane": "Insulating Membrane",
  "liquidoxygen": "Liquid oxygen",
  "liquor": "Liquor",
  "medicaldiagnosticequipment": "Medical Diagnostic Equipment",
  "microcontrollers": "Micro Controllers",
  "militarygradefabrics": "Military Grade Fabrics",
  "mineralextractors": "Mineral Extractors",
  "mutomimager": "Muon Imager",
  "nonlethalweapons": "Non-Lethal Weapons",
  "pesticides": "Pesticides",
  "polymers": "Polymers",
  "powergenerators": "Power Generators",
  "reactivearmour": "Reactive Armour",
  "resonatingseparators": "Resonating Separators",
  "robotics": "Robotics",
  "semiconductors": "Semiconductors",
  "steel": "Steel",
  "structuralregulators": "Structural Regulators",
  "superconductors": "Superconductors",
  "surfacestabilisers": "Surface Stabilisers",
  "survivalequipment": "Survival Equipment",
  "tea": "Tea",
  "terrainenrichmentsystems": "Land Enrichment Systems",
  "thermalcoolingunits": "Thermal Cooling Units",
  "titanium": "Titanium",
  "tritium": "Tritium",
  "water": "Water",
  "waterpurifiers": "Water Purifiers",
  "wine": "Wine",

  // prior mistakes
  "combatstabilizers": "Combat Stabilisers",
  "muonimager": "Muon Imager",
  "landenrichmentsystems": "Land Enrichment Systems",
  "microbialfurnaces": "Microbial Furnaces",
};

export const mapSourceEconomy: Record<string, string> = {
  "advancedcatalysers": "hightech",
  "agriculturalmedicines": "hightech",
  "aluminium": "refinery",
  "animalmeat": "agriculture",
  "basicmedicines": "hightech,industrial",
  "battleweapons": "hightech,industrial,military",
  "beer": "agriculture",
  "bioreducinglichen": "hightech",
  "biowaste": "not/agri",
  "buildingfabricators": "industrial",
  "ceramiccomposites": "refinery/surface",
  "cmmcomposite": "refinery/surface",
  "coffee": "agriculture",
  "combatstabilisers": "hightech",
  "computercomponents": "industrial",
  "copper": "refinery",
  "cropharvesters": "industrial",
  "emergencypowercells": "near/akhenaten",
  "evacuationshelter": "hightech",
  "fish": "agriculture",
  "foodcartridges": "industrial",
  "fruitandvegetables": "agriculture",
  "geologicalequipment": "industrial",
  "grain": "agriculture",
  "hazardousenvironmentsuits": "hightech",
  "heliostaticfurnaces": "hightech",
  "insulatingmembrane": "refinery/orbital",
  "liquidoxygen": "refinery",
  "liquor": "agriculture,industrial",
  "medicaldiagnosticequipment": "hightech",
  "microcontrollers": "hightech",
  "militarygradefabrics": "refinery",
  "mineralextractors": "industrial",
  "mutomimager": "industrial/surface,hightech/surface",
  "nonlethalweapons": "hightech,military",
  "pesticides": "hightech",
  "polymers": "refinery",
  "powergenerators": "industrial",
  "reactivearmour": "hightech,military",
  "resonatingseparators": "hightech",
  "robotics": "hightech",
  "semiconductors": "refinery",
  "steel": "refinery",
  "structuralregulators": "hightech",
  "superconductors": "refinery",
  "surfacestabilisers": "refinery",
  "survivalequipment": "industrial",
  "tea": "agriculture",
  "terrainenrichmentsystems": "hightech",
  "thermalcoolingunits": "industrial",
  "titanium": "refinery",
  "tritium": "refinery",
  "water": "agriculture",
  "waterpurifiers": "industrial",
  "wine": "agriculture",

  // prior mistakes
  "combatstabilizers": "hightech",
  "muonimager": "industrial/surface,hightech/surface",
  "landenrichmentsystems": "hightech",
  "microbialfurnaces": "hightech",
};
