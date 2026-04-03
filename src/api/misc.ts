import { callAPI } from "./api-util";

/** misc APIs */
export const misc = {

  feedback: async (feedback: FeedbackBody): Promise<void> => {
    return await callAPI<void>(`/api/misc/feedback`, 'POST', JSON.stringify(feedback));
  },

  ggg: async (): Promise<GGGRow[]> => {
    return await callAPI<GGGRow[]>(`/api/ggg/json`, 'GET');
  },
};

export interface FeedbackBody {
  subject: string;
  contact?: string;
  message: string;
  images?: string[]; // base64 encoded images
}

export interface GGGRow {
  timeScan: string;
  id64: number;
  systemName: string;
  bodyName: string;
  bodyID: number;
  surfaceTemp: number;
  cmdr: string;
  tag: string;
  starPos: number[];
  journalJson: string;
}