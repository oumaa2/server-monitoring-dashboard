import os
import time
import requests
import re
import socket
from datetime import datetime

# --- CONFIGURATION ---
LOG_FILE = "/var/log/postgresql/postgresql-15-main.log"
API_URL = "http://localhost:8080/api/logs"
SERVER_NAME = socket.gethostname()
SERVICE_NAME = "postgres-db"

# Regex for PostgreSQL log format: 2026-03-16 02:30:00.123 UTC [pid] user@db LOG:  message
LOG_PATTERN = re.compile(r'^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}).*?\s\[\d+\]\s.*?\s(LOG|ERROR|WARNING|INFO|DEBUG):\s+(.*)$')

def send_log(timestamp, level, service, message):
    # Mapping PG levels to Dashboard levels
    level_map = {
        "LOG": "INFO",
        "WARNING": "WARN",
        "ERROR": "ERROR",
        "INFO": "INFO",
        "DEBUG": "DEBUG"
    }
    
    payload = {
        "timestamp": timestamp,
        "level": level_map.get(level, "INFO"),
        "service": service,
        "serverName": SERVER_NAME,
        "message": message
    }
    try:
        requests.post(API_URL, json=payload, timeout=2)
    except Exception as e:
        print(f"Failed to send log: {e}")

def tail_file(filename):
    if not os.path.exists(filename):
        print(f"Error: {filename} not found.")
        return

    with open(filename, "r") as f:
        f.seek(0, 2)
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.1)
                continue
            
            match = LOG_PATTERN.match(line)
            if match:
                ts, lv, msg = match.groups()
                send_log(ts, lv, SERVICE_NAME, msg)

if __name__ == "__main__":
    print(f"Starting PostgreSQL log scraper on {SERVER_NAME}...")
    print(f"Tailing {LOG_FILE} -> {API_URL}")
    tail_file(LOG_FILE)
