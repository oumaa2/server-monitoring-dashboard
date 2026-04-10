import { useState, useMemo } from 'react';
import { 
    AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw, 
    ChevronDown, Terminal, Eye, ShieldAlert, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { api, type AlertResponse } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { formatDistanceToNow } from 'date-fns';

const severityIcon = { critical: AlertTriangle, warning: AlertCircle, info: Info };
const severityClasses = {
    critical: { 
        icon: 'bg-red-500/20 text-red-400', 
        badge: 'bg-red-500/15 text-red-400', 
        border: 'border-red-500/20',
        glow: 'shadow-red-500/10'
    },
    warning: { 
        icon: 'bg-yellow-500/20 text-yellow-400', 
        badge: 'bg-yellow-500/15 text-yellow-400', 
        border: 'border-yellow-500/20',
        glow: 'shadow-yellow-500/10'
    },
    info: { 
        icon: 'bg-blue-500/20 text-blue-400', 
        badge: 'bg-blue-500/15 text-blue-400', 
        border: 'border-blue-500/20',
        glow: 'shadow-blue-500/10'
    },
};

export default function Alerts() {
    const navigate = useNavigate();
    const [severityFilter, setSeverityFilter] = useState('All Severities');
    const [serverFilter, setServerFilter] = useState('All Servers');

    const { data: response, loading, refetch } = useFetch<AlertResponse>(
        () => api.getAlerts(), [], 30_000
    );

    const alerts = response?.alerts ?? [];
    const summary = response?.summary ?? { critical: 0, warning: 0, info: 0, total: 0 };

    const servers = useMemo(() => 
        ['All Servers', ...Array.from(new Set(alerts.map(a => a.affectedResource.name)))], 
        [alerts]);

    const filtered = useMemo(() =>
        alerts.filter(a =>
            (severityFilter === 'All Severities' || a.severity === severityFilter.toLowerCase()) &&
            (serverFilter === 'All Servers' || a.affectedResource.name === serverFilter)
        ), [alerts, severityFilter, serverFilter]);

    const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr === 'Just now' || dateStr === 'Active') return dateStr;
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
        } catch {
            return dateStr;
        }
    };

    const handleAcknowledge = async (id: string) => {
        try {
            await api.acknowledgeAlert(id);
            refetch();
        } catch (err) {
            console.error("Failed to acknowledge alert", err);
        }
    };

    const handleSSH = (ip: string) => {
        const cmd = `ssh pfeadmin@${ip}`;
        navigator.clipboard.writeText(cmd);
        window.alert(`Command Copied!\n\nUse this in your terminal:\n${cmd}`);
    };

    const handleViewLogs = (serverName: string) => {
        navigate(`/logs?server=${serverName}`);
    };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-white text-2xl font-semibold mb-1">System Alerts</h1>
                    <p className="text-gray-400 text-sm">Active incidents and infrastructure warnings</p>
                </div>
                <button onClick={refetch}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-all text-sm font-medium border border-gray-700">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Critical', value: summary.critical, color: 'text-red-400', border: 'border-red-500/30', Icon: AlertTriangle },
                    { label: 'Warning', value: summary.warning, color: 'text-yellow-400', border: 'border-yellow-500/30', Icon: AlertCircle },
                    { label: 'Info', value: summary.info, color: 'text-blue-400', border: 'border-blue-500/30', Icon: Info },
                    { label: 'Total Active', value: summary.total, color: 'text-white', border: 'border-gray-700', Icon: ShieldAlert },
                ].map((s, i) => (
                    <div key={i} className={`bg-[#16181d] border rounded-xl p-5 ${s.border} shadow-lg`}>
                        <div className="flex items-center gap-2 mb-2">
                            <s.Icon className={`w-4 h-4 ${s.color}`} />
                            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{s.label}</p>
                        </div>
                        <p className={`text-2xl font-bold ${s.color}`}>
                            {loading ? '…' : s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                        className="bg-[#16181d] border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/60 appearance-none pr-10 hover:border-gray-700 transition-colors cursor-pointer min-w-[160px]">
                        {['All Severities', 'Critical', 'Warning', 'Info'].map(l => <option key={l}>{l}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative">
                    <select value={serverFilter} onChange={e => setServerFilter(e.target.value)}
                        className="bg-[#16181d] border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/60 appearance-none pr-10 hover:border-gray-700 transition-colors cursor-pointer min-w-[200px]">
                        {servers.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                <span className="ml-auto text-gray-500 text-xs font-medium uppercase tracking-widest">{filtered.length} Alerts Matches</span>
            </div>

            {/* Alert List */}
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <div className="bg-[#16181d] border border-gray-800 rounded-2xl py-20 text-center">
                        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500/20" />
                        <h3 className="text-white text-lg font-semibold mb-1">All Systems Nominal</h3>
                        <p className="text-gray-500 text-sm">No active alerts match your current filters.</p>
                    </div>
                ) : (
                    filtered.map((alert) => {
                        const cls = severityClasses[alert.severity] ?? severityClasses.info;
                        const Icon = severityIcon[alert.severity] ?? Info;
                        const status = alert.status;

                        return (
                            <div key={alert.id} className={`bg-[#16181d] border rounded-2xl p-5 hover:bg-[#1c1f26] transition-all duration-300 shadow-xl ${cls.border} ${cls.glow}`}>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl shrink-0 ${cls.icon}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-white font-bold text-base">{alert.title}</h4>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${cls.badge}`}>
                                                {status}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm mb-3">{alert.description}</p>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-y border-gray-800/50 mb-3">
                                            <div>
                                                <p className="text-gray-600 text-[10px] uppercase font-bold tracking-widest mb-1">Resource</p>
                                                <p className="text-gray-300 text-xs font-medium">{alert.affectedResource.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 text-[10px] uppercase font-bold tracking-widest mb-1">IP Address</p>
                                                <p className="text-gray-300 text-xs font-medium">{alert.affectedResource.ip}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 text-[10px] uppercase font-bold tracking-widest mb-1">Triggered At</p>
                                                <p className="text-gray-300 text-xs font-medium">{formatDate(alert.triggeredAt)}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 text-[10px] uppercase font-bold tracking-widest mb-1">Source</p>
                                                <p className="text-gray-300 text-xs font-medium">{alert.source}</p>
                                            </div>
                                        </div>

                                        {alert.threshold && (
                                            <div className="flex items-center gap-2 text-xs mb-3">
                                                <Activity className="w-3.5 h-3.5 text-gray-500" />
                                                <span className="text-gray-500">Value:</span>
                                                <span className={`${alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'} font-bold`}>
                                                    {alert.currentValue}%
                                                </span>
                                                <span className="text-gray-600">/ Threshold: {alert.threshold}%</span>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            {status !== 'acknowledged' && (
                                                <button 
                                                    onClick={() => handleAcknowledge(alert.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-all font-semibold shadow-lg shadow-blue-600/20">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Acknowledge
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleViewLogs(alert.affectedResource.name)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-all font-semibold border border-gray-700">
                                                <Eye className="w-3.5 h-3.5" /> View Logs
                                            </button>
                                            <button 
                                                onClick={() => handleSSH(alert.affectedResource.ip)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-all font-semibold border border-gray-700">
                                                <Terminal className="w-3.5 h-3.5" /> SSH to Server
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
