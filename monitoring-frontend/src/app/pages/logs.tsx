import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, ChevronRight, RefreshCw, Copy, FileText, AlertCircle, Info, Database, Layers } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { api, type LogItem, type LogResponse, type ApplicationItem } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { format } from 'date-fns';
import InspectLogModal from '../components/inspect-log-modal';
import LogServerCards from '../components/log-server-cards';

const logLevelStyles: Record<string, string> = {
    ERROR: 'bg-red-500/20 text-red-400 border-red-500/20',
    WARN: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
    INFO: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
    DEBUG: 'bg-gray-800 text-gray-400 border-gray-700',
};

export default function Logs() {
    const [searchParams] = useSearchParams();
    const [levelFilter, setLevelFilter] = useState('All Levels');
    const [serviceFilter, setServiceFilter] = useState('All Services');
    const [serverFilter, setServerFilter] = useState(searchParams.get('server') || 'All Servers');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const pageSize = 50;
    const [expanded, setExpanded] = useState<number | null>(null);
    const [inspectServer, setInspectServer] = useState<{ id: number, name: string } | null>(null);

    const { data: response, loading, refetch } = useFetch<LogResponse>(
        () => api.getLogs(levelFilter, serviceFilter, serverFilter, search, page, pageSize), 
        [levelFilter, serviceFilter, serverFilter, search, page], 
        { refreshMs: 15_000 }
    );

    const { data: apps } = useFetch<ApplicationItem[]>(api.getApplications, [], { refreshMs: 60_000 });
    const services = useMemo(() => 
        ['All Services', ...Array.from(new Set(apps?.map(a => a.name) || []))], 
        [apps]);
    
    const { data: serverSummary } = useFetch<any[]>(() => api.getSummary(), [], { refreshMs: 60_000 });
    const servers = useMemo(() => 
        ['All Servers', ...Array.from(new Set(serverSummary?.map(s => s.name) || []))], 
    [serverSummary]);
    const { data: rawServers } = useFetch<any[]>(api.getServers, [], { refreshMs: 60_000 });
    const levels = ['All Levels', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

    // Logs are now filtered server-side
    const logs = response?.logs ?? [];
    const totalItems = response?.total ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    const stats = useMemo(() => ({
        total: totalItems,
        errors: response?.logs?.filter(l => l.level === 'ERROR').length || 0, // This is local to the page, but good for quick view
        warnings: response?.logs?.filter(l => l.level === 'WARN').length || 0,
        info: response?.logs?.filter(l => l.level === 'INFO').length || 0,
        lastUpdate: format(new Date(), 'HH:mm:ss')
    }), [response, totalItems]);

    const copyToClipboard = (log: LogItem) => {
        const text = `[${log.level}] ${log.timestamp} | ${log.service} | ${log.serverName}\n${log.message}\n${log.details || ''}`;
        navigator.clipboard.writeText(text);
    };

    const clearFilters = () => {
        setLevelFilter('All Levels');
        setServiceFilter('All Services');
        setServerFilter('All Servers');
        setSearch('');
    };

    const handleServerClick = (serverName: string) => {
        const s = rawServers?.find(srv => srv.hostname === serverName);
        if (s) {
            setInspectServer({ id: s.id, name: s.hostname });
        }
    };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-white text-2xl font-semibold mb-1">System Logs</h1>
                    <p className="text-gray-400 text-sm">Real-time log aggregation across infrastructure</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={refetch}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-all text-sm font-medium border border-gray-700">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-lg shadow-blue-600/20">
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {/* Active Server Selection Cards */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Direct Physical Inspection</h2>
                    <span className="text-gray-600 text-[10px] font-medium italic">Click a server card to analyze live log files via SSH</span>
                </div>
                <LogServerCards 
                    servers={serverSummary || []} 
                    loading={!serverSummary && loading}
                    onInspect={(id, name) => setInspectServer({ id, name })}
                />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Total Logs', value: stats.total, Icon: FileText, color: 'text-white' },
                    { label: 'Errors', value: stats.errors, Icon: AlertCircle, color: 'text-red-400' },
                    { label: 'Warnings', value: stats.warnings, Icon: AlertCircle, color: 'text-yellow-400' },
                    { label: 'Info', value: stats.info, Icon: Info, color: 'text-blue-400' },
                    { label: 'Last Sync', value: stats.lastUpdate, Icon: RefreshCw, color: 'text-gray-400' },
                ].map((s, i) => (
                    <div key={i} className="bg-[#16181d] border border-gray-800/50 rounded-xl p-4 shadow-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <s.Icon className={`w-3.5 h-3.5 ${s.color}`} />
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">{s.label}</span>
                        </div>
                        <p className={`text-xl font-bold ${s.color}`}>{loading && i < 4 ? '…' : s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filtering System */}
            <div className="flex flex-wrap items-center gap-3 bg-[#16181d] border border-gray-800 p-3 rounded-2xl shadow-xl">
                <div className="relative min-w-[140px]">
                    <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50 appearance-none pr-8">
                        {levels.map(l => <option key={l}>{l}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative min-w-[160px]">
                    <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-8 pr-8 py-2 text-sm text-white outline-none focus:border-blue-500/50 appearance-none">
                        {services.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative min-w-[180px]">
                    <Database className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <select value={serverFilter} onChange={e => setServerFilter(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-8 pr-8 py-2 text-sm text-white outline-none focus:border-blue-500/50 appearance-none">
                        {servers.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                        placeholder="Search message or details..."
                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-blue-500/50" />
                </div>
            </div>

            {/* Log List */}
            <div className="bg-[#0d0e12] border border-gray-800/50 rounded-2xl overflow-hidden shadow-2xl">
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                    {loading && logs.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center opacity-50">
                            <RefreshCw className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                            <p className="text-gray-400">Fetching latest logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-24 text-center">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                            <h3 className="text-white text-lg font-medium mb-1">No Logs Found</h3>
                            <p className="text-gray-500 text-sm mb-4">Try adjusting your filters or search query.</p>
                            <button onClick={clearFilters} className="text-blue-500 text-sm font-semibold hover:underline">Clear all filters</button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800/40">
                            {logs.map(log => (
                                <div key={log.id} className="hover:bg-gray-800/10 transition-colors group">
                                    <div className="flex items-start gap-4 p-4">
                                        <div className="w-32 shrink-0 pt-0.5">
                                            <p className="font-mono text-[10px] text-gray-500">{log.timestamp}</p>
                                        </div>
                                        <div className="w-16 shrink-0">
                                            <span className={`inline-block w-full text-center py-0.5 rounded text-[10px] font-bold border ${logLevelStyles[log.level]}`}>
                                                {log.level}
                                            </span>
                                        </div>
                                        <div className="w-32 shrink-0 overflow-hidden text-ellipsis">
                                            <span className="text-[10px] text-gray-400 bg-gray-800/50 px-2 py-0.5 rounded font-mono">
                                                {log.service}
                                            </span>
                                        </div>
                                        <div className="w-32 shrink-0 hidden md:block">
                                            <button 
                                                onClick={() => handleServerClick(log.serverName)}
                                                className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline transition-colors decoration-blue-400/30"
                                            >
                                                {log.serverName}
                                            </button>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-300 font-mono break-words">{log.message}</p>
                                            {log.details && <p className="text-xs text-gray-600 mt-1">{log.details}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => copyToClipboard(log)} title="Copy log"
                                                className="p-1.5 text-gray-500 hover:text-white transition-colors">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            {log.stackTrace && (
                                                <button onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                                    className={`p-1.5 transition-colors ${expanded === log.id ? 'text-blue-400' : 'text-gray-500 hover:text-white'}`}>
                                                    <ChevronRight className={`w-4 h-4 transition-transform ${expanded === log.id ? 'rotate-90' : ''}`} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {log.stackTrace && expanded === log.id && (
                                        <div className="px-4 pb-4 pt-0">
                                            <div className="bg-black/40 border border-red-900/20 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                                                <p className="text-red-400/80 mb-2 font-bold uppercase tracking-widest text-[10px]">Stack Trace</p>
                                                <pre className="text-red-400/60 leading-relaxed whitespace-pre">{log.stackTrace}</pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-[#16181d] border border-gray-800 p-4 rounded-2xl shadow-xl">
                    <div className="text-sm text-gray-500">
                        Showing <span className="text-white font-medium">{page * pageSize + 1}</span> to <span className="text-white font-medium">{Math.min((page + 1) * pageSize, totalItems)}</span> of <span className="text-white font-medium">{totalItems}</span> logs
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={page === 0 || loading}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <div className="flex items-center gap-1">
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                // Simple windowing: if totalPages > 5, show first 5 for now
                                // In a real app we'd do better windowing
                                return (
                                    <button 
                                        key={i}
                                        onClick={() => setPage(i)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === i ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-500 hover:text-white hover:bg-gray-800'}`}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && <span className="text-gray-600 px-1">...</span>}
                        </div>
                        <button 
                            disabled={page >= totalPages - 1 || loading}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {inspectServer && (
                <InspectLogModal 
                    isOpen={!!inspectServer}
                    onClose={() => setInspectServer(null)}
                    serverName={inspectServer.name}
                    serverId={inspectServer.id}
                />
            )}
        </div>
    );
}
