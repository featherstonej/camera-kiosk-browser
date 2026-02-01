# Camera Kiosk Browser

A dedicated Electron-based kiosk browser for displaying security camera feeds on Raspberry Pi devices. This browser is **specifically designed to work with [Motion software](https://github.com/Motion-Project/motion)**, eliminating issues with browser updates, "New Feature" pages, and connection limits.

## Features

- **Kiosk Mode**: Fullscreen display with no browser chrome or distractions
- **Unlimited Connections**: No 6-connection limit - display as many camera feeds as you need
- **Auto-Reload**: Automatic page refresh and error recovery
- **No Updates**: Never shows update notifications or feature pages
- **Crash Recovery**: Automatically recovers from page crashes
- **Configurable**: Easy JSON configuration file
- **ARM Optimized**: Built specifically for Raspberry Pi (Raspbian)

## Installation

### On Your Development Machine

1. **Clone or copy the project** to your development machine

2. **Install dependencies**:
   ```bash
   cd camera-kiosk-browser
   npm install
   ```

3. **Test locally**:
   ```bash
   npm start
   ```

### On Raspberry Pi

#### Method 1: Build on Development Machine and Transfer

1. **Build the package** (on your development machine):
   ```bash
   # For Raspberry Pi 3/4 (32-bit)
   npm run build
   
   # For Raspberry Pi 4/5 (64-bit)
   npm run build:arm64
   ```

2. **Transfer the .deb file** to your Raspberry Pi:
   ```bash
   scp dist/camera-kiosk-browser_1.0.0_armv7l.deb pi@your-pi-ip:~/
   ```

3. **Install on Raspberry Pi**:
   ```bash
   sudo dpkg -i camera-kiosk-browser_1.0.0_armv7l.deb
   sudo apt-get install -f  # Fix any dependency issues
   ```

#### Method 2: Install from Source on Raspberry Pi

1. **Copy the entire project** to your Raspberry Pi:
   ```bash
   scp -r camera-kiosk-browser pi@your-pi-ip:~/
   ```

2. **On the Raspberry Pi**, install dependencies:
   ```bash
   cd ~/camera-kiosk-browser
   npm install
   ```

## Configuration

Edit `config.json` to customize the browser behavior:

```json
{
  "url": "http://localhost:8080",
  "fullscreen": true,
  "autoReload": true,
  "reloadInterval": 30000,
  "disableShortcuts": true
}
```

### Configuration Options

- **url**: The URL of your Motion camera feed page
- **fullscreen**: Enable fullscreen kiosk mode (true/false)
- **zoomLevel**: Browser zoom factor (e.g., 0.9 for 90%, 1.0 for 100%)
- **gridColumns**: Number of columns for the camera grid (default: 4)
- **hideSelectors**: Array of CSS selectors to hide (e.g., `[".menu", "#ads"]`)
- **autoReload**: Enable automatic page refresh on load failure (true/false)
    - **activeStartHour**: Start of active window (0-23)
    - **activeEndHour**: End of active window (0-23)
    - **activeInterval**: MS between reloads during active hours (e.g., 3600000 for 1 hour)
    - **offInterval**: MS between reloads during off hours (0 to disable)
- **disableShortcuts**: Prevent accidental exits via keyboard shortcuts (true/false)
- **enableDebugExit**: Enable secret exit shortcut `Ctrl+Shift+X` (true/false)
- **zoomLevel**: Browser zoom factor (e.g., 0.9 for 90%, 1.0 for 100%)

## Auto-Start on Boot

To make the browser start automatically when your Raspberry Pi boots:

1. **Make the startup script executable**:
   ```bash
   chmod +x start-kiosk.sh
   ```

2. **Edit the autostart file**:
   ```bash
   mkdir -p ~/.config/autostart
   nano ~/.config/autostart/camera-kiosk.desktop
   ```

3. **Add the following content**:
   ```ini
   [Desktop Entry]
   Type=Application
   Name=Camera Kiosk Browser
   Exec=/home/pi/camera-kiosk-browser/start-kiosk.sh
   X-GNOME-Autostart-enabled=true
   ```

4. **Save and reboot** to test

## Usage

### Running Manually

```bash
cd camera-kiosk-browser
npm start
```

### Exiting the Kiosk

If you need to exit the kiosk browser:
- **Ctrl+Shift+X**: Secret exit shortcut (if `enableDebugExit` is true in `config.json`)
- **F11**: Toggle fullscreen (if shortcuts are not disabled)
- **Alt+F4**: Close window (if shortcuts are not disabled)
- **SSH**: Run `pkill -f electron` from another machine

## Troubleshooting

### Page Won't Load

1. Check that your Motion server is running and accessible
2. Verify the URL in `config.json` is correct
3. Check network connectivity: `ping your-motion-server-ip`

### Black Screen on Boot

1. Increase the sleep time in `start-kiosk.sh` to wait longer for network
2. Check the autostart configuration
3. View logs: `journalctl --user -u camera-kiosk`

### Performance Issues

- The browser automatically disables hardware acceleration on ARM devices
- Reduce the number of camera feeds if performance is poor
- Consider lowering the resolution of your Motion feeds

### Connection Issues

The browser is configured to allow unlimited connections to the same host, so you should be able to display as many camera feeds as your network and Pi can handle.

### Logging

The application maintains a log file for troubleshooting on headless devices.
- **Location**: `~/.config/camera-kiosk-browser/logs/kiosk.log` (typical path on Linux)
- You can also find the exact path by running the app manually and looking at the startup log.

## Manual Updates

Since auto-updates are disabled to prevent interruptions, you can manually update the application by following these steps:

1.  **Update Dependencies** (on your development machine):
    ```bash
    npm install electron@latest --save-dev
    npm update
    ```

2.  **Rebuild the Package**:
    ```bash
    npm run build  # or npm run build:arm64
    ```

3.  **Redeploy to the Pi**:
    - Transfer the new `.deb` file using `scp`.
    - Install on the Pi using `sudo dpkg -i <filename>.deb`.
    - Restart the service or reboot the Pi.

## Technical Details

### Connection Limits

This browser removes the standard HTTP/1.1 connection limit by:
- Setting `max-connections-per-host` to 1024
- Disabling HTTP/2 (which has different connection handling)
- Using Electron's session API to manage connections

### Error Recovery

The browser automatically:
- Retries failed page loads after 5 seconds
- Reloads on render process crashes
- Logs errors for debugging

## Development

To modify the browser:

1. Edit `main.js` for application logic
2. Edit `config.json` for default settings
3. Test with `npm start`
4. Build with `npm run build`

## License

MIT
