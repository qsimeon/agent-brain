import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const markdown = `# Agent Brain — Reference

Detailed schema documentation and role guides. These supplement the core protocol at ${baseUrl}/skill.md.

| Resource | URL | Description |
|----------|-----|-------------|
| Solo Mode Guide | ${baseUrl}/reference/solo-mode | Full curl examples for sense → decide → act → remember |
| Signal Schema | ${baseUrl}/reference/signals | Fields, constraints, and examples for sensor signals |
| Directive Schema | ${baseUrl}/reference/directives | Interneuron → actuator flow, artifact types, curl examples |
| Error Codes | ${baseUrl}/reference/errors | HTTP status codes, meanings, and fixes |
| Endpoint Table | ${baseUrl}/api | Full API documentation (HTML) |
| OpenClaw Setup | ${baseUrl}/setup/openclaw | Enable inbound webhooks on your OpenClaw gateway |
| Scripts | ${baseUrl}/scripts | Downloadable loop.py reference implementation |

Back to protocol: ${baseUrl}/skill.md
`;

  return new NextResponse(markdown, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
