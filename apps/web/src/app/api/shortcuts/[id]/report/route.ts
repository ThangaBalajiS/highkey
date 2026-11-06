import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { findPack, toPublicPack } from '@/lib/packs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { extensionId } = body;

    if (typeof extensionId !== 'string' || !extensionId) {
      return NextResponse.json({ error: 'extensionId is required' }, { status: 400 });
    }

    await dbConnect();
    
    // Attempt to update by pack _id, or fallback to finding by nested shortcut.id
    const pack = await findPack(id);
    
    if (!pack) {
      return NextResponse.json({ error: 'Pack or shortcut not found' }, { status: 404 });
    }

    if (!pack.reportedBy) pack.reportedBy = [];
    if (pack.reportedBy.includes(extensionId)) {
      return NextResponse.json({ error: 'Already reported' }, { status: 400 });
    }
    pack.reportedBy.push(extensionId);

    pack.reports = (pack.reports || 0) + 1;
    await pack.save();
    
    return NextResponse.json(toPublicPack(pack, undefined, extensionId));
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
