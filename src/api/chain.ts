import { Cargo, KnownFC, Project } from "../types";
import { callAPI } from "./api-util";

/** Chain APIs */
export const chain = {

  create: async (name: string): Promise<Chain> => {
    return await callAPI<Chain>(`/api/chain/create`, 'PUT', JSON.stringify({ name: name }));
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

  setSystems: async (id: string, systemNames: string[]): Promise<Chain> => {
    return await callAPI<Chain>(`/api/chain/${encodeURIComponent(id)}/setSystems`, 'POST', JSON.stringify(systemNames));
  },

};

export type Chain = {
  id: string;
  name: string;
  open: boolean;
  cmdrs: string[];
  fcs: KnownFC[];
  systems: ChainSys[];
  hubs: number[];
  builds: Project[];
}

export type ChainSys = {
  id64: number;
  name: string;
  nickname: string;
  pos: number[];
  type: ChainType
  total: number;
  progress: number;
  needs?: Cargo;
}

export enum ChainType {
  bridge = 'bridge',
  hub = 'hub',
}
