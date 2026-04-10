import { useState, useEffect } from 'react';
import { Switch } from '../components/ui/switch';
import { Save, CheckCircle, RefreshCw, Wifi, Bell, ServerCog } from 'lucide-react';

const BASE_URL = 'http://localhost:8080';
const TABS = ['General', 'Alerts', 'Integrations'] as const;
type Tab = typeof TABS[number];

// ─── Local-storage helpers ────────────────────────────────────────────────────
function load<T>(key: string, def: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : def;
    } catch { return def; }
}
function save(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <div className="flex items-center gap-2.5 pt-5 pb-3 border-b border-gray-800/50 mb-1">
            <Icon className="w-4 h-4 text-blue-400" />
            <h3 className="text-gray-300 text-sm font-semibold tracking-wide uppercase">{label}</h3>
        </div>
    );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-gray-800/50 last:border-0">
            <div className="max-w-xs">
                <h4 className="text-white text-sm font-medium mb-0.5">{label}</h4>
                {description && <p className="text-gray-500 text-xs leading-snug">{description}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors w-64 placeholder-gray-600"
        />
    );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 w-64 cursor-pointer"
        >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

function RangeInput({ label, description, value, onChange, unit = '%', min = 0, max = 100, step = 1 }:
    { label: string; description?: string; value: number; onChange: (v: number) => void; unit?: string; min?: number; max?: number; step?: number }) {
    const pct = ((value - min) / (max - min)) * 100;
    const color = pct > 80 ? 'text-red-400' : pct > 60 ? 'text-yellow-400' : 'text-blue-400';
    return (
        <div className="py-4 border-b border-gray-800/50 last:border-0">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h4 className="text-white text-sm font-medium">{label}</h4>
                    {description && <p className="text-gray-500 text-xs">{description}</p>}
                </div>
                <span className={`font-bold text-sm ${color}`}>{value}{unit}</span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Settings() {
    const [activeTab, setActiveTab] = useState<Tab>('General');
    const [saved, setSaved] = useState(false);
    const [thresholdStatus, setThresholdStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

    // General
    const [orgName, setOrgName] = useState(() => load('s_orgName', 'My Infrastructure'));
    const [timeZone, setTimeZone] = useState(() => load('s_timezone', 'Europe/Paris'));
    const [retention, setRetention] = useState(() => load('s_retention', '90'));
    const [refreshRate, setRefreshRate] = useState(() => load('s_refresh', '30'));

    // Alerts — start from localStorage, then sync from backend on mount
    const [cpuThreshold, setCpuThreshold] = useState(() => load('s_cpuT', 80));
    const [memThreshold, setMemThreshold] = useState(() => load('s_memT', 85));
    const [diskThreshold, setDiskThreshold] = useState(() => load('s_diskT', 90));
    const [dbStorageThreshold, setDbStorageThreshold] = useState(() => load('s_dbStorageT', 85));
    const [emailNotif, setEmailNotif] = useState(() => load('s_email', false));
    const [slackNotif, setSlackNotif] = useState(() => load('s_slack', false));
    const [alertFreq, setAlertFreq] = useState(() => load('s_alertFreq', '15m'));

    // Integrations
    const [prometheusUrl, setPrometheusUrl] = useState(() => load('s_promUrl', 'http://192.168.56.101:9090'));
    const [grafanaUrl, setGrafanaUrl] = useState(() => load('s_grafUrl', 'http://192.168.56.101:3000'));
    const [slackWebhook, setSlackWebhook] = useState(() => load('s_slackWh', ''));
    const [backendUrl, setBackendUrl] = useState(() => load('s_backendUrl', 'http://localhost:8080'));

    // Load live threshold values from backend on mount (ground truth)
    useEffect(() => {
        fetch(`${BASE_URL}/api/settings/thresholds`)
            .then(r => r.json())
            .then((data: { cpuThreshold: number; memThreshold: number; diskThreshold: number; dbStorageThreshold?: number }) => {
                setCpuThreshold(data.cpuThreshold);
                setMemThreshold(data.memThreshold);
                setDiskThreshold(data.diskThreshold);
                if (data.dbStorageThreshold !== undefined) {
                    setDbStorageThreshold(data.dbStorageThreshold);
                    save('s_dbStorageT', data.dbStorageThreshold);
                }
                save('s_cpuT', data.cpuThreshold);
                save('s_memT', data.memThreshold);
                save('s_diskT', data.diskThreshold);
            })
            .catch(() => { /* backend offline, use localStorage values */ });
    }, []);

    const handleSave = async () => {
        // Save all to localStorage
        save('s_orgName', orgName);
        save('s_timezone', timeZone);
        save('s_retention', retention);
        save('s_refresh', refreshRate);
        save('s_cpuT', cpuThreshold);
        save('s_memT', memThreshold);
        save('s_diskT', diskThreshold);
        save('s_dbStorageT', dbStorageThreshold);
        save('s_email', emailNotif);
        save('s_slack', slackNotif);
        save('s_alertFreq', alertFreq);
        save('s_promUrl', prometheusUrl);
        save('s_grafUrl', grafanaUrl);
        save('s_slackWh', slackWebhook);
        save('s_backendUrl', backendUrl);

        // POST thresholds to the backend so alerts use them immediately
        setThresholdStatus('syncing');
        try {
            const res = await fetch(`${BASE_URL}/api/settings/thresholds`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpuThreshold, memThreshold, diskThreshold, dbStorageThreshold }),
            });
            if (!res.ok) throw new Error('Server error');
            setThresholdStatus('synced');
        } catch {
            setThresholdStatus('error');
        }

        setSaved(true);
        setTimeout(() => { setSaved(false); setThresholdStatus('idle'); }, 2500);
    };


    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-white text-2xl font-semibold mb-1">Settings</h1>
                    <p className="text-gray-400 text-sm">Configure monitoring preferences and integrations</p>
                </div>
                <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg ${saved
                        ? 'bg-emerald-600 shadow-emerald-600/20 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 text-white'}`}
                >
                    {saved
                        ? <><CheckCircle className="w-4 h-4" /> Saved!</>
                        : <><Save className="w-4 h-4" /> Save Changes</>
                    }
                </button>
            </div>

            {/* Sync status banner — shown briefly after save */}
            {thresholdStatus === 'synced' && (
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2 flex items-center gap-2 w-fit">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Thresholds synced with backend — alerts will use new values immediately
                </div>
            )}
            {thresholdStatus === 'error' && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 w-fit">
                    ⚠ Could not sync thresholds with backend. Make sure the backend is running.
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-gray-800/30 rounded-xl p-1.5 border border-gray-800 w-fit">
                {TABS.map(tab => (
                    <button key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Panel */}
            <div className="bg-[#16181d] border border-gray-800 rounded-xl px-6">

                {/* ── General ─────────────────────────────────────────────── */}
                {activeTab === 'General' && (
                    <>
                        <SectionTitle icon={ServerCog} label="System" />
                        <SettingRow label="Organization Name" description="Displayed in the dashboard header">
                            <TextInput value={orgName} onChange={setOrgName} placeholder="My Infrastructure" />
                        </SettingRow>
                        <SettingRow label="Backend API URL" description="Spring Boot backend endpoint">
                            <TextInput value={backendUrl} onChange={setBackendUrl} placeholder="http://localhost:8080" />
                        </SettingRow>
                        <SettingRow label="Time Zone" description="Used for all timestamps and graphs">
                            <Select value={timeZone} onChange={setTimeZone} options={[
                                { value: 'UTC', label: 'UTC' },
                                { value: 'Europe/Paris', label: 'Europe/Paris' },
                                { value: 'Europe/London', label: 'Europe/London' },
                                { value: 'America/New_York', label: 'America/New_York' },
                                { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
                                { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
                            ]} />
                        </SettingRow>
                        <SectionTitle icon={RefreshCw} label="Data Collection" />
                        <SettingRow label="Metrics Refresh Rate" description="How often the dashboard polls the backend">
                            <Select value={refreshRate} onChange={setRefreshRate} options={[
                                { value: '10', label: 'Every 10 seconds' },
                                { value: '30', label: 'Every 30 seconds' },
                                { value: '60', label: 'Every 1 minute' },
                                { value: '300', label: 'Every 5 minutes' },
                            ]} />
                        </SettingRow>
                        <SettingRow label="Log Retention Period" description="Oldest logs kept in the database">
                            <Select value={retention} onChange={setRetention} options={[
                                { value: '7', label: '7 days' },
                                { value: '30', label: '30 days' },
                                { value: '60', label: '60 days' },
                                { value: '90', label: '90 days' },
                                { value: '180', label: '180 days' },
                            ]} />
                        </SettingRow>
                    </>
                )}

                {/* ── Alerts ──────────────────────────────────────────────── */}
                {activeTab === 'Alerts' && (
                    <div className="py-2">
                        <SectionTitle icon={Bell} label="Thresholds" />
                        <RangeInput label="CPU Alert Threshold" description="Trigger a critical alert above this value" value={cpuThreshold} onChange={setCpuThreshold} />
                        <RangeInput label="Memory Alert Threshold" description="Trigger a warning alert above this value" value={memThreshold} onChange={setMemThreshold} />
                        <RangeInput label="Disk Alert Threshold" description="Trigger a warning alert above this value" value={diskThreshold} onChange={setDiskThreshold} />
                        <RangeInput label="DB Storage Alert Threshold" description="Trigger a warning alert when database usage vs capacity ratio exceeds this value" value={dbStorageThreshold} onChange={setDbStorageThreshold} step={0.1} />
                        <SectionTitle icon={Bell} label="Notifications" />
                        <SettingRow label="Email Notifications" description="Send critical alerts via email">
                            <Switch enabled={emailNotif} onChange={setEmailNotif} />
                        </SettingRow>
                        <SettingRow label="Slack Notifications" description="Post alerts to a Slack channel">
                            <Switch enabled={slackNotif} onChange={setSlackNotif} />
                        </SettingRow>
                        <SettingRow label="Alert Frequency" description="Minimum time between repeated alerts for the same issue">
                            <Select value={alertFreq} onChange={setAlertFreq} options={[
                                { value: '5m', label: 'Every 5 minutes' },
                                { value: '15m', label: 'Every 15 minutes' },
                                { value: '30m', label: 'Every 30 minutes' },
                                { value: '1h', label: 'Every hour' },
                            ]} />
                        </SettingRow>
                    </div>
                )}

                {/* ── Integrations ─────────────────────────────────────────── */}
                {activeTab === 'Integrations' && (
                    <>
                        <SectionTitle icon={Wifi} label="Monitoring Stack" />
                        <SettingRow label="Prometheus URL" description="Time-series metrics scraping endpoint">
                            <TextInput value={prometheusUrl} onChange={setPrometheusUrl} placeholder="http://localhost:9090" />
                        </SettingRow>
                        <SettingRow label="Grafana URL" description="Optional: link out to Grafana dashboards">
                            <TextInput value={grafanaUrl} onChange={setGrafanaUrl} placeholder="http://localhost:3000" />
                        </SettingRow>
                        <SectionTitle icon={Bell} label="Alerting Webhooks" />
                        <SettingRow label="Slack Webhook URL" description="Receives alert payloads for Slack channels">
                            <TextInput value={slackWebhook} onChange={setSlackWebhook} placeholder="https://hooks.slack.com/..." />
                        </SettingRow>
                    </>
                )}
            </div>
        </div>
    );
}
