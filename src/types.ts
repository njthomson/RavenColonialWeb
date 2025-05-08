
export const autoUpdateFrequency = 30 * 1000; // 30 seconds
export const autoUpdateStopDuration = 60 * 60 * 1000; // 60 minutes

export enum TopPivot {
  home = 'home',
  find = 'find',
  build = 'build',
  buildAll = 'buildAll',
  cmdr = 'cmdr',
  about = 'about',
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
  complete: boolean;
  maxNeed: number;
  notes?: string;
}

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
  group = 'Group by type',
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
  "liquidoxygen": "Liquid Oxygen",
  "water": "Water",
  "ceramiccomposites": "Ceramic Composites",
  "cmmcomposite": "CMM Composite",
  "insulatingmembrane": "Insulating Membrane",
  "polymers": "Polymers",
  "semiconductors": "Semiconductors",
  "superconductors": "Superconductors",
  "aluminium": "Aluminium",
  "copper": "Copper",
  "steel": "Steel",
  "titanium": "Titanium",
  "computercomponents": "Computer Components",
  "medicaldiagnosticequipment": "Medical Diagnostic Equipment",
  "foodcartridges": "Food Cartridges",
  "fruitandvegetables": "Fruit and Vegetables",
  "nonlethalweapons": "Non-Lethal Weapons",
  "powergenerators": "Power Generators",
  "waterpurifiers": "Water Purifiers",
  "microcontrollers": "Micro Controllers",
  "grain": "Grain",
  "pesticides": "Pesticides",
  "agriculturalmedicines": "Agri-Medicines",
  "cropharvesters": "Crop Harvesters",
  "biowaste": "Biowaste",
  "beer": "Beer",
  "liquor": "Liquor",
  "battleweapons": "Battle Weapons",
  "reactivearmour": "Reactive Armour",
  "hazardousenvironmentsuits": "H.E. Suits",
  "robotics": "Robotics",
  "resonatingseparators": "Resonating Separators",
  "bioreducinglichen": "Bioreducing Lichen",
  "geologicalequipment": "Geological Equipment",
  "muonimager": "Muon Imager",
  "mutomimager": "Muon Imager",
  "basicmedicines": "Basic Medicines",
  "combatstabilizers": "Combat Stabilizers",
  "combatstabilisers": "Combat Stabilizers",
  "militarygradefabrics": "Military Grade Fabrics",
  "advancedcatalysers": "Advanced Catalysers",
  "wine": "Wine",
  "animalmeat": "Animal Meat",
  "fish": "Fish",
  "tea": "Tea",
  "coffee": "Coffee",
  "landenrichmentsystems": "Land Enrichment Systems",
  "terrainenrichmentsystems": "Land Enrichment Systems",
  "surfacestabilisers": "Surface Stabilisers",
  "buildingfabricators": "Building Fabricators",
  "structuralregulators": "Structural Regulators",
  "evacuationshelter": "Evacuation Shelter",
  "emergencypowercells": "Emergency Power Cells",
  "survivalequipment": "Survival Equipment",
  "thermalcoolingunits": "Thermal Cooling Units",
  "heliostaticfurnaces": "Microbial Furnaces",
  "microbialfurnaces": "Microbial Furnaces",
  "mineralextractors": "Mineral Extractors"
};
