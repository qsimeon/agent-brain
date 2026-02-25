import NetworkGraph from '@/components/NetworkGraph';

export default function NetworkPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Network</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Live force-directed graph of the agent brain. Click any node for details.
        </p>
      </div>
      <NetworkGraph />
    </div>
  );
}
