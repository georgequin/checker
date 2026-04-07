const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

// 1. Configuration Constants (Bake your primary domain here)
const DEFAULT_DISCOVERY_URL = 'http://187.124.47.7:3000'; // Pre-baked discovery endpoint

/**
 * Resolves a short-token into full RMM credentials
 */
async function resolveToken(token) {
    console.log(`[Provisioning] Resolving token: ${token}...`);
    return new Promise((resolve, reject) => {
        const url = `${DEFAULT_DISCOVERY_URL}/api/deploy/resolve/${token}`;
        const getter = url.startsWith('https') ? https : http;
        
        getter.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) return reject(new Error('Invalid token response from server'));
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Principal Installation Flow
 */
async function run() {
    // A. Attempt to find the token in the installer filename
    // Standard pattern: DawnOfTech_Setup_XXXX.exe
    const installerPath = process.argv[2] || '';
    const installerName = path.basename(installerPath);
    const tokenMatch = installerName.match(/_([A-Z0-9]{4,8})\.exe$/i);
    
    if (tokenMatch) {
       const token = tokenMatch[1].toUpperCase();
       try {
           const config = await resolveToken(token);
           console.log(`[Provisioning] Successfully resolved to Admin Key: ${config.deploymentKey.substring(0, 8)}...`);
           
           // Write the .env file automatically in the installation directory
           const envContent = `API_KEY=${config.deploymentKey}\nRELAY_SERVER_URL=${config.relayUrl}\n`;
           fs.writeFileSync(path.join(__dirname, '.env'), envContent, 'utf8');
           console.log(`[Provisioning] Written automated configuration to .env`);
       } catch (e) {
           console.error(`[Provisioning Check] Token resolution failed: ${e.message}. Falling back to default/manual config.`);
       }
    } else {
       console.log('[Provisioning Check] No token found in filename. Proceeding with existing configuration.');
    }

    // B. Register the Windows Service
    const svc = new Service({
      name: 'RMM Worker Engine',
      description: 'Enterprise Remote Monitoring and Management Agent. Provides background system integration and telemetry.',
      script: path.join(__dirname, 'src', 'client.js'),
      env: [{
        name: "NODE_ENV",
        value: "production"
      }]
    });

    svc.on('install', function() {
      console.log('Installation Complete. Starting service...');
      svc.start();
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
