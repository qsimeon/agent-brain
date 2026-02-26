import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Artifact from '@/lib/models/Artifact';
import { successResponse } from '@/lib/utils/api-helpers';

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
  const type = searchParams.get('type'); // optional filter: image, text, link, file

  const filter: Record<string, any> = {};
  if (type && ['image', 'text', 'link', 'file'].includes(type)) {
    filter.type = type;
  }

  const [artifacts, total] = await Promise.all([
    Artifact.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('agentId', 'name role')
      .populate('directiveId', 'type payload'),
    Artifact.countDocuments(filter),
  ]);

  return successResponse({
    artifacts,
    pagination: { total, limit, offset, hasMore: offset + limit < total },
  });
}
