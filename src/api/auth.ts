import { store } from "../local-storage";
import { callAPI } from "./api-util";

const clientId = '2690fd97-4086-45dd-80e7-e3443be6ff5d';
const redirectUrl = 'https://ravencolonial.com/login';

export const redirectToFrontierAuth = async () => {
  const { codeVerifier, codeChallenge } = await generateCodeVerifierAndChallenge();

  const state = randomBase64();

  const params = new URLSearchParams({
    scope: 'auth capi',
    response_type: 'code',
    client_id: clientId,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
    redirect_uri: redirectUrl,
  });

  localStorage.setItem('auth1', JSON.stringify({ state, codeVerifier }));
  window.location.href = `https://auth.frontierstore.net/auth?${params.toString()}`;
};

export const processLoginCodes = async () => {
  try {
    console.log('Processing login codes');

    const params = new URLSearchParams(window.location.search.substring(1));
    const code = params.get('code')!;

    const storedAuth = localStorage.getItem('auth1') ?? '{}';
    const { codeVerifier } = JSON.parse(storedAuth);
    if (!code || !codeVerifier) {
      window.alert('Login failed');
      window.location.replace('/');
    }

    const body = asFormData({
      client_id: clientId,
      redirect_uri: redirectUrl,
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier
    });

    // fetch a token using the codes
    const response = await fetch('https://auth.frontierstore.net/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const json = await response.text();
    if (!response.ok) {
      console.error(`processLoginCodes: Failed to get tokens. HTTP: ${response.status} : ${response.statusText || json}`);
      return;
    }

    localStorage.setItem('auth2', json);
    console.log('Token acquired');

    // push these to our own service
    var data = await callAPI<{ key: string, cmdr: string }>(`/api/login/`, 'POST', json);
    if (data.key && data.key !== store.apiKey) {
      console.log(`API Key replaced`);
      store.apiKey = data.key
      store.cmdrName = data.cmdr;
    }

    // redirect again to clean up the query string
    localStorage.removeItem('auth1');
    window.location.assign('/user');
  } catch (err: any) {
    if (err.statusCode === 424) {
      // show special message for Epic users
      window.alert(`✋ Frontier/Epic account link expired?\n\nPlease start playing the game with your Epic account and try again.`);
    } else if (err.statusCode === 418) {
      window.alert(`Frontier servers appear to be offline. Please try again later.`);
    } else {
      // Otherwise, log raw error and show a generic error to users
      console.error(`processLoginCodes:`, err.stack);
      window.alert('Login failed');
      window.location.replace('/user');
    }
  }
};

export const resetApiKey = async () => {
  try {
    console.log('Resetting API key ...');

    var data = await callAPI<{ key: string, cmdr: string }>(`/api/login/reset`, 'POST');
    if (data.key && data.key !== store.apiKey) {
      console.log(`API Key replaced`);
      store.apiKey = data.key;
      store.cmdrName = data.cmdr;
    }
  } catch (err: any) {
    if (err.statusCode === 424) {
      // show special message for Epic users
      window.alert(`✋ Frontier/Epic account link expired?\n\nPlease start playing the game with your Epic account and try again.`);
    } else if (err.statusCode === 418) {
      window.alert(`Frontier servers appear to be offline. Please try again later.`);
    } else {
      // Otherwise, log raw error and show a generic error to users
      console.error(`resetApiKey:`, err.stack);
      window.alert(`There was an unexpected problem. Check console for more information.`);
    }
  }
}

const randomBase64 = (numberOfBytes = 32) => {
  const randomArray = new Uint8Array(numberOfBytes);
  crypto.getRandomValues(randomArray);

  return btoa(String.fromCharCode(...new Uint8Array(randomArray)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const generateCodeVerifierAndChallenge = async () => {
  const codeVerifier = [...Array(128)]
    .map(() => Math.random().toString(36)[2] || '0')
    .join('');
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return { codeVerifier, codeChallenge };
};

const asFormData = (obj: Record<string, string>) => {
  return Object.entries(obj).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
};

