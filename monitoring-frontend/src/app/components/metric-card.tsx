import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    trend?: number;
    status?: 'healthy' | 'warning' | 'critical' | 'info';
    icon: React.ComponentType<{ className?: string }>;
}

export function MetricCard({ title, value, trend, status = 'healthy', icon: Icon }: MetricCardProps) {
    const statusStyles = {
        healthy: 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-400 icon-bg-green-500/20',
        warning: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 text-yellow-400 icon-bg-yellow-500/20',
        critical: 'from-red-500/10 to-red-600/5 border-red-500/20 text-red-400 icon-bg-red-500/20',
        info: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400 icon-bg-blue-500/20',
    };

    const style = statusStyles[status];
    const iconBg = style.split(' ').find(s => s.startsWith('icon-bg-'))?.replace('icon-bg-', '') || 'bg-gray-800/50';

    return (
        <div className={`bg-gradient-to-br border rounded-xl p-6 transition-all hover:scale-[1.02] ${style}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="text-gray-400 text-sm font-medium">{title}</div>
                <div className={`p-2 rounded-lg ${iconBg}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className="flex items-end justify-between">
                <div className="text-3xl font-semibold">{value}</div>
                {trend !== undefined && (
                    <div className="flex items-center gap-1 text-sm">
                        {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
}
