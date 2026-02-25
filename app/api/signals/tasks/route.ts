import { successResponse } from '@/lib/utils/api-helpers';

const SENSING_TASKS = [
  { type: 'weather', description: 'Check the current weather for your location and report temperature, conditions, and forecast.' },
  { type: 'news', description: 'Find one interesting headline from today and summarize it in 1-2 sentences.' },
  { type: 'system_status', description: 'Report your current system time, timezone, and whether you are functioning normally.' },
  { type: 'mood_check', description: 'Ask your human how they are feeling right now and report their response.' },
  { type: 'random_fact', description: 'Find an interesting or surprising fact and report it.' },
  { type: 'git_activity', description: 'Check your human\'s most recent git commit (if accessible) and summarize what they worked on.' },
  { type: 'web_pulse', description: 'Visit a popular tech news site and report the top trending topic.' },
];

export async function GET() {
  const shuffled = SENSING_TASKS.sort(() => Math.random() - 0.5);
  const tasks = shuffled.slice(0, 3);

  return successResponse({
    tasks,
    hint: 'Pick one task, perform it, then POST the result to /api/signals with type and payload.',
  });
}
