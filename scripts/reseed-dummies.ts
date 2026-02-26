import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
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
  name: String, description: String, apiKey: String, claimToken: String,
  claimStatus: String, role: String, ownerEmail: String,
  metadata: mongoose.Schema.Types.Mixed, lastActive: Date,
}, { timestamps: true });

async function reseedDummies() {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  console.log('Connected to MongoDB');

  const Agent = mongoose.models.Agent || mongoose.model('Agent', AgentSchema);

  // Check if dummies already exist
  const existingDummies = await Agent.find({ 'metadata.type': 'dummy' });
  if (existingDummies.length > 0) {
    console.log(`Dummies already exist: ${existingDummies.map(d => d.name).join(', ')}`);
    console.log('Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  // Create dummy placeholder agents (don't touch real agents)
  const sensorBot = await Agent.create({
    name: 'SensorBot',
    description: 'Placeholder sensor agent — gathers weather, news, and system telemetry',
    apiKey: `agentbrain_sensor_${nanoid(24)}`,
    claimToken: `agentbrain_claim_${nanoid(16)}`,
    claimStatus: 'claimed',
    role: 'sensor',
    metadata: { type: 'dummy', autoRun: true },
  });
  console.log(`Created SensorBot (sensor)`);

  const actuatorBot = await Agent.create({
    name: 'ActuatorBot',
    description: 'Placeholder actuator agent — executes directives and reports results',
    apiKey: `agentbrain_actuator_${nanoid(24)}`,
    claimToken: `agentbrain_claim_${nanoid(16)}`,
    claimStatus: 'claimed',
    role: 'actuator',
    metadata: { type: 'dummy', autoRun: true },
  });
  console.log(`Created ActuatorBot (actuator)`);

  const thinkBot = await Agent.create({
    name: 'ThinkBot',
    description: 'Placeholder interneuron — the initial brain of the Agent Brain network',
    apiKey: `agentbrain_think_${nanoid(24)}`,
    claimToken: `agentbrain_claim_${nanoid(16)}`,
    claimStatus: 'claimed',
    role: 'interneuron',
    metadata: { type: 'dummy', autoRun: true },
  });
  console.log(`Created ThinkBot (interneuron)`);

  // Show final state
  const allAgents = await Agent.find({});
  console.log('\nAll agents:');
  for (const a of allAgents) {
    const isDummy = a.metadata?.type === 'dummy' ? ' [placeholder]' : '';
    console.log(`  ${a.name} — ${a.role} (${a.claimStatus})${isDummy}`);
  }

  await mongoose.disconnect();
  console.log('\nDone! Dummies re-seeded.');
}

reseedDummies().catch(err => { console.error('Failed:', err); process.exit(1); });
