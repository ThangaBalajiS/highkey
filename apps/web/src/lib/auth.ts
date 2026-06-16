import { User } from '@highkey/types';

export async function validateGoogleToken(token: string): Promise<User | null> {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
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
    console.error('Token validation error:', error);
    return null;
  }
}
