import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
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
  console.log('📄 Loaded .env.local\n');
} catch {
  console.log('⚠️  No .env.local found, using environment variables\n');
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://user:pass@cluster.mongodb.net';
const MONGODB_DB = process.env.MONGODB_DB || 'agentbrain';

// Inline schemas
const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  apiKey: { type: String, required: true, unique: true },
  claimToken: { type: String, required: true, unique: true },
  claimStatus: { type: String, default: 'claimed' },
  role: { type: String, required: true },
  ownerEmail: String,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  skills: { type: mongoose.Schema.Types.Mixed },
  webhookConfig: { type: mongoose.Schema.Types.Mixed },
  lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

const BrainStateSchema = new mongoose.Schema({
  currentInterneuronId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  rotationCount: { type: Number, default: 0 },
  lastRotationAt: { type: Date, default: Date.now },
  nextRotationAt: { type: Date, required: true },
  memory: { type: mongoose.Schema.Types.Mixed, default: {} },
  history: [{
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
  }],
}, { timestamps: true });

const SignalSchema = new mongoose.Schema({
  fromAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  type: { type: String, required: true },
  source: { type: String },
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

async function checkBrainState() {
  console.log('🧠 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  console.log('✅ Connected\n');

  const Agent = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
  const BrainState = mongoose.models.BrainState || mongoose.model('BrainState', BrainStateSchema);
  const Signal = mongoose.models.Signal || mongoose.model('Signal', SignalSchema);
  const Directive = mongoose.models.Directive || mongoose.model('Directive', DirectiveSchema);

  // 1. Query all agents
  console.log('═══════════════════════════════════════════════════');
  console.log('📋 AGENTS');
  console.log('═══════════════════════════════════════════════════');
  const agents = await Agent.find({}).lean();
  console.log(`Total agents: ${agents.length}\n`);
  agents.forEach(agent => {
    console.log(`Name:       ${agent.name}`);
    console.log(`Role:       ${agent.role}`);
    console.log(`Claim:      ${agent.claimStatus}`);
    console.log(`Last Active: ${agent.lastActive}`);
    console.log(`Metadata:   ${JSON.stringify(agent.metadata)}`);
    const s = agent.skills as any;
    if (s) {
      console.log(`Skills:     sensing=[${(s.sensing || []).map((x: any) => x.name).join(', ')}], acting=[${(s.acting || []).map((x: any) => x.name).join(', ')}]`);
    }
    if (agent.webhookConfig) {
      console.log(`Webhook:    ${(agent.webhookConfig as any).type}`);
    }
    console.log('---');
  });

  // 2. Query BrainState
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🧠 BRAIN STATE');
  console.log('═══════════════════════════════════════════════════');
  const brainStates = await BrainState.find({}).populate('currentInterneuronId').lean();
  if (brainStates.length === 0) {
    console.log('No BrainState found');
  } else {
    brainStates.forEach((state, idx) => {
      console.log(`BrainState #${idx + 1}:`);
      console.log(`  Current Interneuron: ${state.currentInterneuronId?.name || state.currentInterneuronId}`);
      console.log(`  Last Rotation At:    ${state.lastRotationAt}`);
      console.log(`  Next Rotation At:    ${state.nextRotationAt}`);
      console.log('');
    });
  }

  // 3. Query signals
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📡 SIGNALS');
  console.log('═══════════════════════════════════════════════════');
  const signalCount = await Signal.countDocuments();
  console.log(`Total signals: ${signalCount}\n`);
  const lastSignals = await Signal.find({})
    .populate('fromAgentId', 'name')
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();
  console.log('Last 3 signals:');
  lastSignals.forEach((signal, idx) => {
    console.log(`${idx + 1}. From: ${signal.fromAgentId?.name || signal.fromAgentId}`);
    console.log(`   Type:    ${signal.type}`);
    console.log(`   Source:  ${signal.source || '(none)'}`);
    console.log(`   Status:  ${signal.status}`);
    console.log(`   Created: ${signal.createdAt}`);
    console.log('');
  });

  // 4. Query directives
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 DIRECTIVES');
  console.log('═══════════════════════════════════════════════════');
  const directiveCount = await Directive.countDocuments();
  console.log(`Total directives: ${directiveCount}\n`);
  const lastDirectives = await Directive.find({})
    .populate('toAgentId', 'name')
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();
  console.log('Last 3 directives:');
  lastDirectives.forEach((directive, idx) => {
    console.log(`${idx + 1}. To: ${directive.toAgentId?.name || directive.toAgentId}`);
    console.log(`   Type:    ${directive.type}`);
    console.log(`   Status:  ${directive.status}`);
    console.log(`   Created: ${directive.createdAt}`);
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Check complete\n');

  await mongoose.disconnect();
}

checkBrainState().catch(err => {
  console.error('❌ Check failed:', err);
  process.exit(1);
});
