#!/bin/bash
echo "Stopping WildFly..."
echo "123456" | sudo -S systemctl stop wildfly
echo "WildFly stopped."
