'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const ROLE_CONFIG: Record<string, { dot: string; text: string; bg: string }> = {
  sensor: { dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  actuator: { dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-500/10' },
  interneuron: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10' },
};

export default function AgentDetailPage() {
  const params = useParams();
  const name = params.name as string;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/agents/${name}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data);
        else setError(json.error);
      })
      .catch(() => setError('Failed to load agent'));
  }, [name]);

  if (error) return <div className="text-red-400 text-center py-16 text-sm">{error}</div>;
  if (!data) return <div className="text-neutral-600 text-center py-16 text-sm">Loading...</div>;

  const { agent, recentSignals, recentDirectives } = data;
  const config = ROLE_CONFIG[agent.role] || ROLE_CONFIG.sensor;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${config.bg} border border-neutral-800/50 flex items-center justify-center`}>
          <span className={`w-3 h-3 rounded-full ${config.dot}`} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">{agent.name}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{agent.description}</p>
          <div className="mt-2 flex gap-2">
            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium border border-neutral-700/50 bg-neutral-800/50 ${config.text}`}>
              {agent.role}
            </span>
            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium border ${
              agent.claimStatus === 'claimed'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border-neutral-700/50 bg-neutral-800/50 text-neutral-500'
            }`}>
              {agent.claimStatus === 'claimed' ? 'claimed' : 'pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/40 p-4">
          <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Last active</div>
          <div className="text-neutral-300">{new Date(agent.lastActive).toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/40 p-4">
          <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Created</div>
          <div className="text-neutral-300">{new Date(agent.createdAt).toLocaleString()}</div>
        </div>
      </div>

      {/* Signals */}
      {recentSignals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Recent signals</h2>
          <div className="space-y-1.5">
            {recentSignals.map((s: any) => (
              <div key={s._id} className="rounded-lg border border-neutral-800/50 bg-neutral-900/30 p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-blue-400 font-medium text-xs">{s.type}</span>
                  <span className={`text-[10px] uppercase tracking-wider ${s.status === 'pending' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="text-neutral-500 mt-1.5 text-xs font-mono">{JSON.stringify(s.payload).slice(0, 200)}</div>
                <div className="text-neutral-700 mt-1 text-[10px]">{new Date(s.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directives */}
      {recentDirectives.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Recent directives</h2>
          <div className="space-y-1.5">
            {recentDirectives.map((d: any) => (
              <div key={d._id} className="rounded-lg border border-neutral-800/50 bg-neutral-900/30 p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-rose-400 font-medium text-xs">{d.type}</span>
                  <span className={`text-[10px] uppercase tracking-wider ${
                    d.status === 'completed' ? 'text-emerald-400' :
                    d.status === 'pending' ? 'text-amber-400' : 'text-neutral-500'
                  }`}>{d.status}</span>
                </div>
                <div className="text-neutral-500 mt-1.5 text-xs font-mono">{JSON.stringify(d.payload).slice(0, 200)}</div>
                <div className="text-neutral-700 mt-1 text-[10px]">{new Date(d.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
