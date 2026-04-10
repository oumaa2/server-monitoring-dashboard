import os
import time
import requests
import re
import socket
from datetime import datetime

# --- CONFIGURATION ---
LOG_FILE = "/opt/wildfly/standalone/log/server.log"
API_URL = "http://localhost:8080/api/logs"
SERVER_NAME = socket.gethostname()
SERVICE_NAME = "wildfly-app"

# Regex for WildFly log format: 2026-03-16 02:30:00,123 INFO  [com.example] (thread) Message
LOG_PATTERN = re.compile(r'^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}),\d{3}\s+(INFO|WARN|ERROR|DEBUG|FATAL)\s+\[(.*?)\].*?:\s+(.*)$')

def send_log(timestamp, level, service, message, trace=None):
    # Normalize Level
    if level == "FATAL": level = "ERROR"
    
    payload = {
        "timestamp": timestamp,
        "level": level,
        "service": service,
        "serverName": SERVER_NAME,
        "message": message,
        "stackTrace": trace
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
        # Go to the end of the file
        f.seek(0, 2)
        
        current_log = None
        
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.1)
                continue
            
            # Check for new log line
            match = LOG_PATTERN.match(line)
            if match:
                # If we had a previous log, send it now (in case it had multiline trace)
                if current_log:
                    send_log(**current_log)
                
                ts, lv, svc, msg = match.groups()
                current_log = {
                    "timestamp": ts,
                    "level": lv,
                    "service": f"{SERVICE_NAME} ({svc})",
                    "message": msg,
                    "trace": ""
                }
            else:
                # Multiline/Stacktrace
                if current_log:
                    current_log["trace"] += line

if __name__ == "__main__":
    print(f"Starting WildFly log scraper on {SERVER_NAME}...")
    print(f"Tailing {LOG_FILE} -> {API_URL}")
    tail_file(LOG_FILE)
