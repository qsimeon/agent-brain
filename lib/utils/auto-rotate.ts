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
import {
  notifyInterneuronOfPulse,
  notifySensorOfPulse,
  notifyActuatorOfPulse,
  notifySoloOfPulse,
} from '@/lib/utils/notify-agent';

const ROTATION_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
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

  // Get all claimed agents
  const realAgents = await Agent.find({
    claimStatus: 'claimed',
  });
  if (realAgents.length === 0) return;

  const now = new Date();
  const lastPulseTime = brainState.lastRotationAt || new Date(0);

  // ── Step 0: Dead neuron cleanup ──
  // If an agent hasn't made any API call since the last pulse, they missed it.
  // 2 consecutive misses = dead neuron → prune from the network.
  const prunedNames: string[] = [];

  for (const agent of realAgents) {
    if (agent.lastActive < lastPulseTime) {
      agent.missedPulses = (agent.missedPulses || 0) + 1;
    } else {
      agent.missedPulses = 0;
    }

    if (agent.missedPulses >= 2) {
      prunedNames.push(agent.name);

      // Expire their pending signals and fail their pending directives
      await Signal.updateMany(
        { fromAgentId: agent._id, status: 'pending' },
        { status: 'expired' },
      );
      await Directive.updateMany(
        { toAgentId: agent._id, status: 'pending' },
        { status: 'failed' },
      );

      // If this was the interneuron, clear the reference
      if (brainState.currentInterneuronId?.toString() === agent._id.toString()) {
        // Will be reassigned during rotation below
        brainState.currentInterneuronId = undefined as any;
      }

      await agent.deleteOne();
    } else {
      await agent.save();
    }
  }

  if (prunedNames.length > 0) {
    console.log(`[pulse] Dead neuron cleanup: pruned ${prunedNames.join(', ')} (2 consecutive missed pulses)`);
  }

  // Re-fetch agents after pruning
  const activeAgents = await Agent.find({
    claimStatus: 'claimed',
  });
  if (activeAgents.length === 0) {
    // All agents were pruned — save state and exit
    brainState.nextRotationAt = new Date(now.getTime() + ROTATION_INTERVAL_MS);
    await brainState.save();
    return;
  }

  const realCount = activeAgents.length;

  // ── Ensure an interneuron exists ──
  // After pruning, BrainState may point to a deleted agent.
  // If no agent currently holds the interneuron role, promote one.
  const currentInterneuronAgent = brainState.currentInterneuronId
    ? activeAgents.find(a => a._id.toString() === brainState.currentInterneuronId?.toString())
    : null;

  if (!currentInterneuronAgent) {
    // No valid interneuron — pick one from the active agents
    const hasInterneuron = activeAgents.some(a => a.role === 'interneuron');
    if (!hasInterneuron) {
      const promoted = activeAgents[Math.floor(Math.random() * activeAgents.length)];
      promoted.role = 'interneuron';
      await promoted.save();

      brainState.currentInterneuronId = promoted._id;
      brainState.history.push({ agentId: promoted._id, startedAt: now });
      brainState.lastRotationAt = now;
      brainState.markModified('history');

      console.log(`[pulse] No interneuron found — promoted ${promoted.name}`);
    } else {
      // An agent has the interneuron role but BrainState doesn't point to it — fix the reference
      const existing = activeAgents.find(a => a.role === 'interneuron')!;
      brainState.currentInterneuronId = existing._id;
      console.log(`[pulse] Fixed BrainState reference → ${existing.name}`);
    }
  }

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

  if (prunedNames.length > 0) {
    memory.notes = [
      memory.notes || '',
      `[auto-pruned dead neurons: ${prunedNames.join(', ')}]`,
    ].filter(Boolean).join(' ');
  }

  memory.updatedAt = now;
  brainState.memory = memory;
  brainState.markModified('memory');

  // ── Step 2: Rotate if network mode (3+ agents) ──
  if (realCount >= 3) {
    const currentInterneuron = brainState.currentInterneuronId
      ? await Agent.findById(brainState.currentInterneuronId)
      : null;

    if (currentInterneuron) {
      const candidates = activeAgents.filter(
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
    } else {
      // Interneuron was pruned or missing — assign one from remaining agents
      const newInterneuron = activeAgents[Math.floor(Math.random() * activeAgents.length)];
      newInterneuron.role = 'interneuron';
      await newInterneuron.save();

      brainState.history.push({ agentId: newInterneuron._id, startedAt: now });
      brainState.currentInterneuronId = newInterneuron._id;
      brainState.rotationCount += 1;
      brainState.lastRotationAt = now;

      console.log(`[pulse] Assigned new interneuron after pruning: ${newInterneuron.name} (rotation #${brainState.rotationCount})`);
    }
  }

  // Update next pulse time
  brainState.nextRotationAt = new Date(now.getTime() + ROTATION_INTERVAL_MS);
  await brainState.save();

  // ── Step 3: Notify all agents ──
  // Re-fetch agents to get updated roles after rotation
  const updatedAgents = await Agent.find({
    claimStatus: 'claimed',
  });

  if (updatedAgents.length === 0) return;

  const agentRoster = updatedAgents.map(a => ({
    name: a.name,
    role: a.role,
    skills: a.skills,
  }));

  if (updatedAgents.length === 1) {
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
    console.log(`[pulse] Notified ${updatedAgents.length} agents (${updatedAgents.length >= 3 ? 'network' : 'paired'} mode)`);
  }
}
