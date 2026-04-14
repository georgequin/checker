const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

// 1. Discovery Helpers
// This will be overridden by the filename-based discovery if available
let discoveryUrl = 'http://187.124.47.7:3000'; 

/**
 * Resolves a short-token into full RMM credentials
 */
async function resolveToken(token, baseUrl) {
    console.log(`[Provisioning] Resolving token: ${token} via ${baseUrl}...`);
    return new Promise((resolve, reject) => {
        const url = `${baseUrl}/api/deploy/resolve/${token}`;
        const getter = url.startsWith('https') ? https : http;
        
        const req = getter.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) return reject(new Error(`Server returned ${res.statusCode}`));
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.abort();
            reject(new Error('Connection timeout to discovery server'));
        });
    });
}

/**
 * Principal Installation Flow
 */
async function run() {
    // A. Metadata Extraction from Filename
    // Pattern: Setup_[TOKEN]_[HOST-IP].exe
    // Example: Install_Helper_Setup_A1B2_105-117-20-106.exe
    const installerPath = process.argv[2] || '';
    const installerName = path.basename(installerPath);
    console.log(`[Provisioning Check] Installer Name: ${installerName}`);
    
    // 1. Parse Token
    const tokenMatch = installerName.match(/_([A-Z0-9]{4,8})/i);
    // 2. Parse Dynamic Host (Look for IP pattern or domain suffix)
    const hostMatch = installerName.match(/_([0-9a-zA-Z.-]+)\.exe$/i);

    let envVars = [
        { name: "NODE_ENV", value: "production" }
    ];

    if (tokenMatch) {
       const token = tokenMatch[1].toUpperCase();
       let lookupUrl = discoveryUrl;

       if (hostMatch && hostMatch[1] !== token) {
           let extractedHost = hostMatch[1];
           if (/^[0-9-]+$/.test(extractedHost)) {
               extractedHost = extractedHost.replace(/-/g, '.');
           }
           lookupUrl = `http://${extractedHost}:3000`;
           console.log(`[Provisioning] Dynamic Host Discovery: ${lookupUrl}`);
       }

       try {
           const config = await resolveToken(token, lookupUrl);
           console.log(`[Provisioning] Successfully resolved to Admin Key: ${config.deploymentKey.substring(0, 8)}...`);
           
           const envContent = `API_KEY=${config.deploymentKey}\nRELAY_SERVER_URL=${config.relayUrl}\n`;
           fs.writeFileSync(path.join(__dirname, '.env'), envContent, 'utf8');
           console.log(`[Provisioning] Written automated configuration to .env`);

           envVars.push({ name: "API_KEY", value: config.deploymentKey });
           envVars.push({ name: "RELAY_SERVER_URL", value: config.relayUrl });
       } catch (e) {
           console.error(`[Provisioning Error] Token resolution failed: ${e.message}.`);
           
           // Fallback: Try to load from existing .env if present
           const envPath = path.join(__dirname, '.env');
           if (fs.existsSync(envPath)) {
               console.log(`[Provisioning] Attempting to proceed with pre-existing .env...`);
               const content = fs.readFileSync(envPath, 'utf8');
               const apiKeyMatch = content.match(/API_KEY=(.*)/);
               const relayUrlMatch = content.match(/RELAY_SERVER_URL=(.*)/);
               if (apiKeyMatch) envVars.push({ name: "API_KEY", value: apiKeyMatch[1].trim() });
               if (relayUrlMatch) envVars.push({ name: "RELAY_SERVER_URL", value: relayUrlMatch[1].trim() });
           } else {
               console.log('[Provisioning] No local configuration found. Defaulting to production relay: http://187.124.47.7:3000');
               envVars.push({ name: "RELAY_SERVER_URL", value: 'http://187.124.47.7:3000' });
               envVars.push({ name: "API_KEY", value: 'YOUR_SECURE_API_KEY' });
           }
       }
    } else {
       console.log('[Provisioning Check] No token found in filename. Checking for local .env...');
       const envPath = path.join(__dirname, '.env');
       if (fs.existsSync(envPath)) {
           const content = fs.readFileSync(envPath, 'utf8');
           const apiKeyMatch = content.match(/API_KEY=(.*)/);
           const relayUrlMatch = content.match(/RELAY_SERVER_URL=(.*)/);
           if (apiKeyMatch) envVars.push({ name: "API_KEY", value: apiKeyMatch[1].trim() });
           if (relayUrlMatch) envVars.push({ name: "RELAY_SERVER_URL", value: relayUrlMatch[1].trim() });
       } else {
           console.log('[Provisioning] No local configuration found. Defaulting to production relay: 187.124.47.7');
           envVars.push({ name: "RELAY_SERVER_URL", value: 'http://187.124.47.7:3000' });
           envVars.push({ name: "API_KEY", value: 'YOUR_SECURE_API_KEY' });
       }
    }

    // B. Register the Windows Service
    const svc = new Service({
      name: 'RMM Worker Engine',
      description: 'Enterprise Remote Monitoring and Management Agent. Provides background system integration and telemetry.',
      script: path.join(__dirname, 'src', 'client.js'),
      env: envVars
    });

    svc.on('install', function() {
      console.log('Installation Complete. Starting service...');
      svc.start();
    });

    svc.on('alreadyinstalled', function() {
      console.log('Service is already installed in the registry. Restarting to apply new paths...');
      svc.start();
    });
    
    svc.on('invalidinstallation', function() {
      console.log('Existing installation is invalid. Attemping repair...');
      svc.uninstall();
    });

    svc.on('uninstall', function() {
      console.log('Cleaned up previous phantom installation. Installing fresh service...');
      svc.install();
    });

    svc.on('start', function() {
      console.log('RMM Worker Engine service started successfully.');
    });

    svc.on('error', function(err) {
      console.error('Service error:', err);
    });

    console.log('Registering RMM Worker Engine with the Windows Service Control Manager...');
    svc.install();
}

run().catch(err => {
    console.error('Fatal Installation Error:', err);
    process.exit(1);
});
