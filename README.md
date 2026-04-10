# Monitoring Dashboard - Technical Documentation

A centralized monitoring solution for distributed infrastructure, featuring real-time log ingestion, performance metrics, and automated alerting.

## 🏗️ Architecture Overview

The system consists of four main components interacting in a closed-loop monitoring cycle:

1.  **Frontend (React + Vite)**: A modern dashboard built with TypeScript and Lucide-React. It fetches data from the backend via a unified `useFetch` hook and `api.ts` service.
2.  **Backend (Spring Boot)**: The central orchestrator. It manages the server database, calculates alerts, and executes SSH log pulling.
3.  **Metrics (Prometheus)**: Acts as the time-series data source. The backend queries Prometheus to determine server "online/offline" status and performance trends (CPU/RAM).
4.  **Database (PostgreSQL)**: Stores the list of monitored servers (`servers` table) and persisted system logs (`logs` table).

---

## 🚀 Key Features

### 1. Zero-Script Log Ingestion (SSH Pull)
Unlike traditional systems that require agents on every VM, this backend "pulls" logs using a persistent SSH `tail -F` stream.
- **Auto-Sync**: Logs are automatically mapped to hostnames in your database (e.g., `target-01`).
- **Resilience**: Includes exponential backoff retries and single-session tracking to prevent resource exhaustion.
- **Pre-configured targets**:
    - **Master**: `/var/log/syslog`
    - **WildFly**: `/opt/wildfly/standalone/log/server.log`
    - **Postgres**: `/var/log/postgresql/postgresql-15-main.log`

### 2. Hybrid Alerting System
Alerts are generated through two channels:
- **Infrastructure Alerts**: Pulled directly from Prometheus Alertmanager.
- **Dynamic Presence Alerts**: The backend monitors Prometheus metrics and triggers "Node Down" alerts if ANY exporter for a server IP stops responding.

### 3. Interactive Logs Page
- **Live Search**: Client-side filtering of loaded logs.
- **Server-Side Filters**: Filter by Severity (INFO/ERROR), Service, or specific Server.
- **Live Polling**: Toggleable 10s auto-refresh for real-time monitoring.

---

## ⚙️ Setup & Configuration
This project uses environment variables to keep sensitive credentials secure.

### 1. Backend Setup (.env)
Create `monitoring-backend/.env` (ignored by git) and populate it based on `.env.example`:
```properties
DB_URL=jdbc:postgresql://192.168.x.x:5432/monitoring_db
DB_USER=monitoring_user
DB_PASS=123456
PROMETHEUS_URL=http://192.168.x.x:9090
SSH_USER=pfeadmin
SSH_PASS=123456
```

### 2. Frontend Setup (.env)
Create `monitoring-frontend/.env.local`:
```properties
VITE_API_URL=http://localhost:8080
```

### 3. GitHub Deployment (PAT)
To push to GitHub from a new machine, use a **Personal Access Token**:
1. Go to **Settings > Developer settings > Personal access tokens**.
2. Generate a token with `repo` scope.
3. Use this token as your **password** when prompted by Git.

---

## 🛠️ Recent Achievements (Phase 8)

In the final phase of development, we stabilized the system by:
- **Syncing Identities**: Logs and Alerts now share the same hostnames (e.g., `target-01`) via dynamic DB lookups.
- **Fixing Navigation**: Deep-linking from an alert to the log page with active filters.
- **UI Stabilzation**: Resolved all React `useCallback` errors and significantly improved filter responsiveness.
- **Robustness**: Refactored `isServerUp` to use regex-based Prometheus queries, ensuring WildFly servers show as "online" even without Node Exporter on port 9100.

---

## 📜 Handover Summary
**Status**: Stable / Fully Operational
**Active Components**: 
- Backend: `http://localhost:8080`
- Frontend: `http://localhost:5173` (or similar VITE port)
- DB: `monitoring_db` on `192.168.56.104`

**Next Recommended Task**: Add `logPath` column to the `servers` table to move the Log Config from `application.properties` into the UI/Database entirely.
