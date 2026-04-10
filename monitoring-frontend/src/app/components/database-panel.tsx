import React, { useMemo } from 'react';
import { Database, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DatabasePanelProps {
    name: string;
    type: string;
    version?: string;
    status?: 'healthy' | 'warning' | 'critical' | 'unknown';
    connections?: { active: number; max: number };
    queryLatency?: number;
    tps?: number;
    size?: string;
}

const statusColors = {
    healthy: { badge: 'bg-green-500/20 text-green-400', bar: 'bg-green-500', chart: '#10B981' },
    warning: { badge: 'bg-yellow-500/20 text-yellow-400', bar: 'bg-yellow-500', chart: '#F59E0B' },
    critical: { badge: 'bg-red-500/20 text-red-400', bar: 'bg-red-500', chart: '#EF4444' },
    unknown: { badge: 'bg-gray-500/20 text-gray-400', bar: 'bg-gray-500', chart: '#9CA3AF' },
};

const dbTypeIcon: Record<string, string> = {
    PostgreSQL: '🐘',
    MySQL: '🐬',
    Oracle: '🔴',
    MongoDB: '🍃',
};

export function DatabasePanel({
    name,
    type,
    version = '15.2',
    status = 'healthy',
    connections = { active: 45, max: 100 },
    queryLatency = 8,
    tps = 1200,
    size = '24.5 GB',
}: DatabasePanelProps) {
    const colors = statusColors[status] || statusColors.unknown;
    const connPct = Math.round((connections.active / connections.max) * 100);

    const latencyData = useMemo(() =>
        Array.from({ length: 20 }, (_, i) => ({
            id: `lat-${i}`,
            time: `${i * 3}m`,
            latency: queryLatency + (Math.random() - 0.5) * queryLatency * 0.6,
        })), [queryLatency]);

    return (
        <div className="bg-[#16181d] border border-gray-800 rounded-xl p-6 shadow-xl hover:border-gray-700 transition-all">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-xl">{dbTypeIcon[type] || '🗄️'}</div>
                    <div>
                        <h3 className="text-white font-semibold text-base">{name}</h3>
                        <p className="text-gray-500 text-xs font-medium">{type} {version}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </div>

            {/* Connection Pool */}
            <div className="mb-5">
                <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400 font-medium">Connection Pool</span>
                    <span className="text-white font-semibold">{connections.active} / {connections.max}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${connPct > 80 ? 'bg-red-500' : connPct > 60 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                        style={{ width: `${connPct}%` }}
                    />
                </div>
                <div className="text-right text-xs text-gray-600 mt-1">{connPct}% utilized</div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-gray-800/30 rounded-xl p-3 text-center">
                    <div className="text-gray-500 text-xs mb-1">Avg Latency</div>
                    <div className="text-white text-lg font-bold">{queryLatency}ms</div>
                </div>
                <div className="bg-gray-800/30 rounded-xl p-3 text-center">
                    <div className="text-gray-500 text-xs mb-1">TPS</div>
                    <div className="text-white text-lg font-bold">{tps >= 1000 ? `${(tps / 1000).toFixed(1)}K` : tps}</div>
                </div>
                <div className="bg-gray-800/30 rounded-xl p-3 text-center">
                    <div className="text-gray-500 text-xs mb-1">Size</div>
                    <div className="text-green-400 text-lg font-bold">{size}</div>
                </div>
            </div>

            {/* Query Latency Chart */}
            <div>
                <div className="flex items-center gap-2 mb-2 group relative">
                    <div className="text-gray-400 text-xs font-medium">Query Latency (last 1h)</div>
                    <div className="relative inline-block cursor-help group/tooltip">
                        <Info className="w-3 h-3 text-gray-600 hover:text-blue-400 transition-colors" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-64 p-3 bg-[#1f2937] border border-gray-700 rounded shadow-2xl text-[11px] leading-relaxed text-gray-300 z-50 pointer-events-none after:content-[''] after:absolute after:top-full after:left-3 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-[#1f2937] animate-in fade-in zoom-in duration-150 font-normal">
                            Average P95 execution time for SQL transactions. Sustained high latency typically indicates indexing issues, lock contention, or I/O saturation.
                        </div>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={latencyData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`db-grad-${name}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors.chart} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={colors.chart} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                        <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '11px' }}
                            labelStyle={{ color: '#9CA3AF' }}
                        />
                        <Area type="monotone" dataKey="latency" stroke={colors.chart} strokeWidth={2} fill={`url(#db-grad-${name})`} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
