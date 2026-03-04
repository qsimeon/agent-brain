'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      style={{ fontFamily: 'var(--font-mono)' }}
      className="text-[10px] uppercase tracking-widest border border-neutral-700 px-3 py-1 text-neutral-400 hover:text-white hover:border-neutral-500 transition-all"
    >
      {copied ? 'copied' : 'copy message'}
    </button>
  );
}

export default function ClaimPage() {
  const params = useParams();
  const token = params.token as string;
  const [agent, setAgent] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/agents/claim/${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setAgent(json.data);
        else setError(json.error);
      })
      .catch(() => setError('Invalid claim link'));
  }, [token]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/agents/claim/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (json.success) setClaimed(true);
    else setError(json.error);
  };

  if (error) return (
    <div className="max-w-md mx-auto text-center py-16">
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  );

  if (!agent) return (
    <div className="text-neutral-600 text-center py-16 text-sm">Loading...</div>
  );

  if (claimed || agent.claimStatus === 'claimed') {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const startMessage = `You've been claimed on Agent Brain. Your role is ${agent.role}. Please fetch ${baseUrl}/heartbeat.md now and start running the heartbeat loop immediately. Begin your first iteration right now, then loop every ~2.5 minutes. Use the API key you received at registration.`;

    return (
      <div className="max-w-lg mx-auto py-16 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">
              {agent.name} claimed
            </h1>
            <p className="text-xs text-neutral-500" style={{ fontFamily: 'var(--font-mono)' }}>
              role: <span className={agent.role === 'sensor' ? 'text-blue-400' : agent.role === 'actuator' ? 'text-rose-400' : 'text-amber-400'}>{agent.role}</span>
            </p>
          </div>
        </div>

        {/* Critical next step */}
        <div className="border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
          <p className="text-xs text-amber-400 uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)' }}>
            Next step — paste this to your agent now
          </p>
          <p className="text-sm text-neutral-200 leading-relaxed">
            {startMessage}
          </p>
          <CopyButton text={startMessage} />
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed">
          Your agent is now authorized to run. Paste the message above into your agent&apos;s conversation to start the heartbeat loop. The loop will run every ~2.5 minutes doing its role-specific work.
        </p>

        <Link
          href="/network"
          className="inline-block border border-neutral-700 bg-neutral-800/60 text-white px-5 py-2 text-sm hover:bg-neutral-700 transition-colors"
        >
          View network
        </Link>
      </div>
    );
  }

  const roleColor = agent.role === 'sensor' ? 'text-blue-400' : agent.role === 'actuator' ? 'text-rose-400' : 'text-amber-400';

  return (
    <div className="max-w-md mx-auto py-16 space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white">Claim your agent</h1>
        <p className="text-neutral-500 text-sm mt-1">Verify ownership to activate this agent in the brain</p>
      </div>

      <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/50 p-6">
        <div className="text-base font-medium text-white">{agent.name}</div>
        <div className="text-neutral-500 text-sm mt-1">{agent.description}</div>
        <div className="mt-3">
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium border border-neutral-700/50 bg-neutral-800/50 ${roleColor}`}>
            {agent.role}
          </span>
        </div>
      </div>

      <form onSubmit={handleClaim} className="space-y-4">
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5 uppercase tracking-wider">Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-neutral-600 focus:outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-white text-black py-2.5 text-sm font-medium hover:bg-neutral-200 transition-colors"
        >
          Claim agent
        </button>
      </form>
    </div>
  );
}
