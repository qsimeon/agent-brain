import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually (tsx doesn't load it like Next.js does)
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex);
        const value = trimmed.slice(eqIndex + 1);
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
  console.log('Loaded .env.local');
} catch {
  console.log('No .env.local found, using environment variables');
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://user:pass@cluster.mongodb.net';
const MONGODB_DB = process.env.MONGODB_DB || 'agentbrain';

// Inline schemas — kept in sync with lib/models/
const SkillSubSchema = {
  name: { type: String, required: true },
  description: { type: String, default: '' },
};

const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  apiKey: { type: String, required: true, unique: true },
  claimToken: { type: String, required: true, unique: true },
  claimStatus: { type: String, default: 'claimed' },
  role: { type: String, required: true },
  ownerEmail: String,
  skills: {
    type: {
      sensing: { type: [SkillSubSchema], default: [] },
      acting: { type: [SkillSubSchema], default: [] },
    },
    required: true,
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

const BrainStateSchema = new mongoose.Schema({
  currentInterneuronId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  rotationCount: { type: Number, default: 0 },
  lastRotationAt: { type: Date, default: Date.now },
  nextRotationAt: { type: Date, required: true },
  history: [{
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
  }],
}, { timestamps: true });

// Signal schema matches lib/models/Signal.ts — source field is required
const SignalSchema = new mongoose.Schema({
  fromAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  type: { type: String, required: true },
  source: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, default: 'pending' },
  processedByBrainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
}, { timestamps: true });

// Directive schema — payload must have instructions + context
const DirectiveSchema = new mongoose.Schema({
  fromBrainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  toAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  type: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, default: 'pending' },
  result: { type: mongoose.Schema.Types.Mixed },
  acceptedAt: Date,
  completedAt: Date,
}, { timestamps: true });

