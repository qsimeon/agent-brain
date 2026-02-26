'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [status, setStatus] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [statusRes, agentsRes] = await Promise.all([
        fetch('/api/brain/status').then(r => r.json()),
        fetch('/api/agents?limit=50').then(r => r.json()),
      ]);
      if (statusRes.success) setStatus(statusRes.data);
      if (agentsRes.success) setAgents(agentsRes.data.agents);
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  const triggerRotation = async () => {
    setRotating(true);
    const adminKey = prompt('Enter admin key:');
    if (!adminKey) { setRotating(false); return; }

    const res = await fetch('/api/brain/rotate', {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
    });
    const json = await res.json();
    if (json.success) alert(json.data.message);
    else alert(`Error: ${json.error}`);
    setRotating(false);
  };

  const roleConfig: Record<string, { dot: string; bg: string; text: string }> = {
    sensor: { dot: 'bg-blue-400', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    actuator: { dot: 'bg-rose-400', bg: 'bg-rose-500/10', text: 'text-rose-400' },
    interneuron: { dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Admin view of the agent brain network</p>
        </div>
        <button
          onClick={triggerRotation}
          disabled={rotating}
          className="rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 text-sm font-medium hover:bg-amber-500/20 disabled:opacity-50 transition-all"
        >
          {rotating ? 'Rotating...' : 'Trigger rotation'}
        </button>
      </div>

      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total agents" value={status.stats.agents} />
          <Stat label="Sensors" value={status.stats.sensors} accent="text-blue-400" dot="bg-blue-400" />
          <Stat label="Actuators" value={status.stats.actuators} accent="text-rose-400" dot="bg-rose-400" />
          <Stat label="Current brain" value={status.currentInterneuron?.name || 'None'} accent="text-amber-400" dot="bg-amber-400" />
          <Stat label="Signals" value={status.stats.signals} />
          <Stat label="Directives" value={status.stats.directives} />
          <Stat label="Pending signals" value={status.stats.pendingSignals} />
          <Stat label="Total rotations" value={status.rotationCount} />
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">All agents</h2>
        <div className="space-y-1.5">
          {agents.map((a: any) => {
            const config = roleConfig[a.role] || roleConfig.sensor;
            return (
              <Link
                key={a._id}
                href={`/agents/${a.name}`}
                className="flex items-center justify-between rounded-lg border border-neutral-800/50 bg-neutral-900/40 p-4 hover:border-neutral-700 hover:bg-neutral-900/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                  <span className="font-medium text-sm text-white">{a.name}</span>
                  <span className="text-neutral-600 text-xs hidden md:inline">{a.description}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`rounded-full px-2.5 py-1 ${config.bg} ${config.text} font-medium`}>
                    {a.role}
                  </span>
                  <span className={
                    a.metadata?.type === 'dummy'
                      ? 'text-neutral-500 italic'
                      : a.claimStatus === 'claimed'
                        ? 'text-emerald-500'
                        : 'text-neutral-600'
                  }>
                    {a.metadata?.type === 'dummy' ? 'placeholder' : a.claimStatus === 'claimed' ? 'claimed' : 'pending'}
                  </span>
                </div>
              </Link>
            );
          })}
          {agents.length === 0 && (
            <p className="text-neutral-600 text-sm py-8 text-center">No agents registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, dot }: {
  label: string; value: string | number; accent?: string; dot?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/40 p-4">
      <div className="flex items-center gap-1.5 mb-1">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
        <span className="text-[11px] text-neutral-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-semibold ${accent || 'text-white'}`}>{value}</div>
    </div>
  );
}
