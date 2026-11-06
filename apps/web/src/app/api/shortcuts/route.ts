import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CommunityPack from '@/models/CommunityPack';
import User from '@/models/User';
import { validateGoogleToken } from '@/lib/auth';
import {
  MAX_PACK_NAME_LENGTH,
  MAX_PACK_SHORTCUTS,
  MAX_PAGE_SIZE,
  sanitizeShortcut,
  toPublicPack
} from '@/lib/packs';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    const viewerId = searchParams.get('extensionId');

    const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '') || MAX_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const query = domain ? { domain } : {};

    const total = await CommunityPack.countDocuments(query);
    const packs = await CommunityPack.find(query).sort({ upvotes: -1 }).skip(skip).limit(limit).lean();
    
    // Fetch user details for the authors
    const authorIds = [...new Set(packs.map(p => p.authorId))];
    const users = await User.find({ id: { $in: authorIds } }).lean();

    const packsWithAuthors = packs.map(p =>
      toPublicPack(p as never, users.find(u => u.id === p.authorId) as never, viewerId)
    );

    return NextResponse.json({
      packs: packsWithAuthors,
      total,
      page,
      limit,
      hasMore: skip + packs.length < total
    });
  } catch (error) {
    console.error('GET shortcuts error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const googleUser = await validateGoogleToken(token);

    if (!googleUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await dbConnect();

    // Ensure user exists in our DB
    await User.findOneAndUpdate(
      { id: googleUser.id },
      { 
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture
      },
      { upsert: true, new: true }
    );

    const body = await request.json();
    const { domain, name, shortcut, shortcuts } = body;

    if (typeof domain !== 'string' || !domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const packName = String(name || `${domain} Shortcuts`).slice(0, MAX_PACK_NAME_LENGTH);

    let packShortcuts = [];
    if (shortcuts && Array.isArray(shortcuts)) {
      packShortcuts = shortcuts.map(sanitizeShortcut);
    } else if (shortcut) {
      packShortcuts = [sanitizeShortcut(shortcut)];
    } else {
      return NextResponse.json({ error: 'Shortcut or shortcuts are required' }, { status: 400 });
    }

    if (packShortcuts.length > MAX_PACK_SHORTCUTS) {
      return NextResponse.json({ error: `Packs can have at most ${MAX_PACK_SHORTCUTS} shortcuts` }, { status: 400 });
    }

    // Upsert the pack for the user on that domain
    let pack = await CommunityPack.findOne({ domain, authorId: googleUser.id });

    if (pack) {
      if (shortcuts && Array.isArray(shortcuts)) {
        pack.shortcuts = packShortcuts;
      } else if (shortcut) {
        const [item] = packShortcuts;
        const idx = pack.shortcuts.findIndex((s: any) => s.id === item.id);
        if (idx > -1) {
          pack.shortcuts[idx] = item;
        } else {
          pack.shortcuts.push(item);
        }
      }
      if (pack.shortcuts.length > MAX_PACK_SHORTCUTS) {
        return NextResponse.json({ error: `Packs can have at most ${MAX_PACK_SHORTCUTS} shortcuts` }, { status: 400 });
      }
      pack.name = packName;
      pack.createdAt = Date.now();
      await pack.save();
    } else {
      pack = await CommunityPack.create({
        domain,
        name: packName,
        authorId: googleUser.id,
        authorEmail: googleUser.email,
        shortcuts: packShortcuts,
        upvotes: 0,
        downloads: 0,
        createdAt: Date.now()
      });
    }

    return NextResponse.json(toPublicPack(pack, googleUser), { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('POST shortcut error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const googleUser = await validateGoogleToken(token);

    if (!googleUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    await dbConnect();
    const result = await CommunityPack.deleteOne({ domain, authorId: googleUser.id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Pack not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE shortcut error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
