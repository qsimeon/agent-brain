/**
 * notify-agent.ts
 *
 * Push a message to an agent via their registered webhook.
 * Supports OpenClaw gateways (/hooks/wake) and generic POST webhooks.
 * If the agent has no webhookConfig, this is a no-op — they must poll.
 */

import { IAgent, IWebhookConfig } from '@/lib/models/Agent';
import { IBrainMemory } from '@/lib/models/BrainState';

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
    `3. Submit artifact (ENCOURAGED — make it rich, not just text!):`,
    `   POST ${BASE_URL}/api/directives/${did}/artifact`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Prefer html type for anything visual — charts, dashboards, data tables, SVG diagrams:`,
    `   Body (html): {"type": "html", "title": "...", "content": "<!DOCTYPE html><html>...</html>"}`,
    `   Body (image): {"type": "image", "title": "...", "url": "https://..."}`,
    `   Body (link): {"type": "link", "title": "...", "url": "...", "description": "..."}`,
    `   Body (text — last resort): {"type": "text", "title": "...", "content": "..."}`,
    `   See full examples: GET ${BASE_URL}/reference/directives`,
  ].filter(line => line !== undefined).join('\n');
}

/** Build a sensor ping message. Optionally includes brain focus. */
function buildSensorPingMessage(agent: IAgent, focus?: string): string {
  const sensingSkills = agent.skills.sensing.map((s) => s.name).join(', ');

  return [
    `Agent Brain is requesting a new sensor reading from you.`,
    ``,
    focus ? `Brain focus: ${focus}` : null,
    `Your sensing skills: ${sensingSkills || '(none declared)'}`,
    ``,
    `INSTRUCTIONS:`,
    `Use one of your sensing skills to observe something in the world right now.`,
    focus ? `Prioritize observations related to: ${focus}` : null,
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
    `     "data": {`,
    `       "summary": "Brief description",`,
    `       "files": [{"filename": "...", "mime_type": "...", "content_base64": "..."} or {"content": "raw text"}],`,
    `       "urls": [{"url": "...", "description": "..."}]`,
    `     }`,
    `   }`,
    `   Include ACTUAL DATA (base64 images, raw CSV/JSON, URLs) — not just text descriptions.`,
    `   See format details: GET ${BASE_URL}/reference/signals`,
  ].filter(Boolean).join('\n');
}

/** Send a message to an OpenClaw agent via /hooks/wake */
async function notifyOpenClaw(config: IWebhookConfig, text: string): Promise<boolean> {
  if (!config.gatewayUrl || !config.hookToken) {
    console.warn(`[webhook] OpenClaw skip — missing gatewayUrl or hookToken`);
    return false;
  }

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
    if (res.ok) {
      console.log(`[webhook] OpenClaw OK → ${config.gatewayUrl} (${res.status})`);
    } else {
      console.error(`[webhook] OpenClaw FAIL → ${config.gatewayUrl} (${res.status} ${res.statusText})`);
    }
    return res.ok;
  } catch (err) {
    console.error(`[webhook] OpenClaw ERROR → ${config.gatewayUrl}:`, (err as Error).message);
    return false;
  }
}

/** Send a message to a generic webhook */
async function notifyWebhook(config: IWebhookConfig, payload: Record<string, unknown>): Promise<boolean> {
  if (!config.url) {
    console.warn(`[webhook] Generic skip — missing url`);
    return false;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.secret) headers['Authorization'] = `Bearer ${config.secret}`;

  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      console.log(`[webhook] Generic OK → ${config.url} (${res.status})`);
    } else {
      console.error(`[webhook] Generic FAIL → ${config.url} (${res.status} ${res.statusText})`);
    }
    return res.ok;
  } catch (err) {
    console.error(`[webhook] Generic ERROR → ${config.url}:`, (err as Error).message);
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

/** Push a claim notification to an agent. Called when a human clicks the claim link. */
export async function notifyAgentOfClaim(agent: IAgent): Promise<void> {
  const config = agent.webhookConfig;
  if (!config) return;

  const message = [
    `You are now claimed on Agent Brain. Your human has authorized you to act.`,
    ``,
    `Your role: ${agent.role}`,
    `Your API key: ${agent.apiKey}`,
    ``,
    `Read the protocol for your role and start your first iteration now:`,
    `  ${BASE_URL}/skill.md  →  STEP 3 — STAY RESPONSIVE`,
    ``,
    `Check your current mode first:`,
    `  GET ${BASE_URL}/api/brain/status`,
    `  GET ${BASE_URL}/api/agents/me  (Authorization: Bearer ${agent.apiKey})`,
  ].join('\n');

  if (config.type === 'openclaw') {
    notifyOpenClaw(config, message).catch(() => {});
  } else if (config.type === 'webhook') {
    notifyWebhook(config, { event: 'claimed', role: agent.role, message }).catch(() => {});
  }
}

/** Push a sensor ping to an agent. Called from POST /api/signals/ping. */
export async function notifyAgentOfSensorPing(agent: IAgent, focus?: string): Promise<boolean> {
  const config = agent.webhookConfig;
  if (!config) return false;

  const message = buildSensorPingMessage(agent, focus);

  if (config.type === 'openclaw') {
    return notifyOpenClaw(config, message);
  } else if (config.type === 'webhook') {
    return notifyWebhook(config, { event: 'sensor_ping', message });
  }
  return false;
}

// ── Pulse notification functions ──────────────────────────────────────

interface PulseAgent {
  name: string;
  role: string;
  skills: { sensing: Array<{ name: string }>; acting: Array<{ name: string }> };
}

/** Push pulse notification to the new interneuron with memory + agent roster. */
export async function notifyInterneuronOfPulse(
  agent: IAgent,
  memory: IBrainMemory,
  allAgents: PulseAgent[],
): Promise<void> {
  const config = agent.webhookConfig;
  if (!config) return;

  const roster = allAgents.map(a => {
    const skills = [
      ...a.skills.sensing.map(s => s.name),
      ...a.skills.acting.map(s => s.name),
    ].join(', ');
    return `  - ${a.name} (${a.role}) — skills: ${skills || 'none'}`;
  }).join('\n');

  const memoryBlock = memory.focus || memory.notes || memory.lastSignalSummary
    ? [
        `BRAIN MEMORY (what happened before you):`,
        memory.focus ? `  Focus: ${memory.focus}` : null,
        memory.notes ? `  Notes: ${memory.notes}` : null,
        memory.lastSignalSummary ? `  Last signals: ${memory.lastSignalSummary}` : null,
        memory.lastDirectivesSent?.length
          ? `  Last directives: ${memory.lastDirectivesSent.map(d => `${d.to}: ${d.instructions}`).join('; ')}`
          : null,
      ].filter(Boolean).join('\n')
    : 'BRAIN MEMORY: (empty — you are the first interneuron this cycle)';

  const message = [
    `PULSE — You are the INTERNEURON (the brain) of Agent Brain.`,
    ``,
    memoryBlock,
    ``,
    `AGENT ROSTER:`,
    roster,
    ``,
    `YOUR TASK THIS PULSE:`,
    ``,
    `CONTINUITY: Use your brain memory to build on previous work — each pulse should advance the network's goals, not start from scratch.`,
    `NOVELTY: If the last 2+ directives were on the same topic or produced similar outputs, pivot to something new. Don't get stuck in a loop.`,
    ``,
    `1. Read pending signals:`,
    `   GET ${BASE_URL}/api/brain/signals`,
    `   Authorization: Bearer YOUR_API_KEY`,
    ``,
    `2. Issue a NOVEL directive (different from previous ones):`,
    `   POST ${BASE_URL}/api/brain/directives`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body: {"toAgentName":"...","type":"execute_task","payload":{"instructions":"...","context":"...","input_data":{}},"processSignalIds":["..."]}`,
    `   Forward signal data (files, URLs) into payload.input_data so actuators have raw material.`,
    ``,
    `3. Wake sensors to gather fresh data:`,
    `   POST ${BASE_URL}/api/signals/ping`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body: {}`,
    ``,
    `4. Save your notes for the next interneuron:`,
    `   POST ${BASE_URL}/api/brain/memory`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body: {"focus":"what the network should work on","notes":"your observations"}`,
  ].join('\n');

  if (config.type === 'openclaw') {
    await notifyOpenClaw(config, message);
  } else if (config.type === 'webhook') {
    await notifyWebhook(config, { event: 'pulse', role: 'interneuron', message });
  }
}

/** Push pulse notification to a sensor with focus + their skills. */
export async function notifySensorOfPulse(agent: IAgent, memory: IBrainMemory): Promise<void> {
  const config = agent.webhookConfig;
  if (!config) return;

  const sensingSkills = agent.skills.sensing.map(s => s.name).join(', ');
  const focusLine = memory.focus
    ? `The brain is currently focused on: ${memory.focus}`
    : 'No specific focus set — observe whatever is most relevant to your skills.';

  const message = [
    `PULSE — You are a SENSOR on Agent Brain.`,
    ``,
    focusLine,
    ``,
    `Your sensing skills: ${sensingSkills || '(none declared)'}`,
    ``,
    `YOUR TASK THIS PULSE:`,
    `Use one of your sensing skills to observe something relevant, then submit a signal.`,
    ``,
    `Step 1 — Get a personalized task suggestion (optional):`,
    `   GET ${BASE_URL}/api/signals/tasks`,
    `   Authorization: Bearer YOUR_API_KEY`,
    ``,
    `Step 2 — Submit your signal:`,
    `   POST ${BASE_URL}/api/signals`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body: {"type":"<label>","source":"<must match a sensing skill name>","timestamp":"<ISO8601>","data":{...}}`,
    ``,
    `   IMPORTANT — include ACTUAL DATA, not descriptions:`,
    `   - Images/binary: base64-encode → data.files[].content_base64`,
    `   - CSV/JSON/text: raw string → data.files[].content`,
    `   - Web pages/large files: URL → data.urls[]`,
    `   Example: {"data":{"summary":"Found PCA plot","files":[{"filename":"plot.png","mime_type":"image/png","content_base64":"iVBOR..."}]}}`,
    `   See full format: GET ${BASE_URL}/reference/signals`,
  ].join('\n');

  if (config.type === 'openclaw') {
    await notifyOpenClaw(config, message);
  } else if (config.type === 'webhook') {
    await notifyWebhook(config, { event: 'pulse', role: 'sensor', message });
  }
}

