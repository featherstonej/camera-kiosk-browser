#!/bin/bash

# Setup script for Camera Kiosk Browser Autostart on Raspberry Pi

AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="$AUTOSTART_DIR/camera-kiosk.desktop"
# Get the directory where this script is located
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCRIPT_PATH="$APP_DIR/start-kiosk.sh"

echo "Configuring autostart for Camera Kiosk Browser..."

# Create autostart directory if it doesn't exist
mkdir -p "$AUTOSTART_DIR"

# Ensure start-kiosk.sh is executable
chmod +x "$SCRIPT_PATH"

# Create the .desktop file
cat <<EOF > "$DESKTOP_FILE"
[Desktop Entry]
Type=Application
Name=Camera Kiosk Browser
Comment=Starts the security camera feed kiosk
Exec=$SCRIPT_PATH
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

echo "Autostart entry created at $DESKTOP_FILE"
echo "The browser will now start automatically on boot (when the desktop loads)."
echo "Path to script: $SCRIPT_PATH"
