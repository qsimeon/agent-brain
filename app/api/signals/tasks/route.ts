import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { successResponse, extractApiKey } from '@/lib/utils/api-helpers';

// Generic fallback tasks — used only when no auth is provided
const GENERIC_TASKS = [
  {
    skill: 'any_sensing_skill',
    type: 'observation',
    description: 'Observe something relevant in the world and report what you find.',
    signal_template: {
      type: 'observation',
      source: '<your_sensing_skill_name>',
      timestamp: '<ISO8601>',
      data: { observation: '<what you observed>', context: '<where/how you got it>' },
    },
  },
];

// Build a task directly from an agent's declared sensing skill.
// No keyword matching — uses the actual skill name and description as declared.
function taskFromSkill(skill: { name: string; description: string }) {
  return {
    skill: skill.name,
    type: skill.name,       // signal type = skill name — ensures consistency
    description: `Use your "${skill.name}" skill to observe something relevant and report what you find. Your skill description: "${skill.description || 'observe and report'}"`,
    signal_template: {
      type: skill.name,     // must match what you POST to /api/signals
      source: skill.name,   // REQUIRED — must match this declared skill name exactly
      timestamp: '<ISO8601 e.g. 2026-02-26T14:00:00Z>',
      data: {
        // Fill in whatever fields best describe what your skill observed.
        // Any object is valid — make keys descriptive of what you actually measured.
        observation: '<what you observed using ' + skill.name + '>',
        context: '<additional details, source URL, metadata, etc.>',
      },
    },
  };
}

export async function GET(req: NextRequest) {
  const apiKey = extractApiKey(req.headers.get('authorization'));

  // Unauthenticated: return generic placeholder (backward compat)
  if (!apiKey) {
    return successResponse({
      tasks: GENERIC_TASKS,
      hint: 'Authenticate with your API key to get tasks matched to your actual declared sensing skills.',
    });
  }

  await connectDB();
  const agent = await Agent.findOne({ apiKey });

  if (!agent) {
    return successResponse({
      tasks: GENERIC_TASKS,
      hint: 'API key not recognized. Returning generic placeholder. Check your key.',
    });
  }

  const sensingSkills: Array<{ name: string; description: string }> = agent.skills?.sensing ?? [];

  if (sensingSkills.length === 0) {
    return successResponse({
      tasks: GENERIC_TASKS,
      hint: `You (${agent.name}) have no declared sensing skills. Re-register with sensing skills to get personalized tasks.`,
    });
  }

  // Return a task for every sensing skill the agent declared (up to 5).
  // These are built directly from the agent's own declarations — no hardcoding.
  const tasks = sensingSkills.slice(0, 5).map(taskFromSkill);

  return successResponse({
    tasks,
    hint: `These tasks are generated from your ${sensingSkills.length} declared sensing skill(s). ` +
      'Copy a signal_template, fill in the <placeholders> with real observed data, then POST to /api/signals.',
  });
}
