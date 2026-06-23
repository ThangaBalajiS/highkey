import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CommunityPack from '@/models/CommunityPack';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { extensionId } = body;

    await dbConnect();
    
    // Attempt to update by pack _id, or fallback to finding by nested shortcut.id
    let pack = await CommunityPack.findById(id);
    if (!pack) {
      pack = await CommunityPack.findOne({ "shortcuts.id": id });
    }
    
    if (!pack) {
      return NextResponse.json({ error: 'Pack or shortcut not found' }, { status: 404 });
    }

    if (extensionId) {
      if (!pack.upvotedBy) pack.upvotedBy = [];
      if (pack.upvotedBy.includes(extensionId)) {
        return NextResponse.json({ error: 'Already upvoted' }, { status: 400 });
      }
      pack.upvotedBy.push(extensionId);
    }

    pack.upvotes = (pack.upvotes || 0) + 1;
    await pack.save();
    
    return NextResponse.json(pack);
  } catch (error) {
    console.error('Upvote error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
