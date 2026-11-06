export interface Keybinding {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export interface Shortcut {
  id: string;
  label: string;
  shortcut: Keybinding;
  selector: string;
  innerText?: string;
  scope: 'domain' | 'path';
  path: string | null;
  // Origin of the iframe holding the element; unset for the top frame
  frameOrigin?: string | null;
  createdAt: number;
}

export type ShortcutMap = Record<string, Shortcut[]>;

export interface User {
  id: string; // Google ID
  email: string;
  name: string;
  picture?: string;
}

export interface CommunityShortcut extends Shortcut {
  authorId: string;
  authorEmail?: string;
  domain: string;
  upvotes: number;
  downloads: number;
}

export interface CommunityPack {
  domain: string;
  authorId: string;
  authorEmail?: string;
  shortcuts: Shortcut[];
  upvotes: number;
  upvotedBy?: string[];
  downloads: number;
  downloadedBy?: string[];
  createdAt: number;
  author?: {
    name: string;
    picture?: string;
    email?: string;
  };
}
