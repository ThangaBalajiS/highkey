import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CommunityShortcut from '@/models/CommunityShortcut';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const shortcut = await CommunityShortcut.findOneAndUpdate(
      { id },
      { $inc: { upvotes: 1 } },
      { new: true }
    );
    
    if (!shortcut) {
      return NextResponse.json({ error: 'Shortcut not found' }, { status: 404 });
    }
    
    return NextResponse.json(shortcut);
  } catch (error) {
    console.error('Upvote error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
