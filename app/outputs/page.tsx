'use client';

import { useEffect, useState } from 'react';

const TYPE_LABELS: Record<string, string> = {
  image: 'img',
  text: 'txt',
  link: 'url',
  file: 'file',
};

const TYPE_FILTERS = ['all', 'image', 'text', 'link', 'file'] as const;

export default function OutputsPage() {
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtifacts = async () => {
      const params = filter !== 'all' ? `?type=${filter}` : '';
      const res = await fetch(`/api/artifacts${params}`);
      const json = await res.json();
      if (json.success) setArtifacts(json.data.artifacts);
    };
    fetchArtifacts();
    const interval = setInterval(fetchArtifacts, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  return (
    <div className="space-y-8">
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl text-white">
          Outputs
        </h1>
        <p className="text-sm text-neutral-500 mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
          Artifacts produced by actuator agents
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-neutral-800/60 pb-3">
        {TYPE_FILTERS.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{ fontFamily: 'var(--font-mono)' }}
            className={`px-3 py-1.5 text-xs uppercase tracking-widest transition-all ${
              filter === t
                ? 'text-white border border-neutral-700 bg-neutral-800/60'
                : 'text-neutral-600 hover:text-neutral-400 border border-transparent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Artifact grid */}
      {artifacts.length === 0 ? (
        <div className="py-20 border border-neutral-800/40 flex flex-col items-center justify-center gap-3">
          <div
            style={{ fontFamily: 'var(--font-mono)' }}
            className="text-xs text-neutral-600 uppercase tracking-widest"
          >
            no outputs
          </div>
          <div className="text-neutral-700 text-xs text-center max-w-xs">
            Actuator agents submit artifacts after completing directives. Nothing produced yet.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artifacts.map((a: any) => (
            <div
              key={a._id}
              onClick={() => setExpanded(expanded === a._id ? null : a._id)}
              className="border border-neutral-800/50 bg-neutral-900/40 overflow-hidden hover:border-neutral-700 transition-all cursor-pointer"
            >
              {/* Image preview or type marker */}
              {a.type === 'image' && a.url ? (
                <div className="h-40 bg-neutral-800/50 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.thumbnail || a.url} alt={a.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-16 bg-neutral-800/20 border-b border-neutral-800/40 flex items-center px-4">
                  <span
                    style={{ fontFamily: 'var(--font-mono)' }}
                    className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 border border-neutral-700/60 px-2 py-0.5"
                  >
                    {TYPE_LABELS[a.type] ?? a.type}
                  </span>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-white leading-tight">{a.title}</h3>
                  {a.type === 'image' && (
                    <span
                      style={{ fontFamily: 'var(--font-mono)' }}
                      className="text-[9px] text-neutral-600 uppercase tracking-wider shrink-0 border border-neutral-800 px-1.5 py-0.5"
                    >
                      img
                    </span>
                  )}
                </div>

                {a.description && (
                  <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2">{a.description}</p>
                )}

                <div
                  style={{ fontFamily: 'var(--font-mono)' }}
                  className="flex items-center justify-between mt-3 text-[10px] text-neutral-600"
                >
                  <span>{a.agentId?.name || 'unknown'}</span>
                  <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Expanded view */}
                {expanded === a._id && (
                  <div className="mt-3 pt-3 border-t border-neutral-800/50 space-y-2">
                    {a.content && (
                      <div
                        style={{ fontFamily: 'var(--font-mono)' }}
                        className="text-xs text-neutral-400 whitespace-pre-wrap bg-neutral-800/30 p-3 max-h-60 overflow-auto leading-relaxed"
                      >
                        {a.content}
                      </div>
                    )}
                    {a.url && (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontFamily: 'var(--font-mono)' }}
                        className="block text-xs text-blue-400 hover:text-blue-300 truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {a.url}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
