#!/bin/bash

# Camera Kiosk Browser - Auto-start script for Raspberry Pi
# This script should be added to autostart

# Wait for network to be ready
sleep 10

# Set display (adjust if needed)
export DISPLAY=:0

# Start the kiosk browser
# Try the installed binary first, then fall back to npm start
if command -v camera-kiosk-browser &> /dev/null; then
    echo "Starting installed camera-kiosk-browser..."
    camera-kiosk-browser
else
    # Fallback: find the source directory relative to this script
    SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    echo "Starting from source in $SOURCE_DIR..."
    cd "$SOURCE_DIR"
    npm start -- --no-sandbox
fi
