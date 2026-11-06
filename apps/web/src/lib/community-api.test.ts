import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as download } from '@/app/api/shortcuts/[id]/download/route';
import { POST as report } from '@/app/api/shortcuts/[id]/report/route';
import { POST as upvote } from '@/app/api/shortcuts/[id]/upvote/route';
import { GET, POST as publish } from '@/app/api/shortcuts/route';
import { validateGoogleToken } from '@/lib/auth';
import CommunityPack from '@/models/CommunityPack';

vi.mock('@/lib/db', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({ validateGoogleToken: vi.fn() }));
vi.mock('@/models/User', () => ({
  default: {
    find: () => ({ lean: async () => [{ id: 'author-1', name: 'Ada', picture: 'pic', email: 'ada@example.com' }] }),
    findOneAndUpdate: vi.fn()
  }
}));
vi.mock('@/models/CommunityPack', () => ({
  default: { findById: vi.fn(), findOne: vi.fn(), find: vi.fn(), countDocuments: vi.fn(), create: vi.fn() }
}));

const PACK_ID = '507f1f77bcf86cd799439011';
const PRIVATE_VALUES = ['ada@example.com', 'voter-1', 'authorEmail', 'upvotedBy', 'downloadedBy', 'reportedBy'];

function storedPack() {
  return {
    _id: PACK_ID,
    domain: 'github.com',
    name: 'GitHub pack',
    authorId: 'author-1',
    authorEmail: 'ada@example.com',
    shortcuts: [{ id: 's1', label: 'Search' }],
    upvotes: 1,
    upvotedBy: ['voter-1'],
    downloads: 1,
    downloadedBy: ['voter-1'],
    reports: 1,
    reportedBy: ['voter-1'],
    createdAt: 1,
    save: vi.fn()
  };
}

function listPacks(packs: unknown[]) {
  const limit = vi.fn(() => ({ lean: async () => packs }));
  vi.mocked(CommunityPack.find).mockReturnValue({ sort: () => ({ skip: () => ({ limit }) }) } as never);
  vi.mocked(CommunityPack.countDocuments).mockResolvedValue(packs.length as never);
  return limit;
}

const post = (body?: object) => new NextRequest('http://test.local/api', {
  method: 'POST',
  headers: { Authorization: 'Bearer token' },
  body: body ? JSON.stringify(body) : undefined
});
const get = (query = '') => new NextRequest(`http://test.local/api/shortcuts${query}`);
const params = (id = PACK_ID) => ({ params: Promise.resolve({ id }) });

function validShortcut(id: number) {
  return {
    id: `s${id}`,
    label: 'Search',
    selector: '#search',
    shortcut: { key: 'k', ctrl: false, shift: false, alt: false, meta: false }
  };
}

describe('community API', () => {
  let pack: ReturnType<typeof storedPack>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    pack = storedPack();
    vi.mocked(CommunityPack.findById).mockResolvedValue(pack as never);
    vi.mocked(CommunityPack.findOne).mockResolvedValue(pack as never);
  });

  describe('listing packs', () => {
    it('keeps emails and voter ids out of the public response', async () => {
      listPacks([pack]);

      const text = await (await GET(get())).text();

      expect(text).toContain('GitHub pack');
      for (const value of PRIVATE_VALUES) expect(text).not.toContain(value);
    });

    it("tells a viewer about their own votes without listing anyone else's", async () => {
      listPacks([pack]);

      const voter = await (await GET(get('?extensionId=voter-1'))).json();
      const stranger = await (await GET(get('?extensionId=someone-else'))).json();

      expect(voter.packs[0]).toMatchObject({ hasUpvoted: true, hasReported: true, hasDownloaded: true });
      expect(stranger.packs[0]).toMatchObject({ hasUpvoted: false, hasReported: false, hasDownloaded: false });
    });

    it('caps the page size', async () => {
      const limit = listPacks([]);

      await GET(get('?limit=100000'));

      expect(limit).toHaveBeenCalledWith(100);
    });
  });

  describe.each([
    ['upvoting', upvote, 'upvotes'],
    ['reporting', report, 'reports']
  ] as const)('%s', (_name, route, counter) => {
    it('rejects a request with no id, which could otherwise repeat forever', async () => {
      const response = await route(post(), params());

      expect(response.status).toBe(400);
      expect(pack[counter]).toBe(1);
    });

    it('counts a new visitor', async () => {
      const response = await route(post({ extensionId: 'new-visitor' }), params());

      expect(response.status).toBe(200);
      expect(pack[counter]).toBe(2);
    });

    it('rejects a repeat from the same visitor', async () => {
      const response = await route(post({ extensionId: 'voter-1' }), params());

      expect(response.status).toBe(400);
      expect(pack[counter]).toBe(1);
    });

    it('keeps private data out of the response', async () => {
      const text = await (await route(post({ extensionId: 'new-visitor' }), params())).text();

      for (const value of PRIVATE_VALUES) expect(text).not.toContain(value);
    });

    it('finds a pack from the id of a shortcut inside it', async () => {
      vi.mocked(CommunityPack.findById).mockRejectedValue(new Error('Cast to ObjectId failed'));

      const response = await route(post({ extensionId: 'new-visitor' }), params('3f2a-not-an-object-id'));

      expect(response.status).toBe(200);
    });
  });

  describe('counting downloads', () => {
    it('rejects a request with no id', async () => {
      expect((await download(post(), params())).status).toBe(400);
      expect(pack.downloads).toBe(1);
    });

    it('counts each visitor once', async () => {
      await download(post({ extensionId: 'new-visitor' }), params());
      await download(post({ extensionId: 'new-visitor' }), params());

      expect(pack.downloads).toBe(2);
    });
  });

  describe('publishing', () => {
    beforeEach(() => {
      vi.mocked(validateGoogleToken).mockResolvedValue({ id: 'author-1', email: 'ada@example.com', name: 'Ada' });
      vi.mocked(CommunityPack.findOne).mockResolvedValue(null as never);
      vi.mocked(CommunityPack.create).mockResolvedValue(pack as never);
    });

    it('keeps only known fields and trims long page text', async () => {
      const raw = { ...validShortcut(1), innerText: 'x'.repeat(5000), label: 'y'.repeat(500), frameOrigin: 'https://embed.test', admin: true };

      await publish(post({ domain: 'github.com', shortcuts: [raw] }));

      const [saved] = vi.mocked(CommunityPack.create).mock.calls[0][0].shortcuts;
      expect(saved.innerText).toHaveLength(200);
      expect(saved.label).toHaveLength(100);
      expect(saved.frameOrigin).toBe('https://embed.test');
      expect(saved).not.toHaveProperty('admin');
    });

    it('rejects an oversized pack', async () => {
      const shortcuts = Array.from({ length: 101 }, (_, i) => validShortcut(i));

      expect((await publish(post({ domain: 'github.com', shortcuts }))).status).toBe(400);
      expect(CommunityPack.create).not.toHaveBeenCalled();
    });

    it('rejects a domain that is not a string, like a query operator', async () => {
      const response = await publish(post({ domain: { $ne: '' }, shortcuts: [validShortcut(1)] }));

      expect(response.status).toBe(400);
    });

    it("keeps private data out of the author's response", async () => {
      const text = await (await publish(post({ domain: 'github.com', shortcuts: [validShortcut(1)] }))).text();

      for (const value of PRIVATE_VALUES) expect(text).not.toContain(value);
    });
  });
});
