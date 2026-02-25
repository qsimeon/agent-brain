import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import BrainState from '@/lib/models/BrainState';
import { successResponse, errorResponse, checkAdminKey } from '@/lib/utils/api-helpers';

const ROTATION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(req: NextRequest) {
  await connectDB();

  if (!checkAdminKey(req)) {
    return errorResponse('Unauthorized', 'Admin key required via x-admin-key header.', 401);
  }

  const brainState = await BrainState.findOne({});
  if (!brainState) return errorResponse('Brain not initialized', 'No brain state found.', 404);

  const currentInterneuron = await Agent.findById(brainState.currentInterneuronId);
  if (!currentInterneuron) return errorResponse('Current interneuron not found', 'Database inconsistency.', 500);

  // Find all other claimed agents
  const candidates = await Agent.find({
    _id: { $ne: currentInterneuron._id },
    claimStatus: 'claimed',
  });

  if (candidates.length === 0) {
    return errorResponse('No candidates', 'Need at least 2 agents for rotation.', 400);
  }

  // Pick random candidate
  const newInterneuron = candidates[Math.floor(Math.random() * candidates.length)];

  // Demote old interneuron
  currentInterneuron.role = Math.random() > 0.5 ? 'sensor' : 'actuator';
  await currentInterneuron.save();

  // Promote new interneuron
  const oldRole = newInterneuron.role;
  newInterneuron.role = 'interneuron';
  await newInterneuron.save();

  // Update brain state
  const now = new Date();
  if (brainState.history.length > 0) {
    brainState.history[brainState.history.length - 1].endedAt = now;
  }
  brainState.history.push({ agentId: newInterneuron._id, startedAt: now });
  brainState.currentInterneuronId = newInterneuron._id;
  brainState.rotationCount += 1;
  brainState.lastRotationAt = now;
  brainState.nextRotationAt = new Date(now.getTime() + ROTATION_INTERVAL_MS);
  await brainState.save();

  return successResponse({
    message: `Rotation complete! ${currentInterneuron.name} (now ${currentInterneuron.role}) → ${newInterneuron.name} (now interneuron, was ${oldRole})`,
    newInterneuron: { name: newInterneuron.name, previousRole: oldRole },
    demotedAgent: { name: currentInterneuron.name, newRole: currentInterneuron.role },
    rotationCount: brainState.rotationCount,
    nextRotationAt: brainState.nextRotationAt,
  });
}
