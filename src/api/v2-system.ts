
import { Site, Sys } from "../types2";
import { callAPI } from "./api-util";

/** System level APIs */
export const systemV2 = {

  getSys: async (systemName: string): Promise<Sys> => {
    return await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(systemName)}`);
  },

  getBodies: async (systemName: string): Promise<Site> => {
    return await callAPI<Site>(`/api/v2/system/${encodeURIComponent(systemName)}/bodies`);
  },

  saveSites: async (id64OrName: string, data: SitesPut): Promise<Site[]> => {
    return await callAPI<Site[]>(`/api/v2/system/${encodeURIComponent(id64OrName)}/sites`, 'PUT', JSON.stringify(data));
  },
};

export interface SitesPut {
  update: Site[];
  delete: string[];
}