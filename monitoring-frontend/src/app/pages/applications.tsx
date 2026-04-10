import { useMemo } from 'react';
import { Coffee, Globe, AppWindow, Code2, Zap, Database } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../services/api';
import type { ApplicationItem } from '../../services/api';

function Sparkline({ color }: { color: string }) {
    const data = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
        v: 50 + Math.sin(i / 3) * 30 + Math.random() * 20
    })), []);
    return (
        <ResponsiveContainer width="100%" height={48}>
            <LineChart data={data}>
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}

const StackIcon = ({ name }: { name: string }) => {
    if (name.includes('WildFly') || name.includes('Java')) return Coffee;
    if (name.includes('Node')) return Globe;
    if (name.includes('React')) return AppWindow;
    if (name.includes('Go')) return Code2;
    if (name.includes('Postgres') || name.includes('SQL')) return Zap;
    if (name.includes('Oracle') || name.includes('XE')) return Database;
    return Zap;
};

export default function Applications() {
    const { data: apps, loading, error } = useFetch<ApplicationItem[]>(api.getApplications, [], 30000);

    if (loading && !apps) {
        return <div className="p-8 text-gray-400">Loading applications...</div>;
    }

    if (error) {
        return <div className="p-8 text-red-400">Error loading applications: {error}</div>;
    }

    const totalRequests = apps?.reduce((acc: number, app: ApplicationItem) => acc + app.rpm, 0) || 0;
    const avgResponse = apps?.length ? Math.round(apps.reduce((acc: number, app: ApplicationItem) => acc + app.responseMs, 0) / apps.length) : 0;
    const runningCount = apps?.filter((a: ApplicationItem) => a.status === 'running').length || 0;

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="text-white text-2xl font-semibold mb-1">Application Monitoring</h1>
                <p className="text-gray-400 text-sm">Track performance metrics for all running applications</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Applications', value: runningCount, sub: `${apps?.length || 0} total`, color: 'text-blue-400' },
                    { label: 'Total Throughput', value: `${(totalRequests / 60).toFixed(1)} RPS`, sub: 'Current', color: 'text-green-400' },
                    { label: 'Avg Latency', value: `${avgResponse}ms`, sub: 'Across cluster', color: 'text-yellow-400' },
                    { label: 'System Health', value: 'Optimal', sub: 'Last 24h', color: 'text-emerald-400' },
                ].map((s, i) => (
                    <div key={i} className="bg-[#16181d] border border-gray-800 rounded-xl p-5">
                        <p className="text-gray-400 text-sm mb-2">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-gray-600 text-xs mt-1">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Application Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {apps?.map(app => {
                    const Icon = StackIcon({ name: app.stack });
                    return (
                        <div key={app.id} className="bg-[#16181d] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${app.color}18` }}>
                                        <Icon className="w-5 h-5" style={{ color: app.color }} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-sm">{app.name}</h3>
                                        <p className="text-gray-500 text-xs">{app.stack}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${app.status === 'running' ? 'bg-green-500/15 text-green-400' :
                                    app.status === 'warning' ? 'bg-yellow-500/15 text-yellow-400' :
                                        'bg-red-500/15 text-red-400'
                                    }`}>
                                    {app.status}
                                </span>
                            </div>

                            <div className="space-y-2.5 mb-4">
                                {(() => {
                                    const isOracle = app.stack.toLowerCase().includes('oracle');
                                    const isPG = app.stack.toLowerCase().includes('postgres');
                                    const isDb = isOracle || isPG;
                                    
                                    const metrics = [
                                        { label: isOracle ? 'Active Sessions' : isPG ? 'Throughput (TPS)' : 'Throughput (RPM)', value: app.rpm.toLocaleString() },
                                        { label: isOracle ? 'Parse Rate' : isPG ? 'Cache Hit Ratio' : 'Avg Latency', value: isDb ? (isOracle ? `${app.responseMs}%` : `${app.responseMs}%`) : (app.responseMs ? `${app.responseMs}ms` : 'N/A') },
                                        { label: 'Error Rate', value: `${app.errorPct}%`, className: app.errorPct > 1 ? 'text-red-400' : 'text-green-400' },
                                        { label: isOracle ? 'Tablespace Size' : isPG ? 'Database Size' : 'Heap Usage', value: app.heapDisplay || 'N/A' },
                                        { label: isOracle ? 'Current Sessions' : isPG ? 'Connections' : 'Thread Pool', value: `${app.threadsActive} / ${app.threadsTotal}` },
                                    ];
                                    return metrics.map((m, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="text-gray-500 text-xs">{m.label}</span>
                                            <span className={`text-sm font-semibold ${m.className ?? 'text-white'}`}>{m.value}</span>
                                        </div>
                                    ));
                                })()}
                            </div>

                            <div className="border-t border-gray-800 pt-3">
                                <p className="text-gray-600 text-xs mb-1">Activity (last 1h)</p>
                                <Sparkline color={app.color} />
                                <div className="mt-2 h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-500"
                                        style={{
                                            width: `${app.heapUsage}%`,
                                            backgroundColor: app.heapUsage > 85 ? '#EF4444' : app.heapUsage > 60 ? '#F59E0B' : '#10B981'
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-[10px] text-gray-600">
                                        {app.stack.toLowerCase().includes('oracle') ? 'Tablespace Used' : app.stack.toLowerCase().includes('postgres') ? 'Disk allocated' : 'Heap usage'}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-medium">{app.heapUsage}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
