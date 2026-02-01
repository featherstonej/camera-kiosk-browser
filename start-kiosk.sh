#!/bin/bash

# Camera Kiosk Browser - Auto-start script for Raspberry Pi
# This script should be added to autostart

# Wait for network to be ready
sleep 10

# Set display (adjust if needed)
export DISPLAY=:0

# Navigate to the application directory
cd /home/pi/camera-kiosk-browser

# Start the kiosk browser
npm start -- --no-sandbox
