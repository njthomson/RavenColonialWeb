import { ReserveLevel } from "../types";
import { callSvcAPI } from "./api-util";

/** Canonn APIs */
export const canonn = {

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
