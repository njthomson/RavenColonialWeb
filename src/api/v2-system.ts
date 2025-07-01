
import { EconomyMap } from "../system-model2";
import { ReserveLevel } from "../types";
import { Site, Sys } from "../types2";
import { callAPI } from "./api-util";

/** System level APIs */
export const systemV2 = {
  currentSchemaVersion: 3,

  getSys: async (systemName: string): Promise<Sys> => {
    return await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(systemName)}`);
  },

  getBodies: async (systemName: string): Promise<Site> => {
    return await callAPI<Site>(`/api/v2/system/${encodeURIComponent(systemName)}/bodies`);
  },

  saveSites: async (id64OrName: string, data: SitesPut): Promise<Sys> => {
    return await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(id64OrName)}/sites`, 'PUT', JSON.stringify(data));
  },

  import: async (systemName: string, type?: string): Promise<Sys> => {
    return await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(systemName)}/import/${type}`, 'POST');
  },

  getRealEconomies: async (id64OrName: string): Promise<GetRealEconomies[]> => {
    return await callAPI<GetRealEconomies[]>(`/api/v2/system/${encodeURIComponent(id64OrName)}/spanshEconomies`);
  },
};

export interface SitesPut {
  update: Site[];
  delete: string[];
  orderIDs: string[];
  architect?: string;
  reserveLevel?: ReserveLevel;
}

export interface GetRealEconomies {
  id: string;
  updated: string;
  economies: EconomyMap;
}