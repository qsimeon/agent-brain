import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import Directive from '@/lib/models/Directive';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

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
