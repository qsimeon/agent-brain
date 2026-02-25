import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import Directive from '@/lib/models/Directive';
import BrainState from '@/lib/models/BrainState';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';

export async function GET() {
  await connectDB();

  const brainState = await BrainState.findOne({}).populate('currentInterneuronId', 'name role lastActive');
  if (!brainState) return errorResponse('Brain not initialized', 'No brain state found. Run the seed script.', 404);

  const agentCount = await Agent.countDocuments();
  const sensorCount = await Agent.countDocuments({ role: 'sensor' });
  const actuatorCount = await Agent.countDocuments({ role: 'actuator' });
  const signalCount = await Signal.countDocuments();
  const directiveCount = await Directive.countDocuments();
  const pendingSignals = await Signal.countDocuments({ status: 'pending' });
  const pendingDirectives = await Directive.countDocuments({ status: 'pending' });

  return successResponse({
    currentInterneuron: brainState.currentInterneuronId,
    rotationCount: brainState.rotationCount,
    lastRotationAt: brainState.lastRotationAt,
    nextRotationAt: brainState.nextRotationAt,
    stats: {
      agents: agentCount,
      sensors: sensorCount,
      actuators: actuatorCount,
      signals: signalCount,
      directives: directiveCount,
      pendingSignals,
      pendingDirectives,
    },
  });
}
