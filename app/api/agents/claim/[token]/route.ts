import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
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
  await agent.save();

  return successResponse({
    message: `Agent "${agent.name}" successfully claimed!`,
    name: agent.name,
    role: agent.role,
  });
}
