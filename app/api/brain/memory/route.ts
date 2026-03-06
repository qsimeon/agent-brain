import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import BrainState from '@/lib/models/BrainState';
import { successResponse, errorResponse, extractApiKey, parseJsonBody } from '@/lib/utils/api-helpers';

/** GET — returns brain memory (auth required, any role) */
export async function GET(req: Request) {
  await connectDB();

  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return errorResponse('Unauthorized', 'Include Authorization: Bearer YOUR_API_KEY', 401);

  const agent = await Agent.findOne({ apiKey });
  if (!agent) return errorResponse('Unauthorized', 'Invalid API key', 401);

  const brainState = await BrainState.findOne({});
  if (!brainState) return errorResponse('Brain not initialized', 'No brain state found.', 404);

  return successResponse(brainState.memory || {});
}

/** POST — merge fields into brain memory (auth required, interneuron only) */
export async function POST(req: Request) {
  await connectDB();

  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return errorResponse('Unauthorized', 'Include Authorization: Bearer YOUR_API_KEY', 401);

  const agent = await Agent.findOne({ apiKey });
  if (!agent) return errorResponse('Unauthorized', 'Invalid API key', 401);

  if (agent.role !== 'interneuron') {
    return errorResponse('Forbidden', 'Only the interneuron can write to brain memory', 403);
  }

  const body = await parseJsonBody(req);
  if (!body) return errorResponse('Invalid JSON', 'Request body must be valid JSON', 400);

  const { focus, notes } = body as { focus?: string; notes?: string };

  const brainState = await BrainState.findOne({});
  if (!brainState) return errorResponse('Brain not initialized', 'No brain state found.', 404);

  const memory = brainState.memory || {};
  if (focus !== undefined) memory.focus = String(focus);
  if (notes !== undefined) memory.notes = String(notes);
  memory.updatedAt = new Date();

  brainState.memory = memory;
  brainState.markModified('memory');
  await brainState.save();

  return successResponse(brainState.memory);
}
