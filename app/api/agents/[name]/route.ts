import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import Directive from '@/lib/models/Directive';
import BrainState from '@/lib/models/BrainState';
import { successResponse, errorResponse, checkAdminKey } from '@/lib/utils/api-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  await connectDB();
  const { name } = await params;

  const agent = await Agent.findOne({ name: new RegExp(`^${name}$`, 'i') }).select('-apiKey -__v');
  if (!agent) return errorResponse('Agent not found', `No agent named "${name}".`, 404);

  const recentSignals = await Signal.find({ fromAgentId: agent._id }).sort({ createdAt: -1 }).limit(10);
  const recentDirectives = await Directive.find({
    $or: [{ toAgentId: agent._id }, { fromBrainId: agent._id }]
  }).sort({ createdAt: -1 }).limit(10);

  return successResponse({
    agent,
    recentSignals,
    recentDirectives,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  await connectDB();

  if (!checkAdminKey(req)) {
    return errorResponse('Unauthorized', 'Admin key required via x-admin-key header.', 401);
  }

  const { name } = await params;
  const agent = await Agent.findOne({ name: new RegExp(`^${name}$`, 'i') });
  if (!agent) return errorResponse('Agent not found', `No agent named "${name}".`, 404);

  // If this agent was the current interneuron, clear BrainState so the next
  // real agent to claim (or rejoin) gets promoted cleanly.
  const brainState = await BrainState.findOne({});
  if (brainState && String(brainState.currentInterneuronId) === String(agent._id)) {
    brainState.currentInterneuronId = null;
    await brainState.save();
  }

  await agent.deleteOne();

  return successResponse({
    message: `Agent "${agent.name}" removed from the network.`,
    removedAgent: { name: agent.name, role: agent.role },
  });
}
