#!/bin/bash
# ----------------------------------------------------
# Remote Server Control Script for Monitoring Dashboard
# ----------------------------------------------------
# Usage: ./server_control.sh <action> <service_role>
# Place this file in /home/pfeadmin/server_control.sh on all VMs
# Make it executable with: chmod +x server_control.sh
# ----------------------------------------------------

ACTION=$1
ROLE=$2

echo "Received request to $ACTION service for role: $ROLE"

# Map roles to their specific systemctl services if needed.
# If roles exactly match service names, this mapping can just pass it directly.
SERVICE=""
case "$ROLE" in
    "postgresql"|"postgres-db")
        SERVICE="postgresql"
        ;;
    "wildfly"|"wildfly-app")
        SERVICE="wildfly" # Assuming systemd service is named wildfly
        ;;
    "prometheus")
        SERVICE="prometheus"
        ;;
    *)
        SERVICE="$ROLE" # fallback to exactly the role name
        ;;
esac

if [ -z "$SERVICE" ]; then
    echo "Error: Unknown role $ROLE"
    exit 1
fi

if [ "$ACTION" == "start" ]; then
    echo "Executing: sudo systemctl start $SERVICE"
    sudo systemctl start "$SERVICE"
    
elif [ "$ACTION" == "stop" ]; then
    echo "Executing: sudo systemctl stop $SERVICE"
    sudo systemctl stop "$SERVICE"
    
else
    echo "Error: Invalid action '$ACTION'. Use 'start' or 'stop'."
    exit 1
fi

echo "Action $ACTION completed for $SERVICE."
