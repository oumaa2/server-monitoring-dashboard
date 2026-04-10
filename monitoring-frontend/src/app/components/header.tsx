import { Search } from 'lucide-react';

export function Header() {
    return (
        <header className="h-16 bg-[#0f1115] border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-10">
            <h1 className="text-white text-xl font-semibold">Dashboard Overview</h1>

            <div className="flex items-center gap-6">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        className="bg-gray-800/50 text-gray-300 pl-10 pr-4 py-2 rounded-lg w-80 border border-transparent focus:border-blue-500/50 focus:bg-gray-800 outline-none transition-all text-sm"
                        placeholder="Search servers, metrics, logs..."
                    />
                </div>
            </div>
        </header>
    );
}
