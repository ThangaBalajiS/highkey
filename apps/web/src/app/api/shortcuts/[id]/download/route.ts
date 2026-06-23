import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CommunityPack from '@/models/CommunityPack';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    // Attempt to update by pack _id, or fallback to finding by nested shortcut.id
    let pack = await CommunityPack.findById(id);
    if (pack) {
      pack.downloads += 1;
      await pack.save();
    } else {
      pack = await CommunityPack.findOneAndUpdate(
        { "shortcuts.id": id },
        { $inc: { downloads: 1 } },
        { new: true }
      );
    }
    
    if (!pack) {
      return NextResponse.json({ error: 'Pack or shortcut not found' }, { status: 404 });
    }
    
    return NextResponse.json(pack);
  } catch (error) {
    console.error('Download track error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
