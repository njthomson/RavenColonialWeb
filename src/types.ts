// type Pair<S> = [S | undefined, Dispatch<SetStateAction<S | undefined>>]

// export const apiSvcUrl = 'https://localhost:7007';
export const apiSvcUrl = 'https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net';

export interface ProjectRefLite {
  buildId: string;
  buildName: string;
  buildType: string
  systemName: string;
}

export interface ProjectRef extends ProjectRefLite {
  marketId: number;
  systemAddress: number;
  starPos: number[];

  bodyNum?: number;
  bodyName?: string;

  architectName?: string;
  factionName?: string;
  notes?: string;
}

export interface Project extends ProjectRef {
  commanders: Record<string, string[]>;
  commodities: Record<string, number>;
}

export interface CmdrSummary {
  primaryId?: string;
  projects: Project[];
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



export enum TopPivot {
  home = 'home',
  find = 'find',
  build = 'build',
  cmdr = 'cmdr',
  about = 'about',
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

export const mapCommodityIcon: Record<string, string> = {
  Chemicals: 'TestBeaker',
  ConsumerItems: 'ShoppingCart',
  LegalDrugs: 'ClassroomLogo',
  Foods: 'EatDrink',
  Industrial: 'CubeShape', // 'CubeShape',
  Machinery: 'ProductVariant', // 'CubeShape',
  Medicines: 'Health', //'Medical',
  Metals: 'WebAppBuilderModule', //'ViewInAR',
  Minerals: 'Diamond',
  Salvage: 'Quantity',
  Technology: 'Robot',
  Waste: 'RecycleBin',
  Weapons: 'GripperTool', // IncidentTriangle
}

export const mapCommodityType: Record<string, string> = {
  "liquidoxygen": "Chemicals",
  "water": "Chemicals",
  "ceramiccomposites": "Industrial",
  "cmmcomposite": "Industrial",
  "insulatingmembrane": "Industrial",
  "polymers": "Industrial",
  "semiconductors": "Industrial",
  "superconductors": "Industrial",
  "aluminium": "Metals",
  "copper": "Metals",
  "steel": "Metals",
  "titanium": "Metals",
  "computercomponents": "Technology",
  "medicaldiagnosticequipment": "Medicines",
  "foodcartridges": "Foods",
  "fruitandvegetables": "Foods",
  "nonlethalweapons": "Weapons",
  "powergenerators": "Technology",
  "waterpurifiers": "Technology",
  "bioreducinglichen": "Technology",
  "buildingfabricators": "Machinery",
  "emergencypowercells": "Machinery",
  "evacuationshelter": "Chemicals",
  "geologicalequipment": "Machinery",
  "hazardousenvironmentsuits": "Technology",
  "muonimager": "Technology",
  "robotics": "Technology",
  "structuralregulators": "Technology",
  "surfacestabilisers": "Chemicals",
  "survivalequipment": "Chemicals"
}

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
  "basicmedicines": "Basic Medicines",
  "combatstabilizers": "Combat Stabilizers",
  "militarygradefabrics": "Military Grade Fabrics",
  "advancedcatalysers": "Advanced Catalysers",
  "wine": "Wine",
  "animalmeat": "Animal Meat",
  "fish": "Fish",
  "tea": "Tea",
  "coffee": "Coffee",
  "landenrichmentsystems": "Land Enrichment Systems",
  "surfacestabilisers": "Surface Stabilisers",
  "buildingfabricators": "Building Fabricators",
  "structuralregulators": "Structural Regulators",
  "evacuationshelter": "Evacuation Shelter",
  "emergencypowercells": "Emergency Power Cells",
  "survivalequipment": "Survival Equipment",
  "thermalcoolingunits": "Thermal Cooling Units",
  "microbialfurnaces": "Microbial Furnaces",
  "mineralextractors": "Mineral Extractors"
};
