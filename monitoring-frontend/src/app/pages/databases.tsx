import React, { useMemo } from 'react';
import { DatabasePanel } from '../components/database-panel';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../services/api';
import type { DatabaseItem, DeepDbMetrics } from '../../services/api';

export default function Databases() {
    const { data: databases, loading } = useFetch<DatabaseItem[]>(
        () => api.getDatabases(), [], { refreshMs: 30_000 }
    );

    const { data: deepMetrics } = useFetch<DeepDbMetrics>(
        () => api.getDeepDbMetrics(), [], { refreshMs: 30_000 }
    );


    const stats = useMemo(() => {
        if (!databases) return { count: 0, conn: 0, tps: 0 };
        return {
            count: databases.length,
            conn: databases.reduce((a, b) => a + b.connections, 0),
            tps: databases.reduce((a, b) => a + b.tps, 0),
        };
    }, [databases]);

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="text-white text-2xl font-semibold mb-1">Database Management</h1>
                <p className="text-gray-400 text-sm">Monitor performance, connections, and health of all databases</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Databases', value: loading ? '…' : stats.count, color: 'text-blue-400', sub: 'All synced' },
                    { label: 'Total Connections', value: loading ? '…' : stats.conn, color: 'text-green-400', sub: 'Across nodes' },
                    { label: 'Total TPS', value: loading ? '…' : (stats.tps >= 1000 ? `${(stats.tps / 1000).toFixed(1)}K` : stats.tps), color: 'text-yellow-400', sub: 'Transactions/sec' },
                    { label: 'Avg Query Time', value: '5.2ms', color: 'text-emerald-400', sub: 'Excellent' },
                ].map((s, i) => (
                    <div key={i} className="bg-[#16181d] border border-gray-800 rounded-xl p-5">
                        <p className="text-gray-400 text-sm mb-2">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-gray-600 text-xs mt-1">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Database Panels */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-64 bg-[#16181d] border border-gray-800 rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {databases?.map((db, i) => (
                        <DatabasePanel
                            key={i}
                            name={db.name}
                            type={db.type}
                            version={db.version}
                            status={db.status}
                            connections={{ active: db.connections, max: Math.max(100, db.connections * 2) }}
                            tps={db.tps}
                            size={db.size}
                            queryLatency={5.2}
                        />
                    ))}
                    {databases?.length === 0 && (
                        <div className="col-span-1 md:col-span-2 text-center py-12 text-gray-500">
                            No databases found.
                        </div>
                    )}
                </div>
            )}

            {/* Deep Metrics Section */}
            {deepMetrics && (
                <div className="mt-8 space-y-4 animate-in fade-in duration-500">
                    <h2 className="text-xl font-semibold text-white mb-4">Deep Performance Metrics (PostgreSQL)</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#16181d] border border-gray-800 rounded-xl p-5 md:col-span-2 shadow-xl">
                            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">Slowest Queries</h3>
                            {deepMetrics.slowQueries?.length === 0 || deepMetrics.slowQueries?.[0]?.query.includes('extension not enabled') ? (
                                <div className="text-sm text-gray-500 py-4 italic">
                                    {deepMetrics.slowQueries?.[0]?.query || "No slow queries recorded or extension not enabled."}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {deepMetrics.slowQueries?.map((sq, i) => (
                                        <div key={i} className="flex flex-col gap-1 border-b border-gray-800/50 pb-3 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-center text-xs text-gray-500">
                                                <span>{sq.calls} calls</span>
                                                <span className="text-red-400 font-mono">{sq.avg_time_ms}ms avg</span>
                                            </div>
                                            <code className="text-xs text-gray-300 font-mono break-all line-clamp-2 bg-gray-900/50 p-2 rounded border border-gray-800/50">
                                                {sq.query}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="bg-[#16181d] border border-gray-800 rounded-xl p-5 shadow-xl">
                                <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Cache Hit Ratio</h3>
                                <div className="text-3xl font-bold flex items-baseline gap-1 mt-2 text-white">
                                    {deepMetrics.cacheHitRatio}
                                    <span className="text-sm font-normal text-gray-500">%</span>
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-1.5 mt-4 overflow-hidden">
                                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, deepMetrics.cacheHitRatio))}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-4">Buffer cache efficiency</p>
                            </div>

                            <div className="bg-[#16181d] border border-gray-800 rounded-xl p-5 shadow-xl">
                                <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Active Locks</h3>
                                <div className="flex items-center gap-3">
                                    <div className={`text-3xl font-bold ${deepMetrics.activeLocks > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {deepMetrics.activeLocks}
                                    </div>
                                    <span className="text-xs text-gray-500">Waiting/Blocked</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Correlates with latency drops</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
