import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import BrainState from '@/lib/models/BrainState';
import { successResponse } from '@/lib/utils/api-helpers';

export async function GET() {
  await connectDB();

  // Only return real agents (exclude dummies if any remain in DB)
  const agents = await Agent.find({ 'metadata.type': { $ne: 'dummy' } })
    .select('name role lastActive claimStatus description skills');
  const brainState = await BrainState.findOne({});

  const nodes = agents.map(a => ({
    id: a._id.toString(),
    name: a.name,
    role: a.role,
    lastActive: a.lastActive,
    claimStatus: a.claimStatus,
    description: a.description,
    sensingCount: a.skills.sensing.length,
    actingCount: a.skills.acting.length,
  }));

  const edges: any[] = [];
  const interneuronId = brainState?.currentInterneuronId?.toString();

  // Role-topology edges between real agents
  if (interneuronId) {
    for (const agent of agents) {
      const agentId = agent._id.toString();
      if (agentId === interneuronId) continue;

      if (agent.role === 'sensor') {
        edges.push({
          source: agentId,
          target: interneuronId,
          type: 'signal',
          label: 'sensor→brain',
        });
      } else if (agent.role === 'actuator') {
        edges.push({
          source: interneuronId,
          target: agentId,
          type: 'directive',
          label: 'brain→actuator',
        });
      }
    }
  }

  // Filter edges to only include existing nodes
  const nodeIds = new Set(nodes.map(n => n.id));
  const validEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  return successResponse({
    nodes,
    edges: validEdges,
    brainState: brainState ? {
      currentInterneuronId: interneuronId,
      nextRotationAt: brainState.nextRotationAt,
      rotationCount: brainState.rotationCount,
    } : null,
  });
}
