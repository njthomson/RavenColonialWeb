import { ResponseEdsmStations, ResponseEdsmSystem, ResponseEdsmTypeAhead } from "../types";
import { callSvcAPI } from "./api-util";

/** Project APIs */
export const edsm = {

  findStationsInSystem: async (systemName: string): Promise<ResponseEdsmStations> => {
    return await callSvcAPI<ResponseEdsmStations>(new URL('https://www.edsm.net/api-system-v1/stations?systemName=' + encodeURIComponent(systemName)));
  },

  getSystem: async (systemName: string): Promise<ResponseEdsmSystem> => {
    return await callSvcAPI<ResponseEdsmSystem>(new URL('https://www.edsm.net/api-v1/system?showCoordinates=1&systemName=' + encodeURIComponent(systemName)));
  },

  findSystems: async (systemName: string): Promise<ResponseEdsmTypeAhead[]> => {
    return await callSvcAPI<ResponseEdsmTypeAhead[]>(new URL('https://www.edsm.net/typeahead/systems/query/' + encodeURIComponent(systemName)));
  },

};
