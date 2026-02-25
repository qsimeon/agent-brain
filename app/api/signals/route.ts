import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
  await connectDB();

  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return errorResponse('Missing API key', 'Include Authorization: Bearer YOUR_API_KEY header.', 401);

  const agent = await Agent.findOne({ apiKey });
  if (!agent) return errorResponse('Invalid API key', 'Agent not found.', 401);

  if (agent.role !== 'sensor' && agent.role !== 'interneuron') {
    return errorResponse('Wrong role', 'Only sensor agents can submit signals. Your role: ' + agent.role, 403);
  }

  const { type, payload } = await req.json();
  if (!type || !payload) {
    return errorResponse('Missing fields', 'Both "type" and "payload" are required.', 400);
  }

  const signal = await Signal.create({
    fromAgentId: agent._id,
    type,
    payload,
    status: 'pending',
  });

  agent.lastActive = new Date();
  await agent.save();

  return successResponse({ signal }, 201);
}

export async function GET() {
  await connectDB();

  const signals = await Signal.find()
    .sort({ createdAt: -1 })
    .limit(30)
    .populate('fromAgentId', 'name role')
    .populate('processedByBrainId', 'name');

  return successResponse({ signals });
}
