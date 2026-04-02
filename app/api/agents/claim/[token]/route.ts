import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import BrainState from '@/lib/models/BrainState';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';
import { notifyAgentOfClaim } from '@/lib/utils/notify-agent';

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
    // Return api_key if already claimed — the claim token proves ownership and
    // serves as a recovery path if the agent lost the key from registration.
    ...(agent.claimStatus === 'claimed' ? { api_key: agent.apiKey } : {}),
    hasWebhook: !!agent.webhookConfig?.type,
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

  // Check if this is the first agent being claimed
  // If no other agents are claimed yet, promote this one to interneuron
  const claimedAgents = await Agent.countDocuments({
    claimStatus: 'claimed',
    _id: { $ne: agent._id },
  });

  if (claimedAgents === 0) {
    // First agent — promote to interneuron
    agent.role = 'interneuron';

    // Update brain state to point to this agent
    await BrainState.findOneAndUpdate(
      {},
      {
        currentInterneuronId: agent._id,
        rotationCount: 0,
        lastRotationAt: new Date(),
        nextRotationAt: new Date(Date.now() + 3 * 60 * 1000),
        history: [{ agentId: agent._id, startedAt: new Date() }],
      },
      { upsert: true },
    );

    console.log(`First real agent claimed: ${agent.name} promoted to interneuron`);
  } else if (agent.role === 'interneuron') {
    // Safety net: this agent was incorrectly assigned interneuron during registration
    // (can happen if two agents register before either is claimed — both see realCount=0).
    // A real interneuron already exists — downgrade randomly (50/50 sensor/actuator).
    agent.role = Math.random() < 0.5 ? 'sensor' : 'actuator';
    console.log(`Dual-interneuron prevented: ${agent.name} downgraded to ${agent.role}`);
  }

  await agent.save();

  // Fire-and-forget: push "you are claimed, start now" to the agent's webhook
  notifyAgentOfClaim(agent).catch(() => {});

  return successResponse({
    message: `Agent "${agent.name}" successfully claimed!`,
    name: agent.name,
    role: agent.role,
    // Return api_key here so the human can relay it to their agent if the agent
    // lost it after registration. This is safe — ownership is proven by the claim token.
    api_key: agent.apiKey,
    hasWebhook: !!agent.webhookConfig?.type,
  });
}
