const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Load configuration
let config = {
    url: 'http://localhost:8080',
    fullscreen: true,
    autoReload: true,
    disableShortcuts: true,
    enableDebugExit: true,
    zoomLevel: 1.0,
    gridColumns: 4,
    hideSelectors: [],
    reloadSchedule: {
        enabled: true,
        activeStartHour: 7,
        activeEndHour: 22,
        activeInterval: 3600000,
        offInterval: 0
    }
};

// Simple logging helper
const logPath = path.join(app.getPath('userData'), 'kiosk.log');
function log(message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}\n`;
    console.log(formattedMessage.trim());
    try {
        fs.appendFileSync(logPath, formattedMessage);
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

// Validate and sanitize CSS selectors to prevent CSS injection
function validateCssSelector(selector) {
    if (typeof selector !== 'string' || !selector.trim()) {
        return false;
    }
    
    // Remove leading/trailing whitespace
    selector = selector.trim();
    
    // Check for dangerous characters that could break CSS syntax or inject code
    // We block: semicolons, braces, quotes (unless part of attribute selectors), backslashes
    const dangerousPatterns = [
        /[;{}\\]/,  // Semicolons, braces, backslashes
        /\/\*/,     // Start of CSS comment
        /\*\//,     // End of CSS comment
        /@/,        // At-rules
        /^\s*$/     // Empty or whitespace only
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(selector)) {
            return false;
        }
    }
    
    // Basic validation: selector should start with valid characters
    // Valid selectors start with: . # [ : * or an element name (letter)
    if (!/^[.#\[:\*a-zA-Z]/.test(selector)) {
        return false;
    }
    
    // Check for unmatched brackets (attribute selectors)
    const openBrackets = (selector.match(/\[/g) || []).length;
    const closeBrackets = (selector.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
        return false;
    }
    
    // Check for unmatched parentheses (pseudo-classes like :not())
    const openParens = (selector.match(/\(/g) || []).length;
    const closeParens = (selector.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
        return false;
    }
    
    return true;
}

log('Starting Camera Kiosk Browser...');
log(`Log file location: ${logPath}`);

try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    }
} catch (error) {
    console.error('Error loading config:', error);
}

let mainWindow;
let reloadTimer;

// Set unlimited connections per domain
// These must be set before the app is ready
app.commandLine.appendSwitch('disable-http2');
app.commandLine.appendSwitch('max-connections-per-host', '1024');
app.commandLine.appendSwitch('max-persistent-connections-per-host', '1024');
app.commandLine.appendSwitch('max-total-connections', '1024');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('ignore-connections-limit', 'localhost,127.0.0.1,10.1.10.253');

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        fullscreen: config.fullscreen,
        kiosk: config.fullscreen,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            // Enable web security but allow unlimited connections
            webSecurity: true,
            // Disable features that might show update prompts
            devTools: false
        },
        backgroundColor: '#000000'
    });

    // Remove connection limits for HTTP/1.1
    // This solves the 6-connection limit issue
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        callback({ requestHeaders: details.requestHeaders });
    });

    // Load the camera feed URL
    mainWindow.loadURL(config.url);
    log(`Loading URL: ${config.url}`);

    // Handle load failures with auto-reload
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log(`Failed to load: ${errorDescription} (${errorCode})`);
        log('Retrying in 5 seconds...');
        setTimeout(() => {
            mainWindow.loadURL(config.url);
        }, 5000);
    });

    // Successful load
    mainWindow.webContents.on('did-finish-load', () => {
        log('Page loaded successfully');

        // Apply targeted layout fix for Motion's legacy HTML
        setTimeout(() => {
            // Validate and sanitize custom hide selectors
            const validatedSelectors = (config.hideSelectors || [])
                .filter(selector => {
                    const isValid = validateCssSelector(selector);
                    if (!isValid) {
                        log(`WARNING: Rejected invalid CSS selector: "${selector}"`);
                    }
                    return isValid;
                });
            
            const customHide = validatedSelectors.join(', ');
            const hideRules = customHide ? `, ${customHide}` : '';

            mainWindow.webContents.insertCSS(`
                /* 0. Hide menu bars and headers */
                header, .header, #header, .navbar, #navbar, .menu, #menu, .top-bar, #top-bar${hideRules} {
                    display: none !important;
                }

                /* Hide legacy Motion control links/labels at the top */
                body > b, body > a:not(#id_preview a) {
                    display: none !important;
                }

                /* Ensure no space at the top and full height */
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                }

                /* 1. Force the container into a configurable grid */
                #id_preview {
                    display: grid !important;
                    grid-template-columns: repeat(${config.gridColumns || 4}, 1fr) !important;
                    gap: 10px !important;
                    padding: 10px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    margin: 0 !important;
                }

                /* 2. Fix the wrapper links */
                #id_preview a {
                    width: 100% !important;
                    height: auto !important;
                    display: block !important;
                }

                /* 3. Override Motion's hardcoded width=25% and align images */
                #id_preview img {
                    width: 100% !important;
                    height: auto !important;
                    max-width: none !important;
                    max-height: none !important;
                    display: block !important;
                    border: 2px solid white !important;
                    border-radius: 4px;
                }

                /* 4. Global cleanup to maximize space */
                .main-content {
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 100% !important;
                }
                
                .main-content br {
                    display: none !important;
                }

                /* Adjust for the specific zoom level in config */
                html {
                    zoom: ${config.zoomLevel || 1.0} !important;
                }
            `).catch(err => console.error('Failed to inject layout CSS:', err));
        }, 500);

        // Set up periodic reload if enabled
        if (config.autoReload && config.reloadInterval > 0) {
            if (reloadTimer) clearInterval(reloadTimer);
            reloadTimer = setInterval(() => {
                log('Auto-reloading page...');
                mainWindow.reload();
            }, config.reloadInterval);
        }
    });

    // Disable keyboard shortcuts if configured
    if (config.disableShortcuts) {
        mainWindow.webContents.on('before-input-event', (event, input) => {
            // Allow F11 for fullscreen toggle during testing
            // Remove this in production if you want to completely lock it down
            if (input.key === 'F11') {
                return;
            }

            // Block common exit shortcuts
            if (input.control || input.meta) {
                // Handle secret exit: Ctrl+Shift+X (or Cmd+Shift+X)
                if (config.enableDebugExit && input.shift && input.key.toLowerCase() === 'x') {
                    log('Secret exit triggered. Quitting...');
                    app.quit();
                    return;
                }

                if (['q', 'w', 'r', 'f4'].includes(input.key.toLowerCase())) {
                    event.preventDefault();
                }
            }

            // Block Alt+F4
            if (input.alt && input.key === 'F4') {
                event.preventDefault();
            }
        });
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        if (reloadTimer) clearInterval(reloadTimer);
        mainWindow = null;
    });

    // Prevent new windows from opening
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });
}

// Disable hardware acceleration if running on Raspberry Pi
// This can help with performance on ARM devices
if (process.platform === 'linux' && process.arch === 'arm' || process.arch === 'arm64') {
    app.disableHardwareAcceleration();
}

// Add --no-sandbox for development and Raspberry Pi environments
// This is needed because the sandbox requires specific permissions
app.commandLine.appendSwitch('no-sandbox');

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On macOS it's common to re-create a window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Start the dynamic reload schedule
    if (config.reloadSchedule && config.reloadSchedule.enabled) {
        scheduleNextReload();
    }
});

function scheduleNextReload() {
    const now = new Date();
    const currentHour = now.getHours();
    const sched = config.reloadSchedule;

    let interval = sched.offInterval;
    let mode = 'Off';

    // Check if we are in active hours
    const isActive = sched.activeStartHour <= sched.activeEndHour
        ? (currentHour >= sched.activeStartHour && currentHour < sched.activeEndHour)
        : (currentHour >= sched.activeStartHour || currentHour < sched.activeEndHour); // Handles overnight schedules

    if (isActive) {
        interval = sched.activeInterval;
        mode = 'Active';
    }

    if (interval > 0) {
        log(`[Reload Schedule] ${mode} mode. Next reload in ${interval / 1000 / 60} minutes.`);
        setTimeout(() => {
            if (mainWindow) {
                log('[Reload Schedule] Executing scheduled reload...');
                mainWindow.reload();
            }
            // Chain the next calculation after this one finishes/triggers
            scheduleNextReload();
        }, interval);
    } else {
        log(`[Reload Schedule] ${mode} mode. Auto-reload is currently disabled/idle.`);
        // Check again in 15 minutes to see if we've entered an active window
        setTimeout(scheduleNextReload, 15 * 60 * 1000);
    }
}

// Quit when all windows are closed
app.on('window-all-closed', () => {
    // On macOS applications stay active until user quits explicitly
    // But for a kiosk, we want it to quit
    app.quit();
});

// Handle crashes and unresponsive pages
app.on('render-process-gone', (event, webContents, details) => {
    log(`Render process gone: ${JSON.stringify(details)}`);
    if (mainWindow) {
        mainWindow.reload();
    }
});

// Log any uncaught exceptions
process.on('uncaughtException', (error) => {
    log(`Uncaught exception: ${error.message}\n${error.stack}`);
});
