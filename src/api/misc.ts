import { callAPI } from "./api-util";

/** misc APIs */
export const misc = {

  feedback: async (feedback: FeedbackBody): Promise<void> => {
    return await callAPI<void>(`/api/misc/feedback`, 'POST', JSON.stringify(feedback));
  },
};

export interface FeedbackBody {
  subject: string;
  contact?: string;
  message: string;
  images?: string[]; // base64 encoded images
}