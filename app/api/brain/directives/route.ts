import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import Directive from '@/lib/models/Directive';
import BrainState from '@/lib/models/BrainState';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';
import { getRealAgentCount } from '@/lib/utils/agent-helpers';

export async function POST(req: NextRequest) {
  await connectDB();

  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return errorResponse('Missing API key', 'Include Authorization header.', 401);

  const agent = await Agent.findOne({ apiKey });
  if (!agent) return errorResponse('Invalid API key', 'Agent not found.', 401);

  if (agent.role !== 'interneuron') {
    return errorResponse('Not the brain', 'Only the interneuron can issue directives.', 403);
  }

  // Verify this is the CURRENT interneuron (not a dummy ThinkBot)
  const brainState = await BrainState.findOne({});
  if (!brainState || brainState.currentInterneuronId.toString() !== agent._id.toString()) {
    return errorResponse('Not current interneuron', 'You are not the active interneuron right now.', 403);
  }

  const { toAgentName, type, payload, processSignalIds, requiredSkills, expectedOutput } = await req.json();

  if (!toAgentName || !type || !payload) {
    return errorResponse('Missing fields', '"toAgentName", "type", and "payload" are required.', 400);
  }

  if (typeof payload !== 'object' || Array.isArray(payload)) {
    return errorResponse('Invalid payload', '"payload" must be an object.', 400);
  }
  if (!payload.instructions || typeof payload.instructions !== 'string' || payload.instructions.trim() === '') {
    return errorResponse(
      'Missing payload.instructions',
      '"payload.instructions" is required — a clear string telling the actuator exactly what to do. ' +
      'Shape: { "payload": { "instructions": "...", "context": "...", "input_data": {} } }',
      400,
    );
  }
  if (!payload.context || typeof payload.context !== 'string' || payload.context.trim() === '') {
    return errorResponse(
      'Missing payload.context',
      '"payload.context" is required — explain WHY this directive is being issued (what signals prompted it). ' +
      'Shape: { "payload": { "instructions": "...", "context": "...", "input_data": {} } }',
      400,
    );
  }

  const targetAgent = await Agent.findOne({ name: new RegExp(`^${toAgentName}$`, 'i') });
  if (!targetAgent) return errorResponse('Target agent not found', `No agent named "${toAgentName}".`, 404);

  // Progressive enforcement based on real agent count
  const realCount = await getRealAgentCount();
  if (realCount >= 3) {
    // Network mode: target must be an actuator
    if (targetAgent.role !== 'actuator') {
      return errorResponse('Target is not an actuator', `Agent "${toAgentName}" has role "${targetAgent.role}", not "actuator".`, 400);
    }
  } else if (realCount === 1) {
    // Solo mode: brain can direct itself (it's the only agent)
    if (targetAgent.metadata?.type === 'dummy') {
      return errorResponse('Target is a placeholder', `Agent "${toAgentName}" is a placeholder agent and cannot execute directives.`, 400);
    }
  } else {
    // Paired mode: brain should delegate to its partner, not itself
    if (targetAgent.metadata?.type === 'dummy') {
      return errorResponse('Target is a placeholder', `Agent "${toAgentName}" is a placeholder agent and cannot execute directives.`, 400);
    }
    if (targetAgent._id.toString() === agent._id.toString()) {
      return errorResponse(
        'Delegate to your partner',
        `You are the brain in paired mode. Instead of directing yourself, issue directives to your partner agent. Check GET /api/agents to see who else is available.`,
        400,
      );
    }
  }

  // Validate required skills if specified
  if (requiredSkills && Array.isArray(requiredSkills) && requiredSkills.length > 0) {
    const targetActingSkills = new Set(
      targetAgent.skills.acting.map((s: any) => s.name.toLowerCase())
    );
    const missing = requiredSkills.filter(
      (s: string) => !targetActingSkills.has(s.toLowerCase())
    );
    if (missing.length > 0 && targetAgent._id.toString() !== agent._id.toString()) {
      return errorResponse(
        'Missing required skills',
        `Agent "${toAgentName}" lacks acting skills: ${missing.join(', ')}. Check their skills via GET /api/agents/${toAgentName}.`,
        400,
      );
    }
  }

  const directive = await Directive.create({
    fromBrainId: agent._id,
    toAgentId: targetAgent._id,
    type,
    payload: {
      ...payload,
      ...(requiredSkills ? { requiredSkills } : {}),
      ...(expectedOutput ? { expectedOutput } : {}),
    },
    status: 'pending',
  });

  // Mark processed signals
  if (processSignalIds && Array.isArray(processSignalIds)) {
    await Signal.updateMany(
      { _id: { $in: processSignalIds } },
      { status: 'processed', processedByBrainId: agent._id }
    );
  }

  agent.lastActive = new Date();
  await agent.save();

  return successResponse({ directive }, 201);
}
