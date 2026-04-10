#!/bin/bash
echo "Starting Prometheus..."
echo "123456" | sudo -S systemctl start prometheus
echo "Prometheus started."
