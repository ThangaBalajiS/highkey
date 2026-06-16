import { User } from '@highkey/types';

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
