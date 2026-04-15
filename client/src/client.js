const { io } = require('socket.io-client');
const os = require('os');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
// Check both the src/ folder and the root of the client installation
require('dotenv').config({ path: fs.existsSync(path.join(__dirname, '.env')) ? path.join(__dirname, '.env') : path.join(__dirname, '..', '.env') });

// Configuration
const RELAY_SERVER_URL = process.env.RELAY_SERVER_URL || '';
const API_KEY = process.env.API_KEY || '';

// Unique Machine ID derived from hostname and platform
const MACHINE_ID = `${os.hostname()}-${os.platform()}`;

const socket = io(RELAY_SERVER_URL, {
    auth: { token: API_KEY },
    transports: ['websocket'], // Force pure WebSockets immediately to bypass Engine.io HTTP-polling lag
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionAttempts: Infinity
});

// Remote Telemetry Logging Hook
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
    originalLog.apply(console, args);
    if (socket && socket.connected) {
        socket.emit('remote_log', { level: 'info', msg: args.join(' ') });
    }
};

console.error = function(...args) {
    originalError.apply(console, args);
    if (socket && socket.connected) {
        socket.emit('remote_log', { level: 'error', msg: args.join(' ') });
    }
};
let vncProcess = null;

/**
 * Gathers system telemetry using native OS module
 */
function getTelemetry() {
    const interfaces = os.networkInterfaces();
    let privateIp = '127.0.0.1';
    
    // Attempt to find actual private IP address
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                privateIp = net.address;
                break;
            }
        }
    }

    return {
        machineId: MACHINE_ID,
        hostname: os.hostname(),
        publicIp: '0.0.0.0', // Handled by server reading origin IP or integration w/ STUN/ipify
        privateIp: privateIp,
        cpu: os.cpus()[0].model,
        ram: Math.round(os.freemem() / 1024 / 1024) + 'MB free',
        status: 'online'
    };
}

// Connection Events
let telemetryTimer = null;

socket.on('connect', () => {
    console.log(`[RMM Client] Connected to Relay Server (${RELAY_SERVER_URL}) with Socket ID: ${socket.id}`);
    
    // Phase 2: Transmit Heartbeat immediately and every 30 seconds
    const telemetry = getTelemetry();
    socket.emit('heartbeat', telemetry);

    telemetryTimer = setInterval(() => {
        socket.emit('heartbeat', getTelemetry());
    }, 30000);
});

socket.on('config_update', (config) => {
    if (config.telemetryInterval) {
        console.log(`[RMM Client] Received global config update. Adjusting telemetry heartbeat interval to ${config.telemetryInterval}ms.`);
        if (telemetryTimer) clearInterval(telemetryTimer);
        telemetryTimer = setInterval(() => {
            if (socket.connected) {
                socket.emit('heartbeat', getTelemetry());
            }
        }, config.telemetryInterval);
    }
});

let localVncClient = null;

