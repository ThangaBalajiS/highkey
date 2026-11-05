import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFrameOrigin, getSiteDomain, ownsShortcut } from './frame';
import type { Shortcut } from '../types';

function stubFrame(url: string, ancestorOrigins: string[] = []) {
  const { hostname, origin } = new URL(url);
  const frame: Record<string, unknown> = { location: { hostname, origin, ancestorOrigins } };
  frame.top = ancestorOrigins.length ? {} : frame;
  vi.stubGlobal('window', frame);
}

const owned = (frameOrigin?: string | null) => ownsShortcut({ frameOrigin } as Shortcut);

describe('frame helpers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses its own hostname in the top frame', () => {
    stubFrame('https://site.test/page');
    expect(getSiteDomain()).toBe('site.test');
    expect(getFrameOrigin()).toBeNull();
  });

  it('uses the top-level site in a nested cross-origin iframe', () => {
    stubFrame('https://embed.test/widget', ['https://middle.test', 'https://site.test']);
    expect(getSiteDomain()).toBe('site.test');
    expect(getFrameOrigin()).toBe('https://embed.test');
  });

  it('falls back to its own hostname under an opaque ancestor', () => {
    stubFrame('https://embed.test/widget', ['null']);
    expect(getSiteDomain()).toBe('embed.test');
  });

  it('gives the top frame shortcuts with no frame origin, including old saved ones', () => {
    stubFrame('https://site.test/');
    expect(owned(undefined)).toBe(true);
    expect(owned(null)).toBe(true);
    expect(owned('https://embed.test')).toBe(false);
  });

  it('gives an iframe only the shortcuts bound to its origin', () => {
    stubFrame('https://embed.test/widget', ['https://site.test']);
    expect(owned('https://embed.test')).toBe(true);
    expect(owned('https://other.test')).toBe(false);
    expect(owned(null)).toBe(false);
  });
});
