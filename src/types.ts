export interface KeyCombo {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export interface Shortcut {
  id: string;
  shortcut: KeyCombo;
  selector: string;
  innerText: string;
  label: string;
  scope?: 'domain' | 'path';
  path?: string | null;
  // Origin of the iframe holding the element; unset for the top frame
  frameOrigin?: string | null;
  createdAt: number;
}

export type ShortcutMap = Record<string, Shortcut[]>;
