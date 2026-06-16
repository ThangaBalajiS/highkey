import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CommunityShortcut from '@/models/CommunityShortcut';
import User from '@/models/User';
import { validateGoogleToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    const query = domain ? { domain } : {};

    const shortcuts = await CommunityShortcut.find(query).sort({ upvotes: -1 }).limit(100);
    return NextResponse.json(shortcuts);
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
    const { domain, shortcut } = body;

    if (!domain || !shortcut) {
      return NextResponse.json({ error: 'Domain and shortcut data are required' }, { status: 400 });
    }

    const newShortcut = await CommunityShortcut.findOneAndUpdate(
      { id: shortcut.id },
      {
        ...shortcut,
        domain,
        authorId: googleUser.id,
        authorEmail: googleUser.email,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(newShortcut, { status: 201 });
  } catch (error) {
    console.error('POST shortcut error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
