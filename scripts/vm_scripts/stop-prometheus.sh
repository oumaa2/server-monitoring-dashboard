#!/bin/bash
echo "Stopping Prometheus..."
echo "123456" | sudo -S systemctl stop prometheus
echo "Prometheus stopped."
