'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface NetworkNode {
  id: string;
  name: string;
  role: 'sensor' | 'actuator' | 'interneuron';
  lastActive: string;
  description: string;
  x?: number;
  y?: number;
}

interface NetworkEdge {
  source: string;
  target: string;
  type: 'signal' | 'directive';
  label?: string;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  brainState: {
    currentInterneuronId: string;
    nextRotationAt: string;
    rotationCount: number;
  } | null;
}

const ROLE_COLORS: Record<string, string> = {
  sensor: '#3b82f6',
  actuator: '#ef4444',
  interneuron: '#f59e0b',
};

export default function NetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<NetworkData | null>(null);
  const [countdown, setCountdown] = useState('');

  // Fetch network data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/network');
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {}
    };
    fetchData();
    const interval = setInterval(fetchData, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!data?.brainState?.nextRotationAt) return;
    const update = () => {
      const diff = new Date(data.brainState!.nextRotationAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Awaiting rotation');
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setCountdown(`${min}m ${sec}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [data?.brainState?.nextRotationAt]);

  // D3 rendering
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight || 500;

    // Defs for glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow markers
    ['signal', 'directive'].forEach(type => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', type === 'signal' ? '#3b82f680' : '#ef444480');
    });

    const simulation = d3.forceSimulation(data.nodes as any)
      .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Edges
    const link = svg.append('g')
      .selectAll('line')
      .data(data.edges)
      .join('line')
      .attr('stroke', d => d.type === 'signal' ? '#3b82f640' : '#ef444440')
      .attr('stroke-width', 1.5)
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Node groups
    const node = svg.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Glow circle for interneuron
    node.filter((d: any) => d.role === 'interneuron')
      .append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', ROLE_COLORS.interneuron)
      .attr('stroke-width', 2)
      .attr('opacity', 0.4)
      .attr('filter', 'url(#glow)');

    // Main circles
    node.append('circle')
      .attr('r', (d: any) => d.role === 'interneuron' ? 14 : 10)
      .attr('fill', (d: any) => ROLE_COLORS[d.role])
      .attr('stroke', '#1a1a1a')
      .attr('stroke-width', 2)
      .attr('filter', (d: any) => d.role === 'interneuron' ? 'url(#glow)' : null)
      .style('cursor', 'pointer');

    // Labels
    node.append('text')
      .text((d: any) => d.name)
      .attr('dy', -18)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '11px');

    // Hover
    node.on('mouseover', (event, d: any) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      tooltip.style.display = 'block';
      tooltip.style.left = `${event.pageX + 10}px`;
      tooltip.style.top = `${event.pageY - 10}px`;
      tooltip.innerHTML = `
        <div class="font-bold">${d.name}</div>
        <div class="text-xs" style="color: ${ROLE_COLORS[d.role]}">${d.role.toUpperCase()}</div>
        <div class="text-xs text-neutral-400 mt-1">${d.description || ''}</div>
      `;
    })
    .on('mouseout', () => {
      const tooltip = tooltipRef.current;
      if (tooltip) tooltip.style.display = 'none';
    })
    .on('click', (_event, d: any) => {
      window.location.href = `/agents/${d.name}`;
    });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [data]);

  return (
    <div className="relative">
      {/* Countdown */}
      {data?.brainState && (
        <div className="absolute top-4 right-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm z-10">
          <span className="text-amber-400 font-semibold">Next rotation:</span>{' '}
          <span className="text-white font-mono">{countdown}</span>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 flex gap-4 text-xs z-10">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Sensor</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Actuator</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Interneuron</span>
      </div>

      <svg
        ref={svgRef}
        className="w-full rounded-xl border border-neutral-800 bg-neutral-900"
        style={{ height: '500px' }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 hidden rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 shadow-xl text-sm"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
