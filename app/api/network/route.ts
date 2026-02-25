import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import Directive from '@/lib/models/Directive';
import BrainState from '@/lib/models/BrainState';
import { successResponse } from '@/lib/utils/api-helpers';

export async function GET() {
  await connectDB();

  const agents = await Agent.find().select('name role lastActive claimStatus description');
  const brainState = await BrainState.findOne({});

  // Get recent signals and directives for edges
  const recentSignals = await Signal.find()
    .sort({ createdAt: -1 })
    .limit(30)
    .select('fromAgentId processedByBrainId type createdAt status');

  const recentDirectives = await Directive.find()
    .sort({ createdAt: -1 })
    .limit(30)
    .select('fromBrainId toAgentId type status createdAt');

  const nodes = agents.map(a => ({
    id: a._id.toString(),
    name: a.name,
    role: a.role,
    lastActive: a.lastActive,
    claimStatus: a.claimStatus,
    description: a.description,
  }));

  const edges: any[] = [];

  // Signal edges: sensor → interneuron
  const interneuronId = brainState?.currentInterneuronId?.toString();
  for (const sig of recentSignals) {
    if (interneuronId) {
      edges.push({
        source: sig.fromAgentId.toString(),
        target: sig.processedByBrainId?.toString() || interneuronId,
        type: 'signal',
        label: sig.type,
        createdAt: sig.createdAt,
      });
    }
  }

  // Directive edges: interneuron → actuator
  for (const dir of recentDirectives) {
    edges.push({
      source: dir.fromBrainId.toString(),
      target: dir.toAgentId.toString(),
      type: 'directive',
      label: dir.type,
      status: dir.status,
      createdAt: dir.createdAt,
    });
  }

  return successResponse({
    nodes,
    edges,
    brainState: brainState ? {
      currentInterneuronId: interneuronId,
      nextRotationAt: brainState.nextRotationAt,
      rotationCount: brainState.rotationCount,
    } : null,
  });
}
