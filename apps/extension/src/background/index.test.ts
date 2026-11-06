import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadBackground() {
  vi.resetModules();
  const listeners: {
    command?: (command: string) => Promise<void>;
    message?: (request: unknown, sender: unknown, sendResponse?: (response: unknown) => void) => unknown;
  } = {};
  const chromeStub = {
    commands: { onCommand: { addListener: (fn: typeof listeners.command) => { listeners.command = fn; } } },
    runtime: { onMessage: { addListener: (fn: typeof listeners.message) => { listeners.message = fn; } } },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 7 }]),
      sendMessage: vi.fn().mockResolvedValue({ ok: true })
    },
    action: { setBadgeText: vi.fn(), setTitle: vi.fn() },
    storage: { local: { get: vi.fn().mockResolvedValue({}), set: vi.fn() } }
  };
  vi.stubGlobal('chrome', chromeStub);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ domains: { 'github.com': 2 } }) }));
  await import('./index');
  return { listeners, chromeStub };
}

describe('background', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks the active tab to start the binder', async () => {
    const { listeners, chromeStub } = await loadBackground();

    await listeners.command!('activate-binder');

    expect(chromeStub.tabs.sendMessage).toHaveBeenCalledWith(7, { action: 'toggle-binder' });
    expect(chromeStub.action.setBadgeText).not.toHaveBeenCalled();
  });

  it('flags the tab when no content script answers', async () => {
    const { listeners, chromeStub } = await loadBackground();
    chromeStub.tabs.sendMessage.mockRejectedValue(new Error('Receiving end does not exist.'));

    await listeners.command!('activate-binder');

    expect(chromeStub.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: '!' });
    expect(chromeStub.action.setTitle).toHaveBeenCalledWith(expect.objectContaining({ tabId: 7 }));
  });

  it('relays broadcasts to every frame of the sending tab', async () => {
    const { listeners, chromeStub } = await loadBackground();
    const message = { action: 'run-shortcut' };

    listeners.message!({ action: 'broadcast', message }, { tab: { id: 3 } });

    expect(chromeStub.tabs.sendMessage).toHaveBeenCalledWith(3, message);
  });

  describe('checking for community packs', () => {
    const check = (listeners: Awaited<ReturnType<typeof loadBackground>>['listeners'], domain: string) =>
      new Promise(resolve => listeners.message!({ action: 'check-shortcuts', domain }, {}, resolve));

    it('finds the count without telling the server which site is open', async () => {
      const { listeners } = await loadBackground();

      expect(await check(listeners, 'github.com')).toEqual({ count: 2 });

      const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
      expect(urls).toHaveLength(1);
      expect(urls[0]).not.toContain('github.com');
    });

    it('reports nothing for sites with no packs', async () => {
      const { listeners } = await loadBackground();

      expect(await check(listeners, 'unknown.test')).toEqual({ count: 0 });
    });

    it('reuses a recent list instead of fetching on every page', async () => {
      const { listeners, chromeStub } = await loadBackground();
      chromeStub.storage.local.get.mockResolvedValue({
        communityDomains: { counts: { 'github.com': 5 }, fetchedAt: Date.now() }
      });

      expect(await check(listeners, 'github.com')).toEqual({ count: 5 });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('refreshes a stale list', async () => {
      const { listeners, chromeStub } = await loadBackground();
      chromeStub.storage.local.get.mockResolvedValue({
        communityDomains: { counts: { 'github.com': 5 }, fetchedAt: 0 }
      });

      expect(await check(listeners, 'github.com')).toEqual({ count: 2 });
    });

    it('falls back to the last list when the backend is down, and waits before retrying', async () => {
      const { listeners, chromeStub } = await loadBackground();
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      chromeStub.storage.local.get.mockResolvedValue({
        communityDomains: { counts: { 'github.com': 5 }, fetchedAt: 0 }
      });
      vi.mocked(fetch).mockRejectedValue(new Error('offline'));

      expect(await check(listeners, 'github.com')).toEqual({ count: 5 });
      expect(chromeStub.storage.local.set).toHaveBeenCalledWith({
        communityDomains: { counts: { 'github.com': 5 }, fetchedAt: expect.any(Number) }
      });
    });
  });

  it('survives a tab closing mid-relay', async () => {
    const { listeners, chromeStub } = await loadBackground();
    chromeStub.tabs.sendMessage.mockRejectedValue(new Error('No tab with id: 3.'));

    expect(() => listeners.message!({ action: 'broadcast', message: {} }, { tab: { id: 3 } })).not.toThrow();
  });
});
