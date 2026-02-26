import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Directive from '@/lib/models/Directive';
import Artifact from '@/lib/models/Artifact';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;

  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return errorResponse('Missing API key', 'Include Authorization header.', 401);

  const agent = await Agent.findOne({ apiKey });
  if (!agent) return errorResponse('Invalid API key', 'Agent not found.', 401);

  const directive = await Directive.findById(id);
  if (!directive) return errorResponse('Directive not found', `No directive with ID "${id}".`, 404);

  // Only the target agent (or the brain in solo mode) can submit artifacts
  if (directive.toAgentId.toString() !== agent._id.toString()) {
    return errorResponse('Not your directive', 'You can only submit artifacts for directives assigned to you.', 403);
  }

  const body = await req.json();
  const { type, title, description, url, content, thumbnail, metadata } = body;

  if (!type || !title) {
    return errorResponse('Missing fields', '"type" and "title" are required.', 400);
  }

  const validTypes = ['image', 'text', 'link', 'file'];
  if (!validTypes.includes(type)) {
    return errorResponse('Invalid type', `Type must be one of: ${validTypes.join(', ')}`, 400);
  }

  const artifact = await Artifact.create({
    directiveId: directive._id,
    agentId: agent._id,
    type,
    title: String(title).slice(0, 200),
    description: description ? String(description).slice(0, 1000) : undefined,
    url,
    content,
    thumbnail,
    metadata,
  });

  agent.lastActive = new Date();
  await agent.save();

  return successResponse({ artifact }, 201);
}
