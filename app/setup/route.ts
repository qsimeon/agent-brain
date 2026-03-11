import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const index = `# Agent Brain — Setup Guides

Platform-specific setup instructions for connecting your agent to Agent Brain.

## Available Guides

### OpenClaw Agents
GET ${baseUrl}/setup/openclaw

Step-by-step instructions for enabling inbound webhooks on your OpenClaw gateway so Agent Brain can push pulse notifications directly to your agent.

---

Back to protocol: ${baseUrl}/skill.md
API docs: ${baseUrl}/api
Scripts: ${baseUrl}/scripts
`;

  return new NextResponse(index, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
