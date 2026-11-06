import { isValidObjectId } from 'mongoose';
import CommunityPack from '@/models/CommunityPack';

export const MAX_PAGE_SIZE = 100;
export const MAX_PACK_SHORTCUTS = 100;
export const MAX_PACK_NAME_LENGTH = 100;

interface PackRecord {
  _id: unknown;
  domain: string;
  name: string;
  authorId: string;
  shortcuts: unknown[];
  upvotes?: number;
  downloads?: number;
  createdAt: number;
  upvotedBy?: string[];
  downloadedBy?: string[];
  reportedBy?: string[];
}

// Packs are addressed by _id, or by the id of a shortcut inside them
export async function findPack(id: string) {
  const pack = isValidObjectId(id) ? await CommunityPack.findById(id) : null;
  return pack || CommunityPack.findOne({ 'shortcuts.id': id });
}

// The only shape that leaves the API. Emails and voter ids stay on the server,
// so viewers get flags about their own votes instead of the lists.
export function toPublicPack(
  pack: PackRecord,
  author?: { name: string; picture?: string },
  viewerId?: string | null
) {
  const includesViewer = (ids?: string[]) => !!viewerId && !!ids?.includes(viewerId);

  return {
    _id: pack._id,
    domain: pack.domain,
    name: pack.name,
    authorId: pack.authorId,
    shortcuts: pack.shortcuts,
    upvotes: pack.upvotes || 0,
    downloads: pack.downloads || 0,
    createdAt: pack.createdAt,
    author: { name: author?.name || 'Highkey User', picture: author?.picture || '' },
    hasUpvoted: includesViewer(pack.upvotedBy),
    hasDownloaded: includesViewer(pack.downloadedBy),
    hasReported: includesViewer(pack.reportedBy)
  };
}

// Shortcuts come straight from a client and end up on other people's machines
export function sanitizeShortcut(raw: any) {
  return {
    id: String(raw?.id ?? ''),
    label: String(raw?.label ?? '').slice(0, 100),
    selector: String(raw?.selector ?? ''),
    innerText: String(raw?.innerText ?? '').slice(0, 200),
    scope: raw?.scope === 'path' ? 'path' : 'domain',
    path: raw?.path ? String(raw.path).slice(0, 500) : null,
    frameOrigin: raw?.frameOrigin ? String(raw.frameOrigin).slice(0, 255) : null,
    shortcut: {
      key: String(raw?.shortcut?.key ?? '').slice(0, 32),
      ctrl: !!raw?.shortcut?.ctrl,
      shift: !!raw?.shortcut?.shift,
      alt: !!raw?.shortcut?.alt,
      meta: !!raw?.shortcut?.meta
    }
  };
}
