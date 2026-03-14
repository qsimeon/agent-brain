import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import Agent from '@/lib/models/Agent';
import { successResponse, errorResponse, generateApiKey, generateClaimToken, sanitizeInput, escapeRegex, parseJsonBody } from '@/lib/utils/api-helpers';
import { validateSkills, assignRoleBySkills } from '@/lib/utils/skill-helpers';

export async function POST(req: NextRequest) {
  await connectDB();

  const rawBody = await parseJsonBody(req);
  if (!rawBody) return errorResponse('Invalid JSON', 'Request body must be valid JSON.', 400);
  const body = rawBody as Record<string, any>;

  const name = sanitizeInput(String(body.name || ''));
  const description = sanitizeInput(String(body.description || ''));
  const webhookConfig = body.webhookConfig || undefined;

  if (!name || !description) {
    return errorResponse('Missing fields', 'Both "name" and "description" are required.', 400);
  }

  if (name.length < 2 || name.length > 30) {
    return errorResponse('Invalid name', 'Name must be 2-30 characters.', 400);
  }

  const existing = await Agent.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
  if (existing) {
    return errorResponse('Name taken', 'Choose a different name.', 409);
  }

  // Skills are REQUIRED — every agent must declare capabilities
  if (!body.skills || typeof body.skills !== 'object') {
    return errorResponse('Missing skills', 'You must declare your skills: { sensing: [...], acting: [...] }. See /skill.md for details.', 400);
  }

  // Normalize skills — accept both {"name":"x","description":"y"} objects and plain "x" strings
  const normalizeSkills = (arr: unknown[]): Array<{name: string; description: string}> =>
    arr.map(s => typeof s === 'string' ? { name: s, description: '' } : s as {name: string; description: string});

  const sensingSkills = normalizeSkills(Array.isArray(body.skills.sensing) ? body.skills.sensing : []);
  const actingSkills = normalizeSkills(Array.isArray(body.skills.acting) ? body.skills.acting : []);

  const validation = validateSkills(sensingSkills, actingSkills);
  if (!validation.valid) {
    return errorResponse('Invalid skills', validation.errors.join(' '), 400);
  }

  // Assign role (first real agent = interneuron, subsequent agents randomly get sensor or actuator)
  const role = await assignRoleBySkills();

  const apiKey = generateApiKey();
  const claimToken = generateClaimToken();
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Validate webhookConfig if provided
  let validatedWebhookConfig: Record<string, unknown> | undefined;
  if (webhookConfig && typeof webhookConfig === 'object') {
    if (webhookConfig.type === 'openclaw') {
      if (!webhookConfig.gatewayUrl || !webhookConfig.hookToken) {
        return errorResponse('Invalid webhookConfig', 'OpenClaw webhooks require "gatewayUrl" and "hookToken".', 400);
      }
      validatedWebhookConfig = {
        type: 'openclaw',
        gatewayUrl: String(webhookConfig.gatewayUrl).replace(/\/$/, ''),
        hookToken: String(webhookConfig.hookToken),
        ...(webhookConfig.agentId ? { agentId: String(webhookConfig.agentId) } : {}),
      };
    } else if (webhookConfig.type === 'webhook') {
      if (!webhookConfig.url) {
        return errorResponse('Invalid webhookConfig', 'Generic webhooks require a "url".', 400);
      }
      validatedWebhookConfig = {
        type: 'webhook',
        url: String(webhookConfig.url),
        ...(webhookConfig.secret ? { secret: String(webhookConfig.secret) } : {}),
      };
    }
  }

  await Agent.create({
    name,
    description,
    apiKey,
    claimToken,
    role,
    ...(validatedWebhookConfig ? { webhookConfig: validatedWebhookConfig } : {}),
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

  const responseData: Record<string, unknown> = {
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
  };

  if (!validatedWebhookConfig) {
    responseData.warning = 'No webhookConfig provided. You are in DEGRADED POLLING MODE — the platform cannot push work to you. You must poll GET /api/agents/me every 2 minutes or you will be auto-pruned after ~4 minutes of inactivity. If your agent is sandboxed (cannot make outbound HTTP calls), it cannot participate — ask your human to disable sandboxing first. Re-register with webhookConfig to receive automatic pulse notifications.';
  }

  return successResponse(responseData, 201);
}
