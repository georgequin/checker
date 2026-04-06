const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const prisma = new PrismaClient();
const wss = new WebSocket.Server({ noServer: true });

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const API_KEY = process.env.API_KEY || 'YOUR_SECURE_API_KEY';

// Map: MachineID -> socket.io Client Socket
const connectedClients = new Map();

// Map: MachineID -> Set of active WebSocket bridges (Admin UI noVNC clients)
const activeVncSessions = new Map();

// Map: MachineID -> Set of active Shell Websocket bridges (Admin UI Terminal clients)
const activeShellSessions = new Map();

app.use(express.json());

app.use(express.json());

// API: Admin Login
app.post('/api/login', (req, res) => {
    // Basic mock authentication
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
});

// Middleware for JWT verification
const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing token' });
    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// API: Get Hosts List
app.get('/api/hosts', requireAdmin, async (req, res) => {
    try {
        const hosts = await prisma.host.findMany();
        const hostsWithStatus = hosts.map(host => ({
            ...host,
            online: connectedClients.has(host.machineId)
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

// Socket.io Middleware (Client Auth)
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token === API_KEY) {
        next();
    } else {
        next(new Error('Authentication Error'));
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
                update: { hostname, publicIp, privateIp, cpu: String(cpu), ram: String(ram), status, updatedAt: new Date() },
                create: { machineId, hostname, publicIp, privateIp, cpu: String(cpu), ram: String(ram), status }
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
            // Close any active VNC sessions for this client
            const sessions = activeVncSessions.get(socketMachineId);
            if (sessions) {
                sessions.forEach(ws => ws.close(1000, 'Client Offline'));
                activeVncSessions.delete(socketMachineId);
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
    const clientSocket = connectedClients.get(machineId);
    if (!clientSocket) {
        ws.close(1000, 'Client not connected');
        return;
    }

    if (!activeVncSessions.has(machineId)) {
        activeVncSessions.set(machineId, new Set());
    }
    activeVncSessions.get(machineId).add(ws);

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
