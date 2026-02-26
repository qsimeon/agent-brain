import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import Directive from '@/lib/models/Directive';
import BrainState from '@/lib/models/BrainState';
import { successResponse } from '@/lib/utils/api-helpers';

export async function GET() {
  await connectDB();

  const agents = await Agent.find().select('name role lastActive claimStatus description metadata');
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
    isPlaceholder: a.metadata?.type === 'dummy',
  }));

  const edges: any[] = [];
  const interneuronId = brainState?.currentInterneuronId?.toString();
  const connectedNodeIds = new Set<string>();

  // Build a set of dummy agent IDs to filter them from edges
  const dummyIds = new Set(
    agents.filter(a => a.metadata?.type === 'dummy').map(a => a._id.toString())
  );

  // Signal edges: sensor → interneuron (skip dummies)
  for (const sig of recentSignals) {
    if (interneuronId) {
      const sourceId = sig.fromAgentId.toString();
      const targetId = sig.processedByBrainId?.toString() || interneuronId;
      if (dummyIds.has(sourceId) || dummyIds.has(targetId)) continue;
      edges.push({
        source: sourceId,
        target: targetId,
        type: 'signal',
        label: sig.type,
        createdAt: sig.createdAt,
      });
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    }
  }

  // Directive edges: interneuron → actuator (skip dummies)
  for (const dir of recentDirectives) {
    const sourceId = dir.fromBrainId.toString();
    const targetId = dir.toAgentId.toString();
    if (dummyIds.has(sourceId) || dummyIds.has(targetId)) continue;
    edges.push({
      source: sourceId,
      target: targetId,
      type: 'directive',
      label: dir.type,
      status: dir.status,
      createdAt: dir.createdAt,
    });
    connectedNodeIds.add(sourceId);
    connectedNodeIds.add(targetId);
  }

  // Structural edges: connect real, non-interneuron agents to the interneuron
  // Dummies float unconnected — they're just placeholders
  if (interneuronId) {
    for (const agent of agents) {
      const agentId = agent._id.toString();
      if (agentId === interneuronId) continue;
      if (dummyIds.has(agentId)) continue; // skip dummies
      if (connectedNodeIds.has(agentId)) continue;
      const edgeType = agent.role === 'sensor' ? 'signal' : 'directive';
      edges.push({
        source: edgeType === 'signal' ? agentId : interneuronId,
        target: edgeType === 'signal' ? interneuronId : agentId,
        type: edgeType,
        label: 'awaiting',
      });
    }
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