// Listen for VNC start command from Admin Relay
socket.on('start_vnc', () => {
    console.log('[RMM Client] Received start_vnc command from Relay Server.');
    
    const platform = os.platform();

    if (platform === 'darwin') {
        console.log('[RMM Client] macOS detected. Relying on built-in macOS Screen Sharing (VNC)...');
        console.log('[RMM Client] Ensure "Screen Sharing" is enabled in System Settings -> General -> Sharing.');
    } else if (!vncProcess) {
        console.log('[RMM Client] Leveraging UltraVNC Service Architecture for Session 0 isolation bypass...');
        try {
            let vncExecutable = path.join(__dirname, 'winvnc.exe');
            const { execSync } = require('child_process');

            if (platform === 'win32') {
                console.log('[RMM Client] Purging any legacy VNC services from previous installations...');
                try {
                    execSync('net stop uvnc_service', { stdio: 'ignore' });
                } catch(e) {}
                try {
                    execSync(`"${vncExecutable}" -uninstall`, { stdio: 'ignore' });
                } catch(e) {}
                try {
                    execSync('taskkill /F /T /IM winvnc.exe', { stdio: 'ignore' });
                    execSync('taskkill /F /T /IM winvnc_runtime.exe', { stdio: 'ignore' });
                } catch(e) {}
                // Give Windows SCM a second to process the teardown
                try { execSync('ping 127.0.0.1 -n 2 > nul'); } catch(e) {}
            }

            // If packaged by pkg, extract the embedded binary to the temp directory
            if (process.pkg) {
                const bundledPath = path.join(__dirname, 'winvnc.exe');
                vncExecutable = path.join(os.tmpdir(), 'winvnc_runtime.exe');
                
                // Copy from the virtual packaged filesystem to the real OS filesystem
                if (fs.existsSync(bundledPath)) {
                    try {
                        fs.copyFileSync(bundledPath, vncExecutable);
                        console.log('[RMM Client] Extracted VNC engine to temporary directory.');
                    } catch (e) {
                         console.log('[RMM Client] Warning: Could not overwrite VNC executable (might still be locked). Proceeding anyway...');
                    }
                }
            }

            // Write a comprehensive dummy INI to forcefully silence UltraVNC properties page
            const iniPath = path.join(path.dirname(vncExecutable), 'ultravnc.ini');
            const iniConfig = `[Permissions]\n[admin]\nUseRegistry=0\nMSLogonRequired=0\nNewMSLogon=0\nDebugMode=0\nAvailMods=1\nDisableTrayIcon=1\nrdpmode=0\nnoscreensaver=0\nSecure=0\nAuthRequired=0\nPortNumber=5900\nHTTPPortNumber=5800\nAutoPortSelect=0\n[UltraVNC]\npasswd=E305018FE305018F\npasswd2=E305018FE305018F\n`;
            try {
                fs.writeFileSync(iniPath, iniConfig, 'utf8');
            } catch (e) {
                console.log('[RMM Client] Warning: Could not write ultravnc.ini (might lack permissions):', e.message);
            }

            console.log('[RMM Client] Installing VNC companion service...');
            try {
                // Installs the specific VNC executable as uvnc_service mapping it to the system
                execSync(`"${vncExecutable}" -install`, { stdio: 'pipe', cwd: path.dirname(vncExecutable) });
            } catch (e) {
                console.error('[RMM Client] Failed to install VNC service:', e.message);
            }

            console.log('[RMM Client] Starting VNC companion service to hook active user session...');
            try {
                execSync('net start uvnc_service', { stdio: 'pipe' });
            } catch (e) {
                console.error('[RMM Client] Failed to start VNC service (might already be running):', e.message);
            }

            vncProcess = true; // Use boolean flag since it is now managed by the Service Control Manager
            console.log(`[RMM Client] VNC Service Architecture engaged.`);
        } catch (e) {
            vncProcess = null;
            console.error('[RMM Client] Failed to prepare VNC service:', e.message);
        }
    } else if (platform !== 'darwin') {
        console.log('[RMM Client] VNC Architecture is already engaged.');
    }

    // Connect to the local VNC server and proxy data to WebSocket
    // Implement aggressive connection retries since the companion service might take 
    // several seconds to inject into Session 0 and bind to the port.
    let retryCount = 0;
    const maxRetries = 10;
    
    function tryConnectLocal() {
        if (localVncClient) {
            localVncClient.destroy();
        }
        
        localVncClient = new net.Socket();
        localVncClient.connect(5900, '127.0.0.1', () => {
            console.log('[RMM Client] Connected to local VNC server port 5900');
            retryCount = 0;
        });

        localVncClient.on('data', (data) => {
            // Forward local VNC traffic to the Relay server
            socket.emit('vnc_data', data);
        });

        localVncClient.on('error', (err) => {
            if ((err.code === 'ECONNREFUSED' || (err.message && err.message.includes('ECONNREFUSED'))) && retryCount < maxRetries) {
                retryCount++;
                console.log(`[RMM Client] Local VNC not ready yet. Retrying connection (${retryCount}/${maxRetries})...`);
                setTimeout(tryConnectLocal, 1000);
            } else {
                console.error('[RMM Client] Local VNC TCP error:', err.message || err);
            }
        });

        localVncClient.on('close', () => {
            if (retryCount === 0) {
                console.log('[RMM Client] Local VNC connection closed normally');
            }
        });
    }
    
    setTimeout(tryConnectLocal, 1000); // Trigger initial attempt
});

// Receive VNC data from Relay server and forward to local VNC application
socket.on('vnc_data', (data) => {
    if (localVncClient && !localVncClient.destroyed) {
        localVncClient.write(data);
    }
});

