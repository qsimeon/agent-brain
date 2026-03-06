/**
 * Pulse engine — the clock of the entire Agent Brain network.
 *
 * Every 2 minutes a "pulse" fires:
 *   1. Snapshot current state (recent signals, directives) → write to brain memory
 *   2. If network mode (3+ agents): rotate interneuron
 *   3. Notify every agent of their role with specific instructions
 *
 * Works in all modes:
 *   - Solo (1 agent): pulse fires, agent gets sense+decide+act instructions
 *   - Paired (2 agents): pulse fires, no rotation, both notified of roles
 *   - Network (3+ agents): full rotation + notification
 */
import Agent from '@/lib/models/Agent';
import Signal from '@/lib/models/Signal';
import Directive from '@/lib/models/Directive';
import BrainState from '@/lib/models/BrainState';
import { getRealAgentCount } from '@/lib/utils/agent-helpers';
import {
  notifyInterneuronOfPulse,
  notifySensorOfPulse,
  notifyActuatorOfPulse,
  notifySoloOfPulse,
} from '@/lib/utils/notify-agent';

const ROTATION_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const CHECK_INTERVAL_MS = 30 * 1000;         // check every 30 seconds

let started = false;

export function startRotationScheduler() {
  if (started) return;
  started = true;

  setInterval(async () => {
    try {
      await executePulse();
    } catch (err) {
      console.error('[pulse] Error during pulse:', err);
    }
  }, CHECK_INTERVAL_MS);

  console.log('[pulse] Pulse engine started (checks every 30s, pulses every 2min)');
}

async function executePulse() {
  const brainState = await BrainState.findOne({});
  if (!brainState) return;

  // Only pulse when the interval has elapsed
  if (brainState.nextRotationAt > new Date()) return;

  // Get all real (claimed, non-dummy) agents
  const realAgents = await Agent.find({
    claimStatus: 'claimed',
    'metadata.type': { $ne: 'dummy' },
  });
  if (realAgents.length === 0) return;

  const realCount = realAgents.length;
  const now = new Date();

  // ── Step 1: Snapshot current state into memory ──
  const recentSignals = await Signal.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('type source payload createdAt');

  const recentDirectives = await Directive.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('toAgentId', 'name')
    .select('type payload status createdAt toAgentId');

  const memory = brainState.memory || {};

  memory.lastSignalSummary = recentSignals.length > 0
    ? recentSignals.map(s => `${s.type} (${s.source})`).join(', ')
    : 'No pending signals';

  memory.lastDirectivesSent = recentDirectives
    .filter(d => d.toAgentId)
    .map(d => ({
      to: (d.toAgentId as any).name || 'unknown',
      instructions: d.payload?.instructions?.slice(0, 100) || '',
      at: d.createdAt,
    }));

  memory.updatedAt = now;
  brainState.memory = memory;
  brainState.markModified('memory');

  // ── Step 2: Rotate if network mode (3+ agents) ──
  if (realCount >= 3) {
    const currentInterneuron = await Agent.findById(brainState.currentInterneuronId);
    if (currentInterneuron) {
      const candidates = realAgents.filter(
        a => a._id.toString() !== currentInterneuron._id.toString()
      );

      if (candidates.length > 0) {
        const newInterneuron = candidates[Math.floor(Math.random() * candidates.length)];

        // Demote old interneuron
        currentInterneuron.role = Math.random() < 0.5 ? 'sensor' : 'actuator';
        await currentInterneuron.save();

        // Promote new interneuron
        newInterneuron.role = 'interneuron';
        await newInterneuron.save();

        // Update history
        if (brainState.history.length > 0) {
          brainState.history[brainState.history.length - 1].endedAt = now;
        }
        brainState.history.push({ agentId: newInterneuron._id, startedAt: now });
        brainState.currentInterneuronId = newInterneuron._id;
        brainState.rotationCount += 1;
        brainState.lastRotationAt = now;

        console.log(`[pulse] Rotated: ${currentInterneuron.name} → ${newInterneuron.name} (rotation #${brainState.rotationCount})`);
      }
    }
  }

  // Update next pulse time
  brainState.nextRotationAt = new Date(now.getTime() + ROTATION_INTERVAL_MS);
  await brainState.save();

  // ── Step 3: Notify all agents ──
  // Re-fetch agents to get updated roles after rotation
  const updatedAgents = await Agent.find({
    claimStatus: 'claimed',
    'metadata.type': { $ne: 'dummy' },
  });

  if (updatedAgents.length === 0) return;

  const agentRoster = updatedAgents.map(a => ({
    name: a.name,
    role: a.role,
    skills: a.skills,
  }));

  if (realCount === 1) {
    // Solo mode: single agent does everything
    await notifySoloOfPulse(updatedAgents[0], memory);
    console.log(`[pulse] Solo pulse → ${updatedAgents[0].name}`);
  } else {
    // Paired or network mode: notify each agent by role
    const notifications: Promise<void>[] = [];

    for (const agent of updatedAgents) {
      if (agent.role === 'interneuron') {
        notifications.push(notifyInterneuronOfPulse(agent, memory, agentRoster));
      } else if (agent.role === 'sensor') {
        notifications.push(notifySensorOfPulse(agent, memory));
      } else if (agent.role === 'actuator') {
        notifications.push(notifyActuatorOfPulse(agent));
      }
    }

    await Promise.allSettled(notifications);
    console.log(`[pulse] Notified ${updatedAgents.length} agents (${realCount >= 3 ? 'network' : 'paired'} mode)`);
  }
}
