import { Cargo, KnownFC, Project } from "../types";
import { callAPI } from "./api-util";

/** Chain APIs */
export const nexus = {

  create: async (name: string): Promise<Nexus> => {
    return await callAPI<Nexus>(`/api/chain/create`, 'PUT', JSON.stringify({ name: name }));
  },

  delete: async (id: string): Promise<Nexus> => {
    return await callAPI<Nexus>(`/api/chain/delete/${encodeURIComponent(id)}`, 'DELETE');
  },

  get: async (id: string): Promise<Nexus> => {
    return await callAPI<Nexus>(`/api/chain/${encodeURIComponent(id)}`);
  },

  setName: async (id: string, name: string): Promise<Nexus> => {
    return await callAPI<Nexus>(`/api/chain/${encodeURIComponent(id)}/setName`, 'POST', JSON.stringify(name));
  },

  setPrivate: async (id: string, isPrivate: boolean): Promise<Nexus> => {
    return await callAPI<Nexus>(`/api/chain/${encodeURIComponent(id)}/setPrivate`, 'POST', JSON.stringify(isPrivate));
  },

  setCmdrs: async (id: string, cmdrs: string[]): Promise<Nexus> => {
    return await callAPI<Nexus>(`/api/chain/${encodeURIComponent(id)}/setCmdrs`, 'POST', JSON.stringify(cmdrs));
  },

  setFCs: async (id: string, marketIDs: number[]): Promise<Nexus> => {
    return await callAPI<Nexus>(`/api/chain/${encodeURIComponent(id)}/setFCs`, 'POST', JSON.stringify(marketIDs));
  },

  setSysFCs: async (id: string, id64: number, marketIDs: number[]): Promise<Nexus> => {
    return await callAPI<Nexus>(`/api/chain/${encodeURIComponent(id)}/${encodeURIComponent(id64.toString())}/setFCs`, 'POST', JSON.stringify(marketIDs));
  },

  setSystems: async (id: string, systemNames: string[]): Promise<Nexus> => {
    return await callAPI<Nexus>(`/api/chain/${encodeURIComponent(id)}/setSystems`, 'POST', JSON.stringify(systemNames));
  },

};

export type Nexus = {
  id: string;
  name: string;
  open: boolean;
  owner: string;
  cmdrs: string[];
  fcs: KnownFC[];
  systems: NexusSys[];
  hubs: number[];
}

export type NexusSys = {
  id64: number;
  name: string;
  nickname: string;
  pos: number[];
  type: NexusType
  /** Grand total count of cargo needed for this system */
  total: number;
  /** Grand total count of cargo already delivered for this system */
  progress: number;
  /** Cargo needed for this system */
  needs?: Cargo;
  fcs: number[];
  builds: Project[];
}

export enum NexusType {
  bridge = 'bridge',
  hub = 'hub',
}
