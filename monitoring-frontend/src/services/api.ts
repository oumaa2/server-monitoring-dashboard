// Central API service — all fetch calls go through here.
// The backend runs on port 8080 (Spring Boot). Change BASE_URL if needed.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) {
        let errStr = `HTTP ${res.status} for ${path}`;
        try { const j = await res.json(); if (j.error) errStr = j.error; } catch(e){}
        throw new Error(errStr);
    }
    return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
        let errStr = `HTTP ${res.status} for ${path}`;
        try { const j = await res.json(); if (j.error) errStr = j.error; } catch(e){}
        throw new Error(errStr);
    }
    return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
    const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
    if (!res.ok) {
        let errStr = `HTTP ${res.status} for ${path}`;
        try { const j = await res.json(); if (j.error) errStr = j.error; } catch(e){}
        throw new Error(errStr);
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
    totalServers: number;
    activeAlerts: number;
    requestsPerSec: number;
    errorRate: number;
    avgLatency: number;
    avgCpu: number;
    avgMemory: number;
}

export interface ServerSummary {
    id: number;
    name: string;
    role: string;
    ip: string;
    stack: string;
    status: 'online' | 'offline';
    cpu: number;
    memory: number;
    disk: number;
    network: string;
    lastCheck: string;
}

export interface AlertItem {
    id: string;
    title: string;
    severity: 'critical' | 'warning' | 'info';
    source: string;
    description: string;
    triggeredAt: string;
    status: 'active' | 'acknowledged';
    affectedResource: {
        type: string;
        name: string;
        ip: string;
    };
    threshold?: number | null;
    currentValue?: number | null;
    metric?: string;
}

export interface AlertResponse {
    alerts: AlertItem[];
    summary: {
        critical: number;
        warning: number;
        info: number;
        total: number;
    };
}

export interface DatabaseItem {
    name: string;
    type: string;
    version: string;
    server: string;
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    connections: number;
    tps: number;
    size: string;
}

export interface DeepDbMetrics {
    slowQueries: Array<{
        query: string;
        calls: number;
        avg_time_ms: number;
        rows?: number;
    }>;
    cacheHitRatio: number;
    activeLocks: number;
}

export interface PrometheusRangeResult {
    status: string;
    data?: {
        resultType: string;
        result: Array<{
            metric: Record<string, string>;
            values: Array<[number, string]>;
        }>;
    };
}

export interface HistoryPoint {
    time: string;
    value: number;
}

export interface NetworkHistoryPoint {
    time: string;
    inbound: number;
    outbound?: number;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export interface ApplicationItem {
    id: string;
    name: string;
    stack: string;
    status: 'running' | 'stopped' | 'warning';
    rpm: number;
    responseMs: number;
    errorPct: number;
    heapUsage: number;
    heapDisplay: string;
    threadsActive: number;
    threadsTotal: number;
    color: string;
}

export interface LogItem {
    id: number;
    timestamp: string;
    level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
    service: string;
    serverName: string;
    message: string;
    details?: string | null;
    stackTrace?: string | null;
}

export interface LogResponse {
    logs: LogItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface ProcessInfo {
    user: string;
    pid: string;
    cpu: number;
    mem: number;
    command: string;
}

export const api = {
    /** Dashboard headline stats. */
    getStats: () => get<DashboardStats>(`/api/dashboard/stats`),

    /** Per-server snapshot: cpu, memory, disk, network, status. */
    getSummary: () => get<ServerSummary[]>(`/api/dashboard/summary`),

    /** Active alerts (servers that are offline) */
    getAlerts: () => get<AlertResponse>('/api/dashboard/alerts'),

    /** Acknowledge an alert */
    acknowledgeAlert: (id: string, data: AlertItem) => post<any>(`/api/dashboard/alerts/${id}/acknowledge`, data),

    /** Database metrics endpoint */
    getDatabases: () => get<DatabaseItem[]>('/api/dashboard/databases'),

    /** Deep PostgreSQL Metrics */
    getDeepDbMetrics: () => get<DeepDbMetrics>('/api/dashboard/databases/deep-metrics'),

    /** System logs endpoint */
    getLogs: (level?: string, service?: string, server?: string) => {
        const params = new URLSearchParams();
        if (level && level !== 'All Levels') params.append('level', level);
        if (service && service !== 'All Services') params.append('service', service);
        if (server && server !== 'All Servers') params.append('server', server);
        const query = params.toString();
        return get<LogResponse>(`/api/logs${query ? '?' + query : ''}`);
    },

    /** Application monitoring endpoint */
    getApplications: () => get<ApplicationItem[]>('/api/applications/stats'),

    /** Time-series history — type: cpu | memory | disk | network | traffic | error_rate */
    getHistory: (type: string, range = '24h', step = '5m') =>
        get<PrometheusRangeResult>(`/api/dashboard/history?type=${type}&range=${range}&step=${step}`),

    /** Raw DB server list */
    getServers: () => get<Array<{
        id: number; 
        hostname: string; 
        ipAddress: string; 
        role: string; 
        jobName?: string; 
        description?: string;
        logPath?: string; 
        serviceName?: string;
        startScriptPath?: string;
        stopScriptPath?: string;
        sshUsername?: string;
        sshPassword?: string;
        sshPort?: number;
        protocol?: string;
    }>>('/api/servers'),

    /** Get Top processes for a server */
    getProcesses: (ip: string) => get<ProcessInfo[]>(`/api/servers/${ip}/processes`),

    /** Register a server */
    registerServer: (server: any) => post<any>('/api/servers/register', server),

    /** Update a server */
    updateServer: (id: number, server: any) => {
        return fetch(`${BASE_URL}/api/servers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(server)
        }).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status} for PUT /api/servers/${id}`);
            return res.json();
        });
    },

    /** Delete a server */
    deleteServer: (id: number) => del(`/api/servers/${id}`),

    /** Remote Server Control */
    startServer: (id: number) => post<any>(`/api/servers/${id}/start`),
    stopServer: (id: number) => post<any>(`/api/servers/${id}/stop`),

    /** Remote Script Management */
    getScript: (id: number, action: 'start' | 'stop') => get<{ content: string; path: string; hostname: string }>(`/api/scripts/${id}/${action}`),
    saveScript: (id: number, action: 'start' | 'stop', content: string) => post<{ message: string }>(`/api/scripts/${id}/${action}`, { content }),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Converts a Prometheus range result (first series) into simple {time, value} points */
export function parseHistory(raw: PrometheusRangeResult): HistoryPoint[] {
    const series = raw?.data?.result?.[0];
    if (!series) return [];
    return series.values.map(([ts, v]) => ({
        time: new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: parseFloat(parseFloat(v).toFixed(2)),
    }));
}

/** Formats bytes/s to a human-readable label */
export function fmtBytes(bps: number) {
    if (bps < 1024) return `${bps.toFixed(0)} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / 1024 / 1024).toFixed(1)} MB/s`;
}
