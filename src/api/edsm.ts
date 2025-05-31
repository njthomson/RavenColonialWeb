import { ReserveLevel, ResponseEdsmStations, ResponseEdsmSystem, ResponseEdsmSystemBodies, ResponseEdsmSystemFactions, ResponseEdsmTypeAhead } from "../types";
import { callSvcAPI } from "./api-util";

/** Project APIs */
export const edsm = {

  findStationsInSystem: async (systemName: string): Promise<ResponseEdsmStations> => {
    return await callSvcAPI<ResponseEdsmStations>(new URL('https://www.edsm.net/api-system-v1/stations?systemName=' + encodeURIComponent(systemName)));
  },

  getSystem: async (systemName: string): Promise<ResponseEdsmSystem> => {
    return await callSvcAPI<ResponseEdsmSystem>(new URL('https://www.edsm.net/api-v1/system?showCoordinates=1&systemName=' + encodeURIComponent(systemName)));
  },

  getSystemBodies: async (systemName: string): Promise<ResponseEdsmSystemBodies> => {
    return await callSvcAPI<ResponseEdsmSystemBodies>(new URL('https://www.edsm.net/api-system-v1/bodies?systemName=' + encodeURIComponent(systemName)));
  },

  findSystems: async (systemName: string): Promise<ResponseEdsmTypeAhead[]> => {
    return await callSvcAPI<ResponseEdsmTypeAhead[]>(new URL('https://www.edsm.net/typeahead/systems/query/' + encodeURIComponent(systemName)));
  },

  findSystemFactions: async (systemName: string): Promise<ResponseEdsmSystemFactions> => {
    return await callSvcAPI<ResponseEdsmSystemFactions>(new URL('https://www.edsm.net/api-system-v1/factions?systemName=' + encodeURIComponent(systemName)));
  },

  getCanonnBioStats: async (systemAddress: number): Promise<CanonnBioStatsResponseSystem> => {
    const response = await callSvcAPI<CanonnBioStatsResponse>(new URL('https://us-central1-canonn-api-236217.cloudfunctions.net/query/codex/biostats?id=' + encodeURIComponent(systemAddress)));
    return response.system;
  },

};

interface CanonnBioStatsResponse {
  system: CanonnBioStatsResponseSystem;
}

interface CanonnBioStatsResponseSystem {
  allegiance: string;
  bodies: CanonnBioStatsResponseBody[];
  bodyCount: number;
  // controllingFaction ?
  // coords ?
  date: string;
  government: string;
  id64: number;
  name: string;
  population: number;
  primaryEconomy: string;
  region: { name: string; region: number; };
  secondaryEconomy: string;
  security: string;
  // stations ?
}

interface CanonnBioStatsResponseBody {
  bodyId: number;
  id64: number;
  name: string;
  type: string;
  updateTime: string;

  parents?: Record<string, number>[];
  subType?: string;
  signals?: {
    updateTime: string;
    signals: Record<string, number>;
    geology?: string[];
  };
  reserveLevel?: ReserveLevel;
  volcanismType?: string;
  rings?: {
    innerRadius: number;
    outerRadius: number;
    mass: number;
    name: string;
    type: string;
  }[];

  terraformingState?: string;
  rotationalPeriodTidallyLocked?: boolean;
  // TODO: lots more ...
}
