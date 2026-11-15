import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSilentAuthToken, signIn, signOut } from './auth';

// Like Chrome: once someone has allowed Highkey, getAuthToken keeps minting tokens
// without any UI, even after the cached one is removed
function stubChrome() {
  const store: Record<string, unknown> = {};
  const chromeStub = {
    storage: {
      local: {
        get: vi.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(store, items); }),
        remove: vi.fn(async (key: string) => { delete store[key]; })
      }
    },
    identity: {
      getAuthToken: vi.fn((_options: unknown, callback: (token?: string) => void) => callback('token-1')),
      removeCachedAuthToken: vi.fn((_details: unknown, callback: () => void) => callback())
    },
    runtime: {} as { lastError?: unknown }
  };
  vi.stubGlobal('chrome', chromeStub);
  return chromeStub;
}

describe('signing in and out', () => {
  let chromeStub: ReturnType<typeof stubChrome>;

  beforeEach(() => {
    chromeStub = stubChrome();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores the session without UI when the person has not signed out', async () => {
    expect(await getSilentAuthToken()).toBe('token-1');
    expect(chromeStub.identity.getAuthToken).toHaveBeenCalledWith({ interactive: false }, expect.any(Function));
  });

  it('stays signed out on the next load, although Chrome could still mint a token', async () => {
    await signOut('token-1');

    expect(chromeStub.identity.removeCachedAuthToken).toHaveBeenCalledWith({ token: 'token-1' }, expect.any(Function));
    expect(await getSilentAuthToken()).toBeNull();
    expect(chromeStub.identity.getAuthToken).not.toHaveBeenCalled();
  });

  it('restores sessions again after the person signs back in', async () => {
    await signOut('token-1');

    expect(await signIn()).toBe('token-1');
    expect(chromeStub.identity.getAuthToken).toHaveBeenCalledWith({ interactive: true }, expect.any(Function));
    expect(await getSilentAuthToken()).toBe('token-1');
  });

  it('stays signed out when the person closes the account picker', async () => {
    await signOut('token-1');
    chromeStub.identity.getAuthToken.mockImplementation((_options, callback) => callback(undefined));

    expect(await signIn()).toBeNull();
    chromeStub.identity.getAuthToken.mockImplementation((_options, callback) => callback('token-1'));
    expect(await getSilentAuthToken()).toBeNull();
  });
});
