import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Directive from '@/lib/models/Directive';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

export async function GET(req: NextRequest) {
  await connectDB();

  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return errorResponse('Missing API key', 'Include Authorization header.', 401);

  const agent = await Agent.findOne({ apiKey });
  if (!agent) return errorResponse('Invalid API key', 'Agent not found.', 401);

  if (agent.role !== 'actuator') {
    return errorResponse('Wrong role', 'Only actuator agents can receive directives. Your role: ' + agent.role, 403);
  }

  const directives = await Directive.find({
    toAgentId: agent._id,
    status: { $in: ['pending', 'accepted'] },
  }).sort({ createdAt: -1 }).populate('fromBrainId', 'name');

  agent.lastActive = new Date();
  await agent.save();

  return successResponse({ directives });
}
