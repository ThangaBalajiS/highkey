// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { broadcastToTab } from './frame';
import { VisualSelector } from './selector';

vi.mock('./frame', () => ({
  getSiteDomain: () => 'example.test',
  getFrameOrigin: () => null,
  broadcastToTab: vi.fn()
}));

const isRunning = () => document.getElementById('highkey-selector-root') !== null;

describe('VisualSelector across frames', () => {
  let selector: VisualSelector;
  let button: HTMLButtonElement;

  beforeEach(() => {
    vi.stubGlobal('CSS', { escape: (value: string) => value });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    button = document.createElement('button');
    button.id = 'target';
    document.body.appendChild(button);
    selector = new VisualSelector();
    selector.activate();
  });

  afterEach(() => {
    selector.deactivate();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.mocked(broadcastToTab).mockClear();
  });

  it('shuts down when another frame claims the binder', () => {
    selector.yieldTo('another-frame');
    expect(isRunning()).toBe(false);
  });

  it('claims the binder when an element is picked, and survives its own claim', () => {
    button.click();

    expect(broadcastToTab).toHaveBeenCalledTimes(1);
    const claim = vi.mocked(broadcastToTab).mock.calls[0][0] as { action: string; frameId: string };
    expect(claim.action).toBe('binder-claimed');

    selector.yieldTo(claim.frameId);
    expect(isRunning()).toBe(true);
  });
});
