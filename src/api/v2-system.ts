
import { EconomyMap } from "../system-model2";
import { BodyFeature, ReserveLevel } from "../types";
import { Bod, Site, Sys } from "../types2";
import { callAPI } from "./api-util";

/** System level APIs */
export const systemV2 = {
  currentSchemaVersion: 3,
  cache: {
    sys: {} as Record<string, Sys>,
    economies: {} as Record<string, GetRealEconomies[]>,
  },

  getSys: async (systemName: string, force?: boolean): Promise<Sys> => {
    if (systemName in systemV2.cache.sys && !force) { return systemV2.cache.sys[systemName]; }

    const result = await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(systemName)}`);
    systemV2.cache.sys[systemName] = result;
    return result;
  },

  getBodies: async (systemName: string): Promise<Site> => {
    return await callAPI<Site>(`/api/v2/system/${encodeURIComponent(systemName)}/bodies`);
  },

  updateBody: async (systemName: string, data: BodyPut): Promise<Bod[]> => {
    return await callAPI<Bod[]>(`/api/v2/system/${encodeURIComponent(systemName)}/bodies`, 'PUT', JSON.stringify(data));
  },

  saveSites: async (id64OrName: string, data: SitesPut): Promise<Sys> => {
    return await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(id64OrName)}/sites`, 'PUT', JSON.stringify(data));
  },

  import: async (systemName: string, type?: string): Promise<Sys> => {
    return await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(systemName)}/import/${type ?? ''}`, 'POST');
  },

  getRealEconomies: async (id64OrName: string, force?: boolean): Promise<GetRealEconomies[]> => {
    if (id64OrName in systemV2.cache.economies && !force) { return systemV2.cache.economies[id64OrName]; }

    const result = await callAPI<GetRealEconomies[]>(`/api/v2/system/${encodeURIComponent(id64OrName)}/spanshEconomies`);
    systemV2.cache.economies[id64OrName] = result;
    return result;
  },
};

export interface BodyPut {
  num: number;
  features?: BodyFeature[];
}

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