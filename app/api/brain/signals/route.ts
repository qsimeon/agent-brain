import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import BrainState from '@/lib/models/BrainState';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

export async function GET(req: NextRequest) {
  await connectDB();

  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return errorResponse('Missing API key', 'Include Authorization header.', 401);

  const agent = await Agent.findOne({ apiKey });
  if (!agent) return errorResponse('Invalid API key', 'Agent not found.', 401);

  if (agent.role !== 'interneuron') {
    return errorResponse('Not the brain', 'Only the current interneuron agent can read brain signals. Your role: ' + agent.role, 403);
  }

  const brainState = await BrainState.findOne({});
  if (!brainState || brainState.currentInterneuronId.toString() !== agent._id.toString()) {
    return errorResponse('Not current interneuron', 'You are not the active interneuron right now.', 403);
  }

  const signals = await Signal.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('fromAgentId', 'name role');

  agent.lastActive = new Date();
  await agent.save();

  return successResponse({ signals, brainId: agent._id });
}
