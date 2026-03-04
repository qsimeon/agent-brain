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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  await connectDB();

  if (!checkAdminKey(req)) {
    return errorResponse('Unauthorized', 'Admin key required via x-admin-key header.', 401);
  }

  const { name } = await params;
  const agent = await Agent.findOne({ name: new RegExp(`^${name}$`, 'i') });
  if (!agent) return errorResponse('Agent not found', `No agent named "${name}".`, 404);

  const body = await req.json().catch(() => ({}));
  const { role } = body;
  const validRoles = ['sensor', 'actuator', 'interneuron'];
  if (!role || !validRoles.includes(role)) {
    return errorResponse('Invalid role', `role must be one of: ${validRoles.join(', ')}`, 400);
  }

  const previousRole = agent.role;
  agent.role = role;
  await agent.save();

  // If promoted to interneuron, update BrainState
  if (role === 'interneuron') {
    const brainState = await BrainState.findOne({});
    if (brainState) {
      const now = new Date();
      if (brainState.history.length > 0) {
        brainState.history[brainState.history.length - 1].endedAt = now;
      }
      brainState.history.push({ agentId: agent._id, startedAt: now });
      brainState.currentInterneuronId = agent._id;
      await brainState.save();
    }
  }

  // If demoting the current interneuron, clear BrainState
  if (previousRole === 'interneuron' && role !== 'interneuron') {
    const brainState = await BrainState.findOne({});
    if (brainState && String(brainState.currentInterneuronId) === String(agent._id)) {
      brainState.currentInterneuronId = null;
      await brainState.save();
    }
  }

  return successResponse({
    message: `${agent.name} role changed: ${previousRole} → ${role}`,
    agent: { name: agent.name, previousRole, role },
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
