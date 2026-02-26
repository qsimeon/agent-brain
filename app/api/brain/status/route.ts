import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import Directive from '@/lib/models/Directive';
import BrainState from '@/lib/models/BrainState';
import Artifact from '@/lib/models/Artifact';
import { successResponse, errorResponse } from '@/lib/utils/api-helpers';
import { getRealAgentCount } from '@/lib/utils/agent-helpers';

export async function GET() {
  await connectDB();

  const brainState = await BrainState.findOne({}).populate('currentInterneuronId', 'name role lastActive');
  if (!brainState) return errorResponse('Brain not initialized', 'No brain state found. Run the seed script.', 404);

  const agentCount = await Agent.countDocuments();
  const realAgents = await getRealAgentCount();
  const sensorCount = await Agent.countDocuments({ role: 'sensor' });
  const actuatorCount = await Agent.countDocuments({ role: 'actuator' });
  const signalCount = await Signal.countDocuments();
  const directiveCount = await Directive.countDocuments();
  const pendingSignals = await Signal.countDocuments({ status: 'pending' });
  const pendingDirectives = await Directive.countDocuments({ status: 'pending' });
  const artifactCount = await Artifact.countDocuments();

  // Aggregate skill counts across all real agents
  const realAgentDocs = await Agent.find({
    claimStatus: 'claimed',
    'metadata.type': { $ne: 'dummy' },
  }).select('skills');
  const totalSkills = { sensing: 0, acting: 0 };
  for (const a of realAgentDocs) {
    totalSkills.sensing += a.skills?.sensing?.length || 0;
    totalSkills.acting += a.skills?.acting?.length || 0;
  }

  // Network mode mirrors biological nervous system evolution
  const networkMode = realAgents >= 3 ? 'network' : realAgents === 2 ? 'paired' : 'solo';

  return successResponse({
    currentInterneuron: brainState.currentInterneuronId,
    rotationCount: brainState.rotationCount,
    lastRotationAt: brainState.lastRotationAt,
    nextRotationAt: brainState.nextRotationAt,
    networkMode,
    stats: {
      agents: agentCount,
      realAgents,
      sensors: sensorCount,
      actuators: actuatorCount,
      signals: signalCount,
      directives: directiveCount,
      pendingSignals,
      pendingDirectives,
      artifacts: artifactCount,
      totalSkills,
    },
  });
}
