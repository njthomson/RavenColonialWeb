import { CmdrSummary } from "../types";
import { callAPI } from "./api-util";

/** Fleet Carrier APIs */
export const cmdr = {

  getSummary: async (cmdr: string): Promise<CmdrSummary> => {
    return await callAPI<CmdrSummary>(`/api/cmdr/${encodeURIComponent(cmdr)}/summary`);
  },

};
