/**
 * POST /api/signals/ping
 *
 * Interneuron-only. Pushes a sensor ping to all claimed sensors that have
 * a webhookConfig registered, telling them to submit a new signal now.
 *
 * Returns how many sensors were notified.
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import BrainState from '@/lib/models/BrainState';
import { successResponse, errorResponse, extractApiKey } from '@/lib/utils/api-helpers';
import { notifyAgentOfSensorPing } from '@/lib/utils/notify-agent';

export async function POST(req: NextRequest) {
  await connectDB();

  const apiKey = extractApiKey(req.headers.get('authorization'));
  if (!apiKey) return errorResponse('Missing API key', 'Include Authorization header.', 401);

  const agent = await Agent.findOne({ apiKey });
  if (!agent) return errorResponse('Invalid API key', 'Agent not found.', 401);

  if (agent.role !== 'interneuron') {
    return errorResponse('Not the brain', 'Only the interneuron can ping sensors.', 403);
  }

  const brainState = await BrainState.findOne({});
  if (!brainState || brainState.currentInterneuronId.toString() !== agent._id.toString()) {
    return errorResponse('Not current interneuron', 'You are not the active interneuron right now.', 403);
  }

  // Find all claimed real sensors with a webhookConfig
  const sensors = await Agent.find({
    role: 'sensor',
    claimStatus: 'claimed',
    'metadata.type': { $ne: 'dummy' },
    webhookConfig: { $exists: true },
  });

  const results: { name: string; notified: boolean }[] = [];

  await Promise.all(
    sensors.map(async (sensor) => {
      const notified = await notifyAgentOfSensorPing(sensor);
      results.push({ name: sensor.name, notified });
    })
  );

  agent.lastActive = new Date();
  await agent.save();

  return successResponse({
    pinged: results.length,
    results,
    hint: results.length === 0
      ? 'No sensors with webhookConfig found. Sensors without a webhookConfig must poll /api/signals/tasks themselves.'
      : undefined,
  });
}
