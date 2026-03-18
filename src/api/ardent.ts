import { callSvcAPI } from "./api-util";

/** Ardent APIs */
export const ardent = {

  getStation: async (stationName: string): Promise<any> => {
    return await callSvcAPI<any>(new URL('https://api.ardent-insight.com/v2/search/station/name/' + encodeURIComponent(stationName)));
  },

  findSystem: async (systemName: string | undefined): Promise<ArdentSystem[]> => {
    if (!systemName) { return []; }
    return await callSvcAPI<ArdentSystem[]>(new URL('https://api.ardent-insight.com/v2/search/system/name/' + encodeURIComponent(systemName)));
  },

};

export interface ArdentSystem {
  systemAddress: number;
  systemName: string;
  systemX: number;
  systemY: number;
  systemZ: number;
  systemSector: string;
  updatedAt: string;
}