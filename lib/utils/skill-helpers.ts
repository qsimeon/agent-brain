import Agent from '@/lib/models/Agent';
import { ISkill } from '@/lib/models/Agent';

/**
 * Validate that sensing and acting skill sets are disjoint and non-empty.
 */
export function validateSkills(
  sensing: ISkill[],
  acting: ISkill[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (sensing.length === 0 && acting.length === 0) {
    errors.push('Agent must declare at least one skill.');
  }

  // Check disjoint — no skill name should appear in both buckets
  const sensingNames = new Set(sensing.map(s => s.name.toLowerCase().trim()));
  const actingNames = new Set(acting.map(s => s.name.toLowerCase().trim()));
  const overlap = [...sensingNames].filter(n => actingNames.has(n));
  if (overlap.length > 0) {
    errors.push(`Skills cannot be in both sensing and acting: ${overlap.join(', ')}`);
  }

  // Validate individual skills have names
  for (const skill of [...sensing, ...acting]) {
    if (!skill.name || skill.name.trim().length === 0) {
      errors.push('Each skill must have a non-empty name.');
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Assign role based on current network composition.
 * - First real agent → interneuron.
 * - All others → whichever of sensor/actuator is currently fewer (load balancing).
 *   Ties broken randomly so the first two non-interneuron agents get one of each.
 *
 * Counts ALL real agents regardless of claimStatus so that concurrent
 * registrations before claiming don't both get the same role.
 * The claim endpoint enforces the interneuron invariant as a safety net.
 */
export async function assignRoleBySkills(): Promise<'sensor' | 'actuator' | 'interneuron'> {
  const realFilter = { 'metadata.type': { $ne: 'dummy' } };

  const anyRealAgent = await Agent.countDocuments(realFilter);
  if (anyRealAgent === 0) return 'interneuron';

  const [sensors, actuators] = await Promise.all([
    Agent.countDocuments({ ...realFilter, role: 'sensor' }),
    Agent.countDocuments({ ...realFilter, role: 'actuator' }),
  ]);

  if (sensors < actuators) return 'sensor';
  if (actuators < sensors) return 'actuator';
  // Equal (including 0/0 on second agent) — break tie randomly
  return Math.random() < 0.5 ? 'sensor' : 'actuator';
}
