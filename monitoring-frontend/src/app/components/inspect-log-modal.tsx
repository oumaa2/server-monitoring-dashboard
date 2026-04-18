import { useState } from 'react';
import { X, Search, Terminal, FileText, AlertTriangle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

interface InspectLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverName: string;
    serverId: number;
    initialPath?: string;
}

export default function InspectLogModal({ isOpen, onClose, serverName, serverId, initialPath = '/opt/Megara/Logs' }: InspectLogModalProps) {
    const [path, setPath] = useState(initialPath);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleInspect = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await api.inspectLog(serverId, path);
            setResult(res.result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to inspect logs');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Helper to parse the custom format from backend
    const parseResult = (raw: string) => {
        const lines = raw.split('\n').map(l => l.trim());
        const file = lines.find(l => l.startsWith('FILE: '))?.replace('FILE: ', '');
        const line = lines.find(l => l.startsWith('LINE: '))?.replace('LINE: ', '');
        const msg = lines.find(l => l.startsWith('MSG: '))?.replace('MSG: ', '');
        
        const contextStart = lines.indexOf('CONTEXT_START');
        const contextEnd = lines.indexOf('CONTEXT_END');
        const context = contextStart !== -1 && contextEnd !== -1 
            ? lines.slice(contextStart + 1, contextEnd).join('\n')
            : null;

        const isSuccess = raw.includes('SUCCESS: No errors found');
        const isErrorOutput = raw.includes('ERROR:');

        return { file, line, msg, context, isSuccess, isErrorOutput };
    };

    const parsed = result ? parseResult(result) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#1c1f26] border border-gray-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/40">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-inner">
                            <Search className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-xl tracking-tight">Advanced Log Analysis</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-gray-500 text-xs">Inspecting remote session:</p>
                                <span className="text-blue-400 font-mono text-xs font-bold uppercase tracking-wider bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">{serverName}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-500 hover:text-white transition-all rounded-xl hover:bg-white/5 active:scale-95">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.03),transparent)]">
                    {/* Path Input Section */}
                    <div className="bg-black/20 border border-gray-800 p-6 rounded-2xl space-y-4">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Remote Log Folder Path</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <input 
                                    type="text" 
                                    value={path}
                                    onChange={e => setPath(e.target.value)}
                                    placeholder="/opt/app/logs"
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-300 font-mono outline-none focus:border-blue-500/50 transition-all shadow-inner"
                                />
                            </div>
                            <button 
                                onClick={handleInspect}
                                disabled={loading || !path}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                Analyze
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4">
                            <div className="relative">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                <Search className="absolute inset-0 m-auto w-5 h-5 text-blue-400 animate-pulse" />
                            </div>
                            <div className="text-center">
                                <p className="text-white text-sm font-medium">Scanning Remote Directory...</p>
                                <p className="text-gray-500 text-xs mt-1 italic">Finding latest file and analyzing tokens</p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 items-start animate-in slide-in-from-top-2">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                            <div>
                                <h4 className="text-red-400 text-sm font-bold">Inspection Failed</h4>
                                <p className="text-red-400/70 text-xs mt-1 leading-relaxed">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Result Display */}
                    {parsed && !loading && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {parsed.isSuccess ? (
                                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-4 items-center">
                                    <div className="p-2 bg-emerald-500/20 rounded-full">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-emerald-400 text-base font-bold">Safe Directory</h4>
                                        <p className="text-emerald-400/70 text-sm mt-0.5">{result}</p>
                                    </div>
                                </div>
                            ) : parsed.isErrorOutput ? (
                                <div className="p-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex gap-4 items-center">
                                    <div className="p-2 bg-orange-500/20 rounded-full">
                                        <AlertTriangle className="w-6 h-6 text-orange-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-orange-400 text-base font-bold">Scanning Limitation</h4>
                                        <p className="text-orange-400/70 text-sm mt-0.5">{result}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Primary Hit */}
                                    <div className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
                                        <div className="bg-red-500/10 px-6 py-4 border-b border-red-500/10 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                                <span className="text-xs font-black text-red-500 uppercase tracking-[0.2em]">Latest Significant Exception</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-white uppercase tracking-wider bg-red-600 px-3 py-1 rounded-full shadow-lg shadow-red-500/20 border border-red-400/20">
                                                    Line {parsed.line}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-8 space-y-5">
                                            <p className="text-red-400 font-mono text-base leading-relaxed break-words font-medium">
                                                {parsed.msg}
                                            </p>
                                            <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                                                <div className="p-1 px-2 bg-gray-800/30 rounded flex items-center gap-2 border border-white/5">
                                                    <FileText className="w-3 h-3 text-gray-500" />
                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tight">
                                                        {parsed.file}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Context Snippet */}
                                    {parsed.context && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between px-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Surrounding Stack Context</label>
                                                <span className="text-[10px] text-gray-600 font-mono">Snapshot Window: ±2 lines</span>
                                            </div>
                                            <div className="bg-[#0b0c10] border border-gray-800 rounded-2xl py-6 overflow-hidden custom-scrollbar shadow-inner group relative">
                                                <div className="overflow-x-auto px-6">
                                                    <pre className="text-xs font-mono leading-7">
                                                        {parsed.context.split('\n').map((l, i) => {
                                                            const currentLineNum = parseInt(parsed.line || '0') - 2 + i;
                                                            const isHit = l.includes(parsed.msg || '') || currentLineNum === parseInt(parsed.line || '0');
                                                            const isError = l.toUpperCase().includes('ERROR') || l.toUpperCase().includes('EXCEPTION') || l.toUpperCase().includes('SEVERE');
                                                            const isStack = l.trim().startsWith('at ') || l.includes('...');
                                                            
                                                            return (
                                                                <div 
                                                                    key={i} 
                                                                    className={`relative flex gap-6 -mx-6 px-6 py-0.5 transition-all duration-200 group/line
                                                                        ${isHit ? 'bg-red-500/20 border-l-4 border-red-500 z-10' : ''}
                                                                        ${!isHit && isError ? 'bg-red-500/5' : ''}
                                                                        ${!isHit && !isError && isStack ? 'opacity-60' : ''}
                                                                    `}
                                                                >
                                                                    {isHit && (
                                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
                                                                    )}
                                                                    <span className={`w-10 shrink-0 text-right select-none font-mono text-[10px] tabular-nums
                                                                        ${isHit ? 'text-red-400 font-black' : 'text-gray-700'}
                                                                    `}>
                                                                        {currentLineNum}
                                                                    </span>
                                                                    <span className={`font-mono text-xs whitespace-pre
                                                                        ${isHit ? 'text-white font-bold' : ''}
                                                                        ${!isHit && isError ? 'text-red-300/80' : ''}
                                                                        ${!isHit && !isError ? 'text-gray-400' : ''}
                                                                        ${isStack ? 'italic' : ''}
                                                                    `}>
                                                                        {l}
                                                                    </span>
                                                                    {isHit && (
                                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-[8px] font-black text-red-400 uppercase tracking-widest opacity-0 group-hover/line:opacity-100 transition-opacity">
                                                                            Identified Hit
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-900/40 border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-500 px-6">
                    <p>Live session over SSH</p>
                    <p className="font-mono text-blue-400/50 uppercase tracking-widest">Protocol Version 1.2</p>
                </div>
            </div>
        </div>
    );
}
