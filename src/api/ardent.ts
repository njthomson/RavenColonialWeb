import { callSvcAPI } from "./api-util";

/** Ardent APIs */
export const ardent = {

  getStation: async (stationName: string): Promise<any> => {
    return await callSvcAPI<any>(new URL('https://api.ardent-insight.com/v2/search/station/name/' + encodeURIComponent(stationName)));
  },

};
