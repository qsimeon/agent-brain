import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
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
} catch {}

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DB || 'agentbrain';

const AgentSchema = new mongoose.Schema({
  name: String, role: String, apiKey: String, claimToken: String,
  claimStatus: String, description: String, metadata: mongoose.Schema.Types.Mixed,
  ownerEmail: String, lastActive: Date,
}, { timestamps: true });

const BrainStateSchema = new mongoose.Schema({
  currentInterneuronId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  rotationCount: Number, lastRotationAt: Date, nextRotationAt: Date,
  history: [{ agentId: mongoose.Schema.Types.ObjectId, startedAt: Date, endedAt: Date }],
}, { timestamps: true });

const SignalSchema = new mongoose.Schema({
  fromAgentId: mongoose.Schema.Types.ObjectId, type: String,
  payload: mongoose.Schema.Types.Mixed, status: String,
  processedByBrainId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const DirectiveSchema = new mongoose.Schema({
  fromBrainId: mongoose.Schema.Types.ObjectId, toAgentId: mongoose.Schema.Types.ObjectId,
  type: String, payload: mongoose.Schema.Types.Mixed, status: String,
  result: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

async function cleanup() {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  console.log('Connected to MongoDB');

  const Agent = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
  const BrainState = mongoose.models.BrainState || mongoose.model('BrainState', BrainStateSchema);
  const Signal = mongoose.models.Signal || mongoose.model('Signal', SignalSchema);
  const Directive = mongoose.models.Directive || mongoose.model('Directive', DirectiveSchema);

  // Find and remove dummy agents
  const dummies = await Agent.find({ 'metadata.type': 'dummy' });
  if (dummies.length === 0) {
    console.log('No dummy agents found. Nothing to clean up.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${dummies.length} dummy agents: ${dummies.map(d => d.name).join(', ')}`);
  const dummyIds = dummies.map(d => d._id);

  // Delete dummy signals and directives
  const deletedSignals = await Signal.deleteMany({ fromAgentId: { $in: dummyIds } });
  const deletedDirectives = await Directive.deleteMany({
    $or: [{ fromBrainId: { $in: dummyIds } }, { toAgentId: { $in: dummyIds } }],
  });
  console.log(`Deleted ${deletedSignals.deletedCount} dummy signals, ${deletedDirectives.deletedCount} dummy directives`);

  // Delete dummy agents
  await Agent.deleteMany({ 'metadata.type': 'dummy' });
  console.log('Deleted dummy agents');

  // Find the first real claimed agent to be the interneuron
  const realAgents = await Agent.find({ claimStatus: 'claimed' }).sort({ createdAt: 1 });
  if (realAgents.length === 0) {
    console.log('No real agents found. Brain has no interneuron.');
    await BrainState.deleteMany({});
    await mongoose.disconnect();
    return;
  }

  // Make the first real agent the interneuron
  const newBrain = realAgents[0];
  newBrain.role = 'interneuron';
  await newBrain.save();
  console.log(`Promoted ${newBrain.name} to interneuron`);

  // Make sure other agents are sensor/actuator
  for (let i = 1; i < realAgents.length; i++) {
    const a = realAgents[i];
    if (a.role === 'interneuron') {
      a.role = i % 2 === 0 ? 'sensor' : 'actuator';
      await a.save();
      console.log(`Reassigned ${a.name} to ${a.role}`);
    }
  }

  // Update brain state
  await BrainState.findOneAndUpdate(
    {},
    {
      currentInterneuronId: newBrain._id,
      rotationCount: 0,
      lastRotationAt: new Date(),
      nextRotationAt: new Date(Date.now() + 10 * 60 * 1000),
      history: [{ agentId: newBrain._id, startedAt: new Date() }],
    },
    { upsert: true },
  );
  console.log('Brain state updated');

  // Show final state
  const allAgents = await Agent.find({});
  console.log('\nFinal state:');
  for (const a of allAgents) {
    console.log(`  ${a.name} — ${a.role} (${a.claimStatus})`);
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

cleanup().catch(err => { console.error('Failed:', err); process.exit(1); });