socket.on('stop_vnc', () => {
    console.log('[RMM Client] Received stop_vnc. Disconnecting local VNC client...');
    if (localVncClient) {
        localVncClient.destroy();
        localVncClient = null;
    }

    if (os.platform() === 'win32' && vncProcess) {
        const { execSync } = require('child_process');
        console.log('[RMM Client] Stopping VNC companion service...');
        try {
            execSync('net stop uvnc_service', { stdio: 'ignore' });
        } catch(e) {}
        vncProcess = null;
    }
});

// ==========================================
// BACKGROUND TERMINAL PIPELINE (Phase 2)
// ==========================================
let activeShell = null;

socket.on('start_shell', () => {
    if (activeShell) return;
    console.log('[RMM Client] Initializing remote background shell pipeline...');
    activeShell = spawn(
        process.platform === 'win32' ? 'cmd.exe' : 'bash', 
        process.platform === 'win32' ? [] : ['-i']
    );
    
    activeShell.stdout.on('data', data => socket.emit('shell_data', data.toString('utf8')));
    activeShell.stderr.on('data', data => socket.emit('shell_data', data.toString('utf8')));
    
    activeShell.on('close', () => {
        socket.emit('shell_data', '\r\n[Pipeline Terminated]\r\n');
        activeShell = null;
    });
});

socket.on('shell_input', (data) => {
    if (activeShell) activeShell.stdin.write(data);
});

socket.on('stop_shell', () => {
    if (activeShell) {
        activeShell.kill();
        activeShell = null;
    }
});
socket.on('disconnect', () => {
    console.log('[RMM Client] Disconnected from server. Will attempt to reconnect automatically...');
});

socket.on('connect_error', (err) => {
    console.error('[RMM Client] Connection error:', err.message);
});

// ==========================================
// REMOTE FILE SYSTEM EXPLORER (Phase 3)
// ==========================================
const activeDownloads = new Map(); // Store streams for cancellation

socket.on('fs_readdir', (dirPath, callback) => {
    try {
        if (!dirPath || dirPath === '') {
            // If empty path, list logical drives on Windows, or root on Mac/Linux
            if (os.platform() === 'win32') {
                const { execSync } = require('child_process');
                const output = execSync('wmic logicaldisk get name').toString();
                const drives = output.split('\n')
                    .map(d => d.trim())
                    .filter(d => /^[A-Z]:$/.test(d))
                    .map(d => ({ name: d + '\\', isDir: true, size: 0 }));
                return callback(null, drives);
            } else {
                dirPath = '/';
            }
        }
        
        fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
            if (err) return callback({ error: err.message });
            
            const results = [];
            for (const f of files) {
                try {
                    let size = 0;
                    if (!f.isDirectory()) {
                        const stat = fs.statSync(path.join(dirPath, f.name));
                        size = stat.size;
                    }
                    results.push({
                        name: f.name,
                        isDir: f.isDirectory(),
                        size: size
                    });
                } catch(e) {
                    // Ignore files lacking stat permissions
                }
            }
            // Sort: Directories first, then alphabetical
            results.sort((a, b) => {
                if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
                return a.isDir ? -1 : 1;
            });
            
            callback(null, results);
        });
    } catch (e) {
        callback({ error: e.message });
    }
});

socket.on('fs_download_start', (filePath, downloadId) => {
    try {
        if (!fs.existsSync(filePath)) {
            socket.emit(`fs_error_${downloadId}`, 'File does not exist');
            return;
        }

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            socket.emit(`fs_error_${downloadId}`, 'Cannot download a directory');
            return;
        }

        const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 }); // 64KB chunks
        activeDownloads.set(downloadId, stream);

        stream.on('data', (chunk) => {
            socket.emit(`fs_chunk_${downloadId}`, chunk);
        });

        stream.on('end', () => {
            socket.emit(`fs_end_${downloadId}`);
            activeDownloads.delete(downloadId);
        });

        stream.on('error', (err) => {
            socket.emit(`fs_error_${downloadId}`, err.message);
            activeDownloads.delete(downloadId);
        });
    } catch(e) {
        socket.emit(`fs_error_${downloadId}`, e.message);
    }
});

socket.on('fs_download_cancel', (downloadId) => {
    const stream = activeDownloads.get(downloadId);
    if (stream) {
        console.log(`[RMM Client] Canceling remote file download ${downloadId}`);
        stream.destroy();
        activeDownloads.delete(downloadId);
    }
});
