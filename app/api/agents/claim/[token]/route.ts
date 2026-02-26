import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import BrainState from '@/lib/models/BrainState';
import Signal from '@/lib/models/Signal';
import Directive from '@/lib/models/Directive';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connectDB();
  const { token } = await params;

  const agent = await Agent.findOne({ claimToken: token });
  if (!agent) return errorResponse('Invalid claim token', 'Token not found or already used.', 404);

  return successResponse({
    name: agent.name,
    description: agent.description,
    role: agent.role,
    claimStatus: agent.claimStatus,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connectDB();
  const { token } = await params;
  const body = await req.json().catch(() => ({}));

  const agent = await Agent.findOne({ claimToken: token });
  if (!agent) return errorResponse('Invalid claim token', 'Token not found.', 404);

  if (agent.claimStatus === 'claimed') {
    return errorResponse('Already claimed', 'This agent has already been claimed.', 409);
  }

  agent.claimStatus = 'claimed';
  agent.ownerEmail = body.email || undefined;
  agent.lastActive = new Date();

  // Check if all current agents are dummies (metadata.type === 'dummy')
  // If so, this is the first real agent — promote to interneuron and clean up dummies
  const dummyAgents = await Agent.find({ 'metadata.type': 'dummy' });
  const realClaimedAgents = await Agent.countDocuments({
    claimStatus: 'claimed',
    'metadata.type': { $ne: 'dummy' },
    _id: { $ne: agent._id },
  });

  if (dummyAgents.length > 0 && realClaimedAgents === 0) {
    // This is the first real agent being claimed — make it the interneuron
    agent.role = 'interneuron';

    // Delete all dummy agents and their data
    const dummyIds = dummyAgents.map(d => d._id);
    await Signal.deleteMany({ fromAgentId: { $in: dummyIds } });
    await Directive.deleteMany({
      $or: [
        { fromBrainId: { $in: dummyIds } },
        { toAgentId: { $in: dummyIds } },
      ],
    });
    await Agent.deleteMany({ 'metadata.type': 'dummy' });

    // Update brain state to point to this agent
    await BrainState.findOneAndUpdate(
      {},
      {
        currentInterneuronId: agent._id,
        rotationCount: 0,
        lastRotationAt: new Date(),
        nextRotationAt: new Date(Date.now() + 10 * 60 * 1000),
        history: [{ agentId: agent._id, startedAt: new Date() }],
      },
      { upsert: true },
    );

    console.log(`First real agent claimed: ${agent.name} promoted to interneuron, dummies removed`);
  }

  await agent.save();

  return successResponse({
    message: `Agent "${agent.name}" successfully claimed!`,
    name: agent.name,
    role: agent.role,
  });
}
