import { NavLink } from 'react-router';
import {
    LayoutDashboard, Server, AppWindow, Database,
    Bell, FileText, Settings
} from 'lucide-react';

const NavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Servers', icon: Server, path: '/servers' },
    { label: 'Applications', icon: AppWindow, path: '/applications' },
    { label: 'Databases', icon: Database, path: '/databases' },
    { label: 'Alerts', icon: Bell, path: '/alerts' },
    { label: 'Logs', icon: FileText, path: '/logs' },
    { label: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar() {
    return (
        <aside className="w-64 bg-[#0f1115] border-r border-gray-800 flex flex-col h-screen sticky top-0">
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Server className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white font-semibold text-lg tracking-tight">MonitorHub</span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {NavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

        </aside>
    );
}
