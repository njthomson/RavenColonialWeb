import { BodyFeature, ReserveLevel } from "./types";

/** Represents an architected system system */
export interface Sys {
  name: string;
  id64: number;
  architect: string;
  pos: number[];
  reserveLevel: ReserveLevel;
  primaryPortId?: string;
  bodies: Bod[];
  sites: Site[];
}

/** Represents a body in a system */
export interface Bod {
  name: string;
  num: number;
  distLS: number;
  parents: number[];
  type: BodyType;
  subType: string;
  landable?: boolean;
  features: BodyFeature[];
}

export type BodyType =
  | 'un'// unknown
  | 'bh'// Black Hole
  | 'ns'// Neutron Star
  | 'wd'// White Dwarf
  | 'st'// some kind of star
  | 'aw'// Ammonia World
  | 'elw'// Earth Like Body
  | 'gg'// Gas Giant
  | 'hmc'// High Metal Content Body
  | 'ib'// Icy Body
  | 'mrb'// Metal Rich Body
  | 'rb'// Rock Body
  | 'ri'// Rocky Ice Body
  | 'wg'// Water Giant
  | 'ww'// Water World
  | 'ac'// Asteroid cluster
  | 'bc'// Barycentre
  ;

export const mapBodyTypeNames: Record<BodyType, string> = {
  'bh': 'Black hole',
  'ns': 'Neutron star',
  'wd': 'White dwarf',
  'st': 'A star',
  'aw': 'Ammonia World',
  'elw': 'Earth Like Body',
  'gg': 'Gas Giant',
  'hmc': 'High Metal Content Body',
  'ib': 'Icy Body',
  'mrb': 'Metal Rich Body',
  'rb': 'Rock Body',
  'ri': 'Rocky Ice Body',
  'wg': 'Water Giant',
  'ww': 'Water World',
  'ac': 'Asteroid cluster',
  'bc': 'Barycentre',
  'un': 'Unknown',
};

/** Represents a station in a system */
export interface Site {
  id: string;
  buildId: string;
  name: string;
  bodyNum: number;
  buildType: string;
  notes?: string;
  status: BuildStatus
}

export type BuildStatus = 'plan' | 'build' | 'complete'; // | 'skip';



// type BodyType = keyof typeof bodyTypes;
// const bodyTypes = [
//   'BlackHole',
//   'NeutronStar',
//   'WhiteDwarf',
//   'AmmoniaWorld',
//   'EarthLikeBody',
//   'GasGiantWithAmmoniaBasedLife',
//   'GasGiantWithWaterBasedLife',
//   'HeliumGasGiant',
//   'HeliumRichGasGiant',
//   'HighMetalContentBody',
//   'IcyBody',
//   'MetalRichBody',
//   'RockBody',
//   'RockyIceBody',
//   'SudarskyClassIGasGiant',
//   'SudarskyClassIIGasGiant',
//   'SudarskyClassIIIGasGiant',
//   'SudarskyClassIVGasGiant',
//   'SudarskyClassVGasGiant',
//   'WaterGiant',
//   'WaterWorld',
//   'WaterGiantWithLife',
// ] as const;

export const mapBodyType = {
  un: 'Unknown',
  bh: 'Black Hole',
  ns: 'Neutron Star',
  wd: 'White Dwarf',
  st: 'A star',
  aw: 'Ammonia World',
  elw: 'Earth Like Body',
  gg: 'Gas Giant',
  // 'GasGiantWithAmmoniaBasedLife',
  // 'GasGiantWithWaterBasedLife',
  // 'HeliumGasGiant',
  // 'HeliumRichGasGiant',
  hmc: 'High Metal Content Body',
  ib: 'Icy Body',
  mrb: 'Metal Rich Body',
  rb: 'Rock Body',
  rib: 'Rocky Ice Body',
  // 'SudarskyClassIGasGiant',
  // 'SudarskyClassIIGasGiant',
  // 'SudarskyClassIIIGasGiant',
  // 'SudarskyClassIVGasGiant',
  // 'SudarskyClassVGasGiant',
  wg: 'Water Giant',
  ww: 'Water World',
  // 'Water Giant With Life',
  ac: 'Asteroid cluster',
};


