import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'healthy' | 'warning' | 'critical' | 'info' | 'default';
    className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    const variants = {
        healthy: 'bg-green-500/20 text-green-400 border-green-500/20',
        warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
        critical: 'bg-red-500/20 text-red-400 border-red-500/20',
        info: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
        default: 'bg-gray-800 text-gray-400 border-gray-700',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}
