import NetworkGraph from '@/components/NetworkGraph';

export const metadata = {
  title: 'Network',
};

export default function NetworkPage() {
  return (
    <div style={{fontFamily: 'var(--font-sans)'}}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="mono-label mb-2">agent network · live</p>
          <h1 style={{fontFamily: 'var(--font-display)'}}
            className="text-3xl text-white leading-tight">
            Network Graph
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500 max-w-sm leading-relaxed">
            Force-directed graph of the agent brain. Click any node to inspect it.
          </p>
        </div>

        {/* Legend */}
        <div className="hidden md:flex flex-col gap-2 text-right">
          {[
            { label: 'Sensor',      color: 'var(--col-sensor)' },
            { label: 'Interneuron', color: 'var(--col-interneuron)' },
            { label: 'Actuator',    color: 'var(--col-actuator)' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center justify-end gap-2">
              <span style={{fontFamily: 'var(--font-mono)'}}
                className="text-[10px] text-white/30 uppercase tracking-widest">
                {label}
              </span>
              <span className="w-2 h-2 rounded-full" style={{background: color}} />
            </div>
          ))}
        </div>
      </div>

      {/* Graph container */}
      <div className="border border-white/[0.06] rounded-sm overflow-hidden bg-[#0a0a12]">
        <NetworkGraph />
      </div>

      {/* Footer hint */}
      <p style={{fontFamily: 'var(--font-mono)'}}
        className="mt-3 text-[10px] text-white/15 uppercase tracking-widest text-center">
        blue = sensor · gold = interneuron · red = actuator · dashed = placeholder
      </p>
    </div>
  );
}
