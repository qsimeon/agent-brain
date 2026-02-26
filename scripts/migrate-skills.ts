/**
 * migrate-skills.ts — Backfill skills on existing agents that don't have them.
 *
 * Usage: npx tsx scripts/migrate-skills.ts
 *
 * For existing agents without a `skills` field, this sets empty arrays
 * so the rest of the v2 code works without errors.
 */

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
  console.log('📄 Loaded .env.local');
} catch {
  console.log('⚠️  No .env.local found, using environment variables');
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://user:pass@cluster.mongodb.net';
const MONGODB_DB = process.env.MONGODB_DB || 'agentbrain';

async function migrate() {
  console.log('🧠 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  console.log('✅ Connected');

  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');

  const agents = db.collection('agents');

  // Find agents missing the skills field entirely
  const needsMigration = await agents.find({
    $or: [
      { skills: { $exists: false } },
      { skills: null },
    ],
  }).toArray();

  console.log(`\n📊 Found ${needsMigration.length} agent(s) without skills field.\n`);

  for (const agent of needsMigration) {
    console.log(`  Migrating: ${agent.name} (role: ${agent.role})`);
    await agents.updateOne(
      { _id: agent._id },
      { $set: { skills: { sensing: [], acting: [] } } },
    );
  }

  if (needsMigration.length > 0) {
    console.log(`\n✅ Migrated ${needsMigration.length} agent(s) with empty skill arrays.`);
  } else {
    console.log('✅ All agents already have skills — nothing to migrate.');
  }

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
