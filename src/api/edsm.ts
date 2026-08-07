import { buildEdsmMarketIdByNormalizedName } from "../economy/compare/spansh-economy-resolve";
import { ResponseEdsmStations, ResponseEdsmSystem, ResponseEdsmSystemBodies, ResponseEdsmSystemFactions, ResponseEdsmTypeAhead } from "../types";
import { callSvcAPI } from "./api-util";

export interface EdsmMarketIdIndexResult {
  byName: Record<string, number>;
  stationCount: number;
  edsmSystemId?: number;
  error?: string;
}

/** EDSM APIs */
export const edsm = {

  findStationsInSystem: async (systemName: string, systemId?: number): Promise<ResponseEdsmStations> => {
    const url = new URL('https://www.edsm.net/api-system-v1/stations');
    url.searchParams.set('systemName', systemName);
    if (typeof systemId === 'number' && systemId > 0) {
      url.searchParams.set('systemId', String(systemId));
    }
    return await callSvcAPI<ResponseEdsmStations>(url);
  },

  getSystem: async (systemName: string): Promise<ResponseEdsmSystem> => {
    const url = new URL('https://www.edsm.net/api-v1/system');
    url.searchParams.set('systemName', systemName);
    url.searchParams.set('showCoordinates', '1');
    url.searchParams.set('showId', '1');
    return await callSvcAPI<ResponseEdsmSystem>(url);
  },

  /** Load EDSM station name → marketId index for Spansh compare (retries with systemId when needed). */
  loadMarketIdByName: async (systemName: string): Promise<EdsmMarketIdIndexResult> => {
    try {
      let data = await edsm.findStationsInSystem(systemName);
      if (!data?.stations?.length) {
        const sys = await edsm.getSystem(systemName);
        if (sys?.id) {
          data = await edsm.findStationsInSystem(systemName, sys.id);
        }
      }
      const byName = buildEdsmMarketIdByNormalizedName(data?.stations);
      return {
        byName,
        stationCount: data?.stations?.length ?? 0,
        edsmSystemId: data?.id,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('EDSM loadMarketIdByName failed:', systemName, message);
      return { byName: {}, stationCount: 0, error: message };
    }
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

};
