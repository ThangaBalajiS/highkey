// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import dashboardHtml from './index.html?raw';

const HOSTILE = '<img id="injected" src="x">';

const hostilePack = {
  _id: 'pack-1',
  domain: HOSTILE,
  name: HOSTILE,
  authorId: 'someone',
  author: { name: HOSTILE, picture: `"><img id="injected" src="x">` },
  shortcuts: [{
    id: 's1',
    label: HOSTILE,
    selector: '#a',
    shortcut: { key: HOSTILE, ctrl: false, shift: false, alt: false, meta: false }
  }],
  upvotes: 0,
  downloads: 0
};

describe('dashboard community views', () => {
  beforeAll(async () => {
    document.body.innerHTML = dashboardHtml.match(/<body[^>]*>([\s\S]*)<\/body>/)![1];
    const stored = {
      extensionId: 'me',
      shortcuts: {
        'example.test': [{
          id: 'mine',
          label: 'Mine',
          selector: '#a',
          scope: 'domain',
          createdAt: 1,
          shortcut: { key: 'k', ctrl: false, shift: false, alt: false, meta: false }
        }]
      }
    };
    vi.stubGlobal('chrome', {
      storage: {
        local: { get: vi.fn(async () => stored), set: vi.fn() },
        sync: { get: vi.fn(async () => ({})), set: vi.fn() },
        onChanged: { addListener: vi.fn() }
      },
      identity: { getAuthToken: vi.fn((_options, callback) => callback(undefined)) },
      runtime: {}
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ packs: [hostilePack] }) })));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await import('./main');
    await vi.waitFor(() => expect(document.querySelector('.domain-toggle')).not.toBeNull());
  });

  it.each([
    ['nav-discover', 'discover-list'],
    ['nav-community', 'community-list']
  ])('shows a hostile pack as plain text after %s', async (nav, listId) => {
    document.getElementById(nav)!.click();
    const list = document.getElementById(listId)!;
    await vi.waitFor(() => expect(list.querySelector('.download-btn')).not.toBeNull());

    // The author avatar is the only image a card should contain
    expect(list.querySelectorAll('img')).toHaveLength(1);
    expect(list.textContent).toContain(HOSTILE);
  });

  it('shows the sign-in button is working until Google answers', async () => {
    const getAuthToken = (globalThis as any).chrome.identity.getAuthToken;
    let answer: (token: unknown) => void = () => {};
    getAuthToken.mockImplementation((_options: unknown, callback: (token: unknown) => void) => { answer = callback; });
    const button = document.getElementById('sign-in-btn') as HTMLButtonElement;
    const label = button.textContent;
    const callsBefore = getAuthToken.mock.calls.length;

    button.click();

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.spinner')).not.toBeNull();
    expect(button.textContent).toContain('Signing in');

    // A second click while the account picker opens mustn't start another sign-in
    button.click();
    expect(getAuthToken.mock.calls.length - callsBefore).toBe(1);

    answer(undefined); // the person closed the picker
    await vi.waitFor(() => expect(button.disabled).toBe(false));
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.querySelector('.spinner')).toBeNull();
    expect(button.textContent).toBe(label);
  });
});