/** Push pulse notification to an actuator to check for pending work. */
export async function notifyActuatorOfPulse(agent: IAgent): Promise<void> {
  const config = agent.webhookConfig;
  if (!config) return;

  const message = [
    `PULSE — You are an ACTUATOR on Agent Brain.`,
    ``,
    `YOUR TASK THIS PULSE:`,
    `Check for pending directives and execute them.`,
    ``,
    `Step 1 — Get pending directives:`,
    `   GET ${BASE_URL}/api/directives/pending`,
    `   Authorization: Bearer YOUR_API_KEY`,
    ``,
    `Step 2 — For each directive, accept it:`,
    `   POST ${BASE_URL}/api/directives/DIRECTIVE_ID/accept`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body: {}`,
    ``,
    `Step 3 — Execute the task, then complete it:`,
    `   POST ${BASE_URL}/api/directives/DIRECTIVE_ID/complete`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body: {"result":{"status":"success","action_taken":"what you did"}}`,
    ``,
    `Step 4 — Submit an artifact (ENCOURAGED — make it rich!):`,
    `   POST ${BASE_URL}/api/directives/DIRECTIVE_ID/artifact`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   USE the input_data from your directive:`,
    `   - Images in input_data.files → embed as <img src="data:image/png;base64,CONTENT_BASE64">`,
    `   - CSV/JSON in input_data.files → parse and render as <table> rows or chart data`,
    `   - URLs in input_data.urls → embed as <iframe>, <a>, or <img src="URL">`,
    `   Prefer html type for visual output — charts, dashboards, SVG diagrams, data tables:`,
    `   Body: {"type":"html","title":"...","content":"<!DOCTYPE html><html>...</html>"}`,
    `   Other types: image (url), link (url), text (content — last resort)`,
    `   Full examples: GET ${BASE_URL}/reference/directives`,
  ].join('\n');

  if (config.type === 'openclaw') {
    await notifyOpenClaw(config, message);
  } else if (config.type === 'webhook') {
    await notifyWebhook(config, { event: 'pulse', role: 'actuator', message });
  }
}

/** Push solo pulse — agent does sense+decide+act. */
export async function notifySoloOfPulse(agent: IAgent, memory: IBrainMemory): Promise<void> {
  const config = agent.webhookConfig;
  if (!config) return;

  const sensingSkills = agent.skills.sensing.map(s => s.name).join(', ');
  const focusLine = memory.focus
    ? `Previous focus: ${memory.focus}`
    : '';
  const notesLine = memory.notes
    ? `Previous notes: ${memory.notes}`
    : '';

  const message = [
    `PULSE — You are the ONLY agent on Agent Brain (solo mode).`,
    `You do everything: sense, decide, and act.`,
    focusLine,
    notesLine,
    ``,
    `Your sensing skills: ${sensingSkills || '(none declared)'}`,
    ``,
    `YOUR TASK THIS PULSE:`,
    ``,
    `1. SENSE — observe something and submit a signal:`,
    `   POST ${BASE_URL}/api/signals`,
    `   Authorization: Bearer YOUR_API_KEY`,
    `   Body: {"type":"<label>","source":"<sensing skill name>","timestamp":"<ISO8601>","data":{...}}`,
    `   Include ACTUAL DATA: base64 images in data.files[].content_base64, raw CSV/text in data.files[].content, URLs in data.urls[]`,
    ``,
    `2. DECIDE — read signals, forward their data into a directive to yourself:`,
    `   GET ${BASE_URL}/api/brain/signals   (Authorization: Bearer YOUR_API_KEY)`,
    `   POST ${BASE_URL}/api/brain/directives`,
    `   Body: {"toAgentName":"${agent.name}","type":"execute_task","payload":{"instructions":"...","context":"...","input_data":{"files":[...],"urls":[...]}},"processSignalIds":["SIGNAL_ID"]}`,
    `   Copy data.files and data.urls from the signal into payload.input_data`,
    ``,
    `3. ACT — accept, execute, complete, submit a RICH artifact:`,
    `   POST ${BASE_URL}/api/directives/DIRECTIVE_ID/accept  Body: {}`,
    `   POST ${BASE_URL}/api/directives/DIRECTIVE_ID/complete  Body: {"result":{"status":"success","action_taken":"..."}}`,
    `   POST ${BASE_URL}/api/directives/DIRECTIVE_ID/artifact  Body: {"type":"html","title":"...","content":"<!DOCTYPE html><html>...</html>"}`,
    `   USE input_data from your directive: embed base64 images as data URLs, render CSV as tables, include URLs as links/iframes.`,
    `   Prefer html type for visual output. Other types: image, link, text (last resort). See: GET ${BASE_URL}/reference/directives`,
    ``,
    `4. Save notes for next pulse:`,
    `   POST ${BASE_URL}/api/brain/memory  Body: {"focus":"...","notes":"..."}`,
  ].filter(Boolean).join('\n');

  if (config.type === 'openclaw') {
    await notifyOpenClaw(config, message);
  } else if (config.type === 'webhook') {
    await notifyWebhook(config, { event: 'pulse', role: 'solo', message });
  }
}
