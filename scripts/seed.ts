import mongoose from 'mongoose';
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
  claimStatus: { type: String, default: 'pending_claim', enum: ['pending_claim', 'claimed'] },
  role: { type: String, required: true, enum: ['sensor', 'actuator', 'interneuron'] },
  ownerEmail: String,
  skills: {
    type: {
      sensing: { type: [SkillSubSchema], default: [] },
      acting: { type: [SkillSubSchema], default: [] },
    },
    required: true,
  },
  webhookConfig: {
    type: { type: String, enum: ['openclaw', 'webhook'] },
    gatewayUrl: String,
    hookToken: String,
    agentId: String,
    url: String,
    secret: String,
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  lastActive: { type: Date, default: Date.now },
  missedPulses: { type: Number, default: 0 },
}, { timestamps: true });

const BrainStateSchema = new mongoose.Schema({
  currentInterneuronId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
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
  type: { type: String, required: true, enum: ['image', 'text', 'link', 'file', 'html'] },
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

  // Initialize empty BrainState — first real agent to register and claim becomes the interneuron
  await BrainStateModel.create({
    rotationCount: 0,
    lastRotationAt: new Date(),
    nextRotationAt: new Date(Date.now() + 3 * 60 * 1000),
    memory: {},
    history: [],
  });
  console.log('BrainState initialized (empty — waiting for real agents)');

  console.log('\nSeed complete. Agent Brain is a clean slate.');
  console.log('The first agent to register and be claimed will become the interneuron.');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
