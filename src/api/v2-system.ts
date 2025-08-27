
import { store } from "../local-storage";
import { SysEffects } from "../site-data";
import { EconomyMap, TierPoints } from "../system-model2";
import { BodyFeature, ReserveLevel } from "../types";
import { Bod, Site, Sys } from "../types2";
import { callAPI } from "./api-util";

/** System level APIs */
export const systemV2 = {
  currentSchemaVersion: 5,
  cache: {
    sys: {} as Record<string, Sys>,
    economies: {} as Record<string, GetRealEconomies[]>,
    snapshots: {} as Record<string, SysSnapshot[]>,
  },

  getSys: async (systemName: string, force?: boolean, rev?: number): Promise<Sys> => {
    if (systemName in systemV2.cache.sys && !force) { return systemV2.cache.sys[systemName]; }

    if (rev) {
      // do not cache older revisions
      const result = await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(systemName)}/.${rev}`);
      return result;
    }

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

  getCmdrSnapshots: async (force?: boolean): Promise<SysSnapshot[]> => {
    const cmdr = store.cmdrName;
    if (cmdr in systemV2.cache.snapshots && !force) { return systemV2.cache.snapshots[cmdr]; }

    const result = await callAPI<SysSnapshot[]>(`/api/v2/system/snapshots/`);
    systemV2.cache.snapshots[cmdr] = result;
    return result;
  },

  getCmdrRevs: async (): Promise<Record<string, number>> => {
    return await callAPI<Record<string, number>>(`/api/v2/system/revs`);
  },

  getSnapshot: async (id64: number): Promise<SysSnapshot> => {
    return await callAPI<SysSnapshot>(`/api/v2/system/${encodeURIComponent(id64)}/snapshot`);
  },

  saveSnapshot: async (id64: number, data: SysSnapshot): Promise<void> => {
    return await callAPI<void>(`/api/v2/system/${encodeURIComponent(id64)}/snapshot`, 'PUT', JSON.stringify(data));
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
  snapshot?: SysSnapshot;
  slots?: Record<number, number[]>,
}

export interface GetRealEconomies {
  id: string;
  updated: string;
  economies: EconomyMap;
}

/** Represents an architected system system */
export interface SysSnapshot {
  v: number;
  architect: string;
  id64: number;
  name: string;
  pos: number[];
  sites: Site[];
  tierPoints: TierPoints;
  sumEffects: SysEffects;
}