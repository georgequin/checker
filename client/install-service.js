const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'RMM Worker Engine',
  description: 'Enterprise Remote Monitoring and Management Agent. Provides background system integration and telemetry.',
  script: path.join(__dirname, 'src', 'client.js'),
  env: [{
    name: "NODE_ENV",
    value: "production"
  }]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
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
