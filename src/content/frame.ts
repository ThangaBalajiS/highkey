import type { Shortcut } from '../types';

// Shortcuts are stored under the tab's site, so iframes share the page's list
export function getSiteDomain(): string {
  const { ancestorOrigins, hostname } = window.location;
  const topOrigin = ancestorOrigins[ancestorOrigins.length - 1];
  if (!topOrigin) return hostname;

  try {
    return new URL(topOrigin).hostname;
  } catch {
    return hostname;
  }
}

export function getFrameOrigin(): string | null {
  return window.top === window ? null : window.location.origin;
}

export function ownsShortcut(shortcut: Shortcut): boolean {
  return (shortcut.frameOrigin ?? null) === getFrameOrigin();
}

// Content scripts can't message each other, so the background relays to every frame in the tab
export function broadcastToTab(message: object) {
  chrome.runtime.sendMessage({ action: 'broadcast', message }).catch(() => {});
}
