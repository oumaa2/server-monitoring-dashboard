import { Outlet } from 'react-router';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function Layout() {
    return (
        <div className="dark min-h-screen bg-[#0a0b0e] flex text-white font-sans selection:bg-blue-500/30">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto p-6 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
