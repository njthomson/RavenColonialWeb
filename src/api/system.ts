import { ProjectRef, ProjectRefComplete } from "../types";
import { callAPI } from "./api-util";

/** System level APIs */
export const system = {

  findBySystem: async (systemName: string): Promise<ProjectRef[]> => {
    return await callAPI<ProjectRef[]>(`/api/system/${encodeURIComponent(systemName)}`);
  },

  findCompletedBySystem: async (systemName: string): Promise<ProjectRefComplete[]> => {
    return await callAPI<ProjectRefComplete[]>(`/api/system/${encodeURIComponent(systemName)}/complete`);
  },

  findAllBySystem: async (systemName: string): Promise<ProjectRef[]> => {
    return await callAPI<ProjectRef[]>(`/api/system/${encodeURIComponent(systemName)}/all`);
  },

  loadMocks: async (systemName: string): Promise<MockMinPayload> => {
    return await callAPI<MockMinPayload>(`/api/system/${encodeURIComponent(systemName)}/mocks`);
  },

  saveMocks: async (systemName: string, payload: MockMinPayload): Promise<string> => {
    return await callAPI<string>(`/api/system/${encodeURIComponent(systemName)}/mocks`, 'POST', JSON.stringify(payload));
  },

};

export interface MockMinPayload {
  etag: string;
  mocks: MockMin[];
}

export interface MockMin {
  buildId: string;
  buildType: string;
  buildName: string;
  bodyName: string;
  timeCompleted: string;
  isPrimaryPort: boolean;
}