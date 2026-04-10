import React from 'react';

interface SwitchProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label?: string;
}

export function Switch({ enabled, onChange, label }: SwitchProps) {
    return (
        <div className="flex items-center gap-3">
            {label && <span className="text-sm text-gray-400">{label}</span>}
            <button
                onClick={() => onChange(!enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    );
}
