const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'RMM Worker Engine',
  script: path.join(__dirname, 'src', 'client.js')
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', function() {
  console.log('Uninstall complete.');
  console.log('The service exists: ', svc.exists);
  
  // Physically purge the daemon folder since node-windows often leaves it behind, breaking future reinstalls
  try {
      const daemonDir = process.pkg ? path.dirname(process.execPath) : __dirname;
      const daemonPath = path.join(daemonDir, 'daemon');
      const fsForPurge = require('fs');
      if (fsForPurge.existsSync(daemonPath)) {
          fsForPurge.rmSync(daemonPath, { recursive: true, force: true });
          console.log('Purged stale daemon directory. Clean slate achieved.');
      }
  } catch(e) {
      console.log('Warning: Could not automatically remove daemon directory: ', e.message);
  }
});

// Uninstall the service.
console.log('Uninstalling RMM Worker Engine from the Windows Service Control Manager...');
svc.uninstall();
