
import { store } from "../local-storage";
import { SysEffects } from "../site-data";
import { EconomyMap, TierPoints } from "../system-model2";
import { BodyFeature, ReserveLevel } from "../types";
import { Bod, Pop, Site, Sys } from "../types2";
import { callAPI } from "./api-util";

/** System level APIs */
export const systemV2 = {
  currentSchemaVersion: 5,
  cache: {
    sys: {} as Record<string, Sys>,
    economies: {} as Record<string, GetRealEconomies[]>,
    snapshots: {} as Record<string, SysSnapshot[]>,
  },

  getSys: async (nameOrNum: string, force?: boolean, rev?: number): Promise<Sys> => {
    if (!force) {
      const match = Object.values(systemV2.cache.sys).find(s => s.name === nameOrNum || s.id64.toString() === nameOrNum);
      if (match) { return match; }
    }

    if (rev) {
      // do not cache older revisions
      const result = await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(nameOrNum)}/.${rev}`);
      return result;
    }

    const result = await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(nameOrNum)}`);
    systemV2.cache.sys[result.id64] = result;
    return result;
  },

  getBodies: async (systemName: string): Promise<Site> => {
    return await callAPI<Site>(`/api/v2/system/${encodeURIComponent(systemName)}/bodies`);
  },

  updateBodyFeatures: async (nameOrNum: string, bodyNum: number, features: BodyFeature[]): Promise<Bod[]> => {
    return await callAPI<Bod[]>(`/api/v2/system/${encodeURIComponent(nameOrNum)}/${bodyNum}/features`, 'PUT', JSON.stringify(features));
  },

  saveSites: async (nameOrNum: string, data: SitesPut): Promise<Sys> => {
    return await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(nameOrNum)}/sites`, 'PUT', JSON.stringify(data));
  },

  import: async (nameOrNum: string, type?: string): Promise<Sys> => {
    return await callAPI<Sys>(`/api/v2/system/${encodeURIComponent(nameOrNum)}/import/${type ?? ''}`, 'POST');
  },

  getRealEconomies: async (nameOrNum: string, force?: boolean): Promise<GetRealEconomies[]> => {
    if (nameOrNum in systemV2.cache.economies && !force) { return systemV2.cache.economies[nameOrNum]; }

    const result = await callAPI<GetRealEconomies[]>(`/api/v2/system/${encodeURIComponent(nameOrNum)}/spanshEconomies`);
    systemV2.cache.economies[nameOrNum] = result;
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

  refreshPop: async (id64: number): Promise<Pop> => {
    return await callAPI<Pop>(`/api/v2/system/${encodeURIComponent(id64)}/refreshPop`, 'POST');
  },

  popHistory: async (id64: number): Promise<History[]> => {
    return await callAPI<History[]>(`/api/v2/system/${encodeURIComponent(id64)}/popHistory`);
  },
};

export interface BodyPut {
  num: number;
  features?: BodyFeature[];
}

export interface SitesPut {
  update: Site[];
  delete: string[];
  orderIDs?: string[];
  architect?: string;
  reserveLevel?: ReserveLevel;
  snapshot?: SysSnapshot;
  slots?: Record<number, number[]>,
  open?: boolean;
}

export interface GetRealEconomies {
  id: number | string;
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
  stale?: boolean;
  pop?: Pop;
  pendingPop?: boolean;
  score: number;
}

export interface History {
  time: string;
  event: HistoryEvent;
  json: string;
}

export enum HistoryEvent {
  pop = 'pop',
  build = 'build',
}
