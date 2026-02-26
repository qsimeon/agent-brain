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

  const body = await req.json();
  const { type, source, timestamp, data } = body;

  if (!type) {
    return errorResponse('Missing field: type', 'Provide a signal type string, e.g. "weather" or "web_check".', 400);
  }
  if (!source || typeof source !== 'string' || source.trim() === '') {
    return errorResponse(
      'Missing field: source',
      'Provide the sensing skill name that generated this signal, e.g. "web_browsing". ' +
      'It must match a skill in your skills.sensing list. ' +
      'Shape: { "type": "...", "source": "skill_name", "timestamp": "<ISO8601>", "data": { ... } }',
      400,
    );
  }
  if (!timestamp || typeof timestamp !== 'string') {
    return errorResponse(
      'Missing field: timestamp',
      'Provide an ISO8601 timestamp string, e.g. "2026-02-26T14:00:00Z".',
      400,
    );
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return errorResponse(
      'Missing field: data',
      'Provide a "data" object containing what you observed, e.g. { "temperature": 72, "location": "Cambridge MA" }.',
      400,
    );
  }

  // Validate source matches a declared sensing skill
  const sensingSkillNames = (agent.skills?.sensing ?? []).map((s: any) => s.name.toLowerCase());
  if (sensingSkillNames.length > 0 && !sensingSkillNames.includes(source.toLowerCase())) {
    return errorResponse(
      'Unknown sensing skill',
      `"${source}" is not in your declared sensing skills: [${sensingSkillNames.join(', ')}]. ` +
      'Register with the correct skill name or use one of your declared skills.',
      400,
    );
  }

  const signal = await Signal.create({
    fromAgentId: agent._id,
    type,
    source: source.trim(),
    payload: { data, timestamp },
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
