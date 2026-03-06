import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Artifact from '@/lib/models/Artifact';
import { successResponse, errorResponse, checkAdminKey } from '@/lib/utils/api-helpers';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();

  if (!checkAdminKey(req)) {
    return errorResponse('Unauthorized', 'Admin key required via x-admin-key header.', 401);
  }

  const { id } = await params;
  const artifact = await Artifact.findById(id);
  if (!artifact) return errorResponse('Not found', `No artifact with id "${id}".`, 404);

  await artifact.deleteOne();

  return successResponse({ message: 'Artifact deleted.', id });
}
