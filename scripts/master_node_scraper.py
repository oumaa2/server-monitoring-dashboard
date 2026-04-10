import os
import time
import requests
import re
import socket
from datetime import datetime

# --- CONFIGURATION ---
# We'll monitor both syslog (general) and Prometheus logs if available
LOG_FILES = [
    {"path": "/var/log/syslog", "service": "system-syslog"},
    {"path": "/var/log/prometheus/prometheus.log", "service": "prometheus"}
]
API_URL = "http://localhost:8080/api/logs"
SERVER_NAME = socket.gethostname()

# Regex for Syslog: Mar 16 02:30:00 hostname service[pid]: message
SYSLOG_PATTERN = re.compile(r'^([A-Z][a-z]{2}\s+\d+\s\d{2}:\d{2}:\d{2})\s+.*?\s+(.*?):\s+(.*)$')

# Regex for Prometheus: ts=2026-03-16T02:30:00.123Z caller=main.go:123 level=info msg="message"
PROM_PATTERN = re.compile(r'^ts=(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}).*?level=(info|warn|error|debug|info)\s+msg="(.*)"')

def send_log(timestamp, level, service, message):
    # Convert Syslog date to standard format
    if len(timestamp) < 20: # Likely syslog format
        now = datetime.now()
        try:
            dt = datetime.strptime(f"{now.year} {timestamp}", "%Y %b %d %H:%M:%S")
            timestamp = dt.strftime("%Y-%m-%d %H:%M:%S")
        except:
            timestamp = now.strftime("%Y-%m-%d %H:%M:%S")
    else:
        timestamp = timestamp.replace('T', ' ').split('.')[0]

    payload = {
        "timestamp": timestamp,
        "level": level.upper(),
        "service": service,
        "serverName": SERVER_NAME,
        "message": message
    }
    try:
        requests.post(API_URL, json=payload, timeout=2)
    except Exception as e:
        print(f"Failed to send log: {e}")

def tail_files():
    files = []
    for cfg in LOG_FILES:
        if os.path.exists(cfg["path"]):
            f = open(cfg["path"], "r")
            f.seek(0, 2)
            files.append({"handle": f, "cfg": cfg})
            print(f"Monitoring {cfg['path']} as {cfg['service']}")
        else:
            print(f"Warning: {cfg['path']} not found, skipping...")

    if not files:
        print("No log files found to monitor.")
        return

    while True:
        for item in files:
            line = item["handle"].readline()
            if not line:
                continue
            
            # Try Syslog Pattern
            match = SYSLOG_PATTERN.match(line)
            if match:
                ts, svc, msg = match.groups()
                level = "INFO"
                if any(x in msg.lower() for x in ["error", "fail", "crit"]): level = "ERROR"
                elif "warn" in msg.lower(): level = "WARN"
                send_log(ts, level, f"{item['cfg']['service']} ({svc})", msg)
                continue

            # Try Prometheus Pattern
            match = PROM_PATTERN.match(line)
            if match:
                ts, lv, msg = match.groups()
                send_log(ts, lv, item["cfg"]["service"], msg)

        time.sleep(0.1)

if __name__ == "__main__":
    print(f"Starting Master Node scraper on {SERVER_NAME}...")
    print(f"API Target -> {API_URL}")
    tail_files()
