'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface NetworkNode {
  id: string;
  name: string;
  role: 'sensor' | 'actuator' | 'interneuron';
  lastActive: string;
  description: string;
  sensingCount?: number;
  actingCount?: number;
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
      } catch (err) {
        console.error('Failed to fetch network data:', err);
      }
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

    // If no real agents, show ghost preview of what the network looks like
    if (data.nodes.length === 0) {
      const ghostNodes = [
        { x: width * 0.35, y: height * 0.35, role: 'sensor', label: 'sensor' },
        { x: width * 0.65, y: height * 0.3, role: 'interneuron', label: 'interneuron' },
        { x: width * 0.5, y: height * 0.65, role: 'actuator', label: 'actuator' },
      ];
      const ghostEdges = [
        { x1: ghostNodes[0].x, y1: ghostNodes[0].y, x2: ghostNodes[1].x, y2: ghostNodes[1].y },
        { x1: ghostNodes[1].x, y1: ghostNodes[1].y, x2: ghostNodes[2].x, y2: ghostNodes[2].y },
      ];
      svg.append('g').selectAll('line').data(ghostEdges).join('line')
        .attr('x1', d => d.x1).attr('y1', d => d.y1).attr('x2', d => d.x2).attr('y2', d => d.y2)
        .attr('stroke', 'rgba(255,255,255,0.06)').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');
      const g = svg.append('g').selectAll('g').data(ghostNodes).join('g')
        .attr('transform', d => `translate(${d.x},${d.y})`);
      g.append('circle').attr('r', 10)
        .attr('fill', 'transparent').attr('stroke', d => ROLE_COLORS[d.role])
        .attr('stroke-width', 1).attr('stroke-dasharray', '3,3').attr('opacity', 0.25);
      g.append('text').text(d => d.label).attr('dy', -16).attr('text-anchor', 'middle')
        .attr('fill', '#333').attr('font-size', '10px').attr('font-style', 'italic');
      svg.append('text').text('No agents registered — connect yours to bring the brain to life')
        .attr('x', width / 2).attr('y', height - 30).attr('text-anchor', 'middle')
        .attr('fill', '#444').attr('font-size', '12px');
      return;
    }

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

    const padding = 40;
    const simulation = d3.forceSimulation(data.nodes as any)
      .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));

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

    // Skill count badges
    node.filter((d: any) => (d.sensingCount > 0 || d.actingCount > 0))
      .append('text')
      .text((d: any) => `S:${d.sensingCount} A:${d.actingCount}`)
      .attr('dy', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace');

    // Hover
    node.on('mouseover', (event, d: any) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      tooltip.style.display = 'block';
      tooltip.style.left = `${event.pageX + 10}px`;
      tooltip.style.top = `${event.pageY - 10}px`;
      tooltip.textContent = '';
      const nameEl = document.createElement('div');
      nameEl.className = 'font-bold';
      nameEl.textContent = d.name;
      const roleEl = document.createElement('div');
      roleEl.className = 'text-xs';
      roleEl.style.color = ROLE_COLORS[d.role];
      roleEl.textContent = d.role.toUpperCase();
      tooltip.append(nameEl, roleEl);
      if (d.description) {
        const descEl = document.createElement('div');
        descEl.className = 'text-xs text-neutral-400 mt-1';
        descEl.textContent = d.description;
        tooltip.append(descEl);
      }
      if (d.sensingCount || d.actingCount) {
        const skillEl = document.createElement('div');
        skillEl.className = 'text-xs text-neutral-500 mt-1';
        skillEl.textContent = `Skills: ${d.sensingCount} sensing, ${d.actingCount} acting`;
        tooltip.append(skillEl);
      }
    })
    .on('mouseout', () => {
      const tooltip = tooltipRef.current;
      if (tooltip) tooltip.style.display = 'none';
    })
    .on('click', (_event, d: any) => {
      window.location.href = `/agents/${d.name}`;
    });

    simulation.on('tick', () => {
      // Clamp nodes within the SVG bounds
      data.nodes.forEach((d: any) => {
        d.x = Math.max(padding, Math.min(width - padding, d.x));
        d.y = Math.max(padding, Math.min(height - padding, d.y));
      });

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
