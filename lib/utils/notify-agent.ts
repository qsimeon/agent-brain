/**
 * notify-agent.ts
 *
 * Push a message to an agent via their registered webhook.
 * Supports OpenClaw gateways (/hooks/wake) and generic POST webhooks.
 * If the agent has no webhookConfig, this is a no-op — they must poll.
 */

import { IAgent, IWebhookConfig } from '@/lib/models/Agent';

interface DirectivePayload {
  id: string;
  type: string;
  payload: {
    instructions: string;
    context: string;
    input_data?: Record<string, unknown>;
  };
}

const BASE_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/** Build a self-contained directive message the agent can act on without any additional API calls. */
function buildDirectiveMessage(agent: IAgent, directive: DirectivePayload): string {
  const did = directive.id;
  const { instructions, context, input_data } = directive.payload;

  return [
    `You have a new directive on Agent Brain.`,
    ``,
    `DIRECTIVE ID: ${did}`,
    `TYPE: ${directive.type}`,
    ``,
    `INSTRUCTIONS (what to do):`,
    instructions,
    ``,
    `CONTEXT (why — what sensor signals prompted this):`,
    context,
    input_data && Object.keys(input_data).length > 0
      ? `\nINPUT DATA:\n${JSON.stringify(input_data, null, 2)}`
      : '',
    ``,
    `Complete this directive by calling these endpoints with your API key:`,
    ``,
    `1. Accept (mark in-progress):`,
    `   POST ${BASE_URL}/api/directives/${did}/accept`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body: {}`,
    ``,
    `2. Complete (report result):`,
    `   POST ${BASE_URL}/api/directives/${did}/complete`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body: {"result": {"status": "success", "action_taken": "describe what you did"}}`,
    ``,
    `3. Submit artifact (optional — if you produced something):`,
    `   POST ${BASE_URL}/api/directives/${did}/artifact`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body (text): {"type": "text", "title": "...", "content": "..."}`,
    `   Body (link): {"type": "link", "title": "...", "url": "...", "description": "..."}`,
  ].filter(line => line !== undefined).join('\n');
}

/** Build a sensor ping message. */
function buildSensorPingMessage(agent: IAgent): string {
  const sensingSkills = agent.skills.sensing.map((s) => s.name).join(', ');

  return [
    `Agent Brain is requesting a new sensor reading from you.`,
    ``,
    `Your sensing skills: ${sensingSkills || '(none declared)'}`,
    ``,
    `INSTRUCTIONS:`,
    `Use one of your sensing skills to observe something in the world right now.`,
    `Then submit your observation as a signal.`,
    ``,
    `Step 1 — Get a personalized task suggestion (optional):`,
    `   GET ${BASE_URL}/api/signals/tasks`,
    `   Authorization: Bearer YOUR_API_KEY`,
    ``,
    `Step 2 — Submit your signal:`,
    `   POST ${BASE_URL}/api/signals`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body:`,
    `   {`,
    `     "type": "<descriptive label, e.g. web_check>",`,
    `     "source": "<must match one of your sensing skill names>",`,
    `     "timestamp": "<ISO8601 timestamp>",`,
    `     "data": { <what you observed — any key-value pairs> }`,
    `   }`,
  ].join('\n');
}

/** Send a message to an OpenClaw agent via /hooks/wake */
async function notifyOpenClaw(config: IWebhookConfig, text: string): Promise<boolean> {
  if (!config.gatewayUrl || !config.hookToken) return false;

  const url = `${config.gatewayUrl.replace(/\/$/, '')}/hooks/wake`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.hookToken}`,
      },
      body: JSON.stringify({ text, mode: 'now' }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Send a message to a generic webhook */
async function notifyWebhook(config: IWebhookConfig, payload: Record<string, unknown>): Promise<boolean> {
  if (!config.url) return false;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.secret) headers['Authorization'] = `Bearer ${config.secret}`;

  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Push a directive to an actuator agent. Called after directive is created. */
export async function notifyAgentOfDirective(agent: IAgent, directive: DirectivePayload): Promise<void> {
  const config = agent.webhookConfig;
  if (!config) return;

  const message = buildDirectiveMessage(agent, directive);

  if (config.type === 'openclaw') {
    await notifyOpenClaw(config, message);
  } else if (config.type === 'webhook') {
    await notifyWebhook(config, {
      event: 'directive',
      directive: {
        id: directive.id,
        type: directive.type,
        payload: directive.payload,
      },
      message,
    });
  }
}

/** Push a sensor ping to an agent. Called from POST /api/signals/ping. */
export async function notifyAgentOfSensorPing(agent: IAgent): Promise<boolean> {
  const config = agent.webhookConfig;
  if (!config) return false;

  const message = buildSensorPingMessage(agent);

  if (config.type === 'openclaw') {
    return notifyOpenClaw(config, message);
  } else if (config.type === 'webhook') {
    return notifyWebhook(config, { event: 'sensor_ping', message });
  }
  return false;
}
