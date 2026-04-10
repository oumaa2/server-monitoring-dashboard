import React, { useState, useEffect, memo, useCallback } from 'react';
import { Shield, RefreshCw, X } from 'lucide-react';
import { api } from '../../services/api';

interface ServerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any | null;
    editingId?: number | null;
}

const DEFAULT_FORM_STATE = {
    hostname: '',
    ipAddress: '',
    role: 'database',
    logPath: '',
    serviceName: 'postgres',
    description: '',
    startScriptPath: '',
    stopScriptPath: '',
    sshUsername: '',
    sshPassword: '',
    sshPort: 22,
    protocol: 'ssh'
};

// ---------------------------------------------------------------------------
// MEMOIZED SECTIONS TO PREVENT TYPING LAG
// ---------------------------------------------------------------------------

const IdentitySection = memo(({ data, onChange }: any) => {
    const [localHostname, setLocalHostname] = useState(data.hostname);
    const [localIp, setLocalIp] = useState(data.ipAddress);

    useEffect(() => { setLocalHostname(data.hostname); }, [data.hostname]);
    useEffect(() => { setLocalIp(data.ipAddress); }, [data.ipAddress]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="h-[2px] bg-gradient-to-r from-blue-600 to-transparent flex-1" />
                <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em]">Node Identity</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Universal Hostname</label>
                    <input 
                        type="text" required
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={localHostname}
                        onChange={e => setLocalHostname(e.target.value)}
                        onBlur={() => onChange('hostname', localHostname)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500/40 outline-none transition-all placeholder:text-slate-800 font-bold"
                        placeholder="node-alpha-01"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Network Address (IP)</label>
                    <input 
                        type="text" required
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={localIp}
                        onChange={e => setLocalIp(e.target.value)}
                        onBlur={() => onChange('ipAddress', localIp)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-blue-400 focus:ring-2 focus:ring-blue-500/40 outline-none transition-all placeholder:text-slate-800 font-mono font-bold"
                        placeholder="192.168.1.100"
                    />
                </div>
            </div>
        </div>
    );
});

const SecuritySection = memo(({ data, onChange, showCustomProtocol, setShowCustomProtocol }: any) => {
    const [localPort, setLocalPort] = useState(data.sshPort);
    const [localUser, setLocalUser] = useState(data.sshUsername);
    const [localPass, setLocalPass] = useState(data.sshPassword);

    useEffect(() => { setLocalPort(data.sshPort); }, [data.sshPort]);
    useEffect(() => { setLocalUser(data.sshUsername); }, [data.sshUsername]);
    useEffect(() => { setLocalPass(data.sshPassword); }, [data.sshPassword]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="h-[2px] bg-gradient-to-r from-blue-600 to-transparent flex-1" />
                <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em]">Security Matrix</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">SSH Port</label>
                    <input 
                        type="number"
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={localPort}
                        onChange={e => setLocalPort(parseInt(e.target.value) || 22)}
                        onBlur={() => onChange('sshPort', localPort)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500/40 outline-none transition-all font-bold"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Protocol Stack</label>
                    <select 
                        value={showCustomProtocol ? 'custom' : data.protocol}
                        onChange={e => {
                            if (e.target.value === 'custom') setShowCustomProtocol(true);
                            else { 
                                setShowCustomProtocol(false); 
                                onChange('protocol', e.target.value); 
                            }
                        }}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-blue-400 focus:ring-2 focus:ring-blue-500/40 outline-none transition-all font-bold appearance-none"
                    >
                        <option value="ssh">SSH (Standard)</option>
                        <option value="sftp">SFTP</option>
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                        <option value="custom">-- CUSTOM --</option>
                    </select>
                </div>
            </div>

            {showCustomProtocol && (
                <div className="animate-in slide-in-from-top-4 duration-500 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20">
                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] ml-1 mb-2 block">Specify Manual Protocol</label>
                    <input 
                        type="text"
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={data.protocol}
                        onChange={e => onChange('protocol', e.target.value)}
                        className="w-full bg-slate-950/50 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-400 highlight-none outline-none font-bold"
                        placeholder="gRPC / WebSocket"
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">OS Username</label>
                    <input 
                        type="text"
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={localUser}
                        onChange={e => setLocalUser(e.target.value)}
                        onBlur={() => onChange('sshUsername', localUser)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500/40 transition-all font-bold"
                        placeholder="pfeadmin"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Access Token (Secret)</label>
                    <input 
                        type="password"
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={localPass}
                        onChange={e => setLocalPass(e.target.value)}
                        onBlur={() => onChange('sshPassword', localPass)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500/40 transition-all font-bold"
                        placeholder="••••••••"
                    />
                </div>
            </div>
        </div>
    );
});

const OrgSection = memo(({ data, onChange }: any) => (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <div className="h-[2px] bg-gradient-to-r from-blue-600 to-transparent flex-1" />
            <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em]">Organization</span>
        </div>
        <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Primary Logic Role</label>
                <select 
                    value={data.role}
                    onChange={e => onChange('role', e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-bold appearance-none"
                >
                    <option value="monitoring">Monitoring Hub</option>
                    <option value="database">Core Database</option>
                    <option value="web server">App/Web Server</option>
                    <option value="node">Infrastructure Node</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Target Engine Stack</label>
                <select 
                    value={data.serviceName}
                    onChange={e => onChange('serviceName', e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-blue-400 font-bold appearance-none"
                >
                    <option value="prometheus">Prometheus Suite</option>
                    <option value="postgres">PostgreSQL Core</option>
                    <option value="oracle">Oracle Database</option>
                    <option value="wildfly">WildFly Runtime</option>
                    <option value="node_exporter">Standard Linux</option>
                </select>
            </div>
        </div>
    </div>
));

const AutomationSection = memo(({ data, onChange }: any) => {
    const [localStart, setLocalStart] = useState(data.startScriptPath);
    const [localStop, setLocalStop] = useState(data.stopScriptPath);
    const [localLog, setLocalLog] = useState(data.logPath);

    useEffect(() => { setLocalStart(data.startScriptPath); }, [data.startScriptPath]);
    useEffect(() => { setLocalStop(data.stopScriptPath); }, [data.stopScriptPath]);
    useEffect(() => { setLocalLog(data.logPath); }, [data.logPath]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="h-[2px] bg-gradient-to-r from-purple-600 to-transparent flex-1" />
                <span className="text-[11px] font-black text-purple-500 uppercase tracking-[0.4em]">Automation Guards</span>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Remote Start Script</label>
                    <input 
                        type="text"
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={localStart}
                        onChange={e => setLocalStart(e.target.value)}
                        onBlur={() => onChange('startScriptPath', localStart)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-xs text-slate-300 font-mono focus:ring-2 focus:ring-purple-500/40 transition-all font-bold"
                        placeholder="/opt/monitoring/scripts/start.sh"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Remote Kill Script</label>
                    <input 
                        type="text"
                        autoComplete="new-password"
                        data-lpignore="true"
                        value={localStop}
                        onChange={e => setLocalStop(e.target.value)}
                        onBlur={() => onChange('stopScriptPath', localStop)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-xs text-slate-300 font-mono focus:ring-2 focus:ring-purple-500/40 transition-all font-bold"
                        placeholder="/opt/monitoring/scripts/stop.sh"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Intelligence Log Feed</label>
                <input 
                    type="text"
                    autoComplete="new-password"
                    data-lpignore="true"
                    value={localLog}
                    onChange={e => setLocalLog(e.target.value)}
                    onBlur={() => onChange('logPath', localLog)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-xs text-slate-300 font-mono focus:ring-2 focus:ring-purple-500/40 transition-all font-bold"
                    placeholder="/var/log/oracle/current.log"
                />
            </div>
        </div>
    );
});

const MetadataSection = memo(({ data, onChange }: any) => {
    const [localDesc, setLocalDesc] = useState(data.description);

    useEffect(() => { setLocalDesc(data.description); }, [data.description]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="h-[2px] bg-gradient-to-r from-purple-600 to-transparent flex-1" />
                <span className="text-[11px] font-black text-purple-500 uppercase tracking-[0.4em]">Administrative Brief</span>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Strategy Description</label>
                <textarea 
                    rows={4}
                    autoComplete="off"
                    data-lpignore="true"
                    value={localDesc}
                    onChange={e => setLocalDesc(e.target.value)}
                    onBlur={() => onChange('description', localDesc)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-purple-500/40 outline-none font-bold resize-none transition-all placeholder:text-slate-800"
                    placeholder="Describe the purpose of this node within the regional cluster..."
                />
            </div>
        </div>
    );
});

// ---------------------------------------------------------------------------
// MAIN MODAL COMPONENT
// ---------------------------------------------------------------------------

export default function ServerFormModal({ isOpen, onClose, onSuccess, initialData, editingId }: ServerFormModalProps) {
    const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
    const [isSaving, setIsSaving] = useState(false);
    const [showCustomProtocol, setShowCustomProtocol] = useState(false);
    const [formTab, setFormTab] = useState<'basic' | 'adv'>('basic');

    // Populate data when editing
    useEffect(() => {
        if (isOpen) {
            if (editingId && initialData) {
                setFormData({
                    hostname: initialData.hostname || '',
                    ipAddress: initialData.ipAddress || '',
                    role: initialData.role || 'database',
                    logPath: initialData.logPath || '',
                    serviceName: initialData.serviceName || 'postgres',
                    description: initialData.description || '',
                    startScriptPath: initialData.startScriptPath || '',
                    stopScriptPath: initialData.stopScriptPath || '',
                    sshUsername: initialData.sshUsername || '',
                    sshPassword: initialData.sshPassword || '',
                    sshPort: initialData.sshPort || 22,
                    protocol: initialData.protocol || 'ssh'
                });
                setShowCustomProtocol(!['ssh', 'sftp', 'http', 'https'].includes(initialData.protocol || 'ssh'));
            } else {
                setFormData(DEFAULT_FORM_STATE);
                setShowCustomProtocol(false);
            }
            setFormTab('basic');
        }
    }, [isOpen, editingId, initialData]);

    // OPTIMIZATION: Memoized change handler
    const handleChange = useCallback((field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingId) {
                await api.updateServer(editingId, formData);
            } else {
                await api.registerServer(formData);
            }
            onSuccess();
            onClose();
        } catch (err) {
            alert('Failed to save server details. Check backend connection.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-[#0b0e14] border border-white/10 rounded-3xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* 1. STICKY HEADER */}
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-gray-900/40 shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-[0.2em]">{editingId ? 'Modify Strategic Node' : 'Integrate Global Node'}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Protocol: V3.4 Infrastructure Module</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-2xl transition-all border border-white/5"
                    >
                        <X className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* 2. TAB CONTROLS */}
                    <div className="px-8 py-4 flex gap-4 bg-gray-950/40 border-b border-white/5 shrink-0">
                        <button 
                            type="button"
                            onClick={() => setFormTab('basic')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                                formTab === 'basic' 
                                ? 'bg-blue-600 text-white border-blue-500 shadow-lg' 
                                : 'bg-white/5 text-slate-500 border-transparent hover:bg-white/10'
                            }`}
                        >
                            01. Infrastructure Hub
                        </button>
                        <button 
                            type="button"
                            onClick={() => setFormTab('adv')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                                formTab === 'adv' 
                                ? 'bg-purple-600 text-white border-purple-500 shadow-lg' 
                                : 'bg-white/5 text-slate-500 border-transparent hover:bg-white/10'
                            }`}
                        >
                            02. Automation Strategy
                        </button>
                    </div>

                    {/* 3. SCROLLABLE BODY */}
                    <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 custom-scrollbar scroll-smooth">
                        {formTab === 'basic' ? (
                            <>
                                <IdentitySection data={formData} onChange={handleChange} />
                                <SecuritySection 
                                    data={formData} 
                                    onChange={handleChange} 
                                    showCustomProtocol={showCustomProtocol}
                                    setShowCustomProtocol={setShowCustomProtocol}
                                />
                                <OrgSection data={formData} onChange={handleChange} />
                            </>
                        ) : (
                            <>
                                <AutomationSection data={formData} onChange={handleChange} />
                                <MetadataSection data={formData} onChange={handleChange} />
                            </>
                        )}
                    </div>

                    {/* 4. STICKY FOOTER */}
                    <div className="px-8 py-6 border-t border-white/5 flex gap-4 bg-gray-900/40 shrink-0">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-4 border border-white/10 hover:bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl transition-all"
                        >
                            Abort Ops
                        </button>
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="flex-[2] px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-800 disabled:to-slate-800 text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3"
                        >
                            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                            {isSaving ? 'Syncing...' : editingId ? 'Update Global Matrix' : 'Integrate Global Node'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
