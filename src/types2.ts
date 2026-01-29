import { BodyFeature, ReserveLevel } from "./types";

/** Represents an architected system system */
export interface Sys {
  v: number;
  rev: number;
  name: string;
  nickname?: string;
  saveName?: string;
  notes?: string;
  id64: number;
  architect: string;
  pos: number[];
  reserveLevel: ReserveLevel;
  primaryPortId?: string;
  bodies: Bod[];
  sites: Site[];
  deleteIDs?: string[];
  updateIDs?: string[];
  slots: Record<number, number[]>;
  revs: Rev[];
  savedNames?: NamedSave[];
  pop?: Pop;
  open?: boolean;
  idxCalcLimit?: number;
  // editors?: string[];
}

export interface Pop {
  pop: number;
  timeSpansh: string;
  timeSaved: string;
}

/** Info about a saved revision */
export interface Rev {
  rev: number;
  cmdr: string;
  time: string;
}

/** Info about a named save */
export interface NamedSave {
  name: string;
  cmdr: string;
  time: string;
}

/** Represents a body in a system */
export interface Bod {
  name: string;
  num: number;
  distLS: number;
  parents: number[];
  type: BT;
  subType: string;
  features: BodyFeature[];
  radius: number;
  temp: number;
  gravity: number;
}

/** Body Type */
export enum BT {
  /** unknown */
  un = 'un',
  /** Black Hole */
  bh = 'bh',
  /** Neutron Star */
  ns = 'ns',
  /** White Dwarf */
  wd = 'wd',
  /** some kind of star */
  st = 'st',
  /** Ammonia World */
  aw = 'aw',
  /** Earth Like World */
  elw = 'elw',
  /** Gas Giant */
  gg = 'gg',
  /** High Metal Content Body */
  hmc = 'hmc',
  /** Icy Body */
  ib = 'ib',
  /** Metal Rich Body */
  mrb = 'mrb',
  /** Rock Body */
  rb = 'rb',
  /** Rocky Ice Body */
  ri = 'ri',
  /** Water Giant */
  wg = 'wg',
  /** Water World */
  ww = 'ww',
  /** Asteroid cluster */
  ac = 'ac',
  /** Barycentre */
  bc = 'bc',
}

export const mapBodyTypeNames: Record<BT, string> = {
  [BT.bh]: 'Black hole',
  [BT.ns]: 'Neutron star',
  [BT.wd]: 'White dwarf',
  [BT.st]: 'A star',
  [BT.aw]: 'Ammonia World',
  [BT.elw]: 'Earth Like Body',
  [BT.gg]: 'Gas Giant',
  [BT.hmc]: 'High Metal Content Body',
  [BT.ib]: 'Icy Body',
  [BT.mrb]: 'Metal Rich Body',
  [BT.rb]: 'Rock Body',
  [BT.ri]: 'Rocky Ice Body',
  [BT.wg]: 'Water Giant',
  [BT.ww]: 'Water World',
  [BT.ac]: 'Asteroid cluster',
  [BT.bc]: 'Barycentre',
  [BT.un]: 'Unknown',
};

/** Represents a station in a system */
export interface Site {
  id: string;
  buildId: string;
  marketId: number;
  name: string;
  bodyNum: number;
  buildType: string;
  notes?: string;
  status: BuildStatus
}

export type BuildStatus = 'plan' | 'build' | 'complete' | 'demolish';

export const mapStatus = {
  plan: 'Planning',
  build: 'Building',
  complete: 'Complete',
  demolish: 'Demolish',
}

export type SiteGraphType = 'links' | 'major' | 'all' | 'none';

export const mapSiteGraphType = {
  links: 'Links',
  major: 'Ports',
  all: 'All',
  none: 'None',
}

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


