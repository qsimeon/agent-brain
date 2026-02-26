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
  console.log('📄 Loaded .env.local');
} catch {
  console.log('⚠️  No .env.local found, using environment variables');
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://user:pass@cluster.mongodb.net';
const MONGODB_DB = process.env.MONGODB_DB || 'agentbrain';

// Inline schemas (can't use Next.js path aliases in scripts)
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

const SignalSchema = new mongoose.Schema({
  fromAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  type: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, default: 'pending' },
  processedByBrainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
}, { timestamps: true });

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

async function seed() {
  console.log('🧠 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  console.log('✅ Connected');

  const Agent = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
  const BrainState = mongoose.models.BrainState || mongoose.model('BrainState', BrainStateSchema);
  const Signal = mongoose.models.Signal || mongoose.model('Signal', SignalSchema);
  const Directive = mongoose.models.Directive || mongoose.model('Directive', DirectiveSchema);

  // Clear existing data
  await Agent.deleteMany({});
  await BrainState.deleteMany({});
  await Signal.deleteMany({});
  await Directive.deleteMany({});
  console.log('🗑️  Cleared existing data');

  // Create dummy agents with skill declarations
  const sensorBot = await Agent.create({
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
    metadata: { type: 'dummy', autoRun: true },
  });
  console.log(`👁️  Created SensorBot (sensor): ${sensorBot.name} [S:3 A:0]`);

  const actuatorBot = await Agent.create({
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
    metadata: { type: 'dummy', autoRun: true },
  });
  console.log(`⚡ Created ActuatorBot (actuator): ${actuatorBot.name} [S:0 A:3]`);

  const thinkBot = await Agent.create({
    name: 'ThinkBot',
    description: 'Initial interneuron — the first brain of the Agent Brain network, full skill access',
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
    metadata: { type: 'dummy', autoRun: true },
  });
  console.log(`🧠 Created ThinkBot (interneuron): ${thinkBot.name} [S:3 A:3]`);

  // Create initial brain state
  await BrainState.create({
    currentInterneuronId: thinkBot._id,
    rotationCount: 0,
    lastRotationAt: new Date(),
    nextRotationAt: new Date(Date.now() + 10 * 60 * 1000),
    history: [{ agentId: thinkBot._id, startedAt: new Date() }],
  });
  console.log('🧠 BrainState initialized with ThinkBot as interneuron');

  // Create some sample signals
  const signalTypes = ['weather', 'news', 'system_status', 'mood_check', 'random_fact'];
  for (let i = 0; i < 5; i++) {
    await Signal.create({
      fromAgentId: sensorBot._id,
      type: signalTypes[i],
      payload: {
        data: `Sample ${signalTypes[i]} reading #${i + 1}`,
        timestamp: new Date(),
        value: Math.random().toFixed(2),
      },
      status: i < 3 ? 'pending' : 'processed',
      processedByBrainId: i >= 3 ? thinkBot._id : undefined,
    });
  }
  console.log('📡 Created 5 sample signals');

  // Create some sample directives
  for (let i = 0; i < 3; i++) {
    await Directive.create({
      fromBrainId: thinkBot._id,
      toAgentId: actuatorBot._id,
      type: 'execute_task',
      payload: { task: `Sample task #${i + 1}`, priority: i === 0 ? 'high' : 'normal' },
      status: i === 0 ? 'completed' : i === 1 ? 'accepted' : 'pending',
      result: i === 0 ? { message: 'Task completed successfully' } : undefined,
      completedAt: i === 0 ? new Date() : undefined,
      acceptedAt: i <= 1 ? new Date() : undefined,
    });
  }
  console.log('📋 Created 3 sample directives');

  console.log('\n🎉 Seed complete! Agent Brain is ready.\n');
  console.log('API Keys (for testing):');
  console.log(`  SensorBot:  ${sensorBot.apiKey}`);
  console.log(`  ActuatorBot: ${actuatorBot.apiKey}`);
  console.log(`  ThinkBot:   ${thinkBot.apiKey}`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
