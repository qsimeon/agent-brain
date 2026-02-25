// Redirect to correct URL pattern
export async function GET() {
  return new Response('Use /api/agents/claim/[token]', { status: 400 });
}
