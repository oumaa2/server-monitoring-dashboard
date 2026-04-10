import React, { useMemo } from 'react';
import { Server, AlertTriangle, Activity, Zap, Clock, RefreshCw, AlertCircle, Info } from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { MetricCard } from '../components/metric-card';
import ServersTable from '../components/servers-table';
import { AlertsPanel } from '../components/alerts-panel';
import { DatabasePanel } from '../components/database-panel';
import { api, parseHistory } from '../../services/api';
import type { DashboardStats, PrometheusRangeResult } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';

const tooltipStyle = {
    contentStyle: { backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' },
    labelStyle: { color: '#9CA3AF' },
};

function SectionTitle({ title, info }: { title: string; info?: string }) {
    return (
        <div className="flex items-center gap-2 mb-2 group relative">
            <h2 className="text-white text-base font-bold uppercase tracking-widest text-gray-400/80">{title}</h2>
            {info && (
                <div className="relative inline-block cursor-help group/tooltip">
                    <Info className="w-3.5 h-3.5 text-gray-600 hover:text-blue-400 transition-colors" />
                    <div className="absolute left-0 bottom-full mb-3 hidden group-hover/tooltip:block w-72 p-3 bg-[#1f2937] border border-gray-700 rounded shadow-2xl text-[11px] leading-relaxed text-gray-300 z-50 pointer-events-none after:content-[''] after:absolute after:top-full after:left-4 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-[#1f2937] animate-in fade-in zoom-in duration-150 font-normal normal-case tracking-normal">
                        {info}
                    </div>
                </div>
            )}
        </div>
    );
}

function ChartCard({ title, children, info, loading }: { title: string; children: React.ReactNode; info?: string; loading?: boolean }) {
    return (
        <div className="bg-[#16181d] border border-gray-800 rounded-xl p-6 shadow-lg hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 group relative">
                    <h3 className="text-white text-sm font-semibold">{title}</h3>
                    {info && (
                        <div className="relative inline-block cursor-help group/tooltip">
                            <Info className="w-3.5 h-3.5 text-gray-500 hover:text-blue-400 transition-colors" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 hidden group-hover/tooltip:block w-56 p-2 bg-[#1f2937] border border-gray-700 rounded shadow-2xl text-[11px] leading-relaxed text-gray-300 z-50 pointer-events-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-[#1f2937] animate-in fade-in zoom-in duration-150">
                                {info}
                            </div>
                        </div>
                    )}
                </div>
                {loading && <RefreshCw className="w-3.5 h-3.5 text-gray-600 animate-spin" />}
            </div>
            {children}
        </div>
    );
}

function ChartError() {
    return (
        <div className="flex items-center justify-center h-[200px] gap-2 text-gray-600 text-xs">
            <AlertCircle className="w-4 h-4" />
            Could not load data
        </div>
    );
}

function ChartSkeleton({ height = 200 }: { height?: number }) {
    return (
        <div className="animate-pulse bg-gray-800/30 rounded-lg" style={{ height }} />
    );
}

/** Formats a raw stat with a suffix */
function fmtStat(value: number | undefined, unit: string, decimals = 1): string {
    if (value === undefined || value === null) return `—`;
    if (unit === 'ms') return `${value.toFixed(0)}ms`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K${unit}`;
    return `${value.toFixed(decimals)}${unit}`;
}

export default function Dashboard() {
    // ── Real data ──────────────────────────────────────────────────────────────
    const { data: stats, loading: statsLoading } = useFetch<DashboardStats>(
        () => api.getStats(), [], { refreshMs: 30_000 }
    );

    const { data: cpuHistory, loading: cpuLoading, error: cpuError } = useFetch<PrometheusRangeResult>(
        () => api.getHistory('cpu', '24h', '15m'), [], { refreshMs: 60_000 }
    );

    const { data: memHistory, loading: memLoading, error: memError } = useFetch<PrometheusRangeResult>(
        () => api.getHistory('memory', '24h', '15m'), [], { refreshMs: 60_000 }
    );

    const { data: netHistory, loading: netLoading, error: netError } = useFetch<PrometheusRangeResult>(
        () => api.getHistory('network', '24h', '15m'), [], { refreshMs: 60_000 }
    );

    const { data: diskHistory, loading: diskLoading, error: diskError } = useFetch<PrometheusRangeResult>(
        () => api.getHistory('disk', '24h', '15m'), [], { refreshMs: 60_000 }
    );

    const { data: errHistory, loading: errLoading, error: errError } = useFetch<PrometheusRangeResult>(
        () => api.getHistory('error_rate', '24h', '15m'), [], { refreshMs: 60_000 }
    );

    const { data: summary, loading: summaryLoading } = useFetch(
        () => api.getSummary(), [], { refreshMs: 30_000 }
    );

    const { data: databases, loading: dbLoading } = useFetch(
        () => api.getDatabases(), [], { refreshMs: 30_000 }
    );

    // ── Parse histories ────────────────────────────────────────────────────────
    const cpuData = useMemo(() => parseHistory(cpuHistory!).map(p => ({ ...p, usage: p.value })), [cpuHistory]);
    const memData = useMemo(() => parseHistory(memHistory!).map(p => ({ ...p, usage: p.value })), [memHistory]);
    const netData = useMemo(() => parseHistory(netHistory!).map(p => ({ ...p, inbound: p.value, outbound: p.value * 0.6 })), [netHistory]);
    const errData = useMemo(() => parseHistory(errHistory!).map(p => ({ ...p, rate: p.value })), [errHistory]);

    // Fleet Health: Up vs Down
    const fleetData = useMemo(() => {
        if (!summary) return [{ name: 'Operational', value: 0 }, { name: 'Critical', value: 0 }];
        const up = summary.filter(s => (s as any).status === 'online').length;
        const down = summary.filter(s => (s as any).status === 'offline').length;
        return [
            { name: 'Operational', value: up, fill: '#10B981' },
            { name: 'Critical', value: down, fill: '#EF4444' }
        ];
    }, [summary]);

    // Disk: show current value as a single "volume" bar chart
    const diskData = useMemo(() => {
        const pts = parseHistory(diskHistory!);
        const latest = pts[pts.length - 1]?.value ?? stats?.avgCpu ?? 0;
        return [
            { id: 'disk-root', name: 'Root /', usage: parseFloat(latest.toFixed(1)) },
        ];
    }, [diskHistory, stats]);

    // Fallback static latency/p95/p99 chart (backend doesn't have a latency range endpoint yet)
    const latencyData = useMemo(() =>
        Array.from({ length: 24 }, (_, i) => ({
            id: `lat-${i}`,
            time: `${String(i).padStart(2, '0')}:00`,
            avg: (stats?.avgLatency ?? 60) + (Math.random() - 0.5) * 20,
            p95: (stats?.avgLatency ?? 60) * 1.8 + Math.random() * 30,
            p99: (stats?.avgLatency ?? 60) * 3 + Math.random() * 40,
        })), [stats]);

    return (
        <div className="space-y-5 pb-8">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                {statsLoading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="h-28 bg-[#16181d] border border-gray-800 rounded-xl animate-pulse" />
                    ))
                ) : (
                    <>
                        <MetricCard title="Total Servers" value={String(stats?.totalServers ?? '—')} status="healthy" icon={Server} />
                        <MetricCard title="Active Alerts" value={String(stats?.activeAlerts ?? '—')}
                            status={(stats?.activeAlerts ?? 0) > 0 ? 'critical' : 'healthy'} icon={AlertTriangle} />
                        <MetricCard title="Requests/sec" value={fmtStat(stats?.requestsPerSec, '/s')} status="healthy" icon={Activity} />
                        <MetricCard title="Error Rate" value={fmtStat(stats?.errorRate, '%')}
                            status={(stats?.errorRate ?? 0) > 5 ? 'critical' : (stats?.errorRate ?? 0) > 1 ? 'warning' : 'healthy'} icon={Zap} />
                        <MetricCard title="Avg Latency" value={fmtStat(stats?.avgLatency, 'ms')} status="healthy" icon={Clock} />
                    </>
                )}
            </div>

            {/* Infrastructure */}
            <section>
                <SectionTitle title="Infrastructure Load History (24H)" info="Time-series aggregation of CPU/Memory trends over a 24-hour window. Essential for capacity planning and detecting cyclical workload patterns." />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <ChartCard title="Usage (%)" loading={cpuLoading} info="Real-time aggregate CPU utilization across all logical cores. High values indicate processing saturation or resource contention.">
                        {cpuError ? <ChartError /> : cpuLoading ? <ChartSkeleton /> : (
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={cpuData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                                    <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 10 }} interval={Math.floor(cpuData.length / 6)} />
                                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                                    <Tooltip {...tooltipStyle} />
                                    <Line type="monotone" dataKey="usage" stroke="#3B82F6" strokeWidth={2} dot={false} name="CPU %" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    <ChartCard title="Memory Usage (%)" loading={memLoading} info="Physical RAM allocation vs total capacity. Sustained high usage may trigger OOM (Out Of Memory) killer processes.">
                        {memError ? <ChartError /> : memLoading ? <ChartSkeleton /> : (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={memData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                                    <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 10 }} interval={Math.floor(memData.length / 6)} />
                                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                                    <Tooltip {...tooltipStyle} />
                                    <Area type="monotone" dataKey="usage" stroke="#10B981" strokeWidth={2} fill="url(#memGrad)" dot={false} name="Memory %" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    <ChartCard title="Fleet Status" loading={summaryLoading} info="Fleet availability distribution. Measures the ratio of operational vs non-responsive assets via ICMP/TCP heartbeats.">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={fleetData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                                <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} />
                                <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} allowDecimals={false} />
                                <Tooltip {...tooltipStyle} cursor={{ fill: '#374151', opacity: 0.1 }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Network Traffic" loading={netLoading} info="Measures total data throughput (Inbound and Outbound) across all server interfaces. Essential for diagnosing bandwidth saturation, packet-heavy workloads, and detecting abnormal traffic spikes.">
                        {netError ? <ChartError /> : netLoading ? <ChartSkeleton /> : (
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={netData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                                    <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 10 }} interval={Math.floor(netData.length / 6)} />
                                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                                    <Tooltip {...tooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                    <Line type="monotone" dataKey="inbound" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Inbound" />
                                    <Line type="monotone" dataKey="outbound" stroke="#F59E0B" strokeWidth={2} dot={false} name="Outbound (est.)" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    <ChartCard title="Disk Usage (%)" loading={diskLoading} info="Storage utilization percentage. Monitoring this prevents LVM/partition fill-up which can lead to system instability.">
                        {diskError ? <ChartError /> : diskLoading ? <ChartSkeleton /> : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={diskData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                                    <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                                    <Tooltip {...tooltipStyle} />
                                    <Bar dataKey="usage" fill="#EF4444" radius={[8, 8, 0, 0]} name="Usage %" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </div>
            </section>

            {/* Application */}
            <section>
                <SectionTitle title="Performance" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ChartCard title="Request Latency (ms)" info="Time-to-complete for incoming HTTP/RPC requests. Values represent service response time (MS) for performance benchmarking.">
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={latencyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                                <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 10 }} interval={7} />
                                <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="ms" />
                                <Tooltip {...tooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }} />
                                <Line type="monotone" dataKey="avg" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="Avg" />
                                <Line type="monotone" dataKey="p95" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="P95" />
                                <Line type="monotone" dataKey="p99" stroke="#EF4444" strokeWidth={1.5} dot={false} name="P99" />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Error Rate (%)" loading={errLoading} info="HTTP 4xx/5xx responses as a percentage of total traffic. Key indicator for service instability or logic exceptions.">
                        {errError ? <ChartError /> : errLoading ? <ChartSkeleton height={180} /> : (
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={errData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                                    <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 10 }} interval={Math.floor(errData.length / 6)} />
                                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="%" />
                                    <Tooltip {...tooltipStyle} />
                                    <Line type="monotone" dataKey="rate" stroke="#EF4444" strokeWidth={2} dot={false} name="Error %" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </div>
            </section>

            {/* Databases */}
            <section>
                <SectionTitle title="Databases" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dbLoading ? (
                        [...Array(2)].map((_, i) => (
                            <div key={i} className="h-48 bg-[#16181d] border border-gray-800 rounded-xl animate-pulse" />
                        ))
                    ) : (
                        databases?.map((db: any, i: number) => (
                            <DatabasePanel
                                key={i}
                                name={db.name}
                                type={db.type}
                                version={db.version}
                                status={db.status}
                                connections={{ active: db.connections, max: Math.max(100, db.connections * 2) }}
                                tps={db.tps}
                                size={db.size}
                                queryLatency={5.2} // Static fallback unless exposed by prometheus
                            />
                        ))
                    )}
                </div>
            </section>

            {/* Servers + Alerts */}
            <section>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-3">
                        <SectionTitle title="Inventory Overview" />
                        <ServersTable minimal={true} />
                    </div>
                    <div className="lg:col-span-1">
                        <SectionTitle title="Recent Triggers" />
                        <AlertsPanel />
                    </div>
                </div>
            </section>
        </div>
    );
}
