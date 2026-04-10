import React from 'react';
import { RefreshCw, AlertCircle, ChevronRight, AlertTriangle, Info, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api, type AlertItem, type AlertResponse } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';

export function AlertsPanel() {
    const { data: response, loading, error, refetch } = useFetch<AlertResponse>(
        () => api.getAlerts(),
        [],
        30_000
    );

    const alerts = response?.alerts ?? [];

    const formatDate = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
        } catch {
            return dateStr;
        }
    };

    const handleAcknowledge = async (e: React.MouseEvent, alert: AlertItem) => {
        e.stopPropagation();
        try {
            await api.acknowledgeAlert(alert.id, alert);
            refetch();
        } catch (err: any) {
            console.error('Failed to acknowledge alert:', err);
        }
    };

    return (
        <div className="bg-[#16181d] border border-gray-800 rounded-xl p-6 shadow-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">Recent Alerts</h3>
                <div className="flex items-center gap-3">
                    <button onClick={refetch} title="Refresh" className="text-gray-600 hover:text-white transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <a href="/alerts" className="text-blue-400 text-xs font-medium hover:text-blue-300 transition-colors flex items-center gap-1">
                        View All <ChevronRight className="w-3 h-3" />
                    </a>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {loading && alerts.length === 0 && (
                    <div className="space-y-3 animate-pulse">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-800/40 rounded-lg" />
                        ))}
                    </div>
                )}

                {error && (
                    <div className="text-red-400 text-xs py-4 text-center">
                        Could not load alerts
                    </div>
                )}

                {!loading && !error && alerts.length === 0 && (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <AlertCircle className="w-6 h-6 text-green-400" />
                        </div>
                        <p className="text-green-400 text-sm font-medium">All systems healthy</p>
                        <p className="text-gray-600 text-xs mt-1">No active alerts</p>
                    </div>
                )}

                {alerts.slice(0, 10).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg border border-transparent hover:border-gray-700 transition-colors cursor-pointer group">
                        <div className={`p-2 rounded-lg shrink-0 ${alert.severity === 'critical' ? 'bg-red-500/20' :
                            alert.severity === 'warning' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                            }`}>
                            {alert.severity === 'critical' ? (
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                            ) : alert.severity === 'warning' ? (
                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                            ) : (
                                <Info className="w-4 h-4 text-blue-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate group-hover:text-blue-400 transition-colors">{alert.title}</p>
                            <p className="text-gray-500 text-[10px] mt-0.5 uppercase tracking-wider font-bold">{alert.affectedResource.name}</p>
                            <p className="text-gray-600 text-[10px] mt-0.5">{formatDate(alert.triggeredAt)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${alert.severity === 'critical' ? 'bg-red-500/15 text-red-400' :
                                alert.severity === 'warning' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-400'
                                }`}>
                                {alert.severity}
                            </span>
                            {alert.status !== 'acknowledged' && (
                                <button 
                                    onClick={(e) => handleAcknowledge(e, alert)}
                                    title="Acknowledge alert"
                                    className="p-1 rounded bg-gray-800 text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-all border border-gray-700 hover:border-green-500/30"
                                >
                                    <Check className="w-3 h-3" />
                                </button>
                            )}
                            {alert.status === 'acknowledged' && (
                                <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Ack
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
