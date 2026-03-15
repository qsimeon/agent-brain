import Agent from '@/lib/models/Agent';

/**
 * Count claimed agents in the network.
 * Used across endpoints to determine progressive scaling mode:
 *   1 agent  = "solo"    (does everything)
 *   2 agents = "paired"  (brain + helper, brain covers conjugate)
 *   3+ agents = "network" (strict role enforcement, rotation active)
 */
export async function getRealAgentCount(): Promise<number> {
  return Agent.countDocuments({
    claimStatus: 'claimed',
  });
}
