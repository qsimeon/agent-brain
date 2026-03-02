/**
 * Auto-rotation scheduler — started once when the DB first connects.
 * Checks every 60 seconds whether rotation is overdue and fires it if so.
 * Rotation only happens when realCount >= 3 (network mode).
 */
import Agent from '@/lib/models/Agent';
import BrainState from '@/lib/models/BrainState';
import { getRealAgentCount } from '@/lib/utils/agent-helpers';

const ROTATION_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const CHECK_INTERVAL_MS = 60 * 1000;          // check every 60 seconds

let started = false;

export function startRotationScheduler() {
  if (started) return;
  started = true;

  setInterval(async () => {
    try {
      const realCount = await getRealAgentCount();
      if (realCount < 3) return; // solo or paired — no rotation yet

      const brainState = await BrainState.findOne({});
      if (!brainState) return;
      if (brainState.nextRotationAt > new Date()) return; // not due yet

      const currentInterneuron = await Agent.findById(brainState.currentInterneuronId);
      if (!currentInterneuron) return;

      const candidates = await Agent.find({
        _id: { $ne: currentInterneuron._id },
        claimStatus: 'claimed',
        'metadata.type': { $ne: 'dummy' },
      });
      if (candidates.length === 0) return;

      const newInterneuron = candidates[Math.floor(Math.random() * candidates.length)];

      // Demote old interneuron randomly
      currentInterneuron.role = Math.random() < 0.5 ? 'sensor' : 'actuator';
      await currentInterneuron.save();

      // Promote new interneuron
      newInterneuron.role = 'interneuron';
      await newInterneuron.save();

      const now = new Date();
      if (brainState.history.length > 0) {
        brainState.history[brainState.history.length - 1].endedAt = now;
      }
      brainState.history.push({ agentId: newInterneuron._id, startedAt: now });
      brainState.currentInterneuronId = newInterneuron._id;
      brainState.rotationCount += 1;
      brainState.lastRotationAt = now;
      brainState.nextRotationAt = new Date(now.getTime() + ROTATION_INTERVAL_MS);
      await brainState.save();

      console.log(`[auto-rotate] ${currentInterneuron.name} → ${newInterneuron.name} (rotation #${brainState.rotationCount})`);
    } catch (err) {
      console.error('[auto-rotate] Error during rotation check:', err);
    }
  }, CHECK_INTERVAL_MS);

  console.log('[auto-rotate] Rotation scheduler started (checks every 60s, rotates every 10min with 3+ agents)');
}
