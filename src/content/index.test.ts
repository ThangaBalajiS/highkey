// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isTop: true,
  activate: vi.fn(),
  yieldTo: vi.fn(),
  runShortcut: vi.fn()
}));

vi.mock('./frame', () => ({ isTopFrame: () => mocks.isTop }));
vi.mock('./selector', () => ({
  VisualSelector: class {
    activate = mocks.activate;
    yieldTo = mocks.yieldTo;
  }
}));
vi.mock('./engine', () => ({
  ShortcutEngine: class {
    start = vi.fn();
    runShortcut = mocks.runShortcut;
  }
}));

type Listener = (request: object, sender: object, sendResponse: (response: unknown) => void) => void;

async function loadContentScript(isTop: boolean) {
  vi.resetModules();
  mocks.isTop = isTop;
  let listener: Listener | undefined;
  const sendMessage = vi.fn();
  vi.stubGlobal('chrome', {
    runtime: { sendMessage, onMessage: { addListener: (fn: Listener) => { listener = fn; } } }
  });
  await import('./index');
  return { send: (request: object, sendResponse = vi.fn()) => listener!(request, {}, sendResponse), sendMessage };
}

describe('content script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('checks for community packs from the top frame', async () => {
    const { sendMessage } = await loadContentScript(true);
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'check-shortcuts' }), expect.any(Function));
  });

  it('leaves that check out of iframes, so a page only asks once', async () => {
    const { sendMessage } = await loadContentScript(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('previews a pack from the top frame only', async () => {
    const preview = { action: 'preview-package', shortcuts: [] };

    (await loadContentScript(false)).send(preview);
    expect(document.body.textContent).not.toContain('Previewing');

    (await loadContentScript(true)).send(preview);
    expect(document.body.textContent).toContain('Previewing');
  });

  it('confirms it is reachable when asked to start the binder', async () => {
    const { send } = await loadContentScript(true);
    const sendResponse = vi.fn();

    send({ action: 'toggle-binder' }, sendResponse);

    expect(mocks.activate).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('routes the messages other frames relay through the background', async () => {
    const { send } = await loadContentScript(false);
    const combo = { key: 'k' };

    send({ action: 'run-shortcut', combo });
    send({ action: 'binder-claimed', frameId: 'frame-2' });

    expect(mocks.runShortcut).toHaveBeenCalledWith(combo);
    expect(mocks.yieldTo).toHaveBeenCalledWith('frame-2');
  });
});
