import { Cargo, KnownFC, Project } from "../types";
import { callAPI } from "./api-util";

/** Chain APIs */
export const chain = {

  create: async (name: string): Promise<Chain> => {
    return await callAPI<Chain>(`/api/chain/create`, 'PUT', JSON.stringify({ name: name }));
  },

  delete: async (id: string): Promise<Chain> => {
    return await callAPI<Chain>(`/api/chain/delete/${encodeURIComponent(id)}`, 'DELETE');
  },

  get: async (id: string): Promise<Chain> => {
    return await callAPI<Chain>(`/api/chain/${encodeURIComponent(id)}`);
  },

  setCmdrs: async (id: string, cmdrs: string[]): Promise<Chain> => {
    return await callAPI<Chain>(`/api/chain/${encodeURIComponent(id)}/setCmdrs`, 'POST', JSON.stringify(cmdrs));
  },

  setFCs: async (id: string, marketIDs: number[]): Promise<Chain> => {
    return await callAPI<Chain>(`/api/chain/${encodeURIComponent(id)}/setFCs`, 'POST', JSON.stringify(marketIDs));
  },

  setSysFCs: async (id: string, id64: number, marketIDs: number[]): Promise<Chain> => {
    return await callAPI<Chain>(`/api/chain/${encodeURIComponent(id)}/${encodeURIComponent(id64.toString())}/setFCs`, 'POST', JSON.stringify(marketIDs));
  },

  setSystems: async (id: string, systemNames: string[]): Promise<Chain> => {
    return await callAPI<Chain>(`/api/chain/${encodeURIComponent(id)}/setSystems`, 'POST', JSON.stringify(systemNames));
  },

};

export type Chain = {
  id: string;
  name: string;
  open: boolean;
  owner: string;
  cmdrs: string[];
  fcs: KnownFC[];
  systems: ChainSys[];
  hubs: number[];
}

export type ChainSys = {
  id64: number;
  name: string;
  nickname: string;
  pos: number[];
  type: ChainType
  /** Grand total count of cargo needed for this system */
  total: number;
  /** Grand total count of cargo already delivered for this system */
  progress: number;
  /** Cargo needed for this system */
  needs?: Cargo;
  fcs: number[];
  builds: Project[];
}

export enum ChainType {
  bridge = 'bridge',
  hub = 'hub',
}
