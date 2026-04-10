import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import type { ServerSummary } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import ServersTable from '../components/servers-table';

export default function Servers() {
    const [search, setSearch] = useState('');
    
    const { data: servers, loading, refetch } = useFetch<ServerSummary[]>(
        () => api.getSummary(),
        [],
        { refreshMs: 30_000 }
    );

    const { data: cpuHistory } = useFetch(
        () => api.getHistory('cpu', '24h', '15m'), [], { refreshMs: 60_000 }
    );

    const cpuTrend = useMemo(() => {
        const raw = (cpuHistory as any)?.data?.result?.[0]?.values as Array<[number, string]> | undefined;
        if (!raw) return [];
        return raw.map(([ts, v]) => ({
            id: `t-${ts}`,
            time: new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            cpu: parseFloat(parseFloat(v).toFixed(2)),
        }));
    }, [cpuHistory]);

    const online = (servers ?? []).filter(s => s.status === 'online').length;
    const total = servers?.length ?? 0;
    const avgCpu = total > 0
        ? ((servers ?? []).reduce((a, s) => a + s.cpu, 0) / total)
        : 0;
    const avgMem = total > 0
        ? ((servers ?? []).reduce((a, s) => a + s.memory, 0) / total)
        : 0;

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-white text-2xl font-semibold mb-1">Infrastructure Hub</h1>
                    <p className="text-gray-400 text-sm font-mono uppercase tracking-widest text-[10px]">Mission Control & Asset Management</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={refetch}
                        className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all border border-gray-700"
                        title="Global Refresh">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                        <input 
                            type="text" 
                            value={search} 
                            onChange={e => setSearch(e.target.value)}
                            placeholder="FILTER NODES..."
                            className="bg-gray-900/50 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder-gray-700 tracking-widest"
                        />
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'NODES', value: loading ? '…' : String(total), sub: 'Global Assets', color: 'text-blue-400', bg: 'bg-blue-500/5' },
                    { label: 'ACTIVE', value: loading ? '…' : String(online), sub: 'Pulse Online', color: 'text-green-400', bg: 'bg-green-500/5' },
                    { label: 'AVG LOAD', value: loading ? '…' : `${avgCpu.toFixed(1)}%`, sub: 'CPU Usage', color: 'text-yellow-400', bg: 'bg-yellow-500/5' },
                    { label: 'MEM LOAD', value: loading ? '…' : `${avgMem.toFixed(1)}%`, sub: 'Memory Usage', color: 'text-purple-400', bg: 'bg-purple-500/5' },
                ].map((s, i) => (
                    <div key={i} className={`${s.bg} border border-gray-800/50 rounded-xl p-5 group hover:border-blue-500/20 transition-all`}>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-gray-600 text-[10px] mt-1 font-mono uppercase truncate">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Performance Chart */}
            <div className="bg-[#16181d] border border-gray-800 rounded-xl p-6 shadow-xl relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600/50" />
                <div className="flex items-center gap-2 mb-6 group relative">
                    <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3 text-blue-400" />
                        Infrastructure Load History (24H)
                    </h3>
                    <div className="relative inline-block cursor-help group/tooltip">
                        <Info className="w-3 h-3 text-gray-500 hover:text-blue-400 transition-colors" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-72 p-3 bg-[#111827] border border-gray-700 rounded shadow-2xl text-[10px] leading-relaxed text-gray-300 z-50 pointer-events-none after:content-[''] after:absolute after:top-full after:left-3 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-[#111827] animate-in fade-in zoom-in duration-150 font-normal normal-case tracking-normal">
                            Time-series aggregation of CPU/Memory trends over a 24-hour window. Essential for capacity planning and detecting cyclical workload patterns.
                        </div>
                    </div>
                </div>
                {cpuTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={cpuTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.2} vertical={false} />
                            <XAxis dataKey="time" stroke="#4b5563" tick={{ fontSize: 9, fontWeight: 'bold' }} interval={Math.floor(cpuTrend.length / 8)} axisLine={false} tickLine={false} />
                            <YAxis stroke="#4b5563" tick={{ fontSize: 9, fontWeight: 'bold' }} unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                            <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={3} dot={false} name="LOAD" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[140px] animate-pulse bg-gray-800/20 rounded-lg flex items-center justify-center text-[10px] text-gray-700 tracking-widest uppercase font-bold">Connecting to Telemetry...</div>
                )}
            </div>

            {/* Deep Polish ServersTable */}
            <ServersTable searchQuery={search} />
        </div>
    );
}

function Activity(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}
