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
});

// Uninstall the service.
console.log('Uninstalling RMM Worker Engine from the Windows Service Control Manager...');
svc.uninstall();
