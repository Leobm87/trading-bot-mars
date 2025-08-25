const { spawn } = require('child_process');

// Start all services
const apex = spawn('node', ['services/firms/apex/index.js'], { stdio: 'inherit' });
const router = spawn('node', ['services/router/server.js'], { stdio: 'inherit' });
const gateway = spawn('node', ['services/gateway/gateway.js'], { stdio: 'inherit' });

// Handle termination gracefully
process.on('SIGINT', () => {
  console.log('Shutting down services...');
  apex.kill();
  router.kill();
  gateway.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Shutting down services...');
  apex.kill();
  router.kill();
  gateway.kill();
  process.exit();
});

console.log('Starting MARS Trading Bot Services...');
console.log('- ApexService on port 3001');
console.log('- Router on port 3000');
console.log('- Gateway with Telegram Bot');