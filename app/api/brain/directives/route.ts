import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import Directive from '@/lib/models/Directive';
import BrainState from '@/lib/models/BrainState';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
  await connectDB();

  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return errorResponse('Missing API key', 'Include Authorization header.', 401);

  const agent = await Agent.findOne({ apiKey });
  if (!agent) return errorResponse('Invalid API key', 'Agent not found.', 401);

  if (agent.role !== 'interneuron') {
    return errorResponse('Not the brain', 'Only the interneuron can issue directives.', 403);
  }

  const { toAgentName, type, payload, processSignalIds } = await req.json();

  if (!toAgentName || !type || !payload) {
    return errorResponse('Missing fields', '"toAgentName", "type", and "payload" are required.', 400);
  }

  const targetAgent = await Agent.findOne({ name: new RegExp(`^${toAgentName}$`, 'i') });
  if (!targetAgent) return errorResponse('Target agent not found', `No agent named "${toAgentName}".`, 404);

  if (targetAgent.role !== 'actuator') {
    return errorResponse('Target is not an actuator', `Agent "${toAgentName}" has role "${targetAgent.role}", not "actuator".`, 400);
  }

  const directive = await Directive.create({
    fromBrainId: agent._id,
    toAgentId: targetAgent._id,
    type,
    payload,
    status: 'pending',
  });

  // Mark processed signals
  if (processSignalIds && Array.isArray(processSignalIds)) {
    await Signal.updateMany(
      { _id: { $in: processSignalIds } },
      { status: 'processed', processedByBrainId: agent._id }
    );
  }

  agent.lastActive = new Date();
  await agent.save();

  return successResponse({ directive }, 201);
}
