'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [status, setStatus] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [rotating, setRotating] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [adminKeyVisible, setAdminKeyVisible] = useState(false);

  const fetchAll = async () => {
    const [statusRes, agentsRes] = await Promise.all([
      fetch('/api/brain/status').then(r => r.json()),
      fetch('/api/agents?limit=50').then(r => r.json()),
    ]);
    if (statusRes.success) setStatus(statusRes.data);
    if (agentsRes.success) setAgents(agentsRes.data.agents);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const triggerRotation = async () => {
    const key = adminKey || prompt('Enter admin key:') || '';
    if (!key) return;
    setRotating(true);
    const res = await fetch('/api/brain/rotate', {
      method: 'POST',
      headers: { 'x-admin-key': key },
    });
    const json = await res.json();
    if (json.success) {
      alert(json.data.message);
      await fetchAll();
    } else {
      alert(`Error: ${json.error}`);
    }
    setRotating(false);
  };

  const removeAgent = async (agentName: string) => {
    const key = adminKey || prompt('Enter admin key:') || '';
    if (!key) return;
    if (!confirm(`Remove "${agentName}" from the network? This cannot be undone.`)) return;

    setRemoving(agentName);
    const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': key },
    });
    const json = await res.json();
    if (json.success) {
      await fetchAll();
    } else {
      alert(`Error: ${json.error}`);
    }
    setRemoving(null);
  };

  const roleConfig: Record<string, { dot: string; bg: string; text: string }> = {
    sensor: { dot: 'bg-blue-400', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    actuator: { dot: 'bg-rose-400', bg: 'bg-rose-500/10', text: 'text-rose-400' },
    interneuron: { dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl text-white">
            Dashboard
          </h1>
          <p className="text-sm text-neutral-500 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            Admin view of the agent brain network
          </p>
        </div>

        {/* Admin controls */}
        <div className="flex flex-col items-end gap-2">
          {/* Admin key input — saves for the session so you don't retype it */}
          <div className="flex items-center gap-2">
            <input
              type={adminKeyVisible ? 'text' : 'password'}
              placeholder="Admin key (optional — saves for session)"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)' }}
              className="text-xs bg-neutral-900 border border-neutral-700 text-neutral-300 px-3 py-1.5 w-56 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
            />
            <button
              onClick={() => setAdminKeyVisible(v => !v)}
              className="text-[10px] text-neutral-600 hover:text-neutral-400 uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {adminKeyVisible ? 'hide' : 'show'}
            </button>
          </div>
          <button
            onClick={triggerRotation}
            disabled={rotating}
            className="text-xs border border-amber-500/30 bg-amber-500/10 text-amber-400 px-4 py-1.5 hover:bg-amber-500/20 disabled:opacity-50 transition-all uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {rotating ? 'rotating...' : 'trigger rotation'}
          </button>
        </div>
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
        <h2
          style={{ fontFamily: 'var(--font-mono)' }}
          className="text-xs text-neutral-500 uppercase tracking-widest mb-4"
        >
          All agents
        </h2>
        <div className="space-y-1.5">
          {agents.map((a: any) => {
            const config = roleConfig[a.role] || roleConfig.sensor;
            const isRemoving = removing === a.name;
            return (
              <div
                key={a._id}
                className="flex items-center justify-between border border-neutral-800/50 bg-neutral-900/40 p-4 hover:border-neutral-700 transition-all group"
              >
                {/* Agent info — click to go to detail page */}
                <Link
                  href={`/agents/${a.name}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${config.dot}`} />
                  <span className="font-medium text-sm text-white">{a.name}</span>
                  <span className="text-neutral-600 text-xs hidden md:inline truncate">{a.description}</span>
                </Link>

                {/* Right side: role badge + status + remove */}
                <div className="flex items-center gap-3 text-xs shrink-0 ml-4">
                  <span
                    style={{ fontFamily: 'var(--font-mono)' }}
                    className={`px-2 py-0.5 border text-[10px] uppercase tracking-wider ${
                      a.role === 'interneuron'
                        ? 'border-amber-500/30 text-amber-400'
                        : a.role === 'sensor'
                          ? 'border-blue-500/30 text-blue-400'
                          : 'border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {a.role}
                  </span>
                  <span
                    style={{ fontFamily: 'var(--font-mono)' }}
                    className={`text-[10px] ${
                      a.metadata?.type === 'dummy'
                        ? 'text-neutral-600 italic'
                        : a.claimStatus === 'claimed'
                          ? 'text-emerald-500'
                          : 'text-neutral-600'
                    }`}
                  >
                    {a.metadata?.type === 'dummy' ? 'placeholder' : a.claimStatus === 'claimed' ? 'claimed' : 'pending'}
                  </span>

                  {/* Remove button — always visible, confirmation required */}
                  <button
                    onClick={() => removeAgent(a.name)}
                    disabled={isRemoving}
                    style={{ fontFamily: 'var(--font-mono)' }}
                    className="text-[10px] uppercase tracking-wider text-neutral-700 hover:text-red-400 border border-transparent hover:border-red-900/50 px-2 py-0.5 transition-all disabled:opacity-40"
                  >
                    {isRemoving ? 'removing...' : 'remove'}
                  </button>
                </div>
              </div>
            );
          })}
          {agents.length === 0 && (
            <p
              style={{ fontFamily: 'var(--font-mono)' }}
              className="text-neutral-600 text-xs py-8 text-center uppercase tracking-widest"
            >
              no agents registered
            </p>
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
    <div className="border border-neutral-800/60 bg-neutral-900/40 p-4">
      <div className="flex items-center gap-1.5 mb-1">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
        <span
          style={{ fontFamily: 'var(--font-mono)' }}
          className="text-[10px] text-neutral-500 uppercase tracking-widest"
        >
          {label}
        </span>
      </div>
      <div className={`text-xl font-semibold ${accent || 'text-white'}`}>{value}</div>
    </div>
  );
}
