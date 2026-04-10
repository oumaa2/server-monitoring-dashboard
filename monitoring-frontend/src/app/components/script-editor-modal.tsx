'use client';

import { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface ScriptEditorModalProps {
    serverId: number;
    hostname: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ScriptEditorModal({ serverId, hostname, isOpen, onClose }: ScriptEditorModalProps) {
    const [action, setAction] = useState<'start' | 'stop'>('start');
    const [content, setContent] = useState('');
    const [path, setPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadScript();
        }
    }, [isOpen, action, serverId]);

    const loadScript = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const data = await api.getScript(serverId, action);
            setContent(data.content);
            setPath(data.path);
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to load script: ' + err.message });
            setContent('');
            setPath('');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await api.saveScript(serverId, action, content);
            setMessage({ type: 'success', text: res.message });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to save script: ' + err.message });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 text-white">
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-7xl rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40 rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-600/20 rounded-xl text-blue-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Script Configuration: <span className="text-blue-400">{hostname}</span></h2>
                            <p className="text-sm text-slate-400 mt-0.5 font-medium tracking-tight">Edit service control logic via secure SSH bridge</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-500 hover:text-white transform hover:scale-110">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Sub-Header / Controls */}
                <div className="px-6 py-4 bg-slate-900/20 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-white/5">
                        <button 
                            onClick={() => setAction('start')}
                            className={`px-8 py-2 rounded-lg text-xs font-black tracking-[0.1em] transition-all ${action === 'start' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            START LOGIC
                        </button>
                        <button 
                            onClick={() => setAction('stop')}
                            className={`px-8 py-2 rounded-lg text-xs font-black tracking-[0.1em] transition-all ${action === 'stop' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            STOP LOGIC
                        </button>
                    </div>
                    {path && (
                        <div className="px-4 py-2 rounded-lg bg-black/40 border border-white/10 flex items-center gap-3">
                            <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.3em]">Remote Path:</span>
                            <span className="text-xs font-mono text-blue-400/80 font-bold">{path}</span>
                        </div>
                    )}
                </div>

                {/* Editor Content Area */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col bg-[#020617]">
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                            <div className="w-14 h-14 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Syncing with remote host...</span>
                        </div>
                    ) : (
                        <div className="relative flex-1 group">
                            <div className="absolute top-4 left-6 text-[10px] font-black text-slate-800 uppercase tracking-[0.4em] pointer-events-none select-none z-10">BASH / SHELL EDITOR</div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                spellCheck={false}
                                className="w-full h-full bg-[#020617] text-slate-300 font-mono text-[16px] leading-relaxed p-10 pt-16 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/30 focus:outline-none resize-none transition-all scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent shadow-inner"
                                placeholder="#!/bin/bash\n# Enter your service control commands here..."
                            />
                        </div>
                    )}
                </div>

                {/* Footer / Console */}
                <div className="p-6 border-t border-white/5 bg-slate-900/60 rounded-b-2xl flex items-center justify-between shrink-0">
                    <div className="flex-1 max-w-3xl mr-8">
                        {message && (
                            <div className={`text-sm px-5 py-4 rounded-xl flex items-center gap-4 animate-in slide-in-from-left duration-300 border ${
                                message.type === 'success' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.05)]'
                            }`}>
                                <span className="text-xl">{message.type === 'success' ? '✓' : '⚠'}</span>
                                <span className="font-bold tracking-tight">{message.text}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 text-xs font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.2em]"
                        >
                            DISCARD
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={loading || saving}
                            className={`px-12 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-4 shadow-2xl ${
                                saving 
                                ? 'bg-blue-600/40 cursor-wait text-white/40' 
                                : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/40 active:scale-95 text-white active:bg-blue-700'
                            }`}
                        >
                            {saving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>UPLOADING...</span>
                                </>
                            ) : (
                                <span>SAVE TO TARGET</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
