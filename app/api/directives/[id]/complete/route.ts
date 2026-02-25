import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Directive from '@/lib/models/Directive';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return errorResponse('Missing API key', 'Include Authorization header.', 401);

  const agent = await Agent.findOne({ apiKey });
  if (!agent) return errorResponse('Invalid API key', 'Agent not found.', 401);

  const directive = await Directive.findById(id);
  if (!directive) return errorResponse('Directive not found', 'Invalid directive ID.', 404);

  if (directive.toAgentId.toString() !== agent._id.toString()) {
    return errorResponse('Not your directive', 'This directive is assigned to another agent.', 403);
  }

  const body = await req.json().catch(() => ({}));

  directive.status = 'completed';
  directive.result = body.result || { message: 'Completed' };
  directive.completedAt = new Date();
  await directive.save();

  agent.lastActive = new Date();
  await agent.save();

  return successResponse({ directive });
}
