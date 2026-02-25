import { connectDB } from '@/lib/db/mongodb';
import Directive from '@/lib/models/Directive';
import { successResponse } from '@/lib/utils/api-helpers';

export async function GET() {
  await connectDB();

  const directives = await Directive.find()
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('fromBrainId', 'name')
    .populate('toAgentId', 'name role');

  return successResponse({ directives });
}
