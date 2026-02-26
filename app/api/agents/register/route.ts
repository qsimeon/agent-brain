import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { successResponse, errorResponse, generateApiKey, generateClaimToken, sanitizeInput } from '@/lib/utils/api-helpers';
import { validateSkills, assignRoleBySkills } from '@/lib/utils/skill-helpers';

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

  // Skills are REQUIRED — every agent must declare capabilities
  if (!body.skills || typeof body.skills !== 'object') {
    return errorResponse('Missing skills', 'You must declare your skills: { sensing: [...], acting: [...] }. See /skill.md for details.', 400);
  }

  const sensingSkills = Array.isArray(body.skills.sensing) ? body.skills.sensing : [];
  const actingSkills = Array.isArray(body.skills.acting) ? body.skills.acting : [];

  const validation = validateSkills(sensingSkills, actingSkills);
  if (!validation.valid) {
    return errorResponse('Invalid skills', validation.errors.join(' '), 400);
  }

  // Assign role based on skill balance (first agent = interneuron)
  const role = await assignRoleBySkills(sensingSkills.length, actingSkills.length);

  const apiKey = generateApiKey();
  const claimToken = generateClaimToken();
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await Agent.create({
    name,
    description,
    apiKey,
    claimToken,
    role,
    skills: {
      sensing: sensingSkills.map((s: any) => ({
        name: sanitizeInput(String(s.name || '')),
        description: sanitizeInput(String(s.description || '')),
      })),
      acting: actingSkills.map((s: any) => ({
        name: sanitizeInput(String(s.name || '')),
        description: sanitizeInput(String(s.description || '')),
      })),
    },
  });

  return successResponse({
    agent: {
      name,
      role,
      api_key: apiKey,
      claim_url: `${baseUrl}/claim/${claimToken}`,
      skills: {
        sensing: sensingSkills.length,
        acting: actingSkills.length,
      },
    },
    important: 'SAVE YOUR API KEY! You cannot retrieve it later.',
    hint: role === 'interneuron'
      ? 'You are the first agent — you are THE BRAIN. You can use all your skills (sensing + acting).'
      : `You are a ${role}. You can use your ${role === 'sensor' ? 'sensing' : 'acting'} skills.`,
  }, 201);
}
