import { User } from '../types';

export async function getAuthToken(interactive: boolean = true): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive }, (token: any) => {
      if (chrome.runtime.lastError) {
        console.error('Auth Error:', chrome.runtime.lastError);
        resolve(null);
      } else {
        const actualToken = typeof token === 'string' ? token : token?.token;
        resolve(actualToken || null);
      }
    });
  });
}

export async function getUserProfile(token: string): Promise<User | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function clearAuthToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      resolve();
    });
  });
}

// Removing the cached token doesn't take back the Google permission, so Chrome would
// mint a fresh token on the next silent check and sign the person straight back in.
// This remembers that they signed out until they choose to sign in again.
const SIGNED_OUT_KEY = 'signedOut';

export async function signIn(): Promise<string | null> {
  const token = await getAuthToken(true);
  if (token) {
    await chrome.storage.local.remove(SIGNED_OUT_KEY);
  }
  return token;
}

export async function signOut(token: string | null): Promise<void> {
  await chrome.storage.local.set({ [SIGNED_OUT_KEY]: true });
  if (token) {
    await clearAuthToken(token);
  }
}

export async function getSilentAuthToken(): Promise<string | null> {
  const data = await chrome.storage.local.get(SIGNED_OUT_KEY);
  if (data[SIGNED_OUT_KEY]) return null;
  return getAuthToken(false);
}
