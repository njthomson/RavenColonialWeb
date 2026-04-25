import { CmdrPatch, CmdrSummary, CmdrView, KnownFC, Project, ProjectRef } from "../types";
import { callAPI } from "./api-util";
import { NexusSummary } from "./nexus";

/** Fleet Carrier APIs */
export const cmdr = {

  getCmdr: async (cmdr: string): Promise<CmdrView> => {
    return await callAPI<CmdrView>(`/api/cmdr/${encodeURIComponent(cmdr)}`);
  },

  updateCmdr: async (cmdr: string, newData: CmdrPatch): Promise<CmdrView> => {
    return await callAPI<CmdrView>(`/api/cmdr/${encodeURIComponent(cmdr)}`, 'PATCH', JSON.stringify(newData));
  },

  getProjectRefs: async (cmdr: string): Promise<ProjectRef[]> => {
    return await callAPI<ProjectRef[]>(`/api/cmdr/${encodeURIComponent(cmdr)}/refs`);
  },

  getActiveProjects: async (cmdr: string): Promise<Project[]> => {
    return await callAPI<Project[]>(`/api/cmdr/${encodeURIComponent(cmdr)}/active`);
  },

  getActiveAssignments: async (cmdr: string): Promise<Record<string, Record<string, number>>> => {
    return await callAPI<Record<string, Record<string, number>>>(`/api/cmdr/${encodeURIComponent(cmdr)}/assigned/active`);
  },

  getPrimary: async (cmdr: string): Promise<string> => {
    return await callAPI<string>(`/api/cmdr/${encodeURIComponent(cmdr)}/primary`);
  },

  getViewAll: async (): Promise<ViewAll> => {
    return await callAPI<ViewAll>(`/api/cmdr/viewAll`);
  },

  getHiddenIDs: async (cmdr: string): Promise<string[]> => {
    return await callAPI<string[]>(`/api/cmdr/${encodeURIComponent(cmdr)}/hiddenIDs`);
  },

  setHiddenIDs: async (cmdr: string, chosenIDs: string[]): Promise<string[]> => {
    return await callAPI<string[]>(`/api/cmdr/${encodeURIComponent(cmdr)}/hiddenIDs`, 'POST', JSON.stringify(chosenIDs));
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

  getAllLinkedFCs: async (cmdr: string): Promise<KnownFC[]> => {
    return await callAPI<KnownFC[]>(`/api/cmdr/${encodeURIComponent(cmdr)}/fc/all`);
  },

  linkFC: async (cmdr: string, marketId: string): Promise<void> => {
    return await callAPI<void>(`/api/cmdr/${encodeURIComponent(cmdr)}/fc/${encodeURIComponent(marketId)}`, 'PUT');
  },

  unlinkFC: async (cmdr: string, marketId: string): Promise<void> => {
    return await callAPI<void>(`/api/cmdr/${encodeURIComponent(cmdr)}/fc/${encodeURIComponent(marketId)}`, 'DELETE');
  },

  fetchMyFCs: async (): Promise<KnownFC[]> => {
    return await callAPI<KnownFC[]>(`/api/cmdr/fleetCarriers`, 'POST');
  },

  getMyNexus: async (): Promise<NexusSummary[]> => {
    return await callAPI<NexusSummary[]>(`/api/cmdr/nexus`);
  },
};

export interface ViewAll {
  projects: Project[];
  linkedFC: KnownFC[];
  hiddenIDs: string[];
}