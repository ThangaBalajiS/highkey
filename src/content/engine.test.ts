// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShortcutEngine } from './engine';
import { broadcastToTab } from './frame';

vi.mock('./frame', () => ({
  getSiteDomain: () => 'example.test',
  ownsShortcut: (s: { frameOrigin?: string }) => !s.frameOrigin,
  broadcastToTab: vi.fn()
}));

const combo = { key: 'k', ctrl: false, shift: false, alt: false, meta: false };

function shortcut(overrides = {}) {
  return {
    id: 's1',
    shortcut: combo,
    selector: '#target',
    innerText: '',
    label: 'Target',
    scope: 'domain',
    path: null,
    createdAt: 0,
    ...overrides
  };
}

function setVisible(el: HTMLElement, visible: boolean) {
  Object.defineProperty(el, 'offsetWidth', { value: visible ? 10 : 0, configurable: true });
}

function addTarget(visible = true) {
  const button = document.createElement('button');
  button.id = 'target';
  setVisible(button, visible);
  document.body.appendChild(button);
  const onClick = vi.fn();
  button.addEventListener('click', onClick);
  return { button, onClick };
}

function press(target: EventTarget, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key: 'k',
    bubbles: true,
    composed: true,
    cancelable: true,
    ...init
  });
  target.dispatchEvent(event);
  return event;
}

const flush = () => vi.advanceTimersByTimeAsync(1000);

async function startEngine(shortcuts: unknown[]) {
  vi.mocked(chrome.storage.local.get).mockResolvedValue({ shortcuts: { 'example.test': shortcuts } } as never);
  const engine = new ShortcutEngine();
  engine.start();
  await flush();
  return engine;
}

describe('ShortcutEngine', () => {
  let engine: ShortcutEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('chrome', {
      storage: {
        local: { get: vi.fn() },
        onChanged: { addListener: vi.fn() }
      },
      runtime: { sendMessage: vi.fn() }
    });
    // jsdom rejects vitest's global `window` as an event `view`
    for (const name of ['MouseEvent', 'PointerEvent'] as const) {
      const NativeEvent = globalThis[name] as typeof MouseEvent;
      vi.stubGlobal(name, class extends NativeEvent {
        constructor(type: string, init: MouseEventInit) {
          super(type, { ...init, view: null });
        }
      });
    }
    document.elementFromPoint = () => null;
    Element.prototype.scrollIntoView = () => {};
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    engine?.stop();
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.mocked(broadcastToTab).mockClear();
  });

  it('clicks the bound element exactly once', async () => {
    const { onClick } = addTarget();
    engine = await startEngine([shortcut()]);

    press(document.body);
    await flush();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('leaves a toggle flipped after one press', async () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'target';
    setVisible(checkbox, true);
    document.body.appendChild(checkbox);
    engine = await startEngine([shortcut()]);

    press(document.body);
    await flush();

    expect(checkbox.checked).toBe(true);
  });

  it('runs default actions like following a link', async () => {
    const link = document.createElement('a');
    link.href = '#next';
    link.id = 'target';
    setVisible(link, true);
    document.body.appendChild(link);
    engine = await startEngine([shortcut()]);

    press(document.body);
    await flush();

    expect(window.location.hash).toBe('#next');
  });

  it('ignores keys typed into an input inside a shadow root', async () => {
    const { onClick } = addTarget();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const input = document.createElement('input');
    host.attachShadow({ mode: 'open' }).appendChild(input);
    engine = await startEngine([shortcut()]);

    const event = press(input);
    await flush();

    expect(onClick).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('clicks once when a key is held, and keeps repeats away from the page', async () => {
    const { onClick } = addTarget();
    engine = await startEngine([shortcut()]);

    press(document.body);
    const repeat = press(document.body, { repeat: true });
    await flush();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(repeat.defaultPrevented).toBe(true);
  });

  it('consumes the key before waiting for an element to become visible', async () => {
    const { button, onClick } = addTarget(false);
    engine = await startEngine([shortcut()]);

    const event = press(document.body);
    expect(event.defaultPrevented).toBe(true);

    setVisible(button, true);
    await flush();
    expect(onClick).toHaveBeenCalled();
  });

  it('leaves the key to the page when the element is not on this page', async () => {
    engine = await startEngine([shortcut()]);

    const event = press(document.body);
    await flush();

    expect(event.defaultPrevented).toBe(false);
  });

  it('relays a shortcut owned by another frame once, consuming every press', async () => {
    addTarget();
    engine = await startEngine([shortcut({ frameOrigin: 'https://embed.test' })]);

    const first = press(document.body);
    const repeat = press(document.body, { repeat: true });

    expect(first.defaultPrevented).toBe(true);
    expect(repeat.defaultPrevented).toBe(true);
    expect(broadcastToTab).toHaveBeenCalledTimes(1);
    expect(broadcastToTab).toHaveBeenCalledWith({ action: 'run-shortcut', combo });
  });

  it('runs a relayed shortcut this frame owns', async () => {
    const { onClick } = addTarget();
    engine = await startEngine([shortcut()]);

    engine.runShortcut(combo);
    await flush();

    expect(onClick).toHaveBeenCalled();
  });

  it('ignores a relayed shortcut owned by another frame', async () => {
    const { onClick } = addTarget();
    engine = await startEngine([shortcut({ frameOrigin: 'https://embed.test' })]);

    engine.runShortcut(combo);
    await flush();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('ignores keydown events with no key, like the ones autofill sends', async () => {
    const { onClick } = addTarget();
    engine = await startEngine([shortcut()]);

    document.body.dispatchEvent(new Event('keydown', { bubbles: true }));
    await flush();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies path scope immediately after a client-side navigation', async () => {
    const { onClick } = addTarget();
    engine = await startEngine([shortcut({ scope: 'path', path: '/inbox' })]);

    window.history.pushState({}, '', '/inbox');
    press(document.body);
    await flush();

    expect(onClick).toHaveBeenCalled();
  });

  it('leaves keys with no shortcut to the page', async () => {
    addTarget();
    engine = await startEngine([shortcut()]);

    expect(press(document.body, { key: 'x' }).defaultPrevented).toBe(false);
  });
});
