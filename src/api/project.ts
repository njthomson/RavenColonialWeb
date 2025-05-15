import { Cargo, CreateProject, FindMarketsOptions, FoundMarkets, GlobalStats, Project, ProjectFC, ProjectRef, ProjectRefComplete, SupplyStatsSummary } from "../types";
import { callAPI } from "./api-util";

/** Project APIs */
export const project = {

  findBySystem: async (systemName: string): Promise<ProjectRef[]> => {
    return await callAPI<ProjectRef[]>(`/api/system/${encodeURIComponent(systemName)}`);
  },

  findCompletedBySystem: async (systemName: string): Promise<ProjectRefComplete[]> => {
    return await callAPI<ProjectRefComplete[]>(`/api/system/${encodeURIComponent(systemName)}/complete`);
  },

  findAllBySystem: async (systemName: string): Promise<ProjectRef[]> => {
    return await callAPI<ProjectRef[]>(`/api/system/${encodeURIComponent(systemName)}/all`);
  },

  create: async (project: CreateProject): Promise<Project> => {
    return await callAPI<Project>(
      `/api/project/`,
      'PUT',
      JSON.stringify(project)
    );
  },

  get: async (buildId: string): Promise<Project> => {
    return await callAPI<Project>(`/api/project/${encodeURIComponent(buildId)}`);
  },

  getStats: async (buildId: string): Promise<SupplyStatsSummary> => {
    return await callAPI<SupplyStatsSummary>(`/api/project/${encodeURIComponent(buildId)}/stats`);
  },

  update: async (buildId: string, deltaProj: Partial<Project>): Promise<Project> => {
    return await callAPI<Project>(
      `/api/project/${encodeURIComponent(buildId)}`,
      'PATCH',
      JSON.stringify(deltaProj)
    );
  },

  delete: async (buildId: string): Promise<void> => {
    // TODO: pass back what we get?
    return await callAPI<void>(`/api/project/${encodeURIComponent(buildId)}`, 'DELETE');
  },

  setDefaultCargo: async (buildId: string): Promise<Project> => {
    return await callAPI<Project>(`/api/project/${encodeURIComponent(buildId)}/cargo/default`, 'POST');
  },

  last: async (buildId: string): Promise<string> => {
    return await callAPI<string>(`/api/project/${encodeURIComponent(buildId)}/last`);
  },

  complete: async (buildId: string): Promise<Project> => {
    return await callAPI<Project>(`/api/project/${encodeURIComponent(buildId)}/complete`, 'POST');
  },

  linkCmdr: async (buildId: string, cmdr: string): Promise<void> => {
    // TODO: pass back what we get?
    return await callAPI<void>(`/api/project/${encodeURIComponent(buildId)}/link/${encodeURIComponent(cmdr)}`, 'PUT');
  },

  unlinkCmdr: async (buildId: string, cmdr: string): Promise<void> => {
    // TODO: pass back what we get?
    return await callAPI<void>(`/api/project/${encodeURIComponent(buildId)}/link/${encodeURIComponent(cmdr)}`, 'DELETE');
  },

  assignCmdr: async (buildId: string, cmdr: string, commodity: string): Promise<void> => {
    // TODO: pass back what we get?
    return await callAPI<void>(`/api/project/${encodeURIComponent(buildId)}/assign/${encodeURIComponent(cmdr)}/${encodeURIComponent(commodity)}/`, 'PUT');
  },

  unAssignCmdr: async (buildId: string, cmdr: string, commodity: string): Promise<void> => {
    // TODO: pass back what we get?
    return await callAPI<void>(`/api/project/${encodeURIComponent(buildId)}/assign/${encodeURIComponent(cmdr)}/${encodeURIComponent(commodity)}/`, 'DELETE');
  },

  setReady: async (buildId: string, commodities: string[], ready: boolean): Promise<void> => {
    // TODO: pass back what we get?
    return await callAPI<void>(
      `/api/project/${encodeURIComponent(buildId)}/ready`,
      ready ? 'DELETE' : 'POST',
      JSON.stringify(commodities)
    );
  },

  deliverToSite: async (buildId: string, cmdr: string, cargo: Cargo): Promise<Cargo> => {
    return await callAPI<Cargo>(
      `/api/project/${encodeURIComponent(buildId)}/supply/${encodeURIComponent(cmdr)}`,
      'POST',
      JSON.stringify(cargo)
    );
  },

  getCargoFC: async (buildId: string): Promise<Record<string, Cargo>> => {
    return await callAPI<Record<string, Cargo>>(`/api/project/${encodeURIComponent(buildId)}/fc/`);
  },

  /** Add a link between FC and a project */
  linkFC: async (buildId: string, marketId: string): Promise<ProjectFC[]> => {
    return await callAPI<ProjectFC[]>(`/api/project/${encodeURIComponent(buildId)}/fc/${encodeURIComponent(marketId)}`, 'PUT');
  },

  /** Remove a link between FC and a project */
  unlinkFC: async (buildId: string, marketId: number): Promise<ProjectFC[]> => {
    return await callAPI<ProjectFC[]>(`/api/project/${encodeURIComponent(buildId)}/fc/${encodeURIComponent(marketId)}`, 'DELETE');
  },

  globalStats: async (): Promise<GlobalStats> => {
    return await callAPI<GlobalStats>(`/api/stats/`);
  },

  findMarkets: async (buildId: string, options: FindMarketsOptions): Promise<FoundMarkets> => {
    return await callAPI<FoundMarkets>(`/api/project/${encodeURIComponent(buildId)}/markets`, 'POST', JSON.stringify(options));
  },
};
