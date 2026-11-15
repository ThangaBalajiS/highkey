import type { ShortcutMap } from '../types';

// Stays in local storage: sync caps a single item at 8KB, which all of a user's
// shortcuts would have to fit inside
export async function getShortcuts(): Promise<ShortcutMap> {
  const data = await chrome.storage.local.get('shortcuts');
  return (data.shortcuts || {}) as ShortcutMap;
}

export async function saveShortcuts(shortcuts: ShortcutMap) {
  await chrome.storage.local.set({ shortcuts });
}
