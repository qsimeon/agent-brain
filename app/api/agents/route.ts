import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { successResponse } from '@/lib/utils/api-helpers';

export async function GET(req: NextRequest) {
  await connectDB();

  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20'), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

  const total = await Agent.countDocuments();
  const agents = await Agent.find()
    .sort({ lastActive: -1 })
    .skip(offset)
    .limit(limit)
    .select('-apiKey -__v');

  return successResponse({
    agents,
    pagination: { total, limit, offset, hasMore: offset + limit < total },
  });
}
