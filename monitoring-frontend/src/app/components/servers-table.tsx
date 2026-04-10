import React, { useState, useMemo, memo } from 'react';
import { Server, Activity, RefreshCw, Database, Shield, Globe, Trash2, Code, Play, Square } from 'lucide-react';
import { api } from '../../services/api';
import type { ServerSummary, ProcessInfo } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import ScriptEditorModal from './script-editor-modal';
import ServerFormModal from './server-form-modal';

function ProgressBar({ value, color }: { value: number; color: string }) {
    return (
        <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.min(value, 100)}%` }} />
            </div>
            <span className="text-xs text-gray-400 font-medium w-10 text-right">{value?.toFixed(1) ?? 0}%</span>
        </div>
    );
}

function Skeleton() {
    return (
        <div className="animate-pulse space-y-2 px-6 py-4">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                    <div className="h-4 bg-gray-800 rounded w-32" />
                    <div className="h-4 bg-gray-800 rounded w-20" />
                    <div className="h-4 bg-gray-800 rounded flex-1" />
                    <div className="h-4 bg-gray-800 rounded w-24" />
                </div>
            ))}
        </div>
    );
}

// Optimization: Memoized Row to prevent typing lag
const ServerRow = memo(({ 
    server, 
    isOnline, 
    role, 
    stack, 
    pendingActions, 
    expandedServerIp,
    handleStart, 
    handleStop, 
    toggleProcesses, 
    setScriptModal, 
    handleEdit, 
    handleDelete,
    minimal 
}: any) => (
    <tr className="hover:bg-gray-800/20 transition-all group">
        <td className="px-6 py-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-all duration-300 ${isOnline ? 'bg-gray-800 group-hover:bg-blue-600/20 text-blue-400' : 'bg-gray-900 text-gray-600'}`}>
                    {role.includes('database') || role.includes('oracle') || role.includes('postgres') ? <Database className="w-4 h-4" /> :
                    role.includes('web') || role.includes('wildfly') ? <Globe className="w-4 h-4" /> :
                    role.includes('monitoring') ? <Shield className="w-4 h-4" /> :
                    <Server className="w-4 h-4" />}
                </div>
                <div>
                    <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">{server.name}</div>
                    <div className="text-[10px] text-gray-600 font-mono tracking-tight">{server.ip}</div>
                </div>
            </div>
        </td>
        <td className="px-6 py-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-800 px-2 py-1 rounded border border-gray-700">{server.role || 'Node'}</span>
        </td>
        <td className="px-6 py-4">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-blue-500/80 uppercase tracking-tighter">Stack Identity</span>
                <span className="text-xs text-white font-semibold">{stack}</span>
            </div>
        </td>
        <td className="px-6 py-4">
            <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                isOnline 
                ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.05)]' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
                {server.status}
            </div>
        </td>
        <td className="px-6 py-4">
            <div className="space-y-2">
                <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                        <span>CPU: {server.cpu}%</span>
                        <span>MEM: {server.memory}%</span>
                    </div>
                    <div className="flex gap-1">
                        <ProgressBar value={server.cpu} color={server.cpu > 85 ? 'bg-red-500' : server.cpu > 60 ? 'bg-amber-500' : 'bg-blue-500'} />
                        <ProgressBar value={server.memory} color={server.memory > 85 ? 'bg-red-500' : server.memory > 70 ? 'bg-purple-500' : 'bg-indigo-500'} />
                    </div>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-gray-800/40 pt-1">
                    <div className="flex-1 space-y-1">
                        <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Disk: {server.disk}%</div>
                        <ProgressBar value={server.disk} color={server.disk > 90 ? 'bg-red-600' : 'bg-gray-700'} />
                    </div>
                    <div className="text-right">
                        <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">IO/Traffic</div>
                        <div className="text-[10px] font-mono text-blue-400/80 font-bold whitespace-nowrap">{server.network || '0 B/s'}</div>
                    </div>
                </div>
            </div>
        </td>
        {!minimal && (
            <td className="px-6 py-4">
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => handleStart((server as any).id)}
                        disabled={pendingActions[(server as any).id]}
                        className={`p-1.5 rounded-lg transition-all ${pendingActions[(server as any).id] ? 'bg-gray-800 opacity-50 cursor-wait' : 'bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white shadow-sm'}`}
                        title="Start Service"
                    >
                        <Play className={`w-3.5 h-3.5 ${pendingActions[(server as any).id] ? 'animate-pulse' : ''}`} />
                    </button>
                    <button 
                        onClick={() => handleStop((server as any).id)}
                        disabled={pendingActions[(server as any).id]}
                        className={`p-1.5 rounded-lg transition-all ${pendingActions[(server as any).id] ? 'bg-gray-800 opacity-50 cursor-wait' : 'bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white shadow-sm'}`}
                        title="Stop Service"
                    >
                        <Square className={`w-3.5 h-3.5 ${pendingActions[(server as any).id] ? 'animate-pulse' : ''}`} />
                    </button>
                    
                    <div className="w-px h-4 bg-gray-800 mx-1" />

                    <button 
                        onClick={() => toggleProcesses(server.ip)}
                        className={`p-1.5 rounded-lg transition-all ${expandedServerIp === server.ip ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        title="Remote Top"
                    >
                        <Activity className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setScriptModal({ isOpen: true, serverId: (server as any).id, hostname: server.name })}
                        className="p-1.5 bg-gray-800 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                        title="Edit Logic"
                    >
                        <Code className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleEdit(server.ip)}
                        className="p-1.5 bg-gray-800 text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all"
                        title="Modify Node"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button 
                        onClick={() => handleDelete(server.ip)}
                        className="p-1.5 bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Uproot Node"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        )}
    </tr>
));

export default function ServersTable({ searchQuery = '', minimal = false }: { searchQuery?: string; minimal?: boolean }) {
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [selectedServerData, setSelectedServerData] = useState<any>(null);
    const [expandedServerIp, setExpandedServerIp] = useState<string | null>(null);
    const [processesMap, setProcessesMap] = useState<Record<string, ProcessInfo[]>>({});
    const [pendingActions, setPendingActions] = useState<Record<number, boolean>>({});
    const [scriptModal, setScriptModal] = useState<{ isOpen: boolean, serverId: number, hostname: string }>({
        isOpen: false,
        serverId: 0,
        hostname: ''
    });

    const { data: servers, loading, error, refetch } = useFetch<ServerSummary[]>(
        () => api.getSummary(),
        [],
        { refreshMs: 30_000, paused: showModal || scriptModal.isOpen }
    );

    const toggleProcesses = async (ip: string) => {
        if (expandedServerIp === ip) {
            setExpandedServerIp(null);
            return;
        }
        setExpandedServerIp(ip);
        if (!processesMap[ip]) {
            try {
                const procs = await api.getProcesses(ip);
                setProcessesMap(prev => ({ ...prev, [ip]: procs }));
            } catch (e) {
                console.error('Failed to get processes', e);
            }
        }
    };

    const handleEdit = async (ip: string) => {
        try {
            const rawServers = await api.getServers();
            const server = rawServers.find(s => s.ipAddress === ip);
            if (server) {
                setEditingId(server.id);
                setSelectedServerData(server);
                setShowModal(true);
            }
        } catch (e) {
            alert('Failed to load server details');
        }
    };

    const handleDelete = async (ip: string) => {
        if (!confirm(`Are you sure you want to remove ${ip}?`)) return;
        try {
            const rawServers = await api.getServers();
            const server = rawServers.find(s => s.ipAddress === ip);
            if (server) {
                await api.deleteServer(server.id);
                refetch();
            }
        } catch (e) {
            alert('Delete failed');
        }
    };

    const handleStart = async (id: number) => {
        setPendingActions(prev => ({ ...prev, [id]: true }));
        try {
            const res = await api.startServer(id);
            alert(`[Action Submitted]\nAPI: ${res.message || 'Service starting...'}\n\n[Terminal Output]\n${res.output || 'No output recorded.'}`);
        } catch (err: any) {
            alert(`Start failed: ${err.message}`);
        } finally {
            setPendingActions(prev => ({ ...prev, [id]: false }));
        }
    };

    const handleStop = async (id: number) => {
        if (!confirm('Are you sure you want to stop this service?')) return;
        setPendingActions(prev => ({ ...prev, [id]: true }));
        try {
            const res = await api.stopServer(id);
            alert(`[Action Submitted]\nAPI: ${res.message || 'Service stopping...'}\n\n[Terminal Output]\n${res.output || 'No output recorded.'}`);
        } catch (err: any) {
            alert(`Stop failed: ${err.message}`);
        } finally {
            setPendingActions(prev => ({ ...prev, [id]: false }));
        }
    };

    const filteredServers = useMemo(() => 
        (servers ?? []).filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.ip.includes(searchQuery) ||
            s.role?.toLowerCase().includes(searchQuery.toLowerCase())
        ), [servers, searchQuery]
    );

    return (
        <div className="bg-[#16181d] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-800/20">
                <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">Infrastructure Nodes</h3>
                    {!loading && servers && (
                        <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{filteredServers.length} active</span>
                    )}
                </div>
                {!minimal && (
                    <div className="flex items-center gap-2">
                        <button onClick={refetch} className="p-1.5 text-gray-400 hover:text-white transition-colors bg-gray-800 rounded-lg border border-gray-700">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                            onClick={() => {
                                setEditingId(null);
                                setSelectedServerData(null);
                                setShowModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            Integrate Node
                        </button>
                    </div>
                )}
            </div>

            {loading && <Skeleton />}
            {error && (
                <div className="p-8 text-center bg-red-500/5 m-4 rounded-xl border border-red-500/10 text-red-400 text-sm font-medium">Monitoring Link Offline: {error}</div>
            )}

            {!loading && !error && servers && (
                <div className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-gray-800/40 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                                    <th className="px-6 py-4 w-[200px]">Node Explorer</th>
                                    <th className="px-6 py-4 w-[120px]">Role</th>
                                    <th className="px-6 py-4 w-[140px]">Stack Identity</th>
                                    <th className="px-6 py-4 w-[120px]">Status</th>
                                    <th className="px-6 py-4 w-[300px]">Live Telemetry</th>
                                    {!minimal && <th className="px-6 py-4 w-[150px]">Automation</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {filteredServers.map((server, i) => {
                                    const isOnline = server.status === 'online';
                                    const role = server.role?.toLowerCase() || '';
                                    const stack = (server as any).serviceName || (server as any).stack || 'Standard';
                                    
                                    return (
                                        <React.Fragment key={`${server.name}-${i}`}>
                                            <ServerRow 
                                                server={server}
                                                isOnline={isOnline}
                                                role={role}
                                                stack={stack}
                                                pendingActions={pendingActions}
                                                expandedServerIp={expandedServerIp}
                                                handleStart={handleStart}
                                                handleStop={handleStop}
                                                toggleProcesses={toggleProcesses}
                                                setScriptModal={setScriptModal}
                                                handleEdit={handleEdit}
                                                handleDelete={handleDelete}
                                                minimal={minimal}
                                            />
                                            {expandedServerIp === server.ip && (
                                                <tr className="bg-gray-950/40">
                                                    <td colSpan={minimal ? 5 : 6} className="px-6 py-6 ring-1 ring-inset ring-gray-800">
                                                        <div className="pl-12">
                                                            <h4 className="text-[10px] font-black text-gray-500 mb-3 flex items-center gap-3 uppercase tracking-[0.3em]">
                                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                                                                Remote Telemetry: Top Processes
                                                            </h4>
                                                            {!processesMap[server.ip] ? (
                                                                <div className="text-xs text-blue-400 animate-pulse bg-blue-500/10 inline-block px-3 py-1 rounded">Polling processes via SSH...</div>
                                                            ) : processesMap[server.ip].length === 0 ? (
                                                                <div className="text-xs text-gray-500 bg-gray-800/20 inline-block px-3 py-1 rounded">No processes found or SSH unavailable.</div>
                                                            ) : (
                                                                <div className="bg-[#16181d]/50 rounded-lg p-2 max-w-2xl border border-gray-800/50 shadow-inner overflow-hidden">
                                                                    <table className="w-full text-left text-[11px]">
                                                                        <thead>
                                                                            <tr className="text-gray-600 uppercase tracking-widest text-[9px]">
                                                                                <th className="font-bold pb-2 pl-3 w-16">PID</th>
                                                                                <th className="font-bold pb-2 w-20">USER</th>
                                                                                <th className="font-bold pb-2 w-16 text-blue-400">CPU%</th>
                                                                                <th className="font-bold pb-2 w-16 text-purple-400">MEM%</th>
                                                                                <th className="font-bold pb-2 pr-3">EXECUTABLE</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-800/50 text-gray-300 font-mono">
                                                                            {processesMap[server.ip].map(proc => (
                                                                                <tr key={proc.pid} className="hover:bg-gray-800/40 transition-colors group/row">
                                                                                    <td className="py-2 pl-3 text-gray-500">{proc.pid}</td>
                                                                                    <td className="py-2 text-gray-400 font-bold">{proc.user}</td>
                                                                                    <td className="py-2 text-blue-400 font-black">{proc.cpu}%</td>
                                                                                    <td className="py-2 text-purple-400 font-black">{proc.mem}%</td>
                                                                                    <td className="py-2 pr-3 text-gray-400 truncate max-w-[200px]" title={proc.command}>{proc.command}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ServerFormModal 
                isOpen={showModal}
                editingId={editingId}
                initialData={selectedServerData}
                onClose={() => setShowModal(false)}
                onSuccess={() => refetch()}
            />

            <ScriptEditorModal 
                isOpen={scriptModal.isOpen}
                serverId={scriptModal.serverId}
                hostname={scriptModal.hostname}
                onClose={() => setScriptModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
