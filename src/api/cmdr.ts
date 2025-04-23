import { CmdrSummary, KnownFC, ProjectRef } from "../types";
import { callAPI } from "./api-util";

/** Fleet Carrier APIs */
export const cmdr = {

  // getSummary: async (cmdr: string): Promise<CmdrSummary> => {
  //   return await callAPI<CmdrSummary>(`/api/cmdr/${encodeURIComponent(cmdr)}/summary`);
  // },

  // getProjects: async (cmdr: string): Promise<CmdrSummary> => {
  //   return await callAPI<CmdrSummary>(`/api/cmdr/${encodeURIComponent(cmdr)}/`);
  // },

  getProjectRefs: async (cmdr: string): Promise<ProjectRef[]> => {
    return await callAPI<ProjectRef[]>(`/api/cmdr/${encodeURIComponent(cmdr)}/refs`);
  },

  getActiveAssignments: async (cmdr: string): Promise<Record<string, Record<string, number>>> => {
    return await callAPI<Record<string, Record<string, number>>>(`/api/cmdr/${encodeURIComponent(cmdr)}/assigned/active`);
  },

  getPrimary: async (cmdr: string): Promise<string> => {
    return await callAPI<string>(`/api/cmdr/${encodeURIComponent(cmdr)}/primary`);
  },

  setPrimary: async (cmdr: string, buildId: string): Promise<void> => {
    await callAPI<CmdrSummary>(`/api/cmdr/${encodeURIComponent(cmdr)}/primary/${buildId}`, 'PUT');
  },

  clearPrimary: async (cmdr: string): Promise<void> => {
    await callAPI<CmdrSummary>(`/api/cmdr/${encodeURIComponent(cmdr)}/primary/`, 'DELETE');
  },

  getCmdrLinkedFCs: async (cmdr: string): Promise<KnownFC[]> => {
    return await callAPI<KnownFC[]>(`/api/cmdr/${encodeURIComponent(cmdr)}/fc`);
  },

  linkFC: async (cmdr: string, marketId: string): Promise<void> => {
    return await callAPI<void>(`/api/cmdr/${encodeURIComponent(cmdr)}/fc/${encodeURIComponent(marketId)}`, 'PUT');
  },

  unlinkFC: async (cmdr: string, marketId: string): Promise<void> => {
    return await callAPI<void>(`/api/cmdr/${encodeURIComponent(cmdr)}/fc/${encodeURIComponent(marketId)}`, 'DELETE');
  },

};
