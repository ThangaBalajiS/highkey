import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CommunityPack from '@/models/CommunityPack';

export const dynamic = 'force-dynamic';

// The extension downloads this whole list and checks it locally, so the
// server never learns which sites someone visits
export async function GET() {
  try {
    await dbConnect();
    const rows = await CommunityPack.aggregate([{ $group: { _id: '$domain', count: { $sum: 1 } } }]);
    const domains = Object.fromEntries(rows.map(row => [row._id, row.count]));

    return NextResponse.json({ domains });
  } catch (error) {
    console.error('GET domains error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
