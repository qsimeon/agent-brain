import { connectDB } from '@/lib/db/mongodb';
import Artifact from '@/lib/models/Artifact';

export default async function ArtifactFullPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();

  const artifact = await Artifact.findById(id).populate('agentId', 'name');
  if (!artifact) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-500 font-mono text-sm">Artifact not found</p>
      </div>
    );
  }

  if (artifact.type === 'html' && artifact.content) {
    // Render HTML artifacts as full standalone pages
    return (
      <div className="min-h-screen bg-white">
        <iframe
          srcDoc={artifact.content}
          sandbox="allow-scripts"
          title={artifact.title}
          className="w-full border-0"
          style={{ height: '100vh' }}
        />
      </div>
    );
  }

  // Non-HTML artifacts: show content in a styled page
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-3xl text-white mb-2">
        {artifact.title}
      </h1>
      <p className="text-sm text-neutral-500 font-mono mb-8">
        by {(artifact.agentId as any)?.name || 'unknown'} · {artifact.type}
      </p>
      {artifact.content && (
        <div className="text-neutral-300 whitespace-pre-wrap font-mono text-sm bg-neutral-900 border border-neutral-800 p-6 rounded">
          {artifact.content}
        </div>
      )}
      {artifact.url && (
        <a href={artifact.url} target="_blank" rel="noopener noreferrer"
          className="block mt-4 text-blue-400 hover:text-blue-300 font-mono text-sm">
          {artifact.url}
        </a>
      )}
    </div>
  );
}
