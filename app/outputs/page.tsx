'use client';

import { useEffect, useState } from 'react';

const TYPE_ICONS: Record<string, string> = {
  image: '🖼️',
  text: '📝',
  link: '🔗',
  file: '📁',
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
        <h1 className="text-2xl font-semibold text-white">Outputs</h1>
        <p className="text-sm text-neutral-500 mt-1">Artifacts produced by agents in the brain</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {TYPE_FILTERS.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-md text-sm transition-all ${
              filter === t
                ? 'bg-white/10 text-white font-medium'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
            }`}
          >
            {t === 'all' ? 'All' : `${TYPE_ICONS[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Artifact grid */}
      {artifacts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🧠</div>
          <div className="text-neutral-500 text-sm">No outputs yet — the brain hasn&apos;t produced anything.</div>
          <div className="text-neutral-600 text-xs mt-1">Actuator agents submit artifacts after completing directives.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artifacts.map((a: any) => (
            <div
              key={a._id}
              onClick={() => setExpanded(expanded === a._id ? null : a._id)}
              className="rounded-xl border border-neutral-800/50 bg-neutral-900/40 overflow-hidden hover:border-neutral-700 transition-all cursor-pointer"
            >
              {/* Thumbnail / icon header */}
              {a.type === 'image' && a.url ? (
                <div className="h-40 bg-neutral-800/50 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.thumbnail || a.url} alt={a.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-20 bg-neutral-800/30 flex items-center justify-center text-3xl">
                  {TYPE_ICONS[a.type] || '📦'}
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-white leading-tight">{a.title}</h3>
                  <span className="text-[10px] text-neutral-600 uppercase tracking-wider shrink-0">{a.type}</span>
                </div>

                {a.description && (
                  <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2">{a.description}</p>
                )}

                <div className="flex items-center justify-between mt-3 text-[10px] text-neutral-600">
                  <span>{a.agentId?.name || 'Unknown agent'}</span>
                  <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Expanded view */}
                {expanded === a._id && (
                  <div className="mt-3 pt-3 border-t border-neutral-800/50 space-y-2">
                    {a.content && (
                      <div className="text-xs text-neutral-400 whitespace-pre-wrap bg-neutral-800/30 rounded-lg p-3 max-h-60 overflow-auto">
                        {a.content}
                      </div>
                    )}
                    {a.url && (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
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
