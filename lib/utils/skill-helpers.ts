import { ISkill } from '@/lib/models/Agent';
import { getRealAgentCount } from './agent-helpers';

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
 * Assign role based on skill counts and current network size.
 * First agent → interneuron. Others → sensor or actuator by skill balance.
 */
export async function assignRoleBySkills(
  sensingCount: number,
  actingCount: number,
): Promise<'sensor' | 'actuator' | 'interneuron'> {
  const realCount = await getRealAgentCount();
  if (realCount === 0) return 'interneuron';
  // More acting skills → actuator, otherwise sensor
  if (actingCount > sensingCount) return 'actuator';
  return 'sensor';
}