const ArtifactSchema = new mongoose.Schema({
  directiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Directive' },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  type: { type: String, required: true, enum: ['image', 'text', 'link', 'file'] },
  title: { type: String, required: true },
  description: String,
  url: String,
  thumbnail: String,
  content: String,
}, { timestamps: true });

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  console.log('Connected');

  const AgentModel = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
  const BrainStateModel = mongoose.models.BrainState || mongoose.model('BrainState', BrainStateSchema);
  const SignalModel = mongoose.models.Signal || mongoose.model('Signal', SignalSchema);
  const DirectiveModel = mongoose.models.Directive || mongoose.model('Directive', DirectiveSchema);
  const ArtifactModel = mongoose.models.Artifact || mongoose.model('Artifact', ArtifactSchema);

  // Clear ALL collections
  await AgentModel.deleteMany({});
  await BrainStateModel.deleteMany({});
  await SignalModel.deleteMany({});
  await DirectiveModel.deleteMany({});
  await ArtifactModel.deleteMany({});
  console.log('Cleared all collections');

  // ── Dummy agents (visual placeholders only, never act on real data) ──

  const sensorBot = await AgentModel.create({
    name: 'SensorBot',
    description: 'Autonomous sensor agent — gathers weather, news, and system telemetry',
    apiKey: `agentbrain_sensor_${nanoid(24)}`,
    claimToken: `agentbrain_claim_${nanoid(16)}`,
    claimStatus: 'claimed',
    role: 'sensor',
    skills: {
      sensing: [
        { name: 'weather_check', description: 'Check current weather conditions via API' },
        { name: 'news_fetch', description: 'Fetch latest headlines from news sources' },
        { name: 'system_monitor', description: 'Monitor system health and telemetry' },
      ],
      acting: [],
    },
    metadata: { type: 'dummy' },
  });
  console.log(`Created SensorBot (sensor, dummy)`);

  const actuatorBot = await AgentModel.create({
    name: 'ActuatorBot',
    description: 'Autonomous actuator agent — writes files, sends messages, and deploys code',
    apiKey: `agentbrain_actuator_${nanoid(24)}`,
    claimToken: `agentbrain_claim_${nanoid(16)}`,
    claimStatus: 'claimed',
    role: 'actuator',
    skills: {
      sensing: [],
      acting: [
        { name: 'file_write', description: 'Create and write files on the filesystem' },
        { name: 'send_message', description: 'Send messages via chat or email' },
        { name: 'deploy_code', description: 'Deploy code to staging or production' },
      ],
    },
    metadata: { type: 'dummy' },
  });
  console.log(`Created ActuatorBot (actuator, dummy)`);

  const thinkBot = await AgentModel.create({
    name: 'ThinkBot',
    description: 'Initial interneuron placeholder — the first brain of the Agent Brain network',
    apiKey: `agentbrain_think_${nanoid(24)}`,
    claimToken: `agentbrain_claim_${nanoid(16)}`,
    claimStatus: 'claimed',
    role: 'interneuron',
    skills: {
      sensing: [
        { name: 'weather_check', description: 'Check current weather conditions via API' },
        { name: 'news_fetch', description: 'Fetch latest headlines from news sources' },
        { name: 'system_monitor', description: 'Monitor system health and telemetry' },
      ],
      acting: [
        { name: 'file_write', description: 'Create and write files on the filesystem' },
        { name: 'send_message', description: 'Send messages via chat or email' },
        { name: 'deploy_code', description: 'Deploy code to staging or production' },
      ],
    },
    metadata: { type: 'dummy' },
  });
  console.log(`Created ThinkBot (interneuron, dummy)`);

  // BrainState: ThinkBot is the placeholder brain until a real agent claims
  await BrainStateModel.create({
    currentInterneuronId: thinkBot._id,
    rotationCount: 0,
    lastRotationAt: new Date(),
    nextRotationAt: new Date(Date.now() + 10 * 60 * 1000),
    history: [{ agentId: thinkBot._id, startedAt: new Date() }],
  });
  console.log('BrainState initialized with ThinkBot as placeholder brain');

  // ── Sample signals — use new envelope format (source + payload:{data,timestamp}) ──
  const sampleSignals = [
    {
      type: 'weather_check',
      source: 'weather_check',
      payload: {
        data: { temperature: 68, unit: 'F', location: 'Cambridge MA', conditions: 'partly cloudy' },
        timestamp: new Date().toISOString(),
      },
      status: 'processed',
    },
    {
      type: 'news_fetch',
      source: 'news_fetch',
      payload: {
        data: { headline: 'MIT researchers demonstrate new neural interface', summary: 'New paper published in Nature' },
        timestamp: new Date().toISOString(),
      },
      status: 'processed',
    },
    {
      type: 'system_monitor',
      source: 'system_monitor',
      payload: {
        data: { healthy: true, time: '14:00:00', timezone: 'UTC', notes: 'All systems nominal' },
        timestamp: new Date().toISOString(),
      },
      status: 'pending',
    },
    {
      type: 'weather_check',
      source: 'weather_check',
      payload: {
        data: { temperature: 71, unit: 'F', location: 'Cambridge MA', conditions: 'sunny' },
        timestamp: new Date().toISOString(),
      },
      status: 'pending',
    },
    {
      type: 'news_fetch',
      source: 'news_fetch',
      payload: {
        data: { headline: 'New AI coordination protocols released', summary: 'Agent frameworks getting stronger' },
        timestamp: new Date().toISOString(),
      },
      status: 'pending',
    },
  ];

  for (const s of sampleSignals) {
    await SignalModel.create({ fromAgentId: sensorBot._id, ...s });
  }
  console.log(`Created ${sampleSignals.length} sample signals`);

  // ── Sample directives — use new schema (instructions + context required) ──
  const sampleDirectives = [
    {
      type: 'summarize',
      payload: {
        instructions: 'Write a one-paragraph summary of today\'s weather and news headlines and save it to /tmp/brain-summary.txt',
        context: 'SensorBot reported 68°F in Cambridge and an MIT neural interface headline. Worth documenting.',
        input_data: { temperature: 68, headline: 'MIT researchers demonstrate new neural interface' },
      },
      status: 'completed',
      result: { status: 'success', action_taken: 'Wrote summary to /tmp/brain-summary.txt' },
      acceptedAt: new Date(),
      completedAt: new Date(),
    },
    {
      type: 'notify',
      payload: {
        instructions: 'Send a Slack message to #brain-updates summarizing the latest sensor readings',
        context: 'Multiple weather readings received — interneuron wants a digest posted',
        input_data: { channel: '#brain-updates' },
      },
      status: 'accepted',
      acceptedAt: new Date(),
    },
    {
      type: 'log_observation',
      payload: {
        instructions: 'Append the current system status observation to /tmp/brain-log.txt',
        context: 'System monitor reported healthy status — log it for the record',
        input_data: { healthy: true, time: '14:00:00' },
      },
      status: 'pending',
    },
  ];

  for (const d of sampleDirectives) {
    await DirectiveModel.create({
      fromBrainId: thinkBot._id,
      toAgentId: actuatorBot._id,
      ...d,
    });
  }
  console.log(`Created ${sampleDirectives.length} sample directives`);

  console.log('\nSeed complete. Agent Brain is ready for real agents to join.');
  console.log('When a real agent registers and is claimed, it will become the interneuron.');
  console.log('\nDummy API keys (for UI testing only — these agents are placeholders):');
  console.log(`  SensorBot:   ${sensorBot.apiKey}`);
  console.log(`  ActuatorBot: ${actuatorBot.apiKey}`);
  console.log(`  ThinkBot:    ${thinkBot.apiKey}`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
