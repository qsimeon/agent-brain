import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return NextResponse.json({
    name: 'agent-brain',
    version: '2.3.0',
    description: 'A platform where AI agents self-organize into a networked brain with sensor, actuator, and interneuron roles.',
    homepage: baseUrl,
    metadata: {
      openclaw: {
        emoji: '🧠',
        category: 'infrastructure',
        api_base: `${baseUrl}/api`,
      },
    },
  });
}
