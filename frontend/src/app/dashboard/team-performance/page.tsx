'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Loader2, Users, TrendingUp, ShieldCheck, Activity, AlertTriangle } from 'lucide-react';

const AGENT_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4',
  '#ec4899', '#ef4444', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#d946ef', '#0ea5e9', '#65a30d',
];

/* =================================================================
   PARALLEL COORDINATES — Team Performance Overview
   Axes: Assigned Open | Created Open | Closed | SLA Overdue | Avg Resolution (h) | Workload Score
   ================================================================= */
function ParallelCoordinates({ agents }: { agents: any[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const axes = useMemo(() => [
    { key: 'assignedOpen', label: 'Assigned Open' },
    { key: 'createdOpen', label: 'Created Open' },
    { key: 'assignedClosed', label: 'Closed' },
    { key: 'overdueActive', label: 'SLA Overdue' },
    { key: 'avgResolutionHours', label: 'Avg Resolution (h)' },
    { key: 'workloadScore', label: 'Workload Score' },
  ], []);

  const maxPerAxis = useMemo(() => {
    const m: Record<string, number> = {};
    for (const ax of axes) {
      m[ax.key] = Math.max(...agents.map(a => a[ax.key] || 0), 1);
    }
    return m;
  }, [agents, axes]);

  if (agents.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No agent data available</p>;

  const W = 800, H = 320, PAD_L = 20, PAD_R = 20, PAD_T = 40, PAD_B = 60;
  const axisSpacing = (W - PAD_L - PAD_R) / (axes.length - 1);

  const getY = (value: number, maxVal: number) => {
    const norm = maxVal > 0 ? value / maxVal : 0;
    return PAD_T + (1 - norm) * (H - PAD_T - PAD_B);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Activity size={15} /> Team Performance Overview</h3>
      <p className="text-[10px] text-muted-foreground mb-4">Each line represents a team member across key metrics</p>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]" style={{ maxHeight: 340 }}>
          {/* Axis lines */}
          {axes.map((ax, i) => {
            const x = PAD_L + i * axisSpacing;
            return (
              <g key={ax.key}>
                <line x1={x} y1={PAD_T} x2={x} y2={H - PAD_B} stroke="currentColor" className="text-border" strokeWidth="1" />
                <text x={x} y={PAD_T - 10} textAnchor="middle" className="fill-muted-foreground" fontSize="9" fontWeight="500">{ax.label}</text>
                <text x={x} y={PAD_T - 1} textAnchor="middle" className="fill-muted-foreground" fontSize="8">{Math.round(maxPerAxis[ax.key])}</text>
                <text x={x} y={H - PAD_B + 10} textAnchor="middle" className="fill-muted-foreground" fontSize="8">0</text>
              </g>
            );
          })}

          {/* Agent lines */}
          {agents.map((agent, ai) => {
            const color = AGENT_COLORS[ai % AGENT_COLORS.length];
            const isHov = hovered === agent.id;
            const isOther = hovered && hovered !== agent.id;
            const points = axes.map((ax, i) => {
              const x = PAD_L + i * axisSpacing;
              const y = getY(agent[ax.key] || 0, maxPerAxis[ax.key]);
              return `${x},${y}`;
            }).join(' ');

            return (
              <polyline
                key={agent.id}
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={isHov ? 3 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isOther ? 0.12 : isHov ? 1 : 0.7}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHovered(agent.id)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}

          {/* Dots on hovered line */}
          {hovered && (() => {
            const agent = agents.find(a => a.id === hovered);
            if (!agent) return null;
            const ai = agents.indexOf(agent);
            const color = AGENT_COLORS[ai % AGENT_COLORS.length];
            return axes.map((ax, i) => {
              const x = PAD_L + i * axisSpacing;
              const y = getY(agent[ax.key] || 0, maxPerAxis[ax.key]);
              return (
                <g key={ax.key}>
                  <circle cx={x} cy={y} r={4} fill={color} />
                  <text x={x} y={y - 8} textAnchor="middle" fill={color} fontSize="9" fontWeight="700">
                    {typeof agent[ax.key] === 'number' ? (Number.isInteger(agent[ax.key]) ? agent[ax.key] : agent[ax.key].toFixed(1)) : 0}
                  </text>
                </g>
              );
            });
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
        {agents.map((a, i) => (
          <button key={a.id}
            className={`flex items-center gap-1.5 text-[11px] transition-opacity ${hovered && hovered !== a.id ? 'opacity-30' : ''}`}
            onMouseEnter={() => setHovered(a.id)} onMouseLeave={() => setHovered(null)}>
            <span className="w-3 h-[3px] rounded-full" style={{ backgroundColor: AGENT_COLORS[i % AGENT_COLORS.length] }} />
            {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* =================================================================
   WORKLOAD RANKING — Horizontal Bar Chart
   ================================================================= */
function WorkloadRanking({ agents }: { agents: any[] }) {
  const sorted = useMemo(() => [...agents].sort((a, b) => b.workloadScore - a.workloadScore), [agents]);
  const max = sorted.length > 0 ? sorted[0].workloadScore : 1;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><TrendingUp size={15} /> Workload Ranking</h3>
      <p className="text-[10px] text-muted-foreground mb-4">Open + Closed weighted score</p>
      <div className="space-y-2">
        {sorted.map((a, i) => (
          <div key={a.id} className="flex items-center gap-2 group">
            <span className="text-[11px] font-medium w-28 text-right truncate shrink-0">{a.name}</span>
            <div className="flex-1 h-5 bg-secondary rounded overflow-hidden relative">
              <div className="h-full rounded transition-all duration-700 flex items-center"
                style={{
                  width: `${Math.max(2, (a.workloadScore / (max || 1)) * 100)}%`,
                  background: `linear-gradient(90deg, ${AGENT_COLORS[i % AGENT_COLORS.length]}cc, ${AGENT_COLORS[i % AGENT_COLORS.length]})`,
                }}>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold w-10 text-right shrink-0">{a.workloadScore}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground mt-3 text-center">Workload Score = (Assigned Open × 2) + (Created Open × 0.5)</p>
    </div>
  );
}

/* =================================================================
   RADAR CHART — Handler Performance
   4 axes: Resolution Rate, Workload (inverted), Efficiency, SLA Compliance
   ================================================================= */
function RadarChart({ agents }: { agents: any[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const top6 = useMemo(() =>
    [...agents].sort((a, b) => {
      const scoreA = a.resolutionRate + a.slaRate + a.efficiency;
      const scoreB = b.resolutionRate + b.slaRate + b.efficiency;
      return scoreB - scoreA;
    }).slice(0, 6),
    [agents]);

  const radarAxes = [
    { key: 'resolutionRate', label: 'Resolution Rate' },
    { key: 'workloadNorm', label: 'Workload' },
    { key: 'efficiency', label: 'Efficiency' },
    { key: 'slaRate', label: 'SLA Compliance' },
  ];

  // Normalize workload (invert: higher workload = lower score, so we show balance)
  const maxWorkload = Math.max(...top6.map(a => a.workloadScore), 1);
  const agentsWithNorm = top6.map(a => ({
    ...a,
    workloadNorm: Math.min(1, a.workloadScore / maxWorkload),
  }));

  const SIZE = 240, CENTER = SIZE / 2, RADIUS = 90;
  const angleStep = (2 * Math.PI) / radarAxes.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (axisIndex: number, value: number) => {
    const angle = startAngle + axisIndex * angleStep;
    const r = value * RADIUS;
    return { x: CENTER + Math.cos(angle) * r, y: CENTER + Math.sin(angle) * r };
  };

  if (top6.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><ShieldCheck size={15} /> Handler Performance Radar</h3>
      <p className="text-[10px] text-muted-foreground mb-3">Top {top6.length} handlers (Overall Score)</p>
      <div className="flex justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Grid rings */}
          {[0.25, 0.5, 0.75, 1].map(level => (
            <polygon key={level}
              points={radarAxes.map((_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}`; }).join(' ')}
              fill="none" stroke="currentColor" className="text-border" strokeWidth="0.5" opacity={0.5} />
          ))}

          {/* Axis lines */}
          {radarAxes.map((ax, i) => {
            const end = getPoint(i, 1);
            const labelP = getPoint(i, 1.2);
            return (
              <g key={ax.key}>
                <line x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} stroke="currentColor" className="text-border" strokeWidth="0.5" />
                <text x={labelP.x} y={labelP.y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" fontSize="9" fontWeight="500">{ax.label}</text>
              </g>
            );
          })}

          {/* Agent polygons */}
          {agentsWithNorm.map((agent, ai) => {
            const color = AGENT_COLORS[ai % AGENT_COLORS.length];
            const isHov = hovered === agent.id;
            const isOther = hovered && hovered !== agent.id;
            const points = radarAxes.map((ax, i) => {
              const val = agent[ax.key] || 0;
              const p = getPoint(i, val);
              return `${p.x},${p.y}`;
            }).join(' ');

            return (
              <polygon key={agent.id}
                points={points}
                fill={color} fillOpacity={isHov ? 0.2 : 0.05}
                stroke={color} strokeWidth={isHov ? 2.5 : 1}
                opacity={isOther ? 0.1 : isHov ? 1 : 0.6}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHovered(agent.id)}
                onMouseLeave={() => setHovered(null)} />
            );
          })}

          {/* Dots on hover */}
          {hovered && (() => {
            const agent = agentsWithNorm.find(a => a.id === hovered);
            if (!agent) return null;
            const ai = agentsWithNorm.indexOf(agent);
            const color = AGENT_COLORS[ai % AGENT_COLORS.length];
            return radarAxes.map((ax, i) => {
              const p = getPoint(i, agent[ax.key] || 0);
              return <circle key={ax.key} cx={p.x} cy={p.y} r={3.5} fill={color} />;
            });
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
        {agentsWithNorm.map((a, i) => (
          <button key={a.id}
            className={`flex items-center gap-1.5 text-[10px] transition-opacity ${hovered && hovered !== a.id ? 'opacity-30' : ''}`}
            onMouseEnter={() => setHovered(a.id)} onMouseLeave={() => setHovered(null)}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: AGENT_COLORS[i % AGENT_COLORS.length] }} />
            {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* =================================================================
   OPERATIONAL STATUS DONUT
   4 slices: OK (green), At Risk (yellow), Overdue (red), Paused (dark)
   ================================================================= */
function OperationalDonut({ status }: { status: { ok: number; atRisk: number; overdue: number; paused: number } }) {
  const total = status.ok + status.atRisk + status.overdue + status.paused;
  if (total === 0) return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-1">Operational Status</h3>
      <p className="text-xs text-muted-foreground text-center py-8">No open assigned tickets</p>
    </div>
  );

  const slices = [
    { key: 'OK', count: status.ok, color: '#10b981' },
    { key: 'At Risk', count: status.atRisk, color: '#f59e0b' },
    { key: 'Overdue', count: status.overdue, color: '#ef4444' },
    { key: 'Paused', count: status.paused, color: '#71717a' },
  ].filter(s => s.count > 0);

  const SIZE = 180, CX = SIZE / 2, CY = SIZE / 2, R = 68, INNER_R = 44;

  // Build arc paths
  let startAngle = -Math.PI / 2;
  const arcs = slices.map(s => {
    const angle = (s.count / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1o = CX + R * Math.cos(startAngle), y1o = CY + R * Math.sin(startAngle);
    const x2o = CX + R * Math.cos(endAngle), y2o = CY + R * Math.sin(endAngle);
    const x1i = CX + INNER_R * Math.cos(endAngle), y1i = CY + INNER_R * Math.sin(endAngle);
    const x2i = CX + INNER_R * Math.cos(startAngle), y2i = CY + INNER_R * Math.sin(startAngle);

    const path = [
      `M ${x1o} ${y1o}`,
      `A ${R} ${R} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      `Z`,
    ].join(' ');

    // Label position
    const midAngle = startAngle + angle / 2;
    const labelR = R + 16;
    const lx = CX + labelR * Math.cos(midAngle);
    const ly = CY + labelR * Math.sin(midAngle);

    startAngle = endAngle;
    return { ...s, path, lx, ly, midAngle, pct: Math.round((s.count / total) * 100) };
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><AlertTriangle size={15} /> Operational Status</h3>
      <p className="text-[10px] text-muted-foreground mb-3">Open assigned tickets health</p>
      <div className="flex justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {arcs.map(arc => (
            <g key={arc.key}>
              <path d={arc.path} fill={arc.color} className="transition-all hover:opacity-80" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }} />
              {arc.pct >= 8 && (
                <text x={arc.lx} y={arc.ly} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" fontSize="8" fontWeight="600">
                  {arc.key}
                </text>
              )}
            </g>
          ))}
          {/* Center text */}
          <text x={CX} y={CY - 6} textAnchor="middle" className="fill-foreground" fontSize="18" fontWeight="700">{total}</text>
          <text x={CX} y={CY + 10} textAnchor="middle" className="fill-muted-foreground" fontSize="8">assigned</text>
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        {slices.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] font-medium">{s.key}</span>
            <span className="text-[11px] font-mono text-muted-foreground ml-auto">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =================================================================
   AGENT STATS TABLE
   ================================================================= */
function AgentTable({ agents }: { agents: any[] }) {
  const sorted = useMemo(() => [...agents].sort((a, b) => b.assignedTotal - a.assignedTotal), [agents]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 pb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Users size={15} /> Agent Detail</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Agent</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Open</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Closed</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Total</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Overdue</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Resolution Rate</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">SLA Rate</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Avg Res (h)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((a, i) => (
              <tr key={a.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: AGENT_COLORS[i % AGENT_COLORS.length] }}>
                      {a.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className="font-medium text-xs">{a.name}</span>
                  </div>
                </td>
                <td className="text-center px-3 py-2.5 font-mono text-xs">{a.assignedOpen}</td>
                <td className="text-center px-3 py-2.5 font-mono text-xs">{a.assignedClosed}</td>
                <td className="text-center px-3 py-2.5 font-mono text-xs font-semibold">{a.assignedTotal}</td>
                <td className="text-center px-3 py-2.5">
                  <span className={`font-mono text-xs ${a.overdueActive > 0 ? 'text-red-400 font-semibold' : 'text-muted-foreground'}`}>{a.overdueActive}</span>
                </td>
                <td className="text-center px-3 py-2.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${a.resolutionRate * 100}%` }} />
                    </div>
                    <span className="font-mono text-[10px]">{Math.round(a.resolutionRate * 100)}%</span>
                  </div>
                </td>
                <td className="text-center px-3 py-2.5">
                  <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${a.slaRate >= 0.9 ? 'bg-emerald-500/10 text-emerald-400' :
                      a.slaRate >= 0.7 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                    }`}>{Math.round(a.slaRate * 100)}%</span>
                </td>
                <td className="text-center px-3 py-2.5 font-mono text-xs">{a.avgResolutionHours || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =================================================================
   MAIN PAGE
   ================================================================= */
export default function TeamPerformancePage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTeamPerformance()
      .then(setData)
      .catch((e: any) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  if (error) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{error}</div>;

  const agents = data?.agents || [];
  const ops = data?.operationalStatus || { ok: 0, atRisk: 0, overdue: 0, paused: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Performance</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor your team&apos;s workload, SLA compliance, and efficiency</p>
      </div>

      {agents.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Users size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No team data available yet. Assign tickets to team members to see performance metrics.</p>
        </div>
      ) : (
        <>
          {/* 1. Parallel Coordinates — Full Width */}
          <ParallelCoordinates agents={agents} />

          {/* 2. Bottom row: Workload Ranking | Radar | Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <WorkloadRanking agents={agents} />
            <RadarChart agents={agents} />
            <OperationalDonut status={ops} />
          </div>

          {/* 3. Agent Detail Table */}
          <AgentTable agents={agents} />
        </>
      )}
    </div>
  );
}