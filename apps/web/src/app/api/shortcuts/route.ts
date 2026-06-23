import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CommunityPack from '@/models/CommunityPack';
import User from '@/models/User';
import { validateGoogleToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    const query = domain ? { domain } : {};

    const packs = await CommunityPack.find(query).sort({ upvotes: -1 }).limit(100).lean();
    
    // Fetch user details for the authors
    const authorIds = [...new Set(packs.map(p => p.authorId))];
    const users = await User.find({ id: { $in: authorIds } }).lean();

    const packsWithAuthors = packs.map(p => {
      const author = users.find(u => u.id === p.authorId);
      return {
        ...p,
        author: author ? {
          name: author.name,
          picture: author.picture,
          email: author.email
        } : {
          name: "Highkey User",
          picture: ""
        }
      };
    });

    return NextResponse.json(packsWithAuthors);
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
    const { domain, shortcut, shortcuts } = body;

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    let packShortcuts = [];
    if (shortcuts && Array.isArray(shortcuts)) {
      packShortcuts = shortcuts;
    } else if (shortcut) {
      packShortcuts = [shortcut];
    } else {
      return NextResponse.json({ error: 'Shortcut or shortcuts are required' }, { status: 400 });
    }

    // Upsert the pack for the user on that domain
    let pack = await CommunityPack.findOne({ domain, authorId: googleUser.id });

    if (pack) {
      if (shortcuts && Array.isArray(shortcuts)) {
        pack.shortcuts = shortcuts;
      } else if (shortcut) {
        const idx = pack.shortcuts.findIndex((s: any) => s.id === shortcut.id);
        if (idx > -1) {
          pack.shortcuts[idx] = shortcut;
        } else {
          pack.shortcuts.push(shortcut);
        }
      }
      pack.createdAt = Date.now();
      await pack.save();
    } else {
      pack = await CommunityPack.create({
        domain,
        authorId: googleUser.id,
        authorEmail: googleUser.email,
        shortcuts: packShortcuts,
        upvotes: 0,
        downloads: 0,
        createdAt: Date.now()
      });
    }

    return NextResponse.json(pack, { status: 201 });
  } catch (error) {
    console.error('POST shortcut error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
