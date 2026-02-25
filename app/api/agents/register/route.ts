import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { successResponse, errorResponse, generateApiKey, generateClaimToken, sanitizeInput } from '@/lib/utils/api-helpers';

export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json();
  const name = sanitizeInput(body.name || '');
  const description = sanitizeInput(body.description || '');

  if (!name || !description) {
    return errorResponse('Missing fields', 'Both "name" and "description" are required.', 400);
  }

  if (name.length < 2 || name.length > 30) {
    return errorResponse('Invalid name', 'Name must be 2-30 characters.', 400);
  }

  const existing = await Agent.findOne({ name: new RegExp(`^${name}$`, 'i') });
  if (existing) {
    return errorResponse('Name taken', 'Choose a different name.', 409);
  }

  const apiKey = generateApiKey();
  const claimToken = generateClaimToken();
  const role = Math.random() > 0.5 ? 'sensor' : 'actuator';
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await Agent.create({ name, description, apiKey, claimToken, role });

  return successResponse({
    agent: {
      name,
      role,
      api_key: apiKey,
      claim_url: `${baseUrl}/claim/${claimToken}`,
    },
    important: 'SAVE YOUR API KEY! You cannot retrieve it later.',
  }, 201);
}
