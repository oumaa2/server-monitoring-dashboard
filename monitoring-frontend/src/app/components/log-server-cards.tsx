import { Activity, ChevronRight, Monitor } from 'lucide-react';

interface LogServerCardsProps {
    servers: any[];
    loading?: boolean;
    onInspect: (serverId: number, serverName: string) => void;
}

export default function LogServerCards({ servers, loading, onInspect }: LogServerCardsProps) {
    if (loading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="min-w-[200px] bg-gray-800/20 border border-gray-800 rounded-2xl p-4 animate-pulse">
                        <div className="w-10 h-10 bg-gray-800 rounded-lg mb-3" />
                        <div className="h-4 bg-gray-800 rounded w-2/3 mb-2" />
                        <div className="h-3 bg-gray-800 rounded w-1/3" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 mb-2 custom-scrollbar snap-x">
            {servers.map((server) => (
                <div 
                    key={server.id}
                    onClick={() => onInspect(server.id, server.name)}
                    className="group min-w-[220px] bg-[#16181d] border border-gray-800/50 hover:border-blue-500/50 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 snap-start relative overflow-hidden"
                >
                    {/* Background Accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors" />
                    
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-2 rounded-xl border ${server.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            {server.status === 'online' ? (
                                <Activity className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <Monitor className="w-5 h-5 text-red-500" />
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
                                {server.status}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-white font-bold tracking-tight group-hover:text-blue-400 transition-colors uppercase">
                            {server.name}
                        </h3>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                            {server.role}
                        </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-600">{server.ip}</span>
                        <div className="flex items-center gap-1 text-blue-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                            <span className="text-[9px] font-bold uppercase tracking-tighter">Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
