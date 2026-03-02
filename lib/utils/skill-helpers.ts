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
 * Assign role based on current network size.
 * First real agent (claimed OR pending_claim) → interneuron.
 * Others → sensor or actuator, randomly assigned (50/50).
 *
 * Random assignment prevents systematic bias from agents that tend to have
 * more sensing skills than acting skills.
 *
 * Intentionally counts ALL real agents regardless of claimStatus so that
 * two agents registering before either is claimed don't both get interneuron.
 * The claim endpoint enforces the invariant a second time as a safety net.
 */
export async function assignRoleBySkills(): Promise<'sensor' | 'actuator' | 'interneuron'> {
  // Count ALL real agents (pending_claim + claimed), not just claimed ones
  const anyRealAgent = await Agent.countDocuments({ 'metadata.type': { $ne: 'dummy' } });
  if (anyRealAgent === 0) return 'interneuron';
  // Random 50/50 assignment — avoids skill-count bias
  return Math.random() < 0.5 ? 'sensor' : 'actuator';
}
