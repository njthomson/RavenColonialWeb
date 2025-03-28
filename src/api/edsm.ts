import { ResponseEdsmStations, ResponseEdsmSystem } from "../types";
import { callSvcAPI } from "./api-util";

/** Project APIs */
export const edsm = {

  findStationsInSystem: async (systemName: string): Promise<ResponseEdsmStations> => {
    return await callSvcAPI<ResponseEdsmStations>(new URL('https://www.edsm.net/api-system-v1/stations?systemName=' + encodeURIComponent(systemName)));
  },

  findSystem: async (systemName: string): Promise<ResponseEdsmSystem> => {
    return await callSvcAPI<ResponseEdsmSystem>(new URL('https://www.edsm.net/api-v1/system?showCoordinates=1&systemName=' + encodeURIComponent(systemName)));
  },
};
