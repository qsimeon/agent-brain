import { errorResponse } from '@/lib/utils/api-helpers';

export async function GET() {
  return errorResponse('Wrong URL', 'Use /api/agents/claim/[token] with your claim token.', 400);
}
