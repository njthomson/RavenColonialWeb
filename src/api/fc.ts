import { Cargo, KnownFC, QuickSearchStation } from "../types";
import { callAPI } from "./api-util";

/** Fleet Carrier APIs */
export const fc = {
  match: async (name: string): Promise<Record<string, string>> => {
    return await callAPI<Record<string, string>>(`/api/fc/match/${encodeURIComponent(name)}`);
  },

  find: async (name: string): Promise<QuickSearchStation[]> => {
    return await callAPI<QuickSearchStation[]>(`/api/fc/find/${encodeURIComponent(name)}`);
  },

  get: async (marketId: string): Promise<KnownFC> => {
    return await callAPI<KnownFC>(`/api/fc/${encodeURIComponent(marketId)}`);
  },

  updateFields: async (marketId: number, fields: { displayName: string }): Promise<KnownFC> => {
    return await callAPI<KnownFC>(
      `/api/fc/${encodeURIComponent(marketId)}`,
      'PATCH',
      JSON.stringify(fields)
    );
  },

  updateCargo: async (marketId: number, cargo: Cargo): Promise<Cargo> => {
    return await callAPI<Cargo>(
      `/api/fc/${encodeURIComponent(marketId)}/cargo`,
      'POST',
      JSON.stringify(cargo)
    );
  },

  deliverToFC: async (marketId: string, cargo: Cargo): Promise<Cargo> => {
    return await callAPI<Cargo>(
      `/api/fc/${encodeURIComponent(marketId)}/cargo`,
      'PATCH',
      JSON.stringify(cargo)
    );
  },

};
