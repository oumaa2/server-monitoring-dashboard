#!/bin/bash
echo "Stopping PostgreSQL..."
echo "123456" | sudo -S systemctl stop postgresql
echo "PostgreSQL stopped."
