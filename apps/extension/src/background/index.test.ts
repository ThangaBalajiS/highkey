import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadBackground() {
  vi.resetModules();
  const listeners: {
    command?: (command: string) => Promise<void>;
    message?: (request: unknown, sender: unknown) => void;
  } = {};
  const chromeStub = {
    commands: { onCommand: { addListener: (fn: typeof listeners.command) => { listeners.command = fn; } } },
    runtime: { onMessage: { addListener: (fn: typeof listeners.message) => { listeners.message = fn; } } },
    tabs: {
      query: vi.fn().mockResolvedValue([{ id: 7 }]),
      sendMessage: vi.fn().mockResolvedValue({ ok: true })
    },
    action: { setBadgeText: vi.fn(), setTitle: vi.fn() }
  };
  vi.stubGlobal('chrome', chromeStub);
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

  it('survives a tab closing mid-relay', async () => {
    const { listeners, chromeStub } = await loadBackground();
    chromeStub.tabs.sendMessage.mockRejectedValue(new Error('No tab with id: 3.'));

    expect(() => listeners.message!({ action: 'broadcast', message: {} }, { tab: { id: 3 } })).not.toThrow();
  });
});
