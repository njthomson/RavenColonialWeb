import { CmdrSummary } from "../types";
import { callAPI } from "./api-util";

/** Fleet Carrier APIs */
export const cmdr = {

  getSummary: async (cmdr: string): Promise<CmdrSummary> => {
    return await callAPI<CmdrSummary>(`/api/cmdr/${encodeURIComponent(cmdr)}/summary`);
  },

  getPrimary: async (cmdr: string): Promise<string> => {
    return await callAPI<string>(`/api/cmdr/${encodeURIComponent(cmdr)}/primary`);
  },

  setPrimary: async (cmdr: string, buildId: string): Promise<void> => {
    await callAPI<CmdrSummary>(`/api/cmdr/${encodeURIComponent(cmdr)}/primary/${buildId}`, 'PUT');
  },

};
