import { RequestError } from "../types";

export const apiSvcUrl = //'https://localhost:7007'; /*
  'https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net'; // */

const logApiCalls = true;

export const callAPI = async <T>(uri: string, method: string = 'GET', body?: string): Promise<T> => {
  var url = new URL(uri, apiSvcUrl);
  return callSvcAPI<T>(url, method, body);
}

export const callSvcAPI = async <T>(url: URL, method: string = 'GET', body?: string): Promise<T> => {
  // optionally log the call we are making
  if (logApiCalls) { console.log(`calling: ${url}`); }

  const response = !body
    ? await fetch(url, { method })
    : await fetch(url, {
      method,
      body,
      headers: { 'Content-Type': 'application/json' }
    });

  if (response.status === 200) {
    const obj: T = await response.json();
    return obj;
  }
  else if (response.status === 202) {
    return undefined!;
  }

  // throw error is anything else
  const bodyText = await response.text();
  throw new RequestError(
    response.status,
    response.statusText,
    bodyText,
  );
};

